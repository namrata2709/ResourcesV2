/**
 * Analytics Loader (shared)
 * Single source of truth for Google Analytics across every page.
 * Replaces the duplicated inline <script async src="...gtag/js...">
 * + dataLayer/gtag boilerplate that was copy-pasted into every HTML file.
 *
 * Usage: <script src="js/shared/analytics.js"></script>
 * (No inline script needed on the page itself.)
 *
 * File: js/shared/analytics.js
 */

(function () {
    'use strict';

    const GA_MEASUREMENT_ID = 'G-4JFX5WTGFN';

    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);

})();
