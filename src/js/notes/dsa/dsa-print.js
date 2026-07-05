/**
 * =============================================================================
 * File: dsa-print.js
 * Path: js/notes/dsa/dsa-print.js
 * Project: Learning Dashboard
 *
 * Description:
 * Thin DSA layer over notes-print.js. notes-print.js builds the entire
 * print window HTML as a string inside a private closure and writes it
 * via document.write() — no exposed hook to inject an extra stylesheet
 * before that write happens. This file temporarily wraps window.open for
 * the duration of one print action (armed on the modal's Print button
 * click, disarmed immediately after catching one window) to inject a
 * dsa-print.css <link> into the print window's <head>, since
 * dsa-notes.css/styles.css are never loaded by the print window by
 * design. Also adds an "Include explanations" sub-option to the print
 * modal when #visualMcqContainer is present on the page. Also transforms
 * the Visualisation section for print: shows every step image at once
 * (with print-only headings) instead of just the active one, hides the
 * counter/caption/tab bar/animation iframe, and — since the interactive
 * animation itself can't render on paper — stamps its fully-resolved
 * URL onto the "Open full screen ↗" link so dsa-print.css can print it
 * as a visible, copy-paste-able reference instead of dropping it
 * entirely (see installVisualisationPrintTransform).
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-07-05
 *
 * Dependencies:
 * - js/notes/notes-print.js (must load first — patches window.openPrintModal)
 * - dsa-page.js's dsaModules / notes-page-core.js's stampPrintCategories()
 *   (Interactive/Links section marking now happens there, not in this file
 *   — see the note inside window.openPrintModal below)
 * =============================================================================
 */

(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchPrintModal); 
    } else {
        patchPrintModal();
    }

    function patchPrintModal() {
        if (typeof window.openPrintModal !== 'function') {
            console.warn('dsa-print.js: notes-print.js not loaded yet, skipping patch');
            return;
        }

        const originalOpenPrintModal = window.openPrintModal;
        console.log('dsa-print.js: patching window.openPrintModal');

        window.openPrintModal = function () {
            console.log('dsa-print.js: print modal patched');

            // Interactive/Links section stamping (data-print-interactive /
            // data-print-links) no longer happens here — dsa-page.js's
            // dsaModules registry and notes-page-core.js's
            // stampPrintCategories() do it once at boot for every subject,
            // instead of this file re-walking specific anchors on every
            // print-modal open.

            originalOpenPrintModal();

            const steps = [
                ['enhanceModalForVisualQuestions', enhanceModalForVisualQuestions],
                ['enhanceModalForImplementation', enhanceModalForImplementation],
                ['installPrintWindowInterceptor', installPrintWindowInterceptor],
                ['installImplementationLanguageFilter', installImplementationLanguageFilter],
                ['installVisualisationPrintTransform', installVisualisationPrintTransform],
            ];

            steps.forEach(function (step) {
                const name = step[0];
                const fn = step[1];
                try {
                    fn();
                } catch (e) {
                    console.error('dsa-print.js: ERROR in ' + name + ' —', e);
                }
            });
        };
    }

    /**
     * Wraps window.open for one call only. notes-print.js's executePrint()
     * calls window.open() when the user clicks the final "Print" button
     * inside the modal -- this listens for that click and arms the
     * interceptor right before it fires, then disarms itself immediately
     * after catching one window, so it never affects unrelated window.open
     * calls elsewhere on the page.
     */
    function installPrintWindowInterceptor() {
        console.log('dsa-print.js: installing print window interceptor');
        const modal = document.getElementById('printModal');
        if (!modal) return;

        const printBtn = modal.querySelector('.pm-print-btn');
        if (!printBtn) return;

        printBtn.addEventListener('click', function armInterceptor() {
            const realOpen = window.open;

            window.open = function (...args) {
                const win = realOpen.apply(window, args);
                if (win) {
                    injectDsaPrintCss(win);
                }
                window.open = realOpen; // disarm after first use
                return win;
            };
        }, { once: true, capture: true });
        // capture:true ensures this listener fires before notes-print.js's
        // own click handler on .pm-print-btn, so window.open is wrapped
        // in time.
    }

    function injectDsaPrintCss(printWin) {
        console.log('dsa-print.js: injecting dsa-print.css into print window');
        // The print window's content is written asynchronously via
        // document.write() right after window.open() returns. Poll
        // briefly until <head> exists, then append our stylesheet link.
        let attempts = 0;
        const tryInject = function () {
            attempts++;
            try {
                const head = printWin.document.head;
                if (head) {
                    const href = resolveDsaPrintCssHref();
                    if (!href) return; // don't inject a broken/empty link
                    const link = printWin.document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = href;
                    head.appendChild(link);
                    return;
                }
            } catch (e) {
                // cross-origin or not-yet-ready -- harmless, just retry
            }
            if (attempts < 20) {
                setTimeout(tryInject, 25);
            } else {
                console.warn('dsa-print.js: could not inject dsa-print.css into print window');
            }
        };
        tryInject();
    }

    function resolveDsaPrintCssHref() {
        console.log('dsa-print.js: resolving dsa-print.css path');
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        for (const link of links) {
            if (link.href.includes('dsa-notes.css')) {
                return link.href.replace('dsa-notes.css', 'dsa-print.css');
            }
        }
        console.error('dsa-print.js: could not resolve dsa-print.css path -- dsa-notes.css link not found');
        return '';
    }

    /**
     * Print-only transform for the Visualisation section: shows every step
     * image at once (instead of only whichever one is currently .active),
     * with a print-only heading inserted above each — sourced from the
     * image's data-caption (same value the on-screen caption already uses
     * in dsa-visualisation.js), falling back to its alt text, and finally
     * to a generic "Step N" placeholder if neither exists. The step
     * counter, on-screen caption paragraph, and the tab bar/nav/iframe are
     * hidden — but NOT the "Open full screen ↗" link inside
     * .viz-animation-footer. That link is kept and stamped with its
     * fully-resolved absolute URL (via data-print-url, read from the live
     * anchor's .href — same technique and same reasoning as
     * stampPrintUrls() in notes-print.js: a relative href's raw attribute
     * text means nothing once it's off this page) so dsa-print.css can
     * print a real, copy-paste-able reference to the interactive
     * animation instead of the print output silently losing it.
     *
     * Uses the same technique as installImplementationLanguageFilter:
     * mutate the LIVE .viz-panel DOM synchronously in a capture-phase
     * click handler on the same Print button (so it runs before
     * notes-print.js's own bubble-phase handler clones the section), then
     * restore everything on the next tick.
     *
     * NOTE: this relies on .viz-step-img elements all already existing in
     * the live DOM (dsa-visualisation.js just toggles an "active" class,
     * it never swaps a single <img>'s src) — confirmed by reading that
     * file directly, not assumed.
     */
    function installVisualisationPrintTransform() {
        console.log('dsa-print.js: installing Visualisation print transform');
        const modal = document.getElementById('printModal');
        if (!modal) return;

        const printBtn = modal.querySelector('.pm-print-btn');
        if (!printBtn) return;

        printBtn.addEventListener('click', function transformVisualisation() {
            const panel = document.querySelector('.viz-panel');
            if (!panel) return;

            const images = Array.prototype.slice.call(panel.querySelectorAll('.viz-step-img'));
            if (images.length === 0) return;

            const restoreFns = [];

            function hideEl(el) {
                if (!el) return;
                const prevDisplay = el.style.display;
                el.style.display = 'none';
                restoreFns.push(function () {
                    el.style.display = prevDisplay;
                });
            }

            // Show every step image, with a print-only heading above each
            images.forEach(function (img, i) {
                const hadActive = img.classList.contains('active');
                const prevStyle = img.getAttribute('style') || '';

                img.classList.add('active');
                img.style.removeProperty('display');
                img.style.display = 'block';

                const label = img.dataset.caption || img.alt || ('Step ' + (i + 1));
                const heading = document.createElement('div');
                heading.className = 'print-viz-heading';
                heading.textContent = label;
                heading.style.fontWeight = 'bold';
                heading.style.fontSize = '0.95em';
                heading.style.margin = '12px 0 6px 0';
                img.parentNode.insertBefore(heading, img);

                restoreFns.push(function () {
                    if (!hadActive) img.classList.remove('active');
                    if (prevStyle) {
                        img.setAttribute('style', prevStyle);
                    } else {
                        img.removeAttribute('style');
                    }
                    heading.remove();
                });
            });

            // Hide the step counter ("Step X of Y"). #viz-current/#viz-total
            // are inline <span>s inside a sentence — hide their shared
            // block-level ancestor so no stray "Step"/"of" text is left
            // behind. Falls back to hiding just the two spans if a shared
            // ancestor can't be confidently found.
            const currentEl = panel.querySelector('#viz-current');
            const totalEl = panel.querySelector('#viz-total');
            if (currentEl && totalEl) {
                let wrapper = currentEl.parentElement;
                while (wrapper && wrapper !== panel && !wrapper.contains(totalEl)) {
                    wrapper = wrapper.parentElement;
                }
                if (wrapper && wrapper !== panel) {
                    hideEl(wrapper);
                } else {
                    hideEl(currentEl);
                    hideEl(totalEl);
                }
            }

            // Hide the on-screen caption and the tab bar — print shows
            // only images + our own headings for the Step-by-Step view.
            hideEl(panel.querySelector('#viz-caption'));
            hideEl(panel.querySelector('.viz-tab-bar'));

            // The Animation view's iframe/nav can't render on paper, so
            // those are hidden by dsa-print.css directly (.viz-animation
            // iframe, .viz-tab-bar, .viz-nav). What CAN survive is the
            // "Open full screen ↗" link in .viz-animation-footer — stamp
            // its resolved absolute URL so it prints as a real reference
            // instead of vanishing along with the rest of that view.
            const fullscreenLink = panel.querySelector('.viz-fullscreen-link');
            if (fullscreenLink && fullscreenLink.href) {
                fullscreenLink.setAttribute('data-print-url', fullscreenLink.href);
                restoreFns.push(function () {
                    fullscreenLink.removeAttribute('data-print-url');
                });
            } else {
                // No animation link on this page — nothing to print, hide
                // the (now-empty) footer entirely rather than leaving a
                // blank dashed-border box.
                hideEl(panel.querySelector('.viz-animation-footer'));
            }

            // executePrint()'s clone happens synchronously in the
            // bubble-phase handler on this same click — safe to restore
            // right after the current synchronous work finishes.
            setTimeout(function () {
                restoreFns.forEach(function (fn) {
                    fn();
                });
            }, 0);
        }, { once: true, capture: true });
    }

    function enhanceModalForVisualQuestions() {
        console.log('dsa-print.js: enhancing modal for visual questions');

        const visualContainer = document.getElementById('visualMcqContainer');
        if (!visualContainer) {
            console.log('dsa-print.js: no #visualMcqContainer on this page, skipping');
            return;
        }

        const modal = document.getElementById('printModal');
        if (!modal) return;

        const wrapper = visualContainer.closest('details.collapsible-section');
        if (!wrapper) {
            console.warn('dsa-print.js: #visualMcqContainer has no ancestor details.collapsible-section');
            return;
        }

        const h2 = wrapper.querySelector('summary h2');
        if (!h2) {
            console.warn('dsa-print.js: no summary h2 found for Visual Questions section');
            return;
        }
        const sectionId = h2.id;
        console.log('dsa-print.js: Visual Questions sectionId =', sectionId);

        const sectionToggle = modal.querySelector('[data-section="' + sectionId + '"]');
        if (!sectionToggle) {
            console.warn('dsa-print.js: no modal toggle found for data-section="' + sectionId + '"');
            return;
        }

        const label = sectionToggle.closest('.pm-section-label');
        if (!label || (label.nextElementSibling && label.nextElementSibling.classList.contains('pm-sub-label'))) {
            return; // already has sub-options or not found
        }

        const sub = document.createElement('label');
        sub.className = 'pm-sub-label';
        sub.dataset.parent = sectionId;
        sub.innerHTML =
            '<span class="pm-toggle pm-checked" role="checkbox" ' +
            'aria-checked="true" tabindex="0" ' +
            'data-option="visualMcqExplain"></span>' +
            '<span>Include explanations</span>';
        label.insertAdjacentElement('afterend', sub);
    }

    /**
     * Adds Python / Java / C++ sub-toggles under the Implementation section
     * in the print modal, mirroring the "Highlight correct answers" /
     * "Include explanations" pattern used for MCQ Quiz. All three default
     * to checked, so the out-of-the-box behavior is "print all three
     * languages" rather than whichever tab happened to be active on screen.
     *
     * Located via .code-tab-bar rather than a fixed heading id/text, so it
     * keeps working even if the "Implementation" heading is ever renamed.
     */
    function enhanceModalForImplementation() {
        console.log('dsa-print.js: enhancing modal for Implementation section');
        const tabBar = document.querySelector('.code-tab-bar');
        if (!tabBar) {
            console.log('dsa-print.js: no .code-tab-bar on this page, skipping');
            return;
        }

        const wrapper = tabBar.closest('details.collapsible-section');
        if (!wrapper) {
            console.warn('dsa-print.js: .code-tab-bar has no ancestor details.collapsible-section');
            return;
        }

        const h2 = wrapper.querySelector('summary h2');
        if (!h2) {
            console.warn('dsa-print.js: no summary h2 found for Implementation section');
            return;
        }
        const sectionId = h2.id;
        console.log('dsa-print.js: Implementation sectionId =', sectionId);

        const modal = document.getElementById('printModal');
        if (!modal) return;

        const sectionToggle = modal.querySelector('[data-section="' + sectionId + '"]');
        if (!sectionToggle) {
            console.warn('dsa-print.js: no modal toggle found for data-section="' + sectionId + '"');
            return;
        }

        const label = sectionToggle.closest('.pm-section-label');
        if (!label || (label.nextElementSibling && label.nextElementSibling.classList.contains('pm-sub-label'))) {
            return; // already has sub-options or not found
        }

        const languages = [
            { id: 'implPython', text: 'Python' },
            { id: 'implJava', text: 'Java' },
            { id: 'implCpp', text: 'C++' },
        ];

        let insertAfter = label;
        languages.forEach(function (lang) {
            const sub = document.createElement('label');
            sub.className = 'pm-sub-label';
            sub.dataset.parent = sectionId;
            sub.innerHTML =
                '<span class="pm-toggle pm-checked" role="checkbox" ' +
                'aria-checked="true" tabindex="0" ' +
                'data-option="' + lang.id + '"></span>' +
                '<span>' + lang.text + '</span>';
            insertAfter.insertAdjacentElement('afterend', sub);
            insertAfter = sub;
        });
    }

    /**
     * Reads the Python/Java/C++ sub-toggles at the moment Print is clicked
     * and forces the corresponding .code-panel elements' visibility in the
     * LIVE page (not a clone) before notes-print.js's own click handler
     * clones the Implementation section. executePrint() only knows how to
     * clone the DOM as-is for "content" sections (the opts-based filtering
     * it does exist only for quizContainer/interviewContainer), so this is
     * the only hook point available without modifying notes-print.js.
     *
     * Registered with capture:true on the same click, same trick as
     * installPrintWindowInterceptor uses to run before notes-print.js's
     * bubble-phase print handler on the same button.
     *
     * NOTE: if dsa-print.css hides inactive .code-panel with an
     * `!important` rule (rather than relying on the inline style the JS
     * tab-switcher sets), that will beat this inline style and all three
     * languages won't show. Worth a quick check/print-preview test.
     */
    function installImplementationLanguageFilter() {
        console.log('dsa-print.js: installing Implementation Language Filter');
        const modal = document.getElementById('printModal');
        if (!modal) return;

        const printBtn = modal.querySelector('.pm-print-btn');
        if (!printBtn) return;

        const LANG_LABELS = { python: 'Python', java: 'Java', cpp: 'C++' };

        printBtn.addEventListener('click', function filterImplementationLanguages() {
            function isOn(optionId) {
                const t = modal.querySelector('[data-option="' + optionId + '"]');
                // If the toggle doesn't exist (e.g. no code-tabs on this page),
                // default to including it rather than silently dropping content.
                return t ? t.getAttribute('aria-checked') === 'true' : true;
            }

            const wanted = {
                python: isOn('implPython'),
                java: isOn('implJava'),
                cpp: isOn('implCpp'),
            };

            const touchedPanels = [];
            const insertedHeadings = [];

            document.querySelectorAll('.code-panel[id^="code-"]').forEach(function (panel) {
                const lang = panel.id.replace('code-', '');
                if (!(lang in wanted)) return;
                touchedPanels.push({ panel: panel, prevStyle: panel.getAttribute('style') || '' });
                panel.style.display = wanted[lang] ? 'block' : 'none';

                if (wanted[lang]) {
                    // The Python/Java/C++ labels normally live only on the
                    // .code-tab buttons, which executePrint()'s generic
                    // cloning strips (it removes every <button>). When more
                    // than one language panel is visible at once for print,
                    // there'd be nothing left identifying which is which —
                    // so add a plain (non-button) heading that survives the
                    // strip. Removed again in the restore step below so it
                    // never lingers in the live page.
                    const heading = document.createElement('div');
                    heading.className = 'print-lang-heading';
                    heading.textContent = LANG_LABELS[lang] || lang;
                    heading.style.fontWeight = 'bold';
                    heading.style.fontSize = '0.95em';
                    heading.style.margin = '0 0 6px 0';
                    heading.style.opacity = '0.75';
                    panel.insertBefore(heading, panel.firstChild);
                    insertedHeadings.push(heading);
                }
            });

            // executePrint()'s clone happens synchronously in the bubble-phase
            // handler on this same click, so it's safe to restore right after
            // the current synchronous work finishes.
            setTimeout(function () {
                touchedPanels.forEach(function (entry) {
                    entry.panel.setAttribute('style', entry.prevStyle);
                });
                insertedHeadings.forEach(function (heading) {
                    heading.remove();
                });
            }, 0);
        }, { once: true, capture: true });
    }

})();
