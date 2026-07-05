/**
 * =============================================================================
 * File: page-loader.js
 * Path: js/shared/page-loader.js
 * Project: Learning Dashboard
 *
 * Description:
 * Single source of truth for hiding #pageLoader, used on every page with
 * the loader markup. Replaces the duplicated inline
 * window.addEventListener('load', ...) snippet previously copy-pasted
 * into every HTML file. Includes a 5-second safety timeout so the loader
 * can't get stuck forever if a page script throws before 'load' fires.
 *
 * Usage: <script src="js/shared/page-loader.js"></script>
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies: none
 * =============================================================================
 */

(function () {
    'use strict';

    const SAFETY_TIMEOUT_MS = 5000;

    function hideLoader() {
        const loader = document.getElementById('pageLoader');
        if (loader) loader.classList.add('hidden');
    }

    window.addEventListener('load', hideLoader);

    // Safety net — guarantees the loader can't get stuck forever if a
    // page script throws before 'load' fires.
    setTimeout(hideLoader, SAFETY_TIMEOUT_MS);

})();
