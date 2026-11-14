import { defineConfig, devices } from '@playwright/test';

/**
 * playwright.config.ts — B-4a (Visual regression testing).
 *
 * Real gap this fills: no Playwright suite existed anywhere in the
 * project before this ticket (confirmed by grep across the whole repo
 * — the only prior "playwright" hit was `@vitest/browser-playwright`,
 * vitest's own browser-mode dependency, not a real Playwright test
 * suite). B-4a's own ticket text says "added to existing Playwright
 * suites" — there weren't any, so this file (and everything under
 * `e2e/`) is the suite being added to, not an addition to something
 * that already existed. Flagging this here rather than silently
 * treating "existing suites" as true.
 *
 * Screenshot-diff config specifics:
 *   - `expect.toHaveScreenshot` is Playwright's real built-in
 *     screenshot-diff mechanism (pixel comparison against a committed
 *     baseline PNG, stored under e2e/**\/__screenshots__/) — no extra
 *     tooling needed, this IS "visual regression testing" for
 *     Playwright projects.
 *   - `animations: 'disabled'` — freezes CSS animations/transitions at
 *     their end state before the screenshot, so the appearance-toggle
 *     mentioned in P0-2 (or anything else animated) can't cause a
 *     flaky, timing-dependent diff.
 *   - `maxDiffPixelRatio` — a small non-zero tolerance (font
 *     antialiasing differs slightly even between two runs on the same
 *     machine/browser version) without being loose enough to miss a
 *     real visual regression.
 *
 * Non-blocking, per B-4's own stated philosophy for this whole ticket
 * group ("matching audit_content.py's existing 'warnings don't block'
 * philosophy") — see .github/workflows/ci.yml's `continue-on-error` on
 * the visual-regression step, not anything in this file itself (a
 * failed `expect()` inside a spec is still a real, visible failure in
 * the HTML report; "non-blocking" describes whether that failure stops
 * the overall CI run, which is a CI-workflow-level decision, not a
 * Playwright-config one).
 */

const PORT = 4173;
// Matches vite.config.ts's real `base` exactly — GitHub Pages project-
// subpath hosting (see that file's own comment). Getting this wrong
// would make every screenshot 404 against a blank page instead of the
// real app.
const BASE_PATH = '/ResourcesV2/';
const BASE_URL = `http://localhost:${PORT}${BASE_PATH}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    // HTML report is the real "screenshot diff report" B-4a's own
    // Done-when asks for — Playwright's report viewer shows
    // expected/actual/diff side by side for any failed
    // toHaveScreenshot(), out of the box.
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  // Keeps baseline PNGs colocated with the spec that owns them, one
  // subfolder per spec file, rather than one flat directory where
  // dashboard.png/notes-index.png etc. all fight for the same
  // namespace as the suite grows.
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{testFileName}/{arg}{ext}',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Builds and serves the real production bundle (not `vite dev`) —
  // visual regression should catch build-time issues too (e.g. a CSS
  // purge dropping a class dev mode never exercised), and `base` path
  // resolution only behaves identically to the deployed site in a real
  // built-and-served output, per vite.config.ts's own comment about
  // dev-server vs. built-output being genuinely different code paths
  // (T0-5's manual test cases already flagged this).
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
