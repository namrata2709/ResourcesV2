/**
 * lib/notebookExport.ts — E0-2's multi-note export paths: "whole
 * notebook", "favorites", and "bookmarked" from the ticket's own scope
 * list ("current chapter" is just Note.tsx's existing single-note
 * exportNoteAsDocx/exportNoteAsEpub calls -- no separate multi-note
 * logic needed for that one, see pages/Export/Export.tsx).
 *
 * Scope definitions, decided here since the ticket text names the
 * three options but not their exact selection rule:
 *   - "whole notebook": every note in notes-index.json, full content.
 *   - "favorites": only notes in NOTES_FAVORITES_KEY (the same set
 *     NotesIndex/Note's heart toggle reads/writes), full content --
 *     favoriting a note is a "keep the whole thing" signal, not a
 *     request to excerpt it.
 *   - "bookmarked": only notes with at least one real bookmark or
 *     highlight recorded against them, and for those notes ONLY the
 *     qualifying sections -- reuses pages/Note/revisionFilter.ts's
 *     exact filtering rule (P3-2's Revision Mode) rather than a
 *     second, competing definition of "bookmarked content" invented
 *     here. A note with zero bookmarks/highlights contributes nothing
 *     and isn't a book with an empty chapter in it.
 *
 * Both output formats are supported from the one scope-selection step
 * (E0-2's own "Export options UI" pairs format + scope as independent
 * choices): EPUB gets one real chapter per note via lib/epubBook.ts;
 * DOCX -- which has no chapter/spine concept -- gets one heading per
 * note folded into a single flat document, via the existing
 * lib/docxExport.ts adapter (dynamically imported, same "don't pay for
 * the `docx` library unless this path is actually used" reasoning
 * exportAs.ts's own ADAPTER_LOADERS already establishes).
 *
 * A note whose body-prose.json 404s or has zero blocks is skipped, not
 * fatal to the whole export -- same "flag, don't abort" discipline
 * quizBookExport.ts follows for a bad quiz file.
 */

import { dataPath } from './siteConfig';
import { slugify, triggerDownload } from './exportAs';
import { buildEpub, escapeXml, type EpubChapter } from './epubBook';
import { blocksToXhtml } from './bodyProseToXhtml';
import { NOTES_FAVORITES_KEY } from './storageKeys';
import { loadHighlights, groupHighlightsByBlock } from '../pages/Note/highlights';
import { loadBookmarkIds } from '../pages/Note/bookmarks';
import { filterBlocksForRevision } from '../pages/Note/revisionFilter';
import type { BodyProseBlock, BodyProseData, BodyProseHeadingBlock } from '../pages/Note/types';
import type { Note } from '../pages/NotesIndex';

export type NotebookScope = 'whole' | 'favorites' | 'bookmarked';
export type NotebookFormat = 'docx' | 'epub';

interface NotesIndexData {
  notes: Note[];
}

function readFavoriteFolders(): Set<string> {
  try {
    const saved = JSON.parse(localStorage.getItem(NOTES_FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

async function fetchBlocks(folder: string): Promise<BodyProseBlock[]> {
  const res = await fetch(dataPath('notes', folder, 'json', 'body-prose.json'));
  if (!res.ok) return [];
  const data: BodyProseData = await res.json();
  return data.blocks ?? [];
}

interface NoteContribution {
  note: Note;
  blocks: BodyProseBlock[];
}

/** Resolves which notes participate for `scope`, and what block subset
 * each contributes -- the one place that decision is made, so EPUB and
 * DOCX output below can't drift on which notes/sections a scope
 * includes. */
async function resolveContributions(scope: NotebookScope): Promise<{
  contributions: NoteContribution[];
  skipped: string[];
}> {
  const indexRes = await fetch(dataPath('index', 'notes-index.json'));
  if (!indexRes.ok) throw new Error('Could not load the notes index.');
  const index: NotesIndexData = await indexRes.json();

  const favorites = scope === 'favorites' ? readFavoriteFolders() : null;

  const candidateNotes =
    scope === 'favorites'
      ? index.notes.filter((n) => favorites!.has(n.folder))
      : index.notes;

  const contributions: NoteContribution[] = [];
  const skipped: string[] = [];

  for (const note of candidateNotes) {
    let blocks: BodyProseBlock[];
    try {
      blocks = await fetchBlocks(note.folder);
    } catch {
      skipped.push(note.title);
      continue;
    }

    if (scope === 'bookmarked') {
      const highlights = loadHighlights(note.folder);
      const bookmarkIds = loadBookmarkIds(note.folder);
      if (highlights.length === 0 && bookmarkIds.length === 0) continue;
      blocks = filterBlocksForRevision(blocks, groupHighlightsByBlock(highlights), bookmarkIds);
    }

    if (blocks.length === 0) {
      skipped.push(note.title);
      continue;
    }
    contributions.push({ note, blocks });
  }

  return { contributions, skipped };
}

const SCOPE_BOOK_TITLE: Record<NotebookScope, string> = {
  whole: 'Notebook Buddy — Full Notebook',
  favorites: 'Notebook Buddy — Favorites',
  bookmarked: 'Notebook Buddy — Bookmarked & Highlighted',
};

function noteHeading(note: Note): BodyProseHeadingBlock {
  return { type: 'heading', level: 1, id: note.folder, text: [{ text: note.title, mark: null }] };
}

async function buildEpubBook(scope: NotebookScope, contributions: NoteContribution[]): Promise<Blob> {
  const chapters: EpubChapter[] = contributions.map(({ note, blocks }) => ({
    id: note.folder,
    title: note.title,
    bodyHtml: `<h1>${escapeXml(note.title)}</h1>\n${blocksToXhtml(blocks)}`,
  }));
  return buildEpub({ title: SCOPE_BOOK_TITLE[scope], chapters });
}

async function buildDocxBook(scope: NotebookScope, contributions: NoteContribution[]): Promise<Blob> {
  const { toDocxBlob } = await import('./docxExport');
  const allBlocks: BodyProseBlock[] = contributions.flatMap(({ note, blocks }) => [
    noteHeading(note),
    ...blocks,
  ]);
  const { blob } = await toDocxBlob({ title: SCOPE_BOOK_TITLE[scope], blocks: allBlocks });
  return blob;
}

/** Runs the whole resolve → build → download flow for `scope`/`format`.
 * Throws if nothing qualifies (empty notebook, no favorites, or no
 * bookmarked/highlighted content) -- callers are expected to catch and
 * show an honest "nothing to export" message, same convention every
 * other export path in this codebase already follows rather than
 * silently downloading an empty book. */
export async function exportNotebook(
  scope: NotebookScope,
  format: NotebookFormat,
): Promise<{ skipped: string[] }> {
  const { contributions, skipped } = await resolveContributions(scope);
  if (contributions.length === 0) {
    throw new Error('Nothing to export for this scope yet.');
  }

  const blob =
    format === 'epub' ? await buildEpubBook(scope, contributions) : await buildDocxBook(scope, contributions);
  const ext = format === 'epub' ? 'epub' : 'docx';
  triggerDownload(blob, `${slugify(SCOPE_BOOK_TITLE[scope])}.${ext}`);
  return { skipped };
}
