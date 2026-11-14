import { describe, it, expect, vi } from 'vitest';
import { createSwipeTracker } from './gestures';

/**
 * gestures.test.ts
 *
 * Covers createSwipeTracker in isolation (no React) — the plain-function
 * gesture logic that useSwipe.ts wraps, per lib/README.md's forward-compat
 * pattern. Built for T4-1a's mobile pinch/swipe reconciliation.
 */

function touch(clientX: number, clientY: number): Touch {
  return { clientX, clientY } as Touch;
}

function fireTouch(
  el: HTMLElement,
  type: string,
  touches: Touch[],
  changedTouches?: Touch[],
  timeStamp?: number,
) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', { value: touches });
  Object.defineProperty(event, 'changedTouches', { value: changedTouches ?? touches });
  if (timeStamp !== undefined) {
    Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  }
  el.dispatchEvent(event);
}

describe('createSwipeTracker', () => {
  it('fires onSwipeLeft for a leftward horizontal drag past the threshold', () => {
    const el = document.createElement('div');
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    createSwipeTracker(el, { onSwipeLeft, onSwipeRight, threshold: 50 });

    fireTouch(el, 'touchstart', [touch(200, 100)]);
    fireTouch(el, 'touchend', [], [touch(100, 100)]);

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('fires onSwipeRight for a rightward horizontal drag past the threshold', () => {
    const el = document.createElement('div');
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    createSwipeTracker(el, { onSwipeLeft, onSwipeRight, threshold: 50 });

    fireTouch(el, 'touchstart', [touch(100, 100)]);
    fireTouch(el, 'touchend', [], [touch(200, 100)]);

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('does not fire a swipe below the threshold', () => {
    const el = document.createElement('div');
    const onSwipeLeft = vi.fn();
    createSwipeTracker(el, { onSwipeLeft, threshold: 50 });

    fireTouch(el, 'touchstart', [touch(100, 100)]);
    fireTouch(el, 'touchend', [], [touch(120, 100)]);

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('does not fire a swipe when the drag is more vertical than horizontal', () => {
    const el = document.createElement('div');
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    createSwipeTracker(el, { onSwipeLeft, onSwipeRight, threshold: 50 });

    fireTouch(el, 'touchstart', [touch(100, 100)]);
    fireTouch(el, 'touchend', [], [touch(160, 300)]);

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('fires onPinchChange with the incremental scale factor on a two-finger pinch', () => {
    const el = document.createElement('div');
    const onPinchChange = vi.fn();
    createSwipeTracker(el, { onPinchChange });

    // Fingers start 100px apart...
    fireTouch(el, 'touchstart', [touch(0, 0), touch(100, 0)]);
    // ...and spread to 150px apart — a 1.5x incremental factor.
    fireTouch(el, 'touchmove', [touch(0, 0), touch(150, 0)]);

    expect(onPinchChange).toHaveBeenCalledTimes(1);
    expect(onPinchChange).toHaveBeenCalledWith(1.5);
  });

  it('does not treat a pinch gesture as a swipe on release', () => {
    const el = document.createElement('div');
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    createSwipeTracker(el, { onSwipeLeft, onSwipeRight, threshold: 50 });

    fireTouch(el, 'touchstart', [touch(0, 0), touch(100, 0)]);
    fireTouch(el, 'touchmove', [touch(0, 0), touch(150, 0)]);
    // One finger lifts, ending the pinch — must not fall through to swipe logic.
    fireTouch(el, 'touchend', [touch(150, 0)], [touch(0, 0)]);

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  // Thresholds verified against real notes-touch.js (per T5-1's ticket
  // note): 50px distance, 0.3px/ms minimum velocity, 100px max vertical
  // deviation (a hard rejection, not just "horizontal beats vertical"),
  // 10ms haptic pulse on a recognized swipe.
  describe('exact notes-touch.js thresholds', () => {
    it('does not fire a swipe below the 0.3px/ms minimum velocity, even past the distance threshold', () => {
      const el = document.createElement('div');
      const onSwipeLeft = vi.fn();
      createSwipeTracker(el, { onSwipeLeft, threshold: 50 });

      // 100px leftward drag over 1000ms = 0.1px/ms — well under 0.3.
      fireTouch(el, 'touchstart', [touch(200, 100)], undefined, 0);
      fireTouch(el, 'touchend', [], [touch(100, 100)], 1000);

      expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('fires a swipe at exactly the 0.3px/ms minimum velocity', () => {
      const el = document.createElement('div');
      const onSwipeLeft = vi.fn();
      createSwipeTracker(el, { onSwipeLeft, threshold: 50 });

      // 100px leftward drag over ~333ms ≈ 0.3px/ms.
      fireTouch(el, 'touchstart', [touch(200, 100)], undefined, 0);
      fireTouch(el, 'touchend', [], [touch(100, 100)], 333);

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('rejects a fast diagonal drag whose vertical deviation exceeds 100px, even though it is horizontal-dominant', () => {
      const el = document.createElement('div');
      const onSwipeLeft = vi.fn();
      createSwipeTracker(el, { onSwipeLeft, threshold: 50 });

      // deltaX = -200 (horizontal-dominant vs deltaY = 150), fast enough
      // to clear velocity — but 150px of vertical drift exceeds the
      // 100px hard cap, so this must still be rejected as a scroll.
      fireTouch(el, 'touchstart', [touch(300, 100)], undefined, 0);
      fireTouch(el, 'touchend', [], [touch(100, 250)], 50);

      expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('fires a 10ms haptic pulse via navigator.vibrate on a recognized swipe', () => {
      const el = document.createElement('div');
      const vibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
      createSwipeTracker(el, { onSwipeLeft: vi.fn(), threshold: 50 });

      fireTouch(el, 'touchstart', [touch(200, 100)], undefined, 0);
      fireTouch(el, 'touchend', [], [touch(100, 100)], 50);

      expect(vibrate).toHaveBeenCalledWith(10);
    });

    it('does not throw when navigator.vibrate is unsupported', () => {
      const el = document.createElement('div');
      Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
      const onSwipeLeft = vi.fn();
      createSwipeTracker(el, { onSwipeLeft, threshold: 50 });

      fireTouch(el, 'touchstart', [touch(200, 100)], undefined, 0);
      expect(() => fireTouch(el, 'touchend', [], [touch(100, 100)], 50)).not.toThrow();
      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });
  });

  it('destroy() removes all listeners so no further callbacks fire', () => {
    const el = document.createElement('div');
    const onSwipeLeft = vi.fn();
    const tracker = createSwipeTracker(el, { onSwipeLeft, threshold: 50 });
    tracker.destroy();

    fireTouch(el, 'touchstart', [touch(200, 100)]);
    fireTouch(el, 'touchend', [], [touch(100, 100)]);

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
