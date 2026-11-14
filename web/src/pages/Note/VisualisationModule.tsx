/**
 * VisualisationModule — a DSA note's Visualisation panel: the
 * Images-vs-Animation toggle (`dsa-visualisation.js`'s
 * `initTabSwitch()`), rendered via the shared `TabPanel` component —
 * its second confirmed consumer (the first being ImplementationModule's
 * code-language tabs). Image slideshow is the fallback pane; the
 * animation pane embeds `DsaAnimation` (T1-4's already-themed iframe,
 * no theme prop threaded through — see that component's own header).
 *
 * Only renders a toggle when BOTH panes have content. A note with just
 * images (no animation yet, or vice versa) renders that one thing
 * directly instead of a single-tab `TabPanel` — a tab strip with one
 * tab is worse UX than no tab strip at all, same "don't build UI chrome
 * around a false choice" reasoning applied elsewhere in this app.
 * DSA-only — Note.tsx only renders this for `note.subject === 'dsa'`.
 */

import { useEffect, useState } from 'react';
import { TabPanel } from '../../components/TabPanel';
import { DsaAnimation } from '../../components/DsaAnimation';
import { dataPath, assetPath } from '../../lib/siteConfig';
import type { VisualisationData } from './types';

interface VisualisationModuleProps {
  folder: string;
  title: string;
}

function ImageSlideshow({ images, folder }: { images: string[]; folder: string }) {
  const [index, setIndex] = useState(0);
  const src = images[index];

  return (
    <div className="image-slideshow">
      <img
        src={assetPath(src)}
        alt={`${folder} visualisation, image ${index + 1} of ${images.length}`}
        className="w-full rounded-lg border border-border-color"
      />
      {images.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
            aria-label="Previous image"
            className="rounded-md border border-border-color px-2.5 py-1.5 text-sm text-text-secondary hover:text-accent hover:border-accent"
          >
            ← Prev
          </button>
          <span className="text-sm text-text-muted">
            {index + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % images.length)}
            aria-label="Next image"
            className="rounded-md border border-border-color px-2.5 py-1.5 text-sm text-text-secondary hover:text-accent hover:border-accent"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export function VisualisationModule({ folder, title }: VisualisationModuleProps) {
  const [data, setData] = useState<VisualisationData | null | 'missing'>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'visualisation.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: VisualisationData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  if (data === null || data === 'missing') return null;

  const hasImages = !!data.images && data.images.length > 0;
  const hasAnimation = !!data.animationSrc;

  if (!hasImages && !hasAnimation) return null;

  return (
    <section aria-labelledby="notes-visualisation-heading" className="mt-8">
      <h2 id="notes-visualisation-heading" className="text-lg font-semibold text-text-primary mb-3">
        Visualisation
      </h2>
      {hasImages && hasAnimation ? (
        <TabPanel
          ariaLabel="Visualisation view"
          tabs={[
            { id: 'images', label: 'Images', content: <ImageSlideshow images={data.images!} folder={folder} /> },
            {
              id: 'animation',
              label: 'Animation',
              content: <DsaAnimation src={data.animationSrc!} title={`${title} animation`} />,
            },
          ]}
        />
      ) : hasImages ? (
        <ImageSlideshow images={data.images!} folder={folder} />
      ) : (
        <DsaAnimation src={data.animationSrc!} title={`${title} animation`} />
      )}
    </section>
  );
}
