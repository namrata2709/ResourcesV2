/**
 * CompletionBadge — generic over a `percent` prop, per T3-2a's
 * genericity requirement. Exact thresholds notes-index.js currently
 * uses: 0% -> not-started, 1–94% -> in-progress, >=95% -> completed
 * (deliberately NOT 100% — an easy boundary to mis-transcribe, called
 * out explicitly in the ticket's own Testing section for that reason).
 *
 * QuizIndex (T3-2b) reuses this exact component with its own percent
 * definition (answered ÷ total for the most recent attempt) — same
 * three-state visual, different underlying metric.
 */

import { Circle, CircleDot, CircleCheck } from 'lucide-react';

export type CompletionState = 'not-started' | 'in-progress' | 'completed';

export function getCompletionState(percent: number): CompletionState {
  if (percent >= 95) return 'completed';
  if (percent > 0) return 'in-progress';
  return 'not-started';
}

const STATE_META: Record<CompletionState, { icon: React.ReactNode; label: string; className: string }> = {
  'not-started': { icon: <Circle size={14} />, label: 'Not Started', className: 'text-text-muted' },
  'in-progress': { icon: <CircleDot size={14} />, label: 'In Progress', className: 'text-primary' },
  completed: { icon: <CircleCheck size={14} />, label: 'Completed', className: 'text-accent' },
};

interface CompletionBadgeProps {
  percent: number;
  className?: string;
}

export function CompletionBadge({ percent, className = '' }: CompletionBadgeProps) {
  const state = getCompletionState(percent);
  const meta = STATE_META[state];

  return (
    <span
      className={`completion-badge inline-flex items-center gap-1 text-xs font-medium ${meta.className} ${className}`}
      aria-label={meta.label}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}
