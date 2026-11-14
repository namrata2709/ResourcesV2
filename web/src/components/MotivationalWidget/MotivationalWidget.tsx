import { Sparkles } from 'lucide-react';
import { useMotivationalMessage } from '../../hooks/useMotivationalMessage';

/**
 * MotivationalWidget — P2-4. Same "small dashboard card, all-
 * localStorage, no network fetch" shape as StudyStatisticsWidget
 * (P2-1)/AchievementsWidget (P2-3)/DailyGoalWidget (P0-6).
 *
 * Always renders one line, drawn via useMotivationalMessage's
 * shuffle-bag (lib/motivationalMessages.ts) — see that file for why a
 * plain random pick per mount isn't enough to satisfy the ticket's own
 * "rotate without obvious short-cycle repetition" manual test.
 */
export function MotivationalWidget() {
  const message = useMotivationalMessage();

  return (
    <div className="motivational-widget rounded-lg border border-border-color p-4 mb-6">
      <p className="flex items-start gap-2 text-sm text-text-primary">
        <Sparkles size={16} className="shrink-0 mt-0.5 text-primary" aria-hidden="true" />
        <span>{message.text}</span>
      </p>
    </div>
  );
}
