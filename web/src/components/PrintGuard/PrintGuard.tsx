import type { ReactNode } from 'react';

/**
 * PrintGuard — T3-1b: Dashboard/NotesIndex/QuizIndex/Gallery have no
 * print design at all, so printing one today just dumps whatever the
 * browser happens to render (a card grid/filter UI never designed for
 * paper). This wraps those specific pages ONLY — `Note`/`Quiz` keep
 * their own real print pickers (notes-print.js's format picker,
 * quiz-print.js's 4-mode picker) unaffected, since they're not wrapped
 * in this component at all.
 *
 * `print:hidden` / `print:block` are core Tailwind print-variant
 * utilities (no plugin needed) — no separate print stylesheet file
 * required.
 */
export function PrintGuard({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="print:hidden">{children}</div>
      <div className="hidden print:flex flex-col items-center justify-center text-center px-6 py-24">
        <p className="text-lg">This page can&apos;t be printed directly.</p>
        <p className="text-lg">Open a note or quiz to print it.</p>
      </div>
    </>
  );
}
