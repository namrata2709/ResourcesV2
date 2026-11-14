/**
 * lib/epubExport.ts — E0-2's EPUB adapter.
 *
 * Same role as lib/docxExport.ts (E0-1's DOCX adapter) but for the
 * `epub` format: converts the same `{ title, blocks }` ExportContent
 * shape into a real, single-chapter .epub via lib/bodyProseToXhtml.ts +
 * lib/epubBook.ts. Registered into exportAs.ts's ADAPTER_LOADERS below
 * exactly the way that file's own header comment describes -- a
 * dynamic import, so the `jszip` weight this pulls in only loads for
 * someone who actually clicks an EPUB export.
 */

import type { ExportContent, ExportResult } from './exportAs';
import { slugify } from './exportAs';
import { blocksToXhtml } from './bodyProseToXhtml';
import { buildEpub, escapeXml } from './epubBook';

export async function toEpubBlob(content: ExportContent): Promise<ExportResult> {
  const blob = await buildEpub({
    title: content.title,
    chapters: [
      {
        id: content.title,
        title: content.title,
        bodyHtml: `<h1>${escapeXml(content.title)}</h1>\n${blocksToXhtml(content.blocks)}`,
      },
    ],
  });
  return { blob, filename: `${slugify(content.title)}.epub` };
}
