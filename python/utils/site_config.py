"""
utils/site_config.py — single source of truth for the site's base URL.

Mirrors what js/shared/site-config.js does on the JS side: one place
that defines the domain, everything else imports it rather than
hardcoding its own copy.

Fixes a confirmed bug (audit Finding 18, 2026-07-06): generate_notes.py
and generate_notes_index.py hardcoded "https://namrata2709.github.io/Resources/"
(no V2) while generate_sitemap.py and generate_quiz_index.py hardcoded
"https://namrata2709.github.io/ResourcesV2" (with V2) — since dashboard.py's
`cmd_all` runs all four in one pipeline, every `dashboard all` run wrote
BOTH domains into sitemap.xml simultaneously, and because add_url()'s
upsert matches on exact `loc` (not domain-normalized), the two domains'
URLs for the same physical page never deduped against each other —
every note ended up with two separate sitemap entries, one per domain.

README.md confirms the live site is https://namrata2709.github.io/ResourcesV2/
— that's the correct value below. If the domain ever changes again,
this is the only file that needs editing.

Usage:
    from utils.site_config import BASE_URL
"""

BASE_URL = "https://namrata2709.github.io/ResourcesV2"
