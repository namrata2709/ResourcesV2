import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Highlighter, Search, ExternalLink, Link2 } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageMeta } from '../../components/PageMeta';
import { List } from '../../components/List';
import { CardQuickActions, type QuickAction } from '../../components/CardQuickActions';
import { showNotification } from '../../lib/notifications';
import { dataPath } from '../../lib/siteConfig';
import { SEARCH_FIELDS, getPrimaryFileUrl, getPrimaryFileRoute, type Note } from '../NotesIndex';
import { buildMyNotesItems, type MyNoteItem } from './myNotesData';

/**
 * SearchMyNotes — P3-1, "Search Only My Notes".
 *
 * Components: [React, reusing useSearch() from T3-3 — do not build a
 * new search implementation]. Depends on: P1-1 (Highlighting), P1-2
 * (Personal Notes on highlights) — both confirmed shipped in this
 * codebase (pages/Note/highlights.ts, pages/Note/BookmarkStar.tsx +
 * T5-3c-7's bookmarks.ts), so this ticket is genuinely startable, not
 * blocked.
 *
 * Two halves, deliberately kept in two files:
 *   - Scoping ("which notes count as 'my notes'"): myNotesData.ts,
 *     scans every note's real highlight/bookmark localStorage state.
 *   - Ranking ("how results are ordered once you search"): this file,
 *     via the *exact same* `useSearch(items, query, SEARCH_FIELDS)`
 *     call NotesIndex.tsx (T3-3) makes, importing its literal
 *     SEARCH_FIELDS constant rather than a re-typed copy — this is
 *     what "ranked the same way main search ranks results (same
 *     relevance ordering, not a different algorithm)" means in
 *     practice: same hook, same fields, same weights, scoped to a
 *     smaller item set going in.
 *
 * An empty query returns the full scoped set unranked (useSearch's own
 * contract), same as NotesIndex with no search term typed — this page
 * is a real listing of "my notes" on its own, not just a search box
 * that shows nothing until you type.
 *
 * Cross-tab / cross-page freshness: unlike NotesIndex's favorites (no
 * cross-tab sync attempt for the *note list* itself, only the ⭐
 * toggle — see useNotesFavorites), the highlight/bookmark scoping set
 * here genuinely does need to react to changes made on the Note page,
 * possibly in another tab. Re-scans on the same `storage` event
 * useNotesFavorites already listens for (fired by the browser itself,
 * once per external localStorage write) — no polling.
 */

const BREADCRUMB_KEYS = ['Home', 'Notes', 'My Notes'];

export function SearchMyNotes() {
  const [allNotes, setAllNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Bumped on every relevant `storage` event to force myNotesItems to
  // re-scan localStorage — see the effect below.
  const [refreshTick, setRefreshTick] = useState(0);

  const { announce } = useLiveRegion();

  useEffect(() => {
    fetch(dataPath('index', 'notes-index.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setAllNotes(data.notes || []))
      .catch(() => setError(true));
  }, []);

  // Re-scan when highlights/bookmarks change in THIS tab (a note page
  // navigated back from) or in another tab (the browser's own
  // `storage` event, which — per spec — never fires in the tab that
  // made the write, same reasoning useNotesFavorites.ts already
  // documents). Filtered to the two key shapes this page actually
  // cares about so an unrelated key (theme, quiz progress, ...)
  // doesn't cause a needless re-render.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key && !e.key.startsWith('highlights-') && !e.key.startsWith('bookmarks-')) return;
      setRefreshTick((t) => t + 1);
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Also re-scan on focus/visibility change, so returning to this tab
  // after highlighting/bookmarking something on a note page (SAME tab,
  // where the `storage` event deliberately never fires) shows current
  // data without a manual reload.
  useEffect(() => {
    function handleFocus() {
      setRefreshTick((t) => t + 1);
    }
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const myNotesItems = useMemo<MyNoteItem[]>(() => {
    if (!allNotes) return [];
    return buildMyNotesItems(allNotes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNotes, refreshTick]);

  // The one line that IS "reusing useSearch() from T3-3" — same hook,
  // same SEARCH_FIELDS import, only the input item set differs.
  const results = useSearch(myNotesItems, searchQuery, SEARCH_FIELDS);

  useEffect(() => {
    if (allNotes === null) return;
    announce(`${results.length} ${results.length === 1 ? 'note' : 'notes'} found`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length, allNotes]);

  function copyLink(note: Note) {
    const url = getPrimaryFileUrl(note);
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => showNotification(`Copied link to ${note.title}`),
      () => showNotification('Could not copy link', 'error'),
    );
  }

  return (
    <div className="search-my-notes font-poppins max-w-5xl mx-auto px-6 py-8">
      <PageMeta
        title="My Notes"
        description="Search across only the notes you've highlighted or bookmarked."
        canonicalPath="/search-my-notes"
      />
      <Breadcrumb keys={BREADCRUMB_KEYS} />

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">My Notes</h1>
        <p className="text-sm text-text-muted">
          Search only the notes you've highlighted or bookmarked — not the full library.
        </p>
      </header>

      <div className="mb-6 relative">
        <Search
          size={16}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search my notes…"
          aria-label="Search my notes"
          className="w-full rounded-lg border border-border-color bg-bg-card pl-9 pr-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          Couldn't load your notes right now — try reloading the page.
        </p>
      )}

      {!error && allNotes === null && (
        <p className="text-sm text-text-muted" aria-live="polite">
          Loading…
        </p>
      )}

      {!error && allNotes !== null && myNotesItems.length === 0 && (
        <p className="text-sm text-text-muted">
          You haven't highlighted or bookmarked any notes yet. Open a note and select some text,
          or star a section, and it'll show up here.
        </p>
      )}

      {!error && allNotes !== null && myNotesItems.length > 0 && (
        <List
          ariaLabel="My notes search results"
          items={results}
          itemKey={(item) => item.folder}
          renderItem={(item) => <MyNoteCard note={item} onCopyLink={copyLink} />}
        />
      )}

      {!error && allNotes !== null && myNotesItems.length > 0 && results.length === 0 && (
        <p className="text-sm text-text-muted mt-4">
          No highlighted or bookmarked notes match "{searchQuery}".
        </p>
      )}
    </div>
  );
}

interface MyNoteCardProps {
  note: MyNoteItem;
  onCopyLink: (note: Note) => void;
}

function MyNoteCard({ note, onCopyLink }: MyNoteCardProps) {
  const route = getPrimaryFileRoute(note);
  const externalUrl = route ? null : getPrimaryFileUrl(note);

  const actions: QuickAction[] = [
    {
      key: 'copy-link',
      icon: <Link2 size={16} />,
      label: 'Copy Link',
      onClick: () => onCopyLink(note),
    },
  ];

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {route ? (
          <Link to={route} className="font-semibold text-text-primary hover:text-primary hover:underline">
            {note.title}
          </Link>
        ) : externalUrl ? (
          <a
            href={externalUrl}
            className="font-semibold text-text-primary hover:text-primary hover:underline inline-flex items-center gap-1"
          >
            {note.title}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : (
          <span className="font-semibold text-text-primary">{note.title}</span>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          {note.category && <span>{note.category}</span>}
          {note.highlightCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Highlighter size={13} aria-hidden="true" />
              {note.highlightCount} {note.highlightCount === 1 ? 'highlight' : 'highlights'}
            </span>
          )}
          {note.bookmarkCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Bookmark size={13} aria-hidden="true" />
              {note.bookmarkCount} bookmarked {note.bookmarkCount === 1 ? 'section' : 'sections'}
            </span>
          )}
        </div>
      </div>

      <CardQuickActions actions={actions} />
    </div>
  );
}
