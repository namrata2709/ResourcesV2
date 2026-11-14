import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project sites are served from /<repo>/, not from root.
  // Vite rewrites root-absolute asset/script hrefs in index.html (and
  // build output paths) to be prefixed with this at build time.
  base: '/ResourcesV2/',
  plugins: [
    react(),
    // P5-1 (Offline Mode). Workbox (via vite-plugin-pwa) generates the
    // real service worker at build time rather than a hand-rolled one --
    // correct cache-busting across builds (the real risk a hand-rolled
    // version would get subtly wrong) is exactly the kind of "well-
    // understood problem, don't reinvent it" case this codebase already
    // reaches for a library on elsewhere (docx/pptxgenjs for exports,
    // flexsearch for search) rather than hand-rolling.
    //
    // injectRegister: null -- registration is written explicitly in
    // lib/serviceWorker.ts (called from main.tsx) rather than auto-
    // injected, matching this codebase's existing "thin explicit
    // wrapper, not black-box auto-injection" convention (see
    // lib/analytics.ts's own gtag.js wrapper for the same pattern).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      workbox: {
        // Precache the built JS/CSS/HTML app shell -- this is what
        // makes ANY page reachable offline at all after a first visit:
        // without the shell cached, an offline reload has no bundle to
        // even boot React Router with. Cache naming/versioning here is
        // Workbox's real precache-manifest mechanism (content-hashed
        // per file, revisioned per build), not a hand-maintained
        // version string -- this is what "cache invalidates on a new
        // build, doesn't serve stale assets forever" (P5-1's own manual
        // test) actually requires, and is easy to get subtly wrong by
        // hand (see prior art: cache-versioning bugs are one of the
        // most common real-world service-worker mistakes).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],

        // SPA fallback: an offline hard-reload/direct-navigation to a
        // client-routed path (e.g. /ResourcesV2/notes/dsa-merge-sort)
        // has no matching precached file of its own -- serve the
        // cached app shell instead and let React Router (already
        // running once the shell boots) resolve the route the same way
        // it would online. Only applies to real navigations (mode:
        // 'navigate'), never to the fetch() calls below, so it doesn't
        // interfere with JSON/data runtime caching.
        navigateFallback: '/ResourcesV2/index.html',

        // Runtime caching for content that changes independently of
        // the JS bundle and isn't known at build time (every note/quiz
        // JSON file) -- StaleWhileRevalidate serves the last-cached
        // copy instantly (works offline, matches P5-1's "previously-
        // visited notes/quizzes still render" test) while refetching in
        // the background when online, so a visited note's content
        // doesn't go stale forever the way a CacheFirst policy would.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/ResourcesV2/data/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'notebook-buddy-data',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
              // Without this, Workbox's default cache-put logic caches
              // ANY response that fetch() resolves with, including a
              // real 404/500 -- fetch() only rejects on a network-level
              // failure, not an HTTP error status, so an errored JSON
              // response looks "safe to cache" by default. Once that
              // happened once (a bad deploy, a race during a GH Pages
              // rollout, anything transient), StaleWhileRevalidate would
              // keep serving that cached error on every subsequent visit
              // for up to maxAgeSeconds above -- even after the real
              // file was back and correct on the server. Restricting to
              // [0, 200] (0 = opaque cross-origin, 200 = real success)
              // means a bad response is never written to this cache in
              // the first place, so this specific failure mode can't
              // recur regardless of what caused the original 404.
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Icons/illustrations rarely change once shipped -- CacheFirst
            // avoids a network round-trip for them once cached, unlike
            // the data cache above which deliberately keeps refreshing.
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/ResourcesV2/icons/') ||
              url.pathname.startsWith('/ResourcesV2/illustrations/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'notebook-buddy-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 24 * 60 * 60 },
              // Same reasoning as the data cache above -- CacheFirst
              // makes this even more important, since CacheFirst won't
              // even attempt a network refetch once something is cached
              // (unlike StaleWhileRevalidate, which at least retries in
              // the background). A cached 404 here would be permanently
              // stuck until expiration with no self-healing revalidation
              // at all.
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: false, // public/site.webmanifest already exists and is linked in index.html
    }),
  ],
})
