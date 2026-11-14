/**
 * pages/Slides/Slides.tsx — T5-4a, "Slides as React: route + page shell
 * + windowed/fullscreen chrome".
 *
 * Owns the `/slides/:folder` route. Scope, stated plainly (this ticket
 * is 1 of 4 T5-4 was split into this session — see sprint-tickets.md):
 *   - Real: resolving the note + its `type: "slides"` file, fetching
 *     `json/slides.json`, the page shell (Breadcrumb/page-header, slide
 *     counter, loading/error states matching Note.tsx's conventions),
 *     and the fullscreen chrome mechanism (useFullscreenChrome).
 *   - T5-4b (this session, folded into this file — see DeckShell below):
 *     keyboard/click navigation between slides, and `comparison`'s real
 *     2/3+-column rendering.
 *   - T5-4c (this session, see EngageSlide below): all 5 `engage` kinds
 *     (`think`/`scenario`/`poll`/`predict`/`pause`) render structurally,
 *     with `options` shown only for `poll`/`predict` and an optional
 *     reveal toggle when `reveal` is present, regardless of kind.
 *   - T5-4d (this session, see SpeakerNotesPanel below): a toggleable
 *     speaker-notes panel rendering `notes_html`. Python already
 *     normalizes both authoring conventions (external `[notes]` after
 *     `[/slide]`, or nested inside it) into this one field before it
 *     ever reaches `slides.json` — this component renders whatever
 *     `notes_html` says for the CURRENT slide and has no idea, and no
 *     need to know, which convention the deck's author used.
 *   - Still NOT this ticket: `stat`/`icon-grid`/`code` still stay on
 *     the honest "renders in a follow-up ticket" placeholder — no
 *     sub-ticket in the T5-4 split has claimed those three yet, so
 *     fabricating layout for them here would be scope creep, not a
 *     head start.
 *
 * Note on vanilla prior art: the ticket text calls out vanilla's own
 * `js/notes/slides.js` (`openNotesPanel`/`closeNotesPanel`/
 * `toggleNotesPanel`) as worth reading before designing this panel's
 * open/close UX. That file wasn't part of this session's uploads, so
 * the toggle pattern below is built fresh from this codebase's own
 * existing conventions instead (`ViewModeToggle`'s aria-pressed toggle
 * button, `KeyboardShortcutsPanel`'s Escape-to-close) — flagged here
 * rather than silently presented as a vanilla port it isn't.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, NotebookText } from 'lucide-react';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageMeta } from '../../components/PageMeta';
import { useFullscreenChrome } from '../../hooks/useFullscreenChrome';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import { dataPath } from '../../lib/siteConfig';
import { showNotification } from '../../lib/notifications';
import type { Note, NoteFile } from '../NotesIndex/NotesIndex';
import type { ComparisonColumn, EngageContent, Slide, SlidesData } from './types';

/** Matches `ENGAGE_LABELS` in `utils/parse_slides.py` exactly — the
 * label shown above the question for each `engage` kind. */
const ENGAGE_LABELS: Record<EngageContent['kind'], string> = {
  think: 'Think About It',
  scenario: 'Scenario',
  poll: 'Quick Poll',
  predict: 'Predict',
  pause: 'Pause & Discuss',
};

/** Slide types this shell can already render generically (plain `html`
 * body, no structured layout needed). Everything else is a real,
 * fetched slide that simply doesn't have its dedicated renderer yet —
 * see this file's header comment for why that's T5-4b/T5-4c, not a bug
 * here. */
const GENERIC_HTML_TYPES = new Set<Slide['type']>([
  'title',
  'objectives',
  'section-divider',
  'concept',
  'diagram',
  'example',
  'recap',
  'summary',
  'mistakes',
  'exam-tips',
  'cta',
]);

function resolveSlidesFile(note: Note): NoteFile | null {
  return note.files.find((f) => f.type === 'slides') ?? null;
}

interface SlidesProps {
  /** Testing seam, matching Note's folderOverride convention — lets
   * tests render this page without a full router context providing the
   * :folder param. */
  folderOverride?: string;
}

export function Slides({ folderOverride }: SlidesProps) {
  const params = useParams<{ folder: string }>();
  const folder = folderOverride ?? params.folder ?? '';

  const [allNotes, setAllNotes] = useState<Note[] | null>(null);
  const [slidesData, setSlidesData] = useState<SlidesData | null | 'missing'>(null);
  const [error, setError] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreenChrome();

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('index', 'notes-index.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!cancelled) setAllNotes(data.notes || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const note = useMemo(() => allNotes?.find((n) => n.folder === folder) ?? null, [allNotes, folder]);
  const slidesFile = useMemo(() => (note ? resolveSlidesFile(note) : null), [note]);
  const [exportingPptx, setExportingPptx] = useState(false);

  useEffect(() => {
    if (!note || !slidesFile) return;
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'slides.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: SlidesData) => {
        if (!cancelled) setSlidesData(data);
      })
      .catch(() => {
        if (!cancelled) setSlidesData('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [note, slidesFile, folder]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-text-secondary">Couldn't load this deck. Please try again.</p>
      </div>
    );
  }

  if (allNotes === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-text-muted" role="status">
        Loading…
      </div>
    );
  }

  if (!note || !slidesFile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-text-primary mb-2">Deck not found</h1>
        <p className="text-text-secondary">There's no presentation at this address.</p>
      </div>
    );
  }

  // E1-1's PPT adapter -- title + bullets only, explicitly not graded
  // against visual match to the live deck (see lib/pptxExport.ts's own
  // header for the full reasoning). Disabled until slidesData has
  // actually loaded, since there's nothing real to export before then.
  async function exportPptx() {
    if (!slidesData || slidesData === 'missing') return;
    setExportingPptx(true);
    try {
      const { exportSlidesAsPptx } = await import('../../lib/pptxExport');
      await exportSlidesAsPptx(note!.title, slidesData.slides);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Could not export this deck. Please try again.', 'error');
    } finally {
      setExportingPptx(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageMeta title={note.title} canonicalPath={`/slides/${note.folder}`} />
      <Breadcrumb keys={['Home', note.subject === 'aws' ? 'AWS' : 'DSA', note.title]} />

      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-sm text-text-muted">
          📊 Presentation
          {slidesData && slidesData !== 'missing' ? ` · ${slidesData.slides.length} slide${slidesData.slides.length === 1 ? '' : 's'}` : ''}
        </span>
        <button
          type="button"
          onClick={exportPptx}
          disabled={!slidesData || slidesData === 'missing' || exportingPptx}
          aria-label="Download as PowerPoint"
          title="Download as PowerPoint (title + bullets)"
          className="
            inline-flex items-center justify-center h-9 w-9 rounded-full
            bg-bg-card text-primary border border-border-color
            hover:shadow-[0_4px_12px_var(--shadow)] transition-shadow
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <Download size={16} />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="
            inline-flex items-center justify-center h-9 w-9 rounded-full
            bg-bg-card text-primary border border-border-color
            hover:shadow-[0_4px_12px_var(--shadow)] transition-shadow
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
          "
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {slidesData === null && (
        <div className="text-center text-text-muted py-12" role="status">
          Loading deck…
        </div>
      )}

      {slidesData === 'missing' && (
        <div className="text-center text-text-secondary py-12">
          This deck's content isn't available yet.
        </div>
      )}

      {slidesData && slidesData !== 'missing' && (
        // `key={folder}` resets DeckShell's own currentIndex state when
        // navigating directly from one deck to another (same component
        // instance otherwise, since it stays mounted at the same spot in
        // the tree) — without this, jumping decks via a fresh URL would
        // land on whatever slide index the previous deck was left on.
        <DeckShell key={folder} slides={slidesData.slides} />
      )}
    </div>
  );
}

/**
 * DeckShell — the real navigable deck. Owns which slide is current,
 * keyboard (←/→/Home/End) and click (prev/next buttons) nav (T5-4b),
 * per-type rendering for `comparison` (T5-4b) and `engage` (T5-4c), and
 * the speaker-notes toggle + panel (T5-4d, `N` key or the button below
 * the nav row). `stat`/`icon-grid`/`code` still fall through to the
 * honest placeholder — see this file's header comment.
 */
function DeckShell({ slides }: { slides: Slide[] }) {
  const total = slides.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const { announce } = useLiveRegion();
  const notesPanelId = useId();

  // Defensive clamp — slides.json is static per note today, so this
  // shouldn't ever actually bite, but keeps `slides[safeIndex]` from
  // ever indexing out of bounds if that ever changes.
  const safeIndex = total === 0 ? 0 : Math.min(currentIndex, total - 1);

  useEffect(() => {
    if (total === 0) return;
    announce(`Slide ${safeIndex + 1} of ${total}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, total]);

  function goTo(index: number) {
    setCurrentIndex(Math.max(0, Math.min(index, total - 1)));
  }
  function goPrev() {
    goTo(safeIndex - 1);
  }
  function goNext() {
    goTo(safeIndex + 1);
  }

  const canNavigate = total > 1;

  useKeyboardShortcut({
    key: 'ArrowLeft',
    keyLabel: '←',
    description: 'Previous slide',
    enabled: canNavigate,
    allowWhileTyping: true,
    handler: (e) => {
      e.preventDefault();
      goPrev();
    },
  });
  useKeyboardShortcut({
    key: 'ArrowRight',
    keyLabel: '→',
    description: 'Next slide',
    enabled: canNavigate,
    allowWhileTyping: true,
    handler: (e) => {
      e.preventDefault();
      goNext();
    },
  });
  useKeyboardShortcut({
    key: 'Home',
    keyLabel: 'Home',
    description: 'First slide',
    enabled: canNavigate,
    allowWhileTyping: true,
    handler: (e) => {
      e.preventDefault();
      goTo(0);
    },
  });
  useKeyboardShortcut({
    key: 'End',
    keyLabel: 'End',
    description: 'Last slide',
    enabled: canNavigate,
    allowWhileTyping: true,
    handler: (e) => {
      e.preventDefault();
      goTo(total - 1);
    },
  });
  useKeyboardShortcut({
    key: 'n',
    keyLabel: 'N',
    description: 'Toggle speaker notes',
    handler: () => setNotesOpen((v) => !v),
  });
  useKeyboardShortcut({
    key: 'Escape',
    keyLabel: 'Esc',
    description: 'Close speaker notes',
    enabled: notesOpen,
    allowWhileTyping: true,
    handler: () => setNotesOpen(false),
  });

  if (total === 0) {
    return <p className="text-center text-text-secondary py-12">This deck has no slides yet.</p>;
  }

  const current = slides[safeIndex];

  return (
    <div className="slide-deck">
      <section
        className="slide-deck-shell rounded-xl border border-border-color bg-bg-card p-8 min-h-[320px]"
        data-type={current.type}
        data-index={current.index}
      >
        {current.type === 'engage' && current.engage ? (
          <EngageSlide key={current.index} engage={current.engage} />
        ) : current.type === 'comparison' && current.columns && current.columns.length > 0 ? (
          <ComparisonSlide columns={current.columns} html={current.html} />
        ) : GENERIC_HTML_TYPES.has(current.type) && current.html ? (
          <div className="slide-body prose max-w-none" dangerouslySetInnerHTML={{ __html: current.html }} />
        ) : (
          <p className="text-text-muted text-center">
            This slide type (<code>{current.type}</code>) renders in a follow-up ticket.
          </p>
        )}
      </section>

      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={safeIndex === 0}
          aria-label="Previous slide"
          className="
            inline-flex items-center justify-center h-10 w-10 rounded-full
            bg-bg-card text-primary border border-border-color
            disabled:opacity-30 disabled:cursor-not-allowed
            hover:shadow-[0_4px_12px_var(--shadow)] transition-shadow
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
          "
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm text-text-muted tabular-nums" data-testid="slide-position">
          {safeIndex + 1} / {total}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={safeIndex === total - 1}
          aria-label="Next slide"
          className="
            inline-flex items-center justify-center h-10 w-10 rounded-full
            bg-bg-card text-primary border border-border-color
            disabled:opacity-30 disabled:cursor-not-allowed
            hover:shadow-[0_4px_12px_var(--shadow)] transition-shadow
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
          "
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex items-center justify-center mt-3">
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          aria-pressed={notesOpen}
          aria-expanded={notesOpen}
          aria-controls={notesPanelId}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
            border transition-shadow
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
            ${notesOpen ? 'bg-primary text-white border-primary' : 'bg-bg-card text-primary border-border-color hover:shadow-[0_4px_12px_var(--shadow)]'}
          `}
        >
          <NotebookText size={16} aria-hidden="true" />
          {notesOpen ? 'Hide speaker notes' : 'Speaker notes'}
        </button>
      </div>

      {notesOpen && <SpeakerNotesPanel id={notesPanelId} notesHtml={current.notes_html} />}
    </div>
  );
}

/**
 * SpeakerNotesPanel — T5-4d. Renders `notes_html` for whatever slide is
 * current, verbatim — Python has already normalized both authoring
 * conventions ([notes] nested inside [slide], or trailing after
 * [/slide]) into this one field, so this component never branches on
 * which convention a given deck used, and doesn't need to.
 *
 * Per the ticket's own note: an empty `notes_html` on a real slide is a
 * content-authoring gap worth surfacing, not a state to render nothing
 * for — so the empty case shows an explicit message instead of the
 * panel just silently containing nothing.
 */
function SpeakerNotesPanel({ id, notesHtml }: { id: string; notesHtml: string | null }) {
  return (
    <div
      id={id}
      role="region"
      aria-label="Speaker notes"
      className="speaker-notes-panel mt-3 rounded-xl border border-border-color bg-bg-secondary p-4"
    >
      <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
        <NotebookText size={16} aria-hidden="true" />
        Speaker notes
      </h3>
      {notesHtml ? (
        <div
          className="speaker-notes-body prose prose-sm max-w-none text-text-secondary"
          dangerouslySetInnerHTML={{ __html: notesHtml }}
        />
      ) : (
        <p className="text-sm text-text-muted italic">No speaker notes authored for this slide yet.</p>
      )}
    </div>
  );
}

/** `engage` slide rendering — one of `think`/`scenario`/`poll`/`predict`/
 * `pause` (real shape from `parse_engage_block()` in
 * `utils/parse_slides.py`: `{kind, question, options, reveal}`).
 * `options` is only ever populated for `poll`/`predict` on the Python
 * side (the parser hardcodes this — `OPTION_RE.findall(...) if kind in
 * ("poll", "predict") else []`), so gating the options list on kind
 * here is belt-and-suspenders, not a guess: it also means a `think`/
 * `scenario`/`pause` slide can never render an empty `<ul>` even if
 * something upstream ever changed. `reveal` is independent of kind —
 * the parser accepts it inside any of the 5 block types — so the
 * reveal toggle checks only whether `reveal` is present, not `kind`. */
function EngageSlide({ engage }: { engage: EngageContent }) {
  const [revealed, setRevealed] = useState(false);
  const showOptions = (engage.kind === 'poll' || engage.kind === 'predict') && engage.options.length > 0;

  return (
    <div className="engage-card" data-kind={engage.kind}>
      <span className="engage-label inline-block text-xs font-semibold uppercase tracking-wide text-primary mb-2">
        {ENGAGE_LABELS[engage.kind]}
      </span>
      <p className="engage-question text-lg text-text-primary mb-4">{engage.question}</p>

      {showOptions && (
        <ul className="engage-options space-y-2 mb-4" aria-label="Options">
          {engage.options.map((option, index) => (
            <li key={index} className="engage-option" data-option={String.fromCharCode(65 + index)}>
              <button
                type="button"
                className="
                  engage-option-btn w-full text-left px-4 py-2 rounded-lg
                  border border-border-color bg-bg-secondary text-text-primary
                  hover:border-primary transition-colors
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
                "
              >
                {String.fromCharCode(65 + index)}) {option}
              </button>
            </li>
          ))}
        </ul>
      )}

      {engage.reveal && (
        <div className="engage-reveal-wrap">
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-expanded={revealed}
            className="
              engage-reveal-btn px-4 py-2 rounded-full text-sm font-medium
              bg-bg-card text-primary border border-border-color
              hover:shadow-[0_4px_12px_var(--shadow)] transition-shadow
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
            "
          >
            {revealed ? 'Hide' : 'Reveal'}
          </button>
          {revealed && (
            <div className="engage-reveal mt-3 text-text-secondary">{engage.reveal}</div>
          )}
        </div>
      )}
    </div>
  );
}

/** `comparison` slide rendering — 2 or 3+ `[column]` blocks, each a
 * `{title, bullets}` pair (real shape from `parse_columns()` in
 * `utils/parse_slides.py`). `html` is any body text authored *outside*
 * the `[column]` blocks (parser strips the column markup out of the
 * plain body before rendering it, so this is never a duplicate of the
 * column content) — optional, so only rendered when non-empty. */
function ComparisonSlide({ columns, html }: { columns: ComparisonColumn[]; html: string | null }) {
  // Static class names (not template-interpolated) so Tailwind's
  // content scan actually picks them up — see frontend-design's note on
  // dynamic class strings getting silently purged from the build.
  const gridColsClass = columns.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <div className="comparison-slide">
      {html && (
        <div className="slide-body prose max-w-none mb-6" dangerouslySetInnerHTML={{ __html: html }} />
      )}
      <div className={`grid grid-cols-1 ${gridColsClass} gap-4`}>
        {columns.map((column, index) => (
          <div key={`${column.title}-${index}`} className="rounded-lg border border-border-color bg-bg-secondary p-4">
            <h3 className="font-semibold text-text-primary mb-2">{column.title}</h3>
            <ul className="space-y-1 text-sm text-text-secondary list-disc list-inside">
              {column.bullets.map((bullet, bulletIndex) => (
                <li key={bulletIndex}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
