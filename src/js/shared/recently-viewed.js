/**
 * =============================================================================
 * File: recently-viewed.js
 * Path: js/shared/recently-viewed.js
 * Project: Learning Dashboard
 *
 * Description:
 * Reusable "don't hit a dead end" building block, exposed as
 * window.RecentlyViewed. Not auto-run on load and not tied to any one
 * page's element ids — a page calls the two pieces it wants, passing its
 * own container/form/input ids:
 *
 *   RecentlyViewed.renderInto(containerId, [options])
 *     Reads the readingProgress-folder-<folder> localStorage entries
 *     notes-reader.js writes on every note page (the same key notes-
 *     index.js already reads for its own "Recently Viewed" sort — no new
 *     tracking mechanism), cross-references notes-index.json for
 *     titles/links, and renders up to `max` items into containerId.
 *     Removes the container entirely if there's nothing to show.
 *
 *   RecentlyViewed.initSearchRedirect(formId, inputId, [options])
 *     Wires a search form to redirect to notes-index.html?q=<term> (which
 *     notes-index.js reads on load to pre-fill and run the search).
 *
 * Currently used by: 404.html. Intended to also be used by index.html /
 * dashboard.js later — call both functions with the dashboard's own
 * element ids, no changes needed here.
 *
 * Author: Namrata Mulwani
 * Created: 2026-07-05
 * Last Updated: 2026-07-05
 *
 * Dependencies:
 * - window.SiteConfig (js/shared/site-config.js)
 * - data/index/notes-index.json (fetched at runtime, cached after first call)
 * =============================================================================
 */

(function () {
    'use strict';

    const READING_PROGRESS_PREFIX = 'readingProgress-folder-';
    const DEFAULT_MAX = 5;

    // Cached across multiple renderInto() calls on the same page (or a
    // future page that calls it more than once) so notes-index.json is
    // only ever fetched once.
    let notesByFolderPromise = null;

    function fetchNotesByFolder() {
        if (!notesByFolderPromise) {
            notesByFolderPromise = fetch(window.SiteConfig.dataPath('index/notes-index.json'))
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    const byFolder = {};
                    (data.notes || []).forEach(n => { byFolder[n.folder] = n; });
                    return byFolder;
                });
        }
        return notesByFolderPromise;
    }

    function getRecentFolders(max) {
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(READING_PROGRESS_PREFIX)) continue;
            try {
                const parsed = JSON.parse(localStorage.getItem(key));
                if (parsed && parsed.v === 1 && parsed.timestamp) {
                    entries.push({
                        folder: key.slice(READING_PROGRESS_PREFIX.length),
                        timestamp: parsed.timestamp
                    });
                }
            } catch (e) {
                // malformed entry — skip it, don't let one bad key break the list
            }
        }
        entries.sort((a, b) => b.timestamp - a.timestamp);
        return entries.slice(0, max);
    }

    function formatRelativeTime(ts) {
        const mins = Math.round((Date.now() - ts) / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.round(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.round(hours / 24);
        if (days < 30) return `${days}d ago`;
        return new Date(ts).toLocaleDateString();
    }

    // Mirrors openFile()'s path logic in notes-index.js: prefer the
    // "notes" file if this note has one, otherwise the first file. Link
    // types are already a full URL, everything else resolves under
    // data/notes/<folder>/<file>.
    function getPrimaryHref(note) {
        if (!note.files || note.files.length === 0) return null;
        const file = note.files.find(f => f.type === 'notes') || note.files[0];
        if (file.type === 'link') return file.file;
        return window.SiteConfig.dataPath(`notes/${note.folder}/${file.file}`);
    }

    /**
     * @param {string} containerId - element to render into (or remove, if empty)
     * @param {Object} [options]
     * @param {number} [options.max=5] - max items to show
     * @param {string} [options.headingText='Recently Viewed'] - set to '' for no heading
     */
    async function renderInto(containerId, options) {
        const { max = DEFAULT_MAX, headingText = 'Recently Viewed' } = options || {};

        const container = document.getElementById(containerId);
        if (!container) return;

        const recent = getRecentFolders(max);
        if (recent.length === 0) {
            container.remove(); // nothing read yet on this browser — no empty section
            return;
        }

        let notesByFolder;
        try {
            notesByFolder = await fetchNotesByFolder();
        } catch (err) {
            console.error('RecentlyViewed.renderInto: could not load notes-index.json:', err);
            container.remove();
            return;
        }

        const items = recent
            .map(r => ({ note: notesByFolder[r.folder], timestamp: r.timestamp }))
            .filter(x => x.note); // note may have been renamed/removed since last visit

        if (items.length === 0) {
            container.remove();
            return;
        }

        if (headingText) {
            const heading = document.createElement('h2');
            heading.className = 'recently-viewed-heading';
            heading.textContent = headingText;
            container.appendChild(heading);
        }

        const list = document.createElement('ul');
        list.className = 'recently-viewed-list';

        items.forEach(({ note, timestamp }) => {
            const href = getPrimaryHref(note) ||
                `notes-index.html${note.subject ? `?subject=${encodeURIComponent(note.subject)}` : ''}`;

            const li = document.createElement('li');

            const a = document.createElement('a');
            a.href = href;
            a.textContent = note.title;

            const time = document.createElement('span');
            time.className = 'recently-viewed-time';
            time.textContent = formatRelativeTime(timestamp);

            li.appendChild(a);
            li.appendChild(time);
            list.appendChild(li);
        });

        container.appendChild(list);
        console.log(`✅ RecentlyViewed: rendered ${items.length} items into #${containerId}`);
    }

    /**
     * @param {string} formId
     * @param {string} inputId
     * @param {Object} [options]
     * @param {string} [options.targetPage='notes-index.html']
     */
    function initSearchRedirect(formId, inputId, options) {
        const { targetPage = 'notes-index.html' } = options || {};

        const form = document.getElementById(formId);
        const input = document.getElementById(inputId);
        if (!form || !input) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const query = input.value.trim();
            window.location.href = query
                ? `${targetPage}?q=${encodeURIComponent(query)}`
                : targetPage;
        });
    }

    window.RecentlyViewed = { renderInto, initSearchRedirect };

})();
