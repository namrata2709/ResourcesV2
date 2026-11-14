/**
 * DsaAnimation — the viz-panel's animation iframe/embed, ported for
 * T5-3b. Renders as one pane inside the shared `TabPanel` (Visualisation
 * panel's Images-vs-Animation toggle), not its own standalone toggle.
 *
 * THEMING, per T1-4 (read that ticket before touching this component):
 * the animation page is a fully standalone HTML document that does NOT
 * inherit `data-theme` from this parent page automatically. T1-4's fix
 * is entirely on the vanilla/generator side — `animate.py`'s
 * `build_animation_html()` now has the generated page read
 * `localStorage.getItem('theme')` directly on load and set its own
 * `data-theme` attribute, the same key `theme.js`/`lib/theme.ts` already
 * write. Because `localStorage` is shared within the same origin, this
 * component does NOT thread a theme prop or query param through to the
 * iframe `src` — doing so would be a second, redundant theme channel
 * fighting the one T1-4 already built. This component's only job is to
 * embed the (already-themed) page inertly; it inherits the current
 * theme "for free" via the shared origin, same reasoning `Table`/`List`
 * don't reimplement anything Table/List's own consumers already handle.
 *
 * `src`/`title` are the caller's responsibility to build (from
 * `folder`/topic via `dataPath`/`assetPath`) — kept out of this
 * component so it stays a dumb embed, same "caller owns the URL"
 * convention the rest of this app already follows (`ShareQR` takes a
 * `url` prop rather than building one itself).
 */

interface DsaAnimationProps {
  /** Resolved URL of the standalone animation HTML page. */
  src: string;
  /** Accessible name for the iframe — required, not optional; a bare
   * unlabeled iframe is a real a11y gap, same rule `Table`/`List` apply
   * to their own required `caption`/`ariaLabel`. */
  title: string;
  className?: string;
}

export function DsaAnimation({ src, title, className = '' }: DsaAnimationProps) {
  if (!src) return null;

  return (
    <iframe
      src={src}
      title={title}
      className={`dsa-animation w-full rounded-lg border border-border-color ${className}`}
      style={{ minHeight: '480px' }}
      // No sandbox theme-passing attributes/query params — see the file
      // header on why theming is intentionally NOT threaded through here.
    />
  );
}
