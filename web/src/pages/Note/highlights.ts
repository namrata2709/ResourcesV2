/**
 * pages/Note/highlights.ts — P1-1: shared load/save for per-page
 * highlight state. Same "load/save + one shared implementation, not a
 * private copy per component" convention `bookmarks.ts` already
 * established for T5-3c-7's star control.
 *
 * Storage shape: an array of `Highlight` records under
 * `highlightsKey(pageId)`, one entry per highlighted span. Each entry
 * anchors to a body-prose block via its `blockId` (P1-1's other half,
 * generate_notes.py's stable per-block id) plus the exact selected
 * `text` -- at render time, BodyProse finds that text inside the
 * matching block's runs and wraps it (see ./highlightRuns.ts). This is
 * deliberately NOT a character-offset anchor: block content between
 * regenerations is expected to be identical when blockId is stable
 * (same tradeoff generate_notes.py's own blockId docstring names), so
 * a plain text match is enough and survives minor whitespace-only
 * re-runs a brittle offset wouldn't.
 */

import { highlightsKey } from '../../lib/storageKeys';

export interface Highlight {
  id: string;
  blockId: string;
  text: string;
  createdAt: number;
  /** P1-2: an optional personal note attached to this highlight.
   * Undefined (not an empty string) when none has ever been saved --
   * keeps `loadHighlights`'s malformed-shape filter simple (no note
   * field to validate) and avoids persisting a wave of empty-string
   * noise for the common case of a highlight with no note. */
  note?: string;
}

function makeHighlightId(): string {
  // Same "good enough, not cryptographic" id shape used elsewhere in
  // this codebase for client-generated ids (timestamp + random suffix).
  return `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadHighlights(pageId: string): Highlight[] {
  try {
    const saved = JSON.parse(localStorage.getItem(highlightsKey(pageId)) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (h): h is Highlight =>
        h && typeof h === 'object' &&
        typeof h.id === 'string' &&
        typeof h.blockId === 'string' &&
        typeof h.text === 'string' &&
        (h.note === undefined || typeof h.note === 'string')
    );
  } catch {
    return [];
  }
}

function saveHighlights(pageId: string, highlights: Highlight[]): void {
  try {
    localStorage.setItem(highlightsKey(pageId), JSON.stringify(highlights));
  } catch {
    // ignore — matches the site-wide silent-fail storage pattern
  }
}

/** Adds a new highlight for the given block/text and returns the full,
 * updated list. No-ops (returns the list unchanged) for empty/
 * whitespace-only text -- there's nothing meaningful to anchor a
 * highlight to otherwise. */
export function addHighlight(pageId: string, blockId: string, text: string): Highlight[] {
  const trimmed = text.trim();
  if (!trimmed) return loadHighlights(pageId);
  const current = loadHighlights(pageId);
  const next = [...current, { id: makeHighlightId(), blockId, text: trimmed, createdAt: Date.now() }];
  saveHighlights(pageId, next);
  return next;
}

/** P1-2: sets (or clears) the personal note attached to an existing
 * highlight. Trims the input the same way `addHighlight` trims a new
 * selection; an empty/whitespace-only note clears the field entirely
 * (stored as `undefined`, not `''`) rather than persisting an empty
 * string that would otherwise show as a saved-but-blank note in the UI.
 * No-ops (returns the list unchanged) if `highlightId` doesn't exist --
 * mirrors `removeHighlight`'s own "silently ignore an unknown id"
 * behavior rather than throwing. */
export function setHighlightNote(pageId: string, highlightId: string, note: string): Highlight[] {
  const trimmed = note.trim();
  const current = loadHighlights(pageId);
  const next = current.map((h) =>
    h.id === highlightId ? { ...h, note: trimmed || undefined } : h
  );
  saveHighlights(pageId, next);
  return next;
}

export function removeHighlight(pageId: string, highlightId: string): Highlight[] {
  const next = loadHighlights(pageId).filter((h) => h.id !== highlightId);
  saveHighlights(pageId, next);
  return next;
}

/** Groups a flat highlight list by blockId, for quick per-block lookup
 * while rendering (BodyProse renders one block at a time and shouldn't
 * re-scan the full list per block). */
export function groupHighlightsByBlock(highlights: Highlight[]): Record<string, Highlight[]> {
  const byBlock: Record<string, Highlight[]> = {};
  for (const h of highlights) {
    (byBlock[h.blockId] ??= []).push(h);
  }
  return byBlock;
}
