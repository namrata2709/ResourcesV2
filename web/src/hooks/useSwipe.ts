import { useCallback, useEffect, useRef, useState } from 'react';
import { createSwipeTracker, type SwipeTrackerOptions } from '../lib/gestures';

/**
 * useSwipe — thin React wrapper around lib/gestures.ts's
 * createSwipeTracker, per lib/README.md's forward-compat note (the
 * gesture-recognition *behavior* lives in lib/ as a plain function; this
 * hook just wires it to a DOM element via a ref).
 *
 * Options are read through a ref and re-assigned every render, so callers
 * can pass fresh closures each render (e.g. `onSwipeLeft: () =>
 * navigate(1)` capturing the latest `sorted`/`lightboxIndex`) without the
 * underlying tracker being torn down and recreated.
 *
 * Uses a callback ref (backed by state) rather than a plain `useRef`, so
 * attachment isn't tied to "the hook's very first render" — it re-runs
 * whenever the DOM node the ref is attached to actually changes. A plain
 * `useRef` + `useEffect(..., [])` only works if the target element is
 * already mounted the first time this hook's owner renders; that's true
 * for Gallery's Lightbox (mounts fresh, gestureRef's div in the same
 * render), but not for Quiz, where the questions container only mounts
 * once `status` flips from 'loading' to 'ready' — several renders after
 * this hook is first called. Gap caught by Quiz.test.tsx's swipe-
 * navigation test.
 */
export function useSwipe<T extends HTMLElement>(options: SwipeTrackerOptions) {
  const [node, setNode] = useState<T | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const ref = useCallback((el: T | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!node) return;
    const tracker = createSwipeTracker(node, {
      threshold: optionsRef.current.threshold,
      onSwipeLeft: () => optionsRef.current.onSwipeLeft?.(),
      onSwipeRight: () => optionsRef.current.onSwipeRight?.(),
      onPinchChange: (factor) => optionsRef.current.onPinchChange?.(factor),
    });
    return () => tracker.destroy();
  }, [node]);

  return ref;
}
