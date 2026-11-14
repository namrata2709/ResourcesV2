export interface SwipeTrackerOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /**
   * Called continuously during a two-finger pinch with the INCREMENTAL
   * scale factor since the previous move event (not the cumulative
   * gesture ratio) — callers do `setZoom(z => clamp(z * factor))` without
   * needing to track a separate "zoom at gesture start" value themselves.
   */
  onPinchChange?: (scaleFactor: number) => void;
  /** Minimum horizontal distance (px) for a single-finger swipe to count. Default 50. */
  threshold?: number;
  /** Minimum horizontal velocity (px/ms) for a single-finger swipe to count. Default 0.3. */
  minVelocity?: number;
  /** Maximum vertical deviation (px) allowed before a swipe is rejected as a scroll. Default 100. */
  maxVerticalDeviation?: number;
  /** Haptic-feedback duration (ms) fired on a recognized swipe, where supported. Default 10. */
  hapticMs?: number;
}

interface TrackerHandle {
  destroy: () => void;
}

function distanceBetween(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * createSwipeTracker — framework-agnostic touch-gesture recognizer built
 * for the Gallery lightbox's "mobile pinch/swipe reconciliation" (T4-1a,
 * originally flagged in T3-1b). Lives here per this folder's README
 * forward-compat note: the *behavior* is a plain function with no
 * React/hooks/DOM-framework assumptions beyond the element it's attached
 * to — src/hooks/useSwipe.ts is a thin wrapper around this, not a
 * reimplementation of it.
 *
 * Recognizes exactly two gestures:
 *   - single-finger horizontal swipe -> onSwipeLeft/onSwipeRight
 *   - two-finger pinch -> onPinchChange (incremental factor per move event)
 *
 * Deliberately does NOT implement drag-to-pan or double-tap-to-zoom —
 * those remain explicitly deferred per Gallery.tsx's own module comment;
 * this only resolves the swipe-vs-pinch-vs-navigation conflict that was
 * flagged as needing reconciliation, not the full deferred gesture set.
 *
 * Thresholds match notes-touch.js exactly (verified against real source,
 * not approximated) — a swipe only fires when ALL of these hold:
 *   - horizontal distance >= 50px (threshold)
 *   - vertical deviation  <= 100px (maxVerticalDeviation) — a straight
 *     downward scroll that happens to also drift sideways past the
 *     distance threshold should NOT register as a swipe; this is a hard
 *     rejection, not just "horizontal beats vertical"
 *   - horizontal velocity >= 0.3px/ms (minVelocity) — a slow drag that
 *     happens to cover 50px shouldn't count as a deliberate swipe
 * On a recognized swipe, fires a 10ms haptic pulse (hapticMs) via
 * navigator.vibrate where supported — a no-op everywhere else (desktop
 * browsers, iOS Safari) rather than an error.
 */
export function createSwipeTracker(el: HTMLElement, options: SwipeTrackerOptions): TrackerHandle {
  const threshold = options.threshold ?? 50;
  const minVelocity = options.minVelocity ?? 0.3;
  const maxVerticalDeviation = options.maxVerticalDeviation ?? 100;
  const hapticMs = options.hapticMs ?? 10;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let tracking = false;
  let pinching = false;
  let lastPinchDistance = 0;

  function fireHaptic() {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(hapticMs);
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      // A second finger landing mid-swipe means the gesture is actually a
      // pinch, not a swipe — reset any in-progress swipe tracking so the
      // touchend handler below doesn't misfire a navigate on release.
      pinching = true;
      tracking = false;
      lastPinchDistance = distanceBetween(e.touches[0], e.touches[1]);
      return;
    }
    if (e.touches.length === 1) {
      pinching = false;
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = e.timeStamp;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (pinching && e.touches.length === 2) {
      const distance = distanceBetween(e.touches[0], e.touches[1]);
      if (lastPinchDistance > 0) {
        options.onPinchChange?.(distance / lastPinchDistance);
      }
      lastPinchDistance = distance;
    }
    // Single-finger moves are read on touchend (delta from start), not
    // continuously here — the lightbox has no drag-to-pan to drive.
  }

  function handleTouchEnd(e: TouchEvent) {
    if (pinching) {
      if (e.touches.length < 2) {
        pinching = false;
        lastPinchDistance = 0;
      }
      return;
    }
    if (!tracking) return;
    tracking = false;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const deltaTime = Math.max(1, e.timeStamp - startTime); // guard against div-by-zero on a same-tick end
    const velocity = Math.abs(deltaX) / deltaTime;

    const pastDistance = Math.abs(deltaX) >= threshold;
    const withinVerticalDeviation = Math.abs(deltaY) <= maxVerticalDeviation;
    const pastVelocity = velocity >= minVelocity;

    if (pastDistance && withinVerticalDeviation && pastVelocity) {
      fireHaptic();
      if (deltaX < 0) options.onSwipeLeft?.();
      else options.onSwipeRight?.();
    }
  }

  el.addEventListener('touchstart', handleTouchStart, { passive: true });
  el.addEventListener('touchmove', handleTouchMove, { passive: true });
  el.addEventListener('touchend', handleTouchEnd, { passive: true });
  el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  return {
    destroy() {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    },
  };
}
