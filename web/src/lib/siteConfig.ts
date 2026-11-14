/**
 * lib/siteConfig.ts
 *
 * site-config.js's `basePath`/path-helper functions don't map 1:1 onto a
 * React app — there's no per-page <script> injection to prefix here, Vite
 * already rewrites root-absolute references in index.html and the build
 * output at build time (see vite.config.ts's `base` option). What DOES
 * still apply is the underlying concept: one place that knows the site's
 * base URL and can build data/asset paths off of it, so nothing else has
 * to hardcode "/ResourcesV2/" (or worse, disagree with vite.config.ts
 * about it).
 *
 * import.meta.env.BASE_URL is Vite's own resolution of vite.config.ts's
 * `base` — always trailing-slash-terminated (e.g. "/ResourcesV2/", or "/"
 * for a root deploy) — so this file has exactly one source for it, not a
 * second hardcoded copy of the string.
 *
 * FLAGGED, NOT DECIDED: this is now the THIRD implementation of "the
 * site's base URL" across the stack — js/shared/site-config.js (vanilla),
 * utils/site_config.py (T0-1), and this file. Different languages, so
 * they genuinely can't share one file directly — but it may be worth
 * generating one of them from another (or all three from a single JSON/
 * env value) at build time rather than hand-keeping three copies in sync.
 * Not resolved here; worth a moment's thought before T3-3 onward starts
 * depending on this.
 */

/** Trailing-slash-terminated base path, e.g. "/ResourcesV2/" or "/". */
export const BASE_URL: string = import.meta.env.BASE_URL;

function joinPath(...segments: string[]): string {
  const base = BASE_URL.replace(/\/$/, '');
  const rest = segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return rest ? `${base}/${rest}` : `${base}/`;
}

/**
 * Resolves a path under public/data, same role as site-config.js's
 * dataPath() — e.g. dataPath('config', 'navigation-url.json') ->
 * "/ResourcesV2/data/config/navigation-url.json".
 */
export function dataPath(...segments: string[]): string {
  return joinPath('data', ...segments);
}

/**
 * Resolves any other root-relative asset path against the site's base,
 * e.g. assetPath('icons', 'logo.png') -> "/ResourcesV2/icons/logo.png".
 */
export function assetPath(...segments: string[]): string {
  return joinPath(...segments);
}
