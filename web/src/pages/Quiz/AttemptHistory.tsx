import type { QuizHistoryEntry } from './types';

function formatTime(secs: number): string {
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * AttemptHistory — React port of quiz-toolbar.js's `_renderHistoryPanel`.
 * Reads the `history` array useQuizEngine already records to
 * `quiz_history_<quizFile>` on each completion (capped at 20 entries,
 * oldest dropped — see useQuizEngine.ts's own header). Most recent
 * attempt first, matching vanilla's display order.
 *
 * Renders nothing when there's no history yet (a first attempt, or a
 * quiz that's never been completed) — same "no history yet" guard as
 * ScoreSummary only rendering once `isComplete`.
 */
export function AttemptHistory({ entries }: { entries: QuizHistoryEntry[] }) {
  if (entries.length === 0) return null;

  const mostRecentFirst = [...entries].reverse();

  return (
    <div className="mt-6 rounded-xl border border-border-color bg-bg-card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        <span aria-hidden="true">📊</span> Attempt history
      </h3>
      <ul className="flex flex-col gap-1.5">
        {mostRecentFirst.map((entry, i) => (
          <li
            key={`${entry.date}-${i}`}
            className="flex items-center justify-between gap-3 text-sm py-1.5 px-2 rounded-md odd:bg-bg-secondary"
          >
            <span className="text-text-muted">{formatDate(entry.date)}</span>
            <span className="flex items-center gap-3">
              <span className="text-text-primary font-medium">
                {entry.score} / {entry.total} ({entry.pct}%)
              </span>
              <span className="text-text-muted whitespace-nowrap">⏱ {formatTime(entry.timeSeconds)}</span>
              <span
                aria-label={entry.passed ? 'Passed' : 'Not passed'}
                className={entry.passed ? 'text-primary' : 'text-text-muted'}
              >
                {entry.passed ? '✓' : '✗'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
