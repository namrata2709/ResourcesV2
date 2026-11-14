/**
 * pages/Export/Export.tsx — E0-2's "Export options UI".
 *
 * Route: /export, optionally `?folder=<folder>` when arrived at from a
 * note page (Note.tsx's Tools > "Export Notebook…" item passes the
 * current note's folder along) — that's what unlocks the "Current
 * chapter" scope option below; without it, that option is hidden
 * rather than shown-but-broken, since there's no note to resolve it
 * against on a bare page load.
 *
 * Four real actions on this page, matching E0-2's own scope list:
 *   - Format + scope export (Whole Notebook / Favorites / Bookmarked /
 *     Current Chapter, each as either Word or EPUB) via
 *     lib/notebookExport.ts for the first three, and the same
 *     lib/exportAs.ts single-note path Note.tsx's own Tools menu
 *     already uses for "Current Chapter" (so a single note exported
 *     from here and from Note.tsx's own menu are byte-identical, not
 *     two implementations of the same thing).
 *   - Quiz Book (one click, no scope/format choice — see
 *     lib/quizBookExport.ts's own header for why this is a single
 *     variant, not a picker).
 *   - Revision Book (one click, same reasoning — lib/revisionBookExport.ts).
 *
 * All four report their own honest empty/partial state via
 * showNotification rather than a silent no-op or a generic error —
 * same convention Note.tsx's exportNoteAsDocx already established for
 * "nothing to export yet".
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Download, GraduationCap, Sparkles } from 'lucide-react';
import { PageMeta } from '../../components/PageMeta';
import { showNotification } from '../../lib/notifications';
import { exportAs } from '../../lib/exportAs';
import { exportNotebook, type NotebookFormat, type NotebookScope } from '../../lib/notebookExport';
import { dataPath } from '../../lib/siteConfig';
import type { BodyProseData } from '../Note/types';

const SCOPE_OPTIONS: { id: NotebookScope; label: string; description: string }[] = [
  { id: 'whole', label: 'Whole Notebook', description: 'Every note, in one file.' },
  { id: 'favorites', label: 'Favorites', description: 'Only notes you\u2019ve favorited, in full.' },
  {
    id: 'bookmarked',
    label: 'Bookmarked & Highlighted',
    description: 'Only the sections you\u2019ve bookmarked or highlighted.',
  },
];

const FORMAT_OPTIONS: { id: NotebookFormat; label: string }[] = [
  { id: 'epub', label: 'EPUB' },
  { id: 'docx', label: 'Word (.docx)' },
];

function summarizeSkipped(skipped: string[]): string {
  if (skipped.length === 0) return '';
  const shown = skipped.slice(0, 3).join(', ');
  const more = skipped.length > 3 ? `, and ${skipped.length - 3} more` : '';
  return ` (skipped: ${shown}${more} — no content to include)`;
}

export function Export() {
  const [searchParams] = useSearchParams();
  const currentFolder = searchParams.get('folder');
  const currentTitle = searchParams.get('title');

  const [scope, setScope] = useState<NotebookScope | 'current'>(currentFolder ? 'current' : 'whole');
  const [format, setFormat] = useState<NotebookFormat>('epub');
  const [busy, setBusy] = useState<string | null>(null);

  async function runMultiExport() {
    setBusy('scope');
    try {
      if (scope === 'current') {
        if (!currentFolder) return;
        const res = await fetch(dataPath('notes', currentFolder, 'json', 'body-prose.json'));
        const data: BodyProseData = res.ok ? await res.json() : { blocks: [] };
        if (!data.blocks.length) {
          showNotification('Nothing to export yet for this note.', 'info');
          return;
        }
        await exportAs({ title: currentTitle || currentFolder, blocks: data.blocks }, format);
        showNotification('Export started.', 'success');
        return;
      }
      const { skipped } = await exportNotebook(scope, format);
      showNotification(`Export started.${summarizeSkipped(skipped)}`, 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Could not export. Please try again.', 'info');
    } finally {
      setBusy(null);
    }
  }

  async function runQuizBook() {
    setBusy('quiz');
    try {
      const { exportQuizBook } = await import('../../lib/quizBookExport');
      const { skipped } = await exportQuizBook();
      showNotification(`Quiz Book download started.${summarizeSkipped(skipped)}`, 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Could not build the Quiz Book.', 'info');
    } finally {
      setBusy(null);
    }
  }

  async function runRevisionBook() {
    setBusy('revision');
    try {
      const { exportRevisionBook } = await import('../../lib/revisionBookExport');
      const { skipped } = await exportRevisionBook();
      showNotification(`Revision Book download started.${summarizeSkipped(skipped)}`, 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Could not build the Revision Book.', 'info');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <PageMeta
        title="Export"
        description="Export your notes, quizzes, and revision material as Word or EPUB files."
        canonicalPath="/export"
      />
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Export</h1>
      <p className="text-text-secondary mb-8">Download your notes as a Word document or an EPUB e-book.</p>

      <section className="mb-10" aria-labelledby="export-scope-heading">
        <h2 id="export-scope-heading" className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Download size={18} /> Export Notes
        </h2>

        <fieldset className="mb-4">
          <legend className="text-sm font-medium text-text-secondary mb-2">What to include</legend>
          <div className="flex flex-col gap-2">
            {currentFolder && (
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="export-scope"
                  checked={scope === 'current'}
                  onChange={() => setScope('current')}
                />
                <span>
                  <span className="font-medium text-text-primary">Current Chapter</span>
                  <span className="block text-sm text-text-secondary">Just "{currentTitle || currentFolder}".</span>
                </span>
              </label>
            )}
            {SCOPE_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex items-start gap-2">
                <input
                  type="radio"
                  name="export-scope"
                  checked={scope === opt.id}
                  onChange={() => setScope(opt.id)}
                />
                <span>
                  <span className="font-medium text-text-primary">{opt.label}</span>
                  <span className="block text-sm text-text-secondary">{opt.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mb-4">
          <legend className="text-sm font-medium text-text-secondary mb-2">Format</legend>
          <div className="flex gap-4">
            {FORMAT_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="export-format"
                  checked={format === opt.id}
                  onChange={() => setFormat(opt.id)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={runMultiExport}
          disabled={busy === 'scope'}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2 font-medium disabled:opacity-60"
        >
          <Download size={16} />
          {busy === 'scope' ? 'Exporting…' : 'Export'}
        </button>
      </section>

      <section className="mb-8" aria-labelledby="quiz-book-heading">
        <h2 id="quiz-book-heading" className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
          <GraduationCap size={18} /> Quiz Book
        </h2>
        <p className="text-sm text-text-secondary mb-3">
          Every quiz as one EPUB — all questions first, then a page break, then a full answer key.
        </p>
        <button
          type="button"
          onClick={runQuizBook}
          disabled={busy === 'quiz'}
          className="inline-flex items-center gap-2 rounded-md border border-border-color px-4 py-2 font-medium disabled:opacity-60"
        >
          <BookOpen size={16} />
          {busy === 'quiz' ? 'Building…' : 'Download Quiz Book'}
        </button>
      </section>

      <section aria-labelledby="revision-book-heading">
        <h2 id="revision-book-heading" className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
          <Sparkles size={18} /> Revision Book
        </h2>
        <p className="text-sm text-text-secondary mb-3">
          Favorited notes in full, plus highlighted or bookmarked sections from everything else — combined into one EPUB.
        </p>
        <button
          type="button"
          onClick={runRevisionBook}
          disabled={busy === 'revision'}
          className="inline-flex items-center gap-2 rounded-md border border-border-color px-4 py-2 font-medium disabled:opacity-60"
        >
          <BookOpen size={16} />
          {busy === 'revision' ? 'Building…' : 'Download Revision Book'}
        </button>
      </section>
    </div>
  );
}
