/**
 * lib/links.ts — B-8 (Link pages / multi-profile Linktree).
 *
 * PROCESS NOTE: the ticket's original file list called for a Python
 * generator (`python/generate_links_pages.py`) converting each
 * `content/links/<slug>.md` into `public/data/links/<slug>.json` at
 * build time, matching `parse_mcq.py`/`generate_notes.py`'s shape
 * elsewhere in this pipeline. That generator and this project's
 * `content/`/`python/` directories weren't available to build against
 * here, and per direction this does the parse in the browser instead:
 * the raw `.md` file is fetched at runtime (same `fetch()` + `dataPath`-
 * style convention every other page already uses for JSON) and parsed
 * client-side by this file, with no build step at all. Trade-off worth
 * knowing about: every visit re-parses the markdown instead of reading
 * pre-built JSON, and there's no build-time validation of a broken
 * profile file — both fine for a handful of rarely-updated profiles,
 * worth revisiting if that stops being true.
 *
 * Framework-agnostic per lib/README.md: no React here, LinkPage.tsx
 * owns the fetch + loading/error state (same split as every other
 * `dataPath(...)`-driven page).
 */

export interface LinkProfile {
  name: string;
  title: string;
  description: string;
  avatar: string;
  social: Record<string, string>;
  sections: LinkSection[];
}

export interface LinkSection {
  heading: string;
  blocks: LinkBlock[];
}

export type LinkBlock =
  | { type: 'link'; title: string; url: string; description: string }
  | { type: 'announcement'; text: string };

/**
 * Slugs live here, not scattered across App.tsx/LinkPage.tsx — the one
 * list both the route table and the fetch-by-slug logic read, so
 * "adding a fourth profile" really is one new `.md` file + one entry
 * here (ticket's own "Done when" bar), not a change in two places.
 */
export const ACTIVE_LINK_PROFILE_SLUGS = ['namu', 'chandra', 'todd'] as const;
export type LinkProfileSlug = (typeof ACTIVE_LINK_PROFILE_SLUGS)[number];

export function isLinkProfileSlug(value: string): value is LinkProfileSlug {
  return (ACTIVE_LINK_PROFILE_SLUGS as readonly string[]).includes(value);
}

/**
 * Strips markdown comments used for hiding a line/block
 * (`<!-- - [Old link](url): desc -->`) without deleting it from the
 * source file — the ticket's chosen alternative to a separate
 * `visible` flag. Handles both a comment that opens and closes on the
 * same line, and one that spans multiple lines.
 */
function stripComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

/** Minimal `key: value` (+ one level of nested `key:\n  sub: value`) frontmatter reader — this file's needs are simple enough that pulling in a real YAML parser would be more machinery than the format uses. */
function parseFrontmatter(block: string): {
  name: string;
  title: string;
  description: string;
  avatar: string;
  social: Record<string, string>;
} {
  const lines = block.split('\n');
  const top: Record<string, string> = {};
  const social: Record<string, string> = {};
  let inSocial = false;

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    const indented = /^\s+/.test(rawLine);
    const line = rawLine.trim();

    if (!indented) {
      inSocial = false;
      const m = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(line);
      if (!m) continue;
      const [, key, value] = m;
      if (key === 'social' && value === '') {
        inSocial = true;
        continue;
      }
      top[key] = value.trim();
      continue;
    }

    if (inSocial) {
      const m = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(line);
      if (m) social[m[1]] = m[2].trim();
    }
  }

  return {
    name: top.name ?? '',
    title: top.title ?? '',
    description: top.description ?? '',
    avatar: top.avatar ?? '',
    social,
  };
}

const LINK_LINE_RE = /^-\s*\[([^\]]*)\]\(([^)]*)\)\s*:\s*(.*)$/;
const ANNOUNCEMENT_LINE_RE = /^>\s?(.*)$/;
const HEADING_RE = /^##\s+(.*)$/;

function parseBody(body: string): LinkSection[] {
  const sections: LinkSection[] = [];
  let current: LinkSection | null = null;

  for (const rawLine of stripComments(body).split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = HEADING_RE.exec(line);
    if (heading) {
      current = { heading: heading[1].trim(), blocks: [] };
      sections.push(current);
      continue;
    }

    const link = LINK_LINE_RE.exec(line);
    if (link && current) {
      const [, title, url, description] = link;
      current.blocks.push({ type: 'link', title: title.trim(), url: url.trim(), description: description.trim() });
      continue;
    }

    const announcement = ANNOUNCEMENT_LINE_RE.exec(line);
    if (announcement && current) {
      current.blocks.push({ type: 'announcement', text: announcement[1].trim() });
      continue;
    }
    // Any other line (plain prose, unrecognized syntax) is silently
    // skipped rather than thrown — a hand-edited file with a stray line
    // shouldn't take the whole profile down.
  }

  return sections;
}

/**
 * Parses one profile's raw markdown-with-frontmatter source into a
 * `LinkProfile`. Throws if the frontmatter fence itself is missing —
 * that's a genuinely malformed file, not a recoverable formatting
 * quirk — but is otherwise permissive (see parseBody's per-line
 * skipping) since these files are hand-edited.
 */
export function parseLinkProfile(raw: string): LinkProfile {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw.trim() + '\n');
  if (!match) {
    throw new Error('Profile markdown is missing its --- frontmatter block');
  }
  const [, frontmatterBlock, body] = match;
  const meta = parseFrontmatter(frontmatterBlock);
  return { ...meta, sections: parseBody(body) };
}
