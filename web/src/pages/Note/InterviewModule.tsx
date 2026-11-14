/**
 * InterviewModule — a note's interview-prep section: reveal-answer Q&A
 * cards, each markable "Practiced". Progress persists to
 * `<folder>-interview-state` (a plain array of practiced question ids),
 * via lib/storageKeys.ts's `interviewStateKey`, and renders the shared
 * `ProgressBar` — same pattern as ChecklistModule, different underlying
 * metric (practiced/total, not checked/total).
 */

import { useEffect, useState } from 'react';
import { ProgressBar } from '../../components/ProgressBar';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import { dataPath } from '../../lib/siteConfig';
import { interviewStateKey } from '../../lib/storageKeys';
import type { InterviewData } from './types';

function loadPracticed(pageId: string): Set<string> {
  try {
    const raw = localStorage.getItem(interviewStateKey(pageId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function savePracticed(pageId: string, practiced: Set<string>) {
  localStorage.setItem(interviewStateKey(pageId), JSON.stringify(Array.from(practiced)));
}

interface InterviewModuleProps {
  folder: string;
}

export function InterviewModule({ folder }: InterviewModuleProps) {
  const [data, setData] = useState<InterviewData | null | 'missing'>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [practiced, setPracticed] = useState<Set<string>>(() => loadPracticed(folder));
  const { announce } = useLiveRegion();

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'interview.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: InterviewData) => {
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
    savePracticed(folder, practiced);
  }, [folder, practiced]);

  if (data === null || data === 'missing' || data.questions.length === 0) return null;

  const questions = data.questions;
  const percent = questions.length > 0 ? (practiced.size / questions.length) * 100 : 0;

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePracticed(id: string, question: string) {
    setPracticed((prev) => {
      const next = new Set(prev);
      const willMark = !next.has(id);
      if (willMark) next.add(id);
      else next.delete(id);
      announce(willMark ? `Marked practiced: ${question}` : `Unmarked: ${question}`);
      return next;
    });
  }

  return (
    <section aria-labelledby="notes-interview-heading" className="mt-8">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 id="notes-interview-heading" className="text-lg font-semibold text-text-primary">
          {data.title || 'Interview Prep'}
        </h2>
        <ProgressBar
          percent={percent}
          labelText={`${practiced.size} / ${questions.length} practiced`}
          ariaLabel="Interview prep progress"
          className="max-w-[220px]"
        />
      </div>
      <ul className="space-y-3">
        {questions.map((q) => {
          const isRevealed = revealed.has(q.id);
          const isPracticed = practiced.has(q.id);
          return (
            <li key={q.id} className="rounded-lg border border-border-color bg-bg-card p-4">
              <p className="font-medium text-text-primary">{q.question}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleReveal(q.id)}
                  aria-expanded={isRevealed}
                  className="text-sm font-medium text-primary hover:text-accent underline underline-offset-2"
                >
                  {isRevealed ? 'Hide answer' : 'Reveal answer'}
                </button>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={isPracticed}
                    onChange={() => togglePracticed(q.id, q.question)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Practiced
                </label>
              </div>
              {isRevealed && (
                <div className="mt-3 rounded-md bg-bg-secondary p-3 text-sm text-text-secondary">
                  <p>{q.answer}</p>
                  {q.tips && <p className="mt-2 text-text-muted italic">Tip: {q.tips}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
