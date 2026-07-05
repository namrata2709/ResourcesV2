/**
 * =============================================================================
 * File: notes-index.js
 * Path: js/notes/notes-index.js
 * Project: Learning Dashboard
 *
 * Description:
 * Engine for notes-index.html — the notes listing page. Reads ?subject=
 * from the URL to filter notes and set page title/heading, dynamically
 * injects a session filter (only when ≥2 real sessions exist in the
 * current subject), plus category/tag filters, multi-file-per-folder
 * modal (notes/lab/slides icons), image gallery entry point, and
 * related-notes-by-shared-tags. All dynamic HTML is escaped via
 * escHTML()/escAttr()/jsonAttr() before insertion.
 *
 * Search (rewritten 2026-07-04 — same philosophy as notes-search.js):
 * Built on FlexSearch.Document, indexed once per subject when
 * notes-index.json loads (buildSearchIndex()), not on every keystroke.
 * Typing queries the index across title/tags/category/session with
 * per-field weights (title highest, then tags, category, session) so
 * "ec2" ranks EC2 notes above unrelated ones, and tolerates typos/
 * partial words ("lamda" → Lambda) via FlexSearch's forward tokenizer
 * + suggest mode. Matches drive both the result ORDER (searchNotes())
 * and a live suggestions dropdown (updateSuggestions()) as you type.
 * Matched text in rendered cards is highlighted with mark.js
 * (highlightSearchMatches()), mirroring notes-search.js's approach.
 * Keyboard model matches the in-page search: "/" focuses the box,
 * ↑/↓ move through suggestions, Enter opens the highlighted suggestion
 * (or the first visible result if none is highlighted), Esc closes
 * the dropdown / clears the search.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-07-04
 *
 * Dependencies:
 * - window.SiteConfig, window.callNavigation (js/shared/site-config.js)
 * - data/index/notes-index.json
 * - https://cdn.jsdelivr.net/npm/flexsearch/dist/flexsearch.bundle.min.js
 * - https://cdn.jsdelivr.net/npm/mark.js/dist/mark.min.js
 *   (both loaded from notes-index.html before this script; search still
 *   falls back to plain substring matching if either fails to load)
 * =============================================================================
 */

(function () {
    'use strict';

    // ── State ─────────────────────────────────────────────────────────────────

    let allNotes = [];   // full dataset from JSON
    let subjectNotes = [];   // after subject filter
    let filteredData = [];   // after all UI filters
    let categories = new Set();
    let tagsSet = new Set();
    let typeSet = new Set();

    let selectedCategory = '';
    let selectedType = '';
    let selectedTags = new Set();
    let selectedSession = '';
    let showFavoritesOnly = false;

    // ── Search (FlexSearch index, built once per subject load — see
    // buildSearchIndex(). Never rebuilt on keystroke.) ─────────────────────
    let searchIndex = null;          // FlexSearch.Document instance
    let searchIndexReady = false;    // false if CDN failed to load — falls back to substring match
    let currentSearchQuery = '';     // trimmed, as typed
    let currentSearchScores = null;  // Map<folder, weightedScore> | null when no active search
    let searchSuggestions = [];      // notes currently shown in the suggestions dropdown
    let suggestionActiveIndex = -1;  // keyboard-highlighted suggestion, -1 = none

    // Field weights for ranking — title matters most, then tags, category, session.
    // (No free-text "description"/"content" field exists in notes-index.json today;
    // if one is added later, give it the lowest weight per the same scheme.)
    const SEARCH_FIELD_WEIGHTS = { title: 4, tags: 3, category: 2, session: 1 };

    // Favorites (localStorage) — declared here, not down near loadFavorites(),
    // so the binding exists before the boot code below can call init()
    // synchronously (script loads with `defer`, so document.readyState may
    // already be past 'loading' by the time this file runs — see boot section).
    // NOTE: FAVORITES_KEY must exactly match the key notes-favorite.js uses
    // on individual note pages — that shared key is what keeps the index
    // page's heart and the note page's own heart pointing at the same state.
    const FAVORITES_KEY = 'notesFavorites';
    let favoriteFolders = new Set();

    // ── Completion / Recently Viewed sort support ──────────────────────────────
    // Reuses the "readingProgress-folder-<folder>" key notes-reader.js
    // mirrors on each note's own page (scroll-based % read + last-updated
    // timestamp), keyed by note.folder — the exact same id already used for
    // favorites, the modal, and everything else on this page. (An earlier
    // version of this tried to derive the key from note.title instead,
    // matching notes-page-core.js's title-based pageId — but that only
    // works if note.title in notes-index.json is byte-for-byte identical to
    // the real page's <title>, which it isn't. Folder id has no such
    // ambiguity, since it's the literal URL segment, not a guess.)
    function getReadingProgress(note) {
        if (!note.folder) return null;
        try {
            const raw = localStorage.getItem(`readingProgress-folder-${note.folder}`);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && parsed.v === 1 ? parsed : null;
        } catch (e) {
            return null;
        }
    }

    function formatRelativeTime(ts) {
        const mins = Math.round((Date.now() - ts) / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.round(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.round(hours / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.round(days / 30);
        return `${months}mo ago`;
    }

    // Random sort: keys are assigned once per note (lazily) and kept stable
    // across re-filters/re-renders (typing in search, toggling a favorite,
    // etc. must NOT reshuffle the list). A fresh shuffle only happens when
    // the person switches INTO "Random" from a different sort, or presses
    // "Shuffle Again" — tracked via previousSortValue below.
    let randomKeyMap = new Map();
    let previousSortValue = null;

    function getRandomKey(folder) {
        if (!randomKeyMap.has(folder)) {
            randomKeyMap.set(folder, Math.random());
        }
        return randomKeyMap.get(folder);
    }

    function reshuffleRandom() {
        randomKeyMap = new Map();
        sortNotes();
    }


    // Subject config: id → { label, icon, pageTitle, heading }
    const SUBJECT_META = {
        aws: { label: 'AWS', icon: '☁️', pageTitle: 'AWS Notes - Learning Dashboard', heading: '☁️ AWS Notes' },
        dsa: { label: 'DSA', icon: '🧩', pageTitle: 'DSA Notes - Learning Dashboard', heading: '🧩 DSA Notes' }
    };

    const FILE_META = {
        notes: { icon: '📄', label: 'Notes' },
        lab: { icon: '🧪', label: 'Lab' },
        slides: { icon: '📊', label: 'Presentation' }
    };

    // Category → icon map, populated from data/config/category-icons.json.
    // Kept as a small built-in safety net in case that fetch ever fails, so
    // tiles never render with a blank icon.
    let categoryIconMap = {};
    const FALLBACK_CATEGORY_ICONS = {
        Compute: '⚙️',
        Storage: '💾',
        Database: '🗄️',
        Networking: '🌐',
        Security: '🔒',
        Monitoring: '📊',
        Management: '🛠️',
        Fundamentals: '📚',
        General: '📂',
        default: '📂'
    };

    // ── Boot ──────────────────────────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    async function init() {
        applySubjectMeta();
        loadFavorites();
        await loadCategoryIcons();
        loadNotes();
        setupModalClickOutside();
        attachSearchBarListeners();
        callNavigation(['Home', getSubjectParam().toUpperCase() || 'Notes']);
        document.addEventListener('navigationRendered', injectViewAllBtn, { once: true });
    }

    // ── Category icon config ─────────────────────────────────────────────────
    // Add new category → icon pairs in data/config/category-icons.json —
    // no code change needed here.

    async function loadCategoryIcons() {
        try {
            const res = await fetch(window.SiteConfig.dataPath('config/category-icons.json'));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            categoryIconMap = await res.json();
        } catch (err) {
            console.error('Error loading category-icons.json, using built-in fallback:', err);
            categoryIconMap = {};
        }
    }

    // ── Subject meta (title, heading, data-subject on body) ──────────────────

    function getSubjectParam() {
        return new URLSearchParams(window.location.search).get('subject') || '';
    }

    // Lets other pages (e.g. 404.html's search box) deep-link straight into
    // a search result: notes-index.html?q=lambda pre-fills and runs the
    // search on load, the same way ?subject= pre-filters the subject.
    function getSearchQueryParam() {
        return new URLSearchParams(window.location.search).get('q') || '';
    }

    function applySubjectMeta() {
        const subject = getSubjectParam();
        const meta = SUBJECT_META[subject];

        if (meta) {
            // Page title
            document.title = meta.pageTitle;

            // data-page-title drives page-header.js h1 + breadcrumb label
            document.body.setAttribute('data-page-title', meta.heading);

            // data-subject drives footer.js disclaimer lookup
            document.body.setAttribute('data-subject', subject);
        }
        // No subject → body already has data-page-title="📓 Notes", no data-subject needed
    }

    // ── Data ──────────────────────────────────────────────────────────────────

    async function loadNotes() {
        try {
            const res = await fetch(window.SiteConfig.dataPath('index/notes-index.json'));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            allNotes = data.notes || [];
            applySubjectFilter();
            buildFilterSets();
            buildSearchIndex();
            restoreFilterState();

            // ?q= (e.g. from 404.html's search box) wins over a saved/
            // restored search term — it's an explicit intent from the
            // link that brought the person here.
            const urlQuery = getSearchQueryParam();
            if (urlQuery) {
                const searchEl = document.getElementById('searchInput');
                if (searchEl) searchEl.value = urlQuery;
            }

            populateCategoryFilter();
            populateTagFilter();
            populateTypeFilter();
            maybeInjectSessionFilter();
            filterNotes();

        } catch (err) {
            console.error('Error loading notes:', err);
            document.getElementById('notesContainer').innerHTML =
                '<div class="error">Error loading notes. Please try again later.</div>';
        }
    }

    function injectViewAllBtn() {
        const header = document.querySelector('.page-header');
        console.log('injectViewAllBtn called, header:', header);
        if (!header || document.getElementById('viewAllImagesBtn')) return;
        console.log('injectViewAllBtn called');
        const btn = document.createElement('a');
        btn.id = 'viewAllImagesBtn';
        btn.className = 'view-all-images-btn';
        btn.href = window.SiteConfig.basePath + 'gallery.html?folder=all';
        btn.textContent = '🖼️ View All Images';
        header.appendChild(btn);
    }

    // ── Subject filter ────────────────────────────────────────────────────────

    function applySubjectFilter() {
        const subject = getSubjectParam();
        subjectNotes = subject
            ? allNotes.filter(n => n.subject === subject)
            : [...allNotes];
        filteredData = [...subjectNotes];
    }

    // ── Build category / tag sets from current subject ────────────────────────

    function buildFilterSets() {
        categories = new Set();
        tagsSet = new Set();
        typeSet = new Set();
        subjectNotes.forEach(note => {
            if (note.category) categories.add(note.category);
            (note.tags || []).forEach(t => tagsSet.add(t));
            (note.files || []).forEach(f => f.type && typeSet.add(f.type));
        });
    }

    // ── Search index (FlexSearch — built once per subject load) ───────────────
    // Same philosophy as buildFlexIndex() in notes-search.js: index everything
    // up front, then only ever *query* it on keystroke. Rebuilt only when
    // notes-index.json reloads (i.e. subjectNotes changes) — never mid-typing.

    function buildSearchIndex() {
        if (typeof FlexSearch === 'undefined') {
            console.warn('⚠️ FlexSearch not loaded — notes search will fall back to plain substring matching');
            searchIndex = null;
            searchIndexReady = false;
            return;
        }

        searchIndex = new FlexSearch.Document({
            document: {
                id: 'folder',
                index: [
                    { field: 'title', tokenize: 'forward' },
                    { field: 'tags', tokenize: 'forward' },
                    { field: 'category', tokenize: 'forward' },
                    { field: 'session', tokenize: 'forward' }
                ]
            },
            tokenize: 'forward',
            cache: true
        });

        subjectNotes.forEach(note => {
            searchIndex.add({
                folder: note.folder,
                title: note.title || '',
                tags: (note.tags || []).join(' '),
                category: note.category || '',
                session: note.session || ''
            });
        });

        searchIndexReady = true;
        console.log(`🔍 Notes search index built: ${subjectNotes.length} notes (FlexSearch)`);
    }

    /** Normalizes a FlexSearch.Document search() result (which can come back
     *  either as a flat array of ids, or as [{field, result:[ids]}]) into a
     *  flat array of ids, in rank order as returned by FlexSearch. */
    function extractIds(raw) {
        if (!raw) return [];
        if (Array.isArray(raw) && raw.length && raw[0] && Array.isArray(raw[0].result)) {
            return raw.flatMap(r => r.result);
        }
        return raw;
    }

    /**
     * Scores every note matching `query` across the weighted fields and
     * returns a Map<folder, score> (higher = more relevant), or null if the
     * index isn't available. Earlier matches within a field's result list
     * (FlexSearch's own internal ranking) count for slightly more than later
     * ones, on top of the per-field weight.
     */
    function searchNotes(query) {
        if (!searchIndexReady || !searchIndex || !query) return null;

        const scores = new Map();

        Object.entries(SEARCH_FIELD_WEIGHTS).forEach(([field, weight]) => {
            const raw = searchIndex.search(query, { index: [field], suggest: true, limit: 100 });
            const ids = extractIds(raw);
            ids.forEach((id, position) => {
                const positional = Math.max(1 - position * 0.01, 0.5); // small boost for stronger in-field rank
                scores.set(id, (scores.get(id) || 0) + weight * positional);
            });
        });

        return scores;
    }

    /** Plain substring fallback used only if FlexSearch failed to load. */
    function matchesPlainSubstring(note, query) {
        const q = query.toLowerCase();
        const haystack = [
            note.title,
            note.category,
            (note.tags || []).join(' '),
            note.session,
            note.date
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
    }

    // ── Session filter injection ───────────────────────────────────────────────
    // Only shown when at least one note in the current subject set has a session.

    function maybeInjectSessionFilter() {
        const sessions = new Set(
            subjectNotes.map(n => n.session).filter(Boolean)
        );
        if (sessions.size <= 1) return; // need 2+ real sessions for this filter to be useful

        const filterBody = document.getElementById('filterSheetBody') || document.querySelector('.filter-controls');
        if (!filterBody || document.getElementById('sessionFilter')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'filter-group';
        wrapper.innerHTML = `
            <label for="sessionFilter">Session:</label>
            <select id="sessionFilter" onchange="selectSessionChip(this.value)">
                <option value="">All Sessions</option>
                <option value="__generic__">Generic</option>
                ${Array.from(sessions).sort().map(s =>
            `<option value="${escAttr(s)}">${escHTML(s)}</option>`
        ).join('')}
            </select>
            <div id="sessionChips" class="chip-row"></div>
        `;
        wrapper.querySelector('#sessionFilter').value = selectedSession;

        // Insert as first child of the scrollable filter body (below the sheet header)
        filterBody.insertBefore(wrapper, filterBody.firstChild);
    }

    // ── Populate static filters ───────────────────────────────────────────────

    function populateCategoryFilter() {
        const el = document.getElementById('categoryFilter');
        if (!el) return;

        const group = el.closest('.filter-group');
        if (group) group.style.display = categories.size > 1 ? '' : 'none';
        if (categories.size <= 1) return;

        el.innerHTML = '<option value="">All Categories</option>' +
            Array.from(categories).sort().map(cat =>
                `<option value="${escAttr(cat)}">${escHTML(cat)}</option>`
            ).join('');
        el.value = selectedCategory;

        renderSingleChip('categoryChips', selectedCategory, selectedCategory, 'selectCategoryChip');
    }

    function populateTagFilter() {
        const el = document.getElementById('tagFilter');
        if (!el) return;

        const group = el.closest('.filter-group');
        if (group) group.style.display = tagsSet.size > 1 ? '' : 'none';
        if (tagsSet.size <= 1) return;

        el.innerHTML = '<option value="">Add tag…</option>' +
            Array.from(tagsSet).sort()
                .filter(tag => !selectedTags.has(tag))
                .map(tag => `<option value="${escAttr(tag)}">${escHTML(tag)}</option>`)
                .join('');

        renderTagChips();
    }

    function renderTagChips() {
        const el = document.getElementById('tagChips');
        if (!el) return;
        el.innerHTML = Array.from(selectedTags).sort().map(tag => `
            <span class="selected-chip">
                ${escHTML(tag)}
                <button type="button" class="chip-remove" onclick="removeTagChip('${escAttr(tag)}')" aria-label="Remove tag">✕</button>
            </span>
        `).join('');
    }

    function addTagChip(value, selectEl) {
        if (!value) return;
        selectedTags.add(value);
        if (selectEl) selectEl.value = '';
        populateTagFilter();
        filterNotes();
    }

    function removeTagChip(value) {
        selectedTags.delete(value);
        populateTagFilter();
        filterNotes();
    }

    function populateTypeFilter() {
        const el = document.getElementById('typeFilter');
        if (!el) return;

        const group = el.closest('.filter-group');
        if (group) group.style.display = typeSet.size > 1 ? '' : 'none';
        if (typeSet.size <= 1) return;

        el.innerHTML = '<option value="">All Types</option>' +
            Array.from(typeSet).sort().map(type =>
                `<option value="${escAttr(type)}">${escHTML((FILE_META[type] || { label: type }).label)}</option>`
            ).join('');
        el.value = selectedType;

        const label = selectedType ? (FILE_META[selectedType] || { label: selectedType }).label : '';
        renderSingleChip('typeChips', selectedType, label, 'selectTypeChip');
    }

    // ── Chip handlers ────────────────────────────────────────────────────────

    function renderSingleChip(containerId, value, label, clearFnName) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!value) { el.innerHTML = ''; return; }
        el.innerHTML = `
            <span class="selected-chip">
                ${escHTML(label)}
                <button type="button" class="chip-remove" onclick="${clearFnName}('')" aria-label="Remove filter">✕</button>
            </span>
        `;
    }

    function selectCategoryChip(value) {
        selectedCategory = value;
        const el = document.getElementById('categoryFilter');
        if (el) el.value = value;
        renderSingleChip('categoryChips', value, value, 'selectCategoryChip');
        filterNotes();
    }

    function selectTypeChip(value) {
        selectedType = value;
        const el = document.getElementById('typeFilter');
        if (el) el.value = value;
        const label = value ? (FILE_META[value] || { label: value }).label : '';
        renderSingleChip('typeChips', value, label, 'selectTypeChip');
        filterNotes();
    }

    function selectSessionChip(value) {
        selectedSession = value;
        const el = document.getElementById('sessionFilter');
        if (el) el.value = value;
        const label = value === '__generic__' ? 'Generic' : value;
        renderSingleChip('sessionChips', value, label, 'selectSessionChip');
        filterNotes();
    }

    function toggleFavoritesFilter(force) {
        showFavoritesOnly = typeof force === 'boolean' ? force : !showFavoritesOnly;
        updateFavoritesFilterButton();
        filterNotes();
    }

    function updateFavoritesFilterButton() {
        const btn = document.getElementById('favoritesOnlyToggle');
        if (!btn) return;
        btn.classList.toggle('active', showFavoritesOnly);
        btn.setAttribute('aria-pressed', String(showFavoritesOnly));
        const icon = btn.querySelector('.favorites-filter-icon');
        if (icon) icon.textContent = showFavoritesOnly ? '♥' : '♡';
    }

    // ── Persisted filter state (localStorage) ──────────────────────────────────

    function storageKey() {
        return `notesFilterState:${getSubjectParam() || 'all'}`;
    }

    function saveFilterState() {
        try {
            const state = {
                search: document.getElementById('searchInput')?.value || '',
                selectedCategory,
                selectedType,
                selectedTags: Array.from(selectedTags),
                selectedSession,
                showFavoritesOnly,
                sort: document.getElementById('sortSelect')?.value || 'date-desc'
            };
            localStorage.setItem(storageKey(), JSON.stringify(state));
        } catch (e) {
            // localStorage unavailable (private browsing, quota, etc.) — fail silently
        }
    }

    function restoreFilterState() {
        let saved;
        try {
            saved = JSON.parse(localStorage.getItem(storageKey()) || 'null');
        } catch (e) {
            saved = null;
        }
        if (!saved) return;

        const searchEl = document.getElementById('searchInput');
        if (searchEl && saved.search) searchEl.value = saved.search;

        if (saved.selectedCategory && categories.has(saved.selectedCategory)) {
            selectedCategory = saved.selectedCategory;
        }
        if (saved.selectedType && typeSet.has(saved.selectedType)) {
            selectedType = saved.selectedType;
        }
        if (Array.isArray(saved.selectedTags)) {
            selectedTags = new Set(saved.selectedTags.filter(t => tagsSet.has(t)));
        }
        const sessions = new Set(subjectNotes.map(n => n.session).filter(Boolean));
        if (saved.selectedSession === '__generic__' || sessions.has(saved.selectedSession)) {
            selectedSession = saved.selectedSession;
        }
        showFavoritesOnly = !!saved.showFavoritesOnly;
        updateFavoritesFilterButton();

        const sortEl = document.getElementById('sortSelect');
        if (sortEl && saved.sort) sortEl.value = saved.sort;
    }

    // ── Mobile filter sheet ──────────────────────────────────────────────────

    function toggleFilterSheet() {
        const isOpen = document.getElementById('filterControls')?.classList.toggle('open');
        document.getElementById('filterSheetOverlay')?.classList.toggle('active');
        document.getElementById('themeToggle').style.display = 'none';
        document.body.classList.toggle('filter-sheet-locked', !!isOpen);
    }

    function closeFilterSheet() {
        document.getElementById('filterControls')?.classList.remove('open');
        document.getElementById('themeToggle').style.display = 'flex';
        document.getElementById('filterSheetOverlay')?.classList.remove('active');
        document.body.classList.remove('filter-sheet-locked');
    }

    function clearAllFilters() {
        selectedCategory = '';
        selectedType = '';
        selectedTags = new Set();
        selectedSession = '';
        showFavoritesOnly = false;

        const searchEl = document.getElementById('searchInput');
        if (searchEl) searchEl.value = '';
        currentSearchQuery = '';
        currentSearchScores = null;
        closeSuggestions();

        populateCategoryFilter();
        populateTagFilter();
        populateTypeFilter();

        const sessionEl = document.getElementById('sessionFilter');
        if (sessionEl) sessionEl.value = '';
        renderSingleChip('sessionChips', '', '', 'selectSessionChip');

        updateFavoritesFilterButton();

        filterNotes();
    }

    // ── Search suggestions (autocomplete dropdown) ─────────────────────────────
    // Reuses searchNotes() — no separate index or extra querying — so
    // suggestions and results are always ranked consistently with each other.

    function updateSuggestions(query) {
        const box = document.getElementById('searchSuggestions');
        const input = document.getElementById('searchInput');
        if (!box) return;

        if (!query || query.length < 2 || !searchIndexReady) {
            closeSuggestions();
            return;
        }

        const scoreMap = searchNotes(query);
        if (!scoreMap || scoreMap.size === 0) {
            closeSuggestions();
            return;
        }

        searchSuggestions = subjectNotes
            .filter(n => scoreMap.has(n.folder))
            .sort((a, b) => scoreMap.get(b.folder) - scoreMap.get(a.folder))
            .slice(0, 6);

        suggestionActiveIndex = -1;

        box.innerHTML = searchSuggestions.map((n, i) => `
            <div class="suggestion-item" role="option" id="suggestion-${i}" data-index="${i}" aria-selected="false">
                <span class="suggestion-icon">${getCategoryIcon(n.category)}</span>
                <span class="suggestion-text">${escHTML(n.title)}</span>
                ${n.category ? `<span class="suggestion-category">${escHTML(n.category)}</span>` : ''}
            </div>
        `).join('');

        box.querySelectorAll('.suggestion-item').forEach(el => {
            // mousedown (not click) so it fires before the input's blur/close logic
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                selectSuggestion(parseInt(el.dataset.index, 10));
            });
        });

        box.classList.add('visible');
        if (input) input.setAttribute('aria-expanded', 'true');
    }

    function closeSuggestions() {
        const box = document.getElementById('searchSuggestions');
        const input = document.getElementById('searchInput');
        if (box) {
            box.classList.remove('visible');
            box.innerHTML = '';
        }
        if (input) input.setAttribute('aria-expanded', 'false');
        searchSuggestions = [];
        suggestionActiveIndex = -1;
    }

    function moveSuggestionActive(delta) {
        const box = document.getElementById('searchSuggestions');
        if (!box || !box.classList.contains('visible') || searchSuggestions.length === 0) return;

        suggestionActiveIndex = (suggestionActiveIndex + delta + searchSuggestions.length) % searchSuggestions.length;

        const items = box.querySelectorAll('.suggestion-item');
        items.forEach((el, i) => {
            const active = i === suggestionActiveIndex;
            el.classList.toggle('active', active);
            el.setAttribute('aria-selected', String(active));
        });
        items[suggestionActiveIndex]?.scrollIntoView({ block: 'nearest' });
    }

    function selectSuggestion(index) {
        const note = searchSuggestions[index];
        const input = document.getElementById('searchInput');
        if (!note || !input) return;

        input.value = note.title;
        closeSuggestions();
        filterNotes();
        input.focus();
    }

    // ── Search bar wiring — debounced filter + suggestions, keyboard nav ───────
    // Mirrors the in-page search's interaction model ("/", ↑/↓, Enter, Esc)
    // from notes-search.js, so the listing page feels consistent with it.

    function attachSearchBarListeners() {
        const input = document.getElementById('searchInput');
        if (!input) return;

        let debounceTimer;

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                filterNotes();
                updateSuggestions(input.value.trim());
            }, 120);
        });

        input.addEventListener('keydown', e => {
            const suggestionsOpen = document.getElementById('searchSuggestions')?.classList.contains('visible');

            switch (e.key) {
                case 'ArrowDown':
                    if (suggestionsOpen) {
                        e.preventDefault();
                        moveSuggestionActive(1);
                    }
                    break;

                case 'ArrowUp':
                    if (suggestionsOpen) {
                        e.preventDefault();
                        moveSuggestionActive(-1);
                    }
                    break;

                case 'Enter':
                    e.preventDefault();
                    if (suggestionsOpen && suggestionActiveIndex >= 0) {
                        selectSuggestion(suggestionActiveIndex);
                    } else {
                        closeSuggestions();
                        // Open the top result directly, same "Enter → open resource"
                        // behavior as the in-page search.
                        if (filteredData.length > 0) openFolder(filteredData[0]);
                    }
                    break;

                case 'Escape':
                    if (suggestionsOpen) {
                        e.preventDefault();
                        closeSuggestions();
                    } else if (input.value) {
                        e.preventDefault();
                        input.value = '';
                        filterNotes();
                        input.blur();
                    }
                    break;
            }
        });

        input.addEventListener('blur', () => {
            // Delay so a suggestion's mousedown can fire first
            setTimeout(closeSuggestions, 150);
        });

        // Global "/" shortcut — focuses search unless already typing elsewhere
        document.addEventListener('keydown', e => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) {
                return;
            }

            e.preventDefault();
            input.focus();
            input.select();
        });
    }

    // ── Filter + Sort ─────────────────────────────────────────────────────────

    function filterNotes() {
        const rawSearch = document.getElementById('searchInput')?.value || '';
        const search = rawSearch.trim();

        currentSearchQuery = search;
        currentSearchScores = search ? searchNotes(search) : null;

        filteredData = subjectNotes.filter(note => {
            let matchSearch = true;
            if (search) {
                matchSearch = currentSearchScores
                    ? currentSearchScores.has(note.folder)
                    : matchesPlainSubstring(note, search); // FlexSearch unavailable — plain fallback
            }

            const matchCategory = !selectedCategory || note.category === selectedCategory;
            const matchTag = selectedTags.size === 0 || (note.tags || []).some(t => selectedTags.has(t));
            const matchType = !selectedType || (note.files || []).some(f => f.type === selectedType);
            const matchFavorite = !showFavoritesOnly || favoriteFolders.has(note.folder);
            let matchSession = true;
            if (selectedSession === '__generic__') {
                matchSession = !note.session;
            } else if (selectedSession) {
                matchSession = note.session === selectedSession;
            }

            return matchSearch && matchCategory && matchTag && matchType && matchFavorite && matchSession;
        });

        sortNotes();
    }

    function sortNotes() {
        const val = document.getElementById('sortSelect')?.value || 'date-desc';

        // Fresh shuffle only on a genuine switch INTO random mode (not on
        // every re-filter/re-render while already sorted randomly).
        if (val === 'random' && previousSortValue !== 'random') {
            randomKeyMap = new Map();
        }
        previousSortValue = val;

        const shuffleBtn = document.getElementById('shuffleAgainBtn');
        if (shuffleBtn) shuffleBtn.hidden = val !== 'random';

        filteredData.sort((a, b) => {
            // Active search: relevance always wins first, so "ec2" reliably
            // surfaces EC2 notes above unrelated ones regardless of the
            // selected sort. The chosen sort only breaks ties within
            // equally-relevant results.
            if (currentSearchScores) {
                const scoreA = currentSearchScores.get(a.folder) || 0;
                const scoreB = currentSearchScores.get(b.folder) || 0;
                if (scoreB !== scoreA) return scoreB - scoreA;
            }

            switch (val) {
                case 'date-desc': return new Date(b.date) - new Date(a.date);
                case 'date-asc': return new Date(a.date) - new Date(b.date);
                case 'title-asc': return a.title.localeCompare(b.title);
                case 'title-desc': return b.title.localeCompare(a.title);

                // Least Complete → Completed. Notes never opened have no
                // readingProgress entry at all, so they default to 0% —
                // correctly sorting to the "least complete" end.
                case 'completion-asc': {
                    const pa = getReadingProgress(a)?.percent ?? 0;
                    const pb = getReadingProgress(b)?.percent ?? 0;
                    return pa - pb;
                }
                case 'completion-desc': {
                    const pa = getReadingProgress(a)?.percent ?? 0;
                    const pb = getReadingProgress(b)?.percent ?? 0;
                    return pb - pa;
                }

                // Most Recent → Oldest, using the same timestamp
                // notes-reader.js stamps on every scroll-progress save.
                // Never-viewed notes default to timestamp 0, so they
                // naturally sink to "oldest".
                case 'viewed-desc': {
                    const ta = getReadingProgress(a)?.timestamp ?? 0;
                    const tb = getReadingProgress(b)?.timestamp ?? 0;
                    return tb - ta;
                }
                case 'viewed-asc': {
                    const ta = getReadingProgress(a)?.timestamp ?? 0;
                    const tb = getReadingProgress(b)?.timestamp ?? 0;
                    return ta - tb;
                }

                case 'random':
                    return getRandomKey(a.folder) - getRandomKey(b.folder);

                default: return 0;
            }
        });

        renderNotes();
        saveFilterState();
    }

    // ── Favorites (localStorage — same pattern as filter state) ───────────────
    // Stored as a flat array of note.folder ids under one global key, shared
    // across subjects (a note favorited from the AWS list should still show as
    // favorited if you later view it from the DSA list) — AND shared with
    // each note's own page via notes-favorite.js, which reads/writes the
    // exact same FAVORITES_KEY.

    function loadFavorites() {
        try {
            const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
            favoriteFolders = new Set(Array.isArray(saved) ? saved : []);
        } catch (e) {
            favoriteFolders = new Set();
        }
    }

    function saveFavorites() {
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favoriteFolders)));
        } catch (e) {
            // localStorage unavailable (private browsing, quota, etc.) — fail silently
        }
    }

    function isFavorite(folder) {
        return favoriteFolders.has(folder);
    }

    function toggleFavorite(folder, btn) {
        if (favoriteFolders.has(folder)) {
            favoriteFolders.delete(folder);
        } else {
            favoriteFolders.add(folder);
        }
        saveFavorites();

        // If the Favorites Only filter is active, toggling a heart can
        // change which cards should be visible at all (e.g. unfavoriting
        // should drop the card from view immediately) — a full re-filter
        // is needed rather than just flipping this one button's state.
        if (showFavoritesOnly) {
            filterNotes();
            return;
        }

        if (btn) {
            const active = favoriteFolders.has(folder);
            btn.classList.toggle('active', active);
            btn.textContent = active ? '♥' : '♡';
            btn.title = active ? 'Remove from Favorites' : 'Add to Favorites';
            btn.setAttribute('aria-label', active ? 'Remove from Favorites' : 'Add to Favorites');
            btn.setAttribute('aria-pressed', String(active));
        }
    }

    // ── Copy link (primary content file for a note) ───────────────────────────

    // Ensures a copyable link is always absolute. SiteConfig.dataPath()
    // returns a full URL in production (basePath is the GitHub Pages origin)
    // but only a root-relative path locally (basePath is "/"), so a plain
    // path-only result would paste as unusable outside the browser.
    function toAbsoluteUrl(path) {
        if (/^https?:\/\//i.test(path)) return path;
        return window.location.origin + (path.startsWith('/') ? path : `/${path}`);
    }

    function getPrimaryFileUrl(note) {
        const files = note.files || [];
        const primary = files.find(f => f.type === 'notes') || files[0];
        if (!primary) return null;
        if (primary.type === 'link') return toAbsoluteUrl(primary.file);
        return toAbsoluteUrl(window.SiteConfig.dataPath(`notes/${note.folder}/${primary.file}`));
    }

    function copyNoteLink(note, btn) {
        const url = getPrimaryFileUrl(note)
            || toAbsoluteUrl(window.SiteConfig.basePath + `gallery.html?folder=${encodeURIComponent(note.folder)}`);

        const showCopied = () => {
            if (!btn) return;
            const original = btn.textContent;
            btn.textContent = '✓';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = original;
                btn.classList.remove('copied');
            }, 1200);
        };

        const fallbackCopy = () => {
            const ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) { /* ignore */ }
            document.body.removeChild(ta);
            showCopied();
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).then(showCopied).catch(fallbackCopy);
        } else {
            fallbackCopy();
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    function renderNotes() {
        const container = document.getElementById('notesContainer');

        if (filteredData.length === 0) {
            container.innerHTML = currentSearchQuery
                ? `<div class="loading">No notes found for "${escHTML(currentSearchQuery)}".</div>`
                : '<div class="loading">No notes found.</div>';
            return;
        }

        container.innerHTML = filteredData.map(note => `
            <div class="note-folder"
                 role="button"
                 tabindex="0"
                 onclick='openFolder(${jsonAttr(note)})'
                 onkeydown='if(event.key==="Enter"||event.key===" ")openFolder(${jsonAttr(note)})'
                 aria-label="Open ${escAttr(note.title)}">
                <div class="folder-icon">${getCategoryIcon(note.category)}</div>
                <div class="folder-content">
                    <h3>${escHTML(note.title)} ${getTypeBadgesHTML(note)}</h3>
                    <div class="note-meta">
                        <span>${escHTML(note.category || 'General')}</span>
                        ${note.session ? `<span class="session-badge">🗓️ ${escHTML(note.session)}</span>` : ''}
                        <span>📅 ${formatDate(note.date)}</span>
                        ${getProgressBadgeHTML(note)}
                    </div>
                    <div class="card-quick-actions">
                        <button type="button" class="qa-btn" title="Open" aria-label="Open ${escAttr(note.title)}"
                            onclick='event.stopPropagation(); openFolder(${jsonAttr(note)})'
                            onkeydown="event.stopPropagation()">↗️</button>
                        <button type="button" class="qa-btn qa-favorite${isFavorite(note.folder) ? ' active' : ''}"
                            title="${isFavorite(note.folder) ? 'Remove from Favorites' : 'Add to Favorites'}"
                            aria-label="${isFavorite(note.folder) ? 'Remove from Favorites' : 'Add to Favorites'}"
                            aria-pressed="${isFavorite(note.folder)}"
                            onclick="event.stopPropagation(); toggleFavorite('${escAttr(note.folder)}', this)"
                            onkeydown="event.stopPropagation()">${isFavorite(note.folder) ? '♥' : '♡'}</button>
                        <button type="button" class="qa-btn" title="Copy Link" aria-label="Copy link to ${escAttr(note.title)}"
                            onclick='event.stopPropagation(); copyNoteLink(${jsonAttr(note)}, this)'
                            onkeydown="event.stopPropagation()">🔗</button>
                        ${note.hasImages && note.images && note.images.length > 0 ? `
                        <button type="button" class="qa-btn" title="Gallery" aria-label="Open image gallery for ${escAttr(note.title)}"
                            onclick="event.stopPropagation(); openGallery('${escAttr(note.folder)}')"
                            onkeydown="event.stopPropagation()">🖼️</button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        highlightSearchMatches();
    }

    // ── Highlight matched search terms in rendered cards (mark.js) ─────────────
    // Same tool/approach as notes-search.js's in-page highlighting.

    function highlightSearchMatches() {
        const container = document.getElementById('notesContainer');
        if (!container || typeof Mark === 'undefined') return;

        const instance = new Mark(container);
        instance.unmark({
            done: () => {
                if (!currentSearchQuery) return;
                instance.mark(currentSearchQuery, {
                    element: 'mark',
                    className: 'search-highlight',
                    separateWordSearch: true,
                    acrossElements: false,
                    exclude: ['.qa-btn', '.qa-btn *']
                });
            }
        });
    }

    // ── Modal ─────────────────────────────────────────────────────────────────

    function openFolder(note) {
        document.getElementById('modalTitle').textContent = note.title;

        // Tags row
        let html = '';
        if (note.tags && note.tags.length > 0) {
            html += `<div class="modal-tags">
                <span class="tags-label">Tags:</span>
                ${note.tags.map(t =>
                `<span class="tag-chip" onclick="filterByTag('${escAttr(t)}')">${escHTML(t)}</span>`
            ).join('')}
            </div>`;
        }

        html += '<div class="files-list">';

        // Image gallery entry
        if (note.hasImages && note.images && note.images.length > 0) {
            html += `
                <div class="file-item" onclick="openGallery('${escAttr(note.folder)}')">
                    <span class="file-icon">🖼️</span>
                    <div class="file-info">
                        <span class="file-name">Images Gallery (${note.images.length})</span>
                        <span class="file-type">View all images</span>
                    </div>
                    <span class="file-arrow">→</span>
                </div>`;
        }

        // Content files (notes / lab / ppt)
        if (note.files && note.files.length > 0) {
            note.files.forEach(file => {
                const meta = FILE_META[file.type] || { icon: '📄', label: file.type };
                html += `
                    <div class="file-item" onclick="openFile('${escAttr(note.folder)}','${escAttr(file.file)}','${escAttr(file.type)}')">
                        <span class="file-icon">${meta.icon}</span>
                        <div class="file-info">
                            <span class="file-name">${escHTML(file.name)}</span>
                            <span class="file-type">${meta.label}</span>
                        </div>
                        <span class="file-arrow">→</span>
                    </div>`;
            });
        }

        html += '</div>';

        // Related notes
        const related = getRelatedNotes(note);
        if (related.length > 0) {
            html += '<h3 style="margin-top:20px;">Related Notes</h3>';
            html += related.map(r => `
                <div class="related-item"
                     role="button"
                     tabindex="0"
                     onclick='openFolder(${jsonAttr(r)})'
                     onkeydown='if(event.key==="Enter")openFolder(${jsonAttr(r)})'>
                    ${escHTML(r.title)}
                </div>`).join('');
        }

        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('folderModal').classList.add('active');
    }

    function closeModal() {
        document.getElementById('folderModal').classList.remove('active');
    }

    function setupModalClickOutside() {
        window.addEventListener('click', e => {
            const modal = document.getElementById('folderModal');
            if (e.target === modal) closeModal();
        });
    }

    // ── Related notes (by shared tags, within same subject) ───────────────────

    function getRelatedNotes(currentNote) {
        if (!currentNote.tags || currentNote.tags.length === 0) return [];
        return subjectNotes
            .filter(n => n.folder !== currentNote.folder)
            .map(n => ({
                note: n,
                score: (n.tags || []).filter(t => currentNote.tags.includes(t)).length
            }))
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(x => x.note);
    }

    // ── File / gallery openers ────────────────────────────────────────────────

    function openGallery(folder) {
        window.location.href = window.SiteConfig.basePath + `gallery.html?folder=${encodeURIComponent(folder)}`;
    }

    function openFile(folder, filename, type) {
        if (type === 'link') {
            window.open(filename, '_blank');
            return;
        }
        const filepath = window.SiteConfig.dataPath(`notes/${folder}/${filename}`);
        window.location.href = filepath;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function filterByTag(tag) {
        selectedTags = new Set([tag]);
        populateTagFilter();
        closeModal();
        filterNotes();
    }

    function getTypeBadgesHTML(note) {
        const types = [...new Set((note.files || []).map(f => f.type))];
        if (types.length === 0) return '';
        return `<div class="type-badges">${types.map(t => {
            const meta = FILE_META[t] || { icon: '📄', label: t };
            return `<span class="type-badge" title="${escAttr(meta.label)}">${meta.icon}</span>`;
        }).join('')}</div>`;
    }

    // Only rendered when this note has actually been opened before (i.e.
    // getReadingProgress found a matching readingProgress-<pageId> entry) —
    // silent/omitted otherwise, so untouched notes' cards don't get a
    // misleading "0%" badge cluttering every tile.
    function getProgressBadgeHTML(note) {
        const progress = getReadingProgress(note);
        if (!progress) return '';
        return `<span class="progress-badge" title="Last viewed ${formatRelativeTime(progress.timestamp)}">📖 ${progress.percent}% · ${formatRelativeTime(progress.timestamp)}</span>`;
    }

    function getCategoryIcon(category) {
        if (category && categoryIconMap[category]) return categoryIconMap[category].icon;
        return categoryIconMap.default?.icon
            || (category && FALLBACK_CATEGORY_ICONS[category])
            || FALLBACK_CATEGORY_ICONS.default;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    /** Safely stringify a note object for use inside an onclick attribute */
    function jsonAttr(obj) {
        return JSON.stringify(obj)
            .replace(/'/g, '&#39;')
            .replace(/"/g, '&quot;');
    }

    function escHTML(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escAttr(str) {
        return String(str ?? '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    }

    // ── Global exports (called from inline HTML event handlers) ───────────────

    window.filterNotes = filterNotes;
    window.sortNotes = sortNotes;
    window.reshuffleRandom = reshuffleRandom;
    window.openFolder = openFolder;
    window.closeModal = closeModal;
    window.filterByTag = filterByTag;
    window.openFile = openFile;
    window.openGallery = openGallery;
    window.toggleFavorite = toggleFavorite;
    window.toggleFavoritesFilter = toggleFavoritesFilter;
    window.copyNoteLink = copyNoteLink;
    window.selectCategoryChip = selectCategoryChip;
    window.selectTypeChip = selectTypeChip;
    window.selectSessionChip = selectSessionChip;
    window.addTagChip = addTagChip;
    window.removeTagChip = removeTagChip;
    window.addTagChip = addTagChip;
    window.removeTagChip = removeTagChip;
    window.toggleFilterSheet = toggleFilterSheet;
    window.closeFilterSheet = closeFilterSheet;
    window.clearAllFilters = clearAllFilters;
})();