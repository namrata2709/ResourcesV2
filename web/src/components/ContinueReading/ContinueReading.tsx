import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getPrimaryFileRoute, getPrimaryFileUrl, type Note } from '../../pages/NotesIndex';
import { dataPath } from '../../lib/siteConfig';
import { getMostRecentReadingEntry } from '../../lib/readingProgress';

/**
 * ContinueReading — P0-3, "Continue Where You Left Off".
 *
 * Dashboard-only widget showing a single deep link to the single most
 * recently read note, per the ticket's own Done-when ("dashboard shows
 * a working 'Continue Reading' deep link to the single most recent
 * note"). Sibling to RecentlyViewed rather than a second mode bolted
 * onto it — RecentlyViewed shows up to `max` items on NotFound;
 * this shows exactly one (or nothing) on Dashboard. Both share the same
 * underlying scan via lib/readingProgress.ts's getRecentReadingEntries/
 * getMostRecentReadingEntry, so there's one real source of truth for
 * "what did the user read most recently", not two.
 *
 * Renders nothing on a first-time visitor (no readingProgress entries
 * yet) or once the cross-referenced note can't be found in
 * notes-index.json (renamed/removed) — matches RecentlyViewed's
 * "disappear cleanly, no empty-state message" convention exactly.
 *
 * Link target: prefers the internal `/notes/:folder` React route
 * (getPrimaryFileRoute) over the raw data-file URL RecentlyViewed
 * itself falls back to — this is deliberate here, not an
 * inconsistency: only the React route actually restores scroll
 * position (useReadingProgress runs on that page), so "Continue
 * Reading" specifically should prefer it. Falls back to the resolved
 * file URL, then a subject-scoped notes-index link, for any note whose
 * primary file isn't a notes/lab page yet (e.g. slides-only, pending
 * T5-4) — same graceful-degradation shape RecentlyViewed uses.
 */

function getContinueHref(note: Note): { href: string; internal: boolean } {
  const route = getPrimaryFileRoute(note);
  if (route) return { href: route, internal: true };
  const fileUrl = getPrimaryFileUrl(note);
  if (fileUrl) return { href: fileUrl, internal: false };
  const fallback = note.subject ? `/notes-index/${encodeURIComponent(note.subject)}` : '/notes-index';
  return { href: fallback, internal: true };
}

interface ContinueReadingState {
  note: Note;
}

export function ContinueReading() {
  const [state, setState] = useState<ContinueReadingState | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const recent = getMostRecentReadingEntry();
    if (!recent) {
      setState(null);
      return;
    }

    fetch(dataPath('index', 'notes-index.json'))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const note = (data.notes || []).find((n: Note) => n.folder === recent.folder) ?? null;
        setState(note ? { note } : null);
      })
      .catch((err) => {
        console.error('ContinueReading: could not load notes-index.json:', err);
        if (!cancelled) setState(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;

  const { note } = state;
  const { href, internal } = getContinueHref(note);
  const linkProps = { className: 'inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-accent transition-colors' };

  return (
    <div className="continue-reading rounded-lg border border-border-color px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p className="text-xs text-text-muted mb-0.5">Continue Reading</p>
        <p className="text-sm font-semibold text-text-primary">{note.title}</p>
      </div>
      {internal ? (
        <Link to={href} {...linkProps}>
          Resume <ArrowRight size={14} />
        </Link>
      ) : (
        <a href={href} {...linkProps}>
          Resume <ArrowRight size={14} />
        </a>
      )}
    </div>
  );
}
