/**
 * =============================================================================
 * File: shared-meta.js
 * Path: js/shared/shared-meta.js
 * Project: Learning Dashboard
 *
 * Description:
 * Injects <meta> tags identical on every page — author, robots,
 * og:site_name, twitter:card, theme-color, color-scheme — plus favicon
 * <link> tags and the manifest link. Skips injecting any tag a page
 * already declares statically (e.g. 404.html's robots override), so two
 * conflicting tags never coexist. Page-specific tags (title, description,
 * canonical, og:title, etc.) are NOT handled here — they stay hand-written
 * per page.
 *
 * Usage: <script src="js/shared/shared-meta.js"></script>
 * Place early in <head>.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - window.SiteConfig (js/shared/site-config.js) — used for favicon paths
 * =============================================================================
 */

(function () {
    'use strict';

    const SHARED_META = [
        { name: 'author', content: 'Namrata Mulwani' },
        { name: 'robots', content: 'index, follow' },
        { property: 'og:site_name', content: 'Learning Dashboard (Notes By Namrata)' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'theme-color', content: '#1a1a2e' },
        { name: 'color-scheme', content: 'light dark' }
    ];

    const head = document.head;

    SHARED_META.forEach(tagDef => {
        // If the page already declares this tag statically (e.g. 404.html
        // overriding robots to "noindex, follow"), skip injecting our
        // version — avoids two conflicting <meta name="robots"> tags
        // existing at once, which different crawlers resolve inconsistently.
        const selector = tagDef.name
            ? `meta[name="${tagDef.name}"]`
            : `meta[property="${tagDef.property}"]`;
        if (document.querySelector(selector)) return;

        const meta = document.createElement('meta');
        if (tagDef.name) meta.setAttribute('name', tagDef.name);
        if (tagDef.property) meta.setAttribute('property', tagDef.property);
        meta.setAttribute('content', tagDef.content);
        head.appendChild(meta);
    });

    // Favicons + manifest
    const faviconBase = window.SiteConfig.basePath + 'favicon_io/';
    

    [['32x32', 'icon'], ['16x16', 'icon'], ['180x180', 'apple-touch-icon']].forEach(([size, rel]) => {
        if (document.querySelector(`link[sizes="${size}"]`)) return;
        const link = document.createElement('link');
        link.rel = rel;
        link.type = 'image/png';
        link.sizes = size;
        link.href = `${faviconBase}favicon-${size}.png`;
        document.head.appendChild(link);
    });

    if (!document.querySelector('link[rel="manifest"]')) {
        const manifest = document.createElement('link');
        manifest.rel = 'manifest';
        manifest.href = `${faviconBase}site.webmanifest`;
        document.head.appendChild(manifest);
    }

})();
