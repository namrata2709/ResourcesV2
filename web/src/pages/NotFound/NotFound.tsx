import { Link, useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { RecentlyViewed } from '../../components/RecentlyViewed';
import { PopularNotes } from '../../components/PopularNotes';
import { DashboardCardsGrid } from '../../components/DashboardCardsGrid';
import { PageMeta } from '../../components/PageMeta';

/**
 * NotFound — React port of 404.html (T3-1's audit gap — a "real 404
 * route" — sprint-tickets-feature-audit.md Part B).
 *
 * Same composition as the real 404.html, uploaded directly:
 *   - "🔍 Page Not Found" header + subtitle
 *   - search box that redirects to /notes-index?q=<term> (T3-1c: was
 *     /notes?q=<term> before the path-based URL rework)
 *   - Recently Viewed (RecentlyViewed) — renders nothing if empty,
 *     matching vanilla exactly
 *   - Popular Notes (PopularNotes, B-6 — new, not in vanilla's
 *     404.html) — a small, generated, manually-curated set of notes
 *     (generate_popular_notes.py), shown regardless of whether
 *     Recently Viewed has anything to show. This is what actually
 *     gives a first-time visitor who lands on a broken link something
 *     real to click, since Recently Viewed alone is empty for them by
 *     definition.
 *   - the same dashboard cards as the homepage (DashboardCardsGrid,
 *     shared with Dashboard.tsx rather than a second copy)
 *   - a plain "← Back to the homepage" link
 *
 * The search box is inlined here directly rather than as a separate
 * SearchRedirect component. That split originally existed to mirror
 * vanilla's recently-viewed.js/notes-index.js handshake — two separate
 * HTML pages that could only coordinate through a URL, so
 * initSearchRedirect() had to be a generic, reusable, importable
 * function. This is the only page that uses it (recently-viewed.js's
 * own header comment confirms Dashboard doesn't call it either), so
 * once vanilla itself is gone there's no reason to keep that
 * abstraction — it's just a form + useNavigate(), same as any other
 * page-local piece of UI.
 *
 * Wired into App.tsx as the catch-all route (`path="*"`).
 */
export function NotFound() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const term = query.trim();
    navigate(term ? `/notes-index?q=${encodeURIComponent(term)}` : '/notes-index');
  }

  return (
    <div className="not-found-page font-poppins">
      {/* No canonicalPath: a 404 shouldn't declare itself canonical for
          whatever mistyped/removed URL landed here. */}
      <PageMeta title="Page Not Found" description="The page you're looking for doesn't exist. Search or browse from here instead." />
      <header className="flex flex-col items-center text-center gap-2 py-10 px-4">
        <h1 className="text-2xl font-bold text-text-primary">🔍 Page Not Found</h1>
        <p className="subtitle text-text-muted">That page doesn't exist — but here's everything that does.</p>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 flex flex-col gap-8">
        <form className="search-bar" role="search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Search notes..."
            aria-label="Search notes"
            autoComplete="off"
            className="w-full rounded-lg border border-border-color bg-bg-card px-4 py-2 text-sm text-text-primary"
          />
        </form>

        <RecentlyViewed />

        <PopularNotes />

        <DashboardCardsGrid />

        <p className="text-center mt-4">
          <Link to="/" className="text-primary hover:text-accent transition-colors">
            ← Back to the homepage
          </Link>
        </p>
      </main>
    </div>
  );
}
