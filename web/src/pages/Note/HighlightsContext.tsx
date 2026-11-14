/**
 * pages/Note/HighlightsContext.tsx — P1-1: makes the current page's
 * highlight state available to every nested BodyProse block (including
 * inside collapsibles) without prop-drilling a `byBlock` map + remove
 * handler through every intermediate component. `BodyProseModule`
 * owns the provider (it already owns the fetch/loading lifecycle for
 * this page); `Block`/`Runs` in `BodyProse.tsx` are the only consumers.
 *
 * Deliberately a small, single-purpose context rather than reusing one
 * of the 4 settings-domain contexts from T2-1 -- those are explicitly
 * page-independent (Theme/Profile/Appearance/A11y), whereas this one is
 * scoped to a single note's `folder` and re-created per Note-page visit,
 * a different lifecycle entirely.
 */

import { createContext, useContext } from 'react';
import type { Highlight } from './highlights';

export interface HighlightsContextValue {
  /** Highlights for the CURRENT page, grouped by blockId — empty object
   * (not undefined) when there are none, so consumers never need to
   * null-check before an array lookup. */
  byBlock: Record<string, Highlight[]>;
  /** No-ops safely if the context isn't present (see useHighlightsForBlock
   * below) — every real usage inside BodyProse is always wrapped by the
   * provider, but tests that render a bare Block/Runs without one
   * shouldn't crash. */
  onRemove: (highlightId: string) => void;
  /** P1-2: saves (or clears, given an empty string) the personal note
   * attached to a highlight. Same safe-no-op-without-a-provider
   * contract as `onRemove` above. */
  onEditNote: (highlightId: string, note: string) => void;
}

const HighlightsContext = createContext<HighlightsContextValue | null>(null);

export const HighlightsProvider = HighlightsContext.Provider;

/** Returns this block's own highlights (or an empty array) plus the
 * remove and edit-note handlers. Safe to call with no provider present. */
export function useHighlightsForBlock(blockId: string | undefined): {
  highlights: Highlight[];
  onRemove: (highlightId: string) => void;
  onEditNote: (highlightId: string, note: string) => void;
} {
  const ctx = useContext(HighlightsContext);
  if (!ctx || !blockId) return { highlights: [], onRemove: () => {}, onEditNote: () => {} };
  return { highlights: ctx.byBlock[blockId] ?? [], onRemove: ctx.onRemove, onEditNote: ctx.onEditNote };
}
