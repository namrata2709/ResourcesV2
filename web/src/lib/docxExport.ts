/**
 * lib/docxExport.ts — E0-1's DOCX adapter.
 *
 * Converts the same `BodyProseBlock[]` shape BodyProse.tsx renders to
 * screen (see pages/Note/types.ts) into a real .docx file via the
 * `docx` library (client-side, no server round-trip -- `Packer.toBlob`
 * runs entirely in-browser). Deliberately mirrors BodyProse.tsx's own
 * `Block`/`renderRunContent` switch statements block-for-block and
 * mark-for-mark, so a block type or inline mark this adapter doesn't
 * know how to render is a case that's missing from BOTH switches, not
 * a silent gap only visible in one of them.
 *
 * Scope, stated plainly:
 *   - Headings, paragraphs, lists (ordered + unordered), tables, code
 *     blocks, callouts, references, takeaways, and YouTube blocks all
 *     convert to real Word structures (Heading styles, a real Table,
 *     real ordered-list numbering, monospace-with-shading code
 *     paragraphs) -- these are E0-1's own manual-test-case list.
 *   - Collapsible sections flatten into a heading + their children,
 *     in order -- Word has no native collapse/expand, so "flattened
 *     but still readable" is the honest behavior, not a missing
 *     feature silently dropped.
 *   - Image blocks render as an italic placeholder line naming the
 *     file + caption, NOT the actual embedded image -- fetching and
 *     embedding real image bytes is real scope this adapter doesn't
 *     attempt yet (flagged here rather than silently left out with no
 *     record, same "flag the boundary" convention this project's
 *     other tickets already use for unconfirmed schemas).
 *   - `code_tabs_raw`/`raw_html` blocks are no-ops here too, matching
 *     BodyProse.tsx's own no-op treatment of both -- neither is this
 *     ticket's content to begin with.
 *   - Highlights/personal notes/bookmark stars are NOT reflected in
 *     the export -- this adapter only ever sees `content.blocks`, the
 *     same plain block list every caller already has before any of
 *     that per-viewer state gets layered on in the browser.
 */

import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IRunOptions,
} from 'docx';
import type { ExportContent, ExportResult } from './exportAs';
import { slugify } from './exportAs';
import type { BodyProseBlock, BodyProseRun } from '../pages/Note/types';

const HEADING_BY_LEVEL: Record<1 | 2 | 3 | 4, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

const CODE_SHADING = { type: ShadingType.CLEAR, fill: 'F1F1F1', color: 'auto' };
const CODE_FONT = 'Consolas';

const CALLOUT_LABEL: Record<'note' | 'important' | 'warning', string> = {
  note: 'Note',
  important: 'Important',
  warning: 'Warning',
};

const CALLOUT_SHADING_FILL: Record<'note' | 'important' | 'warning', string> = {
  note: 'E8F1FC',
  important: 'FDF2E3',
  warning: 'FBE9E9',
};

/** One shared ordered-list numbering definition per exported document,
 * referenced by a unique id per list block so sibling ordered lists
 * each restart at 1 instead of continuing one shared count -- see
 * `orderedListReference` below. */
function orderedListLevelConfig(reference: string) {
  return {
    reference,
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: '%1.',
        alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
    ],
  };
}

/** Mirrors BodyProse.tsx's `renderRunContent` mark-by-mark, producing
 * `docx` TextRun options instead of a React element. `link` is handled
 * separately by the caller (it wraps in ExternalHyperlink, which needs
 * the run built but not yet attached to a Paragraph's children). */
function runOptions(run: BodyProseRun): IRunOptions {
  const base: IRunOptions = { text: run.text };
  switch (run.mark) {
    case 'code':
    case 'kbd':
      return { ...base, font: CODE_FONT, shading: CODE_SHADING };
    case 'bold':
      return { ...base, bold: true };
    case 'underline':
      return { ...base, underline: {} };
    case 'italic':
      return { ...base, italics: true };
    case 'strike':
      return { ...base, strike: true };
    case 'highlight':
      return { ...base, highlight: 'yellow' };
    case 'sup':
      return { ...base, superScript: true };
    case 'sub':
      return { ...base, subScript: true };
    case 'small':
      return { ...base, size: 18 };
    case 'examTerm':
      return { ...base, bold: true, highlight: 'yellow' };
    case 'examSentence':
      return { ...base, italics: true, highlight: 'cyan' };
    default:
      return base;
  }
}

/** Converts one run to a docx child (a TextRun, or an ExternalHyperlink
 * wrapping one for `link`-marked runs) -- the one case `runOptions`
 * itself can't produce since a hyperlink is a different node type, not
 * just different TextRun options. */
function runToChild(run: BodyProseRun) {
  if (run.mark === 'link' && run.url) {
    return new ExternalHyperlink({
      link: run.url,
      children: [new TextRun({ text: run.text, style: 'Hyperlink' })],
    });
  }
  return new TextRun(runOptions(run));
}

function runsToChildren(runs: BodyProseRun[]) {
  return runs.length ? runs.map(runToChild) : [new TextRun('')];
}

/** Plain-text flatten. Table header cells are already plain strings in
 * the schema (see BodyProseTableBlock in types.ts), so `convertBlock`
 * itself never needs this -- exported so this adapter's own test file
 * can flatten a run list for assertions without duplicating the same
 * one-liner there. */
export function plainText(runs: BodyProseRun[]): string {
  return runs.map((r) => r.text).join('');
}

interface ConvertCtx {
  /** Bumped once per ordered-list block encountered, so each gets its
   * own numbering reference and restarts at 1. */
  orderedListCount: number;
  numberingConfigs: ReturnType<typeof orderedListLevelConfig>[];
}

function convertBlock(block: BodyProseBlock, ctx: ConvertCtx): (Paragraph | Table)[] {
  switch (block.type) {
    case 'heading':
      return [
        new Paragraph({
          heading: HEADING_BY_LEVEL[block.level],
          children: runsToChildren(block.text),
        }),
      ];

    case 'paragraph':
      return [new Paragraph({ children: runsToChildren(block.runs) })];

    case 'list': {
      if (!block.ordered) {
        return block.items.map(
          (runs) => new Paragraph({ bullet: { level: 0 }, children: runsToChildren(runs) }),
        );
      }
      const reference = `ordered-list-${ctx.orderedListCount++}`;
      ctx.numberingConfigs.push(orderedListLevelConfig(reference));
      return block.items.map(
        (runs) =>
          new Paragraph({
            numbering: { reference, level: 0 },
            children: runsToChildren(runs),
          }),
      );
    }

    case 'table': {
      const headerRow = new TableRow({
        tableHeader: true,
        children: block.headers.map(
          (h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            }),
        ),
      });
      const bodyRows = block.rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cellRuns) => new TableCell({ children: [new Paragraph({ children: runsToChildren(cellRuns) })] }),
            ),
          }),
      );
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...bodyRows],
        }),
      ];
    }

    case 'code':
      // One Paragraph per line, not a single multi-line run -- `docx`
      // TextRuns don't render embedded "\n" as line breaks on their
      // own, and this keeps each line independently shaded/monospaced
      // the same way BodyProse.tsx's <pre><code> renders the whole
      // block as one visually distinct region.
      return block.code.split('\n').map(
        (line) =>
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [new TextRun({ text: line.length ? line : ' ', font: CODE_FONT, shading: CODE_SHADING })],
          }),
      );

    case 'callout':
      return [
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: CALLOUT_SHADING_FILL[block.kind], color: 'auto' },
          children: [
            new TextRun({ text: `${CALLOUT_LABEL[block.kind]}: `, bold: true }),
            ...runsToChildren(block.runs),
          ],
        }),
      ];

    case 'youtube': {
      const children = [new TextRun({ text: block.title, bold: true })];
      if (block.channel) children.push(new TextRun({ text: `  (${block.channel})`, italics: true }));
      const paragraphs = [
        new Paragraph({
          children: [
            new ExternalHyperlink({ link: block.url, children }),
          ],
        }),
      ];
      if (block.why) paragraphs.push(new Paragraph({ children: [new TextRun({ text: block.why, italics: true })] }));
      return paragraphs;
    }

    case 'references':
      return block.items.map(
        (ref) =>
          new Paragraph({
            bullet: { level: 0 },
            children: [new ExternalHyperlink({ link: ref.url, children: [new TextRun({ text: ref.text, style: 'Hyperlink' })] })],
          }),
      );

    case 'takeaways':
      return [
        new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun('Key Takeaways')] }),
        ...block.items.map((runs) => new Paragraph({ bullet: { level: 0 }, children: runsToChildren(runs) })),
      ];

    case 'image':
      // Placeholder line, not an embedded image -- see file header.
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: block.caption ? `[Image: ${block.filename} — ${block.caption}]` : `[Image: ${block.filename}]`,
              italics: true,
            }),
          ],
        }),
      ];

    case 'collapsible': {
      const heading = new Paragraph({
        heading: block.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        children: [new TextRun(block.heading)],
      });
      const children = block.children.flatMap((child) => convertBlock(child, ctx));
      return [heading, ...children];
    }

    // Matches BodyProse.tsx's own no-op treatment of both -- neither is
    // this ticket's (or the DOCX adapter's) content to expand.
    case 'code_tabs_raw':
    case 'raw_html':
      return [];

    default:
      return [];
  }
}

export async function toDocxBlob(content: ExportContent): Promise<ExportResult> {
  const ctx: ConvertCtx = { orderedListCount: 0, numberingConfigs: [] };
  const body = content.blocks.flatMap((block) => convertBlock(block, ctx));

  const doc = new Document({
    numbering: { config: ctx.numberingConfigs },
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(content.title)] }),
          ...body,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return { blob, filename: `${slugify(content.title)}.docx` };
}
