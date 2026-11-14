/**
 * lib/pageId.ts
 *
 * A stable, per-page identifier for whichever route is currently active —
 * the React-app equivalent of the vanilla `<pageId>-<feature>` localStorage
 * convention (`bookmarks-<pageId>`, `<pageId>-checklist-state`, etc. — see
 * `sprint-tickets.md`'s T5-3a and `sprint-tickets-tracks-PREB.md`'s P0-10/
 * P1-1/P1-2). Vanilla derived that id per note folder; this app has routes
 * beyond just notes (Dashboard, Quiz, Gallery, Settings, ...), so the id is
 * derived from the route path itself — every route already is a stable,
 * unique identifier for "the page you're on" in a client-routed app.
 *
 * Built here first because P0-10 (Sticky Notes) is the first feature that
 * needs one; per this project's own architecture principle ("one hook per
 * shared behavior... built once, in whichever ticket needs it first"), this
 * is written as a small standalone module so P1-1 (Highlighting) and P1-2
 * (Personal Notes) reuse it directly instead of each deriving their own
 * page id independently.
 *
 * Deliberately path-only, not path+query: NotesIndex's `?q=` search term
 * or a shared quiz link's `?seed=` shouldn't fragment "the page" into a
 * different sticky note/highlight-set per query string.
 */

const HOME_PAGE_ID = 'home';

/**
 * Derives a stable id from a route pathname. Strips the router `basename`
 * if present (harmless no-op if it isn't — useLocation()'s pathname is
 * already basename-relative in this app, see the usePageId() hook below;
 * this function stays plain/basename-agnostic so it's easy to unit test
 * without a Router context).
 */
export function getPageId(pathname: string): string {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  if (trimmed === '') return HOME_PAGE_ID;
  return trimmed.toLowerCase().replace(/\/+/g, '--');
}
