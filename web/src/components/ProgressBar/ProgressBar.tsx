/**
 * ProgressBar — generic over a `percent` prop, not hardcoded to reading
 * progress specifically. NotesIndex uses this for reading-scroll percent
 * (readingProgress-folder-<folder>); QuizIndex (T3-2b) uses the SAME
 * component for answered/total percent — a different underlying metric,
 * same visual component, per T3-2a's explicit "genuinely generic" ask.
 *
 * Real role="progressbar" + ARIA attributes, matching notes-index.js's
 * .note-progress-track/.note-progress-fill structure and its
 * .note-progress-percent text label.
 */

interface ProgressBarProps {
  /** 0–100. Values outside that range are clamped, not passed through raw. */
  percent: number;
  /** Overrides the default "{percent}%" label — e.g. QuizIndex might want "3 / 10 answered". */
  labelText?: string;
  /** Accessible name for the progressbar itself (not the visible text label). */
  ariaLabel?: string;
  className?: string;
}

export function ProgressBar({ percent, labelText, ariaLabel = 'Progress', className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={`progress-bar-wrapper flex items-center gap-2 ${className}`}>
      <div
        className="note-progress-track flex-1 h-1.5 rounded-full bg-bg-secondary overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className="note-progress-fill h-full rounded-full bg-primary transition-all duration-200"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="note-progress-percent text-xs text-text-muted whitespace-nowrap">
        {labelText ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
