import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { loadBookmarkIds, saveBookmarkIds } from './bookmarks';

/**
 * pages/Note/BookmarksPanel.tsx — T5-3c-2's Tools > Bookmarks panel.
 *
 * T5-3c-2's own scope was the panel + the toggle, not the star control
 * that creates entries -- that's T5-3c-7 (now shipped), which depended
 * on this panel already existing ("T5-3c-2's Tools > Bookmarks panel
 * correctly lists sections bookmarked via this star").
 *
 * Storage shape (decided here originally, since bookmarksKey() existed
 * as a reserved builder with no shape attached yet, before T5-3c-7 gave
 * it a writer): a plain string[] of body-prose section `id`s, matching
 * the flat-array convention NOTES_FAVORITES_KEY/GALLERY_FAVORITES_KEY
 * already use. Display labels are NOT duplicated into storage -- each id
 * is looked up against the live DOM (the heading text of the real
 * element with that id) at render time, so there's exactly one source
 * of truth for a section's title (the rendered body-prose itself), not
 * two copies that could drift if a note's content is edited later.
 *
 * load/saveBookmarkIds now live in ./bookmarks.ts (T5-3c-7), shared
 * with BookmarkStar.tsx rather than kept as a private copy here.
 */

function sectionLabel(id: string): string {
  return document.getElementById(id)?.textContent?.trim() || id;
}

interface BookmarksPanelProps {
  pageId: string;
  open: boolean;
  onClose: () => void;
  /** Vertical offset in rem, so it can sit above whichever FAB opened it. */
  bottomOffsetRem?: number;
}

export function BookmarksPanel({ pageId, open, onClose, bottomOffsetRem = 1.5 }: BookmarksPanelProps) {
  const [ids, setIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setIds(loadBookmarkIds(pageId));
  }, [open, pageId]);

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

  if (!open) return null;

  function removeBookmark(id: string) {
    const next = ids.filter((existing) => existing !== id);
    setIds(next);
    saveBookmarkIds(pageId, next);
  }

  function goToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onClose();
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Bookmarked sections"
      className="
        fixed right-6 z-50 w-72 max-w-[90vw]
        bg-bg-card border border-border-color rounded-xl
        shadow-[0_8px_30px_var(--shadow)]
        flex flex-col py-1
      "
      style={{ bottom: `${bottomOffsetRem}rem` }}
    >
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Bookmarks</p>
        <button type="button" onClick={onClose} aria-label="Close bookmarks panel" className="text-text-muted hover:text-text-primary">
          <X size={14} />
        </button>
      </div>

      {ids.length === 0 ? (
        <p className="px-4 py-3 text-sm text-text-muted">No bookmarked sections yet.</p>
      ) : (
        <ul className="flex flex-col">
          {ids.map((id) => (
            <li key={id} className="flex items-center gap-1 px-2">
              <button
                type="button"
                onClick={() => goToSection(id)}
                className="flex-1 text-left px-2 py-2 text-sm text-text-primary hover:bg-bg-secondary rounded-md transition-colors truncate"
              >
                {sectionLabel(id)}
              </button>
              <button
                type="button"
                onClick={() => removeBookmark(id)}
                aria-label={`Remove bookmark: ${sectionLabel(id)}`}
                className="p-1.5 text-text-muted hover:text-accent"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
