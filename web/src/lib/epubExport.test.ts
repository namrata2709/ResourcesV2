import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { toEpubBlob } from './epubExport';
import type { ExportContent } from './exportAs';
import type { BodyProseBlock, BodyProseRun } from '../pages/Note/types';

const run = (text: string, mark: BodyProseRun['mark'] = null): BodyProseRun => ({ text, mark });

async function chapterXhtml(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const entries = zip.file(/OEBPS\/.*\.xhtml/).filter((f) => f.name !== 'OEBPS/nav.xhtml');
  const entry = entries[0];
  expect(entry).toBeTruthy();
  return entry!.async('string');
}

describe('lib/epubExport', () => {
  it('produces a real .epub Blob with the correct filename, slugified from the title', async () => {
    const content: ExportContent = { title: 'AWS Lambda: Deep Dive!', blocks: [] };
    const result = await toEpubBlob(content);
    expect(result.filename).toBe('aws-lambda-deep-dive.epub');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.size).toBeGreaterThan(0);
  });

  it('renders the note title as an h1 and blocks as real XHTML content', async () => {
    const blocks: BodyProseBlock[] = [
      { type: 'heading', level: 1, id: 'intro', text: [run('Introduction')] },
      { type: 'paragraph', runs: [run('This is '), run('bold', 'bold'), run(' text.')] },
    ];
    const result = await toEpubBlob({ title: 'My Note', blocks });
    const xhtml = await chapterXhtml(result.blob);
    expect(xhtml).toContain('<h1>My Note</h1>');
    expect(xhtml).toContain('Introduction');
    expect(xhtml).toContain('<strong>bold</strong>');
  });

  it('is a valid zip with the mimetype entry present and uncompressed', async () => {
    const result = await toEpubBlob({ title: 'Note', blocks: [] });
    const buf = await result.blob.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const mimetype = await zip.file('mimetype')!.async('string');
    expect(mimetype).toBe('application/epub+zip');
  });
});
