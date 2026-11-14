/**
 * lib/dailyGoal.ts
 *
 * Framework-agnostic Daily Goal (P0-6) read/write — plain functions, no
 * React, same shape as lib/appearance.ts and lib/theme.ts. Stores under
 * its own "dailyGoal" localStorage key: `{v:1, type, target, progress,
 * lastReset}`, exactly as the ticket specifies.
 *
 * Three goal types, matching the four presets the ticket lists (30 min /
 * 60 min are both `type: 'time'`, just a different `target`):
 *   - 'time'     — minutes of active app use today
 *   - 'chapters' — notes read to completion (>=95%, CompletionBadge's
 *                  own threshold) today
 *   - 'mcqs'     — quiz questions answered today
 *
 * Real-activity mapping, and what's honestly buildable right now:
 *   - 'mcqs' is wired live: useQuizEngine.ts increments it the moment a
 *     question is newly answered (see selectOption there).
 *   - 'time' is wired via useDailyGoal.ts's visibility-based ticker —
 *     the only time signal that exists anywhere in this app today, since
 *     there's no per-note reading-time instrumentation (no React Note
 *     reader page exists yet — T5-3a not started).
 *   - 'chapters' has no live increment event to hook for the same
 *     reason (note reading currently happens outside this React app).
 *     Instead of accumulating, it's recomputed fresh on every read from
 *     the existing `readingProgress-folder-<folder>` entries notes
 *     already write — counts distinct notes that crossed the completion
 *     threshold with a timestamp from today. Naturally correct even
 *     though nothing here ever calls an "increment chapters" function.
 */

export type GoalType = 'time' | 'chapters' | 'mcqs';

export interface DailyGoal {
  v: 1;
  type: GoalType;
  target: number;
  progress: number;
  /** Local YYYY-MM-DD date the goal's progress was last valid for. */
  lastReset: string;
  /**
   * R3-1a: whether today's completion has already produced a
   * notification. Optional/additive field, no version bump (same
   * pattern P0-3's scrollY addition used) — old stored goals without
   * this field are treated as `false` by isGoalComplete()'s caller.
   * Reset to false whenever lastReset rolls to a new day, alongside
   * progress resetting to 0.
   */
  notifiedComplete?: boolean;
}

export interface GoalPreset {
  type: GoalType;
  target: number;
  label: string;
}

/** The four presets from the ticket, in display order. */
export const GOAL_PRESETS: GoalPreset[] = [
  { type: 'time', target: 30, label: '30 min' },
  { type: 'time', target: 60, label: '60 min' },
  { type: 'chapters', target: 2, label: '2 chapters' },
  { type: 'mcqs', target: 25, label: '25 MCQs' },
];

const STORAGE_KEY = 'dailyGoal';
const NOTE_COMPLETION_THRESHOLD = 95; // matches CompletionBadge's getCompletionState
const READING_PROGRESS_NOTE_PREFIX = 'readingProgress-folder-';

/** Local (not UTC) YYYY-MM-DD — a goal resets at local midnight, not UTC. */
export function todayDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readRaw(): DailyGoal | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.v === 1 &&
      (parsed.type === 'time' || parsed.type === 'chapters' || parsed.type === 'mcqs') &&
      typeof parsed.target === 'number' &&
      typeof parsed.progress === 'number' &&
      typeof parsed.lastReset === 'string'
    ) {
      return parsed as DailyGoal;
    }
    return null;
  } catch {
    return null;
  }
}

function write(goal: DailyGoal): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
  } catch {
    // matches the rest of the app's silent-fail storage pattern (e.g. useQuizEngine.ts)
  }
}

/**
 * Counts notes completed today, straight from the same
 * `readingProgress-folder-<folder>` entries RecentlyViewed/NotesIndex
 * already read — see the module comment above for why this is
 * recomputed rather than incremented.
 */
export function recomputeChaptersProgress(): number {
  const today = todayDateString();
  let count = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(READING_PROGRESS_NOTE_PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '');
        if (
          parsed &&
          typeof parsed.percent === 'number' &&
          parsed.percent >= NOTE_COMPLETION_THRESHOLD &&
          typeof parsed.timestamp === 'number' &&
          todayDateString(new Date(parsed.timestamp)) === today
        ) {
          count++;
        }
      } catch {
        // malformed entry — skip it, same tolerance RecentlyViewed uses
      }
    }
  } catch {
    return 0;
  }
  return count;
}

/**
 * Reads the saved goal, applying the daily-reset check (progress -> 0,
 * lastReset -> today, once the stored lastReset isn't today) and, for
 * 'chapters' goals, refreshing progress from real data every read.
 * Persists back to storage only when something actually changed.
 * Returns null when no goal has been chosen yet.
 */
export function getDailyGoal(): DailyGoal | null {
  const saved = readRaw();
  if (!saved) return null;

  const today = todayDateString();
  let goal = saved;

  if (goal.lastReset !== today) {
    goal = { ...goal, progress: 0, lastReset: today, notifiedComplete: false };
  }

  if (goal.type === 'chapters') {
    const recomputed = recomputeChaptersProgress();
    if (recomputed !== goal.progress) {
      goal = { ...goal, progress: recomputed };
    }
  }

  if (goal !== saved) write(goal);
  return goal;
}

/** Picks a new goal (or replaces the current one), starting at 0 progress. */
export function setDailyGoal(type: GoalType, target: number): DailyGoal {
  const goal: DailyGoal = { v: 1, type, target, progress: 0, lastReset: todayDateString() };
  write(goal);
  return goal;
}

export function clearDailyGoal(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** True once progress has reached (or passed) today's target. */
export function isGoalComplete(goal: DailyGoal): boolean {
  return goal.progress >= goal.target;
}

/**
 * R3-1a: marks today's completion as already notified, so the
 * bell/toast for a given goal fires once per day, not on every
 * subsequent tick/read after the target is crossed.
 */
export function markGoalNotified(): void {
  const goal = readRaw();
  if (!goal) return;
  write({ ...goal, notifiedComplete: true });
}

/**
 * Adds `amount` to progress for the given goal type. No-ops if no goal
 * is set, or the current goal is a different type — answering an MCQ
 * shouldn't nudge a "30 min" time goal. Applies the same daily-reset
 * check first, so an increment right after midnight starts from 0.
 */
export function incrementDailyGoalProgress(type: GoalType, amount: number): void {
  const goal = getDailyGoal();
  if (!goal || goal.type !== type) return;
  write({ ...goal, progress: goal.progress + amount });
}
