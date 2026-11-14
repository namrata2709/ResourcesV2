import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuizEngine } from './useQuizEngine';
import { QuestionCard } from '../../components/QuestionCard';
import { ProgressBar } from '../../components/ProgressBar';
import { QuizNavigator } from './QuizNavigator';
import { ResumeBanner } from './ResumeBanner';
import { ScoreSummary } from './ScoreSummary';
import { AttemptHistory } from './AttemptHistory';
import { QuizPrintExport } from './PrintExport';
import { useSwipe } from '../../hooks/useSwipe';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { ShareQR } from '../../components/ShareQR';
import { PageMeta } from '../../components/PageMeta';
import { assetPath } from '../../lib/siteConfig';

function formatTime(secs: number): string {
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
}

type StatusFilter = 'all' | 'unanswered' | 'correct' | 'incorrect' | 'flagged';

// Keyboard quick-select map — mirrors quiz-engine.js's `_initKeyboardNav()`.
// useKeyboardShortcut's own matching is already case-insensitive, so only
// the lowercase forms need registering below — 'A' still selects the same
// option as 'a' would.
const KEY_TO_INDEX: Record<string, number> = {
  '1': 0, '2': 1, '3': 2, '4': 3,
  a: 0, b: 1, c: 2, d: 3,
  A: 0, B: 1, C: 2, D: 3,
};
const ANSWER_SELECT_KEYS = ['1', '2', '3', '4', 'a', 'b', 'c', 'd'];

/**
 * Quiz — /quiz/:quizId. Covers: load, shuffle, answer (single +
 * multi-select), scoring, progress bar (the shared `ProgressBar` from
 * T3-3 — no bespoke `QuizProgressBar` duplicate anymore), navigator
 * dots, timer, save/resume, completion score summary, bookmarks, flags,
 * swipe-to-navigate between question cards, keyboard quick-select
 * (1-4/A-D), the print-format picker + clipboard export
 * (PrintExport.tsx), study mode + self-rating widget, and the in-quiz
 * search/status-filter, and — new this turn — the two "Share via QR"
 * actions plus trivia-mode fixed-sequence support — see useQuizEngine.ts's
 * own header for the exact behavioral mapping back to quiz-engine.js.
 *
 * Share via QR (two distinct QR types, one shared `ShareQR` component,
 * `B-7`):
 *   - "Share quiz" encodes this quiz's plain URL (`/quiz/:quizId`) — the
 *     normal per-browser-random-shuffle experience, unchanged.
 *   - "Share sequence" encodes the same URL with a `?seed=` param
 *     appended (trivia mode) — every student who scans/opens that
 *     specific QR gets the identical question+option order, since
 *     useQuizEngine seeds its shuffle from that param instead of
 *     Math.random. If this session was itself opened via a `?seed=`
 *     link, "Share sequence" reuses that same seed (so re-sharing stays
 *     consistent); otherwise a fresh seed is generated once per mount
 *     for the instructor to hand out. Each student still paces
 *     themselves — no live position-sync (explicitly out of scope, would
 *     need a realtime backend this project doesn't have).
 *
 * DELIBERATELY NOT YET BUILT (separate follow-up turn, blocked on a
 * Python-side schema change, not a silent omission):
 *   - Weak-areas-by-category breakdown — needs `quiz.json`'s
 *     `questions[].category` field (T5-2/PY-1). Explicitly dropped from
 *     scope entirely on 2026-07-26, not just deferred — see
 *     useQuizEngine.ts's header.
 *
 * Attempt history (quiz-toolbar.js's `_recordAttempt`/`_loadHistory`) IS
 * built — corrected this turn after being incorrectly lumped in with the
 * weak-areas drop above. See useQuizEngine.ts for the recording logic,
 * AttemptHistory.tsx for the display.
 */
export function Quiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const urlSeed = searchParams.get('seed');
  // T1-5, "Open as Quiz": ?source=notes means `quizId` is a note folder,
  // not a registered quiz file — see useQuizEngine.ts's header for the
  // full rationale. Any other/missing value keeps today's behavior.
  const source = searchParams.get('source') === 'notes' ? 'notes' : undefined;
  const engine = useQuizEngine(quizId, urlSeed, source);

  // "Share via QR" — two distinct URLs, same shared ShareQR component.
  // Plain URL: this quiz's normal per-browser-random-shuffle link.
  // Sequence URL: the same link with a `?seed=` param, so every student
  // who opens it lands on the identical fixed order (see
  // useQuizEngine.ts's header). If this session was itself opened via a
  // seed, reuse it — a "Share sequence" tap should hand out the exact
  // sequence this student is looking at, not a different fixed one.
  // Otherwise, generate a fresh instructor seed once per mount.
  // `source=notes` is preserved on both shared URLs (when present) so a
  // shared link still resolves the note's embedded MCQ, not a
  // (probably nonexistent) standalone quiz file of the same id.
  const generatedSeedRef = useRef<string>(String(Math.floor(Math.random() * 1_000_000)));
  const sequenceSeed = urlSeed ?? generatedSeedRef.current;
  const sourceQuery = source ? `?source=${source}` : '';
  const quizUrl = quizId
    ? `${window.location.origin}${assetPath('quiz', quizId)}${sourceQuery}`
    : window.location.href;
  const sequenceUrl = `${quizUrl}${sourceQuery ? '&' : '?'}seed=${encodeURIComponent(sequenceSeed)}`;

  // In-quiz search + status filter — mirrors quiz-search.js: the search
  // box is debounced 200ms before it actually hides anything (so a fast
  // typist doesn't hide/show cards on every keystroke), the status
  // filter applies immediately. Both combine — a question must match
  // both to stay visible.
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  const matchesStatus = useCallback(
    (qid: number) => {
      switch (statusFilter) {
        case 'unanswered':
          return !engine.answeredQuestions[qid];
        case 'correct':
          return !!engine.answeredQuestions[qid] && engine.isQuestionCorrect(qid);
        case 'incorrect':
          return !!engine.answeredQuestions[qid] && !engine.isQuestionCorrect(qid);
        case 'flagged':
          return !!engine.flags[qid];
        default:
          return true;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusFilter, engine.answeredQuestions, engine.flags],
  );

  const visibleIds = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return new Set(
      engine.questions
        .filter((question) => {
          const matchesSearch = !q || question.question.toLowerCase().includes(q);
          return matchesSearch && matchesStatus(question.id);
        })
        .map((question) => question.id),
    );
  }, [engine.questions, debouncedQuery, matchesStatus]);

  const filterActive = debouncedQuery.trim() !== '' || statusFilter !== 'all';
  const visibleCount = visibleIds.size;

  // Swipe-to-navigate: left = next question, right = previous —
  // mirrors Gallery's swipe-through-items pattern. Tracks the "active"
  // index locally (not derived from scroll position — there's no
  // one-question-per-viewport layout here) and scrolls that card into
  // view, same as clicking a QuizNavigator dot.
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  const scrollToIndex = useCallback((idx: number) => {
    const q = engine.questions[idx];
    if (!q) return;
    document
      .querySelector(`.question-card[data-question-id="${q.id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [engine.questions]);

  const goToNext = useCallback(() => {
    const next = Math.min(activeIndexRef.current + 1, engine.questions.length - 1);
    setActiveIndex(next);
    scrollToIndex(next);
  }, [engine.questions.length, scrollToIndex]);

  const goToPrev = useCallback(() => {
    const prev = Math.max(activeIndexRef.current - 1, 0);
    setActiveIndex(prev);
    scrollToIndex(prev);
  }, [scrollToIndex]);

  const swipeRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

  // Keyboard quick-select (1-4/A-D) — mirrors quiz-engine.js's
  // `_initKeyboardNav()` exactly, including its one quirk: a keyboard
  // press calls `selectOption` directly, bypassing the CSS-only
  // `.option.locked { pointer-events:none }` guard that stops a mouse
  // click on an already-answered single-select option. So re-pressing a
  // number/letter key on a settled single-select question DOES overwrite
  // the answer, same as vanilla — this is not a bug to "fix" here.
  // Multi-select's max-reached guard *is* still enforced, since that
  // check lives inside `selectOption` itself, not in the click handler.
  const focusedQuestionIdRef = useRef<number | null>(null);
  const engineStateRef = useRef({
    questions: engine.questions,
    answeredQuestions: engine.answeredQuestions,
    getOrderedOptions: engine.getOrderedOptions,
    selectOption: engine.selectOption,
  });
  engineStateRef.current = {
    questions: engine.questions,
    answeredQuestions: engine.answeredQuestions,
    getOrderedOptions: engine.getOrderedOptions,
    selectOption: engine.selectOption,
  };

  const [questionsNode, setQuestionsNode] = useState<HTMLDivElement | null>(null);
  const questionsRef = useCallback((el: HTMLDivElement | null) => {
    setQuestionsNode(el);
  }, []);
  const setContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      swipeRef(el);
      questionsRef(el);
    },
    [swipeRef, questionsRef],
  );

  // Tracks which question card last received DOM focus — same as
  // vanilla's `focusin` listener scoped to the questions container.
  useEffect(() => {
    if (!questionsNode) return;
    const onFocusIn = (e: FocusEvent) => {
      const card = (e.target as HTMLElement | null)?.closest('.question-card');
      if (!card) return;
      const qid = Number(card.getAttribute('data-question-id'));
      if (!Number.isNaN(qid)) focusedQuestionIdRef.current = qid;
    };
    questionsNode.addEventListener('focusin', onFocusIn);
    return () => questionsNode.removeEventListener('focusin', onFocusIn);
  }, [questionsNode]);

  // Keyboard quick-select and Escape-to-blur — now registered through the
  // shared useKeyboardShortcut hook (T3-2b) instead of a page-rolled
  // document.addEventListener, so both show up in KeyboardShortcutsPanel
  // (as one "1-4 / A-D" entry, not eight identical ones, thanks to the
  // hook's array-key support). The dispatch logic itself — focus
  // tracking, reading engine state via a ref to dodge stale closures,
  // re-focusing the newly-selected option — is unchanged from the raw
  // listener; only how the listener gets attached has changed.
  useKeyboardShortcut({
    key: 'Escape',
    keyLabel: 'Esc',
    description: 'Unfocus answer option',
    allowWhileTyping: true,
    handler: () => {
      const active = document.activeElement as HTMLElement | null;
      if (active?.classList.contains('option')) active.blur();
    },
  });

  useKeyboardShortcut({
    key: ANSWER_SELECT_KEYS,
    keyLabel: '1-4 / A-D',
    description: 'Select answer option',
    handler: (e) => {
      const { questions, answeredQuestions, getOrderedOptions, selectOption } = engineStateRef.current;

      let qid = focusedQuestionIdRef.current;
      if (qid === null) {
        const first = questions.find((q) => !answeredQuestions[q.id]);
        if (!first) return;
        qid = first.id;
        focusedQuestionIdRef.current = qid;
      }
      const question = questions.find((q) => q.id === qid);
      if (!question) return;

      const idx = KEY_TO_INDEX[e.key];
      const opt = getOrderedOptions(question)[idx];
      if (!opt) return;

      e.preventDefault();
      setActiveIndex(questions.indexOf(question));
      selectOption(question.id, opt.id, !!question.multiSelect);

      const card = document.querySelector(`.question-card[data-question-id="${question.id}"]`);
      (card?.querySelectorAll('.option')[idx] as HTMLElement | undefined)?.focus();
    },
  });

  if (engine.status === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center text-text-muted">
        <div className="loading">Loading questions...</div>
      </div>
    );
  }

  if (engine.status === 'error') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="text-3xl mb-2" aria-hidden="true">⚠️</div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">Failed to load quiz</h2>
        <p className="text-text-muted">{engine.error}</p>
      </div>
    );
  }

  if (engine.status === 'resume-pending' && engine.savedForResume) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <PageMeta
          title={engine.title ?? 'Quiz'}
          description={`Resume or restart the "${engine.title ?? 'quiz'}" quiz.`}
          canonicalPath={quizId ? `/quiz/${quizId}${sourceQuery}` : undefined}
        />
        <h1 className="text-xl font-semibold text-text-primary mb-4">📝 {engine.title}</h1>
        <ResumeBanner
          saved={engine.savedForResume}
          total={engine.savedForResume.questionOrder.length}
          onContinue={engine.resumeContinue}
          onStartFresh={engine.resumeStartFresh}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <PageMeta
        title={engine.title ?? 'Quiz'}
        description={`Take the "${engine.title ?? 'quiz'}" quiz — track your score, bookmark questions, and review explanations.`}
        canonicalPath={quizId ? `/quiz/${quizId}${sourceQuery}` : undefined}
      />
      <h1 className="text-xl font-semibold text-text-primary mb-4 print:hidden">📝 {engine.title}</h1>

      <QuizPrintExport title={engine.title ?? 'Quiz'} questions={engine.questions} getOrderedOptions={engine.getOrderedOptions} />

      <div className="print:hidden">
        <div className="flex items-center gap-4 mb-4">
          <ProgressBar
            percent={engine.totalQuestions > 0 ? (engine.answeredCount / engine.totalQuestions) * 100 : 0}
            labelText={`${engine.answeredCount} / ${engine.totalQuestions} answered`}
            ariaLabel="Quiz progress"
            className="flex-1"
          />
          <span aria-label="Time elapsed" className="text-sm text-text-muted whitespace-nowrap">
            ⏱ {formatTime(engine.elapsedSeconds)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            type="button"
            onClick={engine.toggleStudyMode}
            aria-pressed={engine.studyMode}
            aria-label="Toggle study mode"
            className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
              engine.studyMode
                ? 'border-primary text-primary bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]'
                : 'border-border-color text-text-muted hover:text-text-primary'
            }`}
          >
            <span aria-hidden="true">🎓</span> Toggle study mode
          </button>

          <div className="flex items-center gap-2">
            <label htmlFor="quiz-search-input" className="sr-only">
              Search questions by keyword
            </label>
            <input
              id="quiz-search-input"
              type="search"
              aria-label="Search questions by keyword"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search questions…"
              className="text-sm px-3 py-1.5 rounded-md border border-border-color bg-bg-card text-text-primary"
            />
            {searchInput !== '' && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setDebouncedQuery('');
                }}
                className="text-sm text-text-muted hover:text-text-primary"
              >
                Clear search
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="quiz-status-filter" className="sr-only">
              Filter by answer status
            </label>
            <select
              id="quiz-status-filter"
              aria-label="Filter by answer status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="text-sm px-3 py-1.5 rounded-md border border-border-color bg-bg-card text-text-primary"
            >
              <option value="all">All questions</option>
              <option value="unanswered">Unanswered</option>
              <option value="correct">Correct</option>
              <option value="incorrect">Incorrect</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          {filterActive && (
            <span className="text-sm text-text-muted">
              {visibleCount} of {engine.totalQuestions} questions
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {urlSeed && (
              <span className="text-xs text-text-muted" title="Every student who opens this link gets this same question order">
                <span aria-hidden="true">📌</span> Fixed sequence
              </span>
            )}
            <span className="flex items-center gap-1 text-sm text-text-muted">
              <ShareQR url={quizUrl} label="this quiz" />
              Share quiz
            </span>
            <span className="flex items-center gap-1 text-sm text-text-muted">
              <ShareQR url={sequenceUrl} label="this quiz's fixed sequence" />
              Share sequence
            </span>
          </div>
        </div>

        <QuizNavigator
          questions={engine.questions}
          answeredQuestions={engine.answeredQuestions}
          isQuestionCorrect={engine.isQuestionCorrect}
        />

        {engine.toastMessage && (
          <div role="status" className="mb-4 px-4 py-2 rounded-lg bg-bg-secondary text-text-primary text-sm">
            {engine.toastMessage}
          </div>
        )}

        <div id="questionsContainer" ref={setContainerRef}>
          {engine.questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              orderedOptions={engine.getOrderedOptions(q)}
              selected={engine.selectedAnswers[q.id]}
              answered={!!engine.answeredQuestions[q.id]}
              isCorrect={engine.isQuestionCorrect(q.id)}
              correctCount={engine.getCorrectCount(q.id)}
              bookmarked={!!engine.bookmarks[q.id]}
              flag={engine.flags[q.id]}
              studyMode={engine.studyMode}
              rating={engine.ratings[q.id]}
              hidden={!visibleIds.has(q.id)}
              onSelectOption={(optId) => {
                setActiveIndex(idx);
                engine.selectOption(q.id, optId, !!q.multiSelect);
              }}
              onReset={() => engine.resetQuestion(q.id)}
              onToggleBookmark={() => engine.toggleBookmark(q.id)}
              onCycleFlag={() => engine.cycleFlag(q.id)}
              onSetRating={(rating) => engine.setRating(q.id, rating)}
            />
          ))}
        </div>

        {engine.isComplete && (
          <ScoreSummary
            correct={engine.correctCount}
            total={engine.totalQuestions}
            elapsedSeconds={engine.elapsedSeconds}
            onRetry={engine.retry}
          />
        )}
        {engine.isComplete && <AttemptHistory entries={engine.history} />}
      </div>
    </div>
  );
}
