/**
 * Footer Injector (shared)
 * Renders the full site footer (copyright, license, usage terms, and an
 * optional per-subject trademark disclaimer) into #footerRoot.
 * Replaces the duplicated <footer class="content-footer"> block that was
 * copy-pasted into every HTML file.
 *
 * The disclaimer is looked up from data/config/disclaimers.json using the
 * subject named in #footerRoot's data-subject attribute. If that subject
 * has no entry (e.g. DSA today), no disclaimer is rendered — add an entry
 * to disclaimers.json whenever a subject needs one.
 *
 * Usage:
 *   <div id="footerRoot" data-subject="aws"></div>
 *   <script src="js/shared/footer.js"></script>
 *
 * Omit data-subject entirely on subject-agnostic pages (dashboard,
 * quiz list) to render the footer with no disclaimer.
 *
 * File: js/shared/footer.js
 */

(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        injectFooter();
    }

    async function injectFooter() {
        const root = document.getElementById('footerRoot');
        if (!root) return;

        const subject = root.dataset.subject || null;
        const disclaimer = await getDisclaimer(subject);

        root.outerHTML = buildFooterHTML(disclaimer);
    }

    async function getDisclaimer(subject) {
        if (!subject) return null;

        try {
            const response = await fetch('data/config/disclaimers.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            return (data.disclaimers && data.disclaimers[subject]) || null;
        } catch (error) {
            console.error('Error loading disclaimers:', error);
            return null;
        }
    }

    function buildFooterHTML(disclaimer) {
        const disclaimerBlock = disclaimer ? `
            <!-- Disclaimer -->
            <div class="footer-disclaimer">
                <p><strong>⚠️ Disclaimer:</strong> ${disclaimer}</p>
            </div>
        ` : '';

        return `
            <footer class="content-footer">
                <div class="footer-container">

                    <!-- Copyright & License -->
                    <div class="footer-block">
                        <p class="footer-copyright">© 2025 Namrata Mulwani. All rights reserved.</p>
                        <p class="footer-license">Licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)</a></p>
                    </div>

                    <!-- Usage Terms -->
                    <div class="footer-block">
                        <h4 class="footer-heading">📜 Usage Terms</h4>
                        <ul class="footer-list">
                            <li><strong>You are free to:</strong> Share and adapt this material for educational purposes.</li>
                            <li><strong>You must:</strong> Give appropriate credit and link to the license.</li>
                            <li><strong>You cannot:</strong> Use this material for commercial purposes without permission.</li>
                        </ul>
                        <p class="footer-contact">For commercial licensing: <a href="mailto:awslecturenotes@gmail.com">awslecturenotes@gmail.com</a></p>
                    </div>
                    ${disclaimerBlock}
                </div>
            </footer>
        `;
    }

})();
