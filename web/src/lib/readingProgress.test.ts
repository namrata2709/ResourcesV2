import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  readFolderProgress,
  writeFolderProgress,
  getRecentReadingEntries,
  getMostRecentReadingEntry,
  writeQuizOpened,
  getRecentQuizEntries,
  getRecentEntries,
} from './readingProgress';

describe('lib/readingProgress', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('readFolderProgress', () => {
    it('returns null when nothing is stored for the folder', () => {
      expect(readFolderProgress('some-folder')).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      localStorage.setItem('readingProgress-folder-x', '{not json');
      expect(readFolderProgress('x')).toBeNull();
    });

    it('returns null for a wrong/missing version', () => {
      localStorage.setItem('readingProgress-folder-x', JSON.stringify({ v: 2, percent: 50, timestamp: 1 }));
      expect(readFolderProgress('x')).toBeNull();
    });

    it('returns null when percent or timestamp is missing (regression: pre-existing entries must still parse)', () => {
      // Real pre-existing shape per RecentlyViewed's confirmed contract: { v: 1, timestamp }.
      // A percent-less entry is still malformed by this reader's own contract, but a
      // v:1/timestamp-only entry (no percent) should NOT throw or corrupt anything else.
      localStorage.setItem('readingProgress-folder-x', JSON.stringify({ v: 1, timestamp: 1000 }));
      expect(readFolderProgress('x')).toBeNull();
    });

    it('reads back a real v1 entry with percent and timestamp', () => {
      localStorage.setItem('readingProgress-folder-x', JSON.stringify({ v: 1, percent: 42, timestamp: 1000 }));
      expect(readFolderProgress('x')).toEqual({ v: 1, percent: 42, timestamp: 1000 });
    });

    it('reads scrollY when present, and omits it when absent (additive field, no version bump)', () => {
      localStorage.setItem('readingProgress-folder-x', JSON.stringify({ v: 1, percent: 42, timestamp: 1000 }));
      expect(readFolderProgress('x')?.scrollY).toBeUndefined();

      localStorage.setItem('readingProgress-folder-y', JSON.stringify({ v: 1, percent: 42, timestamp: 1000, scrollY: 730 }));
      expect(readFolderProgress('y')?.scrollY).toBe(730);
    });
  });

  describe('writeFolderProgress', () => {
    it('writes a v1 entry with a fresh timestamp', () => {
      vi.useFakeTimers();
      vi.setSystemTime(5000);
      writeFolderProgress('my-note', { percent: 30 });
      vi.useRealTimers();

      const raw = JSON.parse(localStorage.getItem('readingProgress-folder-my-note') || '{}');
      expect(raw).toEqual({ v: 1, percent: 30, timestamp: 5000 });
    });

    it('includes scrollY when provided', () => {
      writeFolderProgress('my-note', { percent: 30, scrollY: 812 });
      const raw = JSON.parse(localStorage.getItem('readingProgress-folder-my-note') || '{}');
      expect(raw.scrollY).toBe(812);
    });

    it('omits scrollY entirely when not provided, rather than writing scrollY: undefined', () => {
      writeFolderProgress('my-note', { percent: 30 });
      const raw = JSON.parse(localStorage.getItem('readingProgress-folder-my-note') || '{}');
      expect('scrollY' in raw).toBe(false);
    });

    it('a later write overwrites the earlier one and bumps timestamp', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1000);
      writeFolderProgress('my-note', { percent: 10, scrollY: 50 });
      vi.setSystemTime(2000);
      writeFolderProgress('my-note', { percent: 60, scrollY: 400 });
      vi.useRealTimers();

      expect(readFolderProgress('my-note')).toEqual({ v: 1, percent: 60, timestamp: 2000, scrollY: 400 });
    });
  });

  describe('getRecentReadingEntries / getMostRecentReadingEntry', () => {
    it('returns [] / null when nothing is stored', () => {
      expect(getRecentReadingEntries()).toEqual([]);
      expect(getMostRecentReadingEntry()).toBeNull();
    });

    it('skips malformed entries (missing v or timestamp) — regression for pre-existing data', () => {
      localStorage.setItem('readingProgress-folder-a', JSON.stringify({ percent: 50 })); // no v/timestamp
      localStorage.setItem('readingProgress-folder-b', JSON.stringify({ v: 1, percent: 10, timestamp: 1000 }));
      expect(getRecentReadingEntries().map((e) => e.folder)).toEqual(['b']);
    });

    it('sorts most-recent-first and caps at max', () => {
      localStorage.setItem('readingProgress-folder-a', JSON.stringify({ v: 1, percent: 10, timestamp: 1000 }));
      localStorage.setItem('readingProgress-folder-b', JSON.stringify({ v: 1, percent: 20, timestamp: 3000 }));
      localStorage.setItem('readingProgress-folder-c', JSON.stringify({ v: 1, percent: 30, timestamp: 2000 }));

      expect(getRecentReadingEntries().map((e) => e.folder)).toEqual(['b', 'c', 'a']);
      expect(getRecentReadingEntries(2).map((e) => e.folder)).toEqual(['b', 'c']);
    });

    it('getMostRecentReadingEntry returns just the single newest entry', () => {
      localStorage.setItem('readingProgress-folder-a', JSON.stringify({ v: 1, percent: 10, timestamp: 1000 }));
      localStorage.setItem('readingProgress-folder-b', JSON.stringify({ v: 1, percent: 20, timestamp: 3000 }));

      expect(getMostRecentReadingEntry()).toEqual({ folder: 'b', timestamp: 3000 });
    });

    it('ignores unrelated localStorage keys', () => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('readingProgress-folder-a', JSON.stringify({ v: 1, percent: 10, timestamp: 1000 }));
      expect(getRecentReadingEntries().map((e) => e.folder)).toEqual(['a']);
    });
  });

  describe('P0-5: writeQuizOpened / getRecentQuizEntries', () => {
    it('writes a v1 {timestamp} marker under readingProgress-quiz-<id>', () => {
      vi.useFakeTimers();
      vi.setSystemTime(9000);
      writeQuizOpened('my-quiz');
      vi.useRealTimers();

      const raw = JSON.parse(localStorage.getItem('readingProgress-quiz-my-quiz') || '{}');
      expect(raw).toEqual({ v: 1, timestamp: 9000 });
    });

    it('does not touch quiz_progress_<id> (the engine\'s separate saved-answer key)', () => {
      writeQuizOpened('my-quiz');
      expect(localStorage.getItem('quiz_progress_my-quiz')).toBeNull();
    });

    it('getRecentQuizEntries returns [] when nothing is stored', () => {
      expect(getRecentQuizEntries()).toEqual([]);
    });

    it('skips malformed entries, same tolerance as the notes scan', () => {
      localStorage.setItem('readingProgress-quiz-a', JSON.stringify({ percent: 50 })); // no v/timestamp
      localStorage.setItem('readingProgress-quiz-b', JSON.stringify({ v: 1, timestamp: 1000 }));
      expect(getRecentQuizEntries().map((e) => e.quizId)).toEqual(['b']);
    });

    it('sorts most-recent-first and caps at max', () => {
      localStorage.setItem('readingProgress-quiz-a', JSON.stringify({ v: 1, timestamp: 1000 }));
      localStorage.setItem('readingProgress-quiz-b', JSON.stringify({ v: 1, timestamp: 3000 }));
      localStorage.setItem('readingProgress-quiz-c', JSON.stringify({ v: 1, timestamp: 2000 }));

      expect(getRecentQuizEntries().map((e) => e.quizId)).toEqual(['b', 'c', 'a']);
      expect(getRecentQuizEntries(2).map((e) => e.quizId)).toEqual(['b', 'c']);
    });

    it('does not pick up readingProgress-folder-* keys', () => {
      localStorage.setItem('readingProgress-folder-some-note', JSON.stringify({ v: 1, percent: 10, timestamp: 5000 }));
      expect(getRecentQuizEntries()).toEqual([]);
    });
  });

  describe('P0-5: getRecentEntries (merged notes + quizzes)', () => {
    it('returns [] when nothing is stored', () => {
      expect(getRecentEntries()).toEqual([]);
    });

    it('interleaves notes and quizzes by timestamp, most-recent-first', () => {
      localStorage.setItem('readingProgress-folder-note-a', JSON.stringify({ v: 1, percent: 10, timestamp: 1000 }));
      localStorage.setItem('readingProgress-quiz-quiz-a', JSON.stringify({ v: 1, timestamp: 3000 }));
      localStorage.setItem('readingProgress-folder-note-b', JSON.stringify({ v: 1, percent: 10, timestamp: 2000 }));

      const entries = getRecentEntries();
      expect(entries).toEqual([
        { kind: 'quiz', quizId: 'quiz-a', timestamp: 3000 },
        { kind: 'note', folder: 'note-b', timestamp: 2000 },
        { kind: 'note', folder: 'note-a', timestamp: 1000 },
      ]);
    });

    it('caps the merged list at max overall, not max of each kind', () => {
      localStorage.setItem('readingProgress-folder-note-a', JSON.stringify({ v: 1, percent: 10, timestamp: 1000 }));
      localStorage.setItem('readingProgress-quiz-quiz-a', JSON.stringify({ v: 1, timestamp: 3000 }));
      localStorage.setItem('readingProgress-folder-note-b', JSON.stringify({ v: 1, percent: 10, timestamp: 2000 }));

      expect(getRecentEntries(2)).toEqual([
        { kind: 'quiz', quizId: 'quiz-a', timestamp: 3000 },
        { kind: 'note', folder: 'note-b', timestamp: 2000 },
      ]);
    });
  });
});
