# e2e/ — Visual regression testing (B-4a)

Playwright screenshot-diff suite. This is genuinely new infrastructure —
no Playwright suite existed anywhere in the project before this ticket
(confirmed by grep; the only prior hit was `@vitest/browser-playwright`,
Vitest's own browser-mode dependency, unrelated to a real test suite).

## What's here

- `playwright.config.ts` (project root) — builds and serves the real
  production bundle (`npm run build && npm run preview`), then runs
  every spec under `e2e/visual/` against it in Chromium.
- `e2e/visual/fixtures.ts` — a shared `test` that freezes the clock
  (avoids `buildGreetingText()`'s time-of-day text causing flaky diffs)
  and clears `localStorage` before every test (same "each test sets up
  its own state" discipline `src/test/setup.ts` already established for
  the Vitest suite).
- `e2e/visual/*.spec.ts` — one baseline screenshot per key page:
  Dashboard, Notes-index, Quiz-index, Gallery, a Note page (the
  `dsa-merge-sort` fixture folder), and the 404 page (covering B-6's
  Popular Notes section directly).

## Real, honest caveat: no baseline images are committed yet

Generating real baseline PNGs requires downloading a Chromium browser
binary (`npx playwright install chromium`), which needs network access
to `cdn.playwright.dev`. That domain isn't in this project's current
sandbox network allowlist — confirmed directly, the install command
fails with a `403 Host not in allowlist` error, not a code problem.

What IS verified, without needing the browser binary:
- `playwright.config.ts` loads correctly and every spec is discovered
  (`npx playwright test --list` → 6/6 tests found, 0 config errors).
- The app itself builds and serves correctly at the exact base path
  (`/ResourcesV2/`) this config points at (confirmed via the existing
  `npm run build && npm run preview` pipeline, unrelated to Playwright).

What still needs to happen, in an environment with real network access
(the real CI runner, or a local machine — not this sandbox):
```
npx playwright install chromium --with-deps
npm run test:visual:update   # generates the real baseline PNGs
```
Then commit the generated `e2e/visual/__screenshots__/**/*.png` files —
those baselines are the actual "visual regression testing" artifact;
everything in this PR is the harness around them, not a substitute for
them. `git status` after running `test:visual:update` should show
exactly 6 new PNGs, one per spec above.

## Running locally (once baselines exist)

```
npm run test:visual           # compare against committed baselines
npm run test:visual:report    # open the last HTML report (expected/actual/diff)
npm run test:visual:update    # intentionally changed something? regenerate baselines
```

## CI

`.github/workflows/ci.yml`'s `visual-regression` job runs this suite on
every push/PR, uploads the HTML report as a build artifact, and is
`continue-on-error: true` — a real visual diff still shows up clearly in
the uploaded report, it just doesn't fail the whole pipeline, matching
this ticket group's own stated "warnings don't block" philosophy (same
one `audit_content.py` already uses).
