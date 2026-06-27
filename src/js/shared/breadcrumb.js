/**
 * breadcrumb.js — Dynamic breadcrumb nav + JSON-LD schema
 * File: js/shared/breadcrumb.js
 *
 * Reads data/config/page-hierarchy.json, finds current page by path,
 * walks parent chain recursively, renders <nav class="breadcrumb">
 * and injects BreadcrumbList JSON-LD schema.
 *
 * Last crumb label: document.title (stripped of " - Learning Dashboard" suffix)
 * Falls back to "Home > [title]" if page not in JSON.
 *
 * Future automation: generate_quiz_list.py / generate_notes_json.py
 * can append entries to page-hierarchy.json automatically.
 */

(function () {
    'use strict';

    const CONFIG_URL  = 'data/config/page-hierarchy.json';
    const BASE_URL    = 'https://namrata2709.github.io/Resources/';
    const SITE_SUFFIX = ' - Learning Dashboard';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    async function init() {
        try {
            const res  = await fetch(CONFIG_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const pages = await res.json();
            render(pages);
        } catch (e) {
            console.warn('⚠️ breadcrumb.js: could not load config, using fallback.', e);
            renderFallback();
        }
    }

    // ── Build trail ───────────────────────────────────────────────────────────

    function currentPageKey() {
        // Match on pathname + search (e.g. "quiz.html" or "quiz.html?quiz=foo")
        // Strip leading slash and repo prefix so it matches JSON keys.
        const raw = window.location.pathname.replace(/.*\/Resources\//, '') +
                    window.location.search;
        return raw || 'index.html';
    }

    function buildTrail(pages) {
        const map     = {};
        pages.forEach(p => { map[p.url] = p; });

        // Match by path only (ignore query string) — last crumb label comes from document.title
        const pathOnly = currentPageKey().split('?')[0] || 'index.html';
        let   current  = map[pathOnly];

        if (!current) return null; // page not in config

        const trail = [];
        let   node  = current;

        // Walk up parent chain (guard against cycles with a step limit)
        let steps = 0;
        while (node && steps < 10) {
            trail.unshift(node);
            node = node.parent ? map[node.parent] : null;
            steps++;
        }

        return trail;
    }

    // ── Render ────────────────────────────────────────────────────────────────

    function pageTitle() {
        return document.title.replace(SITE_SUFFIX, '').trim() ||
               document.querySelector('h1')?.textContent?.trim() ||
               'Page';
    }

    function render(pages) {
        const trail = buildTrail(pages);
        if (!trail) { renderFallback(); return; }

        const crumbs = trail.map((page, i) => {
            const isLast  = i === trail.length - 1;
            const label   = isLast ? pageTitle() : page.title;
            return { label, href: isLast ? null : page.url };
        });

        injectNav(crumbs);
        injectSchema(crumbs);
        window.SiteHierarchy = { parent: trail.length > 1 ? trail[trail.length - 2] : null };
        console.log('✅ Breadcrumb rendered:', crumbs.map(c => c.label).join(' > '));
    }

    function renderFallback() {
        const crumbs = [
            { label: '🏠 Home', href: 'index.html' },
            { label: pageTitle(), href: null },
        ];
        injectNav(crumbs);
        injectSchema(crumbs);
    }

    function injectNav(crumbs) {
        // Remove any existing breadcrumb (idempotent)
        document.querySelector('nav.breadcrumb')?.remove();

        const nav = document.createElement('nav');
        nav.className = 'breadcrumb';
        nav.setAttribute('aria-label', 'Breadcrumb');

        const ol = document.createElement('ol');
        crumbs.forEach(({ label, href }, i) => {
            const li = document.createElement('li');
            if (!href) {
                // Current page — no link
                li.setAttribute('aria-current', 'page');
                li.textContent = label;
            } else {
                const a  = document.createElement('a');
                a.href   = href;
                // Add home emoji only to first crumb if not already there
                a.textContent = (i === 0 && !label.startsWith('🏠')) ? `🏠 ${label}` : label;
                li.appendChild(a);
            }
            ol.appendChild(li);
        });

        nav.appendChild(ol);

        // Insert: after pageLoader if present, else as first body child
        const loader = document.getElementById('pageLoader');
        if (loader) {
            loader.insertAdjacentElement('afterend', nav);
        } else {
            document.body.insertBefore(nav, document.body.firstChild);
        }
    }

    function injectSchema(crumbs) {
        // Remove existing BreadcrumbList schema to avoid duplicates
        document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
            try {
                if (JSON.parse(s.textContent)['@type'] === 'BreadcrumbList') s.remove();
            } catch (_) {}
        });

        const schema = {
            '@context': 'https://schema.org',
            '@type':    'BreadcrumbList',
            itemListElement: crumbs.map(({ label, href }, i) => ({
                '@type':   'ListItem',
                position:  i + 1,
                name:      label.replace(/^🏠\s*/, ''), // strip emoji from schema
                ...(href ? { item: BASE_URL + href } : {}),
            })),
        };

        const script      = document.createElement('script');
        script.type       = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    }

})();
