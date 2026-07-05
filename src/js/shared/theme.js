/**
 * =============================================================================
 * File: theme.js
 * Path: js/shared/theme.js
 * Project: Learning Dashboard
 *
 * Description:
 * Universal theme manager, loaded on every page. Injects #themeToggle if
 * not already in the DOM (legacy pages that hardcode it keep working —
 * injection is skipped). Applies the saved theme on load, cycles
 * light → dark → comfort on click, persists to localStorage, and updates
 * the button's tooltip to show the next theme in the cycle.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies: none (self-contained)
 * =============================================================================
 */

(function () {
    'use strict';

    const THEMES   = ['light', 'dark', 'comfort'];
    const NEXT_LABEL = { light: 'Dark mode', dark: 'Comfort mode', comfort: 'Light mode' };

    // ── 1. Inject button if page doesn't have one ─────────────────────────────
    // Pages that hardcode #themeToggle (legacy) keep working — we skip injection.
    function ensureToggleButton() {
        if (document.getElementById('themeToggle')) return;

        const btn = document.createElement('button');
        btn.id        = 'themeToggle';
        btn.className = 'theme-toggle';
        btn.setAttribute('aria-label', 'Toggle theme');
        btn.innerHTML = '<span class="theme-icon"></span>';

        // Insert as first child of body so it's always on top
        document.body.insertBefore(btn, document.body.firstChild);
    }

    // ── 2. Apply saved theme ──────────────────────────────────────────────────
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateTooltip(theme);
    }

    function updateTooltip(currentTheme) {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        const label = `Switch to ${NEXT_LABEL[currentTheme] ?? 'next theme'}`;
        btn.setAttribute('title',      label);
        btn.setAttribute('aria-label', label);
    }

    // ── 3. Toggle ─────────────────────────────────────────────────────────────
    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next    = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
        applyTheme(next);
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    function init() {
        ensureToggleButton();

        const saved = localStorage.getItem('theme') || 'light';
        applyTheme(THEMES.includes(saved) ? saved : 'light');

        const btn = document.getElementById('themeToggle');
        if (btn) btn.addEventListener('click', toggleTheme);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
