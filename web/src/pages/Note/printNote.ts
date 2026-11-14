/**
 * pages/Note/printNote.ts — T5-3c-2's Tools > Print format picker.
 *
 * ASSUMPTION FLAGGED: PrintGuard.tsx's own comment refers to a real
 * vanilla "notes-print.js's format picker" as prior art, implying
 * vanilla's note pages already had a defined set of print modes. That
 * source wasn't part of this session's upload (only web.zip/python.zip
 * — no vanilla src/src tree), so its exact modes couldn't be confirmed
 * or ported. The 2 modes below are a reasonable minimum built from
 * what IS available in this codebase (lib/moduleRegistry.ts's
 * core/interactive/links tags, already wired to Lite Mode) rather than
 * a guess at vanilla's exact wording — flagging this rather than
 * presenting it as a confirmed port, in case the real vanilla picker
 * had more/different modes worth matching later.
 *
 *   - Full page   — print exactly what's on screen, no changes.
 *   - Notes only  — print only 'core'-tagged content (body-prose +
 *     glossary), hiding interactive/links modules via the
 *     `print-core-only` class + index.css's `data-module-tag` rule —
 *     the same registry Lite Mode already reads (T5-3c-1), not a
 *     second categorization list.
 */

const PRINT_CORE_ONLY_CLASS = 'print-core-only';

function printWithClass(className: string | null): void {
  if (className) document.body.classList.add(className);

  function cleanup() {
    if (className) document.body.classList.remove(className);
    window.removeEventListener('afterprint', cleanup);
  }
  // afterprint fires whether the user completes or cancels the print
  // dialog, so this can't leak the class if they back out — same
  // cleanup-on-event pattern useFullscreenChrome.ts already uses for
  // fullscreenchange.
  window.addEventListener('afterprint', cleanup);
  window.print();
}

export function printFullPage(): void {
  printWithClass(null);
}

export function printCoreOnly(): void {
  printWithClass(PRINT_CORE_ONLY_CLASS);
}
