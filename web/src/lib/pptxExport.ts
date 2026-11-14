/**
 * lib/pptxExport.ts — E1-1's PPT adapter.
 *
 * Scope is set directly by the ticket text: "title + bullets only,
 * explicitly not visual parity" and "not graded against visual match
 * to the on-screen deck." That's the design constraint for every
 * decision below — one real PowerPoint slide per real Slides.tsx
 * slide, each with a title placeholder and a bullet-list body, and
 * nothing else: no images, no per-type layouts, no theme/color
 * matching, no speaker-note rendering as an on-slide element (though
 * real notes DO get attached via `addNotes`, since PowerPoint has a
 * dedicated non-visual notes field for exactly this and it costs
 * nothing extra to carry them across).
 *
 * Built on `pptxgenjs` (the ticket's own named library), only ever
 * dynamically imported (matches lib/exportAs.ts's ADAPTER_LOADERS
 * pattern for the same "don't ship this weight to someone who never
 * exports" reasoning) since it's a meaningfully larger dependency than
 * `docx`/`jszip`.
 *
 * Every real `Slide` type from pages/Slides/types.ts gets a real
 * title+bullets extraction, not just the GENERIC_HTML_TYPES set
 * Slides.tsx itself special-cases for its own richer on-screen
 * rendering — this adapter's whole point is that every slide type
 * reduces to the same flat shape once visual parity is off the table:
 *   - title/objectives/concept/diagram/example/recap/summary/
 *     mistakes/exam-tips/cta/section-divider: extractTitleAndBullets()
 *     on `html` directly (see lib/htmlToBullets.ts).
 *   - comparison: one bullet per column, "Column Title: bullet one;
 *     bullet two" — flattens Slides.tsx's real 2/3+-column layout into
 *     plain text lines, which is exactly what "not visual parity"
 *     licenses here.
 *   - engage: the ENGAGE_LABELS string (matching Slides.tsx's own
 *     labels) as the title, question + options + reveal as bullets.
 *   - stat: "value — label" per stat as a bullet.
 *   - icon-grid: "label" per item as a bullet (the icon glyph itself
 *     is a visual detail, correctly out of scope).
 *   - code: the raw code, one bullet per line — a real, if unstyled,
 *     representation of the content; a monospace font is applied so
 *     it stays legible without attempting syntax highlighting.
 * A slide with genuinely nothing to show (bullets.length === 0 and no
 * title) still gets a slide with just its type as a placeholder title,
 * rather than being silently dropped -- "title + bullets present and
 * correctly ordered" (manual test #2) means slide COUNT and ORDER must
 * match the real deck too, not just content where it exists.
 */

import { triggerDownload } from './exportAs';
import { slugify } from './exportAs';
import { extractTitleAndBullets } from './htmlToBullets';
import type { ComparisonColumn, EngageContent, Slide } from '../pages/Slides/types';

const ENGAGE_LABELS: Record<EngageContent['kind'], string> = {
  think: 'Think About It',
  scenario: 'Scenario',
  poll: 'Quick Poll',
  predict: 'Predict',
  pause: 'Pause & Discuss',
};

const TYPE_FALLBACK_LABEL: Record<Slide['type'], string> = {
  title: 'Title',
  objectives: 'Objectives',
  'section-divider': 'Section',
  concept: 'Concept',
  diagram: 'Diagram',
  example: 'Example',
  engage: 'Engage',
  comparison: 'Comparison',
  stat: 'Stats',
  'icon-grid': 'Overview',
  code: 'Code',
  recap: 'Recap',
  summary: 'Summary',
  mistakes: 'Common Mistakes',
  'exam-tips': 'Exam Tips',
  cta: 'Next Steps',
};

interface SlideContent {
  title: string;
  bullets: string[];
}

function comparisonBullets(columns: ComparisonColumn[]): string[] {
  return columns.map((col) => {
    const bulletText = col.bullets.join('; ');
    return bulletText ? `${col.title}: ${bulletText}` : col.title;
  });
}

function engageContent(engage: EngageContent): SlideContent {
  const bullets = [engage.question, ...engage.options];
  if (engage.reveal) bullets.push(`Reveal: ${engage.reveal}`);
  return { title: ENGAGE_LABELS[engage.kind], bullets: bullets.filter(Boolean) };
}

function resolveSlideContent(slide: Slide): SlideContent {
  if (slide.type === 'engage' && slide.engage) {
    return engageContent(slide.engage);
  }
  if (slide.type === 'comparison' && slide.columns?.length) {
    const { title } = extractTitleAndBullets(slide.html);
    return { title: title ?? TYPE_FALLBACK_LABEL.comparison, bullets: comparisonBullets(slide.columns) };
  }
  if (slide.type === 'stat' && slide.stats?.length) {
    const { title } = extractTitleAndBullets(slide.html);
    return {
      title: title ?? TYPE_FALLBACK_LABEL.stat,
      bullets: slide.stats.map((s) => `${s.value} \u2014 ${s.label}`),
    };
  }
  if (slide.type === 'icon-grid' && slide.icon_items?.length) {
    const { title } = extractTitleAndBullets(slide.html);
    return { title: title ?? TYPE_FALLBACK_LABEL['icon-grid'], bullets: slide.icon_items.map((i) => i.label) };
  }
  if (slide.type === 'code' && slide.code) {
    const { title } = extractTitleAndBullets(slide.html);
    return {
      title: title ?? TYPE_FALLBACK_LABEL.code,
      bullets: slide.code.code.split('\n').filter((line) => line.trim().length > 0),
    };
  }

  const { title, bullets } = extractTitleAndBullets(slide.html);
  return { title: title ?? TYPE_FALLBACK_LABEL[slide.type], bullets };
}

function stripHtmlToText(html: string | null): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Builds a PPTX from `title` + `slides`, downloads it, and resolves.
 * Throws if `slides` is empty -- callers show their own honest
 * "nothing to export" message, same convention every other export
 * path here follows. */
export async function exportSlidesAsPptx(title: string, slides: Slide[]): Promise<void> {
  if (slides.length === 0) {
    throw new Error('This deck has no slides to export.');
  }

  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.title = title;

  for (const slide of slides) {
    const content = resolveSlideContent(slide);
    const pptxSlide = pptx.addSlide();

    pptxSlide.addText(content.title, {
      x: 0.5,
      y: 0.4,
      w: '90%',
      h: 1,
      fontSize: 28,
      bold: true,
    });

    if (content.bullets.length > 0) {
      const isCode = slide.type === 'code';
      pptxSlide.addText(
        content.bullets.map((text, i) => ({
          text,
          options: { bullet: !isCode, breakLine: i < content.bullets.length - 1 },
        })),
        {
          x: 0.5,
          y: 1.6,
          w: '90%',
          h: 4.8,
          fontSize: isCode ? 14 : 18,
          fontFace: isCode ? 'Courier New' : undefined,
          valign: 'top',
        },
      );
    }

    const notes = stripHtmlToText(slide.notes_html);
    if (notes) pptxSlide.addNotes(notes);
  }

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  triggerDownload(blob, `${slugify(title)}.pptx`);
}
