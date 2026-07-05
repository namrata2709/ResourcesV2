/**
 * =============================================================================
 * File: notes-favorite.js
 * Path: js/notes/notes-favorite.js
 * Project: Learning Dashboard
 *
 * Description:
 * Adds a Favorite (heart) toggle button to the note page header. Reads
 * and writes the SAME localStorage key/array that notes-index.js uses for
 * its own favorite heart on note-index.html tiles — favoriting a note
 * from either page (its index-page tile, or the note's own page here)
 * stays in sync, since both are really just two views onto one array.
 *
 * The note is identified by its "folder" id — the same id notes-index.js
 * stores (note.folder from notes-index.json). Every note page (notes.html
 * / lab.html / slides.html) lives directly inside its topic folder per
 * generate_notes.py's get_output_path() — data/notes/[folder]/[file] — so
 * the folder id is always the URL segment right before the filename,
 * regardless of how deep the site is hosted (local root vs GitHub Pages
 * subpath). No extra data attribute or build-time injection is needed.
 *
 * The button itself is injected into .page-header — the same "← Back" +
 * title bar element notes-index.js's injectViewAllBtn() appends its
 * "View All Images" button into, built by page-header.js from
 * data-page-title. A plain appendChild, matching that working approach
 * exactly, with no custom layout CSS of our own — .page-header already
 * positions its own children. Visual styling (background-free, outline
 * glyph when un-favorited, filled glyph + accent color when favorited)
 * lives in notes.css (.note-favorite-btn), which is already loaded on
 * every individual note page — no runtime <style> injection needed here,
 * unlike notes-index.js's tile buttons which DO need that (notes-
 * index.css only loads on notes-index.html). .note-header and
 * .note-container are fallback targets for any page template that
 * doesn't render .page-header.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-07-05
 *
 * Dependencies:
 * - .page-header (present in every page's static HTML via page-header.js)
 * - notes.css (.note-favorite-btn rule)
 * =============================================================================
 */
(function () {
    'use strict';

    // Must exactly match notes-index.js's FAVORITES_KEY — this shared key
    // IS the sync mechanism between the two pages. If you ever rename one,
    // rename the other to match, or they'll silently stop agreeing.
    const FAVORITES_KEY = 'notesFavorites';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFavoriteButton);
    } else {
        initFavoriteButton();
    }

    function getCurrentNoteFolder() {
        const parts = location.pathname.split('/').filter(Boolean);
        return parts.length >= 2 ? parts[parts.length - 2] : null;
    }

    function loadFavorites() {
        try {
            const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
            return new Set(Array.isArray(saved) ? saved : []);
        } catch (e) {
            return new Set();
        }
    }

    function saveFavorites(favorites) {
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
        } catch (e) {
            // localStorage unavailable (private browsing, quota, etc.) — fail silently
        }
    }

    // Background-free heart: muted outline (♡) when un-favorited, solid
    // accent-colored fill (♥) when favorited. Styled in notes.css
    // (.note-favorite-btn) rather than injected here — notes.css is
    // already loaded on every individual note page (it's where
    // .note-header, .note-container, .theme-toggle, etc. all live), so
    // there's no reason to duplicate that via a runtime <style> tag the
    // way notes-index.js's tile buttons have to (notes-index.css is
    // only loaded on notes-index.html, which the note pages never see).

    /**
     * .page-header is the same element notes-index.js's injectViewAllBtn()
     * appends into (built by page-header.js from data-page-title) — the
     * "← Back" + title bar visible at the top of every page, index and
     * individual notes alike. Try that first, matching the gallery
     * button's own working approach exactly. .note-header and
     * .note-container remain as fallbacks in case a given page template
     * doesn't render .page-header, rather than silently doing nothing.
     */
    function findInjectionTarget() {
        const pageHeader = document.querySelector('.page-header');
        if (pageHeader) return { el: pageHeader, mode: 'append' };

        const noteHeader = document.querySelector('.note-header');
        if (noteHeader) return { el: noteHeader, mode: 'append' };

        const container = document.querySelector('.note-container');
        if (container) return { el: container, mode: 'prepend' };

        return null;
    }

    function initFavoriteButton() {
        const folder = getCurrentNoteFolder();
        if (!folder) {
            console.warn('notes-favorite.js: could not resolve this note\'s folder id — skipping favorite button');
            return;
        }

        if (document.getElementById('noteFavoriteBtn')) return;

        const target = findInjectionTarget();
        if (!target) {
            console.warn('notes-favorite.js: no .page-header, .note-header, or .note-container found — skipping favorite button');
            return;
        }
        if (target.mode === 'prepend') {
            console.log('ℹ️ notes-favorite.js: no header found on this page template — falling back to .note-container');
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'noteFavoriteBtn';
        btn.className = 'note-favorite-btn';

        function render() {
            const active = loadFavorites().has(folder);
            btn.classList.toggle('active', active);
            btn.textContent = active ? '♥' : '♡';
            btn.title = active ? 'Remove from Favorites' : 'Add to Favorites';
            btn.setAttribute('aria-label', btn.title);
            btn.setAttribute('aria-pressed', String(active));
        }

        btn.addEventListener('click', function () {
            const favorites = loadFavorites();
            if (favorites.has(folder)) {
                favorites.delete(folder);
            } else {
                favorites.add(folder);
            }
            saveFavorites(favorites);
            render();
        });

        // Keeps this page's heart correct if the SAME note is also open
        // (and toggled) on the index page in another browser tab.
        window.addEventListener('storage', function (e) {
            if (e.key === FAVORITES_KEY) render();
        });

        render();
        if (target.mode === 'append') {
            target.el.appendChild(btn);
        } else {
            target.el.insertBefore(btn, target.el.firstChild);
        }

        console.log(`✅ Favorite button initialized for folder: ${folder}`);
    }

})();
