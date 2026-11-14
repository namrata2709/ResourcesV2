import { useCallback, useState } from 'react';
import {
  computeStudyStatistics,
  getStudyStreak,
  type StudyStatistics,
  type StudyStreak,
} from '../lib/studyStats';

/**
 * useStudyStats — thin React wrapper around lib/studyStats.ts's
 * computeStudyStatistics(), same "plain lib + thin hook" split
 * lib/dailyGoal.ts/useDailyGoal.ts already establish.
 *
 * Recomputes on demand via refresh() rather than polling — unlike
 * useDailyGoal's 'time' ticker, nothing here needs a live per-second
 * update. These stats only change when the user does something
 * elsewhere in the app (finishes a quiz, finishes a note, adds a
 * highlight/bookmark), so a manual refresh (or a fresh mount) is a fine
 * cadence.
 *
 * P2-2: `streak` is kept as a sibling piece of state rather than folded
 * into `StudyStatistics` itself — computeStudyStatistics()'s return
 * shape is asserted with an exact `toEqual()` in studyStats.test.ts, so
 * adding a field there would break an already-passing test for no real
 * benefit. getStudyStreak() is cheap (derived from the same activity
 * dates), so computing it alongside stats here costs nothing extra.
 */
export function useStudyStats() {
  const [stats, setStats] = useState<StudyStatistics>(() => computeStudyStatistics());
  const [streak, setStreak] = useState<StudyStreak>(() => getStudyStreak());

  const refresh = useCallback(() => {
    setStats(computeStudyStatistics());
    setStreak(getStudyStreak());
  }, []);

  return { stats, streak, refresh };
}
