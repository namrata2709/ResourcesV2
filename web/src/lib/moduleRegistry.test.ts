import { describe, it, expect } from 'vitest';
import { MODULE_TAGS, isLiteModeVisible, type ModuleId } from './moduleRegistry';

describe('moduleRegistry', () => {
  it('tags body-prose and glossary as core', () => {
    expect(MODULE_TAGS.bodyProse).toBe('core');
    expect(MODULE_TAGS.glossary).toBe('core');
  });

  it('tags interactive modules as interactive', () => {
    const interactive: ModuleId[] = ['mcq', 'checklist', 'interview', 'visualMcq', 'implementation', 'visualisation'];
    for (const id of interactive) {
      expect(MODULE_TAGS[id]).toBe('interactive');
    }
  });

  it('tags external link lists as links', () => {
    expect(MODULE_TAGS.leetcode).toBe('links');
    expect(MODULE_TAGS.contest).toBe('links');
  });

  it('isLiteModeVisible is true only for core modules', () => {
    expect(isLiteModeVisible('bodyProse')).toBe(true);
    expect(isLiteModeVisible('glossary')).toBe(true);
    expect(isLiteModeVisible('mcq')).toBe(false);
    expect(isLiteModeVisible('checklist')).toBe(false);
    expect(isLiteModeVisible('interview')).toBe(false);
    expect(isLiteModeVisible('visualMcq')).toBe(false);
    expect(isLiteModeVisible('implementation')).toBe(false);
    expect(isLiteModeVisible('visualisation')).toBe(false);
    expect(isLiteModeVisible('leetcode')).toBe(false);
    expect(isLiteModeVisible('contest')).toBe(false);
  });

  it('every ModuleId used in the registry has an entry (no silent gaps)', () => {
    const ids: ModuleId[] = [
      'bodyProse',
      'mcq',
      'checklist',
      'glossary',
      'interview',
      'visualisation',
      'implementation',
      'leetcode',
      'contest',
      'visualMcq',
    ];
    for (const id of ids) {
      expect(MODULE_TAGS[id]).toBeDefined();
    }
  });
});
