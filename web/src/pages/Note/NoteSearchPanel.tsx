import { useEffect, useMemo, useRef, useState } from 'react';
import { getNoteSections, type NoteSection } from '../../lib/noteSections';

/**
 * pages/Note/NoteSearchPanel.tsx — T5-3c-2's Tools > Search item, now
 * with T5-3c-4's real match/scroll logic wired in (T5-3c-2 deliberately
 * stopped at "opens + focuses search" and left this to be built here,
 * against whichever design this ticket landed on — see the removed
 * placeholder note this comment replaces).
 *
 * Deliberately NOT built on useSearch()/FlexSearch: that hook indexes a
 * flat list of *items* (notes, quizzes) sharing one schema across many
 * pages — reusing it here would mean either indexing every note's
 * content up front (defeats "no cross-note leak" — the index would
 * physically contain other notes' text) or building a second FlexSearch
 * instance per note open, for a page that has at most a few dozen
 * sections. A plain substring match over lib/noteSections.ts's
 * DOM-scoped section list is simpler, has no cross-note surface at all
 * by construction (the container it reads from only ever contains this
 * note's own rendered content), and is genuinely a different kind of
 * search — "which section is this on" vs. "which document matches" —
 * so a separate, purpose-built implementation is the right call here,
 * not a shortcut.
 *
 * Sections are snapshotted once per panel-open (not live-tracked) —
 * McqModule/BodyProseModule/etc. fetch their own JSON asynchronously,
 * so a snapshot taken the instant the panel opens could miss
 * still-loading modules; closing and reopening the panel re-snapshots.
 * Good enough for a same-page, effectively-instant local fetch; flagged
 * here rather than silently assumed complete.
 */

const MAX_RESULTS = 30;

interface NoteSearchPanelProps {
  open: boolean;
  onClose: () => void;
  bottomOffsetRem?: number;
}

export function NoteSearchPanel({ open, onClose, bottomOffsetRem = 1.5 }: NoteSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [sections, setSections] = useState<NoteSection[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSections(getNoteSections());
      // Autofocus on open — the literal "opens + focuses search" behavior.
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const trimmed = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!trimmed) return sections;
    return sections.filter((s) => s.label.toLowerCase().includes(trimmed));
  }, [sections, trimmed]);
  const shown = results.slice(0, MAX_RESULTS);

  if (!open) return null;

  function goToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onClose();
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Search this note"
      className="
        fixed right-6 z-50 w-72 max-w-[90vw] max-h-[70vh]
        bg-bg-card border border-border-color rounded-xl
        shadow-[0_8px_30px_var(--shadow)]
        flex flex-col gap-1.5 p-3
      "
      style={{ bottom: `${bottomOffsetRem}rem` }}
    >
      <label htmlFor="note-search-input" className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        Search this note
      </label>
      <input
        ref={inputRef}
        id="note-search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search this note's sections…"
        className="w-full rounded-md border border-border-color bg-bg-primary px-3 py-1.5 text-sm text-text-primary"
      />

      {sections.length === 0 ? (
        <p className="text-xs text-text-muted">No searchable sections found on this note yet.</p>
      ) : results.length === 0 ? (
        <p className="text-xs text-text-muted">No sections match "{query.trim()}".</p>
      ) : (
        <ul className="flex flex-col overflow-y-auto -mx-1">
          {shown.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => goToSection(section.id)}
                className="w-full text-left px-2 py-1.5 text-sm text-text-primary hover:bg-bg-secondary rounded-md transition-colors truncate"
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {results.length > MAX_RESULTS && (
        <p className="text-xs text-text-muted">Showing first {MAX_RESULTS} of {results.length} matches.</p>
      )}
    </div>
  );
}
