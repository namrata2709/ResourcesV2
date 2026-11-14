/**
 * lib/analytics.ts
 *
 * Ports analytics.js's behavior: that script self-injects gtag.js on every
 * vanilla page and fires an implicit page_view on load. A full page load
 * happens once per vanilla HTML file, so that implicit page_view was
 * effectively "one per page" for free.
 *
 * React Router's client-side navigation doesn't reload the document, so
 * gtag's own automatic page_view (sent when `config` first runs) only ever
 * fires for the very first route. Every navigation after that is invisible
 * to analytics unless something explicitly tells GA a new page_view
 * happened — that's why `send_page_view: false` is set below and
 * trackPageView() exists to be called on every route change (see
 * hooks/useAnalyticsPageView.ts, which wires this to react-router-dom's
 * useLocation()).
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Same measurement ID analytics.js used on every vanilla page. */
export const GA_MEASUREMENT_ID = 'G-4JFX5WTGFN';

let initialized = false;

/**
 * Injects gtag.js and configures it, same as analytics.js — except with
 * automatic page_view sending turned off (see file header). Safe to call
 * more than once; only the first call has any effect. No-ops outside a
 * browser (e.g. during SSR/build), since there's no `document` to inject
 * into.
 */
export function initAnalytics(measurementId: string = GA_MEASUREMENT_ID): void {
  if (initialized) return;
  if (typeof document === 'undefined') return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });
}

/**
 * Sends a page_view event for the given path. Call this once for the
 * initial route and again on every subsequent route change — see
 * hooks/useAnalyticsPageView.ts.
 */
export function trackPageView(path: string, title: string = typeof document !== 'undefined' ? document.title : ''): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: typeof window !== 'undefined' ? window.location.href : path,
  });
}

/** Test-only: lets tests reset the module-level init guard between runs. */
export function _resetAnalyticsForTests(): void {
  initialized = false;
}
