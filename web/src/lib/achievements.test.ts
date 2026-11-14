import { describe, it, expect } from 'vitest';
import {
  checkAchievements,
  getAllAchievements,
  getUnlockedAchievementIds,
  _resetAchievementsForTests,
  type Achievement,
} from './achievements';
import type { StudyStatistics, StudyStreak } from './studyStats';

/** A stats/streak fixture with every threshold deliberately unmet, so
 * tests only cross exactly the thresholds they mean to. */
function baseStats(overrides: Partial<StudyStatistics> = {}): StudyStatistics {
  return {
    notesRead: 0,
    quizAttempts: 0,
    avgScorePercent: null,
    highlightsCount: 0,
    bookmarksCount: 0,
    studyTimeMinutes: 0,
    ...overrides,
  };
}

function baseStreak(overrides: Partial<StudyStreak> = {}): StudyStreak {
  return { current: 0, longest: 0, ...overrides };
}

describe('lib/achievements', () => {
  describe('getAllAchievements', () => {
    it('returns a non-empty, stable list of achievement metadata', () => {
      const achievements = getAllAchievements();
      expect(achievements.length).toBeGreaterThan(0);
      for (const achievement of achievements) {
        expect(typeof achievement.id).toBe('string');
        expect(typeof achievement.label).toBe('string');
        expect(typeof achievement.description).toBe('string');
      }
      // ids are unique
      expect(new Set(achievements.map((a) => a.id)).size).toBe(achievements.length);
    });
  });

  describe('getUnlockedAchievementIds', () => {
    it('returns an empty set with nothing stored', () => {
      expect(getUnlockedAchievementIds()).toEqual(new Set());
    });

    it('skips a malformed stored value without throwing', () => {
      localStorage.setItem('unlockedAchievements', '{not json');
      expect(getUnlockedAchievementIds()).toEqual(new Set());
    });
  });

  describe('checkAchievements', () => {
    it('unlocks exactly once — the core P2-3 manual test', () => {
      // Crosses exactly one real threshold: the "read your first note"
      // achievement (notesRead >= 1), nothing else.
      const stats = baseStats({ notesRead: 1 });
      const streak = baseStreak();

      const firstCheck = checkAchievements(stats, streak);
      expect(firstCheck.map((a) => a.id)).toEqual(['first-note']);
      expect(getUnlockedAchievementIds().has('first-note')).toBe(true);

      // Re-checking with the SAME still-qualifying stats must not
      // report it again — this is the "not on every subsequent check"
      // half of the manual test.
      const secondCheck = checkAchievements(stats, streak);
      expect(secondCheck).toEqual([]);

      // A third check, even with stats that still satisfy (or exceed)
      // the same threshold, still reports nothing new for that id.
      const thirdCheck = checkAchievements(baseStats({ notesRead: 3 }), streak);
      expect(thirdCheck.map((a) => a.id)).not.toContain('first-note');
    });

    it('does not unlock anything when no threshold is crossed', () => {
      expect(checkAchievements(baseStats(), baseStreak())).toEqual([]);
      expect(getUnlockedAchievementIds()).toEqual(new Set());
    });

    it('unlocks multiple achievements crossed in the same check', () => {
      const stats = baseStats({ notesRead: 5, quizAttempts: 1 });
      const unlocked = checkAchievements(stats, baseStreak()).map((a) => a.id);

      // notes-5 implies first-note's threshold is also met.
      expect(unlocked.sort()).toEqual(['first-note', 'first-quiz', 'notes-5'].sort());
    });

    it('a later, higher-tier unlock does not re-report an already-unlocked lower tier', () => {
      checkAchievements(baseStats({ notesRead: 1 }), baseStreak());
      _assertOnlyContains(checkAchievements(baseStats({ notesRead: 5 }), baseStreak()), ['notes-5']);
    });

    it('the average-score achievement requires a real, non-null average', () => {
      expect(
        checkAchievements(baseStats({ avgScorePercent: null }), baseStreak()).map((a) => a.id),
      ).not.toContain('avg-90');
      const unlocked = checkAchievements(baseStats({ avgScorePercent: 95 }), baseStreak()).map((a) => a.id);
      expect(unlocked).toContain('avg-90');
    });

    it('streak achievements read the longest streak, not the current one', () => {
      const unlocked = checkAchievements(baseStats(), baseStreak({ current: 0, longest: 7 })).map((a) => a.id);
      expect(unlocked).toEqual(expect.arrayContaining(['streak-3', 'streak-7']));
    });

    it('persists unlocked state across separate calls, not just within one', () => {
      checkAchievements(baseStats({ notesRead: 1 }), baseStreak());
      // A fresh read, with no reset in between, sees the same
      // persisted state a later "session" would.
      expect(getUnlockedAchievementIds().has('first-note')).toBe(true);
    });

    it('_resetAchievementsForTests genuinely clears unlocked state', () => {
      checkAchievements(baseStats({ notesRead: 1 }), baseStreak());
      expect(getUnlockedAchievementIds().size).toBeGreaterThan(0);

      _resetAchievementsForTests();

      expect(getUnlockedAchievementIds()).toEqual(new Set());
      // And the same threshold can "unlock" again after a reset, same
      // as a fresh browser profile would see it.
      const reUnlocked = checkAchievements(baseStats({ notesRead: 1 }), baseStreak());
      expect(reUnlocked.map((a) => a.id)).toContain('first-note');
    });
  });
});

function _assertOnlyContains(achievements: Achievement[], ids: string[]): void {
  expect(achievements.map((a) => a.id).sort()).toEqual([...ids].sort());
}
