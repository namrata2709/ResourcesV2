/**
 * dsa-print.js -- Thin DSA layer over notes-print.js.
 *
 * notes-print.js builds the ENTIRE print window HTML as a single string
 * inside a private closure (executePrint) and writes it via
 * document.write() -- there is no exposed hook to inject an extra
 * stylesheet into that HTML string before it's written. The only point
 * we can reach the print window at all is the window object itself,
 * returned by window.open().
 *
 * So: temporarily wrap window.open for the duration of one print action.
 * When notes-print.js calls window.open('', '_blank', ...) to create the
 * print window, our wrapper catches the returned window reference and
 * appends a <link> for dsa-print.css to its <head> immediately after.
 * dsa-notes.css and styles.css are never loaded by the print window
 * (by design -- see notes-print.js executePrint), so dsa-print.css is
 * the ONLY place DSA-specific print rules can live.
 *
 * File: js/notes/dsa/dsa-print.js
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

        window.openPrintModal = function () {
            originalOpenPrintModal();
            enhanceModalForVisualQuestions();
            installPrintWindowInterceptor();
        };

        console.log('dsa-print.js: print modal patched');
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
        // The print window's content is written asynchronously via
        // document.write() right after window.open() returns. Poll
        // briefly until <head> exists, then append our stylesheet link.
        let attempts = 0;
        const tryInject = function () {
            attempts++;
            try {
                const head = printWin.document.head;
                if (head) {
                    const link = printWin.document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = resolveDsaPrintCssHref();
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
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        for (const link of links) {
            if (link.href.includes('dsa-notes.css')) {
                return link.href.replace('dsa-notes.css', 'dsa-print.css');
            }
        }
        console.error('dsa-print.js: could not resolve dsa-print.css path -- dsa-notes.css link not found');
        return '';
    }

    function enhanceModalForVisualQuestions() {
        const visualContainer = document.getElementById('visualMcqContainer');
        if (!visualContainer) return;

        const modal = document.getElementById('printModal');
        if (!modal) return;

        const wrapper = visualContainer.closest('details.collapsible-section');
        if (!wrapper) return;

        const h2 = wrapper.querySelector('summary h2');
        if (!h2) return;
        const sectionId = h2.id;

        const sectionToggle = modal.querySelector('[data-section="' + sectionId + '"]');
        if (!sectionToggle) return;

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

})();
