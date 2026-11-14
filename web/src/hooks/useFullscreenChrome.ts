import { useCallback, useEffect, useState } from 'react';

/**
 * useFullscreenChrome — T5-4a's fullscreen mechanism for the Slides page,
 * ported from vanilla `js/notes/slides.js`'s real, confirmed behavior
 * (see sprint-tickets.md's T5-4a entry for the exact source this
 * replicates).
 *
 * Two things vanilla got right that this hook is careful not to lose:
 *
 * 1. Native Fullscreen API on `document.documentElement`, not a
 *    CSS-only fake-fullscreen and not a scoped container element —
 *    `document.documentElement.requestFullscreen()` /
 *    `document.exitFullscreen()`, no library. Vanilla fullscreened the
 *    whole page because each deck WAS its own whole document; the React
 *    equivalent of "the whole page" is the same `documentElement` — the
 *    SPA shell (App.tsx's header cluster, Footer) fullscreens right
 *    along with the deck, same as it would have in vanilla, and gets
 *    hidden by the CSS rules below instead of being left outside a
 *    smaller fullscreen target.
 *
 * 2. Chrome show/hide is driven by the `fullscreenchange` EVENT, not the
 *    toggle button's own click handler. `fullscreenchange` also fires
 *    for Escape, F11, and the browser's native fullscreen-exit UI — none
 *    of which route through a button's onClick. A version that only
 *    wired the click handler would leave chrome hidden after any of
 *    those exits. This is the real regression case
 *    `Slides.test.tsx` checks for.
 *
 * Chrome hidden while fullscreen — selector list matches vanilla's
 * `nav.breadcrumb, .page-header, #footerRoot` exactly:
 *   - `.breadcrumb` / `.page-header` — Breadcrumb's own real class names
 *     (components/Breadcrumb/Breadcrumb.tsx), unchanged since its React
 *     port — no new class needed for this to work.
 *   - `#footerRoot` — the id App.tsx wraps <Footer /> in specifically
 *     for this selector to match.
 * PLUS one addition beyond that 3-item vanilla list: `#appChromeHeader`,
 * the floating Settings/notifications/theme-toggle cluster App.tsx
 * renders on every route. Vanilla never had this element (it's specific
 * to the persistent React shell, not a page), so hiding it is a
 * deliberate improvement for a real fullscreen presentation experience —
 * flagged here so it isn't mistaken for a 1:1 port of vanilla behavior.
 *
 * The hook only owns the boolean state + the `<body>` attribute; the
 * actual `display: none` rules live in index.css. Same "hook drives
 * state, CSS renders it" split PrintGuard already uses for its
 * print:hidden/print:block Tailwind variants.
 */
export function useFullscreenChrome() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullscreenChange() {
      const active = document.fullscreenElement != null;
      setIsFullscreen(active);
      document.body.toggleAttribute('data-fullscreen-chrome-hidden', active);
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.body.removeAttribute('data-fullscreen-chrome-hidden');
    };
  }, []);

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.();
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}
