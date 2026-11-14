import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dataPath } from '../../lib/siteConfig';

/**
 * PopularNotes — B-6 ("404 enhancements: popular resources").
 *
 * Renders the "Popular Notes" section on the 404 page (NotFound.tsx),
 * alongside the existing RecentlyViewed section. Where RecentlyViewed
 * reads *this visitor's own* localStorage (recently read notes/quizzes)
 * and has to cross-reference notes-index.json/quiz-index.json to
 * resolve titles/links, PopularNotes reads a single, already-resolved,
 * generated file — `popular-notes.json` (generate_popular_notes.py) —
 * with title/url/internal already computed server-side. No localStorage
 * involved, no per-visitor state, no second cross-reference fetch.
 *
 * Why a manually-curated file and not a computed "most visited" list:
 * this site has no backend and no auth (see Track M's M3-2 security
 * scope note) — there's no site-wide visit/favorite signal anywhere
 * for a script to compute from, only per-visitor localStorage. See
 * generate_popular_notes.py's own module docstring for the full
 * reasoning; this component doesn't need to know or care which way the
 * underlying data was produced, only that it's an array of
 * already-resolved entries.
 *
 * Same rendering conventions RecentlyViewed already established for
 * this page, kept consistent deliberately (same list-item styling,
 * same internal-Link-vs-external-<a> split, same "render nothing when
 * there's nothing to show" behavior — not an empty-state message,
 * matching the project's existing convention for this kind of
 * secondary/supplementary content block).
 */

export interface PopularNoteEntry {
  folder: string;
  title: string;
  subject: string;
  category: string;
  url: string;
  internal: boolean;
}

interface PopularNotesProps {
  headingText?: string;
}

export function PopularNotes({ headingText = 'Popular Notes' }: PopularNotesProps) {
  const [items, setItems] = useState<PopularNoteEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(dataPath('index', 'popular-notes.json'))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data?.notes) ? data.notes : []);
      })
      .catch((err) => {
        console.error('PopularNotes: could not load popular-notes.json:', err);
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="popular-notes">
      {headingText && <h2 className="popular-notes-heading text-lg font-semibold text-text-primary mb-2">{headingText}</h2>}
      <ul className="popular-notes-list flex flex-col gap-2">
        {items.map(({ folder, title, category, url, internal }) => (
          <li key={folder} className="flex items-center justify-between gap-3 rounded-lg border border-border-color px-3 py-2">
            {internal ? (
              <Link to={url} className="text-sm text-text-primary hover:text-primary transition-colors">
                {title}
              </Link>
            ) : (
              <a href={url} className="text-sm text-text-primary hover:text-primary transition-colors">
                {title}
              </a>
            )}
            {category && (
              <span className="popular-notes-category text-xs text-text-muted whitespace-nowrap">{category}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
