import type { QuizSavedState } from './types';

function formatTime(secs: number): string {
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
}

export function ResumeBanner({
  saved,
  total,
  onContinue,
  onStartFresh,
}: {
  saved: QuizSavedState;
  total: number;
  onContinue: () => void;
  onStartFresh: () => void;
}) {
  const answered = Object.keys(saved.answeredQuestions || {}).length;
  const timeStr = formatTime(saved.elapsedSeconds || 0);
  const dateStr = new Date(saved.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div
      role="region"
      aria-label="Quiz progress saved"
      className="flex flex-wrap items-center justify-between gap-4 bg-bg-card border border-border-color rounded-xl p-4 mb-5"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-2xl">💾</span>
        <div>
          <strong className="block text-text-primary">Progress saved</strong>
          <span className="text-sm text-text-muted">
            {answered} / {total} answered · {timeStr} · {dateStr}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onContinue}
          aria-label={`Resume quiz from ${answered} of ${total} answered`}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover"
        >
          Resume
        </button>
        <button
          onClick={onStartFresh}
          aria-label="Discard saved progress and start fresh"
          className="px-4 py-2 rounded-lg border border-border-color text-sm font-medium text-text-secondary hover:bg-bg-secondary"
        >
          Start fresh
        </button>
      </div>
    </div>
  );
}
