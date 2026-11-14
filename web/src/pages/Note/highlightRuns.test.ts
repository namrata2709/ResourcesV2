import { describe, it, expect } from 'vitest';
import { highlightRuns } from './highlightRuns';
import type { BodyProseRun } from './types';

describe('highlightRuns', () => {
  it('returns runs unchanged (as copies) when there are no highlights', () => {
    const runs: BodyProseRun[] = [{ text: 'Plain text.', mark: null }];
    const result = highlightRuns(runs, []);
    expect(result).toEqual(runs);
    expect(result).not.toBe(runs);
  });

  it('wraps a highlight fully contained within a single run', () => {
    const runs: BodyProseRun[] = [{ text: 'EC2 provides resizable compute capacity.', mark: null }];
    const result = highlightRuns(runs, [{ id: 'hl-1', text: 'resizable compute' }]);
    const texts = result.map((r) => [r.text, r.highlightId]);
    expect(texts).toEqual([
      ['EC2 provides ', undefined],
      ['resizable compute', 'hl-1'],
      [' capacity.', undefined],
    ]);
  });

  it('splits a highlight spanning two differently-styled runs into two segments sharing one highlightId', () => {
    const runs: BodyProseRun[] = [
      { text: 'This is a ', mark: null },
      { text: 'KeyTerm', mark: 'bold' },
      { text: ' you must remember.', mark: null },
    ];
    // Selection spans from inside the first run through the bold run.
    const result = highlightRuns(runs, [{ id: 'hl-2', text: 'a KeyTerm' }]);
    const highlighted = result.filter((r) => r.highlightId === 'hl-2');
    expect(highlighted).toHaveLength(2);
    expect(highlighted[0].text).toBe('a ');
    expect(highlighted[0].mark).toBeNull();
    expect(highlighted[1].text).toBe('KeyTerm');
    expect(highlighted[1].mark).toBe('bold');
  });

  it('only highlights the first occurrence when the text appears twice', () => {
    const runs: BodyProseRun[] = [{ text: 'cache the cache again', mark: null }];
    const result = highlightRuns(runs, [{ id: 'hl-3', text: 'cache' }]);
    const highlighted = result.filter((r) => r.highlightId === 'hl-3');
    expect(highlighted).toHaveLength(1);
    // The second "cache" should still be plain, unwrapped text.
    const plain = result.filter((r) => !r.highlightId).map((r) => r.text).join('');
    expect(plain).toBe(' the cache again');
  });

  it('silently drops a highlight whose text is no longer found in the block', () => {
    const runs: BodyProseRun[] = [{ text: 'Content has changed since the highlight was made.', mark: null }];
    const result = highlightRuns(runs, [{ id: 'hl-4', text: 'text that no longer exists' }]);
    expect(result.every((r) => !r.highlightId)).toBe(true);
  });

  it('applies multiple non-overlapping highlights in the same block', () => {
    const runs: BodyProseRun[] = [{ text: 'alpha beta gamma delta', mark: null }];
    const result = highlightRuns(runs, [
      { id: 'hl-a', text: 'alpha' },
      { id: 'hl-g', text: 'gamma' },
    ]);
    const ids = result.filter((r) => r.highlightId).map((r) => [r.text, r.highlightId]);
    expect(ids).toEqual([
      ['alpha', 'hl-a'],
      ['gamma', 'hl-g'],
    ]);
  });
});
