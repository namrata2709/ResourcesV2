/**
 * lib/epubBook.ts — E0-2's low-level EPUB assembler.
 *
 * The one real thing every E0-2 export path needs (single-note EPUB via
 * epubExport.ts, whole-notebook/favorites/bookmarked via
 * notebookExport.ts, Quiz Book via quizBookExport.ts, Revision Book via
 * revisionBookExport.ts) is "take N chapters of pre-rendered XHTML and
 * produce a real, valid .epub Blob" — so that assembly step lives here
 * exactly once, same "one shared implementation, not five copies that
 * could drift" discipline lib/bookmarks.ts and lib/highlights.ts already
 * established for their own callers. Every caller above is responsible
 * for producing well-formed XHTML strings; this file knows nothing about
 * BodyProseBlock, QuizQuestion, or any other content shape — only how to
 * package chapters into a spec-valid container.
 *
 * EPUB is a zip archive with a fixed, non-negotiable structure (EPUB 3.2 /
 * OCF spec):
 *   - `mimetype` — first entry, STORED (not deflated), exact bytes
 *     `application/epub+zip`, no trailing newline. Getting this wrong is
 *     the single most common reason an otherwise-valid EPUB fails to
 *     open in real readers.
 *   - `META-INF/container.xml` — points readers at the real package
 *     document.
 *   - `OEBPS/content.opf` — the package document: metadata, manifest
 *     (every file in the book), spine (reading order).
 *   - `OEBPS/nav.xhtml` — EPUB3's real navigation document (also doubles
 *     as a rendered table-of-contents page).
 *   - `OEBPS/toc.ncx` — EPUB2 nav fallback, included alongside nav.xhtml
 *     since some real readers (older Kindle-family software in
 *     particular) still expect it even in an EPUB3 package.
 *   - `OEBPS/styles.css` — one shared stylesheet so page-break rules
 *     (Quiz Book's question→answer-key split) and basic readability
 *     styling don't have to be repeated inline in every chapter.
 *   - `OEBPS/chapter-N.xhtml` — one file per chapter, in spine order.
 *
 * No images are embedded by any E0-2 export path — same documented
 * scope boundary lib/docxExport.ts already draws for its own image
 * blocks (placeholder text, not real embedded bytes) and the same
 * reasoning applies here: fetching and packaging real image bytes into
 * the EPUB's manifest is a real, separate piece of scope no caller above
 * attempts yet. Flagged here rather than silently left unmentioned.
 * Nothing in body-prose's schema is SVG (see pages/Note/types.ts's
 * BodyProseImageBlock — a filename + caption, never inline SVG markup),
 * so E0-1's original "SVG → PNG" caution doesn't apply to any content
 * this pipeline actually produces; noted so a future caller doesn't
 * assume a conversion step is missing.
 */

import JSZip from 'jszip';
import { slugify } from './exportAs';

export interface EpubChapter {
  /** Used as both the chapter's manifest id and its filename stem —
   * must be unique within one book and safe as an XML id (so callers
   * should pass something already slug-shaped, e.g. a note folder or
   * `question-index-string`, not raw display text). */
  id: string;
  /** Rendered in the nav/TOC entry for this chapter. */
  title: string;
  /** Full well-formed XHTML for the chapter's <body> content — the
   * caller owns turning its own content shape into markup; this file
   * only wraps it in a valid XHTML document. */
  bodyHtml: string;
}

export interface EpubBook {
  title: string;
  /** Defaults to a generic attribution matching every other export
   * path's un-authored-content convention -- an EPUB's dc:creator is
   * required by the OPF spec, so this can't just be omitted. */
  author?: string;
  chapters: EpubChapter[];
}

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;

const STYLES_CSS = `
body { font-family: serif; line-height: 1.5; margin: 1em; }
h1, h2, h3, h4 { font-family: sans-serif; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #999; padding: 0.4em; text-align: left; }
pre { background: #f1f1f1; padding: 0.6em; overflow-x: auto; }
code { font-family: monospace; }
.callout { border-left: 4px solid #888; padding: 0.5em 0.8em; margin: 1em 0; background: #f4f4f4; }
.page-break { page-break-before: always; break-before: page; }
.answer-correct { font-weight: bold; }
`.trim();

export function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function chapterFilename(chapter: EpubChapter, index: number): string {
  const stem = slugify(chapter.id) || `chapter-${index + 1}`;
  return `${stem}.xhtml`;
}

function chapterXhtml(chapter: EpubChapter): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${chapter.bodyHtml}
</body>
</html>
`;
}

function navXhtml(book: EpubBook, filenames: string[]): string {
  const items = book.chapters
    .map((ch, i) => `      <li><a href="${filenames[i]}">${escapeXml(ch.title)}</a></li>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(book.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${escapeXml(book.title)}</h1>
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>
`;
}

function tocNcx(book: EpubBook, uid: string, filenames: string[]): string {
  const navPoints = book.chapters
    .map(
      (ch, i) => `    <navPoint id="navpoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="${filenames[i]}"/>
    </navPoint>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(uid)}"/>
  </head>
  <docTitle><text>${escapeXml(book.title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>
`;
}

function contentOpf(book: EpubBook, uid: string, filenames: string[]): string {
  const manifestItems = book.chapters
    .map((_, i) => `    <item id="chapter-${i + 1}" href="${filenames[i]}" media-type="application/xhtml+xml"/>`)
    .join('\n');
  const spineItems = book.chapters.map((_, i) => `    <itemref idref="chapter-${i + 1}"/>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeXml(uid)}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>
    <dc:creator>${escapeXml(book.author ?? 'Notebook Buddy')}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>
`;
}

/** Assembles `book` into a real, spec-valid .epub Blob. Throws if
 * `book.chapters` is empty -- an EPUB with an empty spine isn't a
 * meaningfully different failure mode than any other malformed input,
 * so this doesn't special-case it; callers (notebookExport.ts /
 * revisionBookExport.ts in particular, since their chapter lists are
 * data-dependent) are expected to check for an empty result themselves
 * and show an honest "nothing to export" message rather than letting
 * this throw surface as a generic error. */
export async function buildEpub(book: EpubBook): Promise<Blob> {
  if (book.chapters.length === 0) {
    throw new Error('EPUB must have at least one chapter');
  }

  const uid = `notebook-buddy-${slugify(book.title)}-${Date.now()}`;
  const filenames = book.chapters.map((ch, i) => chapterFilename(ch, i));

  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.folder('META-INF')!.file('container.xml', CONTAINER_XML);

  const oebps = zip.folder('OEBPS')!;
  oebps.file('content.opf', contentOpf(book, uid, filenames));
  oebps.file('nav.xhtml', navXhtml(book, filenames));
  oebps.file('toc.ncx', tocNcx(book, uid, filenames));
  oebps.file('styles.css', STYLES_CSS);
  book.chapters.forEach((ch, i) => oebps.file(filenames[i], chapterXhtml(ch)));

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}
