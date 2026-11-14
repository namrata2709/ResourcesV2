import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import type { QuizData, QuizQuestion, QuizOption, QuizSavedState, QuizHistoryEntry } from './types';
import { dataPath } from '../../lib/siteConfig';
import { quizProgressKey, quizHistoryKey } from '../../lib/storageKeys';
import { writeQuizOpened } from '../../lib/readingProgress';

export type QuizStatus = 'loading' | 'error' | 'resume-pending' | 'ready';

/**
 * mulberry32 — small, fast, deterministic PRNG. Used only when a
 * `seed`/trivia-mode URL param is present (see the "Share this
 * sequence" QR action in Quiz.tsx); Math.random() otherwise, so the
 * default per-browser-random shuffle behavior is completely unchanged
 * when no seed is supplied.
 */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministically hashes a seed string (e.g. from `?seed=482`) to a 32-bit int. */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Builds the RNG used for a given load: a seeded mulberry32 stream if
 * `seed` is provided (so every browser session that opens the same
 * `?seed=` link derives the identical sequence of "random" draws, and
 * therefore the identical question + option order below), otherwise
 * plain Math.random — the existing per-browser-random behavior,
 * unchanged.
 */
function makeRng(seed: string | null | undefined): () => number {
  return seed ? mulberry32(hashSeed(seed)) : Math.random;
}

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildOptionOrder(questions: QuizQuestion[], rng: () => number = Math.random): Record<number, string[]> {
  const order: Record<number, string[]> = {};
  for (const q of questions) {
    order[q.id] = shuffle(q.options.map((o) => o.id), rng);
  }
  return order;
}

// storageKey/historyKey now delegate to lib/storageKeys.ts's
// quizProgressKey/quizHistoryKey (T5-3a) — same exact string shape as
// before ('quiz_progress_<id>' / 'quiz_history_<id>'), kept as
// same-named local wrappers so every call site below is unchanged.
function storageKey(quizId: string): string {
  return quizProgressKey(quizId);
}

function loadSavedState(quizId: string): QuizSavedState | null {
  try {
    const raw = localStorage.getItem(storageKey(quizId));
    return raw ? (JSON.parse(raw) as QuizSavedState) : null;
  } catch {
    return null;
  }
}

// Attempt history — quiz-toolbar.js's `_recordAttempt`/`_loadHistory`,
// key format `quiz_history_${quizFile}`, capped at 20 entries (oldest
// dropped). Separate from `quiz_progress_<quizFile>` (the in-progress
// save/resume state) — history only ever grows on completion, progress
// is overwritten continuously.
const MAX_HISTORY_ENTRIES = 20;
const PASS_THRESHOLD_PCT = 70; // matches ScoreSummary.tsx's existing "You need 70% to pass" copy

function historyKey(quizId: string): string {
  return quizHistoryKey(quizId);
}

function loadHistory(quizId: string): QuizHistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyKey(quizId));
    return raw ? (JSON.parse(raw) as QuizHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(quizId: string, entries: QuizHistoryEntry[]): void {
  try {
    localStorage.setItem(historyKey(quizId), JSON.stringify(entries));
  } catch {
    // matches quiz-engine.js's own silent-fail storage pattern
  }
}

/**
 * useQuizEngine — load, shuffle, answer, score, timer, save/resume,
 * bookmarks, flags, and attempt history. Bookmarks/flags moved from refs
 * to real state this turn so the toolbar/per-question UI can react to
 * them — they were already round-tripped through save/load before, just
 * not mutable from the UI yet. Trivia-mode/`seed` support landed this
 * turn (see below).
 *
 * Attempt history (`quiz_history_<quizFile>`, quiz-toolbar.js's
 * `_recordAttempt`/`_loadHistory`) IS built here — corrected this turn
 * after an earlier pass incorrectly lumped it in with weak-areas-by-
 * category as both "blocked on a schema change." Only weak-areas needs
 * `quiz.json`'s `questions[].category` field (T5-2/PY-1, explicitly
 * dropped from scope 2026-07-26, not just deferred); history only needs
 * data this hook already has (score/total/time), so there was never a
 * real blocker. `ratings`/`studyMode` stay refs for now since nothing
 * reads them reactively yet.
 *
 * `seed` (optional) — the trivia-mode fixed-sequence value from the
 * `?seed=` URL param (see Quiz.tsx's "Share this sequence" QR action).
 * When present, every shuffle this hook performs (initial load, retry,
 * start-fresh) draws from a seeded PRNG instead of Math.random, so two
 * separate browser sessions opening the same `?seed=` link land on the
 * identical question + option order. Omitting it leaves the existing
 * per-browser random shuffle completely unchanged. A resumed
 * in-progress attempt always replays its own saved order regardless of
 * `seed` — continuity of existing progress wins there, same as today.
 *
 * `source` (T1-5, "Open as Quiz"): defaults to the standalone-quiz path
 * (`/data/quiz/<quizId>.json`, unchanged). When `'notes'`, `quizId` is
 * treated as a note *folder* instead of a registered quiz file, and the
 * fetch targets that note's embedded MCQ JSON
 * (`/data/notes/<folder>/json/mcq.json`) instead — the same unified
 * schema (T5-2), just a different file on disk. No `quiz-index.json`
 * registration is needed either way: this hook always fetches a single
 * JSON file directly by id/folder, it never reads the index.
 * `quizProgressKey`/`quizHistoryKey` still key off the raw `quizId`
 * (here, the folder), which is exactly why this stays independent of
 * `notesMcqProgressKey`'s own separate `notes_mcq_progress_<folder>`
 * entry — same folder, two different key prefixes, two different
 * attempts, by design.
 */
export function useQuizEngine(quizId: string | undefined, seed?: string | null, source?: 'notes') {
  const { announce } = useLiveRegion();
  const [status, setStatus] = useState<QuizStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [optionOrder, setOptionOrder] = useState<Record<number, string[]>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string | string[]>>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, true>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedForResume, setSavedForResume] = useState<QuizSavedState | null>(null);
  const [bookmarks, setBookmarks] = useState<Record<number, true>>({});
  const [flags, setFlags] = useState<Record<number, 'confusing' | 'incorrect'>>({});
  const [ratings, setRatings] = useState<Record<number, 'got-it' | 'still-learning'>>({});
  const [studyMode, setStudyMode] = useState(false);
  const [history, setHistory] = useState<QuizHistoryEntry[]>([]);

  const timerStartedRef = useRef(false);
  const skipNextAutosaveRef = useRef(false);
  // Guards against recording a second attempt on re-renders while
  // isComplete stays true — only the transition into completeness
  // records, not every render after it.
  const attemptRecordedRef = useRef(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest-value refs so save/timer callbacks don't need to be
  // re-created (and the interval re-armed) on every state change.
  const latest = useRef({ questions, optionOrder, selectedAnswers, answeredQuestions, elapsedSeconds, bookmarks, flags, ratings, studyMode });
  latest.current = { questions, optionOrder, selectedAnswers, answeredQuestions, elapsedSeconds, bookmarks, flags, ratings, studyMode };

  const saveState = useCallback(() => {
    if (!quizId) return;
    try {
      const s: QuizSavedState = {
        selectedAnswers: latest.current.selectedAnswers,
        answeredQuestions: latest.current.answeredQuestions,
        bookmarks: latest.current.bookmarks,
        flags: latest.current.flags,
        ratings: latest.current.ratings,
        questionOrder: latest.current.questions.map((q) => q.id),
        optionOrder: latest.current.optionOrder,
        elapsedSeconds: latest.current.elapsedSeconds,
        studyMode: latest.current.studyMode,
        savedAt: Date.now(),
      };
      localStorage.setItem(storageKey(quizId), JSON.stringify(s));
    } catch {
      // matches quiz-engine.js's own silent-fail storage pattern
    }
  }, [quizId]);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) return;
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((s) => {
        const next = s + 1;
        if (next % 10 === 0) saveState();
        return next;
      });
    }, 1000);
  }, [saveState]);

  useEffect(() => stopTimer, [stopTimer]);

  // ── Load ──
  useEffect(() => {
    if (!quizId) return;
    let cancelled = false;

    setStatus('loading');
    setError(null);

    const url =
      source === 'notes' ? dataPath('notes', quizId, 'json', 'mcq.json') : dataPath('quiz', `${quizId}.json`);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load: ${quizId}.json`);
        return res.json();
      })
      .then((json: QuizData) => {
        if (cancelled) return;
        setData(json);
        setHistory(loadHistory(quizId));
        attemptRecordedRef.current = false;

        // P0-5: mark this quiz as "recently opened" so RecentlyViewed can
        // interleave it alongside notes. Standalone opens only
        // (`source !== 'notes'`) — a note's embedded "Open as Quiz" reuses
        // the same folder `quizId`, but that folder is already tracked via
        // the note's own readingProgressKey (P0-3); marking it again here
        // under `readingProgress-quiz-<folder>` too would just duplicate
        // the same note in the merged list under two different entries.
        if (source !== 'notes') {
          writeQuizOpened(quizId);
        }

        const saved = loadSavedState(quizId);
        if (saved && Object.keys(saved.answeredQuestions || {}).length > 0) {
          setSavedForResume(saved);
          setStatus('resume-pending');
          return;
        }

        const rng = makeRng(seed);
        const shuffled = shuffle(json.questions, rng);
        shuffled.forEach((q, i) => (q.displayNumber = i + 1));
        skipNextAutosaveRef.current = true;
        setQuestions(shuffled);
        setOptionOrder(buildOptionOrder(shuffled, rng));
        setSelectedAnswers({});
        setAnsweredQuestions({});
        setElapsedSeconds(0);
        setBookmarks({});
        setFlags({});
        setRatings({});
        setStudyMode(false);
        setStatus('ready');
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [quizId, seed, source]);

  const resumeContinue = useCallback(() => {
    if (!data || !savedForResume) return;
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    const ordered: QuizQuestion[] = [];
    const seen = new Set<number>();
    for (const id of savedForResume.questionOrder) {
      const q = byId.get(id);
      if (q) {
        ordered.push(q);
        seen.add(id);
      }
    }
    for (const q of data.questions) {
      if (!seen.has(q.id)) ordered.push(q);
    }
    ordered.forEach((q, i) => (q.displayNumber = i + 1));

    skipNextAutosaveRef.current = true;
    setQuestions(ordered);
    setOptionOrder(savedForResume.optionOrder || {});
    setSelectedAnswers(savedForResume.selectedAnswers || {});
    setAnsweredQuestions(savedForResume.answeredQuestions || {});
    setElapsedSeconds(savedForResume.elapsedSeconds || 0);
    setBookmarks(savedForResume.bookmarks || {});
    setFlags(savedForResume.flags || {});
    setRatings(savedForResume.ratings || {});
    setStudyMode(savedForResume.studyMode || false);

    const answeredCount = Object.keys(savedForResume.answeredQuestions || {}).length;
    if (answeredCount < ordered.length && answeredCount > 0) {
      timerStartedRef.current = true;
      startTimer();
    }

    setSavedForResume(null);
    setStatus('ready');
  }, [data, savedForResume, startTimer]);

  const resumeStartFresh = useCallback(() => {
    if (!quizId || !data) return;
    try {
      localStorage.removeItem(storageKey(quizId));
    } catch {
      // ignore
    }
    const rng = makeRng(seed);
    const shuffled = shuffle(data.questions, rng);
    shuffled.forEach((q, i) => (q.displayNumber = i + 1));
    skipNextAutosaveRef.current = true;
    attemptRecordedRef.current = false;
    setQuestions(shuffled);
    setOptionOrder(buildOptionOrder(shuffled, rng));
    setSelectedAnswers({});
    setAnsweredQuestions({});
    setElapsedSeconds(0);
    setBookmarks({});
    setFlags({});
    setRatings({});
    setStudyMode(false);
    setSavedForResume(null);
    setStatus('ready');
  }, [quizId, data, seed]);

  const getOrderedOptions = useCallback(
    (q: QuizQuestion): QuizOption[] => {
      const order = optionOrder[q.id];
      if (!order) return q.options;
      const byId = new Map(q.options.map((o) => [o.id, o]));
      return order.map((id) => byId.get(id)).filter((o): o is QuizOption => !!o);
    },
    [optionOrder],
  );

  const getCorrectCount = useCallback(
    (qid: number): number => {
      const q = questions.find((q) => q.id === qid);
      return q ? q.options.filter((o) => o.isCorrect).length : 1;
    },
    [questions],
  );

  const isQuestionCorrect = useCallback(
    (qid: number): boolean => {
      const q = questions.find((q) => q.id === qid);
      if (!q) return false;
      const selected = selectedAnswers[qid];
      const correct = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      if (q.multiSelect) {
        return (
          Array.isArray(selected) &&
          correct.length === selected.length &&
          correct.every((id) => (selected as string[]).includes(id))
        );
      }
      return correct.includes(selected as string);
    },
    [questions, selectedAnswers],
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2200);
  }, []);

  const selectOption = useCallback(
    (qid: number, optId: string, isMulti: boolean) => {
      if (!timerStartedRef.current) {
        timerStartedRef.current = true;
        startTimer();
      }

      if (isMulti) {
        const need = getCorrectCount(qid);
        setSelectedAnswers((prev) => {
          const arr = Array.isArray(prev[qid]) ? [...(prev[qid] as string[])] : [];
          const idx = arr.indexOf(optId);
          if (idx > -1) {
            arr.splice(idx, 1);
            setAnsweredQuestions((a) => {
              const next = { ...a };
              delete next[qid];
              return next;
            });
          } else {
            if (arr.length >= need) {
              const labels = ['', 'one', 'two', 'three', 'four'];
              showToast(`You can only select ${labels[need] ?? need} answer${need > 1 ? 's' : ''} for this question.`);
              return prev;
            }
            arr.push(optId);
            if (arr.length === need) {
              setAnsweredQuestions((a) => ({ ...a, [qid]: true }));
            }
          }
          return { ...prev, [qid]: arr };
        });
      } else {
        setSelectedAnswers((prev) => ({ ...prev, [qid]: optId }));
        setAnsweredQuestions((a) => ({ ...a, [qid]: true }));
      }
    },
    [getCorrectCount, showToast, startTimer],
  );

  const resetQuestion = useCallback((qid: number) => {
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
    setAnsweredQuestions((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  }, []);

  const retry = useCallback(() => {
    if (!quizId) return;
    try {
      localStorage.removeItem(storageKey(quizId));
    } catch {
      // ignore
    }
    stopTimer();
    timerStartedRef.current = false;
    skipNextAutosaveRef.current = true;
    attemptRecordedRef.current = false;
    if (data) {
      const rng = makeRng(seed);
      const shuffled = shuffle(data.questions, rng);
      shuffled.forEach((q, i) => (q.displayNumber = i + 1));
      setQuestions(shuffled);
      setOptionOrder(buildOptionOrder(shuffled, rng));
    }
    setSelectedAnswers({});
    setAnsweredQuestions({});
    setElapsedSeconds(0);
    setBookmarks({});
    setFlags({});
    setRatings({});
    setStudyMode(false);
  }, [quizId, data, seed, stopTimer]);

  const toggleBookmark = useCallback((qid: number) => {
    setBookmarks((prev) => {
      const next = { ...prev };
      if (next[qid]) delete next[qid];
      else next[qid] = true;
      return next;
    });
  }, []);

  const FLAG_CYCLE: Array<'confusing' | 'incorrect' | undefined> = [undefined, 'confusing', 'incorrect'];
  const FLAG_MESSAGES: Record<'confusing' | 'incorrect' | 'removed', string> = {
    confusing: 'Flagged as confusing',
    incorrect: 'Flagged as incorrect',
    removed: 'Flag removed',
  };

  // Mirrors quiz-toolbar.js's real _cycleFlag(): each transition
  // (null -> confusing -> incorrect -> null) fires both a toast and a
  // live-region announcement, since this is an accessibility-relevant
  // state change, not just a visual one.
  const cycleFlag = useCallback(
    (qid: number) => {
      setFlags((prev) => {
        const current = prev[qid];
        const idx = FLAG_CYCLE.indexOf(current);
        const next = FLAG_CYCLE[(idx + 1) % FLAG_CYCLE.length];
        const copy = { ...prev };
        if (next) copy[qid] = next;
        else delete copy[qid];

        const message = FLAG_MESSAGES[next ?? 'removed'];
        showToast(message);
        announce(message);

        return copy;
      });
    },
    [announce, showToast],
  );

  const setRating = useCallback((qid: number, rating: 'got-it' | 'still-learning') => {
    setRatings((prev) => {
      const next = { ...prev };
      if (next[qid] === rating) delete next[qid];
      else next[qid] = rating;
      return next;
    });
  }, []);

  // Mirrors quiz-toolbar.js's study-mode toggle: turning it on is
  // immediate; turning it off after any question has been answered
  // requires confirmation (it resets every answer, since study mode's
  // whole point is unlocked practice — leaving it on would carry
  // unlocked-mode answers into the "real" locked-mode flow).
  const toggleStudyMode = useCallback(() => {
    setStudyMode((current) => {
      if (current) {
        const hasAnswers = Object.keys(latest.current.answeredQuestions).length > 0;
        if (hasAnswers) {
          const confirmed = window.confirm(
            'Exit study mode? This will reset all answers so you can take the quiz properly.',
          );
          if (!confirmed) return current;
          setSelectedAnswers({});
          setAnsweredQuestions({});
          setRatings({});
        }
        return false;
      }
      return true;
    });
  }, []);

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answeredQuestions).length;
  const correctCount = Object.keys(answeredQuestions).filter((id) => isQuestionCorrect(Number(id))).length;
  const isComplete = totalQuestions > 0 && answeredCount === totalQuestions;

  // Autosave on every answer change, and stop the timer the moment the
  // quiz is complete — mirrors _updateAll()'s completion check in
  // quiz-engine.js. Skips the one render right after a (re)initialization
  // transition (fresh load, resume, start-fresh, retry) — those already
  // reflect exactly what should be persisted (or, for start-fresh,
  // nothing at all), so autosaving again immediately after would either
  // be redundant or actively wrong (resurrecting a just-cleared save).
  useEffect(() => {
    if (status !== 'ready') return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    saveState();
    if (isComplete) stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnswers, answeredQuestions, bookmarks, flags, ratings, studyMode]);

  // Attempt history — records once per completion (quiz-toolbar.js's
  // `_recordAttempt`), not on every re-render while isComplete stays
  // true. attemptRecordedRef is reset on fresh load, retry, and
  // start-fresh, so a subsequent completion of the same quizId records
  // a new entry rather than being silently skipped.
  useEffect(() => {
    if (!quizId || !isComplete || attemptRecordedRef.current) return;
    attemptRecordedRef.current = true;

    const pct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const entry: QuizHistoryEntry = {
      date: new Date().toISOString(),
      score: correctCount,
      total: totalQuestions,
      pct,
      timeSeconds: latest.current.elapsedSeconds,
      passed: pct >= PASS_THRESHOLD_PCT,
    };

    setHistory((prev) => {
      const next = [...prev, entry].slice(-MAX_HISTORY_ENTRIES);
      saveHistory(quizId, next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, isComplete, correctCount, totalQuestions]);

  return {
    status,
    error,
    title: data?.title ?? null,
    topic: data?.topic ?? null,
    questions,
    selectedAnswers,
    answeredQuestions,
    elapsedSeconds,
    toastMessage,
    savedForResume,
    totalQuestions,
    answeredCount,
    correctCount,
    isComplete,
    bookmarks,
    flags,
    ratings,
    studyMode,
    history,
    selectOption,
    resetQuestion,
    resumeContinue,
    resumeStartFresh,
    retry,
    isQuestionCorrect,
    getOrderedOptions,
    getCorrectCount,
    toggleBookmark,
    cycleFlag,
    setRating,
    toggleStudyMode,
  };
}

export type UseQuizEngineResult = ReturnType<typeof useQuizEngine>;
