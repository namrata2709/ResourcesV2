/**
 * Page Loader Handler (shared)
 * Single source of truth for hiding #pageLoader, used on every page that
 * has the loader markup. Replaces the duplicated inline
 * window.addEventListener('load', ...) snippet copy-pasted into every HTML file.
 *
 * Includes a safety timeout: if a page script errors before the 'load'
 * event fires, the loader would otherwise spin forever. This forces it to
 * hide after 5s regardless.
 *
 * Usage: <script src="js/shared/page-loader.js"></script>
 *
 * File: js/shared/page-loader.js
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
