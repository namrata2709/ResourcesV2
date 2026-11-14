import { useCallback, useEffect } from 'react';
import { announceToLiveRegion, ensureLiveRegion } from '../lib/liveRegion';

/**
 * useLiveRegion — thin React wrapper around lib/liveRegion.ts.
 *
 * Interface/contract (per T3-1): returns { announce }, used identically
 * by every component that needs to announce something to screen readers.
 * Every later ticket (T3-2, T4-1, T5-1) should import THIS hook rather
 * than building its own live region — see src/lib/README.md.
 *
 * The live region node is created as soon as this hook mounts (not
 * lazily on the first announce() call) — a live region needs to already
 * exist in the DOM with aria-live set *before* the first content change,
 * or some screen readers won't reliably announce it.
 *
 * Usage:
 *   const { announce } = useLiveRegion();
 *   announce('Theme changed to dark mode');
 */
export function useLiveRegion() {
  useEffect(() => {
    ensureLiveRegion();
  }, []);

  const announce = useCallback((message: string) => {
    announceToLiveRegion(message);
  }, []);

  return { announce };
}
