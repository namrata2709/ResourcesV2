import type { QuizQuestion } from './types';

export function QuizNavigator({
  questions,
  answeredQuestions,
  isQuestionCorrect,
}: {
  questions: QuizQuestion[];
  answeredQuestions: Record<number, true>;
  isQuestionCorrect: (qid: number) => boolean;
}) {
  function goTo(qid: number) {
    const card = document.querySelector(`.question-card[data-question-id="${qid}"]`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav aria-label="Question navigation" className="flex flex-wrap gap-2 mb-4">
      {questions.map((q, i) => {
        const answered = !!answeredQuestions[q.id];
        const correct = answered && isQuestionCorrect(q.id);
        let cls = 'w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center border transition-colors';
        if (answered) {
          cls += correct
            ? ' bg-primary text-white border-primary'
            : ' bg-red-500 text-white border-red-500';
        } else {
          cls += ' bg-bg-card text-text-secondary border-border-color';
        }
        return (
          <button
            key={q.id}
            className={cls}
            aria-label={`Question ${i + 1}`}
            title={`Question ${i + 1}`}
            onClick={() => goTo(q.id)}
          >
            {i + 1}
          </button>
        );
      })}
    </nav>
  );
}
