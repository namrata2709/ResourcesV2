import { Trophy, Lock } from 'lucide-react';
import { useAchievements } from '../../hooks/useAchievements';

/**
 * AchievementsWidget — P2-3. Same "small dashboard card, all-
 * localStorage, no network fetch" shape as StudyStatisticsWidget
 * (P2-1)/DailyGoalWidget (P0-6).
 *
 * Purely a READ of whatever useAchievementsTracker.ts (mounted once at
 * App.tsx root) has already unlocked — this component never calls
 * checkAchievements() itself, so mounting/unmounting the Dashboard
 * doesn't affect when an unlock toast fires (see useAchievements.ts's
 * own header).
 *
 * Renders every achievement, locked or not — same "honest zero/empty
 * state over hiding the widget" choice StudyStatisticsWidget makes —
 * so a first-time visitor can see the full list of what's achievable,
 * not just a growing list that starts empty and unexplained.
 */
export function AchievementsWidget() {
  const { achievements, unlockedIds } = useAchievements();
  const unlockedCount = achievements.filter((achievement) => unlockedIds.has(achievement.id)).length;

  return (
    <div className="achievements-widget rounded-lg border border-border-color p-4 mb-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
        <Trophy size={16} aria-hidden="true" />
        Achievements
        <span className="text-text-muted font-normal">
          ({unlockedCount}/{achievements.length})
        </span>
      </h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 list-none m-0 p-0">
        {achievements.map((achievement) => {
          const unlocked = unlockedIds.has(achievement.id);
          return (
            <li
              key={achievement.id}
              title={achievement.description}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                unlocked ? 'bg-bg-secondary' : 'bg-bg-secondary/50'
              }`}
            >
              <span
                className={unlocked ? 'text-primary shrink-0' : 'text-text-muted shrink-0'}
                aria-hidden="true"
              >
                {unlocked ? <Trophy size={18} /> : <Lock size={18} />}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold leading-tight truncate ${
                    unlocked ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {achievement.label}
                </p>
                <p className="text-xs text-text-muted leading-tight">{unlocked ? 'Unlocked' : 'Locked'}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
