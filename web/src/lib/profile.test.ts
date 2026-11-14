import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROFILE,
  getSavedProfile,
  saveProfile,
  getTimeOfDay,
  buildGreetingText,
  type UserProfile,
} from './profile';

describe('lib/profile', () => {
  describe('getSavedProfile', () => {
    it('returns DEFAULT_PROFILE when no userProfile key is set', () => {
      expect(getSavedProfile()).toEqual(DEFAULT_PROFILE);
    });

    it('returns DEFAULT_PROFILE for malformed JSON', () => {
      localStorage.setItem('userProfile', '{not json');
      expect(getSavedProfile()).toEqual(DEFAULT_PROFILE);
    });

    it('returns DEFAULT_PROFILE for a wrong/missing version', () => {
      localStorage.setItem('userProfile', JSON.stringify({ v: 2, name: 'X' }));
      expect(getSavedProfile()).toEqual(DEFAULT_PROFILE);
    });

    it('returns the saved profile when valid', () => {
      const saved: UserProfile = { v: 1, name: 'Namu', avatar: '🚀', greeting: 'Hey{name}', goal: 'Ship it' };
      localStorage.setItem('userProfile', JSON.stringify(saved));
      expect(getSavedProfile()).toEqual(saved);
    });
  });

  describe('saveProfile', () => {
    it('persists under the userProfile key as v:1 JSON', () => {
      const profile: UserProfile = { v: 1, name: 'Namu', avatar: '🎓', greeting: 'Hi{name}', goal: '' };
      saveProfile(profile);
      expect(JSON.parse(localStorage.getItem('userProfile')!)).toEqual(profile);
    });
  });

  describe('getTimeOfDay', () => {
    it('returns morning before noon', () => {
      expect(getTimeOfDay(new Date(2026, 0, 1, 9))).toBe('morning');
    });
    it('returns afternoon between noon and 6pm', () => {
      expect(getTimeOfDay(new Date(2026, 0, 1, 14))).toBe('afternoon');
    });
    it('returns evening at 6pm and after', () => {
      expect(getTimeOfDay(new Date(2026, 0, 1, 19))).toBe('evening');
    });
  });

  describe('buildGreetingText', () => {
    it('fills in name and time of day', () => {
      const profile: UserProfile = { ...DEFAULT_PROFILE, name: 'Namu' };
      const text = buildGreetingText(profile, new Date(2026, 0, 1, 19));
      expect(text).toBe('Good evening, Namu');
    });

    it('collapses the name placeholder cleanly when name is empty', () => {
      const text = buildGreetingText(DEFAULT_PROFILE, new Date(2026, 0, 1, 19));
      expect(text).toBe('Good evening');
    });
  });
});
