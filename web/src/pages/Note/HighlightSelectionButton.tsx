/**
 * pages/Note/HighlightSelectionButton.tsx — P1-1: the "Highlight"
 * button that appears near an active text selection inside body-prose
 * content. Deliberately explicit (a button the person clicks), not an
 * auto-save-on-mouseup -- auto-saving would highlight every incidental
 * selection (e.g. selecting text to copy it), which isn't what "add a
 * highlight" should mean.
 *
 * Positioning: fixed, anchored just above the selection's own bounding
 * rect (from `Range.getBoundingClientRect()`), clamped so it doesn't
 * run off the top/left of the viewport on a small screen.
 */

import { Highlighter } from 'lucide-react';

interface HighlightSelectionButtonProps {
  top: number;
  left: number;
  onClick: () => void;
}

export function HighlightSelectionButton({ top, left, onClick }: HighlightSelectionButtonProps) {
  return (
    <button
      type="button"
      // Selection would otherwise collapse the instant this button
      // receives focus/mousedown, before onClick ever fires.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ position: 'fixed', top: Math.max(8, top), left: Math.max(8, left) }}
      className="z-50 flex items-center gap-1.5 rounded-full border border-border-color bg-bg-card px-3 py-1.5 text-sm font-medium text-text-primary shadow-lg hover:border-accent hover:text-accent"
    >
      <Highlighter size={14} aria-hidden="true" />
      Highlight
    </button>
  );
}
