import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getDailyGoal,
  setDailyGoal,
  clearDailyGoal,
  incrementDailyGoalProgress,
  recomputeChaptersProgress,
  todayDateString,
  GOAL_PRESETS,
} from './dailyGoal';

afterEach(() => {
  vi.useRealTimers();
});

describe('lib/dailyGoal', () => {
  it('GOAL_PRESETS matches the ticket: 30 min / 60 min / 2 chapters / 25 MCQs', () => {
    expect(GOAL_PRESETS).toEqual([
      { type: 'time', target: 30, label: '30 min' },
      { type: 'time', target: 60, label: '60 min' },
      { type: 'chapters', target: 2, label: '2 chapters' },
      { type: 'mcqs', target: 25, label: '25 MCQs' },
    ]);
  });

  describe('getDailyGoal', () => {
    it('returns null when no goal has been chosen yet', () => {
      expect(getDailyGoal()).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      localStorage.setItem('dailyGoal', '{not json');
      expect(getDailyGoal()).toBeNull();
    });

    it('returns null for a wrong/missing version', () => {
      localStorage.setItem('dailyGoal', JSON.stringify({ v: 2, type: 'mcqs', target: 25, progress: 0, lastReset: todayDateString() }));
      expect(getDailyGoal()).toBeNull();
    });

    it('returns the saved goal as-is when lastReset is today', () => {
      const today = todayDateString();
      localStorage.setItem('dailyGoal', JSON.stringify({ v: 1, type: 'mcqs', target: 25, progress: 7, lastReset: today }));
      expect(getDailyGoal()).toEqual({ v: 1, type: 'mcqs', target: 25, progress: 7, lastReset: today });
    });

    it('resets progress to 0 and advances lastReset when lastReset is not today', () => {
      localStorage.setItem('dailyGoal', JSON.stringify({ v: 1, type: 'mcqs', target: 25, progress: 20, lastReset: '2020-01-01' }));
      const goal = getDailyGoal();
      expect(goal?.progress).toBe(0);
      expect(goal?.lastReset).toBe(todayDateString());
    });

    it('persists the reset so a second read on the same day stays at 0, not re-resetting from the original stale value', () => {
      localStorage.setItem('dailyGoal', JSON.stringify({ v: 1, type: 'mcqs', target: 25, progress: 20, lastReset: '2020-01-01' }));
      getDailyGoal();
      incrementDailyGoalProgress('mcqs', 3);
      expect(getDailyGoal()?.progress).toBe(3);
    });
  });

  describe('setDailyGoal / clearDailyGoal', () => {
    it('starts a new goal at 0 progress with lastReset = today', () => {
      const goal = setDailyGoal('time', 30);
      expect(goal).toEqual({ v: 1, type: 'time', target: 30, progress: 0, lastReset: todayDateString() });
      expect(getDailyGoal()).toEqual(goal);
    });

    it('replaces an existing goal outright, not merging with it', () => {
      setDailyGoal('mcqs', 25);
      incrementDailyGoalProgress('mcqs', 10);
      const replaced = setDailyGoal('time', 60);
      expect(replaced.progress).toBe(0);
      expect(replaced.type).toBe('time');
    });

    it('clearDailyGoal removes the goal entirely', () => {
      setDailyGoal('mcqs', 25);
      clearDailyGoal();
      expect(getDailyGoal()).toBeNull();
    });
  });

  describe('incrementDailyGoalProgress', () => {
    it('is a no-op when no goal is set', () => {
      incrementDailyGoalProgress('mcqs', 5);
      expect(getDailyGoal()).toBeNull();
    });

    it('is a no-op when the goal is a different type', () => {
      setDailyGoal('time', 30);
      incrementDailyGoalProgress('mcqs', 5);
      expect(getDailyGoal()?.progress).toBe(0);
    });

    it('adds amount to progress for a matching type', () => {
      setDailyGoal('mcqs', 25);
      incrementDailyGoalProgress('mcqs', 1);
      incrementDailyGoalProgress('mcqs', 1);
      incrementDailyGoalProgress('mcqs', 3);
      expect(getDailyGoal()?.progress).toBe(5);
    });

    it('increments from a stale lastReset correctly (reset happens first, then the increment applies)', () => {
      localStorage.setItem('dailyGoal', JSON.stringify({ v: 1, type: 'time', target: 30, progress: 25, lastReset: '2020-01-01' }));
      incrementDailyGoalProgress('time', 1);
      expect(getDailyGoal()?.progress).toBe(1);
    });
  });

  describe('recomputeChaptersProgress', () => {
    it('returns 0 when no readingProgress entries exist', () => {
      expect(recomputeChaptersProgress()).toBe(0);
    });

    it('counts a note at >=95% with a timestamp from today', () => {
      localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, percent: 100, timestamp: Date.now() }));
      expect(recomputeChaptersProgress()).toBe(1);
    });

    it('does not count a note below the 95% completion threshold', () => {
      localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, percent: 80, timestamp: Date.now() }));
      expect(recomputeChaptersProgress()).toBe(0);
    });

    it('does not count a completed note whose timestamp is from a previous day', () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, percent: 100, timestamp: yesterday }));
      expect(recomputeChaptersProgress()).toBe(0);
    });

    it('ignores malformed entries without throwing', () => {
      localStorage.setItem('readingProgress-folder-broken', '{not json');
      expect(() => recomputeChaptersProgress()).not.toThrow();
      expect(recomputeChaptersProgress()).toBe(0);
    });

    it('counts multiple distinct completed-today notes', () => {
      localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, percent: 100, timestamp: Date.now() }));
      localStorage.setItem('readingProgress-folder-s3-deep-dive', JSON.stringify({ v: 1, percent: 96, timestamp: Date.now() }));
      expect(recomputeChaptersProgress()).toBe(2);
    });
  });

  describe('chapters goal integration via getDailyGoal', () => {
    it("refreshes a 'chapters' goal's progress from real note-completion data on every read", () => {
      setDailyGoal('chapters', 2);
      expect(getDailyGoal()?.progress).toBe(0);

      localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, percent: 100, timestamp: Date.now() }));
      expect(getDailyGoal()?.progress).toBe(1);

      localStorage.setItem('readingProgress-folder-s3-deep-dive', JSON.stringify({ v: 1, percent: 100, timestamp: Date.now() }));
      expect(getDailyGoal()?.progress).toBe(2);
    });

    it("does not refresh from note-completion data for a 'time' or 'mcqs' goal", () => {
      setDailyGoal('time', 30);
      localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, percent: 100, timestamp: Date.now() }));
      expect(getDailyGoal()?.progress).toBe(0);
    });
  });
});
