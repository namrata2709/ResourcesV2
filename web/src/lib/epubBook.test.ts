import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildEpub, escapeXml } from './epubBook';

async function loadEntries(blob: Blob) {
  const buf = await blob.arrayBuffer();
  return JSZip.loadAsync(buf);
}

describe('lib/epubBook', () => {
  it('throws for a book with zero chapters', async () => {
    await expect(buildEpub({ title: 'Empty', chapters: [] })).rejects.toThrow();
  });

  it('produces a real zip Blob with mimetype as the first, stored (uncompressed) entry', async () => {
    const blob = await buildEpub({
      title: 'Test Book',
      chapters: [{ id: 'ch1', title: 'Chapter One', bodyHtml: '<p>Hello</p>' }],
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);

    const zip = await loadEntries(blob);
    const mimetypeEntry = zip.file('mimetype');
    expect(mimetypeEntry).not.toBeNull();
    const mimetype = await mimetypeEntry!.async('string');
    expect(mimetype).toBe('application/epub+zip');
  });

  it('includes container.xml pointing at the real package document', async () => {
    const blob = await buildEpub({
      title: 'Test Book',
      chapters: [{ id: 'ch1', title: 'Chapter One', bodyHtml: '<p>Hello</p>' }],
    });
    const zip = await loadEntries(blob);
    const container = await zip.file('META-INF/container.xml')!.async('string');
    expect(container).toContain('OEBPS/content.opf');
  });

  it('lists every chapter in the manifest and spine, in order', async () => {
    const blob = await buildEpub({
      title: 'Multi',
      chapters: [
        { id: 'first-note', title: 'First Note', bodyHtml: '<p>A</p>' },
        { id: 'second-note', title: 'Second Note', bodyHtml: '<p>B</p>' },
      ],
    });
    const zip = await loadEntries(blob);
    const opf = await zip.file('OEBPS/content.opf')!.async('string');
    expect(opf).toContain('first-note.xhtml');
    expect(opf).toContain('second-note.xhtml');
    const firstIndex = opf.indexOf('first-note.xhtml');
    const secondIndex = opf.indexOf('second-note.xhtml');
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeGreaterThan(firstIndex);

    const chapterFile = await zip.file('OEBPS/first-note.xhtml')!.async('string');
    expect(chapterFile).toContain('<p>A</p>');
  });

  it('writes a real nav.xhtml and toc.ncx listing every chapter title', async () => {
    const blob = await buildEpub({
      title: 'Nav Test',
      chapters: [{ id: 'ch1', title: 'Introduction to AWS', bodyHtml: '<p>x</p>' }],
    });
    const zip = await loadEntries(blob);
    const nav = await zip.file('OEBPS/nav.xhtml')!.async('string');
    expect(nav).toContain('Introduction to AWS');
    const ncx = await zip.file('OEBPS/toc.ncx')!.async('string');
    expect(ncx).toContain('Introduction to AWS');
  });

  it('escapes XML-sensitive characters in titles', async () => {
    const blob = await buildEpub({
      title: 'A & B <Title>',
      chapters: [{ id: 'ch1', title: 'Q&A "quoted"', bodyHtml: '<p>x</p>' }],
    });
    const zip = await loadEntries(blob);
    const opf = await zip.file('OEBPS/content.opf')!.async('string');
    expect(opf).toContain('A &amp; B &lt;Title&gt;');
    expect(opf).not.toContain('A & B <Title>');
  });

  it('gives duplicate/unsafe chapter ids distinct, slugified filenames', async () => {
    const blob = await buildEpub({
      title: 'Slug Test',
      chapters: [{ id: 'AWS Lambda: Deep Dive!', title: 'Lambda', bodyHtml: '<p>x</p>' }],
    });
    const zip = await loadEntries(blob);
    expect(zip.file('OEBPS/aws-lambda-deep-dive.xhtml')).not.toBeNull();
  });
});

describe('lib/epubBook escapeXml', () => {
  it('escapes all five XML-sensitive characters', () => {
    expect(escapeXml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &apos;');
  });
});
