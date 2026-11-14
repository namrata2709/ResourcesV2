/**
 * lib/stickyNotes.ts
 *
 * Framework-agnostic Sticky Notes (P0-10) read/write — plain functions, no
 * React, same shape as lib/dailyGoal.ts and lib/appearance.ts. Stores under
 * `stickyNotes-<pageId>` per the `<pageId>-<feature>` convention
 * (lib/pageId.ts derives the id) — one freeform text note per page, not
 * anchored to a specific highlighted span (that's P1-2 Personal Notes,
 * a separate, harder ticket that attaches to Highlighting's stable ids
 * instead).
 */

export interface StickyNote {
  v: 1;
  text: string;
  /** ISO timestamp, set on every save. */
  updatedAt: string;
}

function storageKey(pageId: string): string {
  return `stickyNotes-${pageId}`;
}

function isStickyNote(value: unknown): value is StickyNote {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.v === 1 && typeof candidate.text === 'string' && typeof candidate.updatedAt === 'string';
}

/** Reads the sticky note for a page, or null if none exists / data is corrupt. */
export function getStickyNote(pageId: string): StickyNote | null {
  try {
    const saved = localStorage.getItem(storageKey(pageId));
    if (saved === null) return null;
    const parsed = JSON.parse(saved);
    return isStickyNote(parsed) ? parsed : null;
  } catch {
    // Private-browsing / storage-disabled / malformed JSON: fail silently,
    // same as every other lib/*.ts read in this app.
    return null;
  }
}

/** Creates or updates the sticky note for a page. Empty text is allowed (mid-edit) — use deleteStickyNote() to remove it. */
export function saveStickyNote(pageId: string, text: string): StickyNote {
  const note: StickyNote = { v: 1, text, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(storageKey(pageId), JSON.stringify(note));
  } catch {
    // no-op — matches the rest of the app's silent-fail storage pattern
  }
  return note;
}

/** Removes the sticky note for a page entirely. */
export function deleteStickyNote(pageId: string): void {
  try {
    localStorage.removeItem(storageKey(pageId));
  } catch {
    // ignore
  }
}
