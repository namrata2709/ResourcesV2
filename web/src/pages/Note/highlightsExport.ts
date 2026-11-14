/**
 * pages/Note/highlightsExport.ts — T5-3c-6: turns this note's saved
 * P1-1 highlights (plus any P1-2 personal notes riding along with
 * them) into the plain-text content Note.tsx's "Export Highlights"
 * Tools action downloads.
 *
 * Split out from Note.tsx itself so the actual text-building logic is
 * unit-testable directly, without going through a full component
 * render + Blob/download round-trip -- same "content vs. download-
 * trigger" split lib/exportAs.ts's own docstring already establishes
 * for the docx/epub export paths (there: adapters build content,
 * `triggerDownload` owns the browser download step; here: this
 * function builds content, Note.tsx's `exportHighlights` owns the
 * download step via that same `triggerDownload`).
 *
 * Order: whatever order `loadHighlights` returns them in -- creation
 * order, since `addHighlight` (highlights.ts) always appends -- same
 * "don't invent a second sort" call `exportNoteAs` already makes for
 * body-prose blocks rather than re-deriving document order here.
 *
 * Deliberately NOT split into "Key Sentences" / "Key Terms" sections:
 * that distinction belongs to the unrelated `examTerm`/`examSentence`
 * inline content marks (types.ts's `RunMark`, notes-exam.js's exam
 * mode) -- author-provided marks on the note's own prose, not
 * anything a reader selects. A P1-1 `Highlight` record carries no
 * such category (see highlights.ts's own shape), so this export
 * doesn't fabricate one; every highlight is listed together, in the
 * order it was created.
 */

import type { Highlight } from './highlights';

export function buildHighlightsExportText(noteTitle: string, highlights: Highlight[]): string {
  const lines = [`# Exam Highlights — ${noteTitle}`, ''];
  highlights.forEach((h, i) => {
    lines.push(`${i + 1}. ${h.text}`);
    if (h.note) lines.push(`   Note: ${h.note}`);
    lines.push('');
  });
  // Single trailing newline, not a blank-line-per-entry tail.
  return lines.join('\n').trimEnd() + '\n';
}
