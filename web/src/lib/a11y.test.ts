import { describe, it, expect, afterEach } from 'vitest';
import {
  DEFAULT_A11Y_PREFS,
  getSavedA11yPrefs,
  saveA11yPrefs,
  applyA11yToDocument,
  type A11yPrefs,
} from './a11y';

afterEach(() => {
  const root = document.documentElement;
  root.removeAttribute('data-high-contrast');
  root.removeAttribute('data-reduced-motion');
  root.removeAttribute('data-focus-mode');
  root.removeAttribute('data-dyslexia-font');
  root.removeAttribute('data-larger-ui');
});

describe('lib/a11y', () => {
  describe('getSavedA11yPrefs', () => {
    it('returns DEFAULT_A11Y_PREFS when no a11yPrefs key is set', () => {
      expect(getSavedA11yPrefs()).toEqual(DEFAULT_A11Y_PREFS);
    });

    it('returns DEFAULT_A11Y_PREFS for malformed JSON', () => {
      localStorage.setItem('a11yPrefs', '{not json');
      expect(getSavedA11yPrefs()).toEqual(DEFAULT_A11Y_PREFS);
    });

    it('returns DEFAULT_A11Y_PREFS for a wrong/missing version', () => {
      localStorage.setItem('a11yPrefs', JSON.stringify({ v: 2, highContrast: true }));
      expect(getSavedA11yPrefs()).toEqual(DEFAULT_A11Y_PREFS);
    });

    it('returns DEFAULT_A11Y_PREFS when a field is missing/wrong type', () => {
      localStorage.setItem(
        'a11yPrefs',
        JSON.stringify({ v: 1, highContrast: 'yes', reducedMotion: false, focusMode: false, dyslexiaFont: false, largerUI: false }),
      );
      expect(getSavedA11yPrefs()).toEqual(DEFAULT_A11Y_PREFS);
    });

    it('returns the saved prefs when valid', () => {
      const saved: A11yPrefs = {
        v: 1,
        highContrast: true,
        reducedMotion: true,
        focusMode: false,
        dyslexiaFont: true,
        largerUI: false,
      };
      localStorage.setItem('a11yPrefs', JSON.stringify(saved));
      expect(getSavedA11yPrefs()).toEqual(saved);
    });
  });

  describe('saveA11yPrefs', () => {
    it('persists under the a11yPrefs key as v:1 JSON', () => {
      const prefs: A11yPrefs = {
        v: 1,
        highContrast: false,
        reducedMotion: true,
        focusMode: true,
        dyslexiaFont: false,
        largerUI: true,
      };
      saveA11yPrefs(prefs);
      expect(JSON.parse(localStorage.getItem('a11yPrefs')!)).toEqual(prefs);
    });
  });

  describe('applyA11yToDocument', () => {
    it('does not touch the theme or appearance systems', () => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('appearancePrefs', JSON.stringify({ v: 1, accent: 'theme', radius: 'round', density: 'comfortable', animations: true }));

      applyA11yToDocument({ v: 1, highContrast: true, reducedMotion: true, focusMode: true, dyslexiaFont: true, largerUI: true });

      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(document.documentElement.getAttribute('data-density')).toBeNull();
      expect(document.documentElement.getAttribute('data-animations')).toBeNull();
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('sets each data-* attribute to "on" when the matching pref is true', () => {
      applyA11yToDocument({ v: 1, highContrast: true, reducedMotion: true, focusMode: true, dyslexiaFont: true, largerUI: true });

      const root = document.documentElement;
      expect(root.getAttribute('data-high-contrast')).toBe('on');
      expect(root.getAttribute('data-reduced-motion')).toBe('on');
      expect(root.getAttribute('data-focus-mode')).toBe('on');
      expect(root.getAttribute('data-dyslexia-font')).toBe('on');
      expect(root.getAttribute('data-larger-ui')).toBe('on');
    });

    it('sets each data-* attribute to "off" when the matching pref is false', () => {
      applyA11yToDocument({ v: 1, highContrast: false, reducedMotion: false, focusMode: false, dyslexiaFont: false, largerUI: false });

      const root = document.documentElement;
      expect(root.getAttribute('data-high-contrast')).toBe('off');
      expect(root.getAttribute('data-reduced-motion')).toBe('off');
      expect(root.getAttribute('data-focus-mode')).toBe('off');
      expect(root.getAttribute('data-dyslexia-font')).toBe('off');
      expect(root.getAttribute('data-larger-ui')).toBe('off');
    });
  });
});
