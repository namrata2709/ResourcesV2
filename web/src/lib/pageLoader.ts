/**
 * lib/pageLoader.ts
 *
 * Ports page-loader.js's behavior: hide #pageLoader once the page is
 * ready, with a 5-second safety timeout so a slow/broken load never
 * leaves the loader stuck covering the page forever. Vanilla pages hid it
 * on `window`'s `load` event; a React SPA has no equivalent single load
 * event tied to "the app is actually ready to look at" — createRoot()'s
 * initial render commit is the closest equivalent — so this module is
 * called explicitly from main.tsx right after the initial render instead
 * of from a `load` listener. R4-2's three theme GIFs are the visual asset
 * shown inside #pageLoader; this file is only the show/hide behavior.
 */

const LOADER_ID = 'pageLoader';
const HIDDEN_CLASS = 'page-loader--hidden';
/** Same safety-timeout duration as page-loader.js. */
export const SAFETY_TIMEOUT_MS = 5000;

let hidden = false;

/**
 * Hides #pageLoader, if present and not already hidden. Idempotent and
 * safe to call more than once (the mount-time call and the safety
 * timeout both call it; only the first has any effect).
 */
export function hidePageLoader(): void {
  if (hidden) return;
  hidden = true;
  const el = document.getElementById(LOADER_ID);
  if (!el) return;
  el.classList.add(HIDDEN_CLASS);
  el.setAttribute('aria-hidden', 'true');
}

/**
 * Arms the same safety-net timeout page-loader.js had: if something
 * (a slow chunk, an error thrown before the app ever calls
 * hidePageLoader() itself) prevents the normal hide path from running,
 * force it after SAFETY_TIMEOUT_MS regardless.
 */
export function armPageLoaderSafetyTimeout(): () => void {
  const timer = window.setTimeout(hidePageLoader, SAFETY_TIMEOUT_MS);
  return () => window.clearTimeout(timer);
}

/** Test-only: lets tests reset the module-level hidden guard between runs. */
export function _resetPageLoaderForTests(): void {
  hidden = false;
}
