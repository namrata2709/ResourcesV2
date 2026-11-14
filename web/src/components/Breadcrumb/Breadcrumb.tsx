import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveNavigation, type ResolvedNavItem } from '../../lib/navigation';

/**
 * Breadcrumb — React port of navigation.js's breadcrumb nav + page-header
 * injection (window.navigation(keys)).
 *
 * Same contract as vanilla:
 *   - keys resolved against navigation-url.json (same emoji/url lookup)
 *   - last item = current page, non-clickable, aria-current="page"
 *   - second-last item = back-button target
 *
 * Unlike vanilla, this doesn't inject into the DOM by id — it's a normal
 * component, rendered wherever the page places it. `keys` replaces the
 * old window.navigation(['home', ...]) call.
 *
 * Routing (T3-3, paths updated by T3-1c; T4-1a added Gallery):
 * navigation-url.json's urls for every page that now has a real React
 * route (Home, Notes, AWS, DSA, Quizzes, Images Gallery) point at
 * internal paths ("/", "/notes-index", "/notes-index/aws",
 * "/quiz-index", "/gallery", etc.) — those render as <Link>, giving
 * client-side navigation with no full page reload. Any entry still
 * pointing at a vanilla .html page with no React route yet would render
 * as a plain <a> instead — a real page load is correct there, not a
 * broken in-app Link to a route that doesn't exist — but no such entry
 * remains in navigation-url.json as of T4-1a. The rule: any url
 * starting with "/" is treated as an internal route; anything else is
 * external.
 */
function isInternalRoute(url: string): boolean {
  return url.startsWith('/');
}

interface BreadcrumbProps {
  keys: string[];
  /** Renders the <h1> page-header (back button + title) alongside the nav. */
  showPageHeader?: boolean;
}

export function Breadcrumb({ keys, showPageHeader = true }: BreadcrumbProps) {
  const [items, setItems] = useState<ResolvedNavItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveNavigation(keys).then((resolved) => {
      if (!cancelled) setItems(resolved);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join('|')]);

  if (!items || items.length === 0) return null;

  const current = items[items.length - 1];
  const backItem = items.length > 1 ? items[items.length - 2] : null;

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-text-muted font-poppins">
          {items.map(({ label, url, isLast }, i) => (
            <li key={`${label}-${i}`} className="flex items-center gap-1">
              {isLast ? (
                <span aria-current="page" className="text-text-primary font-medium">
                  {label}
                </span>
              ) : (
                <>
                  {url ? (
                    isInternalRoute(url) ? (
                      <Link to={url} className="hover:text-primary transition-colors">
                        {label}
                      </Link>
                    ) : (
                      <a href={url} className="hover:text-primary transition-colors">
                        {label}
                      </a>
                    )
                  ) : (
                    <span>{label}</span>
                  )}
                  <span aria-hidden="true" className="text-border-color">
                    /
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {showPageHeader && (
        <header className="page-header flex items-center gap-3 mt-2 mb-4">
          {backItem?.url && (
            isInternalRoute(backItem.url) ? (
              <Link to={backItem.url} className="back-btn text-sm text-primary hover:text-accent transition-colors">
                ← Back
              </Link>
            ) : (
              <a
                href={backItem.url}
                className="back-btn text-sm text-primary hover:text-accent transition-colors"
              >
                ← Back
              </a>
            )
          )}
          <h1 id="pageTitle" className="text-2xl font-poppins font-bold text-text-primary">
            {current.label}
          </h1>
        </header>
      )}
    </>
  );
}
