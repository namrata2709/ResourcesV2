"""
sitemap_utils.py — Shared sitemap helpers
All generator scripts import from here to add/update URLs in sitemap.xml.

Usage:
    from sitemap_utils import add_url, remove_url, write_sitemap, load_sitemap

Typical flow in a generator script:
    urls = load_sitemap()
    urls = add_url(urls, loc="https://...", changefreq="monthly", priority="0.7")
    write_sitemap(urls)
"""

import os
import xml.etree.ElementTree as ET
from datetime import datetime

SITEMAP_FILE = "../sitemap.xml"
BASE_URL     = "https://namrata2709.github.io/Resources"
NS           = "http://www.sitemaps.org/schemas/sitemap/0.9"
TODAY        = datetime.now().strftime('%Y-%m-%d')


def load_sitemap() -> list[dict]:
    """
    Parse existing sitemap.xml into a list of URL dicts.
    Returns [] if file doesn't exist or is malformed.
    Each dict: { loc, lastmod, changefreq, priority }
    """
    if not os.path.exists(SITEMAP_FILE):
        return []
    try:
        tree = ET.parse(SITEMAP_FILE)
        root = tree.getroot()
        urls = []
        for url_el in root.findall(f'{{{NS}}}url'):
            def text(tag):
                el = url_el.find(f'{{{NS}}}{tag}')
                return el.text.strip() if el is not None and el.text else ''
            urls.append({
                'loc':        text('loc'),
                'lastmod':    text('lastmod'),
                'changefreq': text('changefreq'),
                'priority':   text('priority'),
            })
        return urls
    except ET.ParseError as e:
        print(f"⚠️  Could not parse {SITEMAP_FILE}: {e}. Starting fresh.")
        return []


def add_url(
    urls:        list[dict],
    loc:         str,
    changefreq:  str  = 'monthly',
    priority:    str  = '0.7',
    lastmod:     str  = TODAY,
) -> list[dict]:
    """
    Upsert a URL entry. If loc already exists, updates lastmod/changefreq/priority.
    Returns the updated list (does not write to disk — call write_sitemap() after).
    """
    # Normalise trailing slash difference
    clean_loc = loc.rstrip('/')
    for entry in urls:
        if entry['loc'].rstrip('/') == clean_loc:
            entry['lastmod']    = lastmod
            entry['changefreq'] = changefreq
            entry['priority']   = priority
            return urls
    urls.append({
        'loc':        loc,
        'lastmod':    lastmod,
        'changefreq': changefreq,
        'priority':   priority,
    })
    return urls


def remove_url(urls: list[dict], loc: str) -> list[dict]:
    """Remove a URL entry by loc. Safe to call if loc doesn't exist."""
    clean_loc = loc.rstrip('/')
    return [u for u in urls if u['loc'].rstrip('/') != clean_loc]


def write_sitemap(urls: list[dict]) -> None:
    """Write URL list to sitemap.xml, sorted by priority desc then loc asc."""
    urls_sorted = sorted(urls, key=lambda u: (-float(u.get('priority', 0.5)), u['loc']))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             f'<urlset xmlns="{NS}">']
    for u in urls_sorted:
        lines += [
            '  <url>',
            f'    <loc>{u["loc"]}</loc>',
            f'    <lastmod>{u["lastmod"]}</lastmod>',
            f'    <changefreq>{u["changefreq"]}</changefreq>',
            f'    <priority>{u["priority"]}</priority>',
            '  </url>',
        ]
    lines.append('</urlset>')

    with open(SITEMAP_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"✅ sitemap.xml updated — {len(urls_sorted)} URLs")
