import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// GitHub's runners are slower than a dev machine; testing-library's default 1000ms wait
// (waitFor / findBy*) is too tight there and caused an intermittent failure in CI.
// This only changes how long a *failing* wait takes to give up, never a passing one.
configure({ asyncUtilTimeout: 4000 });

/**
 * Global test setup, loaded once via vitest.config.ts's setupFiles.
 *
 * - '@testing-library/jest-dom/vitest' extends Vitest's `expect` with the
 *   jest-dom matchers (toBeInTheDocument, toHaveAttribute, etc.) — the
 *   /vitest subpath (not the bare package) is what jest-dom ships for
 *   Vitest specifically, since Vitest's `expect` isn't the same object
 *   Jest's auto-extend targets.
 * - RTL's `cleanup()` unmounts anything rendered by a previous test and
 *   removes it from the DOM. Without this, tests bleed into each other —
 *   a later test could accidentally query an element a previous test
 *   left behind, including things like the shared #app-live-region node
 *   from lib/liveRegion.ts, which is intentionally NOT removed by
 *   `announceToLiveRegion()` between calls (it's meant to persist across
 *   the app's lifetime, so tests need to reset it explicitly instead).
 */
afterEach(() => {
  cleanup();
  document.getElementById('app-live-region')?.remove();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  // T5-4a: useFullscreenChrome toggles this on <body> — a test that
  // exercises fullscreen without triggering its own cleanup (e.g. one
  // that unmounts mid-fullscreen) shouldn't leak the attribute into the
  // next test's DOM.
  document.body.removeAttribute('data-fullscreen-chrome-hidden');
});
