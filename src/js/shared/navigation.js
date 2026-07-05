/**
 * =============================================================================
 * File: navigation.js
 * Path: js/shared/navigation.js
 * Project: Learning Dashboard
 *
 * Description:
 * Breadcrumb nav + page header injection. Exposes window.navigation(keys)
 * — call with an array of segment keys, e.g. navigation(['home','quizzes'])
 * or navigation(['home','quizzes','Additional Networking Protocols']).
 * Keys found in navigation-url.json get emoji + title + url from the JSON
 * lookup; unrecognized strings are used as-is (plain title, no emoji, no
 * url — this is intentional for page-specific last-segment titles). Last
 * item = current page (no link, aria-current). Second-last item = back
 * button href. Idempotent — calling again re-renders both nav and header.
 *
 * Usage:
 *   navigation(['home', 'quizzes'])
 *   navigation(['home', 'quizzes', 'Additional Networking Protocols'])
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - window.SiteConfig (js/shared/site-config.js)
 * - data/config/navigation-url.json
 * =============================================================================
 */

(function () {
    'use strict';

    const CONFIG_URL = window.SiteConfig.dataPath('config/navigation-url.json');
    let _navMap = null; // cached after first fetch

    // ── Public API ────────────────────────────────────────────────────────────

    window.navigation = async function (keys) {
        if (!Array.isArray(keys) || keys.length === 0) return;

        if (!_navMap || Object.keys(_navMap).length === 0) _navMap = await _loadConfig();

        const items = keys.map((key, i) => {
            const entry = _navMap[key.toLowerCase()] || null;
            const isLast = i === keys.length - 1;
            const emoji = entry?.emoji ? entry.emoji + ' ' : '';
            const label = entry ? emoji + entry.title : key;
            const url = entry ? entry.url : null;
            return { title: label, url, isLast };
        });

        _renderBreadcrumb(items);
        _renderPageHeader(items);
    };

    // ── Config ────────────────────────────────────────────────────────────────

    async function _loadConfig() {
        try {
            const res = await fetch(CONFIG_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arr = await res.json();
            // Build lookup map keyed by entry.key (lowercase)
            const map = {};
            arr.forEach(entry => { map[entry.title.toLowerCase()] = entry; });
            return map;
        } catch (e) {
            console.warn('⚠️ navigation.js: could not load config.', e);
            return {};
        }
    }

    // ── Breadcrumb nav ────────────────────────────────────────────────────────

    function _renderBreadcrumb(items) {
        const existing = document.querySelector('nav.breadcrumb');

        const nav = document.createElement('nav');
        nav.className = 'breadcrumb';
        nav.setAttribute('aria-label', 'Breadcrumb');

        const ol = document.createElement('ol');
        items.forEach(({ title, url, isLast }) => {
            const li = document.createElement('li');
            if (isLast) {
                li.setAttribute('aria-current', 'page');
                li.textContent = title;
            } else {
                const a = document.createElement('a');
                if (url) a.href = window.SiteConfig.basePath + url; else a.removeAttribute('href');
                a.textContent = title;
                li.appendChild(a);
            }
            ol.appendChild(li);
        });

        nav.appendChild(ol);

        if (existing) {
            existing.replaceWith(nav);
        } else {
            // Insert before .page-container
            const container = document.querySelector('.page-container, .note-container , .gallery-container');
            if (container) {
                container.before(nav);
            } else {
                document.body.insertBefore(nav, document.body.firstChild);
            }
        }
    }

    // ── Page header ───────────────────────────────────────────────────────────

    function _renderPageHeader(items) {
        const existing = document.querySelector('.page-header');
        const current = items[items.length - 1];
        const backItem = items.length > 1 ? items[items.length - 2] : null;

        const header = document.createElement('header');
        header.className = 'page-header';

        if (backItem?.url) {
            const back = document.createElement('a');
            back.href = window.SiteConfig.basePath + backItem.url;
            back.className = 'back-btn';
            back.textContent = '← Back';
            header.appendChild(back);
        }

        const h1 = document.createElement('h1');
        h1.id = 'pageTitle';
        h1.textContent = current.title;
        header.appendChild(h1);

        if (existing) {
            existing.replaceWith(header);
        } else {
            const container = document.querySelector('.page-container, .note-container , .gallery-container');
            if (container) {
                container.insertBefore(header, container.firstChild);
            }
        }
        console.log('✅ Page header injected');
        document.dispatchEvent(new Event('navigationRendered'));
    }

})();