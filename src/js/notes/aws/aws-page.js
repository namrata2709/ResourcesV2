/**
 * =============================================================================
 * File: aws-page.js
 * Path: js/notes/aws-page.js
 * Project: Learning Dashboard
 *
 * Description:
 * Boot entry point for AWS note pages — thin wrapper calling
 * window.NotesPageCore.init({subjectLabel: 'AWS'}). AWS has no extra
 * scripts or init beyond what every note page already needs (unlike DSA,
 * which adds animation-core.js + renderer files). Dynamically loaded by
 * notes-page-core.js based on <body data-subject="aws">. Requires
 * notes-page-core.js loaded first.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - js/notes/notes-page-core.js (must load first)
 * =============================================================================
 */
(function () {
    'use strict';

    window.NotesPageCore.init({
        subjectLabel: 'AWS'
    });

})();
