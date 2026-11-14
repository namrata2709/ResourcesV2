/**
 * lib/quickActions.ts
 *
 * Framework-agnostic quick-actions catalog + localStorage read/write —
 * same shape as lib/appearance.ts and lib/theme.ts. Stores the user's
 * chosen, ordered set of dashboard action buttons under a new
 * "quickActions" key (an ordered array of ids, per the ticket's own
 * file list).
 *
 * SCOPE NOTE on the ticket's own example actions (Continue Reading,
 * Start Quiz, Favorites, Revision, Search): checked what real
 * destinations exist today before wiring each one up, rather than
 * assuming —
 *   - Favorites: Gallery's favorites filter was local component state,
 *     not URL-driven, so a "Favorites" button had nowhere real to
 *     deep-link to. Added a small, additive `?favorites=true` read in
 *     Gallery.tsx (see its own comment) so this action has a real
 *     target instead of landing on an unfiltered gallery.
 *   - Revision: there's no cross-quiz "review your bookmarked
 *     questions" page anywhere in the app yet (Quiz's bookmarks are
 *     per-quiz-session state, not a global list). Rather than invent
 *     that page here, this action points at /quiz-index for now — 
 *     flagged, not silently built around. Worth a real ticket if a
 *     dedicated revision view is wanted.
 *   - Continue Reading / Search: both point at /notes-index (browse,
 *     and the search box that already lives there) rather than
 *     deep-linking to one specific note — simpler and still useful,
 *     but not "resume exactly where you left off". A true "continue"
 *     link would need to reuse RecentlyViewed's private
 *     most-recent-note resolver, which isn't exported today; flagging
 *     that as a possible follow-up rather than refactoring it in.
 *   - My Notes (P3-1, added once that ticket shipped a real
 *     destination): /search-my-notes, scoped to notes with at least
 *     one highlight/bookmark. Not in the default set below — same
 *     "don't change what a first-time visitor already sees" reasoning
 *     as every other catalog addition here, just an available option.
 */

export interface QuickActionDef {
  id: string;
  label: string;
  /** Root-relative path, e.g. "/quiz-index". */
  href: string;
}

export const QUICK_ACTION_CATALOG: QuickActionDef[] = [
  { id: 'continue-reading', label: 'Continue Reading', href: '/notes-index' },
  { id: 'start-quiz', label: 'Start Quiz', href: '/quiz-index' },
  { id: 'favorites', label: 'Favorites', href: '/gallery?favorites=true' },
  { id: 'revision', label: 'Revision', href: '/quiz-index' },
  { id: 'search', label: 'Search', href: '/notes-index' },
  { id: 'gallery', label: 'Gallery', href: '/gallery' },
  { id: 'my-notes', label: 'My Notes', href: '/search-my-notes' },
  // E0-2: available option, not in the default set below, same
  // "don't change what a first-time visitor already sees" reasoning
  // as 'my-notes' above.
  { id: 'export', label: 'Export', href: '/export' },
];

const VALID_IDS = new Set(QUICK_ACTION_CATALOG.map((a) => a.id));

/** Shown on first visit / whenever storage has nothing valid saved yet — never empty, per the ticket's own "Done when". */
export const DEFAULT_QUICK_ACTION_IDS: string[] = [
  'continue-reading',
  'start-quiz',
  'favorites',
  'search',
];

const STORAGE_KEY = 'quickActions';

function isValidIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string' && VALID_IDS.has(id));
}

/** Reads the saved, ordered quick-action id list, falling back to the default set on missing/corrupt/empty data. */
export function getSavedQuickActionIds(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return DEFAULT_QUICK_ACTION_IDS;
    const parsed = JSON.parse(saved);
    if (isValidIdList(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_QUICK_ACTION_IDS;
  } catch {
    // Private-browsing / storage-disabled / malformed JSON: fail silently,
    // same as every other lib/*.ts's getSaved*() in this codebase.
    return DEFAULT_QUICK_ACTION_IDS;
  }
}

/** Persists the ordered quick-action id list. Swallows storage errors, same as saveTheme()/saveProfile(). */
export function saveQuickActionIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // no-op
  }
}

/** Resolves saved ids to their catalog defs, in the user's chosen order, silently dropping any id no longer in the catalog. */
export function getSavedQuickActions(): QuickActionDef[] {
  const ids = getSavedQuickActionIds();
  return ids
    .map((id) => QUICK_ACTION_CATALOG.find((a) => a.id === id))
    .filter((a): a is QuickActionDef => a !== undefined);
}
