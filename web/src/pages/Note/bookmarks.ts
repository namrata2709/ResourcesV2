/**
 * pages/Note/bookmarks.ts — shared load/save for per-section bookmark
 * state (T5-3c-7). Storage shape decided in BookmarksPanel.tsx (T5-3c-2):
 * a plain string[] of body-prose section `id`s under `bookmarksKey(pageId)`,
 * matching the flat-array convention NOTES_FAVORITES_KEY/
 * GALLERY_FAVORITES_KEY already use. Extracted to its own module so the
 * panel (reader) and the star control (writer, this ticket) share one
 * implementation instead of two copies that could drift.
 */

import { bookmarksKey } from '../../lib/storageKeys';

export function loadBookmarkIds(pageId: string): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(bookmarksKey(pageId)) || '[]');
    return Array.isArray(saved) ? saved.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function saveBookmarkIds(pageId: string, ids: string[]): void {
  try {
    localStorage.setItem(bookmarksKey(pageId), JSON.stringify(ids));
  } catch {
    // ignore — matches the site-wide silent-fail storage pattern
  }
}

export function toggleBookmarkId(pageId: string, sectionId: string): string[] {
  const current = loadBookmarkIds(pageId);
  const next = current.includes(sectionId)
    ? current.filter((id) => id !== sectionId)
    : [...current, sectionId];
  saveBookmarkIds(pageId, next);
  return next;
}
