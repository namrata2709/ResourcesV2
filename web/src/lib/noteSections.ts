/**
 * lib/noteSections.ts — T5-3c-4's section enumeration, shared with
 * BookmarksPanel's (T5-3c-2) existing "look the id up in the live DOM"
 * convention rather than a second one.
 *
 * BookmarksPanel already established the pattern for a *single* known
 * id (`sectionLabel()` in BookmarksPanel.tsx: `document.getElementById(id)
 * ?.textContent`). T5-3c-4's search needs the same lookup but for
 * *every* section on the page at once, so this factors that one step
 * out to a shared helper rather than duplicating a second DOM-walking
 * implementation. BookmarksPanel itself is left untouched — it doesn't
 * need to enumerate, only to look up ids it already has.
 *
 * "Section" here means exactly the same thing BookmarksPanel's storage
 * shape already assumes: any element in the note's content with a real
 * `id` — body-prose headings/collapsibles (BodyProse.tsx sets these)
 * plus each module's own static `id="notes-<module>-heading"`. Scoped
 * to `#note-content` (Note.tsx's wrapper around the module list) so
 * this never picks up FAB/panel/header ids that aren't part of the
 * note's own content — the concrete mechanism behind T5-3c-4's "no
 * cross-note leak" requirement, since a container scoped to one note's
 * own rendered DOM structurally can't return another note's sections.
 */

export interface NoteSection {
  id: string;
  label: string;
}

export const NOTE_CONTENT_CONTAINER_ID = 'note-content';

/**
 * Snapshot of every real, non-empty `[id]` element currently rendered
 * inside the note content container, in document order. Recomputed on
 * demand (not cached) — callers that need a fresh view after
 * async-loaded content mounts (McqModule/BodyProseModule/etc. all fetch
 * their own JSON) just call this again rather than this module tracking
 * mutations itself.
 */
export function getNoteSections(containerId: string = NOTE_CONTENT_CONTAINER_ID): NoteSection[] {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const seen = new Set<string>();
  const sections: NoteSection[] = [];
  container.querySelectorAll<HTMLElement>('[id]').forEach((el) => {
    const label = el.textContent?.trim();
    if (!label || seen.has(el.id)) return;
    seen.add(el.id);
    sections.push({ id: el.id, label });
  });
  return sections;
}
