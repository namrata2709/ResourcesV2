/**
 * pages/Note/HighlightNoteEditor.tsx — P1-2: a small popover for
 * adding/editing/removing the personal note attached to one existing
 * highlight. Opened via the note-icon button `BodyProse.tsx` renders
 * inside each `<mark>` (see `HighlightedRuns`) -- deliberately a
 * SEPARATE affordance from clicking the mark itself, which P1-1 already
 * wired to remove the highlight outright; this ticket doesn't change
 * that shipped behavior.
 *
 * Same fixed-positioning-clamped-to-viewport convention as
 * `HighlightSelectionButton`, for the same reason (small popovers
 * anchored to a text selection/highlight shouldn't run off-screen on a
 * small viewport).
 *
 * Rendered via a portal into `document.body`, NOT inline where it's
 * invoked from -- unlike `HighlightSelectionButton` (always rendered as
 * a sibling of the content div, never inside a run), this editor is
 * opened from inside `HighlightedRuns`, which itself often renders
 * inside a `<p>` (a paragraph block). A `<div>`-based popover nested
 * inside a `<p>` is invalid HTML and triggers a real React DOM-nesting
 * warning -- confirmed by hitting exactly that warning before adding
 * this portal.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';

interface HighlightNoteEditorProps {
  top: number;
  left: number;
  initialNote: string;
  onSave: (note: string) => void;
  onRemoveHighlight: () => void;
  onClose: () => void;
}

export function HighlightNoteEditor({
  top,
  left,
  initialNote,
  onSave,
  onRemoveHighlight,
  onClose,
}: HighlightNoteEditorProps) {
  const [draft, setDraft] = useState(initialNote);

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return createPortal(
    <div
      role="dialog"
      aria-label="Highlight note"
      // Selecting text inside the textarea shouldn't collapse whatever
      // selection is still active elsewhere on the page, same guard
      // HighlightSelectionButton uses on its own button.
      onMouseDown={(e) => e.stopPropagation()}
      style={{ position: 'fixed', top: Math.max(8, top), left: Math.max(8, left) }}
      className="z-50 w-64 rounded-lg border border-border-color bg-bg-card p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Note</span>
        <button
          type="button"
          aria-label="Close note editor"
          onClick={onClose}
          className="rounded p-0.5 text-text-muted hover:text-text-primary"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add a note about this highlight…"
        rows={3}
        className="w-full resize-none rounded border border-border-color bg-bg-primary p-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onRemoveHighlight}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-muted hover:text-red-500"
        >
          <Trash2 size={13} aria-hidden="true" />
          Remove highlight
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/90"
        >
          Save
        </button>
      </div>
    </div>,
    document.body
  );
}
