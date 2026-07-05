/**
 * =============================================================================
 * File: site-config.js
 * Path: js/shared/site-config.js
 * Project: Learning Dashboard
 *
 * Description:
 * Global site configuration — must be the first script loaded, in <head>,
 * before everything else. Sets window.SiteConfig (basePath + path helpers
 * for shared/notes/dsa/quiz/data folders) and bootstraps the rest of the
 * shared script chain: loads theme.js synchronously (must run before
 * paint), then navigation.js synchronously unless data-no-nav="true" is
 * set on <body> (dispatches a 'navigationReady' event when done), then
 * shared-meta.js, footer.js, analytics.js, page-loader.js asynchronously.
 * Exposes window.callNavigation(keys) as a safe wrapper any page script
 * can call — queues until navigationReady fires if navigation.js hasn't
 * finished loading yet.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies: none (this is the root of the dependency chain)
 * =============================================================================
 */

(function () {
    'use strict';

     window.SiteConfig = {
        basePath: window.location.hostname === 'localhost'
            ? '/'
            : 'https://namrata2709.github.io/ResourcesV2/',
        sharedPath: function (file) { return this.basePath + 'js/shared/' + file; },
        notesPath: function (file) { return this.basePath + 'js/notes/' + file; },
        dsaPath: function (file) { return this.basePath + 'js/notes/dsa/' + file; },
        quizPath: function (file) { return this.basePath + 'js/quiz/' + file; },
        dataPath: function (file) { return this.basePath + 'data/' + file; }
    };

    function loadScript(path, onload) {
        const script = document.createElement('script');
        script.src = window.SiteConfig.sharedPath(path);
        script.async = false;
        if (onload) script.onload = onload;
        script.onerror = () => console.warn(`⚠️ Failed to load: ${path}`);
        document.head.appendChild(script);
        console.log(`${path} loaded`);
    }

    // theme.js — must run before paint, no deps
    loadScript('theme.js');

    // navigation.js — skip on pages that don't need it (data-no-nav="true")
    if (document.body?.dataset.noNav !== 'true') {
        loadScript('navigation.js', function () {
            window._navReady = true;
            document.dispatchEvent(new Event('navigationReady'));
            console.log('Navigation script loaded');
        });
    }


    // callNavigation — safe wrapper usable by any page script
    // Waits for navigationReady if navigation.js hasn't finished yet
    window.callNavigation = function (keys) {
        if (window._navReady) {
            window.navigation(keys);
        } else {
            document.addEventListener('navigationReady', function () {
                window.navigation(keys);
            }, { once: true });
        }
    };

   

    ['shared-meta.js', 'footer.js', 'analytics.js', 'page-loader.js'].forEach(function (file) {
        const s = document.createElement('script');
        s.src = window.SiteConfig.sharedPath(file);
        s.async = true;
        document.head.appendChild(s);
    });

})();