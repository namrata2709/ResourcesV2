/**
 * lib/revisionBookExport.ts — E0-2's Revision Book variant.
 *
 * Manual test #3 (E0-2's own ticket text): "confirm it correctly
 * combines favorites + highlights + bookmarks." Decided here, since
 * the ticket names the three ingredients but not their combination
 * rule: for every note in the notebook —
 *   - if it's favorited (NOTES_FAVORITES_KEY), include it IN FULL —
 *     favoriting is a "keep the whole thing" signal, same reasoning
 *     lib/notebookExport.ts's "favorites" scope already applies;
 *   - otherwise, if it has any real highlight or bookmark recorded
 *     against it, include ONLY the qualifying sections, via the exact
 *     same pages/Note/revisionFilter.ts filter P3-2's live Revision
 *     Mode uses — one shared filtering rule, not a second definition
 *     of "revision-worthy content" invented here;
 *   - otherwise, the note contributes nothing.
 * A favorited note that ALSO has highlights/bookmarks still goes in
 * full (favorited wins) rather than double-including an excerpted
 * version alongside the full one.
 *
 * This is real "combine," not three separate sections concatenated —
 * each note appears exactly once, using whichever rule applies to it.
 */

import { dataPath } from './siteConfig';
import { slugify, triggerDownload } from './exportAs';
import { buildEpub, escapeXml, type EpubChapter } from './epubBook';
import { blocksToXhtml } from './bodyProseToXhtml';
import { NOTES_FAVORITES_KEY } from './storageKeys';
import { loadHighlights, groupHighlightsByBlock } from '../pages/Note/highlights';
import { loadBookmarkIds } from '../pages/Note/bookmarks';
import { filterBlocksForRevision } from '../pages/Note/revisionFilter';
import type { BodyProseBlock, BodyProseData } from '../pages/Note/types';
import type { Note } from '../pages/NotesIndex';

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

/** Builds and downloads the Revision Book. Throws if no note qualifies
 * under any of the three rules -- same "throw, let the caller show an
 * honest empty-state message" convention every other export path here
 * follows. */
export async function exportRevisionBook(): Promise<{ skipped: string[] }> {
  const indexRes = await fetch(dataPath('index', 'notes-index.json'));
  if (!indexRes.ok) throw new Error('Could not load the notes index.');
  const index: NotesIndexData = await indexRes.json();
  const favorites = readFavoriteFolders();

  const chapters: EpubChapter[] = [];
  const skipped: string[] = [];

  for (const note of index.notes) {
    let blocks: BodyProseBlock[];
    try {
      blocks = await fetchBlocks(note.folder);
    } catch {
      skipped.push(note.title);
      continue;
    }

    const isFavorited = favorites.has(note.folder);
    if (!isFavorited) {
      const highlights = loadHighlights(note.folder);
      const bookmarkIds = loadBookmarkIds(note.folder);
      if (highlights.length === 0 && bookmarkIds.length === 0) continue;
      blocks = filterBlocksForRevision(blocks, groupHighlightsByBlock(highlights), bookmarkIds);
    }

    if (blocks.length === 0) {
      skipped.push(note.title);
      continue;
    }

    chapters.push({
      id: note.folder,
      title: note.title,
      bodyHtml: `<h1>${escapeXml(note.title)}</h1>\n${blocksToXhtml(blocks)}`,
    });
  }

  if (chapters.length === 0) {
    throw new Error('Nothing to include in the Revision Book yet — favorite a note, or add a highlight/bookmark.');
  }

  const blob = await buildEpub({ title: 'Notebook Buddy — Revision Book', chapters });
  triggerDownload(blob, `${slugify('revision-book')}.epub`);
  return { skipped };
}
