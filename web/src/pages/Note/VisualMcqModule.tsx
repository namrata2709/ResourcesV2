/**
 * VisualMcqModule — a DSA note's visual MCQ section (4 sub-types:
 * fillblank/trace/output/spotbug), renders via `QuestionCard` per
 * T5-3b's own direction: "same direction as T5-3a's notes-MCQ: match
 * Quiz's look", using the `variant`/slot mechanism (`extraContent`,
 * built in components/QuestionCard/types.ts) for each sub-type's extra
 * code block or image.
 *
 * Deliberately its own module/JSON file/storage key, not folded into
 * `McqModule` — a DSA note's plain MCQ and its visual MCQ are two real,
 * independent sections (see `visualMcqProgressKey`'s own note in
 * lib/storageKeys.ts). Otherwise structurally identical to McqModule:
 * same answer/lock/bookmark/flag/reset behavior, same fixed-order
 * comprehension-check scope (no shuffle/timer/print — that's Quiz's own
 * `useQuizEngine`, not this).
 * DSA-only — Note.tsx only renders this for `note.subject === 'dsa'`.
 */

import { useEffect, useMemo, useState } from 'react';
import { QuestionCard } from '../../components/QuestionCard';
import { ProgressBar } from '../../components/ProgressBar';
import { dataPath, assetPath } from '../../lib/siteConfig';
import { visualMcqProgressKey } from '../../lib/storageKeys';
import type { QuizQuestion } from '../../components/QuestionCard/types';
import type { VisualMcqQuestion } from './types';

type VisualQuizQuestion = QuizQuestion & VisualMcqQuestion;

interface VisualMcqData {
  title?: string;
  questions: VisualQuizQuestion[];
}

interface McqState {
  selected: Record<number, string | string[]>;
  answered: Record<number, true>;
  bookmarks: Record<number, true>;
  flags: Record<number, 'confusing' | 'incorrect'>;
}

const EMPTY_STATE: McqState = { selected: {}, answered: {}, bookmarks: {}, flags: {} };

const VISUAL_TYPE_LABEL: Record<VisualMcqQuestion['visualType'], string> = {
  fillblank: 'Fill in the blank',
  trace: 'Trace the execution',
  output: 'Predict the output',
  spotbug: 'Spot the bug',
};

function loadState(folder: string): McqState {
  try {
    const raw = localStorage.getItem(visualMcqProgressKey(folder));
    return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function saveState(folder: string, state: McqState) {
  localStorage.setItem(visualMcqProgressKey(folder), JSON.stringify(state));
}

function ExtraContent({ q }: { q: VisualQuizQuestion }) {
  if (q.code) {
    return (
      <pre className="rounded-lg bg-bg-secondary p-3 text-sm overflow-x-auto">
        <code>{q.code}</code>
      </pre>
    );
  }
  if (q.image) {
    return <img src={assetPath(q.image)} alt="" className="rounded-lg border border-border-color max-w-full" />;
  }
  return null;
}

interface VisualMcqModuleProps {
  folder: string;
}

export function VisualMcqModule({ folder }: VisualMcqModuleProps) {
  const [data, setData] = useState<VisualMcqData | null | 'missing'>(null);
  const [state, setState] = useState<McqState>(() => loadState(folder));

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'visual-mcq.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: VisualMcqData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  useEffect(() => {
    saveState(folder, state);
  }, [folder, state]);

  const questions = useMemo(() => (data && data !== 'missing' ? data.questions : []), [data]);
  const answeredCount = Object.keys(state.answered).length;
  const percent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (data === null || data === 'missing' || questions.length === 0) return null;

  function selectOption(qId: number, optId: string) {
    const q = questions.find((qq) => qq.id === qId);
    if (!q) return;
    setState((prev) => {
      if (q.multiSelect) {
        const current = Array.isArray(prev.selected[qId]) ? (prev.selected[qId] as string[]) : [];
        const correctCount = q.options.filter((o) => o.isCorrect).length;
        const already = current.includes(optId);
        if (!already && current.length >= correctCount) return prev;
        const next = already ? current.filter((id) => id !== optId) : [...current, optId];
        const answered = next.length === correctCount ? { ...prev.answered, [qId]: true as const } : prev.answered;
        return { ...prev, selected: { ...prev.selected, [qId]: next }, answered };
      }
      if (prev.answered[qId]) return prev;
      return {
        ...prev,
        selected: { ...prev.selected, [qId]: optId },
        answered: { ...prev.answered, [qId]: true },
      };
    });
  }

  function resetQuestion(qId: number) {
    setState((prev) => {
      const selected = { ...prev.selected };
      const answered = { ...prev.answered };
      delete selected[qId];
      delete answered[qId];
      return { ...prev, selected, answered };
    });
  }

  function toggleBookmark(qId: number) {
    setState((prev) => {
      const bookmarks = { ...prev.bookmarks };
      if (bookmarks[qId]) delete bookmarks[qId];
      else bookmarks[qId] = true;
      return { ...prev, bookmarks };
    });
  }

  function cycleFlag(qId: number) {
    setState((prev) => {
      const current = prev.flags[qId];
      const next = current === undefined ? 'confusing' : current === 'confusing' ? 'incorrect' : undefined;
      const flags = { ...prev.flags };
      if (next === undefined) delete flags[qId];
      else flags[qId] = next;
      return { ...prev, flags };
    });
  }

  return (
    <section aria-labelledby="notes-visual-mcq-heading" className="mt-8">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 id="notes-visual-mcq-heading" className="text-lg font-semibold text-text-primary">
          {data.title || 'Visual MCQ'}
        </h2>
        <ProgressBar
          percent={percent}
          labelText={`${answeredCount} / ${questions.length} answered`}
          ariaLabel="Visual MCQ progress"
          className="max-w-[220px]"
        />
      </div>
      {questions.map((q, idx) => {
        const correctCount = q.options.filter((o) => o.isCorrect).length;
        const selected = state.selected[q.id];
        const answered = !!state.answered[q.id];
        const isCorrect = q.multiSelect
          ? Array.isArray(selected) && selected.length === correctCount && selected.every((id) => q.options.find((o) => o.id === id)?.isCorrect)
          : q.options.find((o) => o.id === selected)?.isCorrect ?? false;

        return (
          <div key={q.id}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {VISUAL_TYPE_LABEL[q.visualType]}
            </p>
            <QuestionCard
              question={{ ...q, displayNumber: idx + 1 }}
              orderedOptions={q.options}
              selected={selected}
              answered={answered}
              isCorrect={isCorrect}
              correctCount={correctCount}
              bookmarked={!!state.bookmarks[q.id]}
              flag={state.flags[q.id]}
              onSelectOption={(optId) => selectOption(q.id, optId)}
              onReset={() => resetQuestion(q.id)}
              onToggleBookmark={() => toggleBookmark(q.id)}
              onCycleFlag={() => cycleFlag(q.id)}
              extraContent={<ExtraContent q={q} />}
            />
          </div>
        );
      })}
    </section>
  );
}
