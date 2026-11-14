import { describe, it, expect } from 'vitest';
import { getSavedCardOrder, saveCardOrder, applyCardOrder } from './dashboardCardOrder';

describe('dashboardCardOrder', () => {
  describe('getSavedCardOrder / saveCardOrder', () => {
    it('returns null when nothing has been saved yet', () => {
      expect(getSavedCardOrder()).toBeNull();
    });

    it('round-trips a saved order', () => {
      saveCardOrder(['quiz', 'aws', 'dsa']);
      expect(getSavedCardOrder()).toEqual(['quiz', 'aws', 'dsa']);
    });

    it('returns null for corrupt JSON', () => {
      localStorage.setItem('dashboardCardOrder', '{not valid json');
      expect(getSavedCardOrder()).toBeNull();
    });

    it('returns null for a saved value that is not a string array', () => {
      localStorage.setItem('dashboardCardOrder', JSON.stringify({ not: 'an array' }));
      expect(getSavedCardOrder()).toBeNull();
    });
  });

  describe('applyCardOrder', () => {
    const cards = [
      { id: 'aws', label: 'AWS' },
      { id: 'dsa', label: 'DSA' },
      { id: 'quiz', label: 'Quiz' },
    ];

    it('returns cards untouched when savedOrder is null (sensible default for first-time users)', () => {
      expect(applyCardOrder(cards, null)).toEqual(cards);
    });

    it('returns cards untouched when savedOrder is empty', () => {
      expect(applyCardOrder(cards, [])).toEqual(cards);
    });

    it('reorders cards to match a saved order', () => {
      const result = applyCardOrder(cards, ['quiz', 'aws', 'dsa']);
      expect(result.map((c) => c.id)).toEqual(['quiz', 'aws', 'dsa']);
    });

    it('appends cards not present in savedOrder at the end, in their original order', () => {
      const result = applyCardOrder(cards, ['quiz']);
      expect(result.map((c) => c.id)).toEqual(['quiz', 'aws', 'dsa']);
    });

    it('drops ids from savedOrder that no longer match a real card', () => {
      const result = applyCardOrder(cards, ['gallery', 'quiz', 'aws', 'dsa']);
      expect(result.map((c) => c.id)).toEqual(['quiz', 'aws', 'dsa']);
    });

    it('ignores duplicate ids in savedOrder', () => {
      const result = applyCardOrder(cards, ['aws', 'aws', 'quiz']);
      expect(result.map((c) => c.id)).toEqual(['aws', 'quiz', 'dsa']);
    });
  });
});
