/**
 * =============================================================================
 * File: analytics.js
 * Path: js/shared/analytics.js
 * Project: Learning Dashboard
 *
 * Description:
 * Single source of truth for Google Analytics (gtag.js) across every
 * page. Replaces the duplicated inline <script async src="...gtag/js...">
 * + dataLayer/gtag boilerplate that was previously copy-pasted into every
 * HTML file. No inline GA snippet should exist on any page anymore.
 *
 * Usage: <script src="js/shared/analytics.js"></script>
 * (No inline script needed on the page itself.)
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies: none (self-contained, injects its own <script> tag)
 * =============================================================================
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
