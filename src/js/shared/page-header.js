/**
 * page-header.js — Injects .page-header (back button + h1)
 * File: js/shared/page-header.js
 *
 * Reads from <body> data attributes:
 *   data-page-title  — h1 text (required)
 *   data-back-href   — back button href (omit = no back button)
 *   data-back-label  — back button text (default: "← Back")
 *
 * Inserts .page-header inside .page-container if present,
 * else appends to body. Must run after breadcrumb.js.
 *
 * Not used on index.html (no back button, custom header markup).
 */

(function () {
    'use strict';

    function boot() {
        init();

        window.addEventListener("siteHierarchyReady", () => {
            init();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    function init() {
        const body = document.body;
        const title = body.dataset.pageTitle;
        const backHref = window.SiteHierarchy?.parent?.url || null;
        const backLabel = '← Back';

        if (!title) {
            console.warn('⚠️ page-header.js: no data-page-title on <body>, skipping.');
            return;
        }

        // Remove any existing hardcoded .page-header (idempotent)
        document.querySelector('.page-header')?.remove();

        const header = document.createElement('header');
        header.className = 'page-header';

        if (backHref) {
            const back = document.createElement('a');
            back.id = 'pageBackBtn';
            back.href = backHref;
            back.className = 'back-btn';
            back.textContent = backLabel;
            header.appendChild(back);
        }

        const h1 = document.createElement('h1');
        h1.id = 'pageTitle';
        h1.textContent = title;
        header.appendChild(h1);

        // Insert into .page-container if it exists, else after breadcrumb
        const container = document.querySelector('.page-container');
        if (container) {
            container.insertBefore(header, container.firstChild);
        } else {
            const breadcrumb = document.querySelector('nav.breadcrumb');
            if (breadcrumb) {
                breadcrumb.insertAdjacentElement('afterend', header);
            } else {
                document.body.appendChild(header);
            }
        }

        console.log('✅ Page header injected:', title);
    }

})();
