/**
 * components/QuestionCard/types.ts — the question/option/explanation
 * shape QuestionCard renders, relocated here (T5-3a) from
 * pages/Quiz/types.ts now that QuestionCard has a second real consumer.
 *
 * This is exactly T5-2's unified schema: quiz.json and notes-mcq.json
 * both now write this same per-option shape (`isCorrect` +
 * `explanation.why` on every option, not just the correct one) — so a
 * single JSON file is valid input to both the standalone Quiz page and
 * a note's embedded MCQ module without any adapter in between. Quiz's
 * own session-only types (QuizData, QuizSavedState, QuizHistoryEntry —
 * things about an *attempt*, not about a *question*) stay in
 * pages/Quiz/types.ts, which re-exports these for backward
 * compatibility with its existing imports.
 */

import type { ReactNode } from 'react';

export interface LearnMoreLink {
  title: string;
  url: string;
}

/**
 * `explanation` intentionally allows arbitrary extra string/string[]
 * fields beyond the known ones (`_renderExplanationInner` in
 * quiz-engine.js explicitly walks `Object.entries(exp)` for any field
 * not in its known list and renders it too, humanizing the key as a
 * label) — the index signature here mirrors that "anything goes"
 * behavior instead of hard-coding a fixed field list that would silently
 * drop a field vanilla would have rendered.
 */
export interface QuizExplanation {
  summary?: string;
  why?: string;
  learnMore?: LearnMoreLink[];
  keyPoints?: string[];
  examples?: string[];
  analogy?: string;
  comparison?: string;
  keyDistinction?: string;
  confusion?: string;
  identification?: string;
  performanceImpact?: string;
  additionalInfo?: string;
  // Any other field content authors add — rendered generically, matching
  // quiz-engine.js's own fallback loop.
  [key: string]: string | string[] | LearnMoreLink[] | undefined;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: QuizExplanation;
}

export interface QuizQuestion {
  id: number;
  question: string;
  multiSelect?: boolean;
  evaluationStatus?: string;
  difficulty?: string;
  options: QuizOption[];
  /** Assigned client-side after shuffling — not present in the raw JSON. */
  displayNumber?: number;
}

/**
 * `variant`/slot mechanism for QuestionCard's non-plain-quiz consumers —
 * built here for T5-3b's visual MCQ (DSA, 4 sub-types: fillblank/trace/
 * output/spotbug), each of which needs an extra code block or image the
 * base option-card doesn't render by default. Deliberately a slot
 * (`ReactNode`) rather than baking "code" and "image" fields into this
 * component directly — QuestionCard still doesn't need to know what a
 * visual-MCQ sub-type IS, same "generic over the caller's shape"
 * principle `Table`/`List` already follow. Optional and defaults to no
 * slot at all, so the plain-quiz and notes-MCQ consumers (which pass
 * neither) are unaffected.
 */
export interface QuestionCardVariantProps {
  /** Rendered once, between the question text and the option list —
   * e.g. visual MCQ's code snippet or image. */
  extraContent?: ReactNode;
}
