import { describe, it, expect, afterEach } from 'vitest';
import {
  DEFAULT_READING_PREFERENCES,
  getSavedReadingPreferences,
  saveReadingPreferences,
  applyReadingPreferencesToDocument,
  type ReadingPreferences,
} from './readingPreferences';

afterEach(() => {
  const root = document.documentElement;
  root.style.removeProperty('--reading-font-size');
  root.style.removeProperty('--reading-line-height');
  root.style.removeProperty('--reading-font-family');
  root.style.removeProperty('--reading-content-width');
});

describe('lib/readingPreferences', () => {
  describe('getSavedReadingPreferences', () => {
    it('returns DEFAULT_READING_PREFERENCES when no readingPreferences key is set', () => {
      expect(getSavedReadingPreferences()).toEqual(DEFAULT_READING_PREFERENCES);
    });

    it('returns DEFAULT_READING_PREFERENCES for malformed JSON', () => {
      localStorage.setItem('readingPreferences', '{not json');
      expect(getSavedReadingPreferences()).toEqual(DEFAULT_READING_PREFERENCES);
    });

    it('returns DEFAULT_READING_PREFERENCES for a wrong/missing version', () => {
      localStorage.setItem('readingPreferences', JSON.stringify({ v: 2, fontSize: 'large' }));
      expect(getSavedReadingPreferences()).toEqual(DEFAULT_READING_PREFERENCES);
    });

    it('returns DEFAULT_READING_PREFERENCES for an invalid fontSize value', () => {
      localStorage.setItem(
        'readingPreferences',
        JSON.stringify({ v: 1, fontSize: 'huge', lineHeight: 'comfortable', fontFamily: 'system', width: 'medium' }),
      );
      expect(getSavedReadingPreferences()).toEqual(DEFAULT_READING_PREFERENCES);
    });

    it('returns the saved prefs when valid', () => {
      const saved: ReadingPreferences = { v: 1, fontSize: 'x-large', lineHeight: 'spacious', fontFamily: 'serif', width: 'wide' };
      localStorage.setItem('readingPreferences', JSON.stringify(saved));
      expect(getSavedReadingPreferences()).toEqual(saved);
    });
  });

  describe('saveReadingPreferences', () => {
    it('persists under the readingPreferences key as v:1 JSON', () => {
      const prefs: ReadingPreferences = { v: 1, fontSize: 'small', lineHeight: 'compact', fontFamily: 'dyslexia', width: 'narrow' };
      saveReadingPreferences(prefs);
      expect(JSON.parse(localStorage.getItem('readingPreferences')!)).toEqual(prefs);
    });
  });

  describe('applyReadingPreferencesToDocument', () => {
    it('does not touch the theme/appearance/a11y systems or their storage keys', () => {
      localStorage.setItem('theme', 'dark');
      applyReadingPreferencesToDocument({ v: 1, fontSize: 'large', lineHeight: 'spacious', fontFamily: 'serif', width: 'wide' });

      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(document.documentElement.getAttribute('data-density')).toBeNull();
      expect(document.documentElement.getAttribute('data-high-contrast')).toBeNull();
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('sets --reading-font-size to the resolved CSS value for the chosen font size', () => {
      applyReadingPreferencesToDocument({ v: 1, fontSize: 'x-large', lineHeight: 'comfortable', fontFamily: 'system', width: 'medium' });
      expect(document.documentElement.style.getPropertyValue('--reading-font-size')).toBe('1.375rem');
    });

    it('sets --reading-line-height to the resolved CSS value for the chosen line height', () => {
      applyReadingPreferencesToDocument({ v: 1, fontSize: 'medium', lineHeight: 'spacious', fontFamily: 'system', width: 'medium' });
      expect(document.documentElement.style.getPropertyValue('--reading-line-height')).toBe('2');
    });

    it('sets --reading-font-family to the resolved CSS value for the chosen font family', () => {
      applyReadingPreferencesToDocument({ v: 1, fontSize: 'medium', lineHeight: 'comfortable', fontFamily: 'dyslexia', width: 'medium' });
      expect(document.documentElement.style.getPropertyValue('--reading-font-family')).toContain('OpenDyslexic');
    });

    it('sets --reading-content-width to the resolved CSS value for the chosen width', () => {
      applyReadingPreferencesToDocument({ v: 1, fontSize: 'medium', lineHeight: 'comfortable', fontFamily: 'system', width: 'narrow' });
      expect(document.documentElement.style.getPropertyValue('--reading-content-width')).toBe('38rem');
    });
  });
});
