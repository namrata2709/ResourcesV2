/**
 * notes-accessibility.js — All accessibility features
 * Exposes: window.announceToScreenReader
 * Depends on: DOM ready, #themeToggle injected by notes-page.js
 *             window.openPrintModal (notes-print.js) at key-press time
 * File: js/notes-accessibility.js
 */

(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAccessibility);
    } else {
        initAccessibility();
    }

    function initAccessibility() {
        initKeyboardNavigation();
        initSkipLinks();
        initAriaLiveRegions();
        initFocusManagement();
        initKeyboardShortcuts();
        enhanceKeyboardShortcutsPanel(); // must follow initKeyboardShortcuts()
        enhanceExistingElements();
        enhanceAccessibilityLandmarks();
        console.log('✅ Enhanced accessibility initialized');
    }

    function initKeyboardNavigation() {
        let isKeyboardUser = false;

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                isKeyboardUser = true;
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', function () {
            isKeyboardUser = false;
            document.body.classList.remove('keyboard-navigation');
        });

        console.log('✅ Keyboard navigation detection enabled');
    }

    function initSkipLinks() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        skipLink.setAttribute('accesskey', '1');

        document.body.insertBefore(skipLink, document.body.firstChild);

        const noteContent = document.querySelector('.note-content');
        if (noteContent && !noteContent.id) {
            noteContent.id = 'main-content';
            noteContent.setAttribute('role', 'main');
            noteContent.setAttribute('aria-label', 'Main content');
        }

        console.log('✅ Skip links added');
    }

    function initAriaLiveRegions() {
        const liveRegion = document.createElement('div');
        liveRegion.className = 'aria-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.id = 'aria-live-region';

        document.body.appendChild(liveRegion);

        window.announceToScreenReader = function (message) {
            const region = document.getElementById('aria-live-region');
            if (region) {
                region.textContent = message;
                setTimeout(function () {
                    region.textContent = '';
                }, 1000);
            }
        };

        console.log('✅ ARIA live regions initialized');
    }

    function initFocusManagement() {
        document.addEventListener('click', function (e) {
            if (e.target.classList.contains('submit-quiz-btn')) {
                setTimeout(function () {
                    const feedback = document.querySelector('.quiz-feedback');
                    if (feedback) {
                        const isCorrect = feedback.classList.contains('correct');
                        const message = isCorrect ? 'Correct answer!' : 'Incorrect answer.';
                        window.announceToScreenReader(message);
                        feedback.setAttribute('tabindex', '-1');
                        feedback.focus();
                    }
                }, 100);
            }
        });

        document.addEventListener('toggle', function (e) {
            if (e.target.matches('details.collapsible-section')) {
                const isOpen = e.target.hasAttribute('open');
                if (isOpen) {
                    const title = e.target.querySelector('summary h2, summary h3');
                    if (title) {
                        window.announceToScreenReader(`Section expanded: ${title.textContent}`);
                    }
                }
            }
        });

        const quizOptions = document.querySelectorAll('.quiz-option-card');
        quizOptions.forEach(function (option) {
            option.setAttribute('tabindex', '0');

            option.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const radio = option.querySelector('input[type="radio"]');
                    if (radio) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                        window.announceToScreenReader(`Selected option: ${option.textContent.trim()}`);
                    }
                }
            });
        });

        console.log('✅ Focus management initialized');
    }

    function initKeyboardShortcuts() {
        const shortcuts = {
            'Alt+E': 'Toggle exam mode',
            'Alt+T': 'Toggle theme',
            'Alt+P': 'Print page',
            'Alt+K': 'Show keyboard shortcuts',
            '/': 'Search (if available)',
            'Escape': 'Close modals'
        };

        const helpPanel = document.createElement('div');
        helpPanel.className = 'keyboard-shortcuts-help';
        helpPanel.id = 'keyboard-shortcuts-help';
        helpPanel.setAttribute('role', 'dialog');
        helpPanel.setAttribute('aria-label', 'Keyboard shortcuts');

        let helpHTML = '<h3>⌨️ Keyboard Shortcuts</h3><dl>';
        Object.entries(shortcuts).forEach(function ([key, description]) {
            helpHTML += `<dt><kbd>${key}</kbd></dt><dd>${description}</dd>`;
        });
        helpHTML += '</dl>';

        helpPanel.innerHTML = helpHTML;
        document.body.appendChild(helpPanel);

        document.addEventListener('keydown', function (e) {
            // Alt+T: Toggle theme
            if (e.altKey && e.key.toLowerCase() === 't') {
                e.preventDefault();
                const themeToggle = document.getElementById('themeToggle');
                if (themeToggle) {
                    themeToggle.click();
                    window.announceToScreenReader('Theme toggled');
                }
            }

            // Alt+P: Open custom print modal (not native browser print)
            if (e.altKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                if (typeof window.openPrintModal === 'function') {
                    window.openPrintModal();
                }
                window.announceToScreenReader('Opening print dialog');
            }

            // Alt+K: Show keyboard shortcuts
            if (e.altKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const help = document.getElementById('keyboard-shortcuts-help');
                if (help) {
                    help.classList.toggle('visible');
                    if (help.classList.contains('visible')) {
                        help.focus();
                        window.announceToScreenReader('Keyboard shortcuts help opened');
                    } else {
                        window.announceToScreenReader('Keyboard shortcuts help closed');
                    }
                }
            }

            // Escape: Close modals/help
            if (e.key === 'Escape') {
                const help = document.getElementById('keyboard-shortcuts-help');
                if (help && help.classList.contains('visible')) {
                    help.classList.remove('visible');
                    window.announceToScreenReader('Keyboard shortcuts help closed');
                }
            }
        });

        console.log('✅ Keyboard shortcuts initialized');
        console.log('💡 Press Alt+K to see all keyboard shortcuts');
    }

    function enhanceExistingElements() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle && !themeToggle.getAttribute('aria-label')) {
            themeToggle.setAttribute('aria-label', 'Toggle theme between light, dark, and comfort modes');
        }

        const noteContainer = document.querySelector('.note-container');
        if (noteContainer) {
            noteContainer.setAttribute('role', 'article');
            noteContainer.setAttribute('aria-label', 'AWS training notes');
        }

        const footer = document.querySelector('.content-footer');
        if (footer) {
            footer.setAttribute('role', 'contentinfo');
            footer.setAttribute('aria-label', 'Page footer with copyright and license information');
        }

        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
            breadcrumb.setAttribute('role', 'navigation');
            breadcrumb.setAttribute('aria-label', 'Breadcrumb navigation');
        }

        const collapsibleSections = document.querySelectorAll('.collapsible-section');
        collapsibleSections.forEach(function (section) {
            const summary = section.querySelector('summary');
            if (summary) {
                summary.setAttribute('aria-expanded', section.hasAttribute('open'));
                section.addEventListener('toggle', function () {
                    summary.setAttribute('aria-expanded', section.hasAttribute('open'));
                });
            }
        });

        console.log('✅ Enhanced existing elements with accessibility attributes');
    }

    function enhanceAccessibilityLandmarks() {
        try {
            const sections = [
                { selector: '#quizContainer', role: 'complementary', label: 'Practice quiz' },
                { selector: '#checklistContainer', role: 'complementary', label: 'Learning checklist' },
                { selector: '#glossaryContainer', role: 'complementary', label: 'Glossary' },
                { selector: '#interviewContainer', role: 'complementary', label: 'Interview questions' }
            ];

            sections.forEach(function (section) {
                const element = document.querySelector(section.selector);
                if (element) {
                    const details = element.closest('details');
                    if (details) {
                        details.setAttribute('role', section.role);
                        details.setAttribute('aria-label', section.label);
                    }
                }
            });

            document.querySelectorAll('details').forEach(function (details) {
                const summary = details.querySelector('summary');
                if (summary) {
                    summary.setAttribute('aria-expanded', details.hasAttribute('open').toString());
                    details.addEventListener('toggle', function () {
                        summary.setAttribute('aria-expanded', details.hasAttribute('open').toString());
                    });
                }
            });

            const noteContent = document.querySelector('.note-content');
            if (noteContent && !noteContent.hasAttribute('role')) {
                noteContent.setAttribute('role', 'main');
            }

            console.log('✅ Accessibility landmarks enhanced');
        } catch (error) {
            console.error('❌ Error enhancing accessibility:', error);
        }
    }

    function enhanceKeyboardShortcutsPanel() {
        const helpPanel = document.getElementById('keyboard-shortcuts-help');
        if (!helpPanel) return;

        helpPanel.classList.add('enhanced-shortcuts-panel');

        const dl = helpPanel.querySelector('dl');
        if (dl) {
            const shortcuts = {
                'Navigation': [
                    { key: '/', desc: 'Open search' },
                    { key: 'Enter', desc: 'Next search result' },
                    { key: 'Shift+Enter', desc: 'Previous search result' },
                    { key: 'Esc', desc: 'Close search/modals' }
                ],
                'Study Modes': [
                    { key: 'Alt+E', desc: 'Toggle exam mode' },
                    { key: 'Alt+T', desc: 'Toggle theme' }
                ],
                'Actions': [
                    { key: 'Alt+P', desc: 'Print page' },
                    { key: 'Alt+K', desc: 'Show shortcuts' }
                ]
            };

            let newHTML = '<div class="shortcuts-grid">';
            Object.keys(shortcuts).forEach(function (category) {
                newHTML += `<div class="shortcut-category"><h4>${category}</h4>`;
                shortcuts[category].forEach(function (shortcut) {
                    newHTML += `<div class="shortcut-item"><kbd>${shortcut.key}</kbd><span>${shortcut.desc}</span></div>`;
                });
                newHTML += '</div>';
            });
            newHTML += '</div>';

            helpPanel.innerHTML = '<h3>⌨️ Keyboard Shortcuts</h3>' + newHTML;
        }

        console.log('✅ Keyboard shortcuts panel enhanced');
    }

})();