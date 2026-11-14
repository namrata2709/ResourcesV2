/**
 * lib/exportAs.ts — E0-1's shared export entry point.
 *
 * One `exportAs(content, format)` call, so later formats (E0-2's EPUB,
 * E1-1's PPTX) plug into the same "produce a Blob + filename, then
 * trigger a browser download" mechanism instead of each format
 * hand-rolling its own version of that. This file owns ONLY the
 * shared contract + the download step; it knows nothing about how any
 * particular format is actually generated -- that's each adapter's
 * job (see lib/docxExport.ts for the one real adapter today).
 *
 * `content` is deliberately the same `{ title, blocks }` shape
 * BodyProseModule already fetches/renders (see pages/Note/types.ts's
 * `BodyProseBlock`) -- exporting a note is "take the blocks already on
 * screen, feed them to a different renderer," not a second content
 * pipeline to keep in sync with the first.
 */

import type { BodyProseBlock } from '../pages/Note/types';

export type ExportFormat = 'docx' | 'epub';

export interface ExportContent {
  title: string;
  blocks: BodyProseBlock[];
}

export interface ExportResult {
  blob: Blob;
  filename: string;
}

type ExportAdapter = (content: ExportContent) => Promise<ExportResult>;

/** One entry per supported format, each a dynamic import rather than a
 * static one -- the `docx` library (and whatever E0-2/E1-1 eventually
 * pull in for EPUB/PPTX) is real weight that only the person actually
 * clicking "export" should ever pay for. Vite code-splits each of
 * these into its own chunk, loaded on first use, so the Note page's
 * normal render (no export happening) doesn't grow because export
 * exists. `exportAs` itself never needs to change when a new format's
 * key lands here. */
const ADAPTER_LOADERS: Record<ExportFormat, () => Promise<ExportAdapter>> = {
  docx: async () => (await import('./docxExport')).toDocxBlob,
  epub: async () => (await import('./epubExport')).toEpubBlob,
};

/** Slugifies a title into a filesystem-safe filename stem. Same
 * convention T5-3c-6's highlight-export ticket already establishes for
 * its own download filename ("slugified `document.title`"), reused
 * here rather than inventing a second slugify rule. */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'export';
}

/** Exported so the multi-chapter export paths that don't go through
 * `exportAs()` itself (notebookExport.ts / quizBookExport.ts /
 * revisionBookExport.ts -- each builds its own Blob directly via
 * lib/epubBook.ts rather than the single-content `ExportContent` shape
 * this function's own adapters expect) can still reuse the one real
 * "trigger a browser download" step instead of a second copy of it. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Generates `content` as `format` and triggers a browser download.
 * Rejects if the underlying adapter fails (e.g. the `docx` library
 * throws on malformed input) -- callers are expected to catch and
 * surface a notification, the same pattern every other async action
 * in pages/Note already follows (see Note.tsx's copyLink/exportHighlights).
 */
export async function exportAs(content: ExportContent, format: ExportFormat): Promise<void> {
  const loadAdapter = ADAPTER_LOADERS[format];
  const adapter = await loadAdapter();
  const { blob, filename } = await adapter(content);
  triggerDownload(blob, filename);
}
