function formatTime(secs: number): string {
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
}

export function ScoreSummary({
  correct,
  total,
  elapsedSeconds,
  onRetry,
}: {
  correct: number;
  total: number;
  elapsedSeconds: number;
  onRetry: () => void;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = pct >= 70;

  return (
    <div
      role="region"
      aria-label="Quiz results"
      className={`text-center rounded-xl p-8 mt-6 border ${
        passed ? 'border-primary bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]' : 'border-border-color bg-bg-card'
      }`}
    >
      <div className="text-4xl mb-2" aria-hidden="true">
        {passed ? '🎉' : '📚'}
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-1">{passed ? 'Well done!' : 'Keep practising!'}</h2>
      <div className="text-3xl font-bold text-text-primary">
        {correct} / {total}
      </div>
      <div className="text-lg text-text-secondary mb-2">{pct}%</div>
      <div className="text-sm text-text-muted mb-4">⏱ Time: {formatTime(elapsedSeconds)}</div>
      <div className="h-2 rounded-full bg-bg-secondary overflow-hidden max-w-sm mx-auto mb-4">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-text-secondary mb-4 max-w-md mx-auto">
        {passed
          ? `You passed with ${pct}%. ${
              total - correct > 0
                ? `Review the ${total - correct} missed question${total - correct > 1 ? 's' : ''}.`
                : 'Perfect score!'
            }`
          : `You scored ${pct}%. You need 70% to pass. Review the explanations and try again.`}
      </p>
      <button
        onClick={onRetry}
        className="px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover"
      >
        🔄 Retry Quiz
      </button>
    </div>
  );
}
