import { describe, it, expect, afterEach } from 'vitest';
import {
  DEFAULT_APPEARANCE_PREFS,
  getSavedAppearancePrefs,
  saveAppearancePrefs,
  applyAppearanceToDocument,
  type AppearancePrefs,
} from './appearance';

afterEach(() => {
  const root = document.documentElement;
  root.style.removeProperty('--accent');
  root.style.removeProperty('--card-radius');
  root.removeAttribute('data-density');
  root.removeAttribute('data-animations');
});

describe('lib/appearance', () => {
  describe('getSavedAppearancePrefs', () => {
    it('returns DEFAULT_APPEARANCE_PREFS when no appearancePrefs key is set', () => {
      expect(getSavedAppearancePrefs()).toEqual(DEFAULT_APPEARANCE_PREFS);
    });

    it('returns DEFAULT_APPEARANCE_PREFS for malformed JSON', () => {
      localStorage.setItem('appearancePrefs', '{not json');
      expect(getSavedAppearancePrefs()).toEqual(DEFAULT_APPEARANCE_PREFS);
    });

    it('returns DEFAULT_APPEARANCE_PREFS for a wrong/missing version', () => {
      localStorage.setItem('appearancePrefs', JSON.stringify({ v: 2, accent: 'theme' }));
      expect(getSavedAppearancePrefs()).toEqual(DEFAULT_APPEARANCE_PREFS);
    });

    it('returns DEFAULT_APPEARANCE_PREFS for an invalid accent value', () => {
      localStorage.setItem(
        'appearancePrefs',
        JSON.stringify({ v: 1, accent: 'not-a-hex', radius: 'round', density: 'comfortable', animations: true }),
      );
      expect(getSavedAppearancePrefs()).toEqual(DEFAULT_APPEARANCE_PREFS);
    });

    it('returns the saved prefs when valid', () => {
      const saved: AppearancePrefs = { v: 1, accent: '#38bdf8', radius: 'pill', density: 'compact', animations: false };
      localStorage.setItem('appearancePrefs', JSON.stringify(saved));
      expect(getSavedAppearancePrefs()).toEqual(saved);
    });
  });

  describe('saveAppearancePrefs', () => {
    it('persists under the appearancePrefs key as v:1 JSON', () => {
      const prefs: AppearancePrefs = { v: 1, accent: 'theme', radius: 'sharp', density: 'compact', animations: true };
      saveAppearancePrefs(prefs);
      expect(JSON.parse(localStorage.getItem('appearancePrefs')!)).toEqual(prefs);
    });
  });

  describe('applyAppearanceToDocument', () => {
    it('does not touch the theme system: no data-theme attribute or "theme" localStorage key', () => {
      localStorage.setItem('theme', 'dark');
      applyAppearanceToDocument({ v: 1, accent: '#f472b6', radius: 'soft', density: 'compact', animations: false });

      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('sets an inline --accent override when accent is a hex value', () => {
      applyAppearanceToDocument({ v: 1, accent: '#f472b6', radius: 'round', density: 'comfortable', animations: true });
      expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#f472b6');
    });

    it('clears the --accent override when accent is "theme"', () => {
      document.documentElement.style.setProperty('--accent', '#f472b6');
      applyAppearanceToDocument({ v: 1, accent: 'theme', radius: 'round', density: 'comfortable', animations: true });
      expect(document.documentElement.style.getPropertyValue('--accent')).toBe('');
    });

    it('sets --card-radius to the resolved CSS value for the chosen radius option', () => {
      applyAppearanceToDocument({ v: 1, accent: 'theme', radius: 'pill', density: 'comfortable', animations: true });
      expect(document.documentElement.style.getPropertyValue('--card-radius')).toBe('1.5rem');
    });

    it('sets data-density to match the chosen density', () => {
      applyAppearanceToDocument({ v: 1, accent: 'theme', radius: 'round', density: 'compact', animations: true });
      expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    });

    it('sets data-animations to "off" when animations is false, "on" when true', () => {
      applyAppearanceToDocument({ v: 1, accent: 'theme', radius: 'round', density: 'comfortable', animations: false });
      expect(document.documentElement.getAttribute('data-animations')).toBe('off');

      applyAppearanceToDocument({ v: 1, accent: 'theme', radius: 'round', density: 'comfortable', animations: true });
      expect(document.documentElement.getAttribute('data-animations')).toBe('on');
    });
  });
});
