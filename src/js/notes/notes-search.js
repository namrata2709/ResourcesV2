/**
 * In-Page Search Feature v1.0
 * Provides Ctrl+K search with live highlighting
 * File: js/notes-search.js
 */

(function () {
    'use strict';

    let searchIndex = [];
    let currentResultIndex = 0;
    let searchResults = [];
    let searchQuery = '';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearch);
    } else {
        initSearch();
    }

    function initSearch() {
        try {
            createSearchUI();
            injectSearchFilters();
            buildSearchIndex();
            attachSearchListeners();
            console.log('🔍 In-page search initialized');
        } catch (error) {
            console.error('❌ Error initializing search:', error);
        }
    }
    function injectSearchFilters() {
        const searchBox = document.querySelector('.search-box');
        if (!searchBox) return;

        const filterContainer = document.createElement('div');
        filterContainer.className = 'search-filter-container';
        filterContainer.innerHTML = `
            <select id="search-filter" aria-label="Filter search results">
                <option value="all">All content</option>
                <option value="exam">Exam highlights</option>
                <option value="code">Code examples</option>
                <option value="headings">Headings only</option>
            </select>
        `;
        searchBox.appendChild(filterContainer);

        const filter = document.getElementById('search-filter');
        const raw = localStorage.getItem('searchFilter');
        const parsed = raw ? JSON.parse(raw) : null;
        const savedFilter = (parsed && parsed.v) ? parsed.value : 'all';
        filter.value = savedFilter;

        filter.addEventListener('change', function () {
            localStorage.setItem('searchFilter', JSON.stringify({ v: 1, value: this.value }));
            const searchInput = document.getElementById('search-input');
            if (searchInput && searchInput.value) {
                performSearch(searchInput.value);   // direct call — no window.NotesSearch needed
            }
        });

        console.log('✅ Search filters injected');
    }

    function createSearchUI() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.id = 'search-container';
        searchContainer.innerHTML = `
            <div class="search-box">
                <input type="text" 
                       id="search-input" 
                       placeholder="Search notes... (Press / to focus)" 
                       aria-label="Search notes"
                       autocomplete="off"
                       spellcheck="false">
                <span class="search-results-count" id="search-count">0 results</span>
                <div class="search-controls">
                    <button id="search-prev" 
                            aria-label="Previous result" 
                            title="Previous (Shift+Enter)">↑</button>
                    <button id="search-next" 
                            aria-label="Next result" 
                            title="Next (Enter)">↓</button>
                    <button id="search-close" 
                            aria-label="Close search" 
                            title="Close (Esc)">✕</button>
                </div>
            </div>
        `;
        document.body.appendChild(searchContainer);
    }

    function buildSearchIndex() {
        const noteContent = document.querySelector('.note-content');
        if (!noteContent) {
            console.warn('⚠️ No note content found for search indexing');
            return;
        }

        const textNodes = getTextNodes(noteContent);

        textNodes.forEach(function (node) {
            const text = node.textContent.trim();
            if (text.length > 0) {
                searchIndex.push({
                    text: text.toLowerCase(),
                    originalNode: node,
                    parentElement: node.parentElement
                });
            }
        });

        console.log(`📚 Search index built: ${searchIndex.length} text nodes`);
    }

    function getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;

                    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT'];
                    const skipClasses = ['copy-code-btn', 'diagram-caption'];

                    if (skipTags.includes(parent.tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (skipClasses.some(cls => parent.classList.contains(cls))) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (node.textContent.trim().length === 0) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        return textNodes;
    }

    function performSearch(query) {
        if (!query || query.length < 2) {
            clearSearchResults();
            return;
        }

        searchQuery = query;
        const lowerQuery = query.toLowerCase();
        searchResults = [];

        const filterEl = document.getElementById('search-filter');
        const activeFilter = filterEl ? filterEl.value : 'all';

        searchIndex.forEach(function (item) {
            if (!item.text.includes(lowerQuery)) return;

            if (activeFilter === 'all') {
                searchResults.push(item);
                return;
            }

            const parent = item.parentElement;
            if (!parent) return;

            if (activeFilter === 'headings') {
                const headingTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
                if (headingTags.includes(parent.tagName)) {
                    searchResults.push(item);
                }
                return;
            }

            if (activeFilter === 'code') {
                if (parent.closest('pre, code')) {
                    searchResults.push(item);
                }
                return;
            }

            if (activeFilter === 'exam') {
                if (parent.closest('.exam-highlight-sentence, .exam-highlight-term')) {
                    searchResults.push(item);
                }
                return;
            }
        });

        console.log(`🔍 Found ${searchResults.length} results for "${query}"`);

        highlightSearchResults(query);
        updateSearchCounter();

        if (searchResults.length > 0) {
            currentResultIndex = 0;
            scrollToResult(0);
        }
    }

    function highlightSearchResults(query) {
        clearHighlights();

        if (!query || query.length < 2) return;

        const escapedQuery = escapeRegex(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        searchResults.forEach(function (result) {
            const node = result.originalNode;
            const parent = node.parentElement;
            const text = node.textContent;

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    fragment.appendChild(
                        document.createTextNode(text.slice(lastIndex, match.index))
                    );
                }

                const mark = document.createElement('mark');
                mark.className = 'search-highlight';
                mark.textContent = match[0];
                fragment.appendChild(mark);

                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < text.length) {
                fragment.appendChild(
                    document.createTextNode(text.slice(lastIndex))
                );
            }

            parent.replaceChild(fragment, node);
        });
    }

    function clearHighlights() {
        document.querySelectorAll('.search-highlight').forEach(function (mark) {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    }

    function scrollToResult(index) {
        const highlights = document.querySelectorAll('.search-highlight');

        if (!highlights[index]) {
            console.warn('⚠️ Search result index out of bounds');
            return;
        }

        highlights.forEach(function (h) {
            h.classList.remove('search-active');
        });

        const currentHighlight = highlights[index];
        currentHighlight.classList.add('search-active');

        expandParentSections(currentHighlight);

        currentHighlight.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });

        updateSearchCounter();
        announceToScreenReader(`Result ${index + 1} of ${highlights.length}`);
    }

    function expandParentSections(element) {
        let parent = element.closest('details');

        while (parent) {
            if (!parent.hasAttribute('open')) {
                parent.setAttribute('open', '');
            }
            parent = parent.parentElement.closest('details');
        }
    }

    function nextResult() {
        const highlights = document.querySelectorAll('.search-highlight');
        if (highlights.length === 0) return;

        currentResultIndex = (currentResultIndex + 1) % highlights.length;
        scrollToResult(currentResultIndex);
    }

    function previousResult() {
        const highlights = document.querySelectorAll('.search-highlight');
        if (highlights.length === 0) return;

        currentResultIndex = (currentResultIndex - 1 + highlights.length) % highlights.length;
        scrollToResult(currentResultIndex);
    }

    function attachSearchListeners() {
        const searchInput = document.getElementById('search-input');
        const searchContainer = document.getElementById('search-container');
        const prevBtn = document.getElementById('search-prev');
        const nextBtn = document.getElementById('search-next');
        const closeBtn = document.getElementById('search-close');

        document.addEventListener('keydown', function (e) {
            // / (slash) to open search - like Reddit/GitHub
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Don't trigger if user is typing in an input
                if (document.activeElement.tagName === 'INPUT' ||
                    document.activeElement.tagName === 'TEXTAREA' ||
                    document.activeElement.isContentEditable) {
                    return;
                }
                e.preventDefault();
                openSearch();
            }

            // Escape to close search
            if (e.key === 'Escape' && searchContainer.classList.contains('visible')) {
                closeSearch();
            }
        });

        let searchTimeout;
        searchInput.addEventListener('input', function (e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(function () {
                performSearch(e.target.value);
            }, 300);
        });

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                    previousResult();
                } else {
                    nextResult();
                }
            }
        });

        prevBtn.addEventListener('click', previousResult);
        nextBtn.addEventListener('click', nextResult);
        closeBtn.addEventListener('click', closeSearch);

        document.addEventListener('click', function (e) {
            if (searchContainer.classList.contains('visible') &&
                !searchContainer.contains(e.target)) {
                if (!e.target.closest('.search-highlight')) {
                    closeSearch();
                }
            }
        });
    }

    function openSearch() {
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('search-input');

        searchContainer.classList.add('visible');
        searchInput.focus();
        searchInput.select();

        console.log('🔍 Search opened');
    }

    function closeSearch() {
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('search-input');

        searchContainer.classList.remove('visible');
        searchInput.value = '';
        clearSearchResults();

        console.log('🔍 Search closed');
    }

    function updateSearchCounter() {
        const count = document.getElementById('search-count');
        const highlights = document.querySelectorAll('.search-highlight');
        const total = highlights.length;

        const prevBtn = document.getElementById('search-prev');
        const nextBtn = document.getElementById('search-next');

        if (total === 0) {
            count.textContent = 'No results';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        } else {
            count.textContent = `${currentResultIndex + 1} of ${total}`;
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        }
    }

    function clearSearchResults() {
        clearHighlights();
        searchResults = [];
        currentResultIndex = 0;
        updateSearchCounter();
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(function () {
            announcement.remove();
        }, 1000);
    }

    window.NotesSearch = {
        version: '1.0.0',
        performSearch: performSearch,
        clearSearch: clearSearchResults,
        nextResult: nextResult,
        previousResult: previousResult,
        rebuildIndex: buildSearchIndex      // ← add this line
    };
    console.log('🔍 Search module loaded');
})();