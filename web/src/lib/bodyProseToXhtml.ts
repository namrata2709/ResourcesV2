/**
 * lib/bodyProseToXhtml.ts — shared BodyProseBlock[] → XHTML renderer,
 * used by both epubExport.ts (single note) and revisionBookExport.ts
 * (filtered blocks per note). Deliberately mirrors lib/docxExport.ts's
 * `convertBlock` switch block-for-block and lib/docxExport.ts's
 * `runOptions` mark-for-mark, so a block/mark type missing here is
 * missing from BOTH adapters at once, not a silent gap only visible in
 * one -- same discipline that file's own header comment establishes.
 *
 * Scope matches lib/docxExport.ts's documented boundary exactly:
 *   - Collapsible sections flatten into a heading + children, in order
 *     -- same "no native collapse" reasoning; EPUB's XHTML could use a
 *     real <details> element, but not every real e-reader's XHTML
 *     renderer supports it reliably, so flattening (guaranteed to
 *     render everywhere) is the honest choice here too, matching DOCX
 *     rather than diverging format-by-format for the same content.
 *   - Image blocks render as an italic placeholder line, not an
 *     embedded image -- see lib/epubBook.ts's header comment.
 *   - `code_tabs_raw`/`raw_html` are no-ops, matching BodyProse.tsx's
 *     own treatment of both.
 *   - Highlights/personal notes/bookmark stars are not reflected here
 *     either -- this only ever sees the block list itself. (Revision
 *     Book's caller-side filtering, via revisionFilter.ts, decides
 *     which blocks reach this function in the first place -- once a
 *     block gets here, it renders the same as any other block.)
 */

import { escapeXml } from './epubBook';
import type { BodyProseBlock, BodyProseRun } from '../pages/Note/types';

const CALLOUT_LABEL: Record<'note' | 'important' | 'warning', string> = {
  note: 'Note',
  important: 'Important',
  warning: 'Warning',
};

/** Mirrors docxExport.ts's `runOptions` mark-for-mark, producing an
 * inline XHTML tag wrap instead of a `docx` TextRun option object. */
function runToXhtml(run: BodyProseRun): string {
  const text = escapeXml(run.text);
  switch (run.mark) {
    case 'code':
    case 'kbd':
      return `<code>${text}</code>`;
    case 'bold':
      return `<strong>${text}</strong>`;
    case 'underline':
      return `<span style="text-decoration: underline;">${text}</span>`;
    case 'italic':
      return `<em>${text}</em>`;
    case 'strike':
      return `<s>${text}</s>`;
    case 'highlight':
      return `<mark>${text}</mark>`;
    case 'sup':
      return `<sup>${text}</sup>`;
    case 'sub':
      return `<sub>${text}</sub>`;
    case 'small':
      return `<small>${text}</small>`;
    case 'examTerm':
      return `<strong><mark>${text}</mark></strong>`;
    case 'examSentence':
      return `<em style="background: #d9f4ff;">${text}</em>`;
    case 'link':
      return run.url
        ? `<a href="${escapeXml(run.url)}">${text}</a>`
        : text;
    default:
      return text;
  }
}

function runsToXhtml(runs: BodyProseRun[]): string {
  return runs.length ? runs.map(runToXhtml).join('') : '';
}

const HEADING_TAG: Record<1 | 2 | 3 | 4, string> = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' };

export function convertBlockToXhtml(block: BodyProseBlock): string {
  switch (block.type) {
    case 'heading': {
      const tag = HEADING_TAG[block.level];
      const idAttr = block.id ? ` id="${escapeXml(block.id)}"` : '';
      return `<${tag}${idAttr}>${runsToXhtml(block.text)}</${tag}>`;
    }

    case 'paragraph':
      return `<p>${runsToXhtml(block.runs)}</p>`;

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items.map((runs) => `<li>${runsToXhtml(runs)}</li>`).join('\n');
      return `<${tag}>\n${items}\n</${tag}>`;
    }

    case 'table': {
      const headerRow = `<tr>${block.headers.map((h) => `<th>${escapeXml(h)}</th>`).join('')}</tr>`;
      const bodyRows = block.rows
        .map((row) => `<tr>${row.map((cellRuns) => `<td>${runsToXhtml(cellRuns)}</td>`).join('')}</tr>`)
        .join('\n');
      return `<table>\n<thead>${headerRow}</thead>\n<tbody>\n${bodyRows}\n</tbody>\n</table>`;
    }

    case 'code':
      return `<pre><code>${escapeXml(block.code)}</code></pre>`;

    case 'callout':
      return `<div class="callout"><strong>${CALLOUT_LABEL[block.kind]}: </strong>${runsToXhtml(block.runs)}</div>`;

    case 'youtube': {
      const channel = block.channel ? ` (${escapeXml(block.channel)})` : '';
      const why = block.why ? `<p><em>${escapeXml(block.why)}</em></p>` : '';
      return `<p><a href="${escapeXml(block.url)}"><strong>${escapeXml(block.title)}</strong></a>${channel}</p>${why}`;
    }

    case 'references': {
      const items = block.items
        .map((ref) => `<li><a href="${escapeXml(ref.url)}">${escapeXml(ref.text)}</a></li>`)
        .join('\n');
      return `<ul>\n${items}\n</ul>`;
    }

    case 'takeaways': {
      const items = block.items.map((runs) => `<li>${runsToXhtml(runs)}</li>`).join('\n');
      return `<h4>Key Takeaways</h4>\n<ul>\n${items}\n</ul>`;
    }

    case 'image': {
      const caption = block.caption ? ` — ${escapeXml(block.caption)}` : '';
      return `<p><em>[Image: ${escapeXml(block.filename)}${caption}]</em></p>`;
    }

    case 'collapsible': {
      const tag = block.level === 2 ? 'h2' : 'h3';
      const children = block.children.map(convertBlockToXhtml).join('\n');
      return `<${tag} id="${escapeXml(block.id)}">${escapeXml(block.heading)}</${tag}>\n${children}`;
    }

    // Matches BodyProse.tsx's own no-op treatment of both.
    case 'code_tabs_raw':
    case 'raw_html':
      return '';

    default:
      return '';
  }
}

export function blocksToXhtml(blocks: BodyProseBlock[]): string {
  return blocks.map(convertBlockToXhtml).join('\n');
}
