import { useCallback, useState } from 'react';
import { getAllAchievements, getUnlockedAchievementIds, type Achievement } from '../lib/achievements';

/**
 * useAchievements — read-only display hook for AchievementsWidget.
 * Deliberately does NOT call checkAchievements() itself — that's
 * useAchievementsTracker.ts's job, mounted once at App.tsx root, so
 * unlocking happens (and fires its toast) exactly once regardless of
 * how many components render an achievements list. This hook just
 * reads whatever's already been persisted, same "recompute on
 * mount/refresh, no polling" cadence useStudyStats.ts uses.
 */
export function useAchievements() {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => getUnlockedAchievementIds());

  const refresh = useCallback(() => {
    setUnlockedIds(getUnlockedAchievementIds());
  }, []);

  const achievements: Achievement[] = getAllAchievements();

  return { achievements, unlockedIds, refresh };
}
