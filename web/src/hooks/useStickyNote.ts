import { useCallback, useEffect, useState } from 'react';
import { usePageId } from './usePageId';
import { type StickyNote, getStickyNote, saveStickyNote, deleteStickyNote } from '../lib/stickyNotes';

/**
 * useStickyNote — thin React wrapper around lib/stickyNotes.ts, same shape
 * as useDailyGoal()/useAppearance(). Re-reads from storage whenever the
 * route (and therefore the page id) changes, so the widget always reflects
 * the note for the page you're actually on, not a stale one carried over
 * from the page you navigated away from.
 */
export function useStickyNote() {
  const pageId = usePageId();
  const [note, setNote] = useState<StickyNote | null>(() => getStickyNote(pageId));

  // Re-sync on navigation — pageId changing means a different storage key.
  useEffect(() => {
    setNote(getStickyNote(pageId));
  }, [pageId]);

  const setText = useCallback(
    (text: string) => {
      setNote(saveStickyNote(pageId, text));
    },
    [pageId],
  );

  const remove = useCallback(() => {
    deleteStickyNote(pageId);
    setNote(null);
  }, [pageId]);

  return { pageId, note, setText, remove };
}
