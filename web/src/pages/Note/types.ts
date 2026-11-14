/**
 * pages/Note/types.ts
 *
 * Note-page module schemas. MCQ deliberately has NO type of its own
 * here — it reuses `QuizData` from `pages/Quiz/types.ts` directly
 * (which itself re-exports `QuestionCard`'s unified `QuizQuestion`
 * shape), per T5-2's schema-unification decision: a note's embedded
 * MCQ JSON and a standalone quiz's JSON are the SAME shape now, so
 * there's nothing to declare twice.
 *
 * Checklist/Glossary/Interview schemas below are NOT confirmed against
 * a real `parse_checklist.py`/`parse_glossary.py`/`parse_interview.py`
 * output — those scripts' JSON shape wasn't available to check directly
 * (unlike MCQ's, which was confirmed against real quiz JSON files).
 * Flagged rather than silently assumed: if the real generator output
 * differs, only the `fetch`/parse call sites in each module component
 * need to change, not the rendering logic itself, since each module
 * already isolates "shape of the JSON" from "how it's displayed".
 */

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface ChecklistData {
  title?: string;
  items: ChecklistItem[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  example?: string;
}

export interface GlossaryData {
  title?: string;
  terms: GlossaryTerm[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  answer: string;
  tips?: string;
}

export interface InterviewData {
  title?: string;
  questions: InterviewQuestion[];
}

/** 'none' | 'highlight' | 'test' — notes-exam.js's real 3-state cycle. */
export type ExamMode = 'none' | 'highlight' | 'test';

export const EXAM_MODE_CYCLE: ExamMode[] = ['none', 'highlight', 'test'];

/**
 * T5-3b schemas below (LeetCode/Contest/YouTube/VisualMcq/Implementation/
 * Visualisation) are NOT confirmed against real `dsa-problems.js`/
 * `dsa-contest.js`/`dsa-page.js`/`dsa-visualisation.js` output or a real
 * per-note JSON file — none of those vanilla sources or a DSA note with
 * this content shipped with what was available to check directly (only
 * `dsa-merge-sort`'s checklist/glossary/interview/mcq JSON exist today).
 * Flagged rather than silently assumed, same convention as the
 * Checklist/Glossary/Interview schemas above: if real generator output
 * differs, only each module's `fetch`/parse call site needs to change,
 * not its rendering logic.
 */

export interface LeetCodeProblem {
  id: string;
  title: string;
  difficulty: string;
  url?: string;
  pattern?: string;
}

export interface LeetCodeData {
  title?: string;
  problems: LeetCodeProblem[];
}

/** Confirmed via T5-3b's own note: `dsa-contest.js` renders cards
 * (`<div class="interview-question">`), not a `<table>` — same shape as
 * `LeetCodeProblem` is fine to reuse since both are "id/title/difficulty
 * (+link)", but kept as its own type since contest problems are a
 * different real-world list than LeetCode's, even if structurally
 * identical today. */
export interface ContestProblem {
  id: string;
  title: string;
  difficulty: string;
  url?: string;
}

export interface ContestData {
  title?: string;
  problems: ContestProblem[];
}

export interface YoutubeVideo {
  id: string;
  title: string;
  url: string;
  channel?: string;
  duration?: string;
}

export interface YoutubeData {
  title?: string;
  videos: YoutubeVideo[];
}

/** DSA visual MCQ's 4 sub-types — each needs the extra code block or
 * image `QuestionCard`'s base option-card doesn't render by default for
 * a plain quiz question, per T5-3b's own note on the `variant`/slot
 * mechanism. */
export type VisualMcqType = 'fillblank' | 'trace' | 'output' | 'spotbug';

/** Reuses `QuestionCard`'s unified `QuizQuestion`/`QuizOption` shape for
 * the question/options themselves (same reasoning T5-2 already applied
 * to notes-mcq.json vs quiz.json) — only adds the two visual-MCQ-only
 * fields on top, via intersection rather than a fork of the whole type. */
export interface VisualMcqQuestion {
  visualType: VisualMcqType;
  /** fillblank/trace/output/spotbug all show a code snippet; kept
   * optional since a future 5th sub-type might attach an image instead
   * (see `image` below) or neither. */
  code?: string;
  /** Alternative to `code` for a sub-type that shows an image instead
   * of/alongside a snippet — resolved via `assetPath`, not `code`'s
   * plain string. */
  image?: string;
}

export interface ImplementationLanguage {
  id: string;
  label: string;
  code: string;
}

export interface ImplementationData {
  languages: ImplementationLanguage[];
}

/** Visualisation panel's Images-vs-Animation toggle (`initTabSwitch()`
 * in vanilla) — `images` is the slideshow fallback, `animationSrc` is
 * the standalone animation HTML page opened in `DsaAnimation`'s iframe
 * (self-contained theming per T1-4, nothing threaded in from here). */
export interface VisualisationData {
  images?: string[];
  animationSrc?: string;
}

/**
 * T5-3a: body-prose.json schema, confirmed directly against
 * generate_notes.py's `extract_body_prose()`/`_extract_blocks()`
 * (T5-2, real code read before building this, per the ticket's own
 * instruction) rather than assumed from the ticket text. Unlike the
 * T5-3b schemas above, this one IS confirmed against real generator
 * source — `tests/test_body_prose_extraction.py`'s fixtures were used
 * to cross-check every block/run shape below field-for-field.
 */

/** Inline-formatting run. Marks are mutually exclusive per run (no
 * nesting) -- mirrors `_extract_runs()`'s flat token-scan output
 * exactly. `examTerm`/`examSentence` are the "exam-highlights" block
 * type named in the ticket -- they're inline marks, not a block of
 * their own (confirmed: no separate "exam-highlight" block type exists
 * in the extractor). */
export type RunMark =
  | null
  | 'code'
  | 'kbd'
  | 'link'
  | 'bold'
  | 'underline'
  | 'italic'
  | 'strike'
  | 'highlight'
  | 'sup'
  | 'sub'
  | 'small'
  | 'examTerm'
  | 'examSentence';

export interface BodyProseRun {
  text: string;
  mark: RunMark;
  /** Only present when mark === 'link'. */
  url?: string;
}

/**
 * P1-1: `generate_notes.py`'s `_extract_blocks()` now stamps every block,
 * at every nesting level, with a stable "blockId" (sequential in
 * document order, shared across the whole recursive walk -- see that
 * function's own docstring). Optional here, not required: older/
 * not-yet-regenerated `body-prose.json` files won't have it, and every
 * existing BodyProse test fixture predates this field -- rather than
 * touching every one of those fixtures, code that anchors a highlight
 * to a block just treats a missing blockId as "not highlightable,"
 * same graceful-degradation convention `heading.id`/`collapsible.id`
 * being nullable already follows for BookmarkStar.
 */
export interface BodyProseHeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4;
  id: string | null;
  text: BodyProseRun[];
  blockId?: string;
}

export interface BodyProseParagraphBlock {
  type: 'paragraph';
  runs: BodyProseRun[];
  blockId?: string;
}

export interface BodyProseListBlock {
  type: 'list';
  ordered: boolean;
  items: BodyProseRun[][];
  blockId?: string;
}

export interface BodyProseTableBlock {
  type: 'table';
  /** Header cells are plain strings (not runs) -- confirmed:
   * `_extract_blocks()`'s table-header branch uses `parse_table_row()`
   * directly, only BODY rows go through `_extract_runs()`. */
  headers: string[];
  rows: BodyProseRun[][][];
  blockId?: string;
}

export interface BodyProseCodeBlock {
  type: 'code';
  lang: string;
  code: string;
  blockId?: string;
}

export interface BodyProseCalloutBlock {
  type: 'callout';
  kind: 'note' | 'important' | 'warning';
  runs: BodyProseRun[];
  blockId?: string;
}

export interface BodyProseYoutubeBlock {
  type: 'youtube';
  title: string;
  channel: string;
  url: string;
  level: string;
  why: string;
  blockId?: string;
}

export interface BodyProseReferencesBlock {
  type: 'references';
  items: { text: string; url: string }[];
  blockId?: string;
}

export interface BodyProseTakeawaysBlock {
  type: 'takeaways';
  items: BodyProseRun[][];
  blockId?: string;
}

/** The ticket's "image-prompts" block type -- resolved (see
 * generate_notes.py's own comment right above `extract_body_prose()`)
 * to the reader-facing `[image:file|caption]` inline syntax, NOT the
 * trainer-only `[image-prompts]` block, which never reaches a reader
 * and isn't part of this JSON at all. */
export interface BodyProseImageBlock {
  type: 'image';
  filename: string;
  caption: string;
  blockId?: string;
}

/** <code-tabs> is explicitly T5-3b's territory (DSA code-language
 * tabs) -- captured here only opaquely so its position isn't silently
 * dropped. Rendered as a no-op by BodyProse; ImplementationModule
 * already covers the real DSA code-tabs experience separately. */
export interface BodyProseCodeTabsRawBlock {
  type: 'code_tabs_raw';
  blockId?: string;
}

/** Hand-authored/injected raw HTML lines the extractor doesn't parse
 * further (e.g. DSA visualisation markup). Rendered as a no-op by
 * BodyProse -- same reasoning as `code_tabs_raw`, this is a different
 * ticket's content, not silently dropped from the JSON, just not
 * expanded into markup here. */
export interface BodyProseRawHtmlBlock {
  type: 'raw_html';
  html: string;
  blockId?: string;
}

export interface BodyProseCollapsibleBlock {
  type: 'collapsible';
  level: 2 | 3;
  id: string;
  heading: string;
  open: boolean;
  children: BodyProseBlock[];
  blockId?: string;
}

export type BodyProseBlock =
  | BodyProseHeadingBlock
  | BodyProseParagraphBlock
  | BodyProseListBlock
  | BodyProseTableBlock
  | BodyProseCodeBlock
  | BodyProseCalloutBlock
  | BodyProseYoutubeBlock
  | BodyProseReferencesBlock
  | BodyProseTakeawaysBlock
  | BodyProseImageBlock
  | BodyProseCodeTabsRawBlock
  | BodyProseRawHtmlBlock
  | BodyProseCollapsibleBlock;

export interface BodyProseData {
  blocks: BodyProseBlock[];
}
