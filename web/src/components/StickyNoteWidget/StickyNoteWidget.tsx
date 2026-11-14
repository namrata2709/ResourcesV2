import { useRef, useState, type KeyboardEvent } from 'react';
import { StickyNote as StickyNoteIcon, X, Trash2 } from 'lucide-react';
import { useStickyNote } from '../../hooks/useStickyNote';
import { showNotification } from '../../lib/notifications';

/**
 * StickyNoteWidget — P0-10 (Sticky Notes). A freeform text note attachable
 * to a page, not anchored to a specific highlighted span (that's P1-2
 * Personal Notes, which needs Highlighting's stable-id storage to attach
 * to and hasn't been built yet — see that ticket's own header).
 *
 * Mounted ONCE in App.tsx (not per-page), same pattern as
 * KeyboardShortcutsPanel/NotificationToasts — useStickyNote() itself is
 * what makes it page-aware, re-reading/re-keying off usePageId() on every
 * route change, so this one mount instance is correct on every route
 * without each page needing its own copy.
 *
 * Autosaves on every keystroke (no explicit Save button) — same
 * no-debounce convention ProfileSection's name/greeting/goal inputs
 * already use elsewhere in this app.
 */
export function StickyNoteWidget() {
  const { note, setText, remove } = useStickyNote();
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasNote = !!note && note.text.trim() !== '';

  function handleToggle() {
    setOpen((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen) {
        // Focus the textarea once it's actually in the DOM.
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
      return willOpen;
    });
  }

  function handleDelete() {
    remove();
    showNotification('Sticky note deleted', 'info');
    setOpen(false);
  }

  // Local-only Escape handling (not a global useKeyboardShortcut
  // registration) — only fires while the panel itself has focus, so it
  // can't collide with Quiz's or any other page's own key handling.
  function handlePanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="sticky-note-widget fixed bottom-6 right-6 z-40">
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Sticky note"
          onKeyDown={handlePanelKeyDown}
          className="
            mb-3 w-72 rounded-xl border border-border-color bg-bg-card
            shadow-[0_8px_30px_var(--shadow)] p-4 flex flex-col gap-3
          "
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Sticky note</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close sticky note"
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={note?.text ?? ''}
            onChange={(e) => setText(e.target.value)}
            placeholder="Jot something down about this page…"
            rows={5}
            aria-label="Sticky note text"
            className="
              w-full resize-none rounded-lg border border-border-color bg-bg-primary
              px-3 py-2 text-sm text-text-primary
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
            "
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {note ? `Saved ${new Date(note.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Not saved yet'}
            </span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!note}
              aria-label="Delete sticky note"
              className="
                inline-flex items-center gap-1 text-xs text-text-muted
                hover:text-red-500 disabled:opacity-30 disabled:pointer-events-none
                transition-colors
              "
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={hasNote ? 'Open sticky note (note present)' : 'Add sticky note'}
        aria-expanded={open}
        title={hasNote ? 'Sticky note' : 'Add a sticky note'}
        className="
          relative inline-flex items-center justify-center
          h-12 w-12 rounded-full
          bg-bg-card text-primary
          border border-border-color
          shadow-[0_4px_12px_var(--shadow)]
          transition-shadow duration-150
          hover:shadow-[0_6px_20px_var(--shadow)]
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
        "
      >
        <StickyNoteIcon size={20} fill={hasNote ? 'currentColor' : 'none'} fillOpacity={hasNote ? 0.15 : 0} />
        {hasNote && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent"
          />
        )}
      </button>
    </div>
  );
}
