import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPrimaryFileUrl, type Note } from '../../pages/NotesIndex';
import { getQuizUrl, type Quiz } from '../../pages/QuizIndex';
import { dataPath } from '../../lib/siteConfig';
import { getRecentEntries, type RecentEntry } from '../../lib/readingProgress';

/**
 * RecentlyViewed — React port of recently-viewed.js's
 * RecentlyViewed.renderInto(containerId, options).
 *
 * Confirmed real vanilla contract (recently-viewed.js uploaded directly,
 * nothing guessed):
 *   - reads every `readingProgress-folder-<folder>` localStorage key,
 *     requiring `{ v: 1, timestamp: <number> }` to count as a valid
 *     entry — malformed/legacy entries are silently skipped, not shown
 *   - sorted by timestamp, most recent first, capped at `max` (5 by
 *     default)
 *   - cross-referenced against notes-index.json for title/link; a note
 *     that's since been renamed/removed is silently dropped, not shown
 *     as broken
 *   - renders NOTHING (not an empty-state message) when there's nothing
 *     to show — matches vanilla's `container.remove()` exactly, since
 *     this is meant to disappear cleanly on a first-time visitor rather
 *     than show an empty "Recently Viewed" section
 *
 * NOTE on the stored shape: confirmed `{ v: 1, percent, timestamp }` —
 * `readingProgressKey()`'s own real writer now exists (P0-3's
 * `writeFolderProgress()` in lib/readingProgress.ts), so this is no
 * longer an assumption pending notes-reader.js's source.
 *
 * P0-3: the folder-scanning logic itself now lives in
 * lib/readingProgress.ts's `getRecentReadingEntries()` — moved there
 * (framework-agnostic, per lib/README.md) so ContinueReading's
 * single-most-recent-note resolver could reuse the exact same scan
 * instead of a second, drifting copy.
 *
 * P0-5 ("Extend Recently Opened to quizzes"): this component now
 * renders `lib/readingProgress.ts`'s merged `getRecentEntries()` list
 * (notes + quizzes interleaved by timestamp, most-recent-first, capped
 * at `max` overall — not `max` of each) instead of the notes-only scan.
 * Quizzes are marked "opened" by `useQuizEngine.ts` under their own
 * `readingProgress-quiz-<quizId>` key (deliberately separate from
 * `quiz_progress_<quizId>`, which only exists once an answer's been
 * saved — see that key's own comment in lib/storageKeys.ts), resolved
 * here against `quiz-index.json` the same "cross-reference, silently
 * drop if missing" way notes already were. A quiz always links via the
 * real React route (`getQuizUrl()` -> `/quiz/:quizId`, T5-1), so it's
 * always a client-side `<Link>`, never the plain-`<a>` branch that only
 * applies to a note's resolved file link.
 *
 * Notes-index.json/quiz-index.json are only fetched when there's at
 * least one entry of that kind to resolve — a quiz-only visitor never
 * pays for a notes-index fetch and vice versa.
 *
 * Currently used by NotFound (matches 404.html's real usage today) and,
 * as of P0-3, by ContinueReading on Dashboard — recently-viewed.js's
 * own header comment named Dashboard as a planned second caller; that's
 * now real, via a sibling component rather than this one growing a
 * second mode.
 */

const DEFAULT_MAX = 5;

function formatRelativeTime(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

/** Same fallback as recently-viewed.js's getPrimaryHref(): a file link
 * when the note has one, otherwise notes-index scoped to the note's
 * subject. The fallback is a real internal route (T3-3), so it renders
 * as a <Link>; a resolved file link is a plain <a> (a real document, not
 * a SPA route) — same internal/external split Breadcrumb already uses. */
function getNoteHref(note: Note): { href: string; internal: boolean } {
  const primary = getPrimaryFileUrl(note);
  if (primary) return { href: primary, internal: false };
  const fallback = note.subject ? `/notes-index/${encodeURIComponent(note.subject)}` : '/notes-index';
  return { href: fallback, internal: true };
}

type ResolvedItem =
  | { kind: 'note'; key: string; title: string; timestamp: number; href: string; internal: boolean }
  | { kind: 'quiz'; key: string; title: string; timestamp: number; href: string; internal: true };

interface RecentlyViewedProps {
  max?: number;
  headingText?: string;
}

export function RecentlyViewed({ max = DEFAULT_MAX, headingText = 'Recently Viewed' }: RecentlyViewedProps) {
  const [items, setItems] = useState<ResolvedItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const recent = getRecentEntries(max);
    if (recent.length === 0) {
      setItems([]);
      return;
    }

    const needsNotes = recent.some((e) => e.kind === 'note');
    const needsQuizzes = recent.some((e) => e.kind === 'quiz');

    const notesPromise: Promise<Record<string, Note>> = needsNotes
      ? fetch(dataPath('index', 'notes-index.json'))
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((data) => {
            const byFolder: Record<string, Note> = {};
            (data.notes || []).forEach((n: Note) => {
              byFolder[n.folder] = n;
            });
            return byFolder;
          })
          .catch((err) => {
            console.error('RecentlyViewed: could not load notes-index.json:', err);
            return {};
          })
      : Promise.resolve({});

    const quizzesPromise: Promise<Record<string, Quiz>> = needsQuizzes
      ? fetch(dataPath('index', 'quiz-index.json'))
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((data) => {
            const byFile: Record<string, Quiz> = {};
            (data.Quizzes || []).forEach((q: Quiz) => {
              byFile[q.file] = q;
            });
            return byFile;
          })
          .catch((err) => {
            console.error('RecentlyViewed: could not load quiz-index.json:', err);
            return {};
          })
      : Promise.resolve({});

    Promise.all([notesPromise, quizzesPromise]).then(([byFolder, byFile]) => {
      if (cancelled) return;
      const resolved = recent
        .map((entry: RecentEntry): ResolvedItem | null => {
          if (entry.kind === 'note') {
            const note = byFolder[entry.folder];
            if (!note) return null;
            const { href, internal } = getNoteHref(note);
            return { kind: 'note', key: `note-${entry.folder}`, title: note.title, timestamp: entry.timestamp, href, internal };
          }
          const quiz = byFile[entry.quizId];
          if (!quiz) return null;
          return { kind: 'quiz', key: `quiz-${entry.quizId}`, title: quiz.title, timestamp: entry.timestamp, href: getQuizUrl(quiz.file), internal: true };
        })
        .filter((x): x is ResolvedItem => x !== null);
      setItems(resolved);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max]);

  if (!items || items.length === 0) return null;

  return (
    <div className="recently-viewed">
      {headingText && <h2 className="recently-viewed-heading text-lg font-semibold text-text-primary mb-2">{headingText}</h2>}
      <ul className="recently-viewed-list flex flex-col gap-2">
        {items.map(({ key, title, timestamp, href, internal }) => (
          <li key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border-color px-3 py-2">
            {internal ? (
              <Link to={href} className="text-sm text-text-primary hover:text-primary transition-colors">
                {title}
              </Link>
            ) : (
              <a href={href} className="text-sm text-text-primary hover:text-primary transition-colors">
                {title}
              </a>
            )}
            <span className="recently-viewed-time text-xs text-text-muted whitespace-nowrap">
              {formatRelativeTime(timestamp)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
