/**
 * Shared Meta Injector
 * Injects the <meta> tags that are identical on every page across the
 * entire site — author, robots, og:site_name, twitter:card, theme-color,
 * color-scheme. Replaces the copy-pasted versions of these five tags that
 * were duplicated in every HTML file's <head>.
 *
 * Page-specific tags (title, description, keywords, canonical, og:title,
 * og:description, og:url, og:image, twitter:title, twitter:description,
 * twitter:image) are NOT included here — they genuinely differ per page
 * and stay written directly in each page's <head>.
 *
 * Usage: <script src="js/shared/shared-meta.js"></script>
 * Place early in <head>, alongside (or instead of) the static versions
 * of these five tags.
 *
 * File: js/shared/shared-meta.js
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

})();
