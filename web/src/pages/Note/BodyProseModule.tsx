/**
 * BodyProseModule — fetches `body-prose.json` and renders it via
 * BodyProse.tsx, replacing T5-3a's old placeholder div now that T5-2's
 * extractor has shipped. Same fetch/loading/missing pattern every other
 * Note module here already uses (Glossary/Checklist/Interview/etc.) —
 * silently renders nothing if the JSON is missing or empty, same as
 * those, rather than showing an error for a genuinely older note that
 * predates T5-2's extractor running on it.
 *
 * P1-1: also owns this page's highlight state (loaded once on mount,
 * same "read once, mutate locally" lifecycle already used elsewhere for
 * per-page localStorage state), providing it down to every block via
 * HighlightsContext, and rendering the floating "Highlight" button that
 * appears while text is selected (useHighlightSelection). Highlighting
 * is a no-op if the note has no `body-prose.json` at all -- there's
 * nothing with a blockId to highlight.
 *
 * P1-2: also owns saving/clearing a highlight's personal note
 * (`setHighlightNote`), exposed to BodyProse via the same
 * HighlightsContext as the P1-1 handlers above -- one provider, all
 * three highlight actions (remove, add, edit-note).
 *
 * P3-2: also owns Revision Mode's filtering. `revisionMode` is passed
 * down from Note.tsx (the toggle itself lives there, alongside Exam
 * Mode/Lite Mode); this module additionally loads bookmark ids (the
 * one piece of the three P3-2 categories it didn't already own) and
 * runs `filterBlocksForRevision` over `data.blocks` before handing them
 * to BodyProseBlocks. Filtering happens here, not by hiding rendered
 * DOM after the fact, so "toggle off, confirm full content restores
 * exactly" is trivially true -- `data`/`highlights` are untouched by
 * the toggle, only which blocks get passed to BodyProseBlocks changes.
 */

import { useEffect, useRef, useState } from 'react';
import { dataPath } from '../../lib/siteConfig';
import { BodyProseBlocks } from './BodyProse';
import { BookmarksProvider } from './BookmarksContext';
import { loadBookmarkIds } from './bookmarks';
import { HighlightsProvider } from './HighlightsContext';
import { HighlightSelectionButton } from './HighlightSelectionButton';
import { addHighlight, groupHighlightsByBlock, loadHighlights, removeHighlight, setHighlightNote } from './highlights';
import { filterBlocksForRevision } from './revisionFilter';
import { useHighlightSelection } from './useHighlightSelection';
import type { BodyProseData } from './types';

interface BodyProseModuleProps {
  folder: string;
  /** P3-2: when true, only highlighted/bookmarked content (and
   * highlights' personal notes, which render inline with them) is
   * shown. Defaults to false so every other caller/test of this module
   * is unaffected. */
  revisionMode?: boolean;
}

export function BodyProseModule({ folder, revisionMode = false }: BodyProseModuleProps) {
  const [data, setData] = useState<BodyProseData | null | 'missing'>(null);
  const [highlights, setHighlights] = useState(() => loadHighlights(folder));
  const [bookmarkIds, setBookmarkIds] = useState(() => loadBookmarkIds(folder));
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingSelection = useHighlightSelection(containerRef);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(dataPath('notes', folder, 'json', 'body-prose.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: BodyProseData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  // Fresh load per note, same as the body-prose fetch above -- a
  // different folder means a different page's highlight list.
  useEffect(() => {
    setHighlights(loadHighlights(folder));
    setBookmarkIds(loadBookmarkIds(folder));
  }, [folder]);

  // P3-2: re-reads bookmark ids fresh whenever Revision Mode is turned
  // on, so a section bookmarked earlier in the session (while Revision
  // Mode was off, when BookmarkStar had no reason to notify anyone)
  // is picked up the moment filtering starts, not just from here on.
  useEffect(() => {
    if (revisionMode) setBookmarkIds(loadBookmarkIds(folder));
  }, [revisionMode, folder]);

  function refreshBookmarks() {
    setBookmarkIds(loadBookmarkIds(folder));
  }

  function handleSaveHighlight() {
    if (!pendingSelection) return;
    const next = addHighlight(folder, pendingSelection.blockId, pendingSelection.text);
    setHighlights(next);
    window.getSelection()?.removeAllRanges();
  }

  function handleRemoveHighlight(highlightId: string) {
    setHighlights(removeHighlight(folder, highlightId));
  }

  // P1-2: saves (or, given an empty/whitespace-only string, clears) the
  // personal note on an existing highlight.
  function handleEditNote(highlightId: string, note: string) {
    setHighlights(setHighlightNote(folder, highlightId, note));
  }

  if (data === null || data === 'missing' || data.blocks.length === 0) return null;

  const byBlock = groupHighlightsByBlock(highlights);
  const displayBlocks = revisionMode
    ? filterBlocksForRevision(data.blocks, byBlock, bookmarkIds)
    : data.blocks;

  return (
    <HighlightsProvider value={{ byBlock, onRemove: handleRemoveHighlight, onEditNote: handleEditNote }}>
      <BookmarksProvider value={{ onToggle: refreshBookmarks }}>
        <div ref={containerRef} className="notes-body-prose">
          {revisionMode && displayBlocks.length === 0 && (
            <p className="mb-4 rounded-lg border border-border-color px-4 py-3 text-sm text-text-muted">
              No highlights or bookmarks on this note yet — turn off Revision Mode to add some.
            </p>
          )}
          <BodyProseBlocks blocks={displayBlocks} folder={folder} />
        </div>
        {/* Selecting text to create a new highlight is still available in
            Revision Mode -- P1-1's own selection button isn't gated on it,
            since adding a highlight while reviewing shown content is a
            normal thing to want to do, not a state Revision Mode should
            block. */}
        {pendingSelection && (
          <HighlightSelectionButton
            top={pendingSelection.top}
            left={pendingSelection.left}
            onClick={handleSaveHighlight}
          />
        )}
      </BookmarksProvider>
    </HighlightsProvider>
  );
}
