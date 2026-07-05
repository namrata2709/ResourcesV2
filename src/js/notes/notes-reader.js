/**
 * =============================================================================
 * File: notes-reader.js
 * Path: js/notes/notes-reader.js
 * Project: Learning Dashboard
 *
 * Description:
 * Reading-experience features + shared utilities for note pages — toast
 * notifications (window.showNotification), reading time estimate,
 * reading progress bar, study timer, bookmarks panel, copy-code buttons,
 * and other general reading-page chrome. Several other modules
 * (notes-exam.js, notes-fab.js) call window.showNotification at
 * click-time, so this file's load order relative to them only matters in
 * that showNotification must exist by the time those click handlers fire
 * — not at their own load time.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - window.NotePageId (set by notes-page-core.js before this loads)
 * =============================================================================
 */

(function () {
  "use strict";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReader);
  } else {
    initReader();
  }

  function initReader() {
    try {
      initCodeBlocks();
      initSectionStatePersistence();
      injectTableOfContents();
      
      initTableOfContentsHighlight();
      initDarkModeAutoDetect();
      initSearchHistory();
      injectLoadingSkeletons();
      initSmoothTransitions();
      initBookmarkSystem();
      injectReadingTimeBadge();
      initReadingProgressPersistence();
      injectReadingProgressBar();
      initStudyTimer();
      
      hideMissingScreenshots();

      console.log("✅ notes-reader.js initialized");
    } catch (error) {
      console.error("❌ Error in notes-reader.js:", error);
    }
  }

  function sectionStateKey() {
    return "sectionState-" + window.NotePageId;
  }

  function loadSectionState() {
    try {
      const raw = localStorage.getItem(sectionStateKey());
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.v === 1 ? parsed.data : null;
    } catch (e) {
      return null;
    }
  }

  function saveSectionState() {
    try {
      const state = {};
      document.querySelectorAll("details.collapsible-section").forEach(function (d) {
        const heading = d.querySelector(":scope > summary h1[id], :scope > summary h2[id], :scope > summary h3[id]");
        if (heading) state[heading.id] = d.hasAttribute("open");
      });
      localStorage.setItem(sectionStateKey(), JSON.stringify({ v: 1, data: state }));
    } catch (e) {
      console.warn("Could not save section state:", e);
    }
  }

  function initSectionStatePersistence() {
    if (!document.querySelector(".note-content")) return;
    document.addEventListener("toggle", function (e) {
      if (e.target.matches("details.collapsible-section")) saveSectionState();
    }, true);
    console.log("✅ Section expand/collapse persistence enabled");
  }

  function initCodeBlocks() {
    addCopyButtonsToCodeBlocks();
  }
  function hideMissingScreenshots() {
    document.querySelectorAll(".diagram-container img").forEach(function (img) {
      // If the image already failed before this script ran, naturally
      // checking img.complete + naturalWidth catches that case too.
      if (img.complete && img.naturalWidth === 0) {
        hideContainer(img);
        return;
      }
      img.addEventListener("error", function () {
        hideContainer(img);
      });
    });

    function hideContainer(img) {
      const container = img.closest(".diagram-container");
      if (container) container.style.display = "none";
    }
  }
  function addCopyButtonsToCodeBlocks() {
    const codeBlocks = document.querySelectorAll("pre code");

    codeBlocks.forEach((codeBlock, index) => {
      const pre = codeBlock.parentElement;

      // Skip if button already exists
      if (pre.querySelector(".copy-code-btn")) {
        return;
      }

      const copyButton = document.createElement("button");
      copyButton.className = "copy-code-btn";
      copyButton.setAttribute("aria-label", "Copy code to clipboard");
      copyButton.setAttribute("data-code-index", index);

      const buttonText = document.createElement("span");
      buttonText.textContent = "Copy";
      copyButton.appendChild(buttonText);

      copyButton.addEventListener("click", function () {
        copyCodeToClipboard(codeBlock, copyButton, buttonText);
      });

      pre.style.position = "relative";
      pre.insertBefore(copyButton, pre.firstChild);
    });

    console.log(`📋 Initialized ${codeBlocks.length} code block copy buttons`);
  }
  function copyCodeToClipboard(codeBlock, button, buttonText) {
    const codeText = codeBlock.textContent;

    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(codeText)
        .then(function () {
          showCopySuccess(button, buttonText);
        })
        .catch(function (err) {
          console.warn("Clipboard API failed, using fallback:", err);
          copyCodeFallback(codeText, button, buttonText);
        });
    } else {
      // Use fallback for older browsers
      copyCodeFallback(codeText, button, buttonText);
    }
  }

  function showCopySuccess(button, buttonText) {
    button.classList.add("copied");
    buttonText.textContent = "Copied!";

    // Tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "copy-tooltip";
    tooltip.textContent = "Copied! ✓";
    const rect = button.getBoundingClientRect();
    tooltip.style.position = "fixed";
    tooltip.style.top = rect.top - 40 + "px";
    tooltip.style.left = rect.left + rect.width / 2 + "px";
    tooltip.style.transform = "translateX(-50%)";
    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.classList.add("visible"), 10);
    setTimeout(() => {
      tooltip.classList.remove("visible");
      setTimeout(() => tooltip.remove(), 300);
    }, 2000);

    // Haptic feedback
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    setTimeout(function () {
      button.classList.remove("copied");
      buttonText.textContent = "Copy";
    }, 2000);
  }

  function copyCodeFallback(text, button, buttonText) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);

    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        showCopySuccess(button, buttonText);
      } else {
        showCopyError(button, buttonText);
      }
    } catch (err) {
      console.error("Failed to copy code:", err);
      showCopyError(button, buttonText);
    }

    document.body.removeChild(textarea);
  }

  function showCopyError(button, buttonText) {
    buttonText.textContent = "Failed";
    button.classList.add("copy-error");

    setTimeout(function () {
      buttonText.textContent = "Copy";
      button.classList.remove("copy-error");
    }, 2000);
  }
  function injectTableOfContents() {
    const noteContent = document.querySelector(".note-content");
    if (!noteContent) return;

    const headings = noteContent.querySelectorAll("h2[id], h3[id]");
    if (headings.length === 0) return;

    const ul = document.createElement("ul");
    ul.className = "toc-list";

    let currentH2Li = null;
    let currentSubUl = null;

    headings.forEach(function (heading) {
      const id = heading.getAttribute("id");
      const text = heading.textContent.replace(/[⭐☆]/g, "").trim();
      const level = heading.tagName.toLowerCase();

      const li = document.createElement("li");
      li.className = "toc-item toc-" + level;

      const a = document.createElement("a");
      a.href = "#" + id;
      a.textContent = text;
      a.className = "toc-link";

      if (level === "h2") {
        // Row wrapper: [bullet] [link] [arrow if has h3s]
        const row = document.createElement("div");
        row.className = "toc-row";


        row.appendChild(a);

        li.appendChild(row);

        // Sublist — toggle + children added when first h3 appears
        currentSubUl = document.createElement("ul");
        currentSubUl.className = "toc-sublist";
        li.appendChild(currentSubUl);

        currentH2Li = li;
        ul.appendChild(li);
      } else if (level === "h3") {
        li.appendChild(a);

        if (!currentSubUl) {
          ul.appendChild(li);
        } else {
          // First h3 under this h2: inject the arrow toggle into its row
          if (currentSubUl.children.length === 0 && currentH2Li) {
            const row = currentH2Li.querySelector(".toc-row");
            const subUlRef = currentSubUl;

            const toggle = document.createElement("button");
            toggle.className = "toc-toggle";
            toggle.setAttribute("aria-label", "Expand subsections");
            toggle.setAttribute("aria-expanded", "false");
            toggle.innerHTML = "&#9654;"; // ▶

            toggle.addEventListener("click", function (e) {
              e.preventDefault();
              const expanded = subUlRef.classList.toggle("toc-sublist--open");
              toggle.setAttribute("aria-expanded", expanded.toString());
              toggle.classList.toggle("toc-toggle--open", expanded);
            });

            if (row) row.appendChild(toggle);
          }

          currentSubUl.appendChild(li);
        }
      }
    });

    const container = document.createElement("nav");
    container.className = "toc-container";
    container.id = "table-of-contents";
    container.setAttribute("aria-label", "Table of contents");
    container.innerHTML = '<h2 class="toc-title">📋 Table of Contents</h2>';
    container.appendChild(ul);

    // Insert TOC as the very first child of .note-content
    noteContent.insertBefore(container, noteContent.firstChild);

    // After TOC is inserted, find the Introduction <details> and ensure it's open
    const savedSectionState = loadSectionState();
    if (savedSectionState) {
      noteContent.querySelectorAll("details.collapsible-section").forEach(function (d) {
        const heading = d.querySelector(":scope > summary h1[id], :scope > summary h2[id], :scope > summary h3[id]");
        if (heading && Object.prototype.hasOwnProperty.call(savedSectionState, heading.id)) {
          d.toggleAttribute("open", savedSectionState[heading.id]);
        }
      });
    } else {
      const introDetails = noteContent.querySelector("details.collapsible-section");
      if (introDetails) {
        noteContent.querySelectorAll("details.collapsible-section").forEach(function (d) {
          d.removeAttribute("open");
        });
        introDetails.setAttribute("open", "");
      }
    }

    console.log(`✅ Table of contents injected (${headings.length} entries)`);
  }
  function injectReadingTimeBadge() {
  const noteContent = document.querySelector(".note-content");
  if (!noteContent) return;

  // Prefer the server-computed estimate (excludes nav/footer/scripts,
  // computed once at generation time — see window.NoteReadTime in
  // generate_notes.py). Fall back to a client-side count only for pages
  // built before that change existed.
  let minutes;
  if (window.NoteReadTime && window.NoteReadTime.read_time_minutes) {
    minutes = window.NoteReadTime.read_time_minutes;
  } else {
    const text = noteContent.innerText;
    const words = text.trim().split(/\s+/).length;
    minutes = Math.ceil(words / 200);
  }
  const badge = document.createElement("div");
  badge.className = "reading-time-badge";
  badge.innerHTML = `<span class="reading-time-icon">📖</span> <span class="reading-time-text">${minutes} min read</span>`;

  const header = document.querySelector(".note-header");
  if (header) {
    header.appendChild(badge);
  }
  console.log(`✅ Reading time badge injected (${minutes} minutes)`);
}
  function injectReadingProgressBar() {
    const progressBar = document.createElement("div");
    progressBar.className = "reading-progress-bar";
    progressBar.id = "readingProgressBar";

    const progressFill = document.createElement("div");
    progressFill.className = "reading-progress-fill";
    progressBar.appendChild(progressFill);

    document.body.insertBefore(progressBar, document.body.firstChild);

    // Update progress on scroll
    function updateProgress() {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      const scrollPercentage =
        (scrollTop / (documentHeight - windowHeight)) * 100;
      const clampedPercentage = Math.min(100, Math.max(0, scrollPercentage));

      progressFill.style.width = clampedPercentage + "%";
    }

    window.addEventListener("scroll", updateProgress);
    window.addEventListener("resize", updateProgress);

    // Initial update
    updateProgress();

    console.log("✅ Reading progress bar injected");
  }
  function initTableOfContentsHighlight() {
    const tocLinks = document.querySelectorAll('a[href^="#"]');
    if (tocLinks.length === 0) return;

    const sections = document.querySelectorAll("h2[id], h3[id]");
    if (sections.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");

          // Remove active class from all links
          tocLinks.forEach(function (link) {
            link.classList.remove("toc-active");
          });

          // Add active class to matching link
          const activeLink = document.querySelector(`a[href="#${id}"]`);
          if (activeLink) {
            activeLink.classList.add("toc-active");
          }
        }
      });
    }, observerOptions);

    sections.forEach(function (section) {
      observer.observe(section);
    });

    console.log("✅ Table of contents highlighting initialized");
  }
  function initDarkModeAutoDetect() {
    const THEMES = ["light", "dark", "comfort"];

    function applyTheme(theme) {
      // Validate against the same three themes theme.js uses
      const validated = THEMES.includes(theme) ? theme : "light";
      document.documentElement.setAttribute("data-theme", validated);
      localStorage.setItem("theme", validated);
    }

    // Only auto-detect on first visit — if user already picked a theme, respect it
    if (localStorage.getItem("theme")) {
      console.log("ℹ️ User has theme preference, skipping auto-detect");
      return;
    }

    // OS only reports dark or light — comfort has no OS equivalent
    // so auto-detect only sets dark or light on first visit
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (prefersDark) {
      applyTheme("dark");
      console.log("✅ Auto-detected dark mode preference");
    } else {
      applyTheme("light");
      console.log("✅ Auto-detected light mode preference");
    }

    // Listen for OS theme changes — only switch between dark and light
    // Never override comfort if user manually selected it
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", function (e) {
        const currentTheme = localStorage.getItem("theme");

        // If user manually chose comfort, never auto-change it
        if (currentTheme === "comfort") {
          console.log("ℹ️ User is in comfort mode — ignoring OS theme change");
          return;
        }

        const newTheme = e.matches ? "dark" : "light";
        applyTheme(newTheme);
        showNotification("Theme updated to match system preference");
      });
  }
  function injectLoadingSkeletons() {
    // Add skeletons for quiz, checklist, glossary, interview
    const containers = [
      { id: "quizContainer", lines: 4 },
      { id: "checklistContainer", lines: 6 },
      { id: "glossaryContainer", lines: 5 },
      { id: "interviewContainer", lines: 3 },
    ];

    containers.forEach(function (container) {
      const element = document.getElementById(container.id);
      if (!element) return;

      // Create skeleton
      const skeleton = document.createElement("div");
      skeleton.className = "skeleton-loader";
      skeleton.setAttribute("data-skeleton", "true");
      for (let i = 0; i < container.lines; i++) {
        const line = document.createElement("div");
        line.className = "skeleton-line";
        if (i === container.lines - 1) {
          line.classList.add("short");
        }
        skeleton.appendChild(line);
      }

      // Show skeleton while loading
      element.appendChild(skeleton);

      // Remove skeleton after content loads
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node.dataset && !node.dataset.skeleton) {
              skeleton.remove();
              observer.disconnect();
            }
          });
        });
      });

      observer.observe(element, { childList: true });
    });

    console.log("✅ Loading skeletons injected");
  }
  function initSmoothTransitions() {
    // Add smooth transition class to body
    document.body.classList.add("smooth-transitions");

    // Smooth scroll for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener("click", function (e) {
        const href = this.getAttribute("href");
        if (href === "#") return;

        e.preventDefault();
        const target = document.querySelector(href);

        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

          // Update URL without jumping
          history.pushState(null, null, href);
        }
      });
    });

    console.log("✅ Smooth transitions initialized");
  }

  function initBookmarkSystem() {
    const pageId = window.NotePageId;
    const bookmarksKey = "bookmarks-" + pageId;

    // Load bookmarks
    let bookmarks = JSON.parse(localStorage.getItem(bookmarksKey) || "[]");

    // Add bookmark buttons to section headers
    const headers = document.querySelectorAll(
      ".note-content h2[id], .note-content h3[id]",
    );

    headers.forEach(function (header) {
      const id = header.getAttribute("id");
      const isBookmarked = bookmarks.includes(id);

      const bookmarkBtn = document.createElement("button");
      bookmarkBtn.className =
        "bookmark-btn" + (isBookmarked ? " bookmarked" : "");
      bookmarkBtn.setAttribute("aria-label", "Bookmark this section");
      bookmarkBtn.setAttribute(
        "title",
        isBookmarked ? "Remove bookmark" : "Bookmark this section",
      );
      bookmarkBtn.innerHTML = isBookmarked ? "⭐" : "☆";

      bookmarkBtn.addEventListener("click", function (e) {
        e.preventDefault();
        toggleBookmark(id, bookmarkBtn);
      });

      header.appendChild(bookmarkBtn);
    });

    function toggleBookmark(id, button) {
      if (bookmarks.includes(id)) {
        // Remove bookmark
        bookmarks = bookmarks.filter((b) => b !== id);
        button.classList.remove("bookmarked");
        button.innerHTML = "☆";
        button.setAttribute("title", "Bookmark this section");
        showNotification("Bookmark removed");
      } else {
        // Add bookmark
        bookmarks.push(id);
        button.classList.add("bookmarked");
        button.innerHTML = "⭐";
        button.setAttribute("title", "Remove bookmark");
        showNotification("Bookmark added");
      }

      localStorage.setItem(bookmarksKey, JSON.stringify(bookmarks));

      // Update or create bookmarks panel
      updateBookmarksPanel();
    }

    // Always create bookmarks panel (even if empty)
    injectBookmarksPanel();

    function injectBookmarksPanel() {
      // Remove existing panel if any
      const existingPanel = document.getElementById("bookmarksPanel");
      if (existingPanel) {
        existingPanel.remove();
      }

      const panel = document.createElement("div");
      panel.className = "bookmarks-panel";
      panel.id = "bookmarksPanel";
      panel.innerHTML = `
                <h3>📑 Your Bookmarks</h3>
                <ul class="bookmarks-list"></ul>
                <button class="close-bookmarks-btn" onclick="document.getElementById('bookmarksPanel').classList.remove('visible')">Close</button>
            `;

      document.body.appendChild(panel);
      updateBookmarksPanel();
    }

    function updateBookmarksPanel() {
      const panel = document.getElementById("bookmarksPanel");
      if (!panel) return;

      const list = panel.querySelector(".bookmarks-list");
      list.innerHTML = "";

      if (bookmarks.length === 0) {
        list.innerHTML =
          '<li style="color: var(--text-secondary); font-style: italic;">No bookmarks yet. Click ⭐ on any heading.</li>';
        return;
      }

      bookmarks.forEach(function (id) {
        const header = document.getElementById(id);
        if (!header) return;

        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = "#" + id;
        link.textContent = header.textContent.replace(/[⭐☆]/, "").trim();
        link.addEventListener("click", function () {
          panel.classList.remove("visible");
        });

        li.appendChild(link);
        list.appendChild(li);
      });
    }

    console.log(
      `✅ Bookmark system initialized (${bookmarks.length} bookmarks)`,
    );
  }

  function initStudyTimer() {
    const pageId = window.NotePageId;
    const timerKey = "studyTime-" + pageId;
    const sessionKey = "studySession-" + pageId;

    const startTime = Date.now();
    const storedTotal = parseInt(localStorage.getItem(timerKey) || "0");

    // Create timer display with close and reset buttons
    const timerDisplay = document.createElement("div");
    timerDisplay.className = "study-timer-display";
    timerDisplay.id = "studyTimerDisplay";

    // Check if timer should be hidden (from localStorage)
    let timerHidden = localStorage.getItem("timerHidden") === "true";

    // Auto-hide on mobile devices
    const isMobile = window.innerWidth <= 768;
    if (isMobile && localStorage.getItem("timerHidden") === null) {
      // First time on mobile - auto-hide
      timerHidden = true;
      localStorage.setItem("timerHidden", "true");
    }

    if (timerHidden) {
      timerDisplay.classList.add("hidden");
    }

    timerDisplay.innerHTML = `
        <button class="timer-close-btn" id="timerCloseBtn" title="Hide timer">×</button>
        <div class="timer-icon">⏱️</div>
        <div class="timer-text">
            ${window.NoteReadTime ? `<div class="timer-estimate">📖 Est. read: ${window.NoteReadTime.read_time_minutes} min</div>` : ""}
            <div class="timer-session">Session: <span id="sessionTime">0s</span></div>
            <div class="timer-total">Total: <span id="totalTime">${formatTime(storedTotal)}</span></div>
        </div>
        <div class="timer-actions">
            <button class="timer-reset-btn" id="timerResetBtn" title="Reset total time">Reset</button>
            <div class="timer-hint">💡 Alt+Shift+T or Menu → Tools → Timer</div>
        </div>
    `;

    document.body.appendChild(timerDisplay);

    // Close button
    document
      .getElementById("timerCloseBtn")
      .addEventListener("click", function () {
        timerDisplay.classList.add("hidden");
        localStorage.setItem("timerHidden", "true");
        showNotification("Timer hidden. Use Menu → Tools → Timer to show.");
      });

    // Keyboard shortcut to toggle timer (Alt+Shift+T)
    document.addEventListener("keydown", function (e) {
      if (e.altKey && e.shiftKey && e.key === "T") {
        e.preventDefault();
        timerDisplay.classList.toggle("hidden");
        const isHidden = timerDisplay.classList.contains("hidden");
        localStorage.setItem("timerHidden", isHidden.toString());
        showNotification(isHidden ? "Timer hidden" : "Timer shown");
      }
    });

    // Update every 10 seconds
    const updateInterval = setInterval(updateTimer, 10000);

    // Initial update after 1 second
    setTimeout(updateTimer, 1000);

    // Reset button
    document
      .getElementById("timerResetBtn")
      .addEventListener("click", function () {
        if (confirm("Reset total study time for this page?")) {
          localStorage.removeItem(timerKey);
          localStorage.removeItem(sessionKey);
          document.getElementById("totalTime").textContent = "0m";
          showNotification("Study timer reset");
        }
      });

    // Save on page unload
    window.addEventListener("beforeunload", saveStudyTime);

    // Save every 2 minutes
    const saveInterval = setInterval(saveStudyTime, 120000);

    function updateTimer() {
      const sessionTime = Date.now() - startTime;
      const sessionMinutes = Math.floor(sessionTime / 60000);
      const sessionSeconds = Math.floor((sessionTime % 60000) / 1000);

      // Show session time
      if (sessionMinutes > 0) {
        document.getElementById("sessionTime").textContent =
          sessionMinutes + "m";
      } else {
        document.getElementById("sessionTime").textContent =
          sessionSeconds + "s";
      }

      // Update total display
      const currentTotal = storedTotal + sessionTime;
      document.getElementById("totalTime").textContent =
        formatTime(currentTotal);
    }

    function saveStudyTime() {
      const sessionTime = Date.now() - startTime;
      const newTotal = storedTotal + sessionTime;
      localStorage.setItem(timerKey, newTotal.toString());
      localStorage.setItem(sessionKey, Date.now().toString());
    }

    function formatTime(ms) {
      const totalMinutes = Math.floor(ms / 60000);

      if (totalMinutes === 0) return "0m";
      if (totalMinutes < 60) return totalMinutes + "m";

      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      if (hours < 24) {
        return hours + "h " + (mins > 0 ? mins + "m" : "");
      } else {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return days + "d " + (remainingHours > 0 ? remainingHours + "h" : "");
      }
    }

    console.log("✅ Study timer initialized");
  }
  function initSearchHistory() {
    const pageId = window.NotePageId;
    const historyKey = "searchHistory-" + pageId;
    const MAX_HISTORY = 10;

    function loadHistory() {
      try { return JSON.parse(localStorage.getItem(historyKey) || "[]"); }
      catch (e) { return []; }
    }
    function saveHistory(h) {
      try { localStorage.setItem(historyKey, JSON.stringify(h)); }
      catch (e) { console.warn("Could not save search history:", e); }
    }
    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    window.searchHistory = loadHistory();

    const searchInput = document.getElementById("search-input");
    const searchBox = document.querySelector(".search-box");
    if (!searchInput || !searchBox) return;

    // Drop the old native datalist approach if present
    searchInput.removeAttribute("list");
    const oldDatalist = document.getElementById("search-history-list");
    if (oldDatalist) oldDatalist.remove();

    // Section headings double as lightweight autocomplete suggestions
    const headingPool = Array.from(
      document.querySelectorAll(".note-content h1[id], .note-content h2[id], .note-content h3[id], .note-content h4[id]")
    ).map((h) => h.textContent.replace(/[⭐☆▶◀]/g, "").trim()).filter(Boolean);

    const suggestBox = document.createElement("div");
    suggestBox.className = "search-suggestions";
    suggestBox.id = "search-suggestions";
    searchBox.appendChild(suggestBox);

    function renderSuggestions() {
      const query = searchInput.value.trim().toLowerCase();
      let historyMatches, headingMatches = [];

      if (!query) {
        historyMatches = window.searchHistory.slice(0, MAX_HISTORY);
      } else {
        historyMatches = window.searchHistory
          .filter((h) => h.toLowerCase().includes(query) && h.toLowerCase() !== query)
          .slice(0, 5);
        headingMatches = headingPool
          .filter((h) => h.toLowerCase().includes(query))
          .slice(0, 5);
      }

      if (!historyMatches.length && !headingMatches.length) {
        suggestBox.classList.remove("visible");
        suggestBox.innerHTML = "";
        return;
      }

      let html = "";
      if (historyMatches.length) {
        html += `<div class="search-suggestions-label">${query ? "From your searches" : "Recent searches"}</div>`;
        historyMatches.forEach((term) => {
          html += `<div class="search-suggestion-item" data-term="${escapeHtml(term)}">
          <span class="search-suggestion-icon">🕘</span><span class="search-suggestion-text">${escapeHtml(term)}</span>
          <button class="search-suggestion-remove" data-remove="${escapeHtml(term)}" aria-label="Remove from history">×</button>
        </div>`;
        });
      }
      if (headingMatches.length) {
        html += `<div class="search-suggestions-label">Jump to section</div>`;
        headingMatches.forEach((term) => {
          html += `<div class="search-suggestion-item" data-term="${escapeHtml(term)}">
          <span class="search-suggestion-icon">📄</span><span class="search-suggestion-text">${escapeHtml(term)}</span>
        </div>`;
        });
      }
      if (window.searchHistory.length && !query) {
        html += `<button class="search-suggestions-clear" id="clearSearchHistory">Clear recent searches</button>`;
      }

      suggestBox.innerHTML = html;
      suggestBox.classList.add("visible");
    }

    searchInput.addEventListener("focus", renderSuggestions);
    searchInput.addEventListener("input", renderSuggestions);

    suggestBox.addEventListener("click", function (e) {
      const removeBtn = e.target.closest(".search-suggestion-remove");
      if (removeBtn) {
        e.stopPropagation();
        const term = removeBtn.dataset.remove;
        window.searchHistory = window.searchHistory.filter((h) => h !== term);
        saveHistory(window.searchHistory);
        renderSuggestions();
        return;
      }
      if (e.target.closest("#clearSearchHistory")) {
        window.searchHistory = [];
        saveHistory(window.searchHistory);
        renderSuggestions();
        return;
      }
      const item = e.target.closest(".search-suggestion-item");
      if (item) {
        searchInput.value = item.dataset.term;
        suggestBox.classList.remove("visible");
        if (window.NotesSearch) window.NotesSearch.performSearch(item.dataset.term);
        searchInput.focus();
      }
    });

    document.addEventListener("click", function (e) {
      if (!searchBox.contains(e.target)) suggestBox.classList.remove("visible");
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") suggestBox.classList.remove("visible");
    });

    const originalPerformSearch = window.NotesSearch && window.NotesSearch.performSearch;
    if (originalPerformSearch) {
      window.NotesSearch.performSearch = function (query) {
        originalPerformSearch.call(this, query);
        if (query && query.trim().length >= 2) {
          const trimmed = query.trim();
          window.searchHistory = window.searchHistory.filter((h) => h !== trimmed);
          window.searchHistory.unshift(trimmed);
          window.searchHistory = window.searchHistory.slice(0, MAX_HISTORY);
          saveHistory(window.searchHistory);
        }
      };
    }

    console.log("✅ Search history + autocomplete initialized");
  }

  function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "toast-notification";
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add("visible"), 10);
    setTimeout(() => {
      notification.classList.remove("visible");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  function initReadingProgressPersistence() {
    const pageId = window.NotePageId;
    const key = "readingProgress-" + pageId;

    // Same folder-derivation notes-favorite.js already uses to identify
    // "this note" reliably — every note page lives at .../[folder]/[file]
    // regardless of hosting depth, so the folder is always the URL segment
    // right before the filename. Mirroring progress under this key (in
    // ADDITION to the existing title-based `key` above, which the resume
    // banner below still uses) lets notes-index.js look up a note's
    // progress from its own JSON data (note.folder) without having to
    // reverse-engineer this page's exact <title> text, which doesn't
    // reliably match notes-index.json's `title` field.
    function getCurrentNoteFolder() {
      const parts = location.pathname.split('/').filter(Boolean);
      return parts.length >= 2 ? parts[parts.length - 2] : null;
    }
    const folder = getCurrentNoteFolder();
    const folderKey = folder ? "readingProgress-folder-" + folder : null;

    function loadProgress() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && parsed.v === 1 ? parsed : null;
      } catch (e) {
        return null;
      }
    }

    function saveProgress(percent) {
      try {
        const payload = JSON.stringify({ v: 1, percent, timestamp: Date.now() });
        localStorage.setItem(key, payload);
        if (folderKey) localStorage.setItem(folderKey, payload);
      } catch (e) {
        console.warn("Could not save reading progress:", e);
      }
    }

    function currentPercent() {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      return Math.round(Math.min(100, Math.max(0, (scrollTop / (documentHeight - windowHeight)) * 100)));
    }

    function formatRelativeTime(ts) {
      const mins = Math.round((Date.now() - ts) / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins} min ago`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.round(hours / 24);
      if (days === 1) return "yesterday";
      if (days < 30) return `${days} days ago`;
      return new Date(ts).toLocaleDateString();
    }

    function showResumeBanner(saved) {
      const banner = document.createElement("div");
      banner.className = "resume-reading-banner";
      banner.id = "resumeReadingBanner";
      banner.innerHTML = `
      <span class="resume-reading-text">📍 You were ${saved.percent}% through this note — ${formatRelativeTime(saved.timestamp)}.</span>
      <button class="resume-reading-btn" id="resumeReadingBtn">Resume reading</button>
      <button class="resume-reading-dismiss" id="resumeReadingDismiss" aria-label="Dismiss">×</button>
    `;
      document.body.appendChild(banner);

      document.getElementById("resumeReadingBtn").addEventListener("click", function () {
        const target = (saved.percent / 100) * (document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: target, behavior: "smooth" });
        banner.remove();
      });
      document.getElementById("resumeReadingDismiss").addEventListener("click", () => banner.remove());
      setTimeout(() => { if (document.body.contains(banner)) banner.remove(); }, 10000);
    }

    const saved = loadProgress();
    // Only offer resume if they were meaningfully into it, not already scrolled, and it's a return visit
    if (saved && saved.percent > 5 && saved.percent < 95 && window.scrollY < 50) {
      showResumeBanner(saved);
    }

    let saveTimeout = null;
    window.addEventListener("scroll", function () {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => saveProgress(currentPercent()), 1500);
    });
    window.addEventListener("pagehide", () => saveProgress(currentPercent()));

    console.log("✅ Reading progress persistence enabled");
  }

  // Expose for other modules
  window.showNotification = showNotification;
})();
