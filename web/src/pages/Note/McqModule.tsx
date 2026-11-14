/**
 * McqModule — a note's embedded MCQ section. Explicit direction (T5-1's
 * own scope note, restated in T5-3a): render via `QuestionCard`,
 * matching Quiz's look/feel — NOT vanilla notes-mcq.js's separate
 * carousel style.
 *
 * Deliberately simpler than the full `useQuizEngine` (pages/Quiz/): no
 * shuffle, no timer, no print-format picker, no attempt history — this
 * is a fixed-order comprehension check embedded partway down a note,
 * not a standalone timed assessment. What IS kept, because it's the
 * same real UX QuestionCard already provides: answer/lock, per-option
 * explanations, bookmark, flag-cycle, reset. State persists to
 * `notes_mcq_progress_<folder>` — deliberately separate from
 * `quiz_progress_<file>` (T1-5's "Open as Quiz" link on the same JSON
 * gets its own independent progress, not shared with this embedded
 * view).
 *
 * "Open as Quiz" (T1-5): links to `/quiz/:folder?source=notes`. No
 * `quiz-index.json` registration needed — `useQuizEngine`'s `source`
 * param (see its own header) fetches this exact same `mcq.json` file
 * directly by folder id, same unified schema (T5-2), so it's a pure
 * routing/UI addition, not a data-format change. The link only renders
 * once real questions exist (after the `data === null || 'missing'`
 * early-return below), so it's never shown for a note with no MCQ
 * section.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QuestionCard } from '../../components/QuestionCard';
import { ProgressBar } from '../../components/ProgressBar';
import { dataPath } from '../../lib/siteConfig';
import { notesMcqProgressKey } from '../../lib/storageKeys';
import type { QuizData } from '../Quiz/types';

interface McqState {
  selected: Record<number, string | string[]>;
  answered: Record<number, true>;
  bookmarks: Record<number, true>;
  flags: Record<number, 'confusing' | 'incorrect'>;
}

const EMPTY_STATE: McqState = { selected: {}, answered: {}, bookmarks: {}, flags: {} };

function loadState(folder: string): McqState {
  try {
    const raw = localStorage.getItem(notesMcqProgressKey(folder));
    return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function saveState(folder: string, state: McqState) {
  localStorage.setItem(notesMcqProgressKey(folder), JSON.stringify(state));
}

interface McqModuleProps {
  folder: string;
}

export function McqModule({ folder }: McqModuleProps) {
  const [data, setData] = useState<QuizData | null | 'missing'>(null);
  const [state, setState] = useState<McqState>(() => loadState(folder));

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'mcq.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: QuizData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        // No MCQ section for this note — a normal, expected case, not an
        // error to surface (most notes won't have one).
        if (!cancelled) setData('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  useEffect(() => {
    saveState(folder, state);
  }, [folder, state]);

  const questions = useMemo(() => data && data !== 'missing' ? data.questions : [], [data]);
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
        if (!already && current.length >= correctCount) return prev; // matches QuestionCard's own maxReached guard
        const next = already ? current.filter((id) => id !== optId) : [...current, optId];
        const answered = next.length === correctCount ? { ...prev.answered, [qId]: true as const } : prev.answered;
        return { ...prev, selected: { ...prev.selected, [qId]: next }, answered };
      }
      if (prev.answered[qId]) return prev; // locked, same as QuestionCard's own disabled state
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
    <section aria-labelledby="notes-mcq-heading" className="mt-8">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 id="notes-mcq-heading" className="text-lg font-semibold text-text-primary">
          Check Your Understanding
        </h2>
        <div className="flex items-center gap-3">
          <ProgressBar
            percent={percent}
            labelText={`${answeredCount} / ${questions.length} answered`}
            ariaLabel="MCQ progress"
            className="max-w-[220px]"
          />
          <Link
            to={`/quiz/${folder}?source=notes`}
            className="text-sm whitespace-nowrap text-primary hover:underline"
          >
            Open as Quiz ↗
          </Link>
        </div>
      </div>
      {questions.map((q, idx) => {
        const correctCount = q.options.filter((o) => o.isCorrect).length;
        const selected = state.selected[q.id];
        const answered = !!state.answered[q.id];
        const isCorrect = q.multiSelect
          ? Array.isArray(selected) && selected.length === correctCount && selected.every((id) => q.options.find((o) => o.id === id)?.isCorrect)
          : q.options.find((o) => o.id === selected)?.isCorrect ?? false;

        return (
          <QuestionCard
            key={q.id}
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
          />
        );
      })}
    </section>
  );
}
