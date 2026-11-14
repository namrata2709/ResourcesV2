import { useState } from 'react';
import type { QuizOption, QuizQuestion } from './types';

/**
 * PrintExport.tsx — T5-1's print-format picker (quiz-print.js's 4-mode
 * picker) and clipboard export (quiz-export.js). Quiz.tsx is deliberately
 * NOT wrapped in the shared `PrintGuard` (see PrintGuard.tsx's own
 * comment) — it keeps this real picker instead, matching vanilla.
 *
 * Four modes, mirroring `_preparePrintDOM()`'s mode logic in
 * quiz-print.js:
 *   - question-paper:    questions + options, no answers revealed
 *   - answer-key:        just the correct option letter(s) per question
 *   - answers-reasons:   correct answer + its one-line "why"
 *   - full-explanations: every option, marked correct/incorrect, with
 *                        its full explanation text
 *
 * Print and clipboard-export share one text builder (`buildPrintText`)
 * so the two stay in sync by construction — a mode change updates both
 * at once, there's no separate "export template" to drift from the
 * print template.
 */

export type PrintMode = 'question-paper' | 'answer-key' | 'answers-reasons' | 'full-explanations';

export const PRINT_MODE_LABELS: Record<PrintMode, string> = {
  'question-paper': 'Question paper',
  'answer-key': 'Answer key',
  'answers-reasons': 'Answers + reasons',
  'full-explanations': 'Full explanations',
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function buildPrintText(
  title: string,
  questions: QuizQuestion[],
  getOrderedOptions: (q: QuizQuestion) => QuizOption[],
  mode: PrintMode,
): string {
  const lines: string[] = [title, '='.repeat(title.length), ''];

  questions.forEach((q, i) => {
    const num = q.displayNumber ?? i + 1;
    const opts = getOrderedOptions(q);
    lines.push(`${num}. ${q.question}`);

    if (mode !== 'answer-key') {
      opts.forEach((o, idx) => {
        const letter = OPTION_LETTERS[idx] ?? String(idx + 1);
        const marker = mode === 'full-explanations' ? (o.isCorrect ? ' [correct]' : '') : '';
        lines.push(`   ${letter}. ${o.text}${marker}`);
      });
    }

    if (mode === 'answer-key' || mode === 'answers-reasons' || mode === 'full-explanations') {
      const correctLetters = opts
        .map((o, idx) => (o.isCorrect ? OPTION_LETTERS[idx] ?? String(idx + 1) : null))
        .filter((l): l is string => l !== null)
        .join(', ');
      lines.push(`   Correct: ${correctLetters}`);
    }

    if (mode === 'answers-reasons') {
      const correctWithWhy = opts.find((o) => o.isCorrect && o.explanation?.why);
      if (correctWithWhy?.explanation?.why) lines.push(`   Why: ${correctWithWhy.explanation.why}`);
    }

    if (mode === 'full-explanations') {
      opts.forEach((o) => {
        if (o.explanation?.why) lines.push(`   ${o.isCorrect ? '✓' : '✗'} ${o.text}: ${o.explanation.why}`);
      });
    }

    lines.push('');
  });

  return lines.join('\n');
}

export function QuizPrintExport({
  title,
  questions,
  getOrderedOptions,
}: {
  title: string;
  questions: QuizQuestion[];
  getOrderedOptions: (q: QuizQuestion) => QuizOption[];
}) {
  const [mode, setMode] = useState<PrintMode>('question-paper');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const text = buildPrintText(title, questions, getOrderedOptions, mode);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
    } catch {
      // matches this codebase's silent-fail pattern for storage/clipboard
      // (see useQuizEngine.ts's saveState) — the button label still
      // reflects the failure so it's not silent to the user.
      setCopyStatus('failed');
    }
    setTimeout(() => setCopyStatus('idle'), 2200);
  }

  return (
    <>
      <div
        role="group"
        aria-label="Print and export options"
        className="print:hidden flex flex-wrap items-center gap-2 mb-4"
      >
        <label htmlFor="quiz-print-mode" className="text-sm text-text-secondary">
          Print format
        </label>
        <select
          id="quiz-print-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as PrintMode)}
          className="text-sm rounded-lg border border-border-color bg-bg-card text-text-primary px-2 py-1.5"
        >
          {(Object.entries(PRINT_MODE_LABELS) as [PrintMode, string][]).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-sm px-3 py-1.5 rounded-lg border border-border-color text-text-secondary hover:bg-bg-secondary"
        >
          🖨 Print
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="text-sm px-3 py-1.5 rounded-lg border border-border-color text-text-secondary hover:bg-bg-secondary"
        >
          {copyStatus === 'copied' ? '✓ Copied' : copyStatus === 'failed' ? 'Copy failed' : '📋 Copy'}
        </button>
      </div>

      {/* Print-only view: the real question cards (and everything else in
          Quiz.tsx's normal body) are wrapped `print:hidden` at the call
          site — this is what actually renders on paper, shaped by `mode`. */}
      <div aria-hidden="true" className="hidden print:block whitespace-pre-wrap text-black text-sm">
        {text}
      </div>
    </>
  );
}
