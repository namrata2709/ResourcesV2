import { useEffect, useRef, useState } from 'react';
import { generateQRMatrix } from '../../lib/qrcode';
import { useLiveRegion } from '../../hooks/useLiveRegion';

/**
 * ShareQR — B-7's single "share via QR" component. Renders a trigger
 * button (styled to match CardQuickActions' `quick-action-btn` so it can
 * sit right next to an existing Copy Link action) plus a modal that
 * draws the code to a `<canvas>` via lib/qrcode.ts. Fully client-side —
 * no network call, no external QR service.
 *
 * Same "define one interface, many thin callers" shape as
 * useLiveRegion/lib/liveRegion already apply elsewhere: B-8 (Links Hub),
 * T5-3a (note page), and T5-1 (quiz engine) all import THIS component
 * and just pass their own `url` — none of them touch lib/qrcode.ts or
 * build their own popover.
 *
 * Usage (typically right next to a page's own Copy Link button):
 *   <ShareQR url={absoluteQuizUrl} label="this quiz" />
 */

export interface ShareQRProps {
  /** The URL to encode — pass an absolute URL (e.g. `${location.origin}${path}`). */
  url: string;
  /** What this QR shares, used in labels/headings, e.g. "this quiz", "this note", "the hub". */
  label: string;
  className?: string;
}

export function ShareQR({ url, label, className = '' }: ShareQRProps) {
  const [open, setOpen] = useState(false);
  const { announce } = useLiveRegion();

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Show QR code for ${label}`}
        title={`Show QR code for ${label}`}
        className={`quick-action-btn h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors hover:bg-bg-secondary text-text-muted ${className}`}
      >
        <span aria-hidden="true">▦</span>
      </button>
      {open && (
        <ShareQRModal
          url={url}
          label={label}
          onClose={() => setOpen(false)}
          announce={announce}
        />
      )}
    </>
  );
}

interface ShareQRModalProps {
  url: string;
  label: string;
  onClose: () => void;
  announce: (message: string) => void;
}

function ShareQRModal({ url, label, onClose, announce }: ShareQRModalProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleCopy() {
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopyStatus('copied');
        announce('Link copied to clipboard');
      })
      .catch(() => {
        setCopyStatus('failed');
      });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`QR code for ${label}`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-card border border-border-color rounded-xl shadow-[0_8px_30px_var(--shadow)] max-w-xs w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">Share {label}</h2>
          <button
            onClick={onClose}
            aria-label="Close QR code dialog"
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <QRCodeCanvas value={url} size={220} />
        </div>

        <p className="text-xs text-text-muted break-all text-center mb-3">{url}</p>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full rounded-lg border border-border-color py-2 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
        >
          {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'failed' ? 'Copy failed' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

interface QRCodeCanvasProps {
  value: string;
  size: number;
}

/**
 * Draws a QR code to a canvas. Kept separate from ShareQRModal in case a
 * future caller wants the bare code without the modal chrome, but B-7's
 * "done when" only requires the three list consumers to share the modal
 * itself, so this isn't exported on its own for now.
 */
function QRCodeCanvas({ value, size }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const matrix = generateQRMatrix(value);
      const quiet = 4;
      const n = matrix.length;
      const cell = size / (n + quiet * 2);

      canvas.width = size;
      canvas.height = size;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#000000';
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (matrix[r][c]) {
            const x = (c + quiet) * cell;
            const y = (r + quiet) * cell;
            // Slight overlap (ceil) avoids sub-pixel seams between modules.
            ctx.fillRect(x, y, Math.ceil(cell), Math.ceil(cell));
          }
        }
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate QR code');
    }
  }, [value, size]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center text-center text-sm text-text-muted p-4 border border-border-color rounded-lg"
        style={{ width: size, height: size }}
      >
        {error}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      role="img"
      aria-label="QR code"
      className="rounded-lg bg-white"
    />
  );
}
