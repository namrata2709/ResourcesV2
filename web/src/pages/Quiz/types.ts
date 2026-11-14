/**
 * Quiz/types.ts — quiz-session-specific types (an attempt's saved
 * state, its history log). The question/option/explanation shape
 * itself (mirrors the real quiz JSON schema, confirmed directly against
 * the uploaded sample files) moved to components/QuestionCard/types.ts
 * as of T5-3a, since notes-mcq now shares the identical shape
 * (T5-2's unified schema) — re-exported below so every existing import
 * of `LearnMoreLink`/`QuizExplanation`/`QuizOption`/`QuizQuestion` from
 * this file keeps working unchanged.
 */

import type { QuizQuestion } from '../../components/QuestionCard/types';

export type { LearnMoreLink, QuizExplanation, QuizOption, QuizQuestion } from '../../components/QuestionCard/types';

export interface QuizData {
  title: string;
  topic: string;
  questions: QuizQuestion[];
}

/**
 * One completed-attempt record persisted to `quiz_history_<quizFile>` by
 * quiz-toolbar.js's `_recordAttempt()` — schema confirmed against real
 * source (T5-1). `passed` uses the same 70% threshold ScoreSummary.tsx
 * already displays ("You need 70% to pass"), not a separately-guessed
 * number.
 */
export interface QuizHistoryEntry {
  date: string; // ISOString
  score: number;
  total: number;
  pct: number;
  timeSeconds: number;
  passed: boolean;
}

/** The shape persisted to `quiz_progress_<quizFile>` by `_saveState()` — see QuizIndex.tsx's own confirmed note on this same shape. */
export interface QuizSavedState {
  selectedAnswers: Record<number, string | string[]>;
  answeredQuestions: Record<number, true>;
  bookmarks: Record<number, true>;
  flags: Record<number, 'confusing' | 'incorrect'>;
  ratings: Record<number, 'got-it' | 'still-learning'>;
  questionOrder: number[];
  optionOrder: Record<number, string[]>;
  elapsedSeconds: number;
  studyMode: boolean;
  savedAt: number;
}
