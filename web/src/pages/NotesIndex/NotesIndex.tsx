import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Clock, Timer, CircleCheck, CircleDot, Circle, ExternalLink, Heart, Link2, Images, Grid2x2, List as ListIcon } from 'lucide-react';
import { useSearch, type SearchableItem, type SearchField } from '../../hooks/useSearch';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import { useNotesFavorites } from '../../hooks/useNotesFavorites';
import { SelectedChip } from '../../components/SelectedChip';
import { FilterGroup } from '../../components/FilterGroup';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageMeta } from '../../components/PageMeta';
import { CardQuickActions, type QuickAction } from '../../components/CardQuickActions';
import { TypeBadges } from '../../components/TypeBadges';
import { CompletionBadge, getCompletionState, type CompletionState } from '../../components/CompletionBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { QuickFiltersBar } from '../../components/QuickFiltersBar';
import { ViewModeToggle } from '../../components/ViewModeToggle';
import { Pagination } from '../../components/Pagination';
import { dataPath } from '../../lib/siteConfig';

/**
 * NotesIndex — React port of notes-index.js (the notes listing page).
 *
 * SCOPE — re-scoped upward after a direct re-check of notes-index.js
 * found substantially more real per-card functionality than the
 * original pass here covered (quick actions, type badges, completion,
 * progress, favorites). What's built now:
 *   - ?subject= scoping; session/category/type/tag filters (AND across
 *     dimensions, OR within a multi-selected tag set); search (weighted
 *     title/tags/category/session via useSearch); sort (date/title/
 *     updated/reading-time, each asc+desc)
 *   - Quick actions row per card: Open (opens the real multi-file
 *     folder modal — see FolderModal below, genuinely extensible since
 *     `files` is already a generic array, not hardcoded to 3 types; a
 *     no-op if `files` is empty, not an error), Favorite (notesFavorites
 *     localStorage key, independent of galleryFavorites/quizFavorites),
 *     Copy Link (copies the primary file's absolute URL), Gallery
 *     (conditional — only rendered when note.hasImages)
 *   - Type badges, completion badge, progress bar per card — all via
 *     the new generic shared components (TypeBadges/CompletionBadge/
 *     ProgressBar), confirmed reusable by T3-2b/T4-1a with their own
 *     config, not hardcoded here
 *   - ?q= param support (T3-1's audit gap): pre-fills and auto-runs a
 *     search on mount, the landing point for Dashboard/404's search box
 *   - QuickFiltersBar: Favorites-only toggle, Recently Updated /
 *     Reading Time quick-sorts, Completed/In Progress/Not Started
 *     status filters (using the same completion-percent source as the
 *     badge), Clear all
 *   - ViewModeToggle: Grid + List (not Compact — see deferred list below)
 *   - Pagination: 9 notes/page
 *
 * ASSUMPTION FLAGGED, NOT SILENTLY GUESSED: reading-progress percent is
 * read from `readingProgress-folder-<folder>` in localStorage, assumed
 * shaped as `{ percent: number }` (0–100). This mirrors the confirmed
 * shape of quiz-engine.js's own progress storage in spirit, but the
 * actual notes-reader.js source that WRITES this key wasn't available
 * to confirm the exact field name — if it differs, only
 * `readPercentForFolder()` below needs to change, not the components
 * that consume its output.
 *
 * STILL EXPLICITLY DEFERRED: Compact view mode, "Recently Viewed"
 * quick-sort (needs its own view-tracking mechanism, not built),
 * search-suggestions autocomplete dropdown with keyboard nav, mark.js
 * result highlighting, localStorage-persisted filter state.
 *
 * Random sort + "Shuffle Again" (T3-2a's audit gap, confirmed real via
 * sprint-tickets-feature-audit.md and now built): a seeded Fisher-Yates
 * shuffle, not a per-pair comparator (sort() with a non-transitive
 * comparator is engine-dependent and inconsistent) — see
 * seededShuffle()/mulberry32() below. Same "inert while searching" rule
 * as every other sort.
 *
 * One deliberate, documented simplification within the ported scope:
 * vanilla's sortNotes() makes search relevance win FIRST even when a
 * sort is selected — the chosen sort only breaks ties among equally
 * relevant results. Doing that exactly requires the per-item relevance
 * SCORE, but useSearch's signature is `(items, query, fields) ->
 * rankedResults` (no scores exposed) — matching that signature was the
 * explicit ask, so: while a search query is active, results stay in
 * useSearch's relevance order and the sort dropdown is inert.
 */

export interface NoteFile {
  name: string;
  file: string;
  type: string;
  icon: string;
}

export interface Note {
  title: string;
  folder: string;
  subject: string;
  session: string | null;
  date: string;
  lastModified: string;
  readTimeMinutes: number;
  category: string;
  tags: string[];
  hasImages: boolean;
  images: Array<{ name: string; file: string }>;
  files: NoteFile[];
}

type NoteItem = Note & SearchableItem; // adds `id` (mapped from `folder`) for useSearch

/**
 * SubjectConfig — the fields of subjects.json (T3-7) NotesIndex actually
 * consumes. Registry is the single source of truth for subject
 * label/title copy now; this replaces the old `subject === 'aws' ? ... :
 * subject === 'dsa' ? ...` ternaries (T3-7a). Unknown/missing keys fall
 * back to the same generic "Notes" copy the ternary used when `subject`
 * was empty — see breadcrumbKeys/pageTitle below.
 */
interface SubjectConfig {
  label: string;
  titleSuffix: string;
}

type SubjectsRegistry = Record<string, SubjectConfig>;

type SortValue =
  | 'date-desc'
  | 'date-asc'
  | 'title-asc'
  | 'title-desc'
  | 'updated-desc'
  | 'updated-asc'
  | 'readingtime-asc'
  | 'readingtime-desc'
  | 'random';

// P3-1: exported so pages/SearchMyNotes can reuse the *exact* same
// field/weight config, not a re-typed copy that could silently drift —
// "ranked the same way main search ranks results" means the same
// SearchField[] feeding the same useSearch() hook, not just the same
// hook with different weights.
export const SEARCH_FIELDS: SearchField[] = [
  { name: 'title', weight: 4 },
  { name: 'tags', weight: 3, getValue: (item) => ((item.tags as string[]) || []).join(' ') },
  { name: 'category', weight: 2 },
  { name: 'session', weight: 1, getValue: (item) => (item.session ? String(item.session) : '') },
];

const FILE_TYPE_META: Record<string, { icon: string; label: string }> = {
  notes: { icon: '📄', label: 'Notes' },
  lab: { icon: '🧪', label: 'Lab' },
  slides: { icon: '📊', label: 'Presentation' },
};

// Favorites load/save/toggle + cross-tab sync now live in
// hooks/useNotesFavorites.ts (T5-3c-5) — this page and Note.tsx both
// had their own near-identical copies of this logic before that.
const PAGE_SIZE = 9;

function getSubjectParam(): string {
  return new URLSearchParams(window.location.search).get('subject') || '';
}

function getUpdatedDate(note: Note): string {
  return note.lastModified || note.date;
}

function getReadingMinutes(note: Note): number {
  return note.readTimeMinutes || 15;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Random sort + "Shuffle Again" (sprint-tickets-feature-audit.md's
 * confirmed real gap — notes-index.js has this, the React port didn't).
 * A per-pair comparator can't express "random" (sort() with a
 * non-transitive comparator gives inconsistent, engine-dependent
 * results), so this is a seeded Fisher-Yates shuffle instead — seeded
 * so the same `shuffleSeed` always produces the same order (stable
 * across re-renders from unrelated state changes), and "Shuffle Again"
 * simply bumps the seed to get a new, different order on demand.
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function sortComparator(sort: SortValue) {
  return (a: Note, b: Note): number => {
    switch (sort) {
      case 'date-desc':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'date-asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'updated-desc':
        return new Date(getUpdatedDate(b)).getTime() - new Date(getUpdatedDate(a)).getTime();
      case 'updated-asc':
        return new Date(getUpdatedDate(a)).getTime() - new Date(getUpdatedDate(b)).getTime();
      case 'readingtime-asc':
        return getReadingMinutes(a) - getReadingMinutes(b);
      case 'readingtime-desc':
        return getReadingMinutes(b) - getReadingMinutes(a);
      default:
        return 0;
    }
  };
}

/**
 * See the module comment's flagged assumption about this key's shape.
 * Exported so RecentlyViewed (T3-1's audit gap) can reuse the exact same
 * assumption instead of re-guessing it independently — if the real shape
 * turns out to differ, only this one function needs fixing, and both
 * consumers stay correct together.
 */
export function readPercentForFolder(folder: string): number {
  try {
    const raw = localStorage.getItem(`readingProgress-folder-${folder}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return typeof parsed?.percent === 'number' ? parsed.percent : 0;
  } catch {
    return 0;
  }
}

function getPrimaryFile(note: Note): NoteFile | undefined {
  return note.files.find((f) => f.type === 'notes') || note.files[0];
}

/**
 * Bug fix confirmed via recently-viewed.js's getPrimaryHref() (the real
 * vanilla source, now uploaded): a `link`-type file's `file` value IS the
 * full external URL already — it must NOT be prefixed with
 * /data/notes/<folder>/. This was silently missing before (no source was
 * available to catch it); FolderModal below has the same fix applied.
 */
export function getPrimaryFileUrl(note: Note): string | null {
  const file = getPrimaryFile(note);
  if (!file) return null;
  if (file.type === 'link') return file.file;
  return dataPath('notes', note.folder, file.file);
}

/**
 * T5-3a follow-up: the `/notes/:folder` route now exists for
 * `notes`/`lab`-type content, so opening/copying such a note should
 * route internally instead of hitting the raw data file. Returns null
 * for any other primary file type (currently `slides`, pending T5-4, or
 * `link`) — those still have nothing to route to internally yet, so
 * callers fall back to `getPrimaryFileUrl`'s external path for them.
 */
export function getPrimaryFileRoute(note: Note): string | null {
  const file = getPrimaryFile(note);
  if (!file) return null;
  if (file.type !== 'notes' && file.type !== 'lab') return null;
  return `/notes/${encodeURIComponent(note.folder)}`;
}

interface NotesIndexProps {
  /**
   * Overrides ?subject= from the URL. Exists primarily as a testing seam
   * (mocking window.location.search reliably in jsdom is unnecessarily
   * fragile) — also usable by a future router integration that resolves
   * the subject some other way.
   */
  subjectOverride?: string;
}

export function NotesIndex({ subjectOverride }: NotesIndexProps) {
  const [allNotes, setAllNotes] = useState<Note[] | null>(null);
  const [categoryIcons, setCategoryIcons] = useState<Record<string, { icon: string }>>({});
  const [subjectsRegistry, setSubjectsRegistry] = useState<SubjectsRegistry>({});
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  // ?q= support (T3-1's audit gap — the landing point for NotFound's
  // search box): read directly via react-router's useSearchParams()
  // rather than a queryOverride testing-seam prop. The original prop
  // split existed to mirror vanilla's cross-page URL handshake
  // (recently-viewed.js writes ?q=, notes-index.js reads it, because
  // they were separate HTML pages with no other way to communicate) —
  // once vanilla is gone, there's no reason to keep that indirection;
  // react-router's own MemoryRouter already makes this trivially
  // testable without a prop. Read once via useState's lazy initializer,
  // not on every render, since the user is free to change/clear the
  // search box afterward.
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortValue>('date-desc');
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CompletionState | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [modalNote, setModalNote] = useState<Note | null>(null);

  const { announce } = useLiveRegion();
  const { favorites, toggleFavorite } = useNotesFavorites({ announce });

  const subject = subjectOverride ?? getSubjectParam();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(dataPath('index', 'notes-index.json')).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      fetch(dataPath('config', 'category-icons.json')).then((r) => (r.ok ? r.json() : {})),
      // T3-7a: subjects.json is the registry NotesIndex reads subject
      // label/title copy from now, same fetch+lookup pattern as
      // category-icons.json above — a fetch failure degrades to an
      // empty registry (generic "Notes" copy), not a page-level error,
      // since subject label text isn't load-bearing for the page to work.
      fetch(dataPath('config', 'subjects.json')).then((r) => (r.ok ? r.json() : {})),
    ])
      .then(([notesData, iconsData, subjectsData]) => {
        if (cancelled) return;
        setAllNotes(notesData.notes || []);
        setCategoryIcons(iconsData || {});
        setSubjectsRegistry(subjectsData || {});
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subjectNotes: NoteItem[] = useMemo(() => {
    const notes = allNotes ?? [];
    const scoped = subject ? notes.filter((n) => n.subject === subject) : notes;
    return scoped.map((n) => ({ ...n, id: n.folder }));
  }, [allNotes, subject]);

  const { categories, types, tags, sessions } = useMemo(() => {
    const categories = new Set<string>();
    const types = new Set<string>();
    const tags = new Set<string>();
    const sessions = new Set<string>();
    subjectNotes.forEach((note) => {
      if (note.category) categories.add(note.category);
      (note.tags || []).forEach((t) => tags.add(t));
      (note.files || []).forEach((f) => f.type && types.add(f.type));
      if (note.session) sessions.add(note.session);
    });
    return { categories, types, tags, sessions };
  }, [subjectNotes]);

  const searched = useSearch(subjectNotes, searchQuery, SEARCH_FIELDS);

  const filtered = useMemo(() => {
    return searched.filter((note) => {
      const matchSession = !selectedSession || note.session === selectedSession;
      const matchCategory = !selectedCategory || note.category === selectedCategory;
      const matchTag = selectedTags.size === 0 || (note.tags || []).some((t) => selectedTags.has(t));
      const matchType = !selectedType || (note.files || []).some((f) => f.type === selectedType);
      const matchFavorite = !showFavoritesOnly || favorites.has(note.folder);
      const matchStatus = !statusFilter || getCompletionState(readPercentForFolder(note.folder)) === statusFilter;
      return matchSession && matchCategory && matchTag && matchType && matchFavorite && matchStatus;
    });
  }, [searched, selectedSession, selectedCategory, selectedTags, selectedType, showFavoritesOnly, favorites, statusFilter]);

  // T3-2b: useLiveRegion wiring — announce the result count whenever a
  // filter/search change actually changes it, skipping the initial
  // mount (an "N results" announcement on first load, before the user
  // did anything, is noise a screen-reader user didn't ask for).
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    announce(`${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'} found`);
  }, [filtered.length, announce]);

  // Relevance wins first while actively searching — see the module
  // comment above for why the chosen sort is inert during an active query.
  const sorted = useMemo(() => {
    if (searchQuery.trim()) return filtered;
    if (sort === 'random') return seededShuffle(filtered, shuffleSeed);
    return [...filtered].sort(sortComparator(sort));
  }, [filtered, searchQuery, sort, shuffleSeed]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paged = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page]);

  // Any filter/search/sort change resets to page 1 — otherwise you can
  // get stuck on e.g. page 3 of a now-empty filtered set. A new shuffle
  // counts as a sort change for this purpose too.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSession, selectedCategory, selectedType, selectedTags, showFavoritesOnly, statusFilter, sort, shuffleSeed]);

  function getCategoryIcon(category: string): string {
    return categoryIcons[category]?.icon || categoryIcons.default?.icon || '📂';
  }

  /**
   * Open action / card click — the question T3-2a explicitly flagged
   * rather than silently assumed. Resolved: a single-file note opens the
   * file directly (the modal would just be one extra click to reach the
   * only file anyway); a multi-file note still opens the modal, since
   * that's the only way to choose which file. A note with zero files
   * falls through to the modal too, same as before — it's already a
   * genuine no-op there rather than a broken direct-open.
   */
  function openNote(note: Note) {
    if (note.files.length === 1) {
      const route = getPrimaryFileRoute(note);
      if (route) {
        navigate(route);
        return;
      }
      const url = getPrimaryFileUrl(note);
      if (url) {
        window.location.href = url;
        return;
      }
    }
    setModalNote(note);
  }

  function clearAllFilters() {
    setSelectedSession('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedTags(new Set());
    setSearchQuery('');
    setShowFavoritesOnly(false);
    setStatusFilter(null);
  }

  function copyLink(note: Note) {
    const url = getPrimaryFileRoute(note) ?? getPrimaryFileUrl(note);
    if (!url) return;
    const absolute = `${window.location.origin}${url}`;
    navigator.clipboard?.writeText(absolute).catch(() => {
      // clipboard permission denied or unavailable — silent, same as
      // vanilla's own best-effort copy behavior
    });
  }

  if (error) {
    return (
      <div className="error rounded-lg border border-border-color bg-bg-card p-6 text-center max-w-2xl mx-auto mt-8">
        <h2 className="text-lg font-semibold text-text-primary">Error Loading Notes</h2>
        <p className="text-text-muted text-sm">Could not load the notes index. Please try again later.</p>
      </div>
    );
  }

  if (allNotes === null) {
    return <div className="text-center text-text-muted py-16 font-poppins">Loading notes…</div>;
  }

  // T3-7a: subject label/title copy now comes from the subjects.json
  // registry (fetched above), not a hardcoded aws/dsa ternary — a
  // subject with no registry entry (including no subject at all) falls
  // back to the same generic "Notes" copy the ternary used before.
  const subjectConfig = subject ? subjectsRegistry[subject] : undefined;
  const breadcrumbKeys = subjectConfig ? ['Home', subjectConfig.label] : ['Home', 'Notes'];

  // T3-2a: title/canonical genuinely differ per subject, not a static
  // default — this is the direct regression test for "PageMeta actually
  // updates per route" rather than rendering the same tags everywhere.
  const pageTitle = subjectConfig ? subjectConfig.titleSuffix : 'Notes';
  const canonicalPath = subject ? `/notes-index/${subject}` : '/notes-index';

  return (
    <div className="notes-index font-poppins max-w-5xl mx-auto px-6 py-8">
      <PageMeta
        title={pageTitle}
        description={`Browse ${pageTitle.toLowerCase()} — filter by category, tag, and status, or search across every note.`}
        canonicalPath={canonicalPath}
      />
      <Breadcrumb keys={breadcrumbKeys} />

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes…"
          aria-label="Search notes"
          className="w-full rounded-lg border border-border-color bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Quick Filters */}
      <QuickFiltersBar
        className="mb-4"
        favoritesButton={{
          active: showFavoritesOnly,
          onClick: () => setShowFavoritesOnly((v) => !v),
        }}
        buttons={[
          { key: 'updated', icon: <Clock size={14} />, label: 'Recently Updated', onClick: () => setSort('updated-desc'), active: sort === 'updated-desc' },
          { key: 'readingtime', icon: <Timer size={14} />, label: 'Reading Time', onClick: () => setSort('readingtime-asc'), active: sort === 'readingtime-asc' },
          { key: 'completed', icon: <CircleCheck size={14} />, label: 'Completed', onClick: () => setStatusFilter((s) => (s === 'completed' ? null : 'completed')), active: statusFilter === 'completed' },
          { key: 'in-progress', icon: <CircleDot size={14} />, label: 'In Progress', onClick: () => setStatusFilter((s) => (s === 'in-progress' ? null : 'in-progress')), active: statusFilter === 'in-progress' },
          { key: 'not-started', icon: <Circle size={14} />, label: 'Not Started', onClick: () => setStatusFilter((s) => (s === 'not-started' ? null : 'not-started')), active: statusFilter === 'not-started' },
        ]}
        onClearAll={clearAllFilters}
      />

      {/* Filters */}
      {/* Mobile slide-in drawer for Session/Category/Type/Tags — T3-2a's
          audit gap. Sort/ViewModeToggle/Clear-all stay outside the
          drawer, always visible, since they're display controls rather
          than the ".filter-controls" group the audit specifically named
          (listing-shared.css's own comment marks this notes-only, not
          shared with Gallery's own, different mobile pattern — not
          built here for that reason). */}
      <button
        type="button"
        onClick={() => setMobileFiltersOpen(true)}
        className="md:hidden mb-4 flex items-center gap-2 rounded-md border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary"
      >
        <span aria-hidden="true">☰</span> Filters
        {(selectedSession || selectedCategory || selectedType || selectedTags.size > 0) && (
          <span className="rounded-full bg-primary text-white text-xs px-1.5 py-0.5">
            {[selectedSession, selectedCategory, selectedType].filter(Boolean).length + selectedTags.size}
          </span>
        )}
      </button>

      {mobileFiltersOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileFiltersOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div
          role="dialog"
          aria-label="Filters"
          className={`
            filter-controls flex flex-wrap gap-4 items-end
            max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-50
            max-md:w-72 max-md:flex-col max-md:items-stretch max-md:overflow-y-auto
            max-md:bg-bg-card max-md:p-4 max-md:shadow-[0_0_24px_var(--shadow)]
            max-md:transition-transform max-md:duration-200
            ${mobileFiltersOpen ? 'max-md:translate-x-0' : 'max-md:translate-x-full'}
          `}
        >
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
            className="md:hidden self-end text-text-muted hover:text-accent mb-2"
          >
            ✕
          </button>

          {sessions.size > 1 && (
          <FilterGroup label="Session">
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              aria-label="Filter by session"
              className="rounded-md border border-border-color bg-bg-card px-2 py-1 text-sm text-text-primary"
            >
              <option value="">All Sessions</option>
              {Array.from(sessions)
                .sort()
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
            {selectedSession && <SelectedChip label={selectedSession} onRemove={() => setSelectedSession('')} />}
          </FilterGroup>
        )}

        {categories.size > 1 && (
          <FilterGroup label="Category">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
              className="rounded-md border border-border-color bg-bg-card px-2 py-1 text-sm text-text-primary"
            >
              <option value="">All Categories</option>
              {Array.from(categories)
                .sort()
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
            {selectedCategory && (
              <SelectedChip label={selectedCategory} onRemove={() => setSelectedCategory('')} />
            )}
          </FilterGroup>
        )}

        {types.size > 1 && (
          <FilterGroup label="Type">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter by type"
              className="rounded-md border border-border-color bg-bg-card px-2 py-1 text-sm text-text-primary"
            >
              <option value="">All Types</option>
              {Array.from(types)
                .sort()
                .map((t) => (
                  <option key={t} value={t}>
                    {(FILE_TYPE_META[t] ?? { label: t }).label}
                  </option>
                ))}
            </select>
            {selectedType && (
              <SelectedChip
                label={(FILE_TYPE_META[selectedType] ?? { label: selectedType }).label}
                onRemove={() => setSelectedType('')}
              />
            )}
          </FilterGroup>
        )}

        {tags.size > 1 && (
          <FilterGroup label="Tags">
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setSelectedTags((prev) => new Set(prev).add(e.target.value));
              }}
              aria-label="Add tag filter"
              className="rounded-md border border-border-color bg-bg-card px-2 py-1 text-sm text-text-primary"
            >
              <option value="">Add tag…</option>
              {Array.from(tags)
                .sort()
                .filter((t) => !selectedTags.has(t))
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(selectedTags)
                .sort()
                .map((t) => (
                  <SelectedChip
                    key={t}
                    label={t}
                    onRemove={() =>
                      setSelectedTags((prev) => {
                        const next = new Set(prev);
                        next.delete(t);
                        return next;
                      })
                    }
                  />
                ))}
            </div>
          </FilterGroup>
        )}
        </div>

        <FilterGroup label="Sort by">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            disabled={!!searchQuery.trim()}
            title={searchQuery.trim() ? 'Sort is inert while a search is active — relevance wins first' : undefined}
            aria-label="Sort by"
            className="rounded-md border border-border-color bg-bg-card px-2 py-1 text-sm text-text-primary disabled:opacity-50"
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="updated-desc">Recently Updated ↓</option>
            <option value="updated-asc">Recently Updated ↑</option>
            <option value="readingtime-asc">Reading Time ↑</option>
            <option value="readingtime-desc">Reading Time ↓</option>
            <option value="random">Random</option>
          </select>
          {sort === 'random' && !searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setShuffleSeed((s) => s + 1)}
              className="text-sm text-primary hover:text-accent underline underline-offset-2"
            >
              🔀 Shuffle Again
            </button>
          )}
        </FilterGroup>

        <ViewModeToggle
          className="ml-auto"
          modes={[
            { value: 'grid', label: 'Grid', icon: <Grid2x2 size={14} /> },
            { value: 'list', label: 'List', icon: <ListIcon size={14} /> },
          ]}
          current={viewMode}
          onChange={setViewMode}
        />

        {(selectedSession || selectedCategory || selectedType || selectedTags.size > 0 || searchQuery) && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-sm text-text-muted hover:text-accent underline underline-offset-2 self-end pb-1"
          >
            Clear all
          </button>
        )}
      </div>

      <p className="text-sm text-text-muted mb-4">
        {sorted.length} note{sorted.length === 1 ? '' : 's'} found
        {searchQuery.trim() && ` for "${searchQuery.trim()}"`}
      </p>

      {/* Grid / List */}
      {sorted.length === 0 ? (
        <div className="text-center text-text-muted py-16">No notes found.</div>
      ) : (
        <div
          data-testid="notes-grid"
          className={viewMode === 'grid' ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3'}
        >
          {paged.map((note) => (
            <NoteCard
              key={note.folder}
              note={note}
              viewMode={viewMode}
              categoryIcon={getCategoryIcon(note.category)}
              percent={readPercentForFolder(note.folder)}
              isFavorite={favorites.has(note.folder)}
              onToggleFavorite={() => toggleFavorite(note.folder, note.title)}
              onOpen={() => openNote(note)}
              onCopyLink={() => copyLink(note)}
            />
          ))}
        </div>
      )}

      <Pagination className="mt-6" currentPage={page} totalPages={totalPages} onPageChange={setCurrentPage} />

      {modalNote && <FolderModal note={modalNote} onClose={() => setModalNote(null)} />}
    </div>
  );
}

function NoteCard({
  note,
  viewMode,
  categoryIcon,
  percent,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onCopyLink,
}: {
  note: NoteItem;
  viewMode: 'grid' | 'list';
  categoryIcon: string;
  percent: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  onCopyLink: () => void;
}) {
  const navigate = useNavigate();
  const primaryFile = getPrimaryFile(note);

  function handleCardClick() {
    // Card click = same as the Open quick action, matching vanilla's
    // clicking-the-card-itself behavior.
    onOpen();
  }

  const actions: QuickAction[] = [
    {
      key: 'open',
      icon: <ExternalLink size={16} />,
      label: 'Open',
      onClick: onOpen,
      // A genuine no-op (button present but functionally inert) if this
      // note has no files at all — per the confirmed decision, this
      // should never error, just do nothing.
    },
    {
      key: 'favorite',
      icon: <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />,
      label: isFavorite ? 'Remove from favorites' : 'Add to favorites',
      onClick: onToggleFavorite,
      active: isFavorite,
    },
    {
      key: 'copy-link',
      icon: <Link2 size={16} />,
      label: 'Copy link',
      onClick: onCopyLink,
    },
  ];

  if (note.hasImages) {
    actions.push({
      key: 'gallery',
      icon: <Images size={16} />,
      label: 'View in gallery',
      onClick: () => {
        navigate(`/gallery?folder=${encodeURIComponent(note.folder)}`);
      },
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleCardClick();
      }}
      aria-label={`Open ${note.title}`}
      className={`
        note-folder flex bg-bg-card border border-border-color rounded-2xl p-5
        shadow-[0_4px_12px_var(--shadow)] cursor-pointer
        transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_var(--shadow)]
        ${viewMode === 'grid' ? 'flex-col gap-2' : 'flex-row items-center gap-4'}
      `}
    >
      <div className={viewMode === 'grid' ? 'flex items-start justify-between' : 'flex items-center gap-3'}>
        <div className="text-2xl leading-none">{categoryIcon}</div>
        {primaryFile && <TypeBadges files={note.files} typeMap={FILE_TYPE_META} />}
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <h3 className="text-base font-semibold text-text-primary">{note.title}</h3>

        {/* Category-chip (--primary) + session-badge — NOT the same
            element or color as SelectedChip above, on purpose. */}
        <div className="note-chip-row flex flex-wrap gap-1.5">
          {note.category && (
            <span className="category-chip text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary whitespace-nowrap">
              {note.category}
            </span>
          )}
          {note.session && (
            <span className="session-badge text-xs font-medium px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary whitespace-nowrap">
              🗓️ {note.session}
            </span>
          )}
        </div>

        <div className="flex gap-3 text-xs text-text-muted">
          <span>📅 {formatDate(getUpdatedDate(note))}</span>
          <span>⏱️ {getReadingMinutes(note)} min read</span>
        </div>

        <div className="flex items-center gap-3">
          <CompletionBadge percent={percent} />
          <ProgressBar percent={percent} className="flex-1 max-w-[140px]" ariaLabel={`Reading progress for ${note.title}`} />
        </div>

        <CardQuickActions actions={actions} />
      </div>
    </div>
  );
}

/**
 * FolderModal — the multi-file picker for the Open quick action /
 * card click. Fully data-driven off `note.files` — any future file
 * type (a PDF, a shared doc, a code-reference entry) shows up correctly
 * with zero changes here, as confirmed. Renders nothing actionable (an
 * empty-state message, not a broken list) if `files` is empty.
 */
function FolderModal({ note, onClose }: { note: Note; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-card rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">{note.title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>

        {note.files.length === 0 ? (
          <p className="text-sm text-text-muted">No files available for this note yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {note.files.map((file) => {
              const isRoutable = file.type === 'notes' || file.type === 'lab';
              const isPrimary = getPrimaryFile(note)?.file === file.file;
              const internalUrl = isRoutable
                ? `/notes/${encodeURIComponent(note.folder)}${isPrimary ? '' : `?file=${encodeURIComponent(file.file)}`}`
                : null;
              const label = file.name || FILE_TYPE_META[file.type]?.label || file.type;
              const icon = <span aria-hidden="true">{file.icon || FILE_TYPE_META[file.type]?.icon || '📎'}</span>;
              const className =
                'flex items-center gap-2 rounded-lg border border-border-color px-3 py-2 text-sm text-text-primary hover:border-primary transition-colors';

              return (
                <li key={file.file}>
                  {internalUrl ? (
                    <Link to={internalUrl} className={className}>
                      {icon}
                      {label}
                    </Link>
                  ) : (
                    <a href={file.type === 'link' ? file.file : dataPath('notes', note.folder, file.file)} className={className}>
                      {icon}
                      {label}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
