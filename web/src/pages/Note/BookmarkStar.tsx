/**
 * pages/Note/BookmarkStar.tsx — T5-3c-7: the star/toggle control that
 * creates the entries T5-3c-2's BookmarksPanel lists. Attaches to a
 * single body-prose section by its real per-section `id` (T5-3a shipped
 * these on heading and collapsible blocks); reads/writes the exact
 * `bookmarksKey(pageId)` shape BookmarksPanel.tsx already decided on
 * (a plain string[] of section ids) via the shared ./bookmarks.ts
 * helpers, so both sides of the feature agree on one storage contract.
 *
 * Deliberately local state, not a page-wide context: each star only
 * needs to know its own section's membership in the list, and
 * BookmarksPanel already re-reads localStorage fresh every time it
 * opens (see its own `open`-keyed useEffect), so there's no cross-
 * component sync problem to solve here.
 */

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { loadBookmarkIds, toggleBookmarkId } from './bookmarks';
import { useBookmarksNotify } from './BookmarksContext';

interface BookmarkStarProps {
  /** Same id BookmarksPanel is keyed by -- the note's folder. */
  pageId: string;
  /** The body-prose section's own real id (heading.id / collapsible.id). */
  sectionId: string;
  /** Plain-text section title, for the accessible name only -- not stored. */
  label: string;
}

export function BookmarkStar({ pageId, sectionId, label }: BookmarkStarProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const notifyBookmarksChanged = useBookmarksNotify();

  useEffect(() => {
    setBookmarked(loadBookmarkIds(pageId).includes(sectionId));
  }, [pageId, sectionId]);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // Sections rendered inside a <details><summary> (collapsible blocks)
    // would otherwise have this click bubble up and toggle open/closed --
    // stop that regardless of context, it's a no-op harmless guard for
    // plain headings.
    e.preventDefault();
    e.stopPropagation();
    const next = toggleBookmarkId(pageId, sectionId);
    setBookmarked(next.includes(sectionId));
    // P3-2: lets Revision Mode's filter (if active) re-read bookmark
    // state — a no-op call when no BookmarksProvider is present.
    notifyBookmarksChanged();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? `Remove bookmark: ${label}` : `Bookmark: ${label}`}
      className="inline-flex shrink-0 items-center p-1 text-text-muted hover:text-accent transition-colors"
    >
      <Bookmark size={15} className={bookmarked ? 'fill-accent text-accent' : ''} aria-hidden="true" />
    </button>
  );
}
