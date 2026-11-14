import { useEffect } from 'react';
import { recordStudyMinute } from '../lib/studyStats';

const TICK_MS = 60_000;

/**
 * useStudyTimeTracker — P2-1's cumulative "study time" signal. Mounted
 * once at App.tsx root (alongside useAnalyticsPageView), independent of
 * whether a Daily Goal exists or is a 'time' type.
 *
 * useDailyGoal.ts's own minute ticker only runs while a 'time'-type
 * goal is actively chosen, and resets to 0 every local midnight — it
 * answers "how am I doing on today's goal", not "how much have I ever
 * studied". This hook is the site-wide, never-reset counterpart,
 * feeding lib/studyStats.ts's all-time studyTimeMinutes stat (and, via
 * its per-day log, getStudyActivityDates() for the Calendar page).
 *
 * Same "tick every minute, only while the tab is visible" signal
 * useDailyGoal.ts already established for its own ticker — re-checks
 * visibility on each tick rather than tearing the interval down/up on
 * every tab-switch.
 */
export function useStudyTimeTracker(): void {
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        recordStudyMinute();
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);
}
