/**
 * lib/storageKeys.ts
 *
 * Central registry of every localStorage key/key-shape this app touches,
 * per T5-3a's own review note (2026-07-27): "cheap to add now given how
 * many distinct keys this one ticket already names, and the exact kind
 * of thing worth centralizing before a typo'd key string causes a
 * silent bug."
 *
 * Every value here is copied EXACTLY from the real string literal
 * already in use elsewhere in the codebase (NotesIndex.tsx,
 * Gallery.tsx, QuizIndex.tsx, useQuizEngine.ts, ThemeContext/lib/theme.ts)
 * — this file doesn't introduce new key names, it just gives the
 * existing ones one place to live instead of five separately-declared
 * `const FOO_KEY = '...'` copies that could silently drift.
 *
 * Plain keys are exported as constants; per-item keys (one localStorage
 * entry per note/quiz/page) are exported as small builder functions so
 * the interpolation only happens in one place.
 */

// --- Flat, single-value keys ---------------------------------------

/** Same key theme.js/lib/theme.ts always used — 'light' | 'dark' | 'comfort'. */
export const THEME_KEY = 'theme';

/** notes-index.js's/NotesIndex.tsx's favorite-folders set. Deliberately
 * separate from GALLERY_FAVORITES_KEY/QUIZ_FAVORITES_KEY — three
 * independent favorite lists, not one shared one (Finding 19). */
export const NOTES_FAVORITES_KEY = 'notesFavorites';

/** gallery.js's/Gallery.tsx's favorite-images set. */
export const GALLERY_FAVORITES_KEY = 'galleryFavorites';

/** quiz-index.js's/QuizIndex.tsx's favorite-quizzes set. */
export const QUIZ_FAVORITES_KEY = 'quizFavorites';

/** Gallery's grid/list view-mode preference. */
export const GALLERY_VIEW_MODE_KEY = 'galleryView';

/** notes-exam.js's cycle state: 'none' | 'highlight' | 'test'. */
export const EXAM_MODE_KEY = 'examMode';

/** notes-page-core.js's Lite Mode toggle — 'true' | 'false' as a plain
 * string (same "flat, uncomplicated value" convention as examMode's
 * plain-string states, not a JSON blob). Consumed by Note.tsx (T5-3c-1)
 * via its own toggle control; once T5-3c-2's Settings FAB item lands it
 * reads/writes this exact same key, reloading the page on click same as
 * Note.tsx's own toggle does today. */
export const LITE_MODE_KEY = 'liteMode';

/** ASSUMPTION FLAGGED (T5-3c-2): no prior "Study Timer" feature exists
 * anywhere in this codebase or in the ticket's own reference material —
 * confirmed by grepping the whole repo for "timer"/"study" before adding
 * this. sprint-tickets.md's spec for this item is only "shows current
 * hidden/shown state," which presumes a widget to show/hide but doesn't
 * describe what it should display. This key persists just the
 * visibility toggle, same 'true'/'false' string convention as
 * LITE_MODE_KEY; StudyTimer.tsx documents the minimal widget built
 * against it. Flagging for review rather than silently treating this as
 * a confirmed port of something real. */
export const STUDY_TIMER_VISIBLE_KEY = 'studyTimerVisible';

/** P3-2's Revision Mode toggle — 'true' | 'false' as a plain string,
 * same convention as LITE_MODE_KEY/EXAM_MODE_KEY. Unlike Lite Mode,
 * toggling this does NOT reload the page: Revision Mode only filters
 * which body-prose blocks BodyProseModule renders (highlighted content,
 * bookmarked sections, and highlights' personal notes — the three
 * categories P3-2's own dependencies each contribute: P1-1, P1-2,
 * T5-3c-7), it doesn't gate which top-level modules fetch/mount the way
 * Lite Mode's moduleRegistry tags do, so there's no fetch-lifecycle
 * reason to force a reload. */
export const REVISION_MODE_KEY = 'revisionMode';

/** P0-5: per-quiz "recently opened" marker, `{ v: 1, timestamp }` —
 * written by useQuizEngine.ts once per real quiz load (standalone
 * `/quiz/:quizId` opens only, not `source: 'notes'` embedded opens,
 * which are already covered by the note's own readingProgressKey),
 * read by lib/readingProgress.ts's `getRecentQuizEntries()`/
 * `getRecentEntries()` so RecentlyViewed can interleave quizzes
 * alongside notes.
 *
 * Deliberately its own prefix, NOT `quizProgress-<quizFile>` (which
 * would collide in spirit with `quizProgressKey`'s real, different
 * `quiz_progress_<id>` key — the engine's actual saved-answer state,
 * only written after an answer, not on open). Mirrors `readingProgressKey`'s
 * `readingProgress-folder-<folder>` shape/prefix convention for notes,
 * one prefix per content type instead of a single mixed one, so each
 * scan (`getRecentReadingEntries` / `getRecentQuizEntries`) stays a
 * simple `startsWith()` check with no per-entry type disambiguation. */
export function readingProgressQuizKey(quizId: string): string {
  return `readingProgress-quiz-${quizId}`;
}

// --- Per-item key builders -------------------------------------------

/** Per-folder scroll-progress record, `{ v: 1, percent, timestamp, scrollY? }` — written by P0-3's lib/readingProgress.ts, read by NotesIndex/RecentlyViewed/dailyGoal/ContinueReading. See lib/readingProgress.ts for the real shape. */
export function readingProgressKey(folder: string): string {
  return `readingProgress-folder-${folder}`;
}

/** Per-section bookmark-star state for one page (T5-3c — reserved here
 * since the shape is already decided, even though no component reads/
 * writes it yet pending the body-prose sections it would attach to). */
export function bookmarksKey(pageId: string): string {
  return `bookmarks-${pageId}`;
}

/** P1-1: per-page highlight state -- an array of `{id, blockId, text,
 * createdAt}` records, one per highlighted span, keyed per note folder.
 * Same "flat array under one per-page key" convention `bookmarksKey`
 * already uses, deliberately separate from it (bookmarking a whole
 * section vs. highlighting a span of text within one are two different
 * real features, per P1-1/P3-2's own dependency split). */
export function highlightsKey(pageId: string): string {
  return `highlights-${pageId}`;
}

/** notes-checklist.js's checked-item state for one page. */
export function checklistStateKey(pageId: string): string {
  return `${pageId}-checklist-state`;
}

/** notes-interview.js's practiced-question state for one page. */
export function interviewStateKey(pageId: string): string {
  return `${pageId}-interview-state`;
}

/** Embedded notes-MCQ answer/bookmark/flag state — same unified schema
 * as a real quiz's saved state (T5-2), but keyed per note folder rather
 * than per quiz file, and deliberately separate from either — answering
 * a note's embedded MCQ shouldn't affect that same JSON opened as a
 * real quiz via "Open as Quiz" (T1-5), and vice versa. */
export function notesMcqProgressKey(folder: string): string {
  return `notes_mcq_progress_${folder}`;
}

/** DSA visual-MCQ's own answer/bookmark/flag state (T5-3b) — same shape
 * as `notesMcqProgressKey`, deliberately separate from it: a note's
 * plain MCQ and its DSA visual MCQ are two independent sections with
 * two independent progress bars, per the same "don't merge two real
 * things that happen to share a shape" reasoning `ContestProblem` vs
 * `LeetCodeProblem` already applies in pages/Note/types.ts. */
export function visualMcqProgressKey(folder: string): string {
  return `visual_mcq_progress_${folder}`;
}

/** quiz-toolbar.js's/useQuizEngine.ts's per-quiz saved-answers state. */
export function quizProgressKey(quizId: string): string {
  return `quiz_progress_${quizId}`;
}

/** quiz-toolbar.js's/useQuizEngine.ts's per-quiz completed-attempt log. */
export function quizHistoryKey(quizId: string): string {
  return `quiz_history_${quizId}`;
}

/** P2-4: Motivational Dashboard widget's shuffle-bag state —
 * `{v:1, queue: number[], lastShownIndex: number|null}`. A shuffled
 * "deck" of message indices is drawn down one-per-mount rather than
 * picking a fresh random index every time, specifically so short-cycle
 * repeats (same message twice in quick succession, or an obviously
 * repeating pattern within a handful of loads) can't happen — see
 * lib/motivationalMessages.ts for the actual draw logic this key
 * backs. */
export const MOTIVATIONAL_MESSAGE_STATE_KEY = 'motivationalMessageState';
