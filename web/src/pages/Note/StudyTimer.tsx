import { useEffect, useState } from 'react';

/**
 * pages/Note/StudyTimer.tsx
 *
 * ASSUMPTION FLAGGED — see STUDY_TIMER_VISIBLE_KEY's comment in
 * lib/storageKeys.ts for the full context: this widget has no prior
 * implementation anywhere to port from, and the ticket only specifies
 * the toggle's behavior ("shows current hidden/shown state"), not the
 * widget's own content. This is a deliberately minimal first cut —
 * a small fixed badge showing elapsed time on the current note, reset
 * each time the note is opened (not persisted/resumed across visits) —
 * built so T5-3c-2's Tools menu has something real to show/hide rather
 * than leaving the item wired to nothing. Flagging for an explicit
 * product decision on whether this should instead track
 * per-note/cumulative study time, pause on tab-blur, etc.
 */

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface StudyTimerProps {
  visible: boolean;
}

export function StudyTimer({ visible }: StudyTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const interval = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="timer"
      aria-label={`Study timer: ${formatElapsed(elapsedSeconds)} elapsed`}
      className="
        fixed left-6 bottom-6 z-40
        flex items-center gap-1.5 px-3 py-1.5 rounded-full
        bg-bg-card border border-border-color text-sm text-text-secondary
        shadow-[0_4px_12px_var(--shadow)]
      "
    >
      <span aria-hidden="true">⏱️</span>
      <span className="tabular-nums">{formatElapsed(elapsedSeconds)}</span>
    </div>
  );
}
