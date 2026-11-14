import { useCallback, useEffect, useState } from 'react';
import {
  type DailyGoal,
  type GoalType,
  getDailyGoal,
  setDailyGoal,
  clearDailyGoal,
  incrementDailyGoalProgress,
  isGoalComplete,
  markGoalNotified,
} from '../lib/dailyGoal';
import { showNotification } from '../lib/notifications';
import { addInboxNotification } from '../lib/notificationsInbox';

const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  time: 'time',
  chapters: 'chapters',
  mcqs: 'MCQs',
};

/**
 * R3-1a: the first real event source wired into the notifications
 * inbox — fires once per day, the moment progress crosses target, via
 * DailyGoal.notifiedComplete (see lib/dailyGoal.ts). Fires both a toast
 * (in-the-moment ping) and an inbox entry (so it's not lost if missed),
 * per R3-1a's own spec recommendation.
 */
function maybeNotifyGoalComplete(goal: DailyGoal): void {
  if (goal.notifiedComplete || !isGoalComplete(goal)) return;
  const message = `🎯 Daily goal complete — ${GOAL_TYPE_LABEL[goal.type]} goal reached!`;
  showNotification(message, 'success');
  addInboxNotification(message, 'success');
  markGoalNotified();
}

/**
 * useDailyGoal — thin React wrapper around lib/dailyGoal.ts (P0-6), same
 * shape as useAppearance()/AppearanceContext for P0-2.
 *
 * Owns the one piece of genuinely React-only behavior lib/dailyGoal.ts
 * can't do on its own: the 'time' goal's minute ticker. There's no
 * per-note reading-time instrumentation anywhere in this app (no React
 * Note reader page exists yet), so "time" is measured as active app-use
 * minutes — ticks once a minute, only while the tab is actually visible,
 * via the Page Visibility API. This is a real usage signal, not a
 * fabricated one; it's just coarser than per-page reading time would be.
 */

const TICK_MS = 60_000;

export function useDailyGoal() {
  const [goal, setGoalState] = useState<DailyGoal | null>(() => {
    const initial = getDailyGoal();
    if (initial) maybeNotifyGoalComplete(initial);
    return initial;
  });

  const refresh = useCallback(() => {
    const next = getDailyGoal();
    if (next) maybeNotifyGoalComplete(next);
    setGoalState(next);
  }, []);

  // 'time' goal: one minute of progress per elapsed minute the tab is
  // visible. Re-checks visibility on each tick rather than pausing/
  // resuming the interval itself, matching the Page Visibility API's own
  // recommended pattern (cheaper than tearing the interval down/up on
  // every tab-switch).
  useEffect(() => {
    if (!goal || goal.type !== 'time') return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        incrementDailyGoalProgress('time', 1);
        refresh();
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [goal, refresh]);

  const chooseGoal = useCallback(
    (type: GoalType, target: number) => {
      setDailyGoal(type, target);
      refresh();
    },
    [refresh],
  );

  const clearGoal = useCallback(() => {
    clearDailyGoal();
    setGoalState(null);
  }, []);

  return { goal, chooseGoal, clearGoal, refresh };
}
