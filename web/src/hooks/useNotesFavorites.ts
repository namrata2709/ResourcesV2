import { useCallback, useEffect, useState } from 'react';
import { NOTES_FAVORITES_KEY } from '../lib/storageKeys';

/**
 * hooks/useNotesFavorites.ts — T5-3c-5, "Cross-tab Favorites sync".
 *
 * Before this ticket, NotesIndex.tsx (T3-3) and Note.tsx (T5-3a) each
 * had their own local `loadFavorites()`/`saveFavorites()`/`useState`/
 * `toggleFavorite()` copy against the same `notesFavorites` key — two
 * near-identical implementations of the same thing, per this project's
 * own "second occurrence becomes shared" rule (see CHANGELOG.md). This
 * hook is that consolidation, done at the same time cross-tab sync was
 * added rather than bolting sync onto both copies separately.
 *
 * Cross-tab mechanism: the browser's own `storage` event already fires
 * in every OTHER tab/window sharing this origin whenever localStorage
 * changes — and, by spec, never fires in the tab that made the write
 * itself. That means this listener only ever needs to re-sync from a
 * genuinely external change; it doesn't have to distinguish "did I just
 * write this" from "another tab wrote this" itself. Filtered to
 * `e.key === NOTES_FAVORITES_KEY` so a change to some other key
 * (theme, exam mode, a different favorites list) doesn't cause a
 * needless re-sync/re-render here.
 *
 * `announce` is optional and left to the caller (NotesIndex passes its
 * result-count announcer, Note.tsx passes its own) rather than this
 * hook importing useLiveRegion itself — keeps this hook usable in a
 * context that doesn't want announcements without dragging that
 * dependency along regardless.
 */

function readFavorites(): Set<string> {
  try {
    const saved = JSON.parse(localStorage.getItem(NOTES_FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function writeFavorites(set: Set<string>): void {
  try {
    localStorage.setItem(NOTES_FAVORITES_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore — matches the site-wide silent-fail storage pattern
  }
}

export interface UseNotesFavoritesOptions {
  /** Called with the same "Added X to favorites" / "Removed X from
   * favorites" phrasing both prior copies already used. Omit for a
   * caller that doesn't want announcements. */
  announce?: (message: string) => void;
}

export interface UseNotesFavoritesResult {
  favorites: Set<string>;
  toggleFavorite: (folder: string, title: string) => void;
}

export function useNotesFavorites({ announce }: UseNotesFavoritesOptions = {}): UseNotesFavoritesResult {
  const [favorites, setFavorites] = useState<Set<string>>(readFavorites);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== NOTES_FAVORITES_KEY) return;
      setFavorites(readFavorites());
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleFavorite = useCallback(
    (folder: string, title: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        const willFavorite = !next.has(folder);
        if (willFavorite) next.add(folder);
        else next.delete(folder);
        writeFavorites(next);
        announce?.(willFavorite ? `Added ${title} to favorites` : `Removed ${title} from favorites`);
        return next;
      });
    },
    [announce],
  );

  return { favorites, toggleFavorite };
}
