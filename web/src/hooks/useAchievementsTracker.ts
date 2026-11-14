import { useEffect } from 'react';
import { computeStudyStatistics, getStudyStreak } from '../lib/studyStats';
import { checkAchievements } from '../lib/achievements';
import { showNotification } from '../lib/notifications';

const TICK_MS = 60_000;

/**
 * useAchievementsTracker — P2-3's unlock side effect. Mounted once at
 * App.tsx root, same "site-wide hook wired once at the top" pattern
 * useStudyTimeTracker/useAnalyticsPageView already establish, so an
 * achievement can be detected regardless of which page the user is
 * actually on when they cross a threshold (finishing a quiz on /quiz,
 * saving a highlight on /notes/..., etc.) — not just when the
 * Dashboard's AchievementsWidget happens to be mounted.
 *
 * Checks once on mount, then on the same "every minute while the tab
 * is visible" cadence useStudyTimeTracker.ts uses — cheap (it's the
 * same stats computation StudyStatisticsWidget already does on every
 * render) and frequent enough that a new achievement surfaces within a
 * minute of actually being earned, without needing every stat-writing
 * call site across the app to explicitly notify this hook.
 *
 * checkAchievements() itself is idempotent (see lib/achievements.ts) —
 * this hook doesn't need its own guard against re-firing the same
 * achievement twice.
 */
export function useAchievementsTracker(): void {
  useEffect(() => {
    function check(): void {
      const stats = computeStudyStatistics();
      const streak = getStudyStreak();
      const newlyUnlocked = checkAchievements(stats, streak);
      for (const achievement of newlyUnlocked) {
        showNotification(`🏆 Achievement unlocked: ${achievement.label}`, 'success');
      }
    }

    check();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        check();
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);
}
