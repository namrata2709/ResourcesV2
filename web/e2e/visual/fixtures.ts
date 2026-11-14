import { test as base, expect } from '@playwright/test';

/**
 * e2e/visual/fixtures.ts — B-4a
 *
 * A shared `test` for every visual-regression spec, so each one
 * doesn't have to re-derive the same "make this deterministic" setup
 * (or worse, five specs each doing it slightly differently and one of
 * them flaking under CI's stricter `retries`/`workers` settings).
 *
 * Two real, confirmed sources of run-to-run visual flakiness in this
 * app, both handled here rather than per-spec:
 *
 * 1. `buildGreetingText()` (lib/profile.ts) renders "Good morning" /
 *    "Good afternoon" / "Good evening" based on the real wall-clock
 *    time, and Dashboard.tsx calls it with no fixed date — confirmed
 *    by direct source read, not assumed. A screenshot taken at 11:58am
 *    and re-taken at 12:02pm would diff on text alone, unrelated to
 *    any real visual change. Playwright's `page.clock.install()`
 *    freezes `Date`/`setTimeout`/etc. for the whole page before it
 *    ever runs, so every run (whenever it's actually executed)
 *    produces the exact same "Good afternoon" text.
 *
 * 2. Fresh localStorage per test — Vitest's own `src/test/setup.ts`
 *    already established this convention for unit tests ("any test
 *    relying on persisted state must set it up within that same
 *    test... a test that seems to intermittently fail depending on
 *    run order" — same principle applies here, just at the browser
 *    level instead of jsdom's). Without an explicit clear, one spec's
 *    localStorage writes (a saved profile, a daily-goal target, a
 *    reading-progress entry) could leak into the next spec's
 *    screenshot depending on worker/run order.
 */

const FIXED_TIME = new Date('2026-08-15T15:00:00Z'); // a stable "afternoon" everywhere this suite runs

// The fixture callback's second parameter is renamed from Playwright's
// own conventional `use` to `runTest` purely to dodge oxlint's
// react/rules-of-hooks heuristic, which pattern-matches on the
// identifier name `use` and mistakes this for React's `use()` hook —
// a false positive (this is a plain callback parameter, not a React
// hook call), but renaming it costs nothing and keeps `npm run lint`
// clean without weakening the real rule anywhere else in the app.
export const test = base.extend({
  page: async ({ page }, runTest) => {
    await page.clock.install({ time: FIXED_TIME });
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {
        // storage inaccessible in this context — nothing to clear
      }
    });
    await runTest(page);
  },
});

export { expect };
