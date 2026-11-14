/**
 * pages/SearchMyNotes/myNotesData.ts — P3-1's actual scoping logic.
 *
 * P3-1's ticket text: "Search Only My Notes ... reusing useSearch()
 * from T3-3, do not build a new search implementation." That covers
 * the RANKING half (useSearch + NotesIndex's own SEARCH_FIELDS, see
 * SearchMyNotes.tsx). This file covers the SCOPING half — deciding
 * which notes count as "my notes" in the first place, before any
 * query is even typed.
 *
 * "My notes" per the ticket's own manual test ("search scoped to
 * highlights/bookmarks") = notes the person has actually marked up:
 * at least one saved highlight (P1-1, pages/Note/highlights.ts) or at
 * least one bookmarked section (T5-3c-7, pages/Note/bookmarks.ts).
 * Plain "favorited" notes are a different, already-existing concept
 * (NOTES_FAVORITES_KEY, T3-3) — this deliberately does NOT fold
 * favorites in, so "My Notes" search stays true to what P1-1/P1-2's
 * own dependency chain actually built for it to search, rather than
 * silently becoming a second Favorites filter.
 *
 * Both `loadHighlights`/`loadBookmarkIds` are per-folder localStorage
 * reads (P1-1/T5-3c-7 key the highlight/bookmark set off the note's
 * `folder`, same as every other per-note key in lib/storageKeys.ts —
 * confirmed directly against pages/Note/Note.tsx, which passes
 * `note.folder` as both `pageId` and `folder` everywhere). Notes-index
 * data itself has no highlight/bookmark counts baked in (Python's
 * generation pipeline has no idea what's in a given browser's
 * localStorage), so this has to do the per-folder scan client-side —
 * same reasoning `readPercentForFolder` in NotesIndex.tsx already
 * uses for reading-progress percent.
 */

import type { SearchableItem } from '../../hooks/useSearch';
import type { Note } from '../NotesIndex';
import { loadHighlights } from '../Note/highlights';
import { loadBookmarkIds } from '../Note/bookmarks';

export interface MyNoteItem extends Note, SearchableItem {
  /** Count of saved highlights (P1-1) for this note, for display + the has-content check below. */
  highlightCount: number;
  /** Count of bookmarked sections (T5-3c-7) for this note, same purpose. */
  bookmarkCount: number;
}

/**
 * Scans every note's localStorage state and returns only the ones with
 * real, saved highlight/bookmark content — the actual "my notes" set
 * P3-1's search is scoped to. `id` is mapped from `folder`, same
 * SearchableItem contract every other useSearch() caller (NotesIndex,
 * QuizIndex) already follows.
 *
 * Deliberately synchronous and re-run on demand (see SearchMyNotes.tsx's
 * `storage`-event listener) rather than memoized against `notes` alone —
 * the notes list itself rarely changes within a session, but the
 * highlight/bookmark state it's being cross-checked against can change
 * on every visit to a note page, including from another tab.
 */
export function buildMyNotesItems(notes: Note[]): MyNoteItem[] {
  const items: MyNoteItem[] = [];

  for (const note of notes) {
    const highlightCount = loadHighlights(note.folder).length;
    const bookmarkCount = loadBookmarkIds(note.folder).length;
    if (highlightCount === 0 && bookmarkCount === 0) continue;

    items.push({ ...note, id: note.folder, highlightCount, bookmarkCount });
  }

  return items;
}
