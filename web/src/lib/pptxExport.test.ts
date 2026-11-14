import { describe, it, expect, vi, afterEach } from 'vitest';
import JSZip from 'jszip';
import { exportSlidesAsPptx } from './pptxExport';
import type { Slide } from '../pages/Slides/types';

function stubDownload() {
  let capturedBlob: Blob | null = null;
  let capturedName = '';
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = vi.fn((b: Blob) => {
        capturedBlob = b;
        return 'blob:mock-url';
      });
      static override revokeObjectURL = vi.fn();
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    capturedName = this.download;
  });
  return { getBlob: () => capturedBlob, getName: () => capturedName };
}

/** pptxgenjs's Blob output is itself a real zip (OOXML) — reuse jszip
 * to inspect [Content_Types].xml and the real slide XML the way
 * epubBook.test.ts inspects EPUB internals, rather than trusting a
 * non-empty Blob alone. */
async function loadPptxEntries(blob: Blob) {
  const buf = await blob.arrayBuffer();
  return JSZip.loadAsync(buf);
}

describe('lib/pptxExport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('throws for an empty deck', async () => {
    await expect(exportSlidesAsPptx('Empty Deck', [])).rejects.toThrow();
  });

  it('produces a real, valid OOXML (zip) Blob with one slide per real Slide, named from the slugified title', async () => {
    const slides: Slide[] = [
      { type: 'title', index: 1, html: '<h1>Welcome</h1>', images: [], notes_html: null },
      { type: 'concept', index: 2, html: '<h2>Idea</h2><p>Body text</p>', images: [], notes_html: null },
    ];
    const { getBlob, getName } = stubDownload();
    await exportSlidesAsPptx('AWS Lambda: Deep Dive', slides);

    expect(getName()).toBe('aws-lambda-deep-dive.pptx');
    const zip = await loadPptxEntries(getBlob()!);
    const contentTypes = await zip.file('[Content_Types].xml')!.async('string');
    expect(contentTypes).toContain('presentationml');

    const slideFiles = Object.keys(zip.files).filter((f) => /ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slideFiles.length).toBe(2);
  });

  it('extracts real title + bullet text onto the slide XML for a generic slide', async () => {
    const slides: Slide[] = [
      {
        type: 'concept',
        index: 1,
        html: '<h2>Key Idea</h2><ul><li>First point</li><li>Second point</li></ul>',
        images: [],
        notes_html: null,
      },
    ];
    const { getBlob } = stubDownload();
    await exportSlidesAsPptx('Deck', slides);
    const zip = await loadPptxEntries(getBlob()!);
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain('Key Idea');
    expect(xml).toContain('First point');
    expect(xml).toContain('Second point');
  });

  it('flattens comparison columns into readable bullet lines', async () => {
    const slides: Slide[] = [
      {
        type: 'comparison',
        index: 1,
        html: '<h2>On-Demand vs Spot</h2>',
        images: [],
        notes_html: null,
        columns: [
          { title: 'On-Demand', bullets: ['No commitment', 'Higher cost'] },
          { title: 'Spot', bullets: ['Lower cost', 'Can be interrupted'] },
        ],
      },
    ];
    const { getBlob } = stubDownload();
    await exportSlidesAsPptx('Deck', slides);
    const zip = await loadPptxEntries(getBlob()!);
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain('On-Demand vs Spot');
    expect(xml).toContain('No commitment');
    expect(xml).toContain('Lower cost');
  });

  it('renders an engage slide using its real label, question, and options', async () => {
    const slides: Slide[] = [
      {
        type: 'engage',
        index: 1,
        html: null,
        images: [],
        notes_html: null,
        engage: { kind: 'poll', question: 'Which is cheapest?', options: ['On-Demand', 'Spot', 'Reserved'], reveal: 'Spot' },
      },
    ];
    const { getBlob } = stubDownload();
    await exportSlidesAsPptx('Deck', slides);
    const zip = await loadPptxEntries(getBlob()!);
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain('Quick Poll');
    expect(xml).toContain('Which is cheapest?');
    expect(xml).toContain('Reserved');
    expect(xml).toContain('Reveal: Spot');
  });

  it('renders stat slides as "value — label" bullets', async () => {
    const slides: Slide[] = [
      {
        type: 'stat',
        index: 1,
        html: null,
        images: [],
        notes_html: null,
        stats: [{ value: '99.9%', label: 'Uptime SLA' }],
      },
    ];
    const { getBlob } = stubDownload();
    await exportSlidesAsPptx('Deck', slides);
    const zip = await loadPptxEntries(getBlob()!);
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain('99.9%');
    expect(xml).toContain('Uptime SLA');
  });

  it('renders code slides as one line per code line, in a monospace-tagged run', async () => {
    const slides: Slide[] = [
      {
        type: 'code',
        index: 1,
        html: '<h2>Example</h2>',
        images: [],
        notes_html: null,
        code: { lang: 'js', code: 'const x = 1;\nconsole.log(x);' },
      },
    ];
    const { getBlob } = stubDownload();
    await exportSlidesAsPptx('Deck', slides);
    const zip = await loadPptxEntries(getBlob()!);
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain('const x = 1;');
    expect(xml).toContain('console.log(x);');
  });

  it('still emits a placeholder-titled slide when a slide has no extractable content, preserving slide count/order', async () => {
    const slides: Slide[] = [
      { type: 'title', index: 1, html: '<h1>First</h1>', images: [], notes_html: null },
      { type: 'diagram', index: 2, html: null, images: [], notes_html: null },
      { type: 'recap', index: 3, html: '<h1>Third</h1>', images: [], notes_html: null },
    ];
    const { getBlob } = stubDownload();
    await exportSlidesAsPptx('Deck', slides);
    const zip = await loadPptxEntries(getBlob()!);
    const slideFiles = Object.keys(zip.files).filter((f) => /ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slideFiles.length).toBe(3);
    const middle = await zip.file('ppt/slides/slide2.xml')!.async('string');
    expect(middle).toContain('Diagram');
  });

  it('attaches real speaker notes via addNotes when notes_html is present', async () => {
    const slides: Slide[] = [
      {
        type: 'title',
        index: 1,
        html: '<h1>Welcome</h1>',
        images: [],
        notes_html: '<p>Greet the audience warmly.</p>',
      },
    ];
    const { getBlob } = stubDownload();
    await exportSlidesAsPptx('Deck', slides);
    const zip = await loadPptxEntries(getBlob()!);
    const notesFiles = Object.keys(zip.files).filter((f) => /ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f));
    expect(notesFiles.length).toBe(1);
    const notesXml = await zip.file(notesFiles[0])!.async('string');
    expect(notesXml).toContain('Greet the audience warmly.');
  });
});
