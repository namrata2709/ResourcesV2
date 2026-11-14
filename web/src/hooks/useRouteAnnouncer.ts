import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLiveRegion } from './useLiveRegion';

/**
 * useRouteAnnouncer — T3-1b's three route-change gaps, closed together
 * since they all key off the same `useLocation()` change:
 *
 * 1. Scroll restoration: DECISION (explicit, not left to React Router's
 *    default) — scroll to top on every navigation, always. This app
 *    doesn't currently restore prior scroll position on back/forward;
 *    that would need per-entry scroll-position caching keyed by history
 *    stack position, which is real added complexity nothing here asked
 *    for. Scroll-to-top also matches how the vanilla site behaved by
 *    construction — every page was a separate full document load, which
 *    always starts at the top.
 * 2. Focus management: moves focus to the main landmark (`#main-content`,
 *    the `tabIndex={-1}` wrapper in App.tsx), not literally to each
 *    page's own `<h1>`. Focusing the landmark is the common accessible-SPA
 *    pattern and works uniformly across every route without each page
 *    needing to expose a heading ref back up to this hook — a page's own
 *    heading is still the next thing a screen reader announces once
 *    focus lands inside `<main>`.
 * 3. Announces the new page via the shared `useLiveRegion()` (T3-1),
 *    e.g. "Navigated to Quizzes" — matches what a full page load
 *    naturally communicated in vanilla (a new page, a new title).
 *
 * Skips the very first render (initial page load) — a real navigation
 * announcement doesn't apply there; the page's own title/heading is the
 * first thing announced on load already.
 */

const PAGE_NAMES: Array<[RegExp, string]> = [
  [/^\/$/, 'Home'],
  [/^\/notes-index\/?$/, 'Notes'],
  [/^\/notes-index\/[^/]+\/?$/, 'Notes'],
  [/^\/quiz-index\/?$/, 'Quizzes'],
  [/^\/quiz\/[^/]+\/?$/, 'Quiz'],
  [/^\/gallery\/?$/, 'Images Gallery'],
  [/^\/settings\/?$/, 'Settings'],
];

function pageNameForPath(pathname: string): string {
  for (const [pattern, name] of PAGE_NAMES) {
    if (pattern.test(pathname)) return name;
  }
  return 'this page';
}

export function useRouteAnnouncer(): void {
  const location = useLocation();
  const { announce } = useLiveRegion();
  const isFirstRender = useRef(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    const main = document.getElementById('main-content');
    main?.focus();

    // Scroll-to-top and focus are harmless (and arguably correct) on the
    // very first load too, but announcing "Navigated to X" on initial
    // page load is redundant — the page's own title/heading is already
    // the first thing announced.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    announce(`Navigated to ${pageNameForPath(location.pathname)}`);
    // Only the pathname (not full location incl. search/hash) should
    // re-trigger this — a ?q= change on the same page isn't a new
    // "page", so skipping search/hash deliberately avoids over-announcing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}
