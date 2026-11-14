/**
 * lib/achievements.ts
 *
 * P2-3 — Achievements. Depends on P2-1 (lib/studyStats.ts's
 * computeStudyStatistics()) and P2-2 (getStudyStreak()) — both now
 * real, so achievement definitions can check real, already-tracked
 * data instead of anything new. Same "plain functions over
 * localStorage" convention as studyStats.ts/dailyGoal.ts.
 *
 * DEFERRED DECISION, flagged rather than silently assumed: the ticket
 * text names only the mechanism ("unlocks exactly once"), not a real
 * achievement list — there was no existing list anywhere in the repo
 * to reverse-engineer. The 10 definitions below are a reasonable first
 * pass covering every P2-1/P2-2 stat at least once (one easy + one
 * harder threshold per stat), not a confirmed final design — expect
 * this list to be revisited.
 *
 * The core mechanism, which the manual test actually exercises:
 * checkAchievements() is idempotent. An achievement already recorded
 * in UNLOCKED storage is never re-added or re-returned as "newly
 * unlocked" on a later check, even when its threshold is still (or
 * again) satisfied — e.g. checking again next session with identical
 * stats reports zero newly-unlocked achievements, not the same one
 * every time.
 */

import type { StudyStatistics, StudyStreak } from './studyStats';

export interface Achievement {
  id: string;
  label: string;
  description: string;
}

interface AchievementDefinition extends Achievement {
  isUnlocked: (stats: StudyStatistics, streak: StudyStreak) => boolean;
}

/**
 * Streak achievements check `streak.longest`, not `streak.current` —
 * once a 7-day streak has genuinely happened, it stays an achievement
 * even after the streak later breaks. Checking `current` instead would
 * make an already-earned achievement's *display* look wrong the moment
 * the streak lapsed, even though storage would still (correctly) never
 * re-fire it — `longest` avoids that mismatch entirely.
 */
const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first-note',
    label: 'First Steps',
    description: 'Read your first note.',
    isUnlocked: (stats) => stats.notesRead >= 1,
  },
  {
    id: 'notes-5',
    label: 'Bookworm',
    description: 'Read 5 notes.',
    isUnlocked: (stats) => stats.notesRead >= 5,
  },
  {
    id: 'first-quiz',
    label: 'Quiz Starter',
    description: 'Complete your first quiz attempt.',
    isUnlocked: (stats) => stats.quizAttempts >= 1,
  },
  {
    id: 'quiz-10',
    label: 'Quiz Veteran',
    description: 'Complete 10 quiz attempts.',
    isUnlocked: (stats) => stats.quizAttempts >= 10,
  },
  {
    id: 'avg-90',
    label: 'High Scorer',
    description: 'Reach a 90%+ average quiz score.',
    isUnlocked: (stats) => stats.avgScorePercent !== null && stats.avgScorePercent >= 90,
  },
  {
    id: 'highlights-10',
    label: 'Highlighter',
    description: 'Save 10 highlights.',
    isUnlocked: (stats) => stats.highlightsCount >= 10,
  },
  {
    id: 'bookmarks-10',
    label: 'Curator',
    description: 'Save 10 bookmarks.',
    isUnlocked: (stats) => stats.bookmarksCount >= 10,
  },
  {
    id: 'study-60',
    label: 'Hour of Power',
    description: 'Study for a cumulative hour.',
    isUnlocked: (stats) => stats.studyTimeMinutes >= 60,
  },
  {
    id: 'streak-3',
    label: 'On a Roll',
    description: 'Study 3 days in a row.',
    isUnlocked: (_stats, streak) => streak.longest >= 3,
  },
  {
    id: 'streak-7',
    label: 'Week Warrior',
    description: 'Study 7 days in a row.',
    isUnlocked: (_stats, streak) => streak.longest >= 7,
  },
];

const STORAGE_KEY = 'unlockedAchievements';

interface UnlockedRecord {
  id: string;
  /** Real epoch ms at the moment it was first detected unlocked — not
   * currently surfaced anywhere in the UI, kept for a future "unlocked
   * on <date>" display without needing a storage-shape migration. */
  unlockedAt: number;
}

function readUnlocked(): UnlockedRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is UnlockedRecord =>
        entry && typeof entry.id === 'string' && typeof entry.unlockedAt === 'number',
    );
  } catch {
    return [];
  }
}

function writeUnlocked(records: UnlockedRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // matches the site-wide silent-fail storage pattern (dailyGoal.ts, etc)
  }
}

/** The full, static definition list — every achievement that exists,
 * locked or not. A display widget combines this with
 * getUnlockedAchievementIds() to render both states. */
export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENT_DEFINITIONS.map(({ id, label, description }) => ({ id, label, description }));
}

/** Every achievement id ever recorded as unlocked, read fresh from
 * storage — safe to call from a display widget without triggering any
 * unlock side effects itself. */
export function getUnlockedAchievementIds(): Set<string> {
  return new Set(readUnlocked().map((record) => record.id));
}

/**
 * Evaluates every achievement definition against the given stats/streak
 * and persists any newly-crossed ones. Returns only the achievements
 * that were newly unlocked BY THIS CALL — already-unlocked ones are
 * skipped entirely (not re-evaluated, not re-returned), which is what
 * makes repeat calls with the same or still-qualifying data a no-op:
 * the second call in the manual test's "unlocks exactly once" scenario
 * returns an empty array, not the same achievement again.
 */
export function checkAchievements(
  stats: StudyStatistics,
  streak: StudyStreak,
  now: Date = new Date(),
): Achievement[] {
  const existing = readUnlocked();
  const existingIds = new Set(existing.map((record) => record.id));
  const newlyUnlocked: Achievement[] = [];
  const additions: UnlockedRecord[] = [];

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (existingIds.has(definition.id)) continue;
    if (!definition.isUnlocked(stats, streak)) continue;
    newlyUnlocked.push({ id: definition.id, label: definition.label, description: definition.description });
    additions.push({ id: definition.id, unlockedAt: now.getTime() });
  }

  if (additions.length > 0) {
    writeUnlocked([...existing, ...additions]);
  }

  return newlyUnlocked;
}

/** Test-only: clears unlocked-achievement storage between test runs.
 * Same escape-hatch shape as lib/notifications.ts's
 * _resetNotificationsForTests() — not needed by app code, only tests
 * that don't already get a full localStorage.clear() from
 * src/test/setup.ts (e.g. testing two "sessions" within one test). */
export function _resetAchievementsForTests(): void {
  writeUnlocked([]);
}
