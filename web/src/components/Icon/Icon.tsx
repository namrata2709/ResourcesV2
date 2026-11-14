import { useState } from 'react';
import { assetPath } from '../../lib/siteConfig';

/**
 * Icon — the ONE place icon-loading logic lives, per the reviewed asset
 * architecture guidance: no manual `home/16.png, home/32.png, ...` size
 * folders. Each branded icon is a single master PNG (e.g. 512x512, a few
 * KB), served from `/icons/{name}.png`, scaled down by the browser via
 * plain width/height attributes — this project has no next/image, so
 * there's no automatic responsive-format step, but a single well-optimized
 * master + browser downscaling is exactly what was recommended even for
 * Next.js projects once you're past 2-3 sizes.
 *
 * If `/icons/{name}.png` doesn't exist yet (most don't, see ASSET-TODO.md),
 * this falls back to `fallback` (an emoji or inline SVG) so components can
 * be wired up now and silently upgrade the moment a real asset lands in
 * public/icons/ — no code change needed on that day.
 *
 * Usage:
 *   <Icon name="home" size={32} />
 *   <Icon name="dashboard" size={24} fallback="📊" />
 */

interface IconProps {
  /** Filename (without extension) under public/icons/, e.g. "home" -> /icons/home.png */
  name: string;
  size?: number;
  className?: string;
  /** Shown instead of a broken image if /icons/{name}.png isn't there yet. */
  fallback?: React.ReactNode;
  alt?: string;
}

export function Icon({ name, size = 24, className = '', fallback = null, alt = '' }: IconProps) {
  const [failed, setFailed] = useState(false);

  if (failed && fallback !== null) {
    return (
      <span
        className={className}
        style={{ fontSize: size * 0.85, lineHeight: 1, display: 'inline-block' }}
        aria-hidden={alt === ''}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={assetPath('icons', `${name}.png`)}
      width={size}
      height={size}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      style={{ objectFit: 'contain' }}
    />
  );
}
