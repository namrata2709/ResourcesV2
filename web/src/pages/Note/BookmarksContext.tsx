/**
 * pages/Note/BookmarksContext.tsx — P3-2: lets BookmarkStar notify
 * BodyProseModule that a bookmark changed, so Revision Mode's filtered
 * view can react to a star toggled on a still-visible section (one
 * that's shown because it's bookmarked, or because a sibling block in
 * its section qualifies some other way) without leaving Revision Mode.
 *
 * Mirrors HighlightsContext's "own the fetch/toggle lifecycle at the
 * module level, expose it down through a small dedicated context"
 * convention, but stays deliberately thinner: BookmarkStar keeps
 * reading/writing localStorage directly via ./bookmarks.ts exactly as
 * it already did before this ticket (T5-3c-7's shipped behavior is
 * unchanged) — this only adds an optional "something changed, re-read"
 * signal on top, the same way a change event would. Safe, silent no-op
 * without a provider, so BookmarkStar's many non-Revision-Mode usages
 * (the common case) need no provider at all.
 *
 * Known gap, not fixed here: BookmarksPanel.tsx (T5-3c-2) can also
 * remove a bookmark, and doesn't go through this context — a bookmark
 * removed from the panel while Revision Mode is on won't re-filter
 * until the next toggle/reload. BookmarksPanel already re-reads fresh
 * only "every time it opens" rather than staying live-synced with
 * BookmarkStar elsewhere, so this is the same class of staleness this
 * codebase already tolerates there, not a new inconsistency — flagged
 * rather than silently left unmentioned.
 */

import { createContext, useContext } from 'react';

export interface BookmarksContextValue {
  onToggle: () => void;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export const BookmarksProvider = BookmarksContext.Provider;

export function useBookmarksNotify(): () => void {
  const ctx = useContext(BookmarksContext);
  return ctx?.onToggle ?? (() => {});
}
