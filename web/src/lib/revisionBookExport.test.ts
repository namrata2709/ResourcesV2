import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { exportRevisionBook } from './revisionBookExport';

const NOTES_INDEX = {
  notes: [
    { title: 'Favorited Note', folder: 'favorited-note', subject: 'aws', session: null, date: '', lastModified: '', readTimeMinutes: 1, category: '', tags: [], hasImages: false, images: [], files: [] },
    { title: 'Highlighted Note', folder: 'highlighted-note', subject: 'aws', session: null, date: '', lastModified: '', readTimeMinutes: 1, category: '', tags: [], hasImages: false, images: [], files: [] },
    { title: 'Untouched Note', folder: 'untouched-note', subject: 'aws', session: null, date: '', lastModified: '', readTimeMinutes: 1, category: '', tags: [], hasImages: false, images: [], files: [] },
  ],
};

const BODY_PROSE: Record<string, unknown> = {
  'favorited-note': {
    blocks: [
      { type: 'paragraph', runs: [{ text: 'Section not bookmarked', mark: null }] },
      { type: 'paragraph', runs: [{ text: 'Full favorited content', mark: null }] },
    ],
  },
  'highlighted-note': {
    blocks: [
      { type: 'paragraph', runs: [{ text: 'Highlighted sentence here', mark: null }], blockId: 'hn-block-1' },
      { type: 'paragraph', runs: [{ text: 'Never highlighted paragraph', mark: null }], blockId: 'hn-block-2' },
    ],
  },
  'untouched-note': {
    blocks: [{ type: 'paragraph', runs: [{ text: 'Nothing special here', mark: null }] }],
  },
};

function mockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/data/index/notes-index.json') {
        return Promise.resolve({ ok: true, json: async () => NOTES_INDEX });
      }
      const match = url.match(/\/data\/notes\/([^/]+)\/json\/body-prose\.json/);
      if (match) {
        const folder = match[1];
        if (BODY_PROSE[folder]) return Promise.resolve({ ok: true, json: async () => BODY_PROSE[folder] });
        return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
      }
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
    }),
  );
}

function stubDownload() {
  let capturedBlob: Blob | null = null;
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
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return () => capturedBlob;
}

describe('lib/revisionBookExport', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('throws when nothing is favorited, highlighted, or bookmarked anywhere', async () => {
    await expect(exportRevisionBook()).rejects.toThrow();
  });

  it('includes a favorited note in FULL, even though nothing in it is individually bookmarked', async () => {
    localStorage.setItem('notesFavorites', JSON.stringify(['favorited-note']));
    const getBlob = stubDownload();
    await exportRevisionBook();
    const zip = await JSZip.loadAsync(await getBlob()!.arrayBuffer());
    const chapter = await zip.file('OEBPS/favorited-note.xhtml')!.async('string');
    expect(chapter).toContain('Section not bookmarked');
    expect(chapter).toContain('Full favorited content');
  });

  it('includes only the highlighted section of a non-favorited note', async () => {
    localStorage.setItem(
      'highlights-highlighted-note',
      JSON.stringify([{ id: 'h1', blockId: 'hn-block-1', text: 'Highlighted sentence here', createdAt: 1 }]),
    );
    const getBlob = stubDownload();
    await exportRevisionBook();
    const zip = await JSZip.loadAsync(await getBlob()!.arrayBuffer());
    const chapter = await zip.file('OEBPS/highlighted-note.xhtml')!.async('string');
    expect(chapter).toContain('Highlighted sentence here');
    expect(chapter).not.toContain('Never highlighted paragraph');
  });

  it('excludes a note with neither a favorite, a highlight, nor a bookmark', async () => {
    localStorage.setItem('notesFavorites', JSON.stringify(['favorited-note']));
    const getBlob = stubDownload();
    await exportRevisionBook();
    const zip = await JSZip.loadAsync(await getBlob()!.arrayBuffer());
    expect(zip.file('OEBPS/untouched-note.xhtml')).toBeNull();
  });

  it('combines all three real sources correctly: favorite in full, highlight filtered, untouched excluded', async () => {
    localStorage.setItem('notesFavorites', JSON.stringify(['favorited-note']));
    localStorage.setItem(
      'highlights-highlighted-note',
      JSON.stringify([{ id: 'h1', blockId: 'hn-block-1', text: 'Highlighted sentence here', createdAt: 1 }]),
    );
    const getBlob = stubDownload();
    await exportRevisionBook();
    const zip = await JSZip.loadAsync(await getBlob()!.arrayBuffer());

    expect(zip.file('OEBPS/favorited-note.xhtml')).not.toBeNull();
    expect(zip.file('OEBPS/highlighted-note.xhtml')).not.toBeNull();
    expect(zip.file('OEBPS/untouched-note.xhtml')).toBeNull();

    const opf = await zip.file('OEBPS/content.opf')!.async('string');
    expect(opf).toContain('<dc:title>Notebook Buddy — Revision Book</dc:title>');
  });
});
