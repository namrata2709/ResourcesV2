import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Heart,
  Link2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSearch, type SearchableItem, type SearchField } from '../../hooks/useSearch';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import { useSwipe } from '../../hooks/useSwipe';
import { SelectedChip } from '../../components/SelectedChip';
import { FilterGroup } from '../../components/FilterGroup';
import { Breadcrumb } from '../../components/Breadcrumb';
import { CardQuickActions, type QuickAction } from '../../components/CardQuickActions';
import { ViewModeToggle } from '../../components/ViewModeToggle';
import { PageMeta } from '../../components/PageMeta';
import { dataPath } from '../../lib/siteConfig';
import { GALLERY_VIEW_MODE_KEY, GALLERY_FAVORITES_KEY } from '../../lib/storageKeys';

/**
 * Icon strategy (2026-07-24, applies to every ticket): lucide-react icons,
 * themed via the active theme's CSS variable (`currentColor` inherits it
 * automatically from each button's own `text-*` class), are the real build
 * here — not a placeholder. Emoji stays only where no suitable lucide icon
 * exists (there wasn't one that needed it in this file).
 */

/**
 * Gallery — React port of gallery.js (the image gallery + lightbox page).
 *
 * SCOPE OF THIS PORT — gallery.js is 1085 lines; per this ticket's own
 * "Done when"/"Testing" sections (feature parity confirmed against the
 * EXISTING Playwright suite, not every line of the source), here's what's
 * built vs. explicitly deferred, same scoping discipline as T3-2a/b:
 *
 * BUILT: ?folder= scoping, search (via the shared useSearch — no third
 * search implementation, per this ticket's explicit instruction),
 * subject/category/tag filters (tags combine as AND — gallery.js's own
 * `.every()`, deliberately NOT the same as NotesIndex's `.some()`; these
 * are genuinely different filters on different pages, not one "correct"
 * rule), favorites-only quick filter, sort (added/title asc+desc), Grid
 * + List view modes (persisted to the same `galleryView` localStorage
 * key), image cards with category chip + related-note link + favorite
 * toggle, and a full lightbox: prev/next nav, counter, keyboard
 * shortcuts (Escape/←/→/+/-/0/F), zoom in/out/reset + click-to-zoom,
 * metadata panel, download, favorite toggle — all announced via the
 * shared useLiveRegion hook from T3-1.
 *
 * EXPLICITLY DEFERRED (named here, not silently dropped): Masonry view
 * mode, mouse drag-to-pan + touch double-tap-to-zoom (touch swipe/pinch
 * itself is now implemented — see "SECOND FOLLOW-UP PASS" below), the
 * native Fullscreen API toggle, client-measured Resolution/File-Size (the
 * IntersectionObserver lazy-measurement system, plus their sort options
 * and the "Measuring…" metadata rows), Recently-Viewed tracking + its
 * sort, Random sort + reshuffle, the Quick Filters bar's
 * Screenshot/Image type toggle (the card badge itself IS kept — see
 * isScreenshot() below — just not the filter chip for it), and the
 * lightbox's Tab-key focus trap.
 *
 * Image URL convention matches gallery.js exactly:
 * `data/notes/<folder>/images/<file>` (here as `/data/notes/...`, same
 * convention NotesIndex's "Open Note" link already uses).
 *
 * T4-1a FOLLOW-UP PASS (confirmed missing, not deferred, per the
 * ticket's own direct read of this file): the card's Favorite toggle
 * was a bespoke absolute-positioned button and the grid/list toggle was
 * a bespoke button pair — both duplicated UI that T3-2a already built as
 * shared components. Fixed here:
 *   - ImageCard now renders `CardQuickActions` (Favorite + Copy Link —
 *     no Open, since the whole card already opens the lightbox directly;
 *     no Gallery action, since that would point at itself), same
 *     component NotesIndex/QuizIndex use. This intentionally moves
 *     Favorite out of the thumbnail-overlay position and into the card's
 *     content area, alongside the new Copy Link button — a deliberate
 *     "same component, same design" consistency choice, not an
 *     accidental regression of the overlay's hover convenience.
 *   - The bespoke Grid/List button pair is replaced with the shared
 *     `ViewModeToggle` (labels "Grid"/"List", matching Notes/QuizIndex's
 *     aria-labels exactly — was "Grid view"/"List view" before).
 *   - Copy Link is genuinely new (gallery.js never had it). No existing
 *     per-image React route exists yet to copy, so this establishes a
 *     query-param addressing scheme on the real `/gallery` route itself:
 *     `/gallery?folder=<folder>&image=<raw-image-filename>` — distinct
 *     from the bare `/gallery` page link, per this ticket's own testing
 *     requirement. `folder`/`image` aren't wired up to auto-open the
 *     lightbox on load (that would be new deep-linking behavior, out of
 *     this ticket's "copy the correct URL" scope) — flagging that as the
 *     obvious next step for whichever ticket wants real shareable deep
 *     links, not silently implying it already works.
 *
 * The Lightbox toolbar's own Favorite/Download/Metadata/Close buttons
 * are untouched — CardQuickActions is a card-specific quick-action row
 * per its own doc comment, not a generic toolbar; the lightbox isn't a
 * card, and a "Copy Link" button was never asked for there specifically
 * (only "the Copy Link quick action", i.e. the card's).
 *
 * T4-1a SECOND FOLLOW-UP PASS (feature-parity audit, sprint-tickets-
 * feature-audit.md Part B) — two more gaps resolved, one confirmed as
 * already handled:
 *   - Lazy loading: the audit asked why IntersectionObserver wasn't
 *     mentioned. It wasn't needed — native `loading="lazy"` on every
 *     <img> (see ImageCard below) is a legitimate, simpler substitute for
 *     gallery.js's own hand-rolled IntersectionObserver lazy-loading;
 *     browsers have supported native lazy-loading for years and it does
 *     the same job with far less code. Not a gap, just a different (and
 *     lighter) implementation of the same requirement.
 *   - Mobile filter drawer: Gallery gets its OWN bottom-sheet pattern
 *     (slides up from the bottom, rounded top corners), not NotesIndex's
 *     side drawer (slides in from the right) — these were always meant
 *     to be different components per listing-shared.css's own comment
 *     (see NotesIndex.tsx's mobile-drawer comment), not an oversight to
 *     unify. Wraps only Subject/Category/Tags, same convention as Notes:
 *     Sort, the Favorites toggle, and ViewModeToggle stay outside it,
 *     always visible, since they're display controls rather than filters.
 *   - Mobile pinch/swipe: originally deferred wholesale (see "EXPLICITLY
 *     DEFERRED" above). Now resolved via lib/gestures.ts's
 *     createSwipeTracker + hooks/useSwipe.ts (per lib/README.md's
 *     forward-compat pattern — plain-function gesture logic, React hook
 *     is just a thin wrapper). Reconciliation: single-finger swipe
 *     left/right navigates prev/next, but ONLY while zoom is at 1x — a
 *     zoomed-in image ignores swipe entirely rather than navigating out
 *     from under a user mid-inspection (drag-to-pan itself is still
 *     explicitly deferred, so a zoomed swipe intentionally does nothing,
 *     rather than half-implementing pan). Two-finger pinch always
 *     adjusts zoom, independent of the 1x gate, clamped to the same
 *     [MIN_ZOOM, MAX_ZOOM] bounds as the toolbar's +/- buttons.
 *     Double-tap-to-zoom remains explicitly deferred (not part of this
 *     pass — only "pinch/swipe" was named in the audit).
 */

interface RawNote {
  title: string;
  folder: string;
  subject: string;
  category: string;
  tags: string[];
  date: string;
  lastModified: string;
  hasImages: boolean;
  images: Array<{ name: string; file: string }>;
  files: Array<{ name: string; file: string; type: string; icon: string }>;
}

interface GalleryImage extends SearchableItem {
  name: string;
  file: string; // resolved URL, not just the raw filename
  folder: string;
  noteTitle: string;
  subject: string;
  category: string;
  tags: string[];
  date: string | null;
  lastModified: string | null;
  relatedNoteUrl: string | null;
}

type SortValue = 'added-desc' | 'added-asc' | 'title-asc' | 'title-desc';
type ViewMode = 'grid' | 'list';

// Both keys now imported from lib/storageKeys.ts (T5-3a) — same values
// as before ('galleryView' / 'galleryFavorites'), one declared place.
const VIEW_MODE_KEY = GALLERY_VIEW_MODE_KEY;
const IMAGE_FAVORITES_KEY = GALLERY_FAVORITES_KEY;

const SEARCH_FIELDS: SearchField[] = [
  { name: 'name', weight: 4 },
  { name: 'tags', weight: 3, getValue: (item) => ((item.tags as string[]) || []).join(' ') },
  { name: 'category', weight: 2 },
  { name: 'noteTitle', weight: 1 },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/**
 * The per-image URL Copy Link copies — see the module comment's
 * "T4-1a FOLLOW-UP PASS" note on why this is a query-param scheme on the
 * real /gallery route rather than a dedicated per-image route (none
 * exists yet).
 */
export function getImageUrl(img: Pick<GalleryImage, 'folder' | 'file'>): string {
  const rawFilename = img.file.split('/').pop() || img.file;
  return `/gallery?folder=${encodeURIComponent(img.folder)}&image=${encodeURIComponent(rawFilename)}`;
}

/**
 * T5-3a follow-up (flagged directly in that ticket's own Linking &
 * routing section, and in T4-1's "temporarily vanilla" note): the
 * `/notes/:folder` route now exists for `notes`/`lab`-type content, so
 * this stops pointing at the raw data file for those two types and
 * routes internally instead — same "any url starting with '/' is an
 * internal route" convention Breadcrumb already uses. Any other file
 * type (currently just `slides`, pending T5-4) still resolves to the
 * raw data path — genuinely nothing to route to yet for that type, not
 * an oversight.
 */
/** Same convention Breadcrumb.tsx already uses: any url starting with
 * "/" is a real internal route (render as <Link>, no page reload);
 * anything else is still a plain external file link. */
function isInternalRoute(url: string): boolean {
  return url.startsWith('/');
}

function getRelatedNoteUrl(note: RawNote): string | null {
  if (!note.files || note.files.length === 0) return null;
  const notesFile = note.files.find((f) => f.type === 'notes' || f.type === 'lab') || note.files[0];
  if (!notesFile) return null;
  if (notesFile.type === 'notes' || notesFile.type === 'lab') {
    return `/notes/${encodeURIComponent(note.folder)}`;
  }
  return dataPath('notes', note.folder, notesFile.file);
}

function isScreenshot(img: { name: string; file: string }): boolean {
  const probe = `${img.name || ''} ${img.file || ''}`.toLowerCase();
  return /screenshot|screen[\s_-]?shot|scrnshot/.test(probe);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function loadFavorites(): Set<string> {
  try {
    const saved = JSON.parse(localStorage.getItem(IMAGE_FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(set: Set<string>): void {
  try {
    localStorage.setItem(IMAGE_FAVORITES_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore — matches gallery.js's silent-fail storage pattern
  }
}

function getSavedViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === 'grid' || saved === 'list' ? saved : 'grid';
  } catch {
    return 'grid';
  }
}

function sortComparator(sort: SortValue) {
  return (a: GalleryImage, b: GalleryImage): number => {
    switch (sort) {
      case 'added-desc':
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      case 'added-asc':
        return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
      case 'title-asc':
        return a.name.localeCompare(b.name);
      case 'title-desc':
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  };
}

interface GalleryProps {
  /** Testing seam, same pattern as NotesIndex's subjectOverride. */
  folderOverride?: string;
}

export function Gallery({ folderOverride }: GalleryProps) {
  const [searchParams] = useSearchParams();
  const folderParam = folderOverride ?? searchParams.get('folder') ?? '';

  const { announce } = useLiveRegion();

  const [allNotes, setAllNotes] = useState<RawNote[] | null>(null);
  const [error, setError] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  // Reads ?favorites=true so the P0-7 Quick Actions "Favorites" shortcut
  // (which deep-links to /gallery?favorites=true — see lib/quickActions.ts's
  // own comment) actually lands pre-filtered instead of on an unfiltered
  // gallery. One-time initial value only, same pattern as folderParam above;
  // the toggle button below still freely overrides it after that.
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(
    () => searchParams.get('favorites') === 'true'
  );
  const [sort, setSort] = useState<SortValue>('added-desc');
  const [viewMode, setViewModeState] = useState<ViewMode>(getSavedViewMode);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showMetadata, setShowMetadata] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('index', 'notes-index.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setAllNotes(data.notes || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setViewMode(mode: ViewMode) {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore
    }
  }

  function toggleFavorite(file: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      saveFavorites(next);
      return next;
    });
  }

  function copyLink(img: GalleryImage) {
    const absolute = `${window.location.origin}${getImageUrl(img)}`;
    navigator.clipboard?.writeText(absolute).catch(() => {
      // clipboard permission denied or unavailable — silent, same as
      // Notes/QuizIndex's own best-effort copy behavior
    });
  }

  const allImages: GalleryImage[] = useMemo(() => {
    const notes = allNotes ?? [];
    const scoped = folderParam && folderParam !== 'all' ? notes.filter((n) => n.folder === folderParam) : notes;

    const images: GalleryImage[] = [];
    scoped.forEach((note) => {
      if (!note.hasImages || !note.images) return;
      const relatedNoteUrl = getRelatedNoteUrl(note);
      note.images.forEach((img) => {
        const file = dataPath('notes', note.folder, 'images', img.file);
        images.push({
          id: file,
          name: img.name,
          file,
          folder: note.folder,
          noteTitle: note.title,
          subject: note.subject || '',
          category: note.category || '',
          tags: note.tags || [],
          date: note.date || null,
          lastModified: note.lastModified || note.date || null,
          relatedNoteUrl,
        });
      });
    });
    return images;
  }, [allNotes, folderParam]);

  const { subjects, categories, tags } = useMemo(() => {
    const subjects = new Set<string>();
    const categories = new Set<string>();
    const tags = new Set<string>();
    allImages.forEach((img) => {
      if (img.subject) subjects.add(img.subject);
      if (img.category) categories.add(img.category);
      img.tags.forEach((t) => tags.add(t));
    });
    return { subjects, categories, tags };
  }, [allImages]);

  const searched = useSearch(allImages, searchQuery, SEARCH_FIELDS);

  const filtered = useMemo(() => {
    return searched.filter((img) => {
      const matchSubject = !selectedSubject || img.subject === selectedSubject;
      const matchCategory = !selectedCategory || img.category === selectedCategory;
      // AND across ALL selected tags — gallery.js's own `.every()`. This is
      // deliberately different from NotesIndex's `.some()` (OR within a
      // multi-selected tag set) — two different pages, two different
      // filter semantics, both preserved faithfully from their own source.
      const matchTags = selectedTags.size === 0 || Array.from(selectedTags).every((t) => img.tags.includes(t));
      const matchFavorite = !showFavoritesOnly || favorites.has(img.file);
      return matchSubject && matchCategory && matchTags && matchFavorite;
    });
  }, [searched, selectedSubject, selectedCategory, selectedTags, showFavoritesOnly, favorites]);

  // Same "relevance wins first while searching" simplification as
  // NotesIndex, for the same reason (useSearch's signature doesn't expose
  // scores) — see NotesIndex.tsx's module comment for the full rationale.
  const sorted = useMemo(() => {
    if (searchQuery.trim()) return filtered;
    return [...filtered].sort(sortComparator(sort));
  }, [filtered, searchQuery, sort]);

  function clearAllFilters() {
    setSelectedSubject('');
    setSelectedCategory('');
    setSelectedTags(new Set());
    setShowFavoritesOnly(false);
    setSearchQuery('');
  }

  // ── Lightbox ────────────────────────────────────────────────────────────

  const currentImage = lightboxIndex !== null ? sorted[lightboxIndex] : null;

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setZoom(1);
  }

  function closeLightbox() {
    setLightboxIndex(null);
    setZoom(1);
    setShowMetadata(false);
  }

  function navigate(direction: 1 | -1) {
    if (sorted.length === 0 || lightboxIndex === null) return;
    const nextIndex = (lightboxIndex + direction + sorted.length) % sorted.length;
    setLightboxIndex(nextIndex);
    setZoom(1);
  }

  function zoomIn() {
    setZoom((z) => clampZoom(z + ZOOM_STEP));
  }
  function zoomOut() {
    setZoom((z) => clampZoom(z - ZOOM_STEP));
  }
  function resetZoom() {
    setZoom(1);
  }
  // Two-finger pinch — see the module comment's "SECOND FOLLOW-UP PASS"
  // for why this is always active (unlike swipe, which gates on zoom===1).
  function pinchZoom(scaleFactor: number) {
    setZoom((z) => clampZoom(z * scaleFactor));
  }

  function downloadCurrentImage() {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage.file;
    link.download = currentImage.file.split('/').pop() || currentImage.name;
    link.click();
  }

  // Announce on every image change (open or navigate) — matches
  // gallery.js's announce() call in showImageInLightbox().
  useEffect(() => {
    if (currentImage) {
      announce(`Image ${(lightboxIndex ?? 0) + 1} of ${sorted.length}: ${currentImage.name}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImage]);

  // Keyboard shortcuts — only active while the lightbox is open. Uses the
  // shared useKeyboardShortcut hook (T3-2b) instead of a page-rolled
  // window.addEventListener, so these show up correctly in
  // KeyboardShortcutsPanel while the lightbox is open, and disappear from
  // it again once closed (each hook call's own `enabled` flag ties
  // registration to lightboxIndex directly, the same way the old effect's
  // early-return did).
  const lightboxOpen = lightboxIndex !== null;

  useKeyboardShortcut({
    key: 'Escape',
    keyLabel: 'Esc',
    description: 'Close lightbox',
    enabled: lightboxOpen,
    allowWhileTyping: true,
    handler: () => closeLightbox(),
  });
  useKeyboardShortcut({
    key: 'ArrowLeft',
    keyLabel: '←',
    description: 'Previous image',
    enabled: lightboxOpen,
    allowWhileTyping: true,
    handler: (e) => {
      e.preventDefault();
      navigate(-1);
    },
  });
  useKeyboardShortcut({
    key: 'ArrowRight',
    keyLabel: '→',
    description: 'Next image',
    enabled: lightboxOpen,
    allowWhileTyping: true,
    handler: (e) => {
      e.preventDefault();
      navigate(1);
    },
  });
  useKeyboardShortcut({
    // '=' is the unshifted key '+' lives on a US keyboard — both should
    // zoom in, matching the old switch statement's fallthrough exactly.
    key: ['+', '='],
    keyLabel: '+',
    description: 'Zoom in',
    enabled: lightboxOpen,
    allowWhileTyping: true,
    handler: (e) => {
      e.preventDefault();
      zoomIn();
    },
  });
  useKeyboardShortcut({
    key: ['-', '_'],
    keyLabel: '-',
    description: 'Zoom out',
    enabled: lightboxOpen,
    allowWhileTyping: true,
    handler: (e) => {
      e.preventDefault();
      zoomOut();
    },
  });
  useKeyboardShortcut({
    key: '0',
    keyLabel: '0',
    description: 'Reset zoom',
    enabled: lightboxOpen,
    allowWhileTyping: true,
    handler: (e) => {
      e.preventDefault();
      resetZoom();
    },
  });
  useKeyboardShortcut({
    key: 'f',
    keyLabel: 'F',
    description: 'Toggle favorite',
    enabled: lightboxOpen,
    allowWhileTyping: true,
    handler: () => {
      if (currentImage) toggleFavorite(currentImage.file);
    },
  });

  if (error) {
    return (
      <div className="error rounded-lg border border-border-color bg-bg-card p-6 text-center max-w-2xl mx-auto mt-8">
        <h2 className="text-lg font-semibold text-text-primary">Error Loading Gallery</h2>
        <p className="text-text-muted text-sm">Could not load the image index. Please try again later.</p>
      </div>
    );
  }

  if (allNotes === null) {
    return <div className="text-center text-text-muted py-16 font-poppins">Loading images…</div>;
  }

  return (
    <div className="gallery-page font-poppins max-w-5xl mx-auto px-6 py-8">
      <PageMeta
        title="Images Gallery"
        description="Browse screenshots and diagrams from every note, filterable by subject and category."
        canonicalPath="/gallery"
      />
      <Breadcrumb keys={['Home', 'Images Gallery']} />

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search images…"
          aria-label="Search images"
          className="w-full rounded-lg border border-border-color bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Filters */}
      {/* Mobile bottom-sheet drawer for Subject/Category/Tags — Gallery's
          OWN mobile pattern (slides up from the bottom), deliberately
          distinct from NotesIndex's side drawer (slides in from the
          right) — see the module comment's "SECOND FOLLOW-UP PASS" for
          why these were never meant to be unified. Sort, the Favorites
          toggle, and ViewModeToggle stay outside it, always visible,
          same "display controls aren't filters" convention Notes uses. */}
      <button
        type="button"
        onClick={() => setMobileFiltersOpen(true)}
        className="md:hidden mb-4 flex items-center gap-2 rounded-md border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary"
      >
        <span aria-hidden="true">☰</span> Filters
        {(selectedSubject || selectedCategory || selectedTags.size > 0) && (
          <span className="rounded-full bg-primary text-white text-xs px-1.5 py-0.5">
            {[selectedSubject, selectedCategory].filter(Boolean).length + selectedTags.size}
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
            max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-50
            max-md:max-h-[70vh] max-md:flex-col max-md:items-stretch max-md:overflow-y-auto
            max-md:bg-bg-card max-md:p-4 max-md:rounded-t-2xl max-md:shadow-[0_-4px_24px_var(--shadow)]
            max-md:transition-transform max-md:duration-200
            ${mobileFiltersOpen ? 'max-md:translate-y-0' : 'max-md:translate-y-full'}
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

          {subjects.size > 1 && (
            <FilterGroup label="Subject">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                aria-label="Filter by subject"
                className="rounded-md border border-border-color bg-bg-card px-2 py-1 text-sm text-text-primary"
              >
                <option value="">All Subjects</option>
                {Array.from(subjects)
                  .sort()
                  .map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
              </select>
              {selectedSubject && <SelectedChip label={selectedSubject.toUpperCase()} onRemove={() => setSelectedSubject('')} />}
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
              {selectedCategory && <SelectedChip label={selectedCategory} onRemove={() => setSelectedCategory('')} />}
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
            aria-label="Sort by"
            className="rounded-md border border-border-color bg-bg-card px-2 py-1 text-sm text-text-primary disabled:opacity-50"
          >
            <option value="added-desc">Recently Added ↓</option>
            <option value="added-asc">Recently Added ↑</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
          </select>
        </FilterGroup>

        <button
          type="button"
          onClick={() => setShowFavoritesOnly((v) => !v)}
          aria-pressed={showFavoritesOnly}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
            showFavoritesOnly
              ? 'bg-accent text-white border-accent'
              : 'border-border-color text-text-secondary hover:border-accent'
          }`}
        >
          {showFavoritesOnly ? '♥' : '♡'} Favorites
        </button>

        <ViewModeToggle
          className="ml-auto"
          modes={[
            { value: 'grid', label: 'Grid', icon: '▦' },
            { value: 'list', label: 'List', icon: '☰' },
          ]}
          current={viewMode}
          onChange={setViewMode}
        />

        {(selectedSubject || selectedCategory || selectedTags.size > 0 || showFavoritesOnly || searchQuery) && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-sm text-text-muted hover:text-accent underline underline-offset-2"
          >
            Clear all
          </button>
        )}
      </div>

      <p className="text-sm text-text-muted mb-4">{sorted.length} image{sorted.length === 1 ? '' : 's'} found</p>

      {/* Grid / List */}
      {sorted.length === 0 ? (
        <div className="text-center text-text-muted py-16">No images found.</div>
      ) : (
        <div
          data-testid="gallery-grid"
          className={
            viewMode === 'grid'
              ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'
              : 'flex flex-col gap-3'
          }
        >
          {sorted.map((img, index) => (
            <ImageCard
              key={img.id}
              img={img}
              viewMode={viewMode}
              isFavorite={favorites.has(img.file)}
              onOpen={() => openLightbox(index)}
              onToggleFavorite={() => toggleFavorite(img.file)}
              onCopyLink={() => copyLink(img)}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {currentImage && (
        <Lightbox
          image={currentImage}
          index={lightboxIndex ?? 0}
          total={sorted.length}
          zoom={zoom}
          isFavorite={favorites.has(currentImage.file)}
          showMetadata={showMetadata}
          onClose={closeLightbox}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onImageClick={() => {
            if (zoom === 1) setZoom(2);
          }}
          onToggleFavorite={() => toggleFavorite(currentImage.file)}
          onToggleMetadata={() => setShowMetadata((v) => !v)}
          onDownload={downloadCurrentImage}
          onPinchZoom={pinchZoom}
        />
      )}
    </div>
  );
}

function ImageCard({
  img,
  viewMode,
  isFavorite,
  onOpen,
  onToggleFavorite,
  onCopyLink,
}: {
  img: GalleryImage;
  viewMode: ViewMode;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onCopyLink: () => void;
}) {
  const typeLabel = isScreenshot(img) ? '📸 Screenshot' : '🖼️ Image';

  // Favorite + Copy Link only — no Open (the whole card already opens the
  // lightbox directly) and no Gallery action (would point at itself).
  const actions: QuickAction[] = [
    {
      key: 'favorite',
      icon: <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />,
      label: isFavorite ? 'Remove from favorites' : 'Add to favorites',
      onClick: onToggleFavorite,
      active: isFavorite,
    },
    { key: 'copy-link', icon: <Link2 size={16} />, label: 'Copy link', onClick: onCopyLink },
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen();
      }}
      aria-label={`View ${img.name}`}
      className={`
        image-card group relative flex bg-bg-card border border-border-color rounded-[var(--card-radius)] overflow-hidden
        cursor-pointer shadow-[0_4px_12px_var(--shadow)] transition-transform duration-[var(--motion-duration)]
        hover:-translate-y-0.5 hover:shadow-[0_8px_24px_var(--shadow)]
        ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-center gap-4 p-3'}
      `}
    >
      <div className={viewMode === 'grid' ? 'relative aspect-video bg-bg-secondary' : 'relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-bg-secondary'}>
        {viewMode === 'grid' && (
          <span className="absolute top-2 left-2 z-10 text-xs px-2 py-0.5 rounded-full bg-bg-card/90 text-text-secondary">
            {typeLabel}
          </span>
        )}
        <img src={img.file} alt={img.name} loading="lazy" className="w-full h-full object-cover" />
      </div>

      <div className={viewMode === 'grid' ? 'p-3 flex flex-col gap-1.5' : 'flex-1 flex flex-col gap-1'}>
        <div className="text-sm font-semibold text-text-primary">{img.name}</div>
        {/* image-category-chip — gallery.css's own convention uses --accent
            here, NOT the --primary NotesIndex's category-chip uses. Two
            different pages' own established color choices, both preserved
            faithfully rather than unified — worth knowing this is an
            existing cross-page inconsistency, not something introduced here. */}
        {img.category && (
          <span className="image-category-chip self-start text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">
            {img.category}
          </span>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-text-muted">
          <span>📁 {img.noteTitle}</span>
          {img.lastModified && <span>🕐 {formatDateShort(img.lastModified)}</span>}
        </div>
        {img.relatedNoteUrl && (
          isInternalRoute(img.relatedNoteUrl) ? (
            <Link
              to={img.relatedNoteUrl}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:text-accent underline underline-offset-2 self-start"
            >
              📄 Open Note
            </Link>
          ) : (
            <a
              href={img.relatedNoteUrl}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:text-accent underline underline-offset-2 self-start"
            >
              📄 Open Note
            </a>
          )
        )}

        <CardQuickActions actions={actions} />
      </div>
    </div>
  );
}

function Lightbox({
  image,
  index,
  total,
  zoom,
  isFavorite,
  showMetadata,
  onClose,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onImageClick,
  onToggleFavorite,
  onToggleMetadata,
  onDownload,
  onPinchZoom,
}: {
  image: GalleryImage;
  index: number;
  total: number;
  zoom: number;
  isFavorite: boolean;
  showMetadata: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onImageClick: () => void;
  onToggleFavorite: () => void;
  onToggleMetadata: () => void;
  onDownload: () => void;
  onPinchZoom: (scaleFactor: number) => void;
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  // Mobile swipe/pinch reconciliation (T4-1a second follow-up pass) — see
  // the module comment for the full rationale. Swipe only navigates while
  // NOT zoomed in; pinch always adjusts zoom.
  const gestureRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => {
      if (zoom === 1) onNext();
    },
    onSwipeRight: () => {
      if (zoom === 1) onPrev();
    },
    onPinchChange: onPinchZoom,
  });

  return (
    <div
      className="lightbox fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lightbox-content relative w-full h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <div className="flex items-center gap-3 text-sm">
            <span>{image.name}</span>
            <span data-testid="lightbox-counter" className="text-white/70">
              {index + 1} of {total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onZoomOut} aria-label="Zoom out" className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center">
              <ZoomOut size={18} />
            </button>
            <span data-testid="zoom-level" className="text-xs w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button type="button" onClick={onZoomIn} aria-label="Zoom in" className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center">
              <ZoomIn size={18} />
            </button>
            <button type="button" onClick={onResetZoom} aria-label="Reset zoom" className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center">
              <RotateCcw size={18} />
            </button>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isFavorite}
              className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center"
            >
              <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button type="button" onClick={onDownload} aria-label="Download image" className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center">
              <Download size={18} />
            </button>
            <button type="button" onClick={onToggleMetadata} aria-label="Toggle metadata" className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center">
              <Info size={18} />
            </button>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Close lightbox"
              className="lightbox-close h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div ref={gestureRef} className="flex-1 flex items-center justify-center relative overflow-hidden px-12">
          <button
            type="button"
            onClick={onPrev}
            disabled={total <= 1}
            aria-label="Previous image"
            className="lightbox-prev absolute left-2 h-10 w-10 rounded-full bg-white/10 text-white disabled:opacity-30 flex items-center justify-center"
          >
            <ChevronLeft size={24} />
          </button>
          <img
            data-testid="lightbox-image"
            src={image.file}
            alt={image.name}
            onClick={onImageClick}
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease' }}
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            onClick={onNext}
            disabled={total <= 1}
            aria-label="Next image"
            className="lightbox-next absolute right-2 h-10 w-10 rounded-full bg-white/10 text-white disabled:opacity-30 flex items-center justify-center"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {showMetadata && (
          <div className="absolute right-4 top-16 bottom-4 w-72 bg-bg-card rounded-xl p-4 text-text-primary overflow-y-auto">
            <dl className="space-y-2 text-sm">
              {image.category && (
                <div>
                  <dt className="text-text-muted">Category</dt>
                  <dd>{image.category}</dd>
                </div>
              )}
              {image.lastModified && (
                <div>
                  <dt className="text-text-muted">Last Updated</dt>
                  <dd>{formatDateShort(image.lastModified)}</dd>
                </div>
              )}
              {image.relatedNoteUrl && (
                <div>
                  <dt className="text-text-muted">Related Note</dt>
                  <dd>
                    {isInternalRoute(image.relatedNoteUrl) ? (
                      <Link to={image.relatedNoteUrl} className="text-primary hover:text-accent underline">
                        {image.noteTitle}
                      </Link>
                    ) : (
                      <a href={image.relatedNoteUrl} className="text-primary hover:text-accent underline">
                        {image.noteTitle}
                      </a>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
