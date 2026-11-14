import { useState } from 'react';
import { assetPath } from '../../lib/siteConfig';

/**
 * Illustration — same graceful-fallback idea as the `Icon` component, but
 * for the wider empty/error-state scenes (mascot + props), not square
 * icons. Lives in public/illustrations/, not public/icons/ — different
 * aspect ratio (3:2, per ASSET-TODO.md's illustration spec) and a
 * different purpose (a supporting scene next to real text, not a UI
 * control), so keeping the two folders separate avoids the `Icon`
 * component's square sizing assumptions leaking into illustration use.
 *
 * Unlike `Icon`, there's no visible fallback content — if the file is
 * missing, this renders nothing and the caller's real text (which should
 * always be present alongside it) carries the message on its own.
 *
 * Usage:
 *   <Illustration name="empty-dashboard" />
 */

interface IllustrationProps {
  /** Filename (without extension) under public/illustrations/. */
  name: string;
  /** Max width in px — height follows automatically (3:2 source aspect). */
  maxWidth?: number;
  className?: string;
  alt?: string;
}

export function Illustration({ name, maxWidth = 320, className = '', alt = '' }: IllustrationProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={assetPath('illustrations', `${name}.png`)}
      alt={alt}
      className={className}
      style={{ maxWidth, width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
      onError={() => setFailed(true)}
    />
  );
}
