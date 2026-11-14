/**
 * QuestionCard — canonical shared option-card/feedback-box component for
 * every MCQ-style question display in the app (per T5-1's own explicit
 * scope: "made into the canonical shared component ... not just Quiz's
 * own"). Built here, in `components/`, ahead of its other two consumers
 * existing yet:
 *   - T5-3a's notes-MCQ (should render via this, matching Quiz's look,
 *     not its own separate carousel style)
 *   - T5-3b's visual MCQ (DSA — 4 sub-types: fillblank/trace/output/
 *     spotbug), which will need a `variant`/slot mechanism for the extra
 *     code block / image each of those needs
 *
 * UPDATE (T5-3a): now has its real second consumer — Note's embedded
 * MCQ module (pages/Note/McqModule.tsx). Per T5-2's schema-unification
 * decision, notes-mcq.json and quiz.json share the identical per-option
 * shape, so no widening was actually needed here — `./types.ts` (moved
 * out of `pages/Quiz/types.ts`, which now just re-exports it) already
 * covers both consumers exactly as written. The bookmark/flag icon
 * fallbacks moved too, to `components/icons/questionIcons.tsx` — see
 * that file's own header. `T5-3b`'s visual-MCQ (DSA, 4 sub-types) is
 * still a real future consumer and may yet need a `variant`/slot for
 * its extra code block/image — not built here, since that ticket's
 * actual requirements still don't exist yet.
 */
import type { ReactNode } from 'react';
import { Icon } from '../Icon';
import { BookmarkIconFallback, FlagIconFallback } from '../icons/questionIcons';
import type { QuizExplanation, QuizOption, QuizQuestion, QuestionCardVariantProps } from './types';

const FLAG_LABELS: Record<'confusing' | 'incorrect', string> = {
  confusing: 'Flagged: confusing',
  incorrect: 'Flagged: possibly incorrect',
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const MULTI_HINT_WORDS = ['', 'ONE', 'TWO', 'THREE', 'FOUR'];

/**
 * Renders one option's explanation fields generically — mirrors
 * quiz-engine.js's `_renderExplanationInner`, which walks every field on
 * `explanation` (known ones first, in a fixed order, then anything else)
 * rather than hard-coding a fixed set. See types.ts's own note on why
 * QuizExplanation keeps an index signature instead of a closed type.
 */
const KNOWN_FIELD_ORDER: Array<[string, keyof QuizExplanation]> = [
  ['Key Points', 'keyPoints'],
  ['Examples', 'examples'],
  ['summary', 'summary'],
  ['Analogy', 'analogy'],
  ['Comparison', 'comparison'],
  ['Key Distinction', 'keyDistinction'],
  ['Common Confusion', 'confusion'],
  ['Identification', 'identification'],
  ['Performance Impact', 'performanceImpact'],
  ['Additional Info', 'additionalInfo'],
];
const KNOWN_KEYS = new Set([...KNOWN_FIELD_ORDER.map(([, k]) => k), 'learnMore', 'summary', 'why']);

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function ExplanationFields({ exp }: { exp: QuizExplanation }) {
  const blocks: { label: string; content: ReactNode }[] = [];

  for (const [label, key] of KNOWN_FIELD_ORDER) {
    const val = exp[key];
    if (!val) continue;
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
      blocks.push({
        label,
        content: (
          <ul className="list-disc ml-6 mt-1">
            {(val as string[]).map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        ),
      });
    } else if (typeof val === 'string' && val.trim()) {
      blocks.push({
        label,
        content: key === 'comparison' ? val.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>) : val,
      });
    }
  }

  for (const [key, val] of Object.entries(exp)) {
    if (KNOWN_KEYS.has(key) || !val) continue;
    const label = humanizeKey(key);
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
      blocks.push({
        label,
        content: (
          <ul className="list-disc ml-6 mt-1">
            {(val as string[]).map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        ),
      });
    } else if (typeof val === 'string' && val.trim()) {
      blocks.push({ label, content: val });
    }
  }

  return (
    <>
      {blocks.map((b, i) => (
        <div key={i} className="explanation-text mt-2 text-sm">
          <strong>{b.label}:</strong> {b.content}
        </div>
      ))}
      {exp.learnMore && exp.learnMore.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {exp.learnMore.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-accent underline text-sm"
            >
              {link.title} →
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function OptionExplanation({ opt, isSelected }: { opt: QuizOption; isSelected: boolean }) {
  if (!opt.explanation) return null;
  if (isSelected) {
    return (
      <div
        className={`explanation mt-2 p-3 rounded-lg text-sm ${
          opt.isCorrect ? 'bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]' : 'bg-[color-mix(in_srgb,red_10%,transparent)]'
        }`}
      >
        <strong>{opt.isCorrect ? '✓ Why this is correct:' : '✗ Why this is incorrect:'}</strong> {opt.explanation.why || ''}
        <ExplanationFields exp={opt.explanation} />
      </div>
    );
  }
  return null;
}

interface QuestionCardProps extends QuestionCardVariantProps {
  question: QuizQuestion;
  orderedOptions: QuizOption[];
  selected: string | string[] | undefined;
  answered: boolean;
  isCorrect: boolean;
  correctCount: number;
  bookmarked: boolean;
  flag: 'confusing' | 'incorrect' | undefined;
  onSelectOption: (optId: string) => void;
  onReset: () => void;
  onToggleBookmark: () => void;
  onCycleFlag: () => void;
  /** Study mode leaves single-select answers unlocked (re-clickable) and
   * swaps the normal Reset-answer button for a self-rating widget. */
  studyMode?: boolean;
  rating?: 'got-it' | 'still-learning';
  onSetRating?: (rating: 'got-it' | 'still-learning') => void;
  /** Applied by the in-quiz search/status-filter — matches quiz-search.js's `.search-hidden` class. */
  hidden?: boolean;
}

export function QuestionCard({
  question,
  orderedOptions,
  selected,
  answered,
  isCorrect,
  correctCount,
  bookmarked,
  flag,
  onSelectOption,
  onReset,
  onToggleBookmark,
  onCycleFlag,
  studyMode = false,
  rating,
  onSetRating,
  hidden = false,
  extraContent,
}: QuestionCardProps) {
  const isMulti = !!question.multiSelect;
  const num = question.displayNumber ?? question.id;
  const role = isMulti ? 'group' : 'radiogroup';
  const selectedIds = isMulti ? (Array.isArray(selected) ? selected : []) : null;

  return (
    <div
      className={`question-card bg-bg-card border border-border-color rounded-xl p-5 mb-5${hidden ? ' search-hidden' : ''}`}
      data-question-id={question.id}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          aria-hidden="true"
          className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold"
        >
          {num}
        </div>
        <div id={`question-label-${question.id}`} className="flex-1 text-text-primary font-medium">
          {question.question}
          {isMulti && (
            <>
              <br />
              <small className="text-text-muted">
                (Select {MULTI_HINT_WORDS[correctCount] ?? correctCount})
              </small>
            </>
          )}
          {question.difficulty && (
            <span className="ml-2 inline-block px-2 py-0.5 rounded text-xs bg-bg-secondary text-text-secondary">
              {question.difficulty}
            </span>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? `Remove bookmark from question ${num}` : `Bookmark question ${num}`}
            title={bookmarked ? 'Bookmarked' : 'Bookmark this question'}
            className={`p-1.5 rounded-md transition-colors ${bookmarked ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}
          >
            <Icon name="quiz-bookmark" size={18} fallback={<BookmarkIconFallback filled={bookmarked} />} />
          </button>
          <button
            type="button"
            onClick={onCycleFlag}
            aria-pressed={!!flag}
            aria-label={flag ? `${FLAG_LABELS[flag]} — question ${num}. Activate to change or clear.` : `Flag question ${num}`}
            title={flag ? FLAG_LABELS[flag] : 'Flag this question'}
            className={`p-1.5 rounded-md transition-colors ${
              flag === 'incorrect' ? 'text-red-500' : flag === 'confusing' ? 'text-amber-500' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Icon name="quiz-flag" size={18} fallback={<FlagIconFallback filled={!!flag} />} />
          </button>
          {answered && (
            <span
              aria-label={isCorrect ? 'Correct' : 'Incorrect'}
              className={`font-bold ${isCorrect ? 'text-primary' : 'text-red-500'}`}
            >
              {isCorrect ? '✓' : '✗'}
            </span>
          )}
        </div>
      </div>

      {extraContent && <div className="mb-3">{extraContent}</div>}

      <div role={role} aria-labelledby={`question-label-${question.id}`} className="flex flex-col gap-2">
        {orderedOptions.map((opt, idx) => {
          const isSelected = isMulti ? !!selectedIds?.includes(opt.id) : selected === opt.id;
          const maxReached = isMulti && !!selectedIds && selectedIds.length >= correctCount && !isSelected;
          const locked = !isMulti && answered && !studyMode;
          const disabled = maxReached || locked;

          let icon: string = OPTION_LETTERS[idx] ?? String(idx + 1);
          if (isSelected) icon = opt.isCorrect ? '✓' : '✗';

          let cls = 'option flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors';
          if (isSelected) {
            cls += opt.isCorrect
              ? ' border-primary bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]'
              : ' border-red-400 bg-[color-mix(in_srgb,red_8%,transparent)]';
          } else {
            cls += ' border-border-color';
          }
          // Matches quiz.css exactly: locked gets pointer-events:none (a
          // settled single-select answer can't be clicked again at all),
          // max-reached does NOT — its click still needs to reach
          // selectOption so the "select only N answers" toast can fire.
          if (locked) cls += ' pointer-events-none opacity-45';
          else if (maxReached) cls += ' opacity-45 cursor-not-allowed';

          return (
            <div key={opt.id}>
              <div
                className={cls}
                data-question-id={question.id}
                data-option-id={opt.id}
                data-is-correct={opt.isCorrect}
                role={isMulti ? 'checkbox' : 'radio'}
                aria-checked={isSelected}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                onClick={() => onSelectOption(opt.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onSelectOption(opt.id);
                  }
                }}
              >
                <span aria-hidden="true" className="flex-shrink-0 font-semibold w-6">
                  {icon}
                </span>
                <span className="flex-1">{opt.text}</span>
              </div>
              <OptionExplanation opt={opt} isSelected={isSelected} />
            </div>
          );
        })}
      </div>

      {answered && studyMode && (
        <div
          role="group"
          aria-label={`Self-rating for question ${num}`}
          className="mt-3 flex items-center gap-2"
        >
          <span className="text-sm text-text-muted">How well did you know this?</span>
          <button
            type="button"
            onClick={() => onSetRating?.('got-it')}
            aria-pressed={rating === 'got-it'}
            className={`text-sm px-2 py-1 rounded-md border transition-colors ${
              rating === 'got-it' ? 'border-primary text-primary bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]' : 'border-border-color text-text-muted hover:text-text-primary'
            }`}
          >
            👍 Got it — I understood this question
          </button>
          <button
            type="button"
            onClick={() => onSetRating?.('still-learning')}
            aria-pressed={rating === 'still-learning'}
            className={`text-sm px-2 py-1 rounded-md border transition-colors ${
              rating === 'still-learning' ? 'border-primary text-primary bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]' : 'border-border-color text-text-muted hover:text-text-primary'
            }`}
          >
            📖 Still learning — I need more practice
          </button>
        </div>
      )}

      {answered && !studyMode && (
        <div className="mt-3">
          <button
            onClick={onReset}
            aria-label={`Reset question ${num} — clear your answer`}
            className="text-sm text-text-muted hover:text-text-primary"
          >
            ↺ Reset answer
          </button>
        </div>
      )}
    </div>
  );
}
