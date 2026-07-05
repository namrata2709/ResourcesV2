/**
 * =============================================================================
 * File: notes-search.js
 * Path: js/notes/notes-search.js
 * Project: Learning Dashboard
 *
 * Description:
 * In-page search overlay for note pages (#search-container, opened via
 * the floating menu or "/" shortcut). Rewritten to build its index with
 * FlexSearch (section-based — one document per .collapsible-section)
 * and highlight matches with mark.js, replacing the previous
 * TreeWalker + manual regex + manual DOM text-node replacement approach.
 * Exposes window.NotesSearch.rebuildIndex() so dynamically-loaded
 * sections (quiz, checklist, glossary, interview, problems, contest,
 * visual MCQ) can re-index themselves once their JSON finishes loading
 * and rendering — same contract as before, just backed by FlexSearch now.
 *
 * WHAT CHANGED vs. the previous implementation (same UI, same public
 * API — window.NotesSearch.{performSearch,clearSearch,nextResult,
 * previousResult,rebuildIndex,version} all still work the same way for
 * the six dependent modules):
 *   - buildSearchIndex() → buildFlexIndex(): indexes each
 *     .collapsible-section as one FlexSearch document (title + text)
 *     instead of walking every individual text node.
 *   - highlightSearchResults()/clearHighlights() → mark.js, which
 *     produces the identical markup the old code built by hand
 *     (<mark class="search-highlight">…</mark>), so existing
 *     .search-highlight / .search-active CSS needs no changes.
 *   - Filter modes (all/exam/code/headings) unchanged in behavior:
 *     "all" now uses FlexSearch to narrow to matching sections before
 *     mark.js highlights within them (faster than scanning the whole
 *     .note-content every keystroke); the other three filters mark.js
 *     directly within the matching selector's elements, same selectors
 *     as before.
 *   - BEHAVIOR CHANGE (intentional): the old TreeWalker explicitly
 *     excluded text inside closed <details> from the index, meaning
 *     collapsed sections were never searchable. FlexSearch indexes every
 *     section regardless of open/closed state, so search can now find
 *     and auto-expand matches inside collapsed sections too — this is a
 *     UX improvement, not a bug, but flagging it since it's a real
 *     behavior difference from before.
 *   - The `toggle` listener that rebuilt the index on every
 *     details.collapsible-section open/close is removed — it existed
 *     specifically to work around the closed-section exclusion above,
 *     which no longer applies. Dynamically-loaded content still
 *     re-indexes correctly via the existing explicit rebuildIndex()
 *     calls from the six dependent modules.
 *   - getTextNodes() and escapeRegex() are gone — no longer needed.
 *
 * createSearchUI(), injectSearchFilters(), attachSearchListeners(),
 * openSearch(), closeSearch(), scrollToResult(), expandParentSections(),
 * updateSearchCounter(), nextResult(), previousResult(), and
 * announceToScreenReader() are UNCHANGED from the previous version —
 * copied over verbatim, since none of them cared how highlighting was
 * produced, only that .search-highlight elements exist to cycle through.
 *
 * Dependencies:
 *   <script src="https://cdn.jsdelivr.net/npm/flexsearch/dist/flexsearch.bundle.min.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/mark.js/dist/mark.min.js"></script>
 *   (add both before this script's <script> tag, wherever notes-search.js
 *   is currently loaded from)
 *
 * Also depended on by: notes-checklist.js, notes-glossary.js,
 * notes-interview.js, dsa-problems.js, dsa-contest.js, dsa-visual-mcq.js
 * (via window.NotesSearch.rebuildIndex())
 *
 * Author: Namrata Mulwani
 * Last Updated: 2026-07-03
 * =============================================================================
 */

(function () {
    "use strict";

    let searchIndex = null;          // FlexSearch.Document instance
    let sectionElements = new Map(); // synthetic id -> .collapsible-section element
    let currentResultIndex = 0;
    let searchResults = [];
    let searchQuery = "";

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSearch);
    } else {
        initSearch();
    }

    function initSearch() {
        try {
            if (typeof FlexSearch === "undefined") {
                console.error("❌ FlexSearch is not loaded — check the CDN <script> tag.");
                return;
            }
            if (typeof Mark === "undefined") {
                console.error("❌ mark.js is not loaded — check the CDN <script> tag.");
                return;
            }
            createSearchUI();
            injectSearchFilters();
            buildFlexIndex();
            attachSearchListeners();
            console.log("🔍 In-page search initialized (FlexSearch + mark.js)");
        } catch (error) {
            console.error("❌ Error initializing search:", error);
        }
    }

    // ── UI — unchanged from previous version ────────────────────────────────

    function injectSearchFilters() {
        const searchBox = document.querySelector(".search-box");
        if (!searchBox) return;

        const filterContainer = document.createElement("div");
        filterContainer.className = "search-filter-container";
        filterContainer.innerHTML = `
            <select id="search-filter" aria-label="Filter search results">
                <option value="all">All content</option>
                <option value="exam">Exam highlights</option>
                <option value="code">Code examples</option>
                <option value="headings">Headings only</option>
            </select>
        `;
        searchBox.appendChild(filterContainer);

        const filter = document.getElementById("search-filter");
        const raw = localStorage.getItem("searchFilter");
        const parsed = raw ? JSON.parse(raw) : null;
        const savedFilter = parsed && parsed.v ? parsed.value : "all";
        filter.value = savedFilter;

        filter.addEventListener("change", function () {
            localStorage.setItem(
                "searchFilter",
                JSON.stringify({ v: 1, value: this.value }),
            );
            const searchInput = document.getElementById("search-input");
            if (searchInput && searchInput.value) {
                performSearch(searchInput.value);
            }
        });

        console.log("✅ Search filters injected");
    }

    function createSearchUI() {
        const searchContainer = document.createElement("div");
        searchContainer.className = "search-container";
        searchContainer.id = "search-container";
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

    // ── Index build — FlexSearch, section-based ─────────────────────────────

    function buildFlexIndex() {
        searchIndex = new FlexSearch.Document({
            document: {
                id: "id",
                index: ["title", "text"],
            },
            tokenize: "forward",
            cache: true,
        });
        sectionElements = new Map();

        const noteContent = document.querySelector(".note-content");
        if (!noteContent) {
            console.warn("⚠️ No note content found for search indexing");
            return;
        }

        let idCounter = 0;
        noteContent.querySelectorAll("details.collapsible-section").forEach((section) => {
            const heading = section.querySelector(
                ":scope > summary h1, :scope > summary h2, :scope > summary h3, " +
                ":scope > summary h4, :scope > summary h5, :scope > summary h6"
            );
            const title = heading ? heading.innerText : "";
            const text = section.innerText || "";
            if (!text.trim()) return;

            const id = "search-section-" + (idCounter++);
            sectionElements.set(id, section);
            searchIndex.add({ id, title, text });
        });

        console.log(`📚 Search index built: ${sectionElements.size} sections (FlexSearch)`);
    }

    // ── Search + highlight ───────────────────────────────────────────────────

    function performSearch(query) {
        if (!query || query.trim().length < 2) {
            clearSearchResults();
            return;
        }

        searchQuery = query;
        currentResultIndex = 0;

        const filterEl = document.getElementById("search-filter");
        const activeFilter = filterEl ? filterEl.value : "all";

        const context = getSearchContext(activeFilter, query);
        highlightInContext(context, query);

        const highlights = document.querySelectorAll(".search-highlight");
        searchResults = Array.from(highlights);

        console.log(`🔍 Found ${searchResults.length} results for "${query}"`);

        if (highlights.length > 0) {
            currentResultIndex = 0;
            scrollToResult(0);
        }

        updateSearchCounter();
    }

    /**
     * Returns the set of DOM elements mark.js should search within for the
     * given filter. "all" uses FlexSearch to narrow down to matching
     * sections first (avoids re-scanning the whole note on every
     * keystroke); the other three filters match the original code's
     * selectors exactly.
     */
    function getSearchContext(filter, query) {
        const noteContent = document.querySelector(".note-content");
        if (!noteContent) return [];

        if (filter === "headings") {
            return Array.from(noteContent.querySelectorAll("h1,h2,h3,h4,h5,h6"));
        }
        if (filter === "code") {
            return Array.from(noteContent.querySelectorAll("pre, code"));
        }
        if (filter === "exam") {
            return Array.from(
                noteContent.querySelectorAll(".exam-highlight-sentence, .exam-highlight-term")
            );
        }

        // "all"
        if (!searchIndex) buildFlexIndex();

        let raw = [];
        try {
            raw = searchIndex.search(query, { enrich: true }) || [];
        } catch (err) {
            console.error("❌ FlexSearch search() threw — falling back to full-content search:", err);
            return [noteContent];
        }

        const matchedIds = new Set();
        raw.forEach((fieldGroup) => {
            (fieldGroup.result || []).forEach((hit) => matchedIds.add(hit.id));
        });

        console.log(
            `🔎 FlexSearch "${query}" → ${matchedIds.size} matched section id(s):`,
            Array.from(matchedIds)
        );

        if (matchedIds.size === 0) {
            // Either FlexSearch genuinely found nothing, or something about
            // the index/search call isn't behaving as expected. Either way,
            // fall back to searching the full note content directly — same
            // approach the other three filters already use reliably — so
            // "all" never silently returns fewer results than a plain
            // substring search would.
            console.warn(
                '⚠️ FlexSearch returned 0 matches for "all" — falling back to full-content search. ' +
                "If this keeps happening, check the console log two lines up: if the id list is " +
                "non-empty but results still look wrong, the bug is in sectionElements resolution " +
                "below; if the id list is empty, the bug is in buildFlexIndex()/searchIndex.search()."
            );
            return [noteContent];
        }

        const resolved = Array.from(matchedIds)
            .map((id) => sectionElements.get(id))
            .filter(Boolean);

        if (resolved.length === 0) {
            // FlexSearch found matches, but none resolved back to a real
            // element — sectionElements Map is out of sync with the index
            // (e.g. rebuilt separately, or ids don't match). Fall back
            // rather than show zero results for a query FlexSearch itself
            // says exists somewhere.
            console.warn(
                "⚠️ FlexSearch matched section ids but none resolved via sectionElements.get() " +
                "— index/element map are out of sync. Falling back to full-content search."
            );
            return [noteContent];
        }

        return resolved;
    }

    function highlightInContext(context, query) {
        clearHighlights();
        if (!context || context.length === 0) return;
        if (!query || query.length < 2) return;

        // separateWordSearch:false to match the old code's behavior of
        // matching the literal query string, not each word independently.
        new Mark(context).mark(query, {
            className: "search-highlight",
            separateWordSearch: false,
            acrossElements: true,
        });
    }

    function clearHighlights() {
        // Always unmark from the full .note-content root, not just the
        // last search's (possibly narrower) context — otherwise switching
        // filters or re-searching could leave orphaned marks from a
        // previous, differently-scoped search.
        const noteContent = document.querySelector(".note-content");
        if (!noteContent) return;
        new Mark(noteContent).unmark({ className: "search-highlight" });
    }

    // ── Scroll / navigation — unchanged from previous version ──────────────

    function scrollToResult(index) {
        const highlights = document.querySelectorAll(".search-highlight");

        if (!highlights.length || !highlights[index]) {
            updateSearchCounter();
            return;
        }

        highlights.forEach(function (highlight) {
            highlight.classList.remove("search-active");
        });

        currentResultIndex = index;

        const currentHighlight = highlights[index];
        currentHighlight.classList.add("search-active");

        expandParentSections(currentHighlight);

        requestAnimationFrame(function () {
            currentHighlight.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest"
            });

            updateSearchCounter();

            announceToScreenReader(
                `Result ${currentResultIndex + 1} of ${highlights.length}`
            );
        });
    }

    function expandParentSections(element) {
        let details = element.closest("details.collapsible-section");

        while (details) {
            if (!details.open) {
                details.open = true;

                const summary = details.querySelector(":scope > summary");
                if (summary) {
                    summary.setAttribute("aria-expanded", "true");
                }
            }

            details = details.parentElement
                ? details.parentElement.closest("details.collapsible-section")
                : null;
        }
    }

    function nextResult() {
        const highlights = document.querySelectorAll(".search-highlight");
        if (highlights.length === 0) return;

        currentResultIndex = (currentResultIndex + 1) % highlights.length;
        scrollToResult(currentResultIndex);
    }

    function previousResult() {
        const highlights = document.querySelectorAll(".search-highlight");
        if (highlights.length === 0) return;

        currentResultIndex =
            (currentResultIndex - 1 + highlights.length) % highlights.length;
        scrollToResult(currentResultIndex);
    }

    // ── Listeners / open-close / counter — unchanged from previous version ─

    function attachSearchListeners() {
        const searchInput = document.getElementById("search-input");
        const searchContainer = document.getElementById("search-container");
        const prevBtn = document.getElementById("search-prev");
        const nextBtn = document.getElementById("search-next");
        const closeBtn = document.getElementById("search-close");

        let searchTimeout;

        document.addEventListener("keydown", function (e) {
            if (
                e.key === "/" &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey &&
                !e.shiftKey
            ) {
                const active = document.activeElement;

                if (
                    active &&
                    (
                        active.tagName === "INPUT" ||
                        active.tagName === "TEXTAREA" ||
                        active.tagName === "SELECT" ||
                        active.isContentEditable
                    )
                ) {
                    return;
                }

                e.preventDefault();
                openSearch();
                return;
            }

            if (
                e.key === "Escape" &&
                searchContainer.classList.contains("visible")
            ) {
                e.preventDefault();
                closeSearch();
                return;
            }

            if (
                e.key === "F3" &&
                searchContainer.classList.contains("visible")
            ) {
                e.preventDefault();

                if (e.shiftKey) {
                    previousResult();
                } else {
                    nextResult();
                }
            }
        });

        searchInput.addEventListener("input", function () {
            clearTimeout(searchTimeout);

            searchTimeout = setTimeout(function () {
                performSearch(searchInput.value);
            }, 200);
        });

        searchInput.addEventListener("keydown", function (e) {
            switch (e.key) {
                case "Enter":
                    e.preventDefault();

                    if (e.shiftKey) {
                        previousResult();
                    } else {
                        nextResult();
                    }
                    break;

                case "ArrowDown":
                    e.preventDefault();
                    nextResult();
                    break;

                case "ArrowUp":
                    e.preventDefault();
                    previousResult();
                    break;
            }
        });

        prevBtn.addEventListener("click", previousResult);
        nextBtn.addEventListener("click", nextResult);
        closeBtn.addEventListener("click", closeSearch);

        document.addEventListener("click", function (e) {
            if (
                !searchContainer.classList.contains("visible") ||
                searchContainer.contains(e.target)
            ) {
                return;
            }

            if (e.target.closest(".search-highlight")) {
                return;
            }

            closeSearch();
        });

        // NOTE: the old "toggle" listener that rebuilt the index on every
        // details.collapsible-section open/close is intentionally removed
        // — see the module docstring's "BEHAVIOR CHANGE" note for why it's
        // no longer needed.
    }

    function openSearch() {
        const searchContainer = document.getElementById("search-container");
        const searchInput = document.getElementById("search-input");

        if (!searchContainer || !searchInput) {
            return;
        }

        searchContainer.classList.add("visible");

        requestAnimationFrame(function () {
            searchInput.focus();
            searchInput.select();
        });

        console.log("🔍 Search opened");
    }

    function closeSearch() {
        const searchContainer = document.getElementById("search-container");
        const searchInput = document.getElementById("search-input");

        if (!searchContainer || !searchInput) {
            return;
        }

        searchContainer.classList.remove("visible");
        searchInput.value = "";
        clearSearchResults();

        console.log("🔍 Search closed");
    }

    function updateSearchCounter() {
        const count = document.getElementById("search-count");
        const prevBtn = document.getElementById("search-prev");
        const nextBtn = document.getElementById("search-next");

        if (!count || !prevBtn || !nextBtn) {
            return;
        }

        const total = document.querySelectorAll(".search-highlight").length;

        if (total === 0) {
            count.textContent = "No results";
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        count.textContent = `${currentResultIndex + 1} of ${total}`;

        prevBtn.disabled = false;
        nextBtn.disabled = false;
    }

    function clearSearchResults() {
        clearHighlights();

        searchResults = [];
        searchQuery = "";
        currentResultIndex = 0;

        updateSearchCounter();
    }

    function announceToScreenReader(message) {
        const announcement = document.createElement("div");
        announcement.setAttribute("role", "status");
        announcement.setAttribute("aria-live", "polite");
        announcement.className = "sr-only";
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(function () {
            announcement.remove();
        }, 1000);
    }

    // ── Public API — same shape as before, so the six dependent modules
    // (notes-checklist.js, notes-glossary.js, notes-interview.js,
    // dsa-problems.js, dsa-contest.js, dsa-visual-mcq.js) keep working
    // without any changes on their end ─────────────────────────────────────

    window.NotesSearch = {
        version: "2.0.0",   // bumped — indexing engine changed, public API didn't
        performSearch: performSearch,
        clearSearch: clearSearchResults,
        nextResult: nextResult,
        previousResult: previousResult,
        rebuildIndex: function () {
            clearHighlights();
            buildFlexIndex();
        },
    };
    console.log("🔍 Search module loaded (FlexSearch + mark.js)");
})();
