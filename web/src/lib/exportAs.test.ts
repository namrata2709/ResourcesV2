import { describe, it, expect, vi, afterEach } from 'vitest';
import { exportAs, slugify } from './exportAs';
import type { ExportContent } from './exportAs';

describe('lib/exportAs', () => {
  describe('slugify', () => {
    it('lowercases, replaces non-alphanumerics with hyphens, and trims edge hyphens', () => {
      expect(slugify('AWS Lambda: Deep Dive!')).toBe('aws-lambda-deep-dive');
    });

    it('falls back to "export" for a title with no alphanumeric characters', () => {
      expect(slugify('!!!')).toBe('export');
    });
  });

  describe('exportAs', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    // jsdom doesn't implement URL.createObjectURL/revokeObjectURL at
    // all, and other DOM internals (e.g. an anchor's href setter)
    // genuinely need `new URL(...)` to keep working -- so this stubs
    // a real URL subclass with the two extra static methods added,
    // rather than replacing the global with a plain object (which
    // breaks anything relying on URL still being constructable).
    function stubObjectUrl(createObjectURL: () => string, revokeObjectURL = vi.fn()) {
      class StubURL extends URL {
        static override createObjectURL = createObjectURL;
        static override revokeObjectURL = revokeObjectURL;
      }
      vi.stubGlobal('URL', StubURL);
      return { revokeObjectURL };
    }

    it('triggers a browser download via an anchor click, then revokes the object URL', async () => {
      const createObjectURL = vi.fn(() => 'blob:mock-url');
      const { revokeObjectURL } = stubObjectUrl(createObjectURL);

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const content: ExportContent = { title: 'My Note', blocks: [] };
      await exportAs(content, 'docx');

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('names the downloaded file from the slugified title with the format extension', async () => {
      stubObjectUrl(() => 'blob:mock-url');
      let capturedDownloadName = '';
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        capturedDownloadName = this.download;
      });

      await exportAs({ title: 'Two Words', blocks: [] }, 'docx');
      expect(capturedDownloadName).toBe('two-words.docx');
    });

    it('E0-2: supports the epub format via the same shared download step', async () => {
      stubObjectUrl(() => 'blob:mock-url');
      let capturedDownloadName = '';
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        capturedDownloadName = this.download;
      });

      await exportAs({ title: 'Two Words', blocks: [] }, 'epub');
      expect(capturedDownloadName).toBe('two-words.epub');
    });
  });
});
