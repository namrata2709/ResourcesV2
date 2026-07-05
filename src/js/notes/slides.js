/**
 * =============================================================================
 * File: slides.js
 * Path: js/notes/slides.js
 * Project: Learning Dashboard
 *
 * Description:
 * Presentation Mode deck engine — next/prev, keyboard nav, progress bar,
 * slide counter, table of contents, fullscreen, and reveal/select logic
 * for engage cards (think/scenario/poll/predict/pause). Loaded only by
 * slides.html pages, after js/shared/site-config.js.
 *
 * Deliberately reuses rather than reimplements the shared chain:
 *   - theme.js self-injects the fixed theme-toggle circle and handles
 *     light/dark/comfort — nothing theme-related lives here.
 *   - footer.js renders #footerRoot.
 *   - page-loader.js hides #pageLoader on window 'load'.
 *   - navigation.js is skipped entirely (slides.html sets
 *     data-no-nav="true" on <body>) since a full-viewport deck has no
 *     breadcrumb/page-header container for it to attach to.
 * No localStorage use — a deck is meant to be watched start-to-finish,
 * not resumed mid-way like a note.
 *
 * Author: Namrata Mulwani
 * =============================================================================
 */

(function () {
  "use strict";

  var state = {
    slides: [],
    current: 0,
  };

  function init() {
    state.slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
    if (state.slides.length === 0) {
      console.warn("slides.js: no .slide elements found on this page.");
      return;
    }

    bindNotesPanel();
    goTo(0);
    bindNav();
    bindKeyboard();
    bindEngageCards();
    bindToc();
    bindFullscreen();
  }

  // ------------------------------------------------------------------ //
  // Core navigation
  // ------------------------------------------------------------------ //

  function goTo(index) {
    if (index < 0 || index >= state.slides.length) return;

    state.slides[state.current].classList.remove("active");
    state.current = index;
    state.slides[state.current].classList.add("active");

    updateCounter();
    updateProgress();
    updateNotesPanel();
  }

  function next() {
    goTo(state.current + 1);
  }

  function prev() {
    goTo(state.current - 1);
  }

  function updateCounter() {
    var counterEl = document.getElementById("slideCounter");
    if (counterEl) {
      counterEl.textContent = (state.current + 1) + " / " + state.slides.length;
    }
  }

  function updateProgress() {
    var progressEl = document.getElementById("slideProgress");
    if (progressEl) {
      var pct = ((state.current + 1) / state.slides.length) * 100;
      progressEl.style.width = pct + "%";
    }
  }

  // ------------------------------------------------------------------ //
  // Prev/Next buttons
  // ------------------------------------------------------------------ //

  function bindNav() {
    var prevBtn = document.getElementById("prevSlide");
    var nextBtn = document.getElementById("nextSlide");
    if (prevBtn) prevBtn.addEventListener("click", prev);
    if (nextBtn) nextBtn.addEventListener("click", next);
  }

  // ------------------------------------------------------------------ //
  // Keyboard shortcuts
  // ------------------------------------------------------------------ //

  function bindKeyboard() {
    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(state.slides.length - 1);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "Escape":
          closeToc();
          closeNotesPanel();
          break;
      }
    });
  }

  // ------------------------------------------------------------------ //
  // Engage cards — reveal + option selection (no scoring, no persistence)
  // ------------------------------------------------------------------ //

  function bindEngageCards() {
    document.querySelectorAll("[data-reveal-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".engage-card");
        if (!card) return;
        var revealEl = card.querySelector(".engage-reveal");
        if (revealEl) {
          revealEl.hidden = !revealEl.hidden;
          btn.textContent = revealEl.hidden ? "Reveal" : "Hide";
        }
      });
    });

    document.querySelectorAll(".engage-option-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var list = btn.closest(".engage-options");
        if (list) {
          list.querySelectorAll(".engage-option-btn").forEach(function (b) {
            b.classList.remove("selected");
          });
        }
        btn.classList.add("selected");
      });
    });
  }

  // ------------------------------------------------------------------ //
  // Table of contents (built from section-divider slides)
  // ------------------------------------------------------------------ //

  function bindToc() {
    var tocEl = document.getElementById("slideToc");
    var toggleBtn = document.getElementById("tocToggle");
    if (!tocEl || !toggleBtn) return;

    var entries = [];
    try {
      entries = JSON.parse(tocEl.getAttribute("data-entries") || "[]");
    } catch (err) {
      console.warn("slides.js: could not parse TOC entries.", err);
    }

    var list = document.createElement("ul");
    entries.forEach(function (entry) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = entry.title;
      btn.addEventListener("click", function () {
        goTo(entry.index - 1); // slide index is 1-based in the markdown/HTML
        closeToc();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
    tocEl.appendChild(list);

    toggleBtn.addEventListener("click", function () {
      tocEl.hidden = !tocEl.hidden;
    });
  }

  function closeToc() {
    var tocEl = document.getElementById("slideToc");
    if (tocEl) tocEl.hidden = true;
  }

  // ------------------------------------------------------------------ //
  // Speaker notes drawer — right-side panel that pushes the deck over,
  // rather than floating on top of it (same feel as Claude's artifact
  // panel). Open/closed state lives entirely on the .is-open class so it
  // can't be blocked by a site-wide [hidden] rule.
  // ------------------------------------------------------------------ //

  function openNotesPanel() {
    var panel = document.getElementById("notesPanel");
    var toggleBtn = document.getElementById("notesToggle");
    if (!panel) return;
    panel.classList.add("is-open");
    document.body.classList.add("notes-open");
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
  }

  function closeNotesPanel() {
    var panel = document.getElementById("notesPanel");
    var toggleBtn = document.getElementById("notesToggle");
    if (!panel) return;
    panel.classList.remove("is-open");
    document.body.classList.remove("notes-open");
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
  }

  function toggleNotesPanel() {
    var panel = document.getElementById("notesPanel");
    if (!panel) return;
    if (panel.classList.contains("is-open")) {
      closeNotesPanel();
    } else {
      openNotesPanel();
    }
  }

  function updateNotesPanel() {
    var panel = document.getElementById("notesPanel");
    if (!panel) return;
    var contentEl = panel.querySelector(".notes-panel-content");
    if (!contentEl) return;

    var activeSlide = state.slides[state.current];
    var source = activeSlide ? activeSlide.querySelector(".slide-notes-content") : null;

    if (source && source.innerHTML.trim()) {
      contentEl.innerHTML = source.innerHTML;
    } else {
      contentEl.innerHTML = '<p class="notes-empty">No speaker notes for this slide.</p>';
    }
  }

  function bindNotesPanel() {
    var toggleBtn = document.getElementById("notesToggle");
    var panel = document.getElementById("notesPanel");
    if (!toggleBtn || !panel) return;

    toggleBtn.addEventListener("click", toggleNotesPanel);

    var closeBtn = panel.querySelector(".notes-panel-close");
    if (closeBtn) closeBtn.addEventListener("click", closeNotesPanel);
  }

  // ------------------------------------------------------------------ //
  // Fullscreen
  // ------------------------------------------------------------------ //

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function (err) {
        console.warn("slides.js: fullscreen request failed.", err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  function bindFullscreen() {
    var btn = document.getElementById("fullscreenToggle");
    if (btn) btn.addEventListener("click", toggleFullscreen);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SlidesDeck = {
    goTo: goTo,
    next: next,
    prev: prev,
    openNotesPanel: openNotesPanel,
    closeNotesPanel: closeNotesPanel,
    toggleNotesPanel: toggleNotesPanel,
  };
})();
