import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CircleCheck, CircleDot, Circle, ExternalLink, Heart, Link2, Grid2x2, List as ListIcon, Timer } from 'lucide-react';
import { useSearch, type SearchableItem, type SearchField } from '../../hooks/useSearch';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import { SelectedChip } from '../../components/SelectedChip';
import { FilterGroup } from '../../components/FilterGroup';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageMeta } from '../../components/PageMeta';
import { CardQuickActions, type QuickAction } from '../../components/CardQuickActions';
import { CompletionBadge, getCompletionState, type CompletionState } from '../../components/CompletionBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { QuickFiltersBar } from '../../components/QuickFiltersBar';
import { ViewModeToggle } from '../../components/ViewModeToggle';
import { Pagination } from '../../components/Pagination';
import { dataPath } from '../../lib/siteConfig';
import { QUIZ_FAVORITES_KEY, quizProgressKey } from '../../lib/storageKeys';

/**
 * QuizIndex — React port of quiz-index.js (the quiz listing page).
 *
 * RE-SCOPED per T3-2b (expanded scope: feature parity, not just a port).
 * A direct grep against the real quiz-index.js confirmed it had zero
 * favorite/copy-link/progress/completion of any kind — this genuinely
 * brings quiz-index up to notes-index's capability level, reusing
 * T3-2a's actual shared components rather than a second implementation
 * of each:
 *   - QuickFiltersBar: Favorites-only toggle, a "Recently Attempted"
 *     quick-sort (the quiz analog of notes' Recently Updated — same
 *     `{v:1, timestamp}` pattern, keyed per quiz instead of per note),
 *     Completed/In Progress/Not Started status filters
 *   - ViewModeToggle: grid/list, same pattern as NotesIndex
 *   - Pagination: reused regardless of current quiz count
 *   - CardQuickActions: Open, Favorite, Copy Link — no Gallery action
 *     (doesn't apply to a quiz, correctly omitted per the ticket)
 *   - ProgressBar + CompletionBadge: percent = answered ÷ total questions
 *     for the most recent attempt (a different underlying metric than
 *     notes' reading-scroll percent, but the exact same generic
 *     components + three-state badge logic — getCompletionState's
 *     existing 0 / 1-94 / >=95 thresholds map cleanly onto not-started /
 *     in-progress / completed with zero special-casing, since a fully
 *     answered quiz is 100% by construction)
 *   - Favorites toggle per card — new `quizFavorites` key, same
 *     {v:1,...}-enveloped-elsewhere shape as notesFavorites/
 *     galleryFavorites, independent of both
 *
 * CONFIRMED against the real quiz-engine.js source (previously flagged
 * as an unverified assumption — same spirit as NotesIndex's own flagged
 * note on readingProgress-folder-<folder>): quiz_progress_<quizFile>
 * does NOT store `{ answered, total, timestamp }` directly. `_saveState()`
 * persists the engine's actual working state — `selectedAnswers`,
 * `answeredQuestions`, `bookmarks`, `flags`, `ratings`, `questionOrder`,
 * `optionOrder`, `elapsedSeconds`, `studyMode`, `savedAt`. `readQuizProgress()`
 * below now derives the three fields these components actually need from
 * that real shape — answered count from `Object.keys(answeredQuestions)`,
 * total from `questionOrder.length`, and timestamp from `savedAt` — so only
 * that one function's parsing changed; CompletionBadge/ProgressBar/sort
 * still consume the same `{ answered, total, timestamp }` interface as
 * before. No stored/malformed entry is treated as "not started" (percent 0),
 * never as an error.
 *
 * NOW BUILT, per PY-1: a quiz-appropriate sort analog to notes' "Reading
 * Time" ('time-asc'/'time-desc' below) — quiz-index.json entries now
 * carry `questionCount`/`estimatedMinutes` (generate_quiz_index.py's
 * calculate_quiz_time(), the question-count-based equivalent of
 * generate_notes.py's word-count-based calculate_read_time()). Both
 * fields are optional on the Quiz type: a not-yet-regenerated
 * quiz-index.json predates PY-1 and won't have them, so the sort/display
 * below treats a missing value as "unknown" rather than silently
 * sorting/showing it as 0 minutes.
 *
 * Kept from the original, narrower port: vanilla's filterQuizzes() used
 * plain substring matching; this still uses `useSearch` (the same
 * FlexSearch-backed hook NotesIndex uses) instead, and topic filter +
 * all 4 title/topic sorts are unchanged. Sort still applies
 * unconditionally (no "relevance wins first" nuance — vanilla's
 * quiz-index.js never had a ranked-search concept to begin with).
 *
 * Open / card click / Copy Link now resolve to the new per-quiz React
 * route, `/quiz/:quizId` (T5-1b), via `getQuizUrl()` below — replacing
 * the old `/quiz.html?quiz=<file>` vanilla URL now that a real route
 * exists for it. Both Open and Copy Link still intentionally point at
 * the same URL as each other; only the destination itself changed.
 */

export interface Quiz {
  title: string;
  file: string;
  topic: string;
  /** PY-1: question-count-based time estimate, generate_quiz_index.py's
   * calculate_quiz_time(). Optional because a not-yet-regenerated
   * quiz-index.json (pre-PY-1) won't carry these fields — every sort/
   * display consumer below treats a missing value as "unknown", not 0,
   * so an old entry doesn't sort as if it were instant. */
  questionCount?: number;
  estimatedMinutes?: number;
}

type QuizItem = Quiz & SearchableItem; // adds `id` (mapped from `file`) for useSearch

type SortValue = 'title-asc' | 'title-desc' | 'topic-asc' | 'topic-desc' | 'attempted-desc' | 'time-asc' | 'time-desc';

const SEARCH_FIELDS: SearchField[] = [
  { name: 'title', weight: 2 },
  { name: 'topic', weight: 1 },
];

// QUIZ_FAVORITES_KEY and the quiz-progress key shape are imported from
// lib/storageKeys.ts (T5-3a) — same values as before ('quizFavorites',
// 'quiz_progress_<id>'), one declared place instead of a local literal.
const PAGE_SIZE = 9;

interface QuizProgress {
  answered: number;
  total: number;
  timestamp: number;
}

/**
 * See the module comment above — this now parses the real _saveState()
 * shape, not the previously-assumed { answered, total, timestamp }.
 */
export function readQuizProgress(file: string): QuizProgress | null {
  try {
    const raw = localStorage.getItem(quizProgressKey(file));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const questionOrder = Array.isArray(parsed.questionOrder) ? parsed.questionOrder : null;
    if (!questionOrder || questionOrder.length === 0) return null;

    const answeredQuestions =
      parsed.answeredQuestions && typeof parsed.answeredQuestions === 'object' ? parsed.answeredQuestions : {};

    return {
      answered: Object.keys(answeredQuestions).length,
      total: questionOrder.length,
      timestamp: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

/** answered ÷ total for the most recent attempt, 0 when nothing is stored yet. */
export function quizProgressPercent(file: string): number {
  const progress = readQuizProgress(file);
  if (!progress) return 0;
  return Math.min(100, (progress.answered / progress.total) * 100);
}

function loadFavorites(): Set<string> {
  try {
    const saved = JSON.parse(localStorage.getItem(QUIZ_FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(set: Set<string>): void {
  try {
    localStorage.setItem(QUIZ_FAVORITES_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore — matches the site-wide silent-fail storage pattern
  }
}

export function getQuizUrl(file: string): string {
  return `/quiz/${encodeURIComponent(file)}`;
}

function sortComparator(sort: SortValue) {
  return (a: Quiz, b: Quiz): number => {
    switch (sort) {
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'topic-asc':
        return a.topic.localeCompare(b.topic) || a.title.localeCompare(b.title);
      case 'topic-desc':
        return b.topic.localeCompare(a.topic) || a.title.localeCompare(b.title);
      case 'attempted-desc': {
        // Never-attempted quizzes (timestamp 0) sort last, not first.
        const ta = readQuizProgress(a.file)?.timestamp ?? 0;
        const tb = readQuizProgress(b.file)?.timestamp ?? 0;
        return tb - ta || a.title.localeCompare(b.title);
      }
      case 'time-asc': {
        // PY-1: quizzes with no estimatedMinutes yet (pre-regeneration
        // data) sort last, same "unknown sorts last, not as 0" treatment
        // as attempted-desc's never-attempted case above.
        const ma = a.estimatedMinutes ?? Infinity;
        const mb = b.estimatedMinutes ?? Infinity;
        return ma - mb || a.title.localeCompare(b.title);
      }
      case 'time-desc': {
        const ma = a.estimatedMinutes ?? -Infinity;
        const mb = b.estimatedMinutes ?? -Infinity;
        return mb - ma || a.title.localeCompare(b.title);
      }
      default:
        return 0;
    }
  };
}

export function QuizIndex() {
  const navigate = useNavigate();
  const [allQuizzes, setAllQuizzes] = useState<Quiz[] | null>(null);
  const [error, setError] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [sort, setSort] = useState<SortValue>('title-asc');

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CompletionState | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  const { announce } = useLiveRegion();

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('index', 'quiz-index.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setAllQuizzes(data.Quizzes || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items: QuizItem[] = useMemo(() => (allQuizzes ?? []).map((q) => ({ ...q, id: q.file })), [allQuizzes]);

  const topics = useMemo(() => {
    const set = new Set<string>();
    items.forEach((q) => q.topic && set.add(q.topic));
    return set;
  }, [items]);

  const searched = useSearch(items, searchQuery, SEARCH_FIELDS);

  const filtered = useMemo(() => {
    return searched.filter((q) => {
      const matchTopic = !selectedTopic || q.topic === selectedTopic;
      const matchFavorite = !showFavoritesOnly || favorites.has(q.file);
      const matchStatus = !statusFilter || getCompletionState(quizProgressPercent(q.file)) === statusFilter;
      return matchTopic && matchFavorite && matchStatus;
    });
  }, [searched, selectedTopic, showFavoritesOnly, favorites, statusFilter]);

  // T3-2b: useLiveRegion wiring — same treatment as NotesIndex's
  // identical gap; skip the initial mount to avoid announcing on load.
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    announce(`${filtered.length} ${filtered.length === 1 ? 'quiz' : 'quizzes'} found`);
  }, [filtered.length, announce]);

  // No relevance-priority nuance here — see module comment. Sort always
  // applies, matching sortQuizzes() always running after filterQuizzes().
  const sorted = useMemo(() => [...filtered].sort(sortComparator(sort)), [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paged = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page]);

  // Any filter/search/sort change resets to page 1 — see NotesIndex's
  // identical rationale.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTopic, showFavoritesOnly, statusFilter, sort]);

  function clearAllFilters() {
    setSelectedTopic('');
    setSearchQuery('');
    setShowFavoritesOnly(false);
    setStatusFilter(null);
  }

  function openQuiz(file: string) {
    navigate(getQuizUrl(file));
  }

  function toggleFavorite(file: string, title: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      const willFavorite = !next.has(file);
      if (willFavorite) next.add(file);
      else next.delete(file);
      saveFavorites(next);
      announce(willFavorite ? `Added ${title} to favorites` : `Removed ${title} from favorites`);
      return next;
    });
  }

  function copyLink(file: string) {
    const absolute = `${window.location.origin}${getQuizUrl(file)}`;
    navigator.clipboard?.writeText(absolute).catch(() => {
      // clipboard permission denied or unavailable — silent, same as
      // vanilla's own best-effort copy behavior
    });
  }

  if (error) {
    return (
      <div className="error rounded-lg border border-border-color bg-bg-card p-6 text-center max-w-2xl mx-auto mt-8">
        <h2 className="text-lg font-semibold text-text-primary">Error Loading Quizzes</h2>
        <p className="text-text-muted text-sm">Could not load the quiz index. Please try again later.</p>
      </div>
    );
  }

  if (allQuizzes === null) {
    return <div className="text-center text-text-muted py-16 font-poppins">Loading quizzes…</div>;
  }

  return (
    <div className="quiz-index font-poppins max-w-5xl mx-auto px-6 py-8">
      <PageMeta
        title="Quizzes"
        description="Browse every quiz — filter by topic, track your progress, and revisit favorites."
        canonicalPath="/quiz-index"
      />
      <Breadcrumb keys={['Home', 'Quizzes']} />

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search quizzes…"
          aria-label="Search quizzes"
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
          { key: 'attempted', icon: <Clock size={14} />, label: 'Recently Attempted', onClick: () => setSort('attempted-desc'), active: sort === 'attempted-desc' },
          { key: 'time', icon: <Timer size={14} />, label: 'Quickest', onClick: () => setSort('time-asc'), active: sort === 'time-asc' },
          { key: 'completed', icon: <CircleCheck size={14} />, label: 'Completed', onClick: () => setStatusFilter((s) => (s === 'completed' ? null : 'completed')), active: statusFilter === 'completed' },
          { key: 'in-progress', icon: <CircleDot size={14} />, label: 'In Progress', onClick: () => setStatusFilter((s) => (s === 'in-progress' ? null : 'in-progress')), active: statusFilter === 'in-progress' },
          { key: 'not-started', icon: <Circle size={14} />, label: 'Not Started', onClick: () => setStatusFilter((s) => (s === 'not-started' ? null : 'not-started')), active: statusFilter === 'not-started' },
        ]}
        onClearAll={clearAllFilters}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <FilterGroup label="Filter by Topic">
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            aria-label="Filter by Topic"
            className="rounded-md border border-border-color bg-bg-card px-2 py-1 text-sm text-text-primary"
          >
            <option value="">All Topics</option>
            {Array.from(topics)
              .sort()
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>
          {selectedTopic && <SelectedChip label={selectedTopic} onRemove={() => setSelectedTopic('')} />}
        </FilterGroup>

        <FilterGroup label="Sort by">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            aria-label="Sort by"
            className="rounded-md border border-border-color bg-bg-card px-2 py-1 text-sm text-text-primary"
          >
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="topic-asc">Topic (A-Z)</option>
            <option value="topic-desc">Topic (Z-A)</option>
            <option value="attempted-desc">Recently Attempted</option>
            <option value="time-asc">Time ↑ (quickest first)</option>
            <option value="time-desc">Time ↓ (longest first)</option>
          </select>
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

        {(selectedTopic || searchQuery || showFavoritesOnly || statusFilter) && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-sm text-text-muted hover:text-accent underline underline-offset-2 self-end pb-1"
          >
            Clear all
          </button>
        )}
      </div>

      <p className="text-sm text-text-muted mb-4">{sorted.length} quiz{sorted.length === 1 ? '' : 'zes'} found</p>

      {/* Grid / List */}
      {sorted.length === 0 ? (
        <div className="text-center text-text-muted py-16">No quizzes found matching your criteria.</div>
      ) : (
        <div
          data-testid="quiz-grid"
          className={viewMode === 'grid' ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3'}
        >
          {paged.map((quiz) => (
            <QuizCard
              key={quiz.file}
              quiz={quiz}
              viewMode={viewMode}
              percent={quizProgressPercent(quiz.file)}
              isFavorite={favorites.has(quiz.file)}
              onToggleFavorite={() => toggleFavorite(quiz.file, quiz.title)}
              onOpen={() => openQuiz(quiz.file)}
              onCopyLink={() => copyLink(quiz.file)}
            />
          ))}
        </div>
      )}

      <Pagination className="mt-6" currentPage={page} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}

function QuizCard({
  quiz,
  viewMode,
  percent,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onCopyLink,
}: {
  quiz: QuizItem;
  viewMode: 'grid' | 'list';
  percent: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  onCopyLink: () => void;
}) {
  function handleCardClick() {
    // Card click = same as the Open quick action, matching vanilla's
    // clicking-the-card-itself behavior (and NotesIndex's own pattern).
    onOpen();
  }

  const actions: QuickAction[] = [
    { key: 'open', icon: <ExternalLink size={16} />, label: 'Open', onClick: onOpen },
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
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleCardClick();
      }}
      aria-label={`Open quiz: ${quiz.title}`}
      className={`
        quiz-card flex bg-bg-card border border-border-color rounded-2xl p-5
        shadow-[0_4px_12px_var(--shadow)] cursor-pointer
        transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_var(--shadow)]
        ${viewMode === 'grid' ? 'flex-col gap-2' : 'flex-row items-center gap-4'}
      `}
    >
      <div className="flex-1 flex flex-col gap-2">
        <h3 className="text-base font-semibold text-text-primary">{quiz.title}</h3>
        <p className="text-sm text-text-muted">📚 {quiz.topic}</p>
        {typeof quiz.questionCount === 'number' && typeof quiz.estimatedMinutes === 'number' && (
          <p className="text-xs text-text-muted">
            ⏱️ {quiz.questionCount} {quiz.questionCount === 1 ? 'question' : 'questions'} · ~{quiz.estimatedMinutes}{' '}
            min
          </p>
        )}

        <div className="flex items-center gap-3">
          <CompletionBadge percent={percent} />
          <ProgressBar percent={percent} className="flex-1 max-w-[140px]" ariaLabel={`Quiz progress for ${quiz.title}`} />
        </div>

        <CardQuickActions actions={actions} />
      </div>
    </div>
  );
}
