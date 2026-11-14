import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { toDocxBlob, plainText } from './docxExport';
import type { ExportContent } from './exportAs';
import type { BodyProseBlock, BodyProseRun } from '../pages/Note/types';

const run = (text: string, mark: BodyProseRun['mark'] = null, url?: string): BodyProseRun =>
  url ? { text, mark, url } : { text, mark };

/** Unzips the generated .docx (a real zip archive) and returns
 * `word/document.xml`'s raw text so assertions can check the actual
 * OOXML output, not just that a Blob of some size came back. */
async function documentXml(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const entry = zip.file('word/document.xml');
  expect(entry).not.toBeNull();
  return entry!.async('string');
}

describe('lib/docxExport', () => {
  it('produces a real .docx Blob with the correct filename, slugified from the title', async () => {
    const content: ExportContent = { title: 'AWS Lambda: Deep Dive!', blocks: [] };
    const result = await toDocxBlob(content);
    expect(result.filename).toBe('aws-lambda-deep-dive.docx');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.size).toBeGreaterThan(0);
  });

  it('renders headings, paragraphs, and inline marks into real document.xml text', async () => {
    const blocks: BodyProseBlock[] = [
      { type: 'heading', level: 1, id: 'intro', text: [run('Introduction')] },
      {
        type: 'paragraph',
        runs: [run('This is '), run('bold', 'bold'), run(' and '), run('italic', 'italic'), run(' text.')],
      },
    ];
    const xml = await documentXml((await toDocxBlob({ title: 'Note', blocks })).blob);
    expect(xml).toContain('Introduction');
    expect(xml).toContain('This is ');
    expect(xml).toContain('bold');
    expect(xml).toContain('italic');
  });

  it('renders an unordered list as bullet paragraphs and an ordered list with real numbering', async () => {
    const blocks: BodyProseBlock[] = [
      { type: 'list', ordered: false, items: [[run('First bullet')], [run('Second bullet')]] },
      { type: 'list', ordered: true, items: [[run('Step one')], [run('Step two')]] },
    ];
    const xml = await documentXml((await toDocxBlob({ title: 'Note', blocks })).blob);
    expect(xml).toContain('First bullet');
    expect(xml).toContain('Step one');
    // Real numbering reference, not a "1. " text prefix hack.
    expect(xml).toMatch(/<w:numId w:val="\d+"\/>/);
  });

  it('gives each separate ordered list its own numbering reference so both restart at 1', async () => {
    const blocks: BodyProseBlock[] = [
      { type: 'list', ordered: true, items: [[run('A1')], [run('A2')]] },
      { type: 'paragraph', runs: [run('separator')] },
      { type: 'list', ordered: true, items: [[run('B1')]] },
    ];
    const result = await toDocxBlob({ title: 'Note', blocks });
    const buf = await result.blob.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const numberingXml = await zip.file('word/numbering.xml')!.async('string');
    const xml = await zip.file('word/document.xml')!.async('string');
    // `docx` always emits one internal default bullet numbering
    // definition regardless of content, so the real signal isn't the
    // total num/abstractNum count -- it's that our two ordered-list
    // blocks each got their own decimal-format abstract numbering
    // definition (one per list, not one shared across both).
    expect(numberingXml.match(/<w:numFmt w:val="decimal"\/>/g) || []).toHaveLength(2);

    // 3 list-item paragraphs total (A1, A2, B1), referencing exactly 2
    // distinct numIds -- A1/A2 share one (same list), B1 uses a
    // different one (separate list), proving the two lists don't
    // share one running counter.
    const usedNumIds = [...xml.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map((m) => m[1]);
    expect(usedNumIds).toHaveLength(3);
    expect(new Set(usedNumIds).size).toBe(2);
  });

  it('renders a table with a bold header row and body cells', async () => {
    const blocks: BodyProseBlock[] = [
      {
        type: 'table',
        headers: ['Name', 'Type'],
        rows: [[[run('id')], [run('string')]]],
      },
    ];
    const xml = await documentXml((await toDocxBlob({ title: 'Note', blocks })).blob);
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('Name');
    expect(xml).toContain('id');
    expect(xml).toContain('string');
  });

  it('renders a multi-line code block as one paragraph per line', async () => {
    const blocks: BodyProseBlock[] = [
      { type: 'code', lang: 'python', code: 'def f():\n    return 1' },
    ];
    const xml = await documentXml((await toDocxBlob({ title: 'Note', blocks })).blob);
    expect(xml).toContain('def f():');
    expect(xml).toContain('return 1');
  });

  it('renders a callout with its kind label prefixed', async () => {
    const blocks: BodyProseBlock[] = [
      { type: 'callout', kind: 'warning', runs: [run('Be careful here.')] },
    ];
    const xml = await documentXml((await toDocxBlob({ title: 'Note', blocks })).blob);
    expect(xml).toContain('Warning:');
    expect(xml).toContain('Be careful here.');
  });

  it('flattens a collapsible block into a heading followed by its children, in order', async () => {
    const blocks: BodyProseBlock[] = [
      {
        type: 'collapsible',
        level: 2,
        id: 'more',
        heading: 'Learn more',
        open: false,
        children: [{ type: 'paragraph', runs: [run('Nested content')] }],
      },
    ];
    const xml = await documentXml((await toDocxBlob({ title: 'Note', blocks })).blob);
    expect(xml).toContain('Learn more');
    expect(xml).toContain('Nested content');
  });

  it('renders an image block as a placeholder line naming the file and caption, not an embedded image', async () => {
    const blocks: BodyProseBlock[] = [
      { type: 'image', filename: 'diagram.png', caption: 'System overview' },
    ];
    const xml = await documentXml((await toDocxBlob({ title: 'Note', blocks })).blob);
    expect(xml).toContain('diagram.png');
    expect(xml).toContain('System overview');
    // No embedded image relationship should exist for a placeholder.
    expect(xml).not.toContain('<w:drawing>');
  });

  it('treats code_tabs_raw and raw_html blocks as no-ops, matching BodyProse.tsx', async () => {
    const blocks: BodyProseBlock[] = [
      { type: 'code_tabs_raw' },
      { type: 'raw_html', html: '<div>should not appear</div>' },
      { type: 'paragraph', runs: [run('Still here')] },
    ];
    const xml = await documentXml((await toDocxBlob({ title: 'Note', blocks })).blob);
    expect(xml).not.toContain('should not appear');
    expect(xml).toContain('Still here');
  });

  it('plainText flattens a run list to its concatenated text', () => {
    expect(plainText([run('a'), run('b', 'bold'), run('c')])).toBe('abc');
  });
});
