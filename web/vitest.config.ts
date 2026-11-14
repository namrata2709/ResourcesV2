import { defineConfig, mergeConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

/**
 * Merges into the existing vite.config.ts rather than duplicating its
 * plugin setup (React, etc.) in a second config file — one source of
 * truth for how this project's code gets transformed, whether that's for
 * `npm run dev`/`build` or for `npm run test`.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      css: true,
      // B-4a: e2e/ holds Playwright specs (its own `test`/`expect` from
      // '@playwright/test', a different runner entirely) — Vitest's
      // default *.spec.ts glob would otherwise pick these up too and
      // try to run them with jsdom + Vitest's globals, which don't
      // match Playwright's page-fixture-based API at all. Exclude
      // explicitly rather than relying on the two runners never
      // colliding by accident.
      exclude: [...configDefaults.exclude, 'e2e/**'],
      // B-4b: JS code coverage tracking, reported in CI (non-blocking —
      // see .github/workflows/ci.yml's `js-coverage` job).
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json-summary', 'lcov'],
        reportsDirectory: './coverage',
        // Config/type-only/barrel files add no real coverage signal —
        // excluding them keeps the percentage meaningful (a 100%-covered
        // barrel file that's just re-exports would otherwise quietly
        // inflate the overall number without reflecting any real test
        // work). Test files and e2e/ (a separate runner, see the
        // `exclude` above) are excluded for the same reason coverage
        // tools never count a test asserting on itself.
        exclude: [
          ...(configDefaults.coverage?.exclude ?? []),
          'e2e/**',
          'src/test/**',
          'src/**/index.ts',
          'src/main.tsx',
          'src/vite-env.d.ts',
          '**/*.d.ts',
        ],
      },
    },
  }),
);
