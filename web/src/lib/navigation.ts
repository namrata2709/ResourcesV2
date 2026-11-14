/**
 * lib/navigation.ts
 *
 * Ports navigation.js's emoji/URL resolution against
 * data/config/navigation-url.json — same lookup contract (lowercased
 * title match; unrecognized keys render as plain text with no emoji/url,
 * intentional for page-specific last-segment titles).
 *
 * Vanilla behavior preserved:
 *   - fetch is cached after first load (module-level cache here, was a
 *     closure variable in navigation.js)
 *   - last item = current page (no link)
 *   - second-last item = back-button target
 */

import { dataPath } from './siteConfig';

export interface NavEntry {
  title: string;
  emoji: string;
  url: string;
}

export interface ResolvedNavItem {
  /** Rendered label, e.g. "🏠 Home" or a raw unrecognized key */
  label: string;
  /** Resolved href, or null if this key has no config entry / is last */
  url: string | null;
  isLast: boolean;
}

let _navMap: Record<string, NavEntry> | null = null;

/** Same data source vanilla fetches — copied into public/data for the port. */
const CONFIG_URL = dataPath('config', 'navigation-url.json');

async function loadNavConfig(): Promise<Record<string, NavEntry>> {
  if (_navMap) return _navMap;
  try {
    const res = await fetch(CONFIG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr: NavEntry[] = await res.json();
    const map: Record<string, NavEntry> = {};
    arr.forEach((entry) => {
      map[entry.title.toLowerCase()] = entry;
    });
    _navMap = map;
    return map;
  } catch (e) {
    console.warn('navigation.ts: could not load navigation-url.json.', e);
    return {};
  }
}

/**
 * Resolves an array of breadcrumb keys (e.g. ['Home', 'AWS', 'EC2 Basics'])
 * against navigation-url.json, same as window.navigation(keys) did.
 */
export async function resolveNavigation(keys: string[]): Promise<ResolvedNavItem[]> {
  if (!Array.isArray(keys) || keys.length === 0) return [];
  const map = await loadNavConfig();

  return keys.map((key, i) => {
    const entry = map[key.toLowerCase()] || null;
    const isLast = i === keys.length - 1;
    const emoji = entry?.emoji ? entry.emoji + ' ' : '';
    const label = entry ? emoji + entry.title : key;
    const url = entry ? entry.url : null;
    return { label, url, isLast };
  });
}
