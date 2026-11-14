import { useDailyGoal } from '../../hooks/useDailyGoal';
import { ProgressBar } from '../ProgressBar';
import { GOAL_PRESETS, type GoalType } from '../../lib/dailyGoal';

/**
 * DailyGoalWidget — P0-6. Lives on the Dashboard, next to RecentlyViewed
 * (P0-5) and DashboardCardsGrid.
 *
 * Two states: no goal chosen yet -> the four presets as buttons; a goal
 * chosen -> "Today's Goal: X% completed" via the same generic
 * ProgressBar component ProgressBar.tsx already documents as shared
 * across notes/quiz percent, plus a "Change goal" escape hatch (not in
 * the ticket's literal text, but without it a picked goal could never be
 * changed except by clearing localStorage by hand).
 */

const GOAL_TYPE_LABEL: Record<GoalType, (target: number) => string> = {
  time: (target) => `${target} min of study time`,
  chapters: (target) => `${target} chapter${target === 1 ? '' : 's'} completed`,
  mcqs: (target) => `${target} MCQs answered`,
};

export function DailyGoalWidget() {
  const { goal, chooseGoal, clearGoal } = useDailyGoal();

  if (!goal) {
    return (
      <div className="daily-goal-widget rounded-lg border border-border-color p-4 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Set a Daily Goal</h2>
        <p className="text-xs text-text-secondary mb-3">Pick a target and we'll track your progress today.</p>
        <div className="flex flex-wrap gap-2">
          {GOAL_PRESETS.map((preset) => (
            <button
              key={`${preset.type}-${preset.target}`}
              type="button"
              onClick={() => chooseGoal(preset.type, preset.target)}
              className="px-3 py-1.5 text-sm rounded-full border border-border-color text-text-secondary hover:border-primary/60 hover:text-text-primary transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const percent = goal.target > 0 ? (goal.progress / goal.target) * 100 : 0;
  const describe = GOAL_TYPE_LABEL[goal.type](goal.target);

  return (
    <div className="daily-goal-widget rounded-lg border border-border-color p-4 mb-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-sm font-semibold text-text-primary">Today's Goal</h2>
        <button
          type="button"
          onClick={clearGoal}
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          Change goal
        </button>
      </div>
      <p className="text-xs text-text-secondary mb-2">{describe}</p>
      <ProgressBar
        percent={percent}
        labelText={`${Math.min(goal.progress, goal.target)} / ${goal.target}`}
        ariaLabel="Today's goal progress"
      />
    </div>
  );
}
