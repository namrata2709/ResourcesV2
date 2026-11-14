import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { PageMeta } from '../../components/PageMeta';
import { ShareQR } from '../../components/ShareQR';
import { assetPath, BASE_URL } from '../../lib/siteConfig';
import { parseLinkProfile, type LinkBlock, type LinkProfile } from '../../lib/links';

/**
 * LinkPage — B-8's per-instructor Linktree-style page.
 *
 * Fetches `content/links/<slug>.md` (see lib/links.ts's header for why
 * that's a runtime fetch + parse instead of a build-time Python step),
 * then renders it: profile header, then each section's blocks in
 * document order via BLOCK_RENDERERS below — a registry keyed by block
 * type, not an if/else chain, so a future block type (Event, PDF, etc.)
 * is one new renderer + one new registry entry, matching P0-0's
 * Settings section-registry and B-7's own "one shared component, many
 * thin callers" shape.
 */

interface LinkPageProps {
  slug: string;
}

export function LinkPage({ slug }: LinkPageProps) {
  const [profile, setProfile] = useState<LinkProfile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError(false);

    fetch(assetPath('content', 'links', `${slug}.md`))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((raw) => {
        if (!cancelled) setProfile(parseLinkProfile(raw));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <p className="text-text-secondary">
          This page isn&apos;t available right now. Please check the link and try again.
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center text-text-muted" aria-live="polite">
        Loading…
      </div>
    );
  }

  const pageUrl = `${window.location.origin}${BASE_URL}${slug}`;

  return (
    <div className="link-page font-poppins">
      <PageMeta
        title={profile.name}
        description={profile.description}
        canonicalPath={`/${slug}`}
      />

      <header className="flex flex-col items-center text-center gap-3 py-10 px-4">
        {profile.avatar && (
          <img
            src={profile.avatar}
            alt=""
            width={72}
            height={72}
            className="rounded-full object-cover border border-border-color"
          />
        )}
        <h1 className="text-2xl font-bold text-text-primary">{profile.name}</h1>
        {profile.title && <p className="text-sm text-text-muted">{profile.title}</p>}
        {profile.description && (
          <p className="subtitle text-text-secondary max-w-md">{profile.description}</p>
        )}

        {Object.keys(profile.social).length > 0 && (
          <ul className="flex flex-wrap justify-center gap-4 mt-1">
            {Object.entries(profile.social).map(([network, url]) => (
              <li key={network}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:text-accent underline underline-offset-2 capitalize"
                >
                  {network}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}

        <ShareQR url={pageUrl} label={`${profile.name}'s page`} className="mt-2" />
      </header>

      <main className="max-w-xl mx-auto px-6 pb-16 flex flex-col gap-10">
        {profile.sections.map((section) => (
          <section key={section.heading} aria-labelledby={`section-${section.heading}`}>
            <h2
              id={`section-${section.heading}`}
              className="text-lg font-semibold text-text-primary mb-3"
            >
              {section.heading}
            </h2>
            <div className="flex flex-col gap-2">
              {section.blocks.map((block, i) => (
                <BlockRenderer key={i} block={block} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

/**
 * Registry lookup, not an if-chain — see this file's header. Adding a
 * new `LinkBlock` variant means: extend the `LinkBlock` union in
 * lib/links.ts, teach parseBody() its markdown syntax, add one entry
 * here. Nothing above (LinkPage itself, or the existing Link/
 * Announcement renderers) needs to change.
 */
const BLOCK_RENDERERS: { [K in LinkBlock['type']]: (block: Extract<LinkBlock, { type: K }>) => React.ReactNode } = {
  link: (block) => (
    <a
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg border border-border-color bg-bg-card px-4 py-3 flex items-center justify-between gap-3 hover:bg-bg-secondary transition-colors"
    >
      <span>
        <span className="block text-sm font-medium text-text-primary">{block.title}</span>
        {block.description && (
          <span className="block text-xs text-text-secondary mt-0.5">{block.description}</span>
        )}
      </span>
      <ExternalLink size={16} className="shrink-0 text-text-muted" aria-hidden="true" />
    </a>
  ),
  announcement: (block) => (
    <p className="rounded-lg border border-dashed border-border-color bg-bg-card px-4 py-3 text-sm text-text-secondary italic">
      {block.text}
    </p>
  ),
};

function BlockRenderer({ block }: { block: LinkBlock }) {
  const render = BLOCK_RENDERERS[block.type] as (b: LinkBlock) => React.ReactNode;
  return <>{render(block)}</>;
}
