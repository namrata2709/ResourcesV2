/**
 * Notes Index Manager
 *
 * Features:
 * - Reads ?subject= from URL → filters notes + sets page title/heading
 * - Session filter injected dynamically (only when ≥1 note in current subject has a session)
 * - Category + Tag filters
 * - Multi-file-per-folder modal (notes / lab / ppt icons)
 * - Image gallery support
 * - Related notes by shared tags
 */

(function () {
    'use strict';

    // ── State ─────────────────────────────────────────────────────────────────

    let allNotes     = [];   // full dataset from JSON
    let subjectNotes = [];   // after subject filter
    let filteredData = [];   // after all UI filters
    let categories   = new Set();
    let tagsSet      = new Set();

    // Subject config: id → { label, icon, pageTitle, heading }
    const SUBJECT_META = {
        aws: { label: 'AWS', icon: '☁️', pageTitle: 'AWS Notes - Learning Dashboard', heading: '☁️ AWS Notes' },
        dsa: { label: 'DSA', icon: '🧩', pageTitle: 'DSA Notes - Learning Dashboard', heading: '🧩 DSA Notes' }
    };

    const FILE_META = {
        notes: { icon: '📄', label: 'Notes' },
        lab:   { icon: '🧪', label: 'Lab' },
        ppt:   { icon: '📊', label: 'Presentation' }
    };

    // ── Boot ──────────────────────────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        applySubjectMeta();
        loadNotes();
        setupModalClickOutside();
    }

    // ── Subject meta (title, heading, data-subject on body) ──────────────────

    function getSubjectParam() {
        return new URLSearchParams(window.location.search).get('subject') || '';
    }

    function applySubjectMeta() {
        const subject = getSubjectParam();
        const meta    = SUBJECT_META[subject];

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
            const res = await fetch('data/index/notes-index.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            allNotes   = data.notes || [];

            applySubjectFilter();
            buildFilterSets();
            populateCategoryFilter();
            populateTagFilter();
            maybeInjectSessionFilter();
            sortNotes();

        } catch (err) {
            console.error('Error loading notes:', err);
            document.getElementById('notesContainer').innerHTML =
                '<div class="error">Error loading notes. Please try again later.</div>';
        }
    }

    // ── Subject filter ────────────────────────────────────────────────────────

    function applySubjectFilter() {
        const subject = getSubjectParam();
        subjectNotes  = subject
            ? allNotes.filter(n => n.subject === subject)
            : [...allNotes];
        filteredData  = [...subjectNotes];
    }

    // ── Build category / tag sets from current subject ────────────────────────

    function buildFilterSets() {
        categories = new Set();
        tagsSet    = new Set();
        subjectNotes.forEach(note => {
            if (note.category) categories.add(note.category);
            (note.tags || []).forEach(t => tagsSet.add(t));
        });
    }

    // ── Session filter injection ───────────────────────────────────────────────
    // Only shown when at least one note in the current subject set has a session.

    function maybeInjectSessionFilter() {
        const sessions = new Set(
            subjectNotes.map(n => n.session).filter(Boolean)
        );
        if (sessions.size === 0) return; // no session data → don't show filter

        const filterControls = document.querySelector('.filter-controls');
        if (!filterControls || document.getElementById('sessionFilter')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'filter-group';
        wrapper.innerHTML = `
            <label for="sessionFilter">Filter by Session:</label>
            <select id="sessionFilter" onchange="filterNotes()">
                <option value="">All Sessions</option>
                <option value="__generic__">Generic</option>
                ${Array.from(sessions).sort().map(s =>
                    `<option value="${escAttr(s)}">${escHTML(s)}</option>`
                ).join('')}
            </select>
        `;

        // Insert as first child (before category filter)
        filterControls.insertBefore(wrapper, filterControls.firstChild);
    }

    // ── Populate static filters ───────────────────────────────────────────────

    function populateCategoryFilter() {
        const el = document.getElementById('categoryFilter');
        if (!el) return;
        el.innerHTML = '<option value="">All Categories</option>';
        Array.from(categories).sort().forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            el.appendChild(opt);
        });
    }

    function populateTagFilter() {
        const el = document.getElementById('tagFilter');
        if (!el) return;
        el.innerHTML = '<option value="">All Tags</option>';
        Array.from(tagsSet).sort().forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag;
            opt.textContent = tag;
            el.appendChild(opt);
        });
    }

    // ── Filter + Sort ─────────────────────────────────────────────────────────

    function filterNotes() {
        const search   = (document.getElementById('searchInput')?.value   || '').toLowerCase();
        const category = document.getElementById('categoryFilter')?.value || '';
        const tag      = document.getElementById('tagFilter')?.value      || '';
        const session  = document.getElementById('sessionFilter')?.value  || '';

        filteredData = subjectNotes.filter(note => {
            const matchSearch = !search ||
                note.title.toLowerCase().includes(search) ||
                (note.category || '').toLowerCase().includes(search) ||
                (note.tags || []).join(' ').toLowerCase().includes(search) ||
                (note.session || '').toLowerCase().includes(search) ||
                note.date.includes(search);

            const matchCategory = !category || note.category === category;
            const matchTag      = !tag      || (note.tags || []).includes(tag);

            let matchSession = true;
            if (session === '__generic__') {
                matchSession = !note.session;
            } else if (session) {
                matchSession = note.session === session;
            }

            return matchSearch && matchCategory && matchTag && matchSession;
        });

        sortNotes();
    }

    function sortNotes() {
        const val = document.getElementById('sortSelect')?.value || 'date-desc';

        filteredData.sort((a, b) => {
            switch (val) {
                case 'date-desc':  return new Date(b.date)  - new Date(a.date);
                case 'date-asc':   return new Date(a.date)  - new Date(b.date);
                case 'title-asc':  return a.title.localeCompare(b.title);
                case 'title-desc': return b.title.localeCompare(a.title);
                default:           return 0;
            }
        });

        renderNotes();
    }

    // ── Render ────────────────────────────────────────────────────────────────

    function renderNotes() {
        const container = document.getElementById('notesContainer');

        if (filteredData.length === 0) {
            container.innerHTML = '<div class="loading">No notes found.</div>';
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
                    <h3>${escHTML(note.title)}</h3>
                    <div class="note-meta">
                        <span>${escHTML(note.category || 'General')}</span>
                        ${note.session ? `<span class="session-badge">🗓️ ${escHTML(note.session)}</span>` : ''}
                        <span>📅 ${formatDate(note.date)}</span>
                    </div>
                </div>
            </div>
        `).join('');
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
                note:  n,
                score: (n.tags || []).filter(t => currentNote.tags.includes(t)).length
            }))
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(x => x.note);
    }

    // ── File / gallery openers ────────────────────────────────────────────────

    function openGallery(folder) {
        window.location.href = `data/notes/images.html?folder=${encodeURIComponent(folder)}`;
    }

    function openFile(folder, filename, type) {
        if (type === 'link') {
            window.open(filename, '_blank');
            return;
        }
        const filepath = `data/notes/${folder}/${filename}`;
        window.location.href = filepath;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function filterByTag(tag) {
        const el = document.getElementById('tagFilter');
        if (el) { el.value = tag; filterNotes(); }
    }

    function getCategoryIcon(category) {
        const icons = {
            Compute:      '⚙️',
            Storage:      '💾',
            Database:     '🗄️',
            Networking:   '🌐',
            Security:     '🔒',
            Monitoring:   '📊',
            Management:   '🛠️',
            Fundamentals: '📚',
            General:      '📂'
        };
        return icons[category] || '📂';
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

    window.filterNotes  = filterNotes;
    window.sortNotes    = sortNotes;
    window.openFolder   = openFolder;
    window.closeModal   = closeModal;
    window.filterByTag  = filterByTag;
    window.openFile     = openFile;
    window.openGallery  = openGallery;

})();
