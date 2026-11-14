import { useEffect } from 'react';
import { BASE_URL } from '../../lib/siteConfig';

/**
 * PageMeta — the per-route counterpart to shared-meta.js.
 *
 * shared-meta.js injects the tags that are the SAME on every vanilla
 * page (author/robots/og:site_name/twitter:card/theme-color/favicons) —
 * those are set once in index.html's <head> now (one source, not
 * per-page copies; see index.html's comments). What it explicitly does
 * NOT cover is the per-page tags — <title>, description, canonical,
 * OG title/image — because those were hand-written per vanilla HTML
 * file. A SPA doesn't get that "one file per page, each with its own
 * <head>" structure for free, so this component exists to set those
 * per-route values imperatively as each route mounts.
 *
 * Render this once near the top of each page component with that page's
 * own values (see T3-3 onward) — NOT once globally in App.tsx, since a
 * single global instance would only ever reflect whichever page happened
 * to render it last, not "the current route".
 *
 * Deliberately NOT built on react-helmet-async: that package isn't a
 * dependency yet, and this app's <head> tags are simple enough (a handful
 * of imperative upserts) that pulling in a dedicated head-management
 * library for it would be more machinery than the problem needs. If a
 * later ticket needs more of what helmet provides (SSR head streaming,
 * ordering guarantees across nested components), swap the internals of
 * this one component out — nothing that calls <PageMeta /> should need
 * to change.
 */

export interface PageMetaProps {
  /** Page-specific title, e.g. "EC2 Basics". Site name is appended automatically. */
  title: string;
  description?: string;
  /**
   * Root-relative path for the canonical/og:url tags, e.g.
   * "/notes-index/aws" — NOT including BASE_URL, which is applied here.
   */
  canonicalPath?: string;
  /** Defaults to the same value used for <title> if omitted. */
  ogTitle?: string;
  /** Absolute or root-relative image URL for og:image. */
  ogImage?: string;
}

const SITE_NAME = 'Notebook Buddy';
/** Matches shared-meta.js's canonical/og:url origin for the deployed site. */
const SITE_ORIGIN = 'https://namrata2709.github.io';

function upsertMetaByName(name: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertMetaByProperty(property: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function resolveAbsoluteUrl(rootRelativePath: string): string {
  const base = BASE_URL.replace(/\/$/, '');
  const path = rootRelativePath.replace(/^\/+/, '');
  return `${SITE_ORIGIN}${base}/${path}`;
}

export function PageMeta({ title, description, canonicalPath, ogTitle, ogImage }: PageMetaProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;
    upsertMetaByProperty('og:title', ogTitle ?? fullTitle);

    if (description) {
      upsertMetaByName('description', description);
      upsertMetaByProperty('og:description', description);
    }

    if (canonicalPath) {
      const href = resolveAbsoluteUrl(canonicalPath);
      upsertCanonicalLink(href);
      upsertMetaByProperty('og:url', href);
    }

    if (ogImage) {
      upsertMetaByProperty('og:image', ogImage);
    }
  }, [title, description, canonicalPath, ogTitle, ogImage]);

  return null;
}
