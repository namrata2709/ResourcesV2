/**
 * types.ts — the real shape of `json/slides.json`, matching
 * `utils/parse_slides.py`'s `write_slides_json()` output exactly
 * (confirmed directly against `parse_slide()`/`render_slide_section()`
 * in that file, not guessed).
 *
 * Per-type structured fields (`engage`/`columns`/`stats`/`icon_items`/
 * `code`) exist on the real JSON today, but rendering them is T5-4b
 * (comparison, regular nav) and T5-4c (engage) scope — this file types
 * the whole shape now so those tickets don't need a second pass here,
 * even though T5-4a's own shell only reads `html`/`type`/`index`.
 */

export type SlideType =
  | 'title'
  | 'objectives'
  | 'section-divider'
  | 'concept'
  | 'diagram'
  | 'example'
  | 'engage'
  | 'comparison'
  | 'stat'
  | 'icon-grid'
  | 'code'
  | 'recap'
  | 'summary'
  // Video Slides mode only — generic rendering, same as concept/example/etc.
  | 'mistakes'
  | 'exam-tips'
  | 'cta';

export interface SlideImage {
  index: number;
  concept: string;
  caption: string | null;
}

export interface EngageContent {
  kind: 'think' | 'scenario' | 'poll' | 'predict' | 'pause';
  question: string;
  options: string[];
  reveal: string | null;
}

export interface ComparisonColumn {
  title: string;
  bullets: string[];
}

export interface StatItem {
  value: string;
  label: string;
}

export interface IconGridItem {
  icon: string;
  label: string;
}

export interface CodeBlock {
  lang: string;
  code: string;
}

export interface Slide {
  type: SlideType;
  /** 1-based, matches `data-index` on the vanilla `<section class="slide">`. */
  index: number;
  /** Rendered inner HTML for the slide's plain-text body. `null` for
   * `engage` slides (their content lives entirely in `engage` instead). */
  html: string | null;
  images: SlideImage[];
  notes_html: string | null;
  engage?: EngageContent | null;
  columns?: ComparisonColumn[];
  stats?: StatItem[];
  icon_items?: IconGridItem[];
  code?: CodeBlock;
}

export interface SlidesData {
  slides: Slide[];
}
