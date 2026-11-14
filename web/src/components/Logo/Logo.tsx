import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { assetPath } from '../../lib/siteConfig';

/**
 * Logo — Notebook Buddy mark.
 *
 * Hard rule: this component NEVER writes brand copy (site name, tagline)
 * as text. Every variant that includes a wordmark or tagline gets that
 * from a real image file — the same file the designer/brand kit produced,
 * with the exact typography/kerning/effects already baked in. Reconstructing
 * "Notebook" + "Buddy" as separate <span>s, or hardcoding "Your learning
 * companion" as a <p> next to it, creates a second source of truth that
 * silently drifts the moment either one changes. Don't do that again.
 *
 * `variant` maps directly to a real file:
 *   - "horizontal" -> public/icons/logo-horizontal-{theme}.png (mascot + wordmark + tagline, single row) — DEFAULT, delivered, per-theme
 *   - "icon"       -> public/icons/logo-icon.png                (mascot only, no wordmark) — delivered, SAME file for every theme (see below)
 *   - "stacked"    -> public/icons/logo-stacked-{theme}.png      (mark above wordmark)      — NOT YET PROVIDED, per-theme
 *   - "wordmark"   -> public/icons/wordmark-{theme}.png          (text only, no mark)       — NOT YET PROVIDED, per-theme
 *
 * Why "icon" isn't per-theme like the others: the mascot is the brand
 * symbol itself (same idea as GitHub's Octocat or Discord's Clyde) — it
 * stays identical across Light/Dark/Comfort rather than being recolored,
 * so it's instantly recognizable regardless of theme. Its own colors
 * already have enough contrast to read on all three backgrounds. This is
 * a deliberate exception to "every variant is theme-aware," not an
 * oversight — don't add logo-icon-{theme}.png files later unless the
 * mascot's actual color design changes.
 *
 * If a variant's file doesn't exist, this falls back to a plain, textless
 * mascot silhouette (`MarkFallback`) — never to a hand-built text
 * reconstruction. A missing asset should look like "the icon is missing,"
 * not like a different, code-invented logo. No cropping happens here
 * either — each variant is a real, distinct file when it exists, not
 * derived from another variant's image at render time.
 */

type LogoVariant = 'icon' | 'horizontal' | 'stacked' | 'wordmark';

interface LogoProps {
  variant?: LogoVariant;
  /** Height in px — width follows the source image's own aspect ratio. Ignored if `fillWidth` is set. */
  size?: number;
  /**
   * If set, the logo instead scales to 100% of its parent's width (height
   * follows the source image's own aspect ratio) — for contexts that
   * should match a surrounding layout's width, like a page banner lining
   * up with the content below it, rather than a fixed pixel size. The
   * parent element is what actually controls the final width; give it a
   * `max-width` (e.g. matching another section's container) to bound it.
   */
  fillWidth?: boolean;
  className?: string;
}

function MarkFallback({ size, className }: { size: number; className: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Notebook Buddy"
      className={className}
    >
      <rect x="8" y="6" width="26" height="30" rx="4" fill="#FFF9EE" stroke="#6A3E1E" strokeWidth="1.5" />
      {[10, 15, 20, 25, 30].map((y) => (
        <circle key={y} cx="8" cy={y} r="1.6" fill="none" stroke="#6A3E1E" strokeWidth="1.3" />
      ))}
      <path d="M24 6h6v10l-3-2.4-3 2.4V6z" fill="#9B7BFF" />
      <rect x="34" y="12" width="3" height="4" rx="1" fill="#7C4DFF" />
      <rect x="34" y="18" width="3" height="4" rx="1" fill="#FFB347" />
      <rect x="34" y="24" width="3" height="4" rx="1" fill="#FF6868" />
    </svg>
  );
}

/**
 * "icon" is the one variant that's the SAME file for every theme — see
 * the module comment for why. Every other variant is per-theme.
 */
function filenameFor(variant: LogoVariant, theme: string): string {
  if (variant === 'icon') return assetPath('icons', 'logo-icon.png');
  if (variant === 'wordmark') return assetPath('icons', `wordmark-${theme}.png`);
  return assetPath('icons', `logo-${variant}-${theme}.png`); // "horizontal" -> logo-horizontal-{theme}.png, "stacked" -> logo-stacked-{theme}.png
}

export function Logo({ variant = 'horizontal', size = 40, fillWidth = false, className = '' }: LogoProps) {
  const { theme } = useTheme();
  const [failed, setFailed] = useState(false);

  // Retry whenever the thing that determines the src changes — a failure
  // for one theme/variant combination shouldn't stick around once the
  // person switches to a different one that might actually have a file.
  // (Harmless no-op re-check for "icon" specifically, since its filename
  // never changes with theme — not worth special-casing out.)
  useEffect(() => {
    setFailed(false);
  }, [variant, theme]);

  if (failed) {
    return <MarkFallback size={fillWidth ? 96 : size} className={className} />;
  }

  // width:100% + height:auto reliably scales proportionally to whatever
  // width the parent provides — no clipping, no object-fit needed. The
  // parent's own width (e.g. a max-w-5xl container) is what determines
  // the final size; there's no height cap here on purpose, since capping
  // it would fight the "match this container's width" request.
  const style = fillWidth
    ? { width: '100%', height: 'auto', display: 'block' as const, margin: '0 auto' }
    : { height: size, width: 'auto', display: 'block' as const };

  return (
    <img
      src={filenameFor(variant, theme)}
      alt="Notebook Buddy"
      style={style}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
