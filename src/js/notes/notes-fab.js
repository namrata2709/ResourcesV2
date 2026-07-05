/**
 * =============================================================================
 * File: notes-fab.js
 * Path: js/notes/notes-fab.js
 * Project: Learning Dashboard
 *
 * Description:
 * Floating action menus for note pages — bottom-left Settings menu (exam
 * mode, theme, Lite Mode), top-right Tools menu (search, print, bookmarks,
 * export highlights on complete-notes pages, study timer toggle), shared
 * overlay backdrop, and the jump-to-top button (appears after 500px scroll).
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-07-05
 *
 * Dependencies (all resolved at click-time, not load-time):
 * - window.cycleExamMode, window.exportExamHighlights (notes-exam.js)
 * - window.openPrintModal (notes-print.js)
 * - window.showNotification (notes-reader.js)
 * - window.toggleLiteMode, window.getLiteMode (notes-page-core.js)
 * =============================================================================
 */
(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectFABMenus);
    } else {
        injectFABMenus();
    }

    function injectFABMenus() {
        createBottomLeftMenu();
        createTopRightMenu();
        createMenuOverlay();
        injectJumpToTopButton();
        console.log('✅ Menu panels injected');
    }

    function createBottomLeftMenu() {
        const menuBtn = document.createElement('button');
        menuBtn.className = 'floating-menu-btn';
        menuBtn.id = 'floatingMenuBtn';
        menuBtn.setAttribute('aria-label', 'Settings menu');
        menuBtn.innerHTML = '☰';

        const menuPanel = document.createElement('div');
        menuPanel.className = 'floating-menu-panel';
        menuPanel.id = 'floatingMenuPanel';

        const currentExamMode = localStorage.getItem('examMode') || 'none';
        const examModeLabels = {
            'none': 'None (Reading)',
            'highlight': 'Highlight',
            'test': 'Test'
        };

        const currentTheme = localStorage.getItem('theme') || 'light';
        const themeLabels = {
            'light': 'Light',
            'dark': 'Dark',
            'comfort': 'Comfort'
        };

        const currentLiteMode = window.getLiteMode ? window.getLiteMode() : false;

        menuPanel.innerHTML = `
            <h4>Settings</h4>
            <div class="floating-menu-item" id="menuExamMode">
                <span class="floating-menu-item-icon">📚</span>
                <span class="floating-menu-item-text">Exam Mode</span>
                <span class="floating-menu-item-shortcut">${examModeLabels[currentExamMode]}</span>
            </div>
            <div class="floating-menu-item" id="menuTheme">
                <span class="floating-menu-item-icon">🌙</span>
                <span class="floating-menu-item-text">Theme</span>
                <span class="floating-menu-item-shortcut">${themeLabels[currentTheme]}</span>
            </div>
            <div class="floating-menu-item" id="menuLiteMode">
                <span class="floating-menu-item-icon">🪶</span>
                <span class="floating-menu-item-text">Lite Mode</span>
                <span class="floating-menu-item-shortcut">${currentLiteMode ? 'On' : 'Off'}</span>
            </div>
        `;

        document.body.appendChild(menuBtn);
        document.body.appendChild(menuPanel);

        // Toggle menu open/close
        menuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const isActive = menuPanel.classList.contains('visible');
            closeAllMenus();
            if (!isActive) {
                updateMenuStates();
                menuPanel.classList.add('visible');
                menuBtn.classList.add('active');
                showMenuOverlay();
            }
        });

        // Exam mode click
        document.getElementById('menuExamMode').addEventListener('click', function () {
            window.cycleExamMode();
            setTimeout(updateMenuStates, 100);
            closeAllMenus();
        });

        // Theme click
        document.getElementById('menuTheme').addEventListener('click', function () {
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.click();
                setTimeout(updateMenuStates, 100);
            }
            closeAllMenus();
        });

        // Lite Mode click — toggleLiteMode() reloads the page immediately
        // (unlike exam mode/theme, it changes which scripts load, so there's
        // nothing to update in place), so no updateMenuStates call after.
        document.getElementById('menuLiteMode').addEventListener('click', function () {
            closeAllMenus();
            if (window.toggleLiteMode) {
                window.toggleLiteMode();
            }
        });

        function updateMenuStates() {
            const examMode = localStorage.getItem('examMode') || 'none';
            const theme = localStorage.getItem('theme') || 'light';

            const examShortcut = document.querySelector('#menuExamMode .floating-menu-item-shortcut');
            const themeShortcut = document.querySelector('#menuTheme .floating-menu-item-shortcut');

            if (examShortcut) examShortcut.textContent = examModeLabels[examMode];
            if (themeShortcut) themeShortcut.textContent = themeLabels[theme];
        }
    }

    function createTopRightMenu() {
        const menuBtn = document.createElement('button');
        menuBtn.className = 'actions-menu-btn';
        menuBtn.id = 'actionsMenuBtn';
        menuBtn.setAttribute('aria-label', 'Tools menu');
        menuBtn.innerHTML = '☰';

        let menuHTML = '<h4>Tools</h4>';

        menuHTML += `
            <div class="floating-menu-item" id="menuSearch">
                <span class="floating-menu-item-icon">🔍</span>
                <span class="floating-menu-item-text">Search</span>
                <span class="floating-menu-item-shortcut">/</span>
            </div>
        `;

        menuHTML += `
            <div class="floating-menu-item" id="menuPrint">
                <span class="floating-menu-item-icon">🖨️</span>
                <span class="floating-menu-item-text">Print</span>
                <span class="floating-menu-item-shortcut">Ctrl+P</span>
            </div>
        `;

        menuHTML += `
            <div class="floating-menu-item" id="menuBookmarks">
                <span class="floating-menu-item-icon">📑</span>
                <span class="floating-menu-item-text">Bookmarks</span>
            </div>
        `;

        // Export — complete notes only
        if (document.body.classList.contains('complete-notes')) {
            menuHTML += `
                <div class="floating-menu-item" id="menuExport">
                    <span class="floating-menu-item-icon">📤</span>
                    <span class="floating-menu-item-text">Export Highlights</span>
                </div>
            `;
        }

        // Timer toggle
        const timerHidden = localStorage.getItem('timerHidden') === 'true';
        menuHTML += `
            <div class="menu-divider"></div>
            <div class="floating-menu-item" id="menuTimer">
                <span class="floating-menu-item-icon">⏱️</span>
                <span class="floating-menu-item-text">Study Timer</span>
                <span class="floating-menu-item-shortcut">${timerHidden ? 'Show' : 'Hide'}</span>
            </div>
        `;

        const menuPanel = document.createElement('div');
        menuPanel.className = 'actions-menu-panel';
        menuPanel.id = 'actionsMenuPanel';
        menuPanel.innerHTML = menuHTML;

        document.body.appendChild(menuBtn);
        document.body.appendChild(menuPanel);

        // Toggle menu open/close
        menuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const isActive = menuPanel.classList.contains('visible');
            closeAllMenus();
            if (!isActive) {
                updateTimerMenuState();
                menuPanel.classList.add('visible');
                menuBtn.classList.add('active');
                showMenuOverlay();
            }
        });

        // Search click
        document.getElementById('menuSearch').addEventListener('click', function () {
            closeAllMenus();
            setTimeout(function () {
                const searchContainer = document.getElementById('search-container');
                if (searchContainer) {
                    searchContainer.classList.add('visible');
                    searchContainer.style.display = 'block';
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) {
                        setTimeout(function () {
                            searchInput.focus();
                            searchInput.select();
                        }, 100);
                    }
                } else {
                    console.error('Search container #search-container not found');
                    window.showNotification('Search not available - notes-search.js not loaded');
                }
            }, 200);
        });

        // Print click
        document.getElementById('menuPrint').addEventListener('click', function () {
            closeAllMenus();
            window.openPrintModal();
        });

        // Bookmarks click
        document.getElementById('menuBookmarks').addEventListener('click', function () {
            closeAllMenus();
            const bookmarksPanel = document.getElementById('bookmarksPanel');
            if (bookmarksPanel) {
                bookmarksPanel.classList.toggle('visible');
            }
        });

        // Export click (complete notes only)
        const exportBtn = document.getElementById('menuExport');
        if (exportBtn) {
            exportBtn.addEventListener('click', function () {
                window.exportExamHighlights();
                closeAllMenus();
            });
        }

        // Timer toggle click
        document.getElementById('menuTimer').addEventListener('click', function () {
            const timerDisplay = document.getElementById('studyTimerDisplay');
            if (timerDisplay) {
                timerDisplay.classList.toggle('hidden');
                const isHidden = timerDisplay.classList.contains('hidden');
                localStorage.setItem('timerHidden', isHidden.toString());
                window.showNotification(isHidden ? 'Timer hidden' : 'Timer shown');
                updateTimerMenuState();
            }
            closeAllMenus();
        });

        function updateTimerMenuState() {
            const timerDisplay = document.getElementById('studyTimerDisplay');
            const timerShortcut = document.querySelector('#menuTimer .floating-menu-item-shortcut');
            if (timerShortcut && timerDisplay) {
                timerShortcut.textContent = timerDisplay.classList.contains('hidden') ? 'Show' : 'Hide';
            }
        }
    }

    function createMenuOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        overlay.id = 'menuOverlay';
        overlay.addEventListener('click', closeAllMenus);
        document.body.appendChild(overlay);
    }

    function showMenuOverlay() {
        document.getElementById('menuOverlay').classList.add('active');
    }

    function closeAllMenus() {
        document.querySelectorAll('.floating-menu-panel, .actions-menu-panel').forEach(function (panel) {
            panel.classList.remove('visible');
        });
        document.querySelectorAll('.floating-menu-btn, .actions-menu-btn').forEach(function (btn) {
            btn.classList.remove('active');
        });
        document.getElementById('menuOverlay').classList.remove('active');
    }

    function injectJumpToTopButton() {
        const topBtn = document.createElement('button');
        topBtn.className = 'jump-to-top-btn';
        topBtn.setAttribute('aria-label', 'Scroll to top');
        topBtn.innerHTML = '⬆️';

        topBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', function () {
            topBtn.classList.toggle('visible', window.pageYOffset > 500);
        });

        document.body.appendChild(topBtn);
        console.log('✅ Jump to top button injected');
    }

})();