/**
 * lib/htmlToBullets.ts — E1-1's "title + bullets only" content
 * extraction, shared by lib/pptxExport.ts.
 *
 * E1-1's own ticket text is explicit that this adapter is NOT graded
 * against visual match to the on-screen deck — title + bullet content,
 * present and correctly ordered, is the whole scope. That means this
 * function's job is deliberately narrow: take a slide's rendered
 * `html` (the exact string Slides.tsx already feeds to
 * `dangerouslySetInnerHTML` — see pages/Slides/types.ts's own note that
 * Python pre-renders this to HTML) and pull out (a) the first heading's
 * text as a title, and (b) every list item / paragraph after it as one
 * flat bullet per line — no attempt to preserve nesting, emphasis,
 * links, or any other formatting, since none of that is in scope here.
 *
 * Real, deliberate simplifications, not oversights:
 *   - Nested lists flatten to the same bullet level as their parent —
 *     PowerPoint indentation levels are a visual-parity concern this
 *     ticket explicitly excludes.
 *   - Only text content survives (`textContent`, not innerHTML) — no
 *     bold/italic/links carried into the bullet text.
 *   - If there's no <h1>–<h4> at all, `title` is null and the caller
 *     decides the fallback (see pptxExport.ts's SLIDE_TYPE_LABEL).
 *   - If there are no <li> elements, each top-level <p> becomes its own
 *     bullet line instead — matches how `concept`/`example`/etc. slides
 *     are actually authored (prose paragraphs, not lists) per the
 *     Slides.test.tsx fixtures this was built against.
 */

export interface ExtractedContent {
  title: string | null;
  bullets: string[];
}

const HEADING_SELECTOR = 'h1, h2, h3, h4';

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractTitleAndBullets(html: string | null): ExtractedContent {
  if (!html) return { title: null, bullets: [] };

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const headingEl = doc.body.querySelector(HEADING_SELECTOR);
  const title = headingEl ? cleanText(headingEl.textContent || '') || null : null;
  headingEl?.remove();

  const listItems = Array.from(doc.body.querySelectorAll('li'))
    .map((li) => cleanText(li.textContent || ''))
    .filter(Boolean);

  if (listItems.length > 0) {
    return { title, bullets: listItems };
  }

  const paragraphs = Array.from(doc.body.querySelectorAll('p'))
    .map((p) => cleanText(p.textContent || ''))
    .filter(Boolean);

  if (paragraphs.length > 0) {
    return { title, bullets: paragraphs };
  }

  // No <li>/<p> found (e.g. body is just a bare heading, or unstructured
  // text) — fall back to whatever text remains after the heading is
  // removed, as a single bullet, rather than an empty slide.
  const remaining = cleanText(doc.body.textContent || '');
  return { title, bullets: remaining ? [remaining] : [] };
}
