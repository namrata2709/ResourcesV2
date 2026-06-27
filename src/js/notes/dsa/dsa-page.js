/**
 * dsa-page.js — Boot + static element injection for DSA notes pages.
 * Mirrors notes-page.js (AWS) but with DSA-specific paths and labels.
 * Static version for now — loads fixed script list regardless of
 * which sections are present. Will become conditional in a future pass.
 * File: js/notes/dsa/dsa-page.js
 */

(function () {
    'use strict';

    window.NotePageId = document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        try {
            injectStaticElements();
            console.log('✅ dsa-page.js initialized');
        } catch (error) {
            console.error('❌ Error in dsa-page.js:', error);
        }
    }

    function injectStaticElements() {
        injectStaticMeta();
        injectFaviconAndManifest();
        injectBreadcrumb();
        injectBreadcrumbSchema();
        injectThemeToggle();
        injectFooter();
        injectGoogleAnalytics();
        loadAllScripts();
        initCodeTabs();

        console.log('✅ All static elements injected');
    }

    function initCodeTabs() {
        document.querySelectorAll('.code-tab-bar').forEach(function (bar) {
            const tabs = bar.querySelectorAll('.code-tab');
            const panelGroup = bar.parentElement;

            tabs.forEach(function (tab) {
                tab.addEventListener('click', function () {
                    const lang = tab.dataset.lang;

                    tabs.forEach(function (t) {
                        t.classList.remove('active');
                        t.setAttribute('aria-selected', 'false');
                    });
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');

                    panelGroup.querySelectorAll('.code-panel').forEach(function (panel) {
                        const isMatch = panel.id === `code-${lang}`;
                        panel.classList.toggle('active', isMatch);
                        panel.style.display = isMatch ? '' : 'none';
                    });
                });
            });
        });

        console.log('✅ Code language tabs initialized');
    }

    function injectFaviconAndManifest() {
        const base = '../../../../favicon_io/';

        ['32x32', '16x16'].forEach(size => {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/png';
            link.sizes = size;
            link.href = `${base}favicon-${size}.png`;
            document.head.appendChild(link);
        });

        const manifest = document.createElement('link');
        manifest.rel = 'manifest';
        manifest.href = `${base}site.webmanifest`;
        document.head.appendChild(manifest);
    }

    function injectStaticMeta() {
        const head = document.head;

        const author = document.createElement('meta');
        author.name = 'author';
        author.content = 'Namrata Mulwani';
        head.appendChild(author);

        const robots = document.createElement('meta');
        robots.name = 'robots';
        robots.content = 'index, follow';
        head.appendChild(robots);

        const ogSite = document.createElement('meta');
        ogSite.setAttribute('property', 'og:site_name');
        ogSite.content = 'DSA Notes by Namrata';
        head.appendChild(ogSite);

        const twitter = document.createElement('meta');
        twitter.name = 'twitter:card';
        twitter.content = 'summary_large_image';
        head.appendChild(twitter);

        const theme = document.createElement('meta');
        theme.name = 'theme-color';
        theme.content = '#1a1a2e';
        head.appendChild(theme);

        const colorScheme = document.createElement('meta');
        colorScheme.name = 'color-scheme';
        colorScheme.content = 'light dark';
        head.appendChild(colorScheme);

        console.log('✅ Static meta tags injected');
    }

    function injectBreadcrumb() {
        const h1 = document.querySelector('.note-header h1');
        const pageTitle = h1 ? h1.textContent : document.title.split(' - ')[0];

        const nav = document.createElement('nav');
        nav.className = 'breadcrumb';
        nav.setAttribute('aria-label', 'Breadcrumb');
        nav.innerHTML = `
            <ol>
                <li><a href="https://namrata2709.github.io/Resources/">🏠 Home</a></li>
                <li><a href="https://namrata2709.github.io/Resources/notes.html">📓 Notes</a></li>
                <li><a href="https://namrata2709.github.io/Resources/dsa.html">🧮 DSA</a></li>
                <li aria-current="page">${pageTitle}</li>
            </ol>
        `;

        document.body.insertBefore(nav, document.body.firstChild);
        console.log('✅ Breadcrumb navigation injected');
    }

    function injectBreadcrumbSchema() {
        const h1 = document.querySelector('.note-header h1');
        const pageTitle = h1 ? h1.textContent : document.title.split(' - ')[0];

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://namrata2709.github.io/Resources/" },
                { "@type": "ListItem", "position": 2, "name": "Notes", "item": "https://namrata2709.github.io/Resources/notes.html" },
                { "@type": "ListItem", "position": 3, "name": "DSA", "item": "https://namrata2709.github.io/Resources/dsa.html" },
                { "@type": "ListItem", "position": 4, "name": pageTitle }
            ]
        });

        document.head.appendChild(script);
        console.log('✅ Breadcrumb schema injected');
    }

    function injectThemeToggle() {
        const button = document.createElement('button');
        button.id = 'themeToggle';
        button.className = 'theme-toggle';
        button.setAttribute('aria-label', 'Toggle theme');
        button.innerHTML = '<span class="theme-icon"></span>';

        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
            breadcrumb.insertAdjacentElement('afterend', button);
        } else {
            document.body.insertBefore(button, document.body.firstChild);
        }

        console.log('✅ Theme toggle button injected');
    }

    function injectFooter() {
        const footer = document.createElement('footer');
        footer.className = 'content-footer';
        footer.innerHTML = `
            <div class="footer-container">
                <div class="footer-block">
                    <p class="footer-copyright">© 2026 Namrata Mulwani. All rights reserved.</p>
                    <p class="footer-license">Licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)</a></p>
                </div>
                <div class="footer-block">
                    <h4 class="footer-heading">📜 Usage Terms</h4>
                    <ul class="footer-list">
                        <li><strong>You are free to:</strong> Share and adapt this material for educational purposes.</li>
                        <li><strong>You must:</strong> Give appropriate credit and link to the license.</li>
                        <li><strong>You cannot:</strong> Use this material for commercial purposes without permission.</li>
                    </ul>
                    <p class="footer-contact">For commercial licensing: <a href="mailto:awslecturenotes@gmail.com">awslecturenotes@gmail.com</a></p>
                </div>
            </div>
        `;

        document.body.appendChild(footer);
        console.log('✅ Footer injected');
    }

    function injectGoogleAnalytics() {
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-4JFX5WTGFN';
        document.head.appendChild(gaScript);

        const gaInline = document.createElement('script');
        gaInline.textContent = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4JFX5WTGFN');
        `;
        document.head.appendChild(gaInline);

        console.log('✅ Google Analytics injected');
    }

    function loadAllScripts() {
        // Core scripts — reused from AWS, same order matters (async=false)
        const coreScripts = [
            '../../../../js/shared/theme.js',
            '../../../../js/notes/notes-accessibility.js',
            '../../../../js/notes/notes-exam.js',
            '../../../../js/notes/notes-reader.js',
            '../../../../js/notes/notes-print.js',
            '../../../../js/notes/notes-fab.js',
            '../../../../js/notes/notes-touch.js',
            '../../../../js/notes/notes-search.js'
        ];

        // Interactive scripts — reused from AWS
        const interactiveScripts = [
            '../../../../js/notes/notes-mcq.js',
            '../../../../js/notes/notes-checklist.js',
            '../../../../js/notes/notes-glossary.js',
            '../../../../js/notes/notes-interview.js'
        ];

        // DSA-only scripts — new
        const dsaScripts = [
            '../../../../js/notes/dsa/dsa-visualisation.js',
            '../../../../js/notes/dsa/dsa-problems.js',
            '../../../../js/notes/dsa/dsa-contest.js',
            '../../../../js/notes/dsa/dsa-visual-mcq.js',
            '../../../../js/notes/dsa/dsa-print.js'
        ];

        const allScripts = [...coreScripts, ...interactiveScripts, ...dsaScripts];

        allScripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.onload = () => console.log(`✅ Loaded: ${src.split('/').pop()}`);
            script.onerror = () => console.warn(`⚠️ Failed to load: ${src}`);
            document.body.appendChild(script);
        });

        console.log('📚 Loading all DSA notes scripts...');
    }

})();
