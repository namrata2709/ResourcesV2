/**
 * pages/Note/useHighlightSelection.ts — P1-1: watches for a text
 * selection made inside `containerRef`, and reports back the selected
 * text + which body-prose block it belongs to + where to float the
 * "Highlight" button, or `null` when there's nothing selectable.
 *
 * "Which block" is resolved by walking up from the selection's real
 * common-ancestor DOM node to the nearest element carrying
 * `data-block-id` (stamped on every highlightable block by
 * BodyProse.tsx) -- if the selection spans two DIFFERENT blocks (e.g.
 * drags from one paragraph into the next), there is no single common
 * `data-block-id` ancestor closer than the whole page, so this
 * correctly reports `null` rather than guessing one side. Cross-block
 * highlighting isn't in this ticket's scope.
 *
 * Listens on `selectionchange` (covers touch selection's own handle-
 * drag gestures, which don't reliably fire `mouseup`) rather than
 * `mouseup` alone.
 */

import { useEffect, useState } from 'react';

export interface PendingSelection {
  text: string;
  blockId: string;
  top: number;
  left: number;
}

export function useHighlightSelection(
  containerRef: React.RefObject<HTMLElement | null>
): PendingSelection | null {
  const [pending, setPending] = useState<PendingSelection | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const container = containerRef.current;
      if (!container) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setPending(null);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setPending(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setPending(null);
        return;
      }

      const anchorEl =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? (range.commonAncestorContainer as Element)
          : range.commonAncestorContainer.parentElement;
      const blockEl = anchorEl?.closest<HTMLElement>('[data-block-id]');
      if (!blockEl || !container.contains(blockEl)) {
        setPending(null);
        return;
      }
      const blockId = blockEl.dataset.blockId;
      if (!blockId) {
        setPending(null);
        return;
      }

      // jsdom (used by this app's own test suite) doesn't implement
      // Range.getBoundingClientRect -- guard rather than crash so tests
      // can exercise this hook; real browsers always have it.
      const rect =
        typeof range.getBoundingClientRect === 'function'
          ? range.getBoundingClientRect()
          : { top: 0, left: 0 };
      setPending({ text, blockId, top: rect.top - 44, left: rect.left });
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [containerRef]);

  return pending;
}
