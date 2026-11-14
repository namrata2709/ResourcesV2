import { useEffect, useRef } from 'react';
import { readFolderProgress, writeFolderProgress } from '../lib/readingProgress';

/**
 * hooks/useReadingProgress.ts — P0-3, "Continue Where You Left Off".
 *
 * Thin React wrapper around lib/readingProgress.ts, same
 * hook-wraps-plain-function split lib/README.md documents for
 * useLiveRegion()/lib/liveRegion.ts.
 *
 * Two responsibilities:
 *   1. Restore: once the note is ready to read, jump to whatever
 *      scrollY was last saved for this folder (no-op if nothing was
 *      saved, or nothing to restore beyond the top).
 *   2. Track: while the user scrolls, periodically persist the current
 *      scroll position + percent-read for this folder, and save a final
 *      snapshot on unmount/navigate-away so leaving mid-scroll isn't
 *      lost to the throttle window.
 *
 * `ready` exists because scroll-restore needs to happen after the
 * note's real content has a chance to lay out — restoring against a
 * still-collapsing/loading page would land somewhere wrong. Note.tsx
 * passes `Boolean(note && resolvedFile)`, i.e. "we know which note and
 * file we're rendering" — not full images/embeds-loaded, since nothing
 * in this app instruments that today; a slight remaining approximation,
 * not a false "exact restore" claim.
 */

const SAVE_THROTTLE_MS = 1000;

/** 0–100. Falls back to 100 ("fully read") when there's nothing to scroll — matches how a one-screen note has nowhere further to go. */
function computeScrollPercent(): number {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - doc.clientHeight;
  if (scrollable <= 0) return 100;
  return Math.max(0, Math.min(100, (window.scrollY / scrollable) * 100));
}

export function useReadingProgress(folder: string | null, ready: boolean): void {
  const lastSaveRef = useRef(0);

  // Restore: runs once per (folder, ready) becoming true.
  useEffect(() => {
    if (!folder || !ready) return;
    const saved = readFolderProgress(folder);
    if (saved && typeof saved.scrollY === 'number' && saved.scrollY > 0) {
      // Deferred a frame so the just-rendered content has settled into
      // its real layout height before we scroll against it.
      const raf = requestAnimationFrame(() => {
        window.scrollTo(0, saved.scrollY as number);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [folder, ready]);

  // Track: persist scroll position while reading, throttled; always
  // save a final snapshot on unmount (folder change / navigate away)
  // regardless of the throttle window, so leaving mid-scroll isn't lost.
  useEffect(() => {
    if (!folder || !ready) return;

    function save() {
      writeFolderProgress(folder as string, { percent: computeScrollPercent(), scrollY: window.scrollY });
    }

    function handleScroll() {
      const now = Date.now();
      if (now - lastSaveRef.current < SAVE_THROTTLE_MS) return;
      lastSaveRef.current = now;
      save();
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      save();
    };
  }, [folder, ready]);
}
