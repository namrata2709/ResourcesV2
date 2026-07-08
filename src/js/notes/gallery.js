/**
 * =============================================================================
 * File: gallery.js
 * Path: js/notes/gallery.js
 * Project: Learning Dashboard
 *
 * Description:
 * Image Gallery Manager for gallery.html. Reads ?folder=<topic|all> from
 * the URL, loads data/index/notes-index.json, and renders either a
 * single folder's images or every image across every folder.
 *
 * Search matches title / filename / related note / category / tags.
 * Filters: Subject, Category, Tags (multi-select chips). Quick Filters:
 * Favorites, Recently Added, Recently Viewed, Screenshots, Images. Sort:
 * Recently Added, Title, File Size, Resolution, Random. View modes: Grid,
 * Masonry, List (persisted to localStorage). Enhanced lightbox: zoom/pan,
 * fullscreen, metadata panel, related-note link, keyboard shortcuts,
 * mobile swipe/pinch/double-tap + bottom toolbar, focus management, and
 * prev/next image preloading.
 *
 * A note on metadata honesty: this file only displays fields the Python
 * pipeline actually generates (category, tags, subject, date,
 * lastModified) plus two things measured client-side with zero pipeline
 * dependency — Resolution (read from the loaded <img> element's natural
 * width/height) and File Size (read from the image response's
 * Content-Length header via a HEAD request, cached per file). Neither is
 * fabricated. "Recently Added" reuses the parent note's `date` since
 * individual images don't carry their own timestamp; "Screenshot" vs
 * "Image" is a filename-pattern heuristic pending a real per-image `type`
 * field from the pipeline — both are called out where they're computed
 * below so they're easy to replace later.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-07-05
 *
 * Dependencies:
 * - window.SiteConfig, window.callNavigation (js/shared/site-config.js)
 * - data/index/notes-index.json
 * =============================================================================
 */

(function () {
    'use strict';

    const urlParams = new URLSearchParams(window.location.search);
    const folderParam = urlParams.get('folder');

    // ── State ────────────────────────────────────────────────────────────────

    let allImages = [];
    let filteredImages = [];
    let currentImageIndex = 0;
    let currentFolderInfo = null;

    let searchQuery = '';
    let selectedSubject = '';
    let selectedCategory = '';
    let selectedTags = new Set();
    let showFavoritesOnly = false;
    let selectedTypeFilter = ''; // '', 'screenshot', 'image' — mutually exclusive

    let sortValue = 'added-desc';
    let previousSortValue = null;
    let randomKeyMap = new Map();

    const VIEW_MODE_KEY = 'galleryView';
    let viewMode = 'grid'; // 'grid' | 'masonry' | 'list'
    try {
        const saved = localStorage.getItem(VIEW_MODE_KEY);
        if (saved === 'grid' || saved === 'masonry' || saved === 'list') viewMode = saved;
    } catch (e) { /* default to grid */ }

    // Client-measured metadata caches, keyed by resolved image file path.
    const resolutionCache = new Map(); // file -> { width, height } | null
    const fileSizeCache = new Map();   // file -> bytes | null

    // Zoom / pan state for the desktop+mobile viewer.
    let zoomLevel = 1;
    let panX = 0, panY = 0;
    const MIN_ZOOM = 1, MAX_ZOOM = 4, ZOOM_STEP = 0.5;

    let lastFocusedElement = null;
    let metadataObserver = null;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        showLoading();
        loadImages();
        setupLightboxInteractions();
        updateViewModeButtons();
        callNavigation(['Home', 'Notes', folderParam ? capitalizeFirstLetter(folderParam) + ' Images Gallery' : 'All Folders']);
    }

    function capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Manual character-replace escaping (not the textContent/innerHTML
    // trick) so this is safe inside HTML attribute values too — that
    // trick alone doesn't escape quote characters, which would otherwise
    // break aria-label="..." etc. if a filename/title contains a quote.
    function escHTML(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ── Loading states ───────────────────────────────────────────────────────

    function showLoading() {
        const gallery = document.getElementById('gallery');
        gallery.innerHTML = `
            <div class="loading" style="grid-column: 1/-1;">
                <div class="loading-spinner"></div>
                <p class="loading-text">Loading images...</p>
            </div>
        `;
    }

    function showError(message) {
        const gallery = document.getElementById('gallery');
        const errorState = document.getElementById('errorState');
        gallery.classList.add('hidden');
        errorState.classList.remove('hidden');
        console.error('Gallery Error:', message);
    }

    function showEmptyState() {
        document.getElementById('gallery').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
    }

    function hideEmptyState() {
        document.getElementById('gallery').classList.remove('hidden');
        document.getElementById('emptyState').classList.add('hidden');
    }

    function updateGalleryStats(folderName, imageCount, dateInfo) {
        const imageCountEl = document.getElementById('imageCount');
        const folderNameEl = document.getElementById('folderName');
        const dateInfoEl = document.getElementById('dateInfo');

        if (imageCountEl) imageCountEl.textContent = `${imageCount} image${imageCount !== 1 ? 's' : ''}`;
        if (folderNameEl) folderNameEl.textContent = folderName || 'All Folders';
        if (dateInfoEl) dateInfoEl.textContent = dateInfo || 'Various Dates';

        document.title = `${folderName || 'Images Gallery'} - Learning Dashboard`;
    }

    // ── Related-note link construction ──────────────────────────────────────
    // Mirrors the same data/notes/<folder>/<file> convention gallery.js
    // already used for image paths — the "Notes" file if present, else
    // whichever file the note has.

    function getRelatedNoteFile(note) {
        if (!note.files || !note.files.length) return null;
        const notesFile = note.files.find(f => f.type === 'notes') || note.files[0];
        return notesFile ? notesFile.file : null;
    }

    function getRelatedNoteUrl(note) {
        const file = getRelatedNoteFile(note);
        if (!file) return null;
        return window.SiteConfig.dataPath(`notes/${note.folder}/${file}`);
    }

    // ── Screenshot vs Image heuristic ───────────────────────────────────────
    // No per-image `type` field exists in notes-index.json yet, so this
    // guesses from the filename. Swap for `img.type === 'screenshot'` (or
    // similar) the moment the pipeline generates one — this is the only
    // function that needs to change.
    function isScreenshot(img) {
        const probe = `${img.name || ''} ${img.file || ''}`.toLowerCase();
        return /screenshot|screen[\s_-]?shot|scrnshot/.test(probe);
    }

    // ── Load & flatten images from notes-index.json ─────────────────────────

    async function loadImages() {
        try {
            const response = await fetch(window.SiteConfig.dataPath('index/notes-index.json'));
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            allImages = [];

            function pushImagesFromNote(note) {
                if (!note.hasImages || !note.images) return;
                const relatedNoteUrl = getRelatedNoteUrl(note);
                note.images.forEach(img => {
                    allImages.push({
                        name: img.name,
                        file: window.SiteConfig.dataPath(`notes/${note.folder}/images/${img.file}`),
                        folder: note.folder,
                        noteTitle: note.title,
                        subject: note.subject || '',
                        category: note.category || '',
                        tags: note.tags || [],
                        date: note.date || null,
                        lastModified: note.lastModified || note.date || null,
                        relatedNoteUrl
                    });
                });
            }

            if (folderParam === 'all' || !folderParam) {
                data.notes.forEach(pushImagesFromNote);
                updateGalleryStats('All Folders', 0, 'Various Dates');
            } else {
                const note = data.notes.find(n => n.folder === folderParam);
                if (!note) throw new Error(`Folder "${folderParam}" not found`);
                pushImagesFromNote(note);
                currentFolderInfo = { name: note.title, date: note.date || 'Unknown' };
                updateGalleryStats(note.title, allImages.length, note.date || 'Unknown');
            }

            populateFilterOptions();
            filterImages();
        } catch (error) {
            console.error('Error loading images:', error);
            showError(error.message);
        }
    }

    // ── Filter dropdown population (Subject / Category / Tags) ─────────────

    function populateFilterOptions() {
        const subjects = new Set();
        const categories = new Set();
        const tags = new Set();

        allImages.forEach(img => {
            if (img.subject) subjects.add(img.subject);
            if (img.category) categories.add(img.category);
            (img.tags || []).forEach(t => tags.add(t));
        });

        fillSelect('subjectFilter', Array.from(subjects).sort(), s => s.toUpperCase());
        fillSelect('categoryFilter', Array.from(categories).sort());
        fillSelect('tagFilter', Array.from(tags).sort(), null, 'Add tag…');
    }

    function fillSelect(id, values, labelFn, firstOptionLabel) {
        const el = document.getElementById(id);
        if (!el) return;
        const firstOption = el.options[0];
        el.innerHTML = '';
        el.appendChild(firstOption || new Option(firstOptionLabel || 'All', ''));
        values.forEach(v => el.appendChild(new Option(labelFn ? labelFn(v) : v, v)));
    }

    // ── Tag chips ────────────────────────────────────────────────────────────

    function addTagChip(value, selectEl) {
        if (!value) return;
        selectedTags.add(value);
        if (selectEl) selectEl.value = '';
        renderTagChips();
        filterImages();
    }

    function removeTagChip(value) {
        selectedTags.delete(value);
        renderTagChips();
        filterImages();
    }

    function renderTagChips() {
        const container = document.getElementById('tagChips');
        if (!container) return;
        container.innerHTML = Array.from(selectedTags).map(tag => `
            <span class="selected-chip">${escHTML(tag)}
                <button type="button" class="chip-remove" onclick="removeTagChip('${escHTML(tag)}')" aria-label="Remove tag ${escHTML(tag)}">✕</button>
            </span>
        `).join('');
    }

    // ── Search + filter ──────────────────────────────────────────────────────

    function filterImages() {
        searchQuery = (document.getElementById('searchBox')?.value || '').trim().toLowerCase();
        selectedSubject = document.getElementById('subjectFilter')?.value || '';
        selectedCategory = document.getElementById('categoryFilter')?.value || '';

        filteredImages = allImages.filter(img => {
            const matchSearch = !searchQuery || [
                img.name, img.file, img.noteTitle, img.category, ...(img.tags || [])
            ].some(field => (field || '').toLowerCase().includes(searchQuery));

            const matchSubject = !selectedSubject || img.subject === selectedSubject;
            const matchCategory = !selectedCategory || img.category === selectedCategory;
            const matchTags = selectedTags.size === 0 || Array.from(selectedTags).every(t => (img.tags || []).includes(t));
            const matchFavorite = !showFavoritesOnly || isImageFavorite(img.file);
            const matchType = !selectedTypeFilter || (selectedTypeFilter === 'screenshot' ? isScreenshot(img) : !isScreenshot(img));

            return matchSearch && matchSubject && matchCategory && matchTags && matchFavorite && matchType;
        });

        sortAndRender();
    }

    // ── Sort ─────────────────────────────────────────────────────────────────

    async function applySort(value) {
        sortValue = value;
        const sortEl = document.getElementById('sortSelect');
        if (sortEl) sortEl.value = value;

        if (value === 'random' && previousSortValue !== 'random') {
            randomKeyMap = new Map();
        }
        previousSortValue = value;

        const shuffleBtn = document.getElementById('shuffleAgainBtn');
        if (shuffleBtn) shuffleBtn.hidden = value !== 'random';

        // Resolution/File Size sorts need every filtered image measured
        // first, or the sort would just be comparing mostly-unmeasured
        // zeroes. Grid browsing measures lazily per-card as they scroll
        // into view (see setupMetadataObserver); picking one of these
        // sorts instead does an eager bulk measurement of the current
        // filtered set up front.
        if (value.startsWith('resolution') || value.startsWith('filesize')) {
            await measureAllFiltered();
        }

        sortAndRender();
    }

    function reshuffleRandom() {
        randomKeyMap = new Map();
        sortAndRender();
    }

    function getRandomKey(file) {
        if (!randomKeyMap.has(file)) randomKeyMap.set(file, Math.random());
        return randomKeyMap.get(file);
    }

    function getPixelCount(img) {
        const dims = resolutionCache.get(img.file);
        return dims ? dims.width * dims.height : null;
    }

    function getFileSize(img) {
        return fileSizeCache.has(img.file) ? fileSizeCache.get(img.file) : null;
    }

    function sortAndRender() {
        filteredImages.sort((a, b) => {
            switch (sortValue) {
                case 'added-desc': return new Date(b.date || 0) - new Date(a.date || 0);
                case 'added-asc': return new Date(a.date || 0) - new Date(b.date || 0);
                case 'viewed-desc': return getImageViewedTimestamp(b.file) - getImageViewedTimestamp(a.file);
                case 'viewed-asc': return getImageViewedTimestamp(a.file) - getImageViewedTimestamp(b.file);
                case 'title-asc': return a.name.localeCompare(b.name);
                case 'title-desc': return b.name.localeCompare(a.name);
                case 'filesize-asc': return (getFileSize(a) ?? 0) - (getFileSize(b) ?? 0);
                case 'filesize-desc': return (getFileSize(b) ?? 0) - (getFileSize(a) ?? 0);
                case 'resolution-asc': return (getPixelCount(a) ?? 0) - (getPixelCount(b) ?? 0);
                case 'resolution-desc': return (getPixelCount(b) ?? 0) - (getPixelCount(a) ?? 0);
                case 'random': return getRandomKey(a.file) - getRandomKey(b.file);
                default: return 0;
            }
        });

        updateQuickFiltersUI();
        loadGallery();
    }

    // ── Quick Filters ────────────────────────────────────────────────────────

    function toggleFavoritesFilter() {
        showFavoritesOnly = !showFavoritesOnly;
        filterImages();
    }

    function applyQuickSort(value) {
        applySort(value);
    }

    function toggleTypeFilter(type) {
        selectedTypeFilter = selectedTypeFilter === type ? '' : type;
        filterImages();
    }

    function clearQuickFilters() {
        showFavoritesOnly = false;
        selectedTypeFilter = '';
        sortValue = 'added-desc';
        previousSortValue = 'added-desc';

        const sortEl = document.getElementById('sortSelect');
        if (sortEl) sortEl.value = 'added-desc';
        const shuffleBtn = document.getElementById('shuffleAgainBtn');
        if (shuffleBtn) shuffleBtn.hidden = true;

        filterImages();
    }

    function updateQuickFiltersUI() {
        const bar = document.getElementById('quickFiltersBar');
        if (!bar) return;

        const favBtn = document.getElementById('favoritesOnlyToggle');
        if (favBtn) {
            favBtn.classList.toggle('active', showFavoritesOnly);
            favBtn.setAttribute('aria-pressed', String(showFavoritesOnly));
            const icon = favBtn.querySelector('.quick-filter-icon');
            if (icon) icon.textContent = showFavoritesOnly ? '♥' : '♡';
        }

        const quickSortMap = { added: 'added-desc', viewed: 'viewed-desc' };
        bar.querySelectorAll('.quick-filter-btn[data-quick]').forEach(btn => {
            btn.classList.toggle('active', quickSortMap[btn.dataset.quick] === sortValue);
        });
        bar.querySelectorAll('.quick-filter-btn[data-type]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === selectedTypeFilter);
        });
    }

    // ── View mode (Grid / Masonry / List) ───────────────────────────────────

    function setView(mode) {
        if (mode !== 'grid' && mode !== 'masonry' && mode !== 'list') return;
        viewMode = mode;
        try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch (e) { /* ignore */ }
        updateViewModeButtons();
        loadGallery();
    }

    function updateViewModeButtons() {
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });
    }

    // ── Favorites (image-level, separate from note favorites) ──────────────

    const IMAGE_FAVORITES_KEY = 'galleryFavorites';

    function loadImageFavorites() {
        try {
            const saved = JSON.parse(localStorage.getItem(IMAGE_FAVORITES_KEY) || '[]');
            return new Set(Array.isArray(saved) ? saved : []);
        } catch (e) { return new Set(); }
    }

    function saveImageFavorites(set) {
        try { localStorage.setItem(IMAGE_FAVORITES_KEY, JSON.stringify(Array.from(set))); } catch (e) { /* ignore */ }
    }

    let imageFavorites = loadImageFavorites();

    function isImageFavorite(file) {
        return imageFavorites.has(file);
    }

    function toggleImageFavoriteByFile(file) {
        if (imageFavorites.has(file)) imageFavorites.delete(file); else imageFavorites.add(file);
        saveImageFavorites(imageFavorites);
    }

    function toggleImageFavoriteFromCard(file, btnEl) {
        toggleImageFavoriteByFile(file);
        const active = isImageFavorite(file);
        btnEl.classList.toggle('active', active);
        btnEl.textContent = active ? '♥' : '♡';
        btnEl.setAttribute('aria-pressed', String(active));
        if (showFavoritesOnly && !active) filterImages(); // remove it from view immediately
    }

    function toggleCurrentImageFavorite() {
        if (!filteredImages[currentImageIndex]) return;
        const file = filteredImages[currentImageIndex].file;
        toggleImageFavoriteByFile(file);
        updateLightboxFavoriteButtons();
    }

    function updateLightboxFavoriteButtons() {
        const img = filteredImages[currentImageIndex];
        if (!img) return;
        const active = isImageFavorite(img.file);
        [document.getElementById('favoriteBtn'), document.getElementById('mobileFavoriteBtn')].forEach(btn => {
            if (!btn) return;
            btn.classList.toggle('active', active);
            btn.textContent = active ? '♥' : '♡';
            btn.setAttribute('aria-pressed', String(active));
        });
    }

    // ── Recently Viewed tracking (image-level) ──────────────────────────────

    const VIEWED_MAP_KEY = 'galleryViewedMap';

    function loadViewedMap() {
        try { return JSON.parse(localStorage.getItem(VIEWED_MAP_KEY) || '{}'); } catch (e) { return {}; }
    }

    function saveViewedMap(map) {
        try { localStorage.setItem(VIEWED_MAP_KEY, JSON.stringify(map)); } catch (e) { /* ignore */ }
    }

    let viewedMap = loadViewedMap();

    function recordImageViewed(file) {
        viewedMap[file] = Date.now();
        saveViewedMap(viewedMap);
    }

    function getImageViewedTimestamp(file) {
        return viewedMap[file] || 0;
    }

    function formatRelativeTime(ts) {
        if (!ts) return null;
        const mins = Math.round((Date.now() - ts) / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.round(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.round(hours / 24);
        if (days < 30) return `${days}d ago`;
        return `${Math.round(days / 30)}mo ago`;
    }

    // ── Client-measured metadata: Resolution + File Size ────────────────────

    function measureResolution(file) {
        if (resolutionCache.has(file)) return Promise.resolve(resolutionCache.get(file));
        return new Promise(resolve => {
            const probe = new Image();
            probe.onload = () => {
                const dims = { width: probe.naturalWidth, height: probe.naturalHeight };
                resolutionCache.set(file, dims);
                resolve(dims);
            };
            probe.onerror = () => { resolutionCache.set(file, null); resolve(null); };
            probe.src = file;
        });
    }

    async function measureFileSize(file) {
        if (fileSizeCache.has(file)) return fileSizeCache.get(file);
        try {
            const res = await fetch(file, { method: 'HEAD' });
            const len = res.headers.get('content-length');
            const bytes = len ? parseInt(len, 10) : null;
            fileSizeCache.set(file, bytes);
            return bytes;
        } catch (e) {
            fileSizeCache.set(file, null);
            return null;
        }
    }

    async function measureAllFiltered() {
        await Promise.all(filteredImages.map(img => Promise.all([measureResolution(img.file), measureFileSize(img.file)])));
    }

    function formatBytes(bytes) {
        if (bytes == null) return null;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // Lazily measures resolution/file size only for cards that actually
    // scroll into view, then patches that card's metadata line in place —
    // consistent with the "lazy loading" ask rather than firing a HEAD
    // request for every image in the gallery up front.
    function setupMetadataObserver() {
        if (metadataObserver) metadataObserver.disconnect();
        metadataObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const card = entry.target;
                const file = card.dataset.file;
                observer.unobserve(card);
                if (!file) return;
                Promise.all([measureResolution(file), measureFileSize(file)]).then(([dims, bytes]) => {
                    const resEl = card.querySelector('.meta-resolution');
                    const sizeEl = card.querySelector('.meta-filesize');
                    if (resEl && dims) resEl.textContent = `📐 ${dims.width}×${dims.height}`;
                    if (sizeEl && bytes != null) sizeEl.textContent = `💾 ${formatBytes(bytes)}`;
                });
            });
        }, { rootMargin: '200px' });

        document.querySelectorAll('.image-card[data-file]').forEach(card => metadataObserver.observe(card));
    }

    // ── Render gallery ───────────────────────────────────────────────────────

    function loadGallery() {
        const gallery = document.getElementById('gallery');
        gallery.classList.remove('masonry-view', 'list-view');
        if (viewMode === 'masonry') gallery.classList.add('masonry-view');
        if (viewMode === 'list') gallery.classList.add('list-view');

        updateCountLabel();

        if (filteredImages.length === 0) {
            showEmptyState();
            return;
        }
        hideEmptyState();

        gallery.innerHTML = filteredImages.map((img, index) => renderImageCard(img, index)).join('');

        gallery.querySelectorAll('.image-card').forEach((card, index) => {
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(index);
                }
            });
        });

        setupMetadataObserver();
        updateGalleryStats(
            currentFolderInfo?.name || 'All Folders',
            filteredImages.length,
            currentFolderInfo?.date || 'Various Dates'
        );
    }

    function updateCountLabel() {
        const label = document.getElementById('galleryCountLabel');
        if (!label) return;
        const count = filteredImages.length;
        label.textContent = `${count} image${count === 1 ? '' : 's'} found`;
    }

    function renderImageCard(img, index) {
        const favorite = isImageFavorite(img.file);
        const lastUpdated = img.lastModified ? formatDateShort(img.lastModified) : null;
        const typeLabel = isScreenshot(img) ? '📸 Screenshot' : '🖼️ Image';

        return `
            <div class="image-card" data-file="${escHTML(img.file)}" onclick="openLightbox(${index})" tabindex="0" role="button" aria-label="View ${escHTML(img.name)}">
                <div class="image-wrapper">
                    <button type="button" class="image-favorite-btn${favorite ? ' active' : ''}"
                        aria-label="${favorite ? 'Remove from favorites' : 'Add to favorites'}"
                        aria-pressed="${favorite}"
                        onclick="event.stopPropagation(); toggleImageFavoriteFromCard('${escHTML(img.file)}', this)">${favorite ? '♥' : '♡'}</button>
                    <span class="type-badge">${typeLabel}</span>
                    <img
                        src="${escHTML(img.file)}"
                        alt="${escHTML(img.name)}"
                        loading="lazy"
                        class="loading-progressive"
                        onload="this.classList.remove('loading-progressive')"
                        onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<div class=\\'image-error\\'><div class=\\'image-error-icon\\'>📷</div>Image not found</div>');"
                    >
                </div>
                <div class="image-info">
                    <div class="image-name">${escHTML(img.name)}</div>
                    ${img.category ? `<span class="image-category-chip">${escHTML(img.category)}</span>` : ''}
                    <div class="image-meta">
                        <div class="meta-item">📁 ${escHTML(img.noteTitle)}</div>
                        ${lastUpdated ? `<div class="meta-item">🕐 ${lastUpdated}</div>` : ''}
                        <div class="meta-item meta-resolution">📐 —</div>
                        <div class="meta-item meta-filesize">💾 —</div>
                        ${img.relatedNoteUrl ? `<a class="meta-item related-note" href="${escHTML(img.relatedNoteUrl)}" onclick="event.stopPropagation()">📄 Open Note</a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function formatDateShort(dateStr) {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

    // ── Lightbox ─────────────────────────────────────────────────────────────

    let preloadedNeighbors = new Set();

    function openLightbox(index) {
        if (filteredImages.length === 0) return;

        lastFocusedElement = document.activeElement;
        currentImageIndex = index;
        resetZoom();
        showImageInLightbox();

        document.getElementById('lightbox').classList.add('active');
        document.body.style.overflow = 'hidden';

        const closeBtn = document.querySelector('.lightbox-close');
        if (closeBtn) closeBtn.focus();
    }

    function closeLightbox(event) {
        if (event && event.target.id !== 'lightbox' && !event.target.classList.contains('lightbox-close')) return;

        const lightbox = document.getElementById('lightbox');
        lightbox.classList.remove('active');
        document.getElementById('lightboxMetadataPanel')?.classList.remove('visible');
        document.body.style.overflow = '';

        if (document.fullscreenElement) document.exitFullscreen?.();

        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
        }
    }

    function showImageInLightbox() {
        const img = filteredImages[currentImageIndex];
        if (!img) return;

        recordImageViewed(img.file);

        const lightboxImage = document.getElementById('lightboxImage');
        lightboxImage.src = img.file;
        lightboxImage.alt = img.name;
        document.getElementById('lightboxName').textContent = img.name;
        document.getElementById('lightboxCounter').textContent = `${currentImageIndex + 1} of ${filteredImages.length}`;

        const relatedBtn = document.getElementById('relatedNoteBtn');
        if (relatedBtn) {
            if (img.relatedNoteUrl) {
                relatedBtn.href = img.relatedNoteUrl;
                relatedBtn.classList.remove('hidden');
            } else {
                relatedBtn.classList.add('hidden');
            }
        }

        updateLightboxFavoriteButtons();
        updateNavigationButtons();
        renderMetadataPanel(img);
        announce(`Image ${currentImageIndex + 1} of ${filteredImages.length}: ${img.name}`);
        preloadNeighbors();
    }

    function renderMetadataPanel(img) {
        const list = document.getElementById('lightboxMetadataList');
        if (!list) return;

        const dims = resolutionCache.get(img.file);
        const bytes = fileSizeCache.get(img.file);

        const rows = [
            ['Category', img.category ? escHTML(img.category) : null],
            ['Last Updated', img.lastModified ? formatDateShort(img.lastModified) : null],
            ['Resolution', dims ? `${dims.width} × ${dims.height}` : 'Measuring…'],
            ['File Size', bytes != null ? formatBytes(bytes) : 'Measuring…'],
            ['Related Note', img.relatedNoteUrl ? `<a href="${escHTML(img.relatedNoteUrl)}">${escHTML(img.noteTitle)}</a>` : (img.noteTitle ? escHTML(img.noteTitle) : null)],
        ];

        list.innerHTML = rows.filter(([, v]) => v).map(([label, value]) => `
            <div><dt>${label}</dt><dd>${value}</dd></div>
        `).join('');

        if ((!dims || bytes == null)) {
            Promise.all([measureResolution(img.file), measureFileSize(img.file)]).then(() => {
                // Only re-render if still viewing the same image.
                if (filteredImages[currentImageIndex]?.file === img.file) renderMetadataPanel(img);
            });
        }
    }

    function toggleMetadataPanel() {
        document.getElementById('lightboxMetadataPanel')?.classList.toggle('visible');
    }

    function navigateImage(direction) {
        if (filteredImages.length === 0) return;
        currentImageIndex = (currentImageIndex + direction + filteredImages.length) % filteredImages.length;
        resetZoom();
        showImageInLightbox();
    }

    function updateNavigationButtons() {
        const prevBtn = document.querySelector('.lightbox-prev');
        const nextBtn = document.querySelector('.lightbox-next');
        if (!prevBtn || !nextBtn) return;
        const disable = filteredImages.length <= 1;
        prevBtn.disabled = disable;
        nextBtn.disabled = disable;
    }

    function preloadNeighbors() {
        [currentImageIndex - 1, currentImageIndex + 1].forEach(i => {
            const idx = (i + filteredImages.length) % filteredImages.length;
            const neighbor = filteredImages[idx];
            if (!neighbor || preloadedNeighbors.has(neighbor.file)) return;
            preloadedNeighbors.add(neighbor.file);
            const preload = new Image();
            preload.src = neighbor.file;
        });
    }

    function downloadImage() {
        const img = filteredImages[currentImageIndex];
        if (!img) return;
        const link = document.createElement('a');
        link.href = img.file;
        link.download = img.file.split('/').pop();
        link.click();
    }

    function announce(message) {
        const region = document.getElementById('galleryAriaLive');
        if (region) region.textContent = message;
    }

    // ── Zoom / Pan ───────────────────────────────────────────────────────────

    function applyZoomTransform() {
        const img = document.getElementById('lightboxImage');
        if (!img) return;
        img.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
        img.classList.toggle('zoomed', zoomLevel > 1);
        const label = document.getElementById('zoomLevelLabel');
        if (label) label.textContent = `${Math.round(zoomLevel * 100)}%`;
    }

    function zoomIn() {
        zoomLevel = Math.min(MAX_ZOOM, zoomLevel + ZOOM_STEP);
        applyZoomTransform();
    }

    function zoomOut() {
        zoomLevel = Math.max(MIN_ZOOM, zoomLevel - ZOOM_STEP);
        if (zoomLevel === 1) { panX = 0; panY = 0; }
        applyZoomTransform();
    }

    function resetZoom() {
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        applyZoomTransform();
    }

    function toggleFullscreen() {
        const content = document.querySelector('.lightbox-content');
        if (!content) return;
        if (!document.fullscreenElement) {
            (content.requestFullscreen || content.webkitRequestFullscreen)?.call(content);
        } else {
            (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        }
    }

    // ── Lightbox interactions: wheel zoom, drag-to-pan, swipe, pinch, double-tap ──

    function setupLightboxInteractions() {
        const viewport = document.getElementById('lightboxViewport');
        const image = document.getElementById('lightboxImage');
        if (!viewport || !image) return;

        // Click-to-zoom-in (desktop convenience), only when not already zoomed
        // — otherwise a click would fight with drag-to-pan below.
        image.addEventListener('click', () => {
            if (zoomLevel === 1) { zoomLevel = 2; applyZoomTransform(); }
        });

        // Mouse wheel zoom.
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) zoomIn(); else zoomOut();
        }, { passive: false });

        // Drag-to-pan when zoomed in (desktop mouse).
        let dragging = false, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;
        image.addEventListener('mousedown', (e) => {
            if (zoomLevel === 1) return;
            dragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            panStartX = panX;
            panStartY = panY;
            image.classList.add('panning');
        });
        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            panX = panStartX + (e.clientX - dragStartX) / zoomLevel;
            panY = panStartY + (e.clientY - dragStartY) / zoomLevel;
            applyZoomTransform();
        });
        window.addEventListener('mouseup', () => {
            dragging = false;
            image.classList.remove('panning');
        });

        // ── Touch: swipe navigate, pinch zoom, double-tap zoom ──────────────
        let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
        let pinchStartDist = 0, pinchStartZoom = 1;
        let lastTapTime = 0;
        let isPinching = false;
        let panTouchStartX = 0, panTouchStartY = 0, panStartXT = 0, panStartYT = 0;

        function touchDistance(touches) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isPinching = true;
                pinchStartDist = touchDistance(e.touches);
                pinchStartZoom = zoomLevel;
            } else if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();

                if (zoomLevel > 1) {
                    panTouchStartX = touchStartX;
                    panTouchStartY = touchStartY;
                    panStartXT = panX;
                    panStartYT = panY;
                }
            }
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (isPinching && e.touches.length === 2) {
                e.preventDefault();
                const dist = touchDistance(e.touches);
                const ratio = dist / (pinchStartDist || dist);
                zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartZoom * ratio));
                applyZoomTransform();
            } else if (e.touches.length === 1 && zoomLevel > 1) {
                // Pan while zoomed in.
                e.preventDefault();
                panX = panStartXT + (e.touches[0].clientX - panTouchStartX) / zoomLevel;
                panY = panStartYT + (e.touches[0].clientY - panTouchStartY) / zoomLevel;
                applyZoomTransform();
            }
        }, { passive: false });

        viewport.addEventListener('touchend', (e) => {
            if (isPinching) {
                isPinching = false;
                if (zoomLevel <= MIN_ZOOM) resetZoom();
                return;
            }
            if (e.changedTouches.length !== 1) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const deltaTime = Date.now() - touchStartTime;

            // Double-tap to zoom (only when not panning/swiping).
            const now = Date.now();
            const isTap = Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10;
            if (isTap && now - lastTapTime < 300) {
                zoomLevel = zoomLevel > 1 ? 1 : 2;
                if (zoomLevel === 1) { panX = 0; panY = 0; }
                applyZoomTransform();
                lastTapTime = 0;
                return;
            }
            if (isTap) lastTapTime = now;

            // Swipe navigate — only when not zoomed in (otherwise a swipe
            // is panning, handled above).
            if (zoomLevel === 1 && Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
                const velocity = Math.abs(deltaX) / deltaTime;
                if (velocity > 0.2 || Math.abs(deltaX) > 100) {
                    navigateImage(deltaX > 0 ? -1 : 1);
                }
            }
        }, { passive: true });

        // ── Keyboard shortcuts ────────────────────────────────────────────────
        document.addEventListener('keydown', (e) => {
            const lightbox = document.getElementById('lightbox');
            if (!lightbox.classList.contains('active')) return;

            switch (e.key) {
                case 'Escape':
                    closeLightbox();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    navigateImage(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    navigateImage(1);
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    zoomIn();
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    zoomOut();
                    break;
                case '0':
                    e.preventDefault();
                    resetZoom();
                    break;
                case 'f':
                case 'F':
                    toggleCurrentImageFavorite();
                    break;
                case 'i':
                case 'I':
                    toggleMetadataPanel();
                    break;
                case 'Enter':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'Tab':
                    trapFocus(e);
                    break;
            }
        });
    }

    // Basic focus trap: Tab/Shift+Tab cycles only among focusable elements
    // inside the lightbox while it's open.
    function trapFocus(e) {
        const content = document.querySelector('.lightbox-content');
        if (!content) return;
        const focusable = content.querySelectorAll('button, a[href]');
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    // ── Expose functions used by inline HTML handlers ───────────────────────

    window.filterImages = filterImages;
    window.applySort = applySort;
    window.reshuffleRandom = reshuffleRandom;
    window.addTagChip = addTagChip;
    window.removeTagChip = removeTagChip;
    window.toggleFavoritesFilter = toggleFavoritesFilter;
    window.applyQuickSort = applyQuickSort;
    window.toggleTypeFilter = toggleTypeFilter;
    window.clearQuickFilters = clearQuickFilters;
    window.setView = setView;
    window.toggleImageFavoriteFromCard = toggleImageFavoriteFromCard;
    window.toggleCurrentImageFavorite = toggleCurrentImageFavorite;
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
    window.navigateImage = navigateImage;
    window.downloadImage = downloadImage;
    window.zoomIn = zoomIn;
    window.zoomOut = zoomOut;
    window.resetZoom = resetZoom;
    window.toggleFullscreen = toggleFullscreen;
    window.toggleMetadataPanel = toggleMetadataPanel;

    console.log('🖼️ Gallery.js v3.0 loaded successfully');
})();
