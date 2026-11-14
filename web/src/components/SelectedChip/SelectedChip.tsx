/**
 * SelectedChip — a removable chip representing one active filter
 * selection (category, type, tag, topic, whatever a given listing page
 * filters by). Extracted out of NotesIndex (T3-2a) specifically so
 * QuizIndex (T3-2b) and any future listing page import this SAME
 * component rather than a visually-matching copy — "same components, same
 * design, by construction" per T3-2b's own ticket language. A copy would
 * look identical today and silently drift the first time either page's
 * styling changes.
 *
 * This is Finding 1's element: background is --accent, NOT --primary —
 * that was the actual regression caught once already in vanilla (see
 * notes-index.css's own comment trail on this exact class). Deliberately
 * a different color from a card's own category-chip, which stays
 * --primary — these are different elements, not a color that "should"
 * be made consistent.
 */
export function SelectedChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="selected-chip inline-flex items-center gap-1 rounded-full bg-accent text-white text-sm px-3 py-1"
      style={{ backgroundColor: 'var(--accent)' }}
    >
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label} filter`} className="hover:opacity-75">
        ✕
      </button>
    </span>
  );
}
