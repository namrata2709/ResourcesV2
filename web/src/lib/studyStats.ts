/**
 * lib/studyStats.ts
 *
 * P2-1 — Study Statistics. Framework-agnostic (no React), same
 * "plain functions over localStorage" convention as lib/dailyGoal.ts /
 * lib/readingProgress.ts. Aggregates ACROSS ALL notes/quizzes/pages —
 * unlike dailyGoal.ts's per-day-reset counters, these are all-time
 * totals.
 *
 * Every input this reads (besides the one new key below) is written by
 * an already-shipped feature; this module is read-only with respect to
 * all four:
 *   - readingProgress-folder-<folder>  (P0-3, lib/readingProgress.ts)
 *   - quiz_history_<quizId>            (T5-1, pages/Quiz/useQuizEngine.ts)
 *   - highlights-<pageId>              (P1-1, pages/Note/highlights.ts)
 *   - bookmarks-<pageId>               (T5-3c-7, pages/Note/bookmarks.ts)
 *
 * The one genuinely new piece of state this ticket introduces is
 * cumulative "study time". Nothing in the app tracked a running total
 * before this — dailyGoal.ts's own 'time' goal only ever tracks *today*
 * (reset to 0 every local midnight), and only while a 'time'-type goal
 * is actively chosen. recordStudyMinute() below is the writer for a
 * new, dedicated, never-reset key (STUDY_TIME_KEY) — ticked once a
 * minute by hooks/useStudyTimeTracker.ts, mounted once at App.tsx root
 * independent of whether a Daily Goal exists, same "site-wide hook
 * wired once at the top" pattern useAnalyticsPageView.ts already uses.
 *
 * getStudyActivityDates() is a purely-additive bonus export: it's the
 * exact hook point pages/Calendar/Calendar.tsx's own header comment
 * asks P2-1 to provide ("this is the one function a future P2-1/P2-2
 * integration needs to replace") — every local YYYY-MM-DD date with at
 * least one of a note progressed, a quiz completed, or a study-time
 * minute ticked. It costs nothing extra to maintain: it's derived
 * entirely from timestamps the four keys above (plus the new per-day
 * study-time log) already carry.
 */

import { todayDateString } from './dailyGoal';

const READING_PROGRESS_PREFIX = 'readingProgress-folder-';
const QUIZ_HISTORY_PREFIX = 'quiz_history_';
const HIGHLIGHTS_PREFIX = 'highlights-';
const BOOKMARKS_PREFIX = 'bookmarks-';
const STUDY_TIME_KEY = 'studyTimeLog';

/** Matches dailyGoal.ts's own NOTE_COMPLETION_THRESHOLD / CompletionBadge's
 * getCompletionState threshold — a note counts as "read" once its saved
 * scroll percent has ever crossed this, not merely opened. */
const NOTE_COMPLETION_THRESHOLD = 95;

interface StudyTimeLog {
  v: 1;
  /** All-time cumulative minutes, never reset. */
  total: number;
  /** Local YYYY-MM-DD -> minutes ticked that day. Only consumed by
   * getStudyActivityDates() below — not displayed anywhere directly. */
  byDay: Record<string, number>;
}

function readStudyTimeLog(): StudyTimeLog {
  try {
    const raw = localStorage.getItem(STUDY_TIME_KEY);
    if (!raw) return { v: 1, total: 0, byDay: {} };
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.v === 1 &&
      typeof parsed.total === 'number' &&
      parsed.byDay &&
      typeof parsed.byDay === 'object'
    ) {
      return parsed as StudyTimeLog;
    }
    return { v: 1, total: 0, byDay: {} };
  } catch {
    return { v: 1, total: 0, byDay: {} };
  }
}

function writeStudyTimeLog(log: StudyTimeLog): void {
  try {
    localStorage.setItem(STUDY_TIME_KEY, JSON.stringify(log));
  } catch {
    // matches the site-wide silent-fail storage pattern (dailyGoal.ts, etc)
  }
}

/**
 * Adds one minute to the all-time total AND today's per-day bucket.
 * Called once a minute, only while the tab is visible, by
 * hooks/useStudyTimeTracker.ts — same "tick while visible" signal
 * useDailyGoal.ts's own 'time' goal ticker already uses, just never
 * reset and independent of any chosen goal.
 */
export function recordStudyMinute(): void {
  const log = readStudyTimeLog();
  const today = todayDateString();
  const next: StudyTimeLog = {
    v: 1,
    total: log.total + 1,
    byDay: { ...log.byDay, [today]: (log.byDay[today] ?? 0) + 1 },
  };
  writeStudyTimeLog(next);
}

export function getStudyTimeMinutes(): number {
  return readStudyTimeLog().total;
}

/**
 * Count of distinct notes whose saved reading progress has EVER crossed
 * NOTE_COMPLETION_THRESHOLD — an all-time count, unlike dailyGoal.ts's
 * recomputeChaptersProgress(), which deliberately only counts today's.
 */
export function getNotesReadCount(): number {
  let count = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(READING_PROGRESS_PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '');
        if (parsed && typeof parsed.percent === 'number' && parsed.percent >= NOTE_COMPLETION_THRESHOLD) {
          count++;
        }
      } catch {
        // malformed entry — skip it, same tolerance readingProgress.ts uses
      }
    }
  } catch {
    return 0;
  }
  return count;
}

export interface QuizStats {
  /** Total completed attempts across every quiz, not distinct quizzes. */
  attempts: number;
  /** Mean of every attempt's stored `pct`, rounded to the nearest whole
   * percent. Null (not 0) when there are zero attempts — 0% would
   * wrongly imply a real, failing average exists. */
  avgScorePercent: number | null;
}

export function getQuizStats(): QuizStats {
  let attempts = 0;
  let pctSum = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(QUIZ_HISTORY_PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '');
        if (!Array.isArray(parsed)) continue;
        for (const entry of parsed) {
          if (entry && typeof entry.pct === 'number') {
            attempts++;
            pctSum += entry.pct;
          }
        }
      } catch {
        // malformed entry — skip it
      }
    }
  } catch {
    return { attempts: 0, avgScorePercent: null };
  }
  return { attempts, avgScorePercent: attempts > 0 ? Math.round(pctSum / attempts) : null };
}

function sumArrayLengthsByPrefix(prefix: string): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '');
        if (Array.isArray(parsed)) total += parsed.length;
      } catch {
        // malformed entry — skip it
      }
    }
  } catch {
    return 0;
  }
  return total;
}

/** Sums the length of every per-page `highlights-<pageId>` array. */
export function getHighlightsCount(): number {
  return sumArrayLengthsByPrefix(HIGHLIGHTS_PREFIX);
}

/** Sums the length of every per-page `bookmarks-<pageId>` array. */
export function getBookmarksCount(): number {
  return sumArrayLengthsByPrefix(BOOKMARKS_PREFIX);
}

export interface StudyStatistics {
  notesRead: number;
  quizAttempts: number;
  avgScorePercent: number | null;
  highlightsCount: number;
  bookmarksCount: number;
  studyTimeMinutes: number;
}

/** The one call site a display widget actually needs — computes every
 * stat above. */
export function computeStudyStatistics(): StudyStatistics {
  const quiz = getQuizStats();
  return {
    notesRead: getNotesReadCount(),
    quizAttempts: quiz.attempts,
    avgScorePercent: quiz.avgScorePercent,
    highlightsCount: getHighlightsCount(),
    bookmarksCount: getBookmarksCount(),
    studyTimeMinutes: getStudyTimeMinutes(),
  };
}

// ---------------------------------------------------------------------
// Calendar hook point — pages/Calendar/Calendar.tsx's own header
// comment names getMonthActivity() as "the one function a future
// P2-1/P2-2 integration needs to replace." getStudyActivityDates()
// below is that real data source.
// ---------------------------------------------------------------------

/**
 * Every local YYYY-MM-DD date with at least one of: a note progressed
 * (a readingProgress-folder-<folder> timestamp), a quiz completed (a
 * quiz_history_<quizId> entry's date), or a study-time minute ticked
 * (studyTimeLog.byDay). Purely derived from data the tracked keys
 * already carry — no new per-day tracking was added just for this.
 */
export function getStudyActivityDates(): Set<string> {
  const dates = new Set<string>();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(READING_PROGRESS_PREFIX)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '');
          if (parsed && typeof parsed.timestamp === 'number') {
            dates.add(todayDateString(new Date(parsed.timestamp)));
          }
        } catch {
          // skip malformed entry
        }
        continue;
      }

      if (key.startsWith(QUIZ_HISTORY_PREFIX)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '');
          if (Array.isArray(parsed)) {
            for (const entry of parsed) {
              if (entry && typeof entry.date === 'string') {
                const d = new Date(entry.date);
                if (!Number.isNaN(d.getTime())) dates.add(todayDateString(d));
              }
            }
          }
        } catch {
          // skip malformed entry
        }
      }
    }
  } catch {
    return dates;
  }

  for (const day of Object.keys(readStudyTimeLog().byDay)) {
    dates.add(day);
  }

  return dates;
}

// ---------------------------------------------------------------------
// P2-2 — Study Streak. Consecutive-day counting, built entirely on top
// of getStudyActivityDates() above (P2-1's per-day activity signal) —
// no new localStorage key of its own, same "derive, don't duplicate"
// approach pages/Calendar/Calendar.tsx's getMonthActivity() already
// takes with the same underlying data.
// ---------------------------------------------------------------------

export interface StudyStreak {
  /** Consecutive days of activity ending today, or ending yesterday if
   * today has no logged activity *yet* — today isn't treated as a miss
   * until the day is actually over, same grace-period convention most
   * streak trackers use. Genuinely 0 once a full day is skipped (both
   * yesterday and today empty). */
  current: number;
  /** Longest consecutive run found anywhere in the activity history,
   * independent of whether it's still ongoing (e.g. a 10-day streak
   * from last month still shows as 10 even after it's since broken). */
  longest: number;
}

/** Parses a local YYYY-MM-DD key (as produced by todayDateString) back
 * into a local Date at midnight. Deliberately NOT `new Date(key)` —
 * that form parses the string as UTC, which can silently shift the
 * resulting day by one depending on the user's timezone; every other
 * date key in this file is local, so parsing has to be too. */
function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

/**
 * Computes both the current and longest streak from
 * getStudyActivityDates()'s set of active-day keys.
 *
 * A zero-activity day genuinely breaks the streak: the backward walk
 * for `current` and the forward run-scan for `longest` both stop dead
 * at the first missing day rather than skipping over the gap — e.g.
 * activity on Mon/Tue/Thu with an empty Wed produces a current streak
 * of 1 (just Thu, once Wed has fully elapsed), not 3.
 *
 * `now` is an injectable param purely for testability (matches the
 * pattern getStudyActivityDates()'s own test uses via vi.setSystemTime
 * rather than needing a separate clock param there) — real call sites
 * never pass it, defaulting to the real current time.
 */
export function getStudyStreak(now: Date = new Date()): StudyStreak {
  const activeDates = getStudyActivityDates();

  // Current streak: walk backward day-by-day from "today," so long as
  // each day visited has activity. If today itself has no activity
  // logged yet, start the walk from yesterday instead — an in-progress,
  // not-yet-over day shouldn't zero out a real ongoing streak.
  let current = 0;
  const todayKey = todayDateString(now);
  let cursor = activeDates.has(todayKey) ? now : addDays(now, -1);
  while (activeDates.has(todayDateString(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  // Longest streak: sort every active-day key chronologically and walk
  // forward, tracking the longest run of calendar-consecutive days.
  // This naturally also captures `current` when it's part of the most
  // recent run, since that run's days are already in the same set.
  const sortedKeys = Array.from(activeDates).sort();
  let longest = 0;
  let run = 0;
  let previousDate: Date | null = null;
  for (const key of sortedKeys) {
    const date = parseDateKey(key);
    const isConsecutive = previousDate !== null && todayDateString(addDays(previousDate, 1)) === key;
    run = isConsecutive ? run + 1 : 1;
    longest = Math.max(longest, run);
    previousDate = date;
  }

  return { current, longest };
}
