/**
 * pages/Note/revisionFilter.ts — P3-2: Revision Mode's block filter.
 *
 * Depends on P1-1 (Highlighting), P1-2 (Personal Notes on highlights),
 * and T5-3c-7 (Bookmark star UI) — all three confirmed shipped in this
 * codebase (highlights.ts/HighlightsContext.tsx/HighlightNoteEditor.tsx
 * for P1-1/P1-2; bookmarks.ts/BookmarkStar.tsx for T5-3c-7), which is
 * what actually makes this ticket startable now. The manual test's
 * "three relevant categories" are exactly those three tickets' own
 * output: highlighted spans, the personal notes attached to them (P1-2
 * renders inline as part of the same highlighted block — nothing extra
 * needed here to surface those), and bookmarked sections.
 *
 * Pure function, no localStorage/React here — BodyProseModule owns
 * loading highlights/bookmarks and calls this with the data it already
 * has, same "keep the filtering logic testable without a DOM" split
 * every other lib/ helper in this codebase follows.
 *
 * Filtering rules, block by block:
 *   - A leaf block (paragraph/callout/list/table/code/etc.) qualifies
 *     if it has at least one highlight recorded against its blockId.
 *     In practice only paragraph/callout render highlights today (see
 *     BodyProse.tsx's own HighlightedRuns usage), but this checks
 *     highlightsByBlock generically rather than hardcoding which block
 *     types are "highlightable" — if a highlight ever exists against
 *     another block type's id, Revision Mode surfaces it rather than
 *     silently dropping it.
 *   - A heading qualifies (is kept) if its own section id is bookmarked
 *     OR if any qualifying block appears between it and the next
 *     heading — kept as a section label so a highlighted paragraph
 *     doesn't lose its context, not because a heading is itself one of
 *     the three categories on its own.
 *   - A collapsible qualifies if its own id is bookmarked OR if any of
 *     its (recursively filtered) children qualify. Its children are
 *     filtered with this same function, so nested headings/collapsibles
 *     inside it follow the identical rule.
 *   - Everything else (plain, non-highlighted, non-bookmarked content)
 *     is dropped.
 *
 * A heading with nothing following it that qualifies, and that isn't
 * itself bookmarked, is dropped too — an empty section header revision
 * mode would otherwise leave behind.
 */

import type { BodyProseBlock } from './types';
import type { Highlight } from './highlights';

export function filterBlocksForRevision(
  blocks: BodyProseBlock[],
  highlightsByBlock: Record<string, Highlight[]>,
  bookmarkIds: string[],
): BodyProseBlock[] {
  const out: BodyProseBlock[] = [];
  // Index (in `out`) of the most recently pushed heading whose section
  // hasn't been decided yet, and whether that heading is kept
  // unconditionally (bookmarked) regardless of what follows it.
  let pendingHeadingIndex = -1;
  let pendingHeadingKept = false;

  function closePendingHeading() {
    if (pendingHeadingIndex === -1) return;
    const hasContentAfter = out.length > pendingHeadingIndex + 1;
    if (!pendingHeadingKept && !hasContentAfter) {
      out.splice(pendingHeadingIndex, 1);
    }
    pendingHeadingIndex = -1;
    pendingHeadingKept = false;
  }

  for (const block of blocks) {
    if (block.type === 'heading') {
      closePendingHeading();
      const bookmarked = Boolean(block.id) && bookmarkIds.includes(block.id as string);
      out.push(block);
      pendingHeadingIndex = out.length - 1;
      pendingHeadingKept = bookmarked;
      continue;
    }

    if (block.type === 'collapsible') {
      const filteredChildren = filterBlocksForRevision(block.children, highlightsByBlock, bookmarkIds);
      const bookmarked = bookmarkIds.includes(block.id);
      if (bookmarked || filteredChildren.length > 0) {
        out.push({ ...block, children: filteredChildren });
      }
      continue;
    }

    const hasHighlight = Boolean(block.blockId) && (highlightsByBlock[block.blockId as string]?.length ?? 0) > 0;
    if (hasHighlight) out.push(block);
  }

  closePendingHeading();
  return out;
}
