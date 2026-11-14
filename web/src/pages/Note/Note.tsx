/**
 * pages/Note/Note.tsx — T5-3a, "Note page as React: core".
 *
 * Owns the `/notes/:folder` route (a single flat `:folder` param, per
 * T3-6's scope decision — not a split `/notes/:subject/:slug`). Renders
 * whichever file in that folder is `type: "notes"` or `type: "lab"` —
 * confirmed per PROJECT.md that a lab is just another content-file type
 * in the same folder, opened through the same boot sequence, not a
 * separate page. An optional `?file=` query param lets a multi-file
 * folder's non-primary open-able file be deep-linked directly (same
 * "optional variant state rides as a query param, not part of the
 * resource's identity" convention T5-1 already established for `?seed=`).
 *
 * SCOPE, stated plainly rather than silently under-built:
 *   - MCQ, Checklist, Glossary, and Interview-prep modules are real and
 *     fully built here, since their JSON already exists today (per
 *     T5-2's own 2026-07-25 verification) and don't wait on anything.
 *   - The note's actual body-prose (headings, callouts, collapsibles,
 *     references, summary, exam-highlights, YouTube embeds,
 *     image-prompts) now renders for real via BodyProseModule, which
 *     consumes T5-2's `body-prose.json` (generate_notes.py's
 *     `extract_body_prose()`) — the earlier placeholder is gone.
 *     Block/run rendering itself lives in BodyProse.tsx, kept separate
 *     from the fetch wrapper the same way every other module here
 *     splits "fetch the JSON" from "render it".
 *   - DSA-specific content (animations, LeetCode/contest tables, visual
 *     MCQ, code-language tabs) renders via the DSA-only modules below
 *     (LeetCodeModule, ContestModule, VisualMcqModule,
 *     ImplementationModule, VisualisationModule) — built in T5-3b, gated
 *     on `note.subject === 'dsa'` so an AWS note never fetches JSON that
 *     will never exist for it.
 *   - Lite Mode (T5-3c-1) is real: a page-level toggle that hides every
 *     non-'core' module (per lib/moduleRegistry.ts's tag registry),
 *     leaving only body-prose and the glossary visible. The toggle
 *     control here is a stand-in for T5-3c-2's real Settings FAB item —
 *     both read/write the same `liteMode` key and both reload the page
 *     on click, so T5-3c-2 landing later is a UI change, not a second
 *     mechanism to reconcile with this one.
 *   - Jump-to-top and in-page section search (T5-3c-4) are real —
 *     JumpToTopButton and NoteSearchPanel's actual match/scroll logic.
 *   - Cross-tab favorites sync (T5-3c-5) is real too — favorites now
 *     come from the shared hooks/useNotesFavorites.ts (also used by
 *     NotesIndex.tsx), not a local copy of the same load/save logic.
 *     Export-highlights is still T5-3c's remaining scope.
 *   - Per-section Bookmark star (T5-3c-7) is real now too, alongside
 *     Highlighting/personal notes (P1-1/P1-2) — see BodyProseModule.tsx
 *     for how those three pieces are actually wired together.
 *   - Revision Mode (P3-2) is real: a Settings FAB toggle here that
 *     tells BodyProseModule to render only highlighted/bookmarked
 *     content (personal notes ride along with their highlight). Unlike
 *     Lite Mode this is a live state flip, not a reload — see
 *     BodyProseModule.tsx's own note on why.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { Heart, Link2, ExternalLink, Settings as SettingsIcon, Wrench } from 'lucide-react';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageMeta } from '../../components/PageMeta';
import { ShareQR } from '../../components/ShareQR';
import { TypeBadges } from '../../components/TypeBadges';
import { FloatingMenu, type FloatingMenuItem } from '../../components/FloatingMenu/FloatingMenu';
import { JumpToTopButton } from '../../components/JumpToTopButton/JumpToTopButton';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { useNotesFavorites } from '../../hooks/useNotesFavorites';
import { useTheme } from '../../context/ThemeContext';
import { showNotification } from '../../lib/notifications';
import { exportAs, slugify, triggerDownload } from '../../lib/exportAs';
import { dataPath, assetPath } from '../../lib/siteConfig';
import { NOTE_CONTENT_CONTAINER_ID } from '../../lib/noteSections';
import {
  EXAM_MODE_KEY,
  LITE_MODE_KEY,
  REVISION_MODE_KEY,
  STUDY_TIMER_VISIBLE_KEY,
} from '../../lib/storageKeys';
import type { Note as NoteMeta, NoteFile } from '../NotesIndex/NotesIndex';
import { LiteModeSection } from './LiteModeSection';
import { loadHighlights } from './highlights';
import { buildHighlightsExportText } from './highlightsExport';
import { BodyProseModule } from './BodyProseModule';
import { BookmarksPanel } from './BookmarksPanel';
import { NoteSearchPanel } from './NoteSearchPanel';
import { StudyTimer } from './StudyTimer';
import { printFullPage, printCoreOnly } from './printNote';
import { McqModule } from './McqModule';
import { ChecklistModule } from './ChecklistModule';
import { GlossaryModule } from './GlossaryModule';
import { InterviewModule } from './InterviewModule';
import { LeetCodeModule } from './LeetCodeModule';
import { ContestModule } from './ContestModule';
import { VisualMcqModule } from './VisualMcqModule';
import { ImplementationModule } from './ImplementationModule';
import { VisualisationModule } from './VisualisationModule';
import { EXAM_MODE_CYCLE, type ExamMode, type BodyProseData } from './types';

// Same file-type icon map notes-index.js/NotesIndex.tsx use — a lab and
// a notes page both render through this component, so both need a badge.
const FILE_TYPE_META: Record<string, { label: string; icon: string }> = {
  notes: { label: 'Notes', icon: '📄' },
  lab: { label: 'Lab', icon: '🧪' },
  slides: { label: 'Presentation', icon: '📊' },
};

function loadExamMode(): ExamMode {
  const stored = localStorage.getItem(EXAM_MODE_KEY);
  return stored === 'highlight' || stored === 'test' ? stored : 'none';
}

const EXAM_MODE_LABEL: Record<ExamMode, string> = {
  none: 'Exam mode: off',
  highlight: 'Exam mode: highlight',
  test: 'Exam mode: test',
};

function loadLiteMode(): boolean {
  return localStorage.getItem(LITE_MODE_KEY) === 'true';
}

function loadRevisionMode(): boolean {
  return localStorage.getItem(REVISION_MODE_KEY) === 'true';
}

function loadStudyTimerVisible(): boolean {
  return localStorage.getItem(STUDY_TIMER_VISIBLE_KEY) === 'true';
}

/** Picks which file in the folder this route renders — the `?file=`
 * override if it names a notes/lab file in this folder, otherwise the
 * folder's primary notes/lab file (notes preferred over lab). */
function resolveFile(note: NoteMeta, fileParam: string | null): NoteFile | null {
  const openable = note.files.filter((f) => f.type === 'notes' || f.type === 'lab');
  if (fileParam) {
    const match = openable.find((f) => f.file === fileParam);
    if (match) return match;
  }
  return openable.find((f) => f.type === 'notes') ?? openable[0] ?? null;
}

interface NoteProps {
  /** Testing seam, matching NotesIndex's subjectOverride/Gallery's own
   * override convention — lets tests render this page without a full
   * router context providing the :folder param. */
  folderOverride?: string;
}

export function Note({ folderOverride }: NoteProps) {
  const params = useParams<{ folder: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const folder = folderOverride ?? params.folder ?? '';
  const fileParam = searchParams.get('file');

  const [allNotes, setAllNotes] = useState<NoteMeta[] | null>(null);
  const [error, setError] = useState(false);
  const [examMode, setExamMode] = useState<ExamMode>(loadExamMode);
  const [liteMode] = useState<boolean>(loadLiteMode);
  const [revisionMode, setRevisionMode] = useState<boolean>(loadRevisionMode);
  const [studyTimerVisible, setStudyTimerVisible] = useState<boolean>(loadStudyTimerVisible);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { announce } = useLiveRegion();
  const { theme, toggleTheme } = useTheme();
  const { favorites, toggleFavorite } = useNotesFavorites({ announce });

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('index', 'notes-index.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
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
  const resolvedFile = useMemo(() => (note ? resolveFile(note, fileParam) : null), [note, fileParam]);

  // P0-3: restores last scroll position on load, then tracks + persists
  // it as the user scrolls — see hooks/useReadingProgress.ts. Gated on
  // `note && resolvedFile` (real content resolved, not just "notes-index
  // fetch finished") and called unconditionally, before any early
  // return below, per Rules of Hooks.
  useReadingProgress(note?.folder ?? null, Boolean(note && resolvedFile));

  function cycleExamMode() {
    const currentIndex = EXAM_MODE_CYCLE.indexOf(examMode);
    const next = EXAM_MODE_CYCLE[(currentIndex + 1) % EXAM_MODE_CYCLE.length];
    setExamMode(next);
    localStorage.setItem(EXAM_MODE_KEY, next);
    announce(EXAM_MODE_LABEL[next]);
    showNotification(EXAM_MODE_LABEL[next], 'info');
  }

  useKeyboardShortcut({
    key: 'e',
    keyLabel: 'Alt+E',
    description: 'Cycle exam mode',
    altKey: true,
    handler: cycleExamMode,
  });

  // T5-3c-1: reloads on click deliberately, not a live state update —
  // matches T5-3c-2's own spec for its future Settings > Lite Mode item
  // ("clicking reloads the page"), so this stand-in control and that
  // later one share one mechanism instead of two that could drift.
  function toggleLiteMode() {
    const next = !liteMode;
    localStorage.setItem(LITE_MODE_KEY, next ? 'true' : 'false');
    window.location.reload();
  }

  // P3-2: unlike Lite Mode, Revision Mode doesn't change which modules
  // fetch/mount — only which already-loaded body-prose blocks
  // BodyProseModule passes on to render — so a live state flip is
  // correct here too, same reasoning as Study Timer's toggle below.
  function toggleRevisionMode() {
    const next = !revisionMode;
    setRevisionMode(next);
    localStorage.setItem(REVISION_MODE_KEY, next ? 'true' : 'false');
    announce(next ? 'Revision mode on' : 'Revision mode off');
  }

  // T5-3c-2: unlike Lite Mode, this doesn't gate what gets fetched/
  // rendered on load, so a live state flip is enough — no reload needed.
  function toggleStudyTimerVisible() {
    const next = !studyTimerVisible;
    setStudyTimerVisible(next);
    localStorage.setItem(STUDY_TIMER_VISIBLE_KEY, next ? 'true' : 'false');
  }

  // T5-3c-6: Tools > Export Highlights item, now genuinely built —
  // P1-1 (Highlighting) and P1-2 (personal notes on a highlight) both
  // landed, so there's real data to export. Loads this note's saved
  // highlights fresh from storage (not React state — exportHighlights
  // has no reason to hold its own copy of what BodyProseModule already
  // owns/persists) via the shared `loadHighlights` P1-1 established,
  // hands them to highlightsExport.ts to become plain text, then
  // reuses `triggerDownload`/`slugify` — the same shared download step
  // and filename-slugging exportAs.ts's own adapters use, so this
  // doesn't hand-roll a second version of either. The "no highlights
  // yet" case keeps the same honest, no-fabricated-output status
  // message the old stub always showed — still correct today, just
  // for a real reason (an actually-empty highlight list) instead of
  // the feature not existing.
  function exportHighlights() {
    if (!note) return;
    const highlights = loadHighlights(note.folder);
    if (!highlights.length) {
      showNotification('No highlights saved yet for this note.', 'info');
      return;
    }
    const text = buildHighlightsExportText(note.title, highlights);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `${slugify(note.title)}-highlights.txt`);
    showNotification('Highlights exported', 'success');
  }

  // E0-1's Tools > Download item. Fetches the same body-prose.json
  // BodyProseModule.tsx already renders (same dataPath call), then
  // hands the raw blocks to the shared exportAs() entry point -- this
  // handler doesn't know or care that 'docx' is implemented via the
  // `docx` library, only that exportAs() owns turning content+format
  // into a downloaded file.
  //
  // A missing body-prose.json (404) is treated the same honest,
  // non-error way BodyProseModule.tsx treats it -- an older note that
  // predates T5-2's extractor, not a failure -- so it gets the same
  // "nothing to export" message as a body-prose.json that exists but
  // has zero blocks. The generic error toast is reserved for a real
  // unexpected failure (network error, malformed JSON, or exportAs()
  // itself throwing).
  // E0-2's own single-note EPUB path shares this exact function with
  // the pre-existing DOCX one -- same fetch, same empty/error handling
  // -- since the only real difference between the two is which string
  // gets passed to exportAs()'s `format` argument.
  async function exportNoteAs(format: 'docx' | 'epub') {
    if (!note) return;
    try {
      const res = await fetch(dataPath('notes', note.folder, 'json', 'body-prose.json'));
      const data: BodyProseData = res.ok ? await res.json() : { blocks: [] };
      if (!data.blocks.length) {
        showNotification('Nothing to export yet for this note.', 'info');
        return;
      }
      await exportAs({ title: note.title, blocks: data.blocks }, format);
    } catch {
      showNotification('Could not export this note. Please try again.', 'error');
    }
  }

  // E0-2's "Export options UI" -- whole-notebook/favorites/bookmarked
  // scopes, Quiz Book, and Revision Book all live on their own /export
  // page (see pages/Export/Export.tsx) rather than cramming a second
  // scope picker into this FAB menu. The current note's folder/title
  // ride along as query params so /export's own "Current Chapter"
  // option resolves to THIS note without a second lookup.
  function openExportPage() {
    if (!note) return;
    navigate(`/export?folder=${encodeURIComponent(note.folder)}&title=${encodeURIComponent(note.title)}`);
  }

  function copyLink() {
    if (!note) return;
    const url = `${window.location.origin}${assetPath('notes', note.folder)}`;
    navigator.clipboard?.writeText(url).then(
      () => showNotification('Link copied', 'success'),
      () => showNotification('Could not copy link', 'error'),
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-text-secondary">Couldn't load this note. Please try again.</p>
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

  if (!note) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-text-primary mb-2">Note not found</h1>
        <p className="text-text-secondary">There's no note at this address.</p>
      </div>
    );
  }

  if (!resolvedFile) {
    // The folder exists but doesn't have a notes/lab file to render here.
    // A slides-only folder now has a real home — `/slides/:folder`
    // (T5-4a, shipped) — so redirect there instead of the "not
    // available yet" fallback below, which now only covers a genuinely
    // unported file type (none exist in real data today; kept as a
    // defensive fallback, not dead code removed prematurely).
    const slidesFile = note.files.find((f) => f.type === 'slides');
    if (slidesFile) {
      return <Navigate to={`/slides/${note.folder}`} replace />;
    }

    const fallback = note.files[0];
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-text-primary mb-2">{note.title}</h1>
        <p className="text-text-secondary mb-4">
          This content type isn't available on the new site yet.
        </p>
        {fallback && (
          <a
            href={dataPath('notes', note.folder, fallback.file)}
            className="inline-flex items-center gap-1 text-primary hover:text-accent underline"
          >
            Open on the current site <ExternalLink size={14} />
          </a>
        )}
      </div>
    );
  }

  const noteUrl = `${window.location.origin}${assetPath('notes', note.folder)}`;
  const isFavorited = favorites.has(note.folder);
  const otherFiles = note.files.filter((f) => f.file !== resolvedFile.file);

  // "Complete-notes pages" per T5-3c-2's Export Highlights spec — read
  // as resolvedFile.type === 'notes' (a full notes page), not 'lab',
  // matching FILE_TYPE_META's existing distinction above. Flagged as an
  // interpretation, not a confirmed definition, since the ticket text
  // doesn't spell out what "complete-notes" means precisely.
  const isCompleteNotesPage = resolvedFile.type === 'notes';

  const examModeDetail = EXAM_MODE_LABEL[examMode].replace('Exam mode: ', '');
  const settingsItems: FloatingMenuItem[] = [
    {
      key: 'examMode',
      label: 'Exam Mode',
      detail: examModeDetail.charAt(0).toUpperCase() + examModeDetail.slice(1),
      onSelect: cycleExamMode,
    },
    {
      key: 'theme',
      label: 'Theme',
      detail: theme.charAt(0).toUpperCase() + theme.slice(1),
      onSelect: toggleTheme,
    },
    {
      key: 'liteMode',
      label: 'Lite Mode',
      detail: liteMode ? 'On' : 'Off',
      pressed: liteMode,
      onSelect: toggleLiteMode,
    },
    {
      key: 'revisionMode',
      label: 'Revision Mode',
      detail: revisionMode ? 'On' : 'Off',
      pressed: revisionMode,
      onSelect: toggleRevisionMode,
    },
  ];

  const toolsItems: FloatingMenuItem[] = [
    {
      key: 'search',
      label: 'Search',
      onSelect: () => {
        setBookmarksOpen(false);
        setSearchOpen(true);
      },
    },
    {
      key: 'print',
      label: 'Print',
      submenu: [
        { key: 'full', label: 'Full page', onSelect: printFullPage },
        { key: 'core', label: 'Notes only', onSelect: printCoreOnly },
      ],
    },
    {
      key: 'exportDocx',
      label: 'Download as Word',
      onSelect: () => exportNoteAs('docx'),
    },
    {
      key: 'exportEpub',
      label: 'Download as EPUB',
      onSelect: () => exportNoteAs('epub'),
    },
    {
      key: 'exportNotebook',
      label: 'Export Notebook…',
      onSelect: openExportPage,
    },
    {
      key: 'bookmarks',
      label: 'Bookmarks',
      onSelect: () => {
        setSearchOpen(false);
        setBookmarksOpen(true);
      },
    },
    {
      key: 'exportHighlights',
      label: 'Export Highlights',
      hidden: !isCompleteNotesPage,
      onSelect: exportHighlights,
    },
    {
      key: 'studyTimer',
      label: 'Study Timer',
      detail: studyTimerVisible ? 'Shown' : 'Hidden',
      pressed: studyTimerVisible,
      onSelect: toggleStudyTimerVisible,
    },
  ];

  return (
    <div
      data-exam-mode={examMode}
      className="max-w-[var(--reading-content-width,48rem)] mx-auto px-4 py-8"
    >
      <PageMeta title={note.title} canonicalPath={`/notes/${note.folder}`} />
      <Breadcrumb keys={['Home', note.subject === 'aws' ? 'AWS' : 'DSA', note.title]} />

      <header className="mt-4 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{note.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-text-muted">
              {resolvedFile.type === 'lab' && <span>🧪 Lab</span>}
              {note.readTimeMinutes ? <span>⏱️ {note.readTimeMinutes} min read</span> : null}
              {note.session && <span>{note.session}</span>}
            </div>
            {otherFiles.length > 0 && (
              <div className="mt-2">
                <TypeBadges files={otherFiles} typeMap={FILE_TYPE_META} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleFavorite(note.folder, note.title)}
              aria-pressed={isFavorited}
              aria-label={isFavorited ? `Remove ${note.title} from favorites` : `Add ${note.title} to favorites`}
              className="flex items-center gap-1 rounded-md border border-border-color px-2.5 py-1.5 text-sm text-text-secondary hover:text-accent hover:border-accent"
            >
              <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={copyLink}
              aria-label="Copy link to this note"
              className="flex items-center gap-1 rounded-md border border-border-color px-2.5 py-1.5 text-sm text-text-secondary hover:text-accent hover:border-accent"
            >
              <Link2 size={16} />
            </button>
            <ShareQR url={noteUrl} label="this note" />
          </div>
        </div>
      </header>

      {/* T5-3c-4: scopes NoteSearchPanel's section search (and any
          future per-section feature built the same way) to exactly
          this note's own rendered content — see lib/noteSections.ts.
          Wraps only the module list, not the header/FABs/panels, so
          those never get picked up as "sections". */}
      <div id={NOTE_CONTENT_CONTAINER_ID}>
        <LiteModeSection moduleId="bodyProse" liteMode={liteMode}>
          <BodyProseModule folder={note.folder} revisionMode={revisionMode} />
        </LiteModeSection>

        <LiteModeSection moduleId="mcq" liteMode={liteMode}>
          <McqModule folder={note.folder} />
        </LiteModeSection>
        <LiteModeSection moduleId="checklist" liteMode={liteMode}>
          <ChecklistModule folder={note.folder} />
        </LiteModeSection>
        <LiteModeSection moduleId="glossary" liteMode={liteMode}>
          <GlossaryModule folder={note.folder} />
        </LiteModeSection>
        <LiteModeSection moduleId="interview" liteMode={liteMode}>
          <InterviewModule folder={note.folder} />
        </LiteModeSection>
        {note.subject === 'dsa' && (
          <>
            <LiteModeSection moduleId="visualisation" liteMode={liteMode}>
              <VisualisationModule folder={note.folder} title={note.title} />
            </LiteModeSection>
            <LiteModeSection moduleId="implementation" liteMode={liteMode}>
              <ImplementationModule folder={note.folder} />
            </LiteModeSection>
            <LiteModeSection moduleId="leetcode" liteMode={liteMode}>
              <LeetCodeModule folder={note.folder} />
            </LiteModeSection>
            <LiteModeSection moduleId="contest" liteMode={liteMode}>
              <ContestModule folder={note.folder} />
            </LiteModeSection>
            <LiteModeSection moduleId="visualMcq" liteMode={liteMode}>
              <VisualMcqModule folder={note.folder} />
            </LiteModeSection>
          </>
        )}
      </div>

      {/* T5-3c-2: one generic FloatingMenu, two instances — Settings
          replaces the old header Exam Mode/Lite Mode buttons, Tools is
          new. Stacked so they don't overlap; Tools sits below Settings. */}
      <FloatingMenu label="Settings" icon={<SettingsIcon size={20} />} items={settingsItems} stackIndex={1} />
      <FloatingMenu label="Tools" icon={<Wrench size={20} />} items={toolsItems} stackIndex={0} />
      <BookmarksPanel pageId={note.folder} open={bookmarksOpen} onClose={() => setBookmarksOpen(false)} bottomOffsetRem={5.5} />
      <NoteSearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} bottomOffsetRem={5.5} />
      <StudyTimer visible={studyTimerVisible} />
      <JumpToTopButton />
    </div>
  );
}
