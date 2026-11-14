import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  computeStudyStatistics,
  getNotesReadCount,
  getQuizStats,
  getHighlightsCount,
  getBookmarksCount,
  getStudyTimeMinutes,
  recordStudyMinute,
  getStudyActivityDates,
  getStudyStreak,
} from './studyStats';
import { todayDateString } from './dailyGoal';

afterEach(() => {
  vi.useRealTimers();
});

describe('lib/studyStats', () => {
  describe('getNotesReadCount', () => {
    it('returns 0 with nothing stored', () => {
      expect(getNotesReadCount()).toBe(0);
    });

    it('counts only notes whose percent has crossed the 95 threshold', () => {
      localStorage.setItem('readingProgress-folder-a', JSON.stringify({ v: 1, percent: 100, timestamp: 1 }));
      localStorage.setItem('readingProgress-folder-b', JSON.stringify({ v: 1, percent: 95, timestamp: 1 }));
      localStorage.setItem('readingProgress-folder-c', JSON.stringify({ v: 1, percent: 40, timestamp: 1 }));
      expect(getNotesReadCount()).toBe(2);
    });

    it('skips malformed entries without throwing', () => {
      localStorage.setItem('readingProgress-folder-bad', '{not json');
      localStorage.setItem('readingProgress-folder-good', JSON.stringify({ v: 1, percent: 100, timestamp: 1 }));
      expect(getNotesReadCount()).toBe(1);
    });

    it('ignores unrelated keys', () => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('notesFavorites', JSON.stringify(['a', 'b']));
      expect(getNotesReadCount()).toBe(0);
    });
  });

  describe('getQuizStats', () => {
    it('returns 0 attempts and a null average with nothing stored', () => {
      expect(getQuizStats()).toEqual({ attempts: 0, avgScorePercent: null });
    });

    it('counts every attempt across every quiz and averages pct', () => {
      localStorage.setItem(
        'quiz_history_aws-iam',
        JSON.stringify([
          { date: '2026-08-01T00:00:00Z', score: 8, total: 10, pct: 80, timeSeconds: 100, passed: true },
          { date: '2026-08-02T00:00:00Z', score: 6, total: 10, pct: 60, timeSeconds: 100, passed: false },
        ]),
      );
      localStorage.setItem(
        'quiz_history_dsa-sort',
        JSON.stringify([
          { date: '2026-08-03T00:00:00Z', score: 10, total: 10, pct: 100, timeSeconds: 100, passed: true },
        ]),
      );
      expect(getQuizStats()).toEqual({ attempts: 3, avgScorePercent: 80 });
    });

    it('skips malformed history entries without throwing', () => {
      localStorage.setItem('quiz_history_broken', '{not json');
      localStorage.setItem(
        'quiz_history_ok',
        JSON.stringify([{ date: '2026-08-01T00:00:00Z', score: 5, total: 10, pct: 50, timeSeconds: 1, passed: false }]),
      );
      expect(getQuizStats()).toEqual({ attempts: 1, avgScorePercent: 50 });
    });
  });

  describe('getHighlightsCount / getBookmarksCount', () => {
    it('sum array lengths across every per-page key', () => {
      localStorage.setItem('highlights-note-a', JSON.stringify([{ id: '1' }, { id: '2' }]));
      localStorage.setItem('highlights-note-b', JSON.stringify([{ id: '3' }]));
      localStorage.setItem('bookmarks-note-a', JSON.stringify(['sec-1']));
      expect(getHighlightsCount()).toBe(3);
      expect(getBookmarksCount()).toBe(1);
    });

    it('returns 0 with nothing stored and tolerates malformed entries', () => {
      localStorage.setItem('highlights-broken', '{not json');
      expect(getHighlightsCount()).toBe(0);
      expect(getBookmarksCount()).toBe(0);
    });
  });

  describe('recordStudyMinute / getStudyTimeMinutes', () => {
    it('starts at 0 with nothing stored', () => {
      expect(getStudyTimeMinutes()).toBe(0);
    });

    it('accumulates across calls and never resets on its own', () => {
      recordStudyMinute();
      recordStudyMinute();
      recordStudyMinute();
      expect(getStudyTimeMinutes()).toBe(3);
    });
  });

  describe('computeStudyStatistics', () => {
    it('matches hand-calculated values for a known fixture set', () => {
      localStorage.setItem('readingProgress-folder-a', JSON.stringify({ v: 1, percent: 100, timestamp: 1 }));
      localStorage.setItem('readingProgress-folder-b', JSON.stringify({ v: 1, percent: 30, timestamp: 1 }));
      localStorage.setItem(
        'quiz_history_aws-iam',
        JSON.stringify([
          { date: '2026-08-01T00:00:00Z', score: 8, total: 10, pct: 80, timeSeconds: 100, passed: true },
          { date: '2026-08-02T00:00:00Z', score: 4, total: 10, pct: 40, timeSeconds: 100, passed: false },
        ]),
      );
      localStorage.setItem('highlights-note-a', JSON.stringify([{ id: '1' }]));
      localStorage.setItem('bookmarks-note-a', JSON.stringify(['sec-1', 'sec-2']));
      recordStudyMinute();
      recordStudyMinute();

      expect(computeStudyStatistics()).toEqual({
        notesRead: 1,
        quizAttempts: 2,
        avgScorePercent: 60,
        highlightsCount: 1,
        bookmarksCount: 2,
        studyTimeMinutes: 2,
      });
    });
  });

  describe('getStudyActivityDates', () => {
    it('returns an empty set with nothing stored', () => {
      expect(getStudyActivityDates()).toEqual(new Set());
    });

    it('derives dates from reading progress, quiz history, and the study-time log', () => {
      const noteTs = new Date(2026, 7, 10).getTime(); // Aug 10, 2026 local
      localStorage.setItem('readingProgress-folder-a', JSON.stringify({ v: 1, percent: 50, timestamp: noteTs }));
      localStorage.setItem(
        'quiz_history_aws-iam',
        JSON.stringify([{ date: new Date(2026, 7, 11).toISOString(), score: 5, total: 10, pct: 50, timeSeconds: 1, passed: false }]),
      );

      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 7, 12));
      recordStudyMinute();

      const dates = getStudyActivityDates();
      expect(dates.has(todayDateString(new Date(2026, 7, 10)))).toBe(true);
      expect(dates.has(todayDateString(new Date(2026, 7, 11)))).toBe(true);
      expect(dates.has(todayDateString(new Date(2026, 7, 12)))).toBe(true);
      expect(dates.size).toBe(3);
    });

    it('skips malformed entries without throwing', () => {
      localStorage.setItem('readingProgress-folder-bad', '{not json');
      localStorage.setItem('quiz_history_bad', '{not json');
      expect(getStudyActivityDates()).toEqual(new Set());
    });
  });

  describe('getStudyStreak', () => {
    /** Records one active day via a readingProgress-folder-<folder>
     * entry, the same real signal getStudyActivityDates() reads —
     * `folder` just needs to be unique per call within a test. */
    function activityOn(date: Date, folder: string) {
      localStorage.setItem(
        `readingProgress-folder-${folder}`,
        JSON.stringify({ v: 1, percent: 50, timestamp: date.getTime() }),
      );
    }

    it('returns 0/0 with nothing stored', () => {
      expect(getStudyStreak(new Date(2026, 7, 12))).toEqual({ current: 0, longest: 0 });
    });

    it('counts consecutive active days ending today', () => {
      activityOn(new Date(2026, 7, 10), 'a');
      activityOn(new Date(2026, 7, 11), 'b');
      activityOn(new Date(2026, 7, 12), 'c');

      expect(getStudyStreak(new Date(2026, 7, 12))).toEqual({ current: 3, longest: 3 });
    });

    it('breaks the current streak on a genuinely zero-activity day, not just counting consecutive days', () => {
      // Aug 10-11 active, Aug 12 (today) has nothing logged yet.
      activityOn(new Date(2026, 7, 10), 'a');
      activityOn(new Date(2026, 7, 11), 'b');
      // Deliberately no entry for Aug 12 or earlier than Aug 10.

      expect(getStudyStreak(new Date(2026, 7, 12))).toEqual({ current: 2, longest: 2 });
    });

    it('does not let an older, longer streak inflate the current one once a real gap breaks it', () => {
      // A 3-day streak (Aug 5-7), then a genuine miss on Aug 8, then a
      // fresh, shorter 2-day streak (Aug 9-10) ending "today."
      activityOn(new Date(2026, 7, 5), 'a');
      activityOn(new Date(2026, 7, 6), 'b');
      activityOn(new Date(2026, 7, 7), 'c');
      // Aug 8 intentionally empty — the break.
      activityOn(new Date(2026, 7, 9), 'd');
      activityOn(new Date(2026, 7, 10), 'e');

      expect(getStudyStreak(new Date(2026, 7, 10))).toEqual({ current: 2, longest: 3 });
    });

    it('extends the grace period through an in-progress "today" with no activity logged yet', () => {
      activityOn(new Date(2026, 7, 11), 'a');
      activityOn(new Date(2026, 7, 12), 'b');
      // "Now" is Aug 13, but nothing has been logged for Aug 13 yet —
      // the day isn't over, so it shouldn't zero out the streak.

      expect(getStudyStreak(new Date(2026, 7, 13))).toEqual({ current: 2, longest: 2 });
    });

    it('drops to 0 once a full day has genuinely elapsed with no activity', () => {
      activityOn(new Date(2026, 7, 10), 'a');
      activityOn(new Date(2026, 7, 11), 'b');
      // "Now" is Aug 13 — both Aug 12 AND Aug 13 (yesterday and today
      // relative to "now") are empty, so the streak is genuinely over.

      expect(getStudyStreak(new Date(2026, 7, 13))).toEqual({ current: 0, longest: 2 });
    });
  });
});
