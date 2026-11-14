/**
 * lib/readingProgress.ts
 *
 * Framework-agnostic read/write for the `readingProgress-folder-<folder>`
 * key — same "plain functions, no React" convention as lib/dailyGoal.ts
 * and lib/appearance.ts (see lib/README.md). Centralizes logic that was
 * previously duplicated (and only partially confirmed) across
 * NotesIndex.tsx's `readPercentForFolder()` and RecentlyViewed.tsx's
 * private `getRecentFolders()`.
 *
 * P0-3 ("Continue Where You Left Off") is what actually WRITES this key
 * for the first time in the real app — confirmed by grep before this
 * file existed: nothing in src/ called `localStorage.setItem` on a
 * `readingProgress-folder-*` key. NotesIndex/RecentlyViewed/dailyGoal.ts
 * only ever read it, on the documented assumption that some future
 * ticket (this one) would be the writer. `writeFolderProgress()` below
 * is that writer.
 *
 * Real, confirmed shape (RecentlyViewed.tsx's own header comment,
 * itself sourced from the real uploaded recently-viewed.js):
 *   { v: 1, percent: number, timestamp: number }
 *
 * `scrollY` is a new, additive field for P0-3's scroll-restore feature.
 * Per the ticket's own instruction ("scrollY must be added as optional,
 * not a version bump"), it's optional and `v` stays `1` — an entry
 * written before this ticket (or by a hand-crafted fixture matching the
 * pre-existing shape) is still valid, it simply has no saved scroll
 * position to restore. Same additive-field-no-version-bump precedent
 * dailyGoal.ts's `notifiedComplete` already established.
 */

import { readingProgressKey, readingProgressQuizKey } from './storageKeys';

const READING_PROGRESS_PREFIX = 'readingProgress-folder-';
const QUIZ_PROGRESS_PREFIX = 'readingProgress-quiz-';

export interface ReadingProgress {
  v: 1;
  /** 0–100, same field NotesIndex's readPercentForFolder() reads. */
  percent: number;
  timestamp: number;
  /** Last scroll Y position on this note, so reopening it can resume
   * from where the reader left off instead of the top. Absent on
   * entries written before P0-3, or if the note had nothing to scroll. */
  scrollY?: number;
}

function isValidProgress(value: unknown): value is ReadingProgress {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.v === 1 && typeof v.percent === 'number' && typeof v.timestamp === 'number';
}

/** Reads one folder's stored progress. Returns null for missing, malformed, or wrong-version entries — same silent-skip tolerance RecentlyViewed/NotesIndex already use, not a thrown error. */
export function readFolderProgress(folder: string): ReadingProgress | null {
  try {
    const raw = localStorage.getItem(readingProgressKey(folder));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidProgress(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Writes (fully replaces) one folder's progress, stamping a fresh
 * `timestamp` on every call — this is also what makes a note "most
 * recently read" for RecentlyViewed/ContinueReading, so any real
 * scroll/read activity should call this, not just completion.
 */
export function writeFolderProgress(folder: string, data: { percent: number; scrollY?: number }): void {
  try {
    const entry: ReadingProgress = { v: 1, percent: data.percent, timestamp: Date.now() };
    if (typeof data.scrollY === 'number') entry.scrollY = data.scrollY;
    localStorage.setItem(readingProgressKey(folder), JSON.stringify(entry));
  } catch {
    // Private-browsing / storage-disabled: fail silently, matching the
    // rest of the app's storage-write convention (dailyGoal.ts, etc).
  }
}

export interface RecentReadingEntry {
  folder: string;
  timestamp: number;
}

/**
 * Scans every `readingProgress-folder-*` key, most-recent-first,
 * capped at `max`. This is the exact contract RecentlyViewed.tsx's
 * private `getRecentFolders()` already implemented — moved here so it
 * has one real, exported home instead of living as a component-private
 * function, per lib/quickActions.ts's own flagged note ("would need to
 * reuse RecentlyViewed's private most-recent-note resolver, which isn't
 * exported today"). RecentlyViewed.tsx now delegates to this.
 */
export function getRecentReadingEntries(max = 5): RecentReadingEntry[] {
  const entries: RecentReadingEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(READING_PROGRESS_PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '');
        if (parsed && parsed.v === 1 && parsed.timestamp) {
          entries.push({ folder: key.slice(READING_PROGRESS_PREFIX.length), timestamp: parsed.timestamp });
        }
      } catch {
        // malformed entry — skip it, don't let one bad key break the list
      }
    }
  } catch {
    // localStorage inaccessible (e.g. privacy mode) — treat as "nothing yet"
    return [];
  }
  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries.slice(0, max);
}

/** The single most recently read folder, or null when nothing's been read yet. Powers P0-3's "Continue Reading" Dashboard link. */
export function getMostRecentReadingEntry(): RecentReadingEntry | null {
  return getRecentReadingEntries(1)[0] ?? null;
}

// ---------------------------------------------------------------------
// P0-5: Extend Recently Opened to quizzes
// ---------------------------------------------------------------------
//
// Quizzes get their own lightweight "opened" marker (readingProgressQuizKey,
// `readingProgress-quiz-<quizId>`, `{ v: 1, timestamp }`) rather than
// reusing `quiz_progress_<quizId>` (useQuizEngine's real saved-answer
// state) — that key is only ever written after an answer is selected,
// so a quiz that's opened but not yet answered would never show up in
// "Recently Viewed" if it were the source. This marker is written once
// per real quiz load instead (see useQuizEngine.ts), same "just a
// timestamp, nothing else" shape `getRecentReadingEntries` already
// tolerates for notes (no `percent` required at this layer).

export interface RecentQuizEntry {
  quizId: string;
  timestamp: number;
}

/** Marks a quiz as opened just now. Call once per real quiz load
 * (useQuizEngine's load effect), not on every render/save — this is a
 * "last opened" marker, not the engine's in-progress state. */
export function writeQuizOpened(quizId: string): void {
  try {
    localStorage.setItem(readingProgressQuizKey(quizId), JSON.stringify({ v: 1, timestamp: Date.now() }));
  } catch {
    // Private-browsing / storage-disabled: fail silently, matching the
    // rest of the app's storage-write convention (writeFolderProgress, etc).
  }
}

/**
 * Scans every `readingProgress-quiz-*` key, most-recent-first, capped
 * at `max`. Mirrors `getRecentReadingEntries`'s exact scan/skip/sort
 * contract (malformed entries silently skipped, not thrown) for the
 * quiz side of the same feature.
 */
export function getRecentQuizEntries(max = 5): RecentQuizEntry[] {
  const entries: RecentQuizEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(QUIZ_PROGRESS_PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '');
        if (parsed && parsed.v === 1 && parsed.timestamp) {
          entries.push({ quizId: key.slice(QUIZ_PROGRESS_PREFIX.length), timestamp: parsed.timestamp });
        }
      } catch {
        // malformed entry — skip it, don't let one bad key break the list
      }
    }
  } catch {
    // localStorage inaccessible (e.g. privacy mode) — treat as "nothing yet"
    return [];
  }
  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries.slice(0, max);
}

/** One entry in the merged notes+quizzes "Recently Viewed" list — a
 * discriminated union so a consumer (RecentlyViewed) can branch on
 * `kind` to resolve title/link from the right index and route to the
 * right place, without guessing from shape alone. */
export type RecentEntry =
  | { kind: 'note'; folder: string; timestamp: number }
  | { kind: 'quiz'; quizId: string; timestamp: number };

/**
 * P0-5: merges `getRecentReadingEntries` (notes) and
 * `getRecentQuizEntries` (quizzes) into one most-recent-first list,
 * capped at `max` overall — not `max` of each. This is what
 * RecentlyViewed actually renders now.
 *
 * `getRecentReadingEntries`/`getRecentQuizEntries` stay separately
 * exported too: NotesIndex/dailyGoal/ContinueReading only ever wanted
 * the notes-only scan (a quiz has no "reading percent" or scroll
 * position to speak of) and shouldn't have to filter a mixed list back
 * down to get it.
 *
 * Each sub-list is itself already sorted and capped at `max` before
 * merging, so the true top-`max` overall is guaranteed to be a subset
 * of `notes[0..max] ∪ quizzes[0..max]` — merging two `max`-sized lists
 * and re-slicing to `max` is correct, not an approximation.
 */
export function getRecentEntries(max = 5): RecentEntry[] {
  const notes: RecentEntry[] = getRecentReadingEntries(max).map((e) => ({
    kind: 'note' as const,
    folder: e.folder,
    timestamp: e.timestamp,
  }));
  const quizzes: RecentEntry[] = getRecentQuizEntries(max).map((e) => ({
    kind: 'quiz' as const,
    quizId: e.quizId,
    timestamp: e.timestamp,
  }));
  return [...notes, ...quizzes].sort((a, b) => b.timestamp - a.timestamp).slice(0, max);
}
