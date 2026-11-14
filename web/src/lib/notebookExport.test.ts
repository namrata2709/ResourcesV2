import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { exportNotebook } from './notebookExport';

const NOTES_INDEX = {
  notes: [
    { title: 'Note One', folder: 'note-one', subject: 'aws', session: null, date: '', lastModified: '', readTimeMinutes: 1, category: '', tags: [], hasImages: false, images: [], files: [] },
    { title: 'Note Two', folder: 'note-two', subject: 'aws', session: null, date: '', lastModified: '', readTimeMinutes: 1, category: '', tags: [], hasImages: false, images: [], files: [] },
    { title: 'Note Three (no content)', folder: 'note-three', subject: 'aws', session: null, date: '', lastModified: '', readTimeMinutes: 1, category: '', tags: [], hasImages: false, images: [], files: [] },
  ],
};

const BODY_PROSE: Record<string, unknown> = {
  'note-one': {
    blocks: [
      { type: 'heading', level: 2, id: 'section-a', text: [{ text: 'Section A', mark: null }] },
      { type: 'paragraph', runs: [{ text: 'Content of note one', mark: null }] },
    ],
  },
  'note-two': { blocks: [{ type: 'paragraph', runs: [{ text: 'Content of note two', mark: null }] }] },
  'note-three': { blocks: [] },
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
  vi.stubGlobal('URL', class extends URL {
    static override createObjectURL = vi.fn(() => 'blob:mock-url');
    static override revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
}

describe('lib/notebookExport', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
    stubDownload();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('includes every note with real content for the "whole" scope, skipping the empty one', async () => {
    const { skipped } = await exportNotebook('whole', 'epub');
    expect(skipped).toEqual(['Note Three (no content)']);
  });

  it('only includes favorited notes for the "favorites" scope', async () => {
    localStorage.setItem('notesFavorites', JSON.stringify(['note-one']));
    let captured = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      captured = this.download;
    });
    await exportNotebook('favorites', 'epub');
    expect(captured).toBe('notebook-buddy-favorites.epub');
  });

  it('throws when the "favorites" scope has no favorited notes', async () => {
    await expect(exportNotebook('favorites', 'epub')).rejects.toThrow();
  });

  it('drops a note from the "bookmarked" scope when its bookmark id matches no real block', async () => {
    localStorage.setItem('bookmarks-note-one', JSON.stringify(['some-nonexistent-section']));
    // note-one's real body-prose has no heading with this id, so
    // revisionFilter drops everything -- nothing qualifies anywhere,
    // so the whole export throws (same "nothing to export" contract as
    // the next test).
    await expect(exportNotebook('bookmarked', 'epub')).rejects.toThrow();
  });

  it('includes only the bookmarked section, real content, when a bookmark id genuinely matches a block', async () => {
    localStorage.setItem('bookmarks-note-one', JSON.stringify(['section-a']));
    let capturedBlob: Blob | null = null;
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = vi.fn((b: Blob) => {
        capturedBlob = b;
        return 'blob:mock-url';
      });
      static override revokeObjectURL = vi.fn();
    });
    const { skipped } = await exportNotebook('bookmarked', 'epub');
    // note-two/note-three never had a bookmark/highlight recorded at
    // all -- they don't qualify for this scope to begin with, which is
    // different from "attempted and produced nothing" (that's what
    // `skipped` tracks; a fetch failure or a real-but-empty filter
    // result). Only note-one, the genuine match, contributes here.
    expect(skipped).toEqual([]);
    expect(capturedBlob).not.toBeNull();
    const zip = await JSZip.loadAsync(await (capturedBlob as unknown as Blob).arrayBuffer());
    const chapter = await zip.file('OEBPS/note-one.xhtml')!.async('string');
    expect(chapter).toContain('Section A');
  });

  it('throws when the "bookmarked" scope has nothing bookmarked or highlighted anywhere', async () => {
    await expect(exportNotebook('bookmarked', 'epub')).rejects.toThrow();
  });

  it('builds a real epub Blob for the epub format', async () => {
    let capturedBlob: Blob | null = null;
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = vi.fn((b: Blob) => {
        capturedBlob = b;
        return 'blob:mock-url';
      });
      static override revokeObjectURL = vi.fn();
    });
    await exportNotebook('whole', 'epub');
    expect(capturedBlob).not.toBeNull();
    const zip = await JSZip.loadAsync(await (capturedBlob as unknown as Blob).arrayBuffer());
    const mimetype = await zip.file('mimetype')!.async('string');
    expect(mimetype).toBe('application/epub+zip');
  });

  it('builds a single flat docx Blob (headings per note, not real chapters) for the docx format', async () => {
    let captured = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      captured = this.download;
    });
    await exportNotebook('whole', 'docx');
    expect(captured).toBe('notebook-buddy-full-notebook.docx');
  });
});
