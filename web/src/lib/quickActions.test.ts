import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedQuickActionIds,
  saveQuickActionIds,
  getSavedQuickActions,
  DEFAULT_QUICK_ACTION_IDS,
  QUICK_ACTION_CATALOG,
} from './quickActions';

describe('quickActions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the default set when nothing is saved yet', () => {
    expect(getSavedQuickActionIds()).toEqual(DEFAULT_QUICK_ACTION_IDS);
  });

  it('returns the default set on corrupt JSON', () => {
    localStorage.setItem('quickActions', '{not json');
    expect(getSavedQuickActionIds()).toEqual(DEFAULT_QUICK_ACTION_IDS);
  });

  it('returns the default set when saved value contains an unknown id', () => {
    localStorage.setItem('quickActions', JSON.stringify(['start-quiz', 'not-a-real-action']));
    expect(getSavedQuickActionIds()).toEqual(DEFAULT_QUICK_ACTION_IDS);
  });

  it('returns the default set when saved value is an empty array', () => {
    localStorage.setItem('quickActions', JSON.stringify([]));
    expect(getSavedQuickActionIds()).toEqual(DEFAULT_QUICK_ACTION_IDS);
  });

  it('round-trips a saved, reordered subset', () => {
    saveQuickActionIds(['search', 'start-quiz']);
    expect(getSavedQuickActionIds()).toEqual(['search', 'start-quiz']);
  });

  it('resolves saved ids to catalog defs in the saved order', () => {
    saveQuickActionIds(['search', 'start-quiz']);
    expect(getSavedQuickActions().map((a) => a.id)).toEqual(['search', 'start-quiz']);
  });

  it('falls back to defaults (not a partial list) when storage contains any unknown id', () => {
    localStorage.setItem(
      'quickActions',
      JSON.stringify(['start-quiz', 'retired-action', 'search'])
    );
    // getSavedQuickActionIds() itself falls back to defaults on an unknown id
    // (a stricter guard than per-item filtering) — getSavedQuickActions()
    // built on top of it therefore also falls back, rather than silently
    // dropping just the bad entry. Documenting that behavior here.
    expect(getSavedQuickActions().map((a) => a.id)).toEqual(DEFAULT_QUICK_ACTION_IDS);
  });

  it('every catalog entry has a non-empty label and href', () => {
    for (const action of QUICK_ACTION_CATALOG) {
      expect(action.label.length).toBeGreaterThan(0);
      expect(action.href.startsWith('/')).toBe(true);
    }
  });
});
