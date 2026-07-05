/**
 * =============================================================================
 * File: notes-page-core.js
 * Path: js/notes/notes-page-core.js
 * Project: Learning Dashboard
 *
 * Description:
 * Shared boot logic for every AWS and DSA note page — the only script tag
 * an individual note page needs. Reads <body data-subject="aws|dsa">,
 * loads the matching subject loader (aws-page.js or dsa-page.js), which
 * calls back into NotesPageCore.init() with its subject's label, extra
 * modules, and extra init. Centralizes the boot sequence (page ID, the 11
 * shared notes/*.js scripts, callNavigation) in one place — previously
 * duplicated independently per subject, which is how the old
 * notes-page.js callNavigation bug happened.
 *
 * This file is also the single source of truth for which modules are
 * "interactive" (stateful, JS-driven UI) vs "links" (a table/list of
 * outbound references) vs "core" (always loaded). That categorization —
 * MODULE_REGISTRY below — now drives two previously-separate things that
 * used to duplicate/guess this same information independently:
 *   1. Lite Mode (this file) — skips loading interactive/links modules
 *      entirely when the user has it turned on.
 *   2. Print categorization (notes-print.js / dsa-print.js) — used to
 *      hardcode container ids (notes-print.js) or manually walk anchor
 *      elements (dsa-print.js's old markDsaInteractiveSections) to decide
 *      "Interactive Sections" vs "Links & Resources". Both now just read
 *      the data-print-interactive / data-print-links attributes this file
 *      stamps onto each section wrapper at boot, via stampPrintCategories().
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-07-05
 *
 * Dependencies:
 * - window.SiteConfig, window.callNavigation (js/shared/site-config.js)
 * - js/notes/aws-page.js or js/notes/dsa/dsa-page.js (dynamically loaded)
 * =============================================================================
 */

(function () {
    'use strict';

    /**
     * Shared modules loaded on every note page, regardless of subject.
     *
     * category:
     *   'core'        — always loads, never skipped by Lite Mode, never
     *                    treated as a print "Interactive"/"Links" section
     *   'interactive' — stateful/JS-driven UI (quiz, checklist,
     *                    flashcards, swipe gestures) — skipped in Lite
     *                    Mode; its container (if any) is stamped
     *                    data-print-interactive="true" for print
     *   'links'       — renders a table/list of outbound links — skipped
     *                    in Lite Mode; stamped data-print-links="true"
     *
     * containerId, where present, is the DOM id this module renders into
     * — used both to find the container to show a Lite Mode placeholder
     * in, and to find its closest details.collapsible-section to stamp
     * for print.
     */
    const SHARED_MODULES = [
        { file: 'notes-accessibility.js', category: 'core' },
        { file: 'notes-exam.js',          category: 'core' },
        { file: 'notes-search.js',        category: 'interactive' }, // heavy CDN deps (flexsearch, mark.js) — skipped in Lite Mode too
        { file: 'notes-reader.js',        category: 'core' },
        { file: 'notes-print.js',         category: 'core' }, // print must stay available even in Lite Mode
        { file: 'notes-fab.js',           category: 'core' }, // hosts the Lite Mode toggle itself
        { file: 'notes-favorite.js',      category: 'core' }, // heart toggle — shares localStorage with notes-index.js
        { file: 'notes-touch.js',         category: 'interactive' },
        { file: 'notes-mcq.js',           category: 'interactive', containerId: 'quizContainer', label: 'MCQ Quiz' },
        { file: 'notes-checklist.js',     category: 'interactive', containerId: 'checklistContainer', label: 'Checklist' },
        { file: 'notes-glossary.js',      category: 'core',        containerId: 'glossaryContainer' }, // static table, no state — kept even in Lite Mode
        { file: 'notes-interview.js',     category: 'interactive', containerId: 'interviewContainer', label: 'Interview Questions' },
        // No `file` — generated statically by generate_notes.py, not a
        // loaded script. Present on both AWS and DSA pages, so it lives
        // here rather than duplicated in aws-page.js and dsa-page.js.
        // "links-references" is the `id` on the section's <h2>
        // (<summary><h2 id="links-references">), NOT a class on any
        // div — confirmed by running generate_notes.py's own
        // expand_collapsible()/expand_references() against sample input.
        { containerId: 'links-references', category: 'links', label: 'Links & References' }
    ];

    const SEARCH_CDN_DEPS = [
        'https://cdn.jsdelivr.net/npm/flexsearch/dist/flexsearch.bundle.min.js',
        'https://cdn.jsdelivr.net/npm/mark.js/dist/mark.min.js'
    ];

    const SUBJECT_LOADERS = {
        aws: () => `${window.SiteConfig.notesPath('aws/aws-page.js')}`,
        dsa: () => `${window.SiteConfig.dsaPath('dsa-page.js')}`
    };
    const DEFAULT_SUBJECT = 'aws'; // fallback if data-subject is missing/unrecognized

    const LITE_MODE_KEY = 'liteMode';

    function setPageId() {
        window.NotePageId = document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    }

    // ── Lite Mode ─────────────────────────────────────
    //
    // Persisted the same way theme/examMode are: a plain localStorage
    // flag, read on every boot. Unlike theme/examMode (which just swap a
    // CSS class on already-loaded content), Lite Mode changes WHICH
    // SCRIPTS LOAD, so toggling it reloads the page — there's no way to
    // un-load a script that already ran.

    function getLiteMode() {
        try {
            return localStorage.getItem(LITE_MODE_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    function setLiteMode(on) {
        try {
            localStorage.setItem(LITE_MODE_KEY, on ? 'true' : 'false');
        } catch (e) {
            console.warn('notes-page-core.js: could not persist Lite Mode:', e);
        }
        location.reload();
    }

    function toggleLiteMode() {
        setLiteMode(!getLiteMode());
    }

    window.getLiteMode = getLiteMode;
    window.setLiteMode = setLiteMode;
    window.toggleLiteMode = toggleLiteMode;

    function loadScript(src, onload) {
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // preserve load order — later scripts may depend on earlier ones
        script.onload = onload || (() => { });
        script.onerror = () => { };
        document.body.appendChild(script);
    }

    function resolveSharedSrc(file) {
        return `${window.SiteConfig.notesPath('')}/${file}`;
    }

    /**
     * Stamps data-print-interactive="true" / data-print-links="true" onto
     * each module's closest details.collapsible-section wrapper, based
     * purely on its static category — regardless of whether Lite Mode
     * skipped actually loading it. Containers are already present in the
     * server-rendered HTML before any script runs, so this can run
     * immediately at boot; notes-print.js / dsa-print.js read these
     * attributes rather than each maintaining their own container-id list
     * or DOM-walking heuristic.
     */
    // Returns an ARRAY of matching containers. containerId is naturally
    // unique, but containerSelector (e.g. '.viz-panel', '.code-tab-bar')
    // can match multiple elements on one page — a DSA note page can have
    // several Visualisation/Implementation blocks, one per algorithm. A
    // single querySelector() here was the root cause of Lite Mode (and
    // print stamping) only ever touching the first such section on the
    // page and silently leaving every other instance fully live.
    function findModuleContainers(m) {
        if (m.containerId) {
            const el = document.getElementById(m.containerId);
            return el ? [el] : [];
        }
        if (m.containerSelector) {
            return Array.from(document.querySelectorAll(m.containerSelector));
        }
        return [];
    }

    function stampPrintCategories(modules) {
        modules.forEach(function (m) {
            if (m.category === 'core') return;
            findModuleContainers(m).forEach(function (container) {
                const wrapper = container.closest('details.collapsible-section');
                if (!wrapper) return;
                if (m.category === 'interactive') wrapper.dataset.printInteractive = 'true';
                if (m.category === 'links') wrapper.dataset.printLinks = 'true';
            });
        });
    }

    /**
     * Lite Mode skipped this module. Hide the whole enclosing
     * details.collapsible-section outright — as if the section weren't
     * there at all — rather than leaving a visible "hidden in Lite Mode"
     * notice behind. No restore logic is needed here: turning Lite Mode
     * off calls location.reload() (see setLiteMode above), so the section
     * simply renders normally again on the next boot.
     */
    function renderLiteModePlaceholder(m) {
        const wrappersSeen = new Set();

        findModuleContainers(m).forEach(function (container) {
            const wrapper = container.closest('details.collapsible-section') || container;
            if (wrappersSeen.has(wrapper)) return; // avoid redundant work
            wrappersSeen.add(wrapper);
            wrapper.style.display = 'none';
        });
    }

    function resolveSubject() {
        const declared = (document.body.dataset.subject || '').toLowerCase();
        if (SUBJECT_LOADERS[declared]) return declared;
        console.warn(`notes-page-core.js: unrecognized or missing data-subject ("${document.body.dataset.subject}") — defaulting to "${DEFAULT_SUBJECT}"`);
        return DEFAULT_SUBJECT;
    }

    /**
     * Called by aws-page.js / dsa-page.js once they've loaded, to run the
     * actual shared boot sequence with their subject-specific additions.
     *
     * @param {Object} options
     * @param {string} options.subjectLabel - 'AWS' or 'DSA', used as the
     *   middle breadcrumb segment: callNavigation(['Home', subjectLabel, document.title])
     * @param {Object[]} [options.extraModules] - subject-specific module
     *   descriptors: { file, src, category, containerId?, label? }. `src`
     *   must already be fully resolved (e.g. via window.SiteConfig.dsaPath(...)).
     *   Loaded, in order, immediately after the shared modules, subject to
     *   the same Lite Mode filtering.
     * @param {string[]} [options.extraScripts] - DEPRECATED: legacy plain
     *   script-path array, kept for backward compatibility with subject
     *   loaders not yet migrated to extraModules. Always treated as
     *   'core' (never skipped by Lite Mode, never stamped for print).
     * @param {Function} [options.extraInit] - additional synchronous setup
     *   to run inside the same try/catch, after scripts are queued for
     *   loading. Runs on every page load, both readyState branches.
     */
    function init(options) {
        const { subjectLabel, extraModules = [], extraScripts = [], extraInit = () => { } } = options;

        try {
            const sharedModules = SHARED_MODULES.map(function (m) {
                return m.file ? Object.assign({}, m, { src: resolveSharedSrc(m.file) }) : m;
            });
            const legacyModules = extraScripts.map(function (src) {
                return { src, category: 'core' };
            });

            const allModules = sharedModules.concat(extraModules, legacyModules);

            // Exposed so notes-print.js / dsa-print.js (and anything else)
            // can read the same categorization this file used, instead of
            // hardcoding or re-detecting it themselves.
            window.NotesModuleRegistry = allModules;

            const liteMode = getLiteMode();
            document.body.classList.toggle('lite-mode', liteMode);

            const searchModule = allModules.find(m => m.file === 'notes-search.js');
            const searchLoads = !liteMode || !searchModule || searchModule.category === 'core';

            if (searchLoads) {
                SEARCH_CDN_DEPS.forEach(loadScript); // must resolve before notes-search.js
            }

            allModules.forEach(function (m) {
                const skip = liteMode && m.category !== 'core';

                // Print-only entries (no `src`) categorize a page-native
                // section that's already in the static HTML and wired up
                // by extraInit rather than loaded as its own script — e.g.
                // DSA's Implementation code tabs. There's no script to
                // skip loading, but the section itself still needs to be
                // hidden/placeholder'd in Lite Mode just like any other
                // interactive/links section, so this no longer bails out
                // before that can happen.
                if (skip) {
                    renderLiteModePlaceholder(m);
                }
                if (m.src && !skip) {
                    loadScript(m.src);
                }
            });

            stampPrintCategories(allModules);

            // extraInit now receives liteMode so subject loaders can skip
            // wiring up interactivity (e.g. code-tab click handlers) for
            // sections that were just placeholder'd above.
            extraInit(liteMode);
            callNavigation(['Home', subjectLabel, document.title]);
        } catch (e) {
            // Intentionally swallowed — matches prior behavior. A failure
            // here shouldn't block the rest of the page from being usable.
        }
    }

    function boot() {
        setPageId();
        const subject = resolveSubject();
        loadScript(SUBJECT_LOADERS[subject]());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.NotesPageCore = { init };

})();