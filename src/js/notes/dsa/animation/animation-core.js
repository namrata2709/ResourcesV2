/**
 * =============================================================================
 * File: animation-core.js
 * Path: js/notes/dsa/animation/animation-core.js
 * Project: Learning Dashboard
 *
 * Description:
 * Shared engine for all 171 animated DSA topics. Handles input-box
 * validation (7 input types: array-number, target-number, tree-values,
 * graph-edges, string-text, string-pattern, grid-dims), step navigation,
 * play/pause autoplay, and the shared status bar. Each topic's renderer
 * (renderer-array.js, renderer-tree.js, etc.) must define buildVisual(input)
 * and renderStep(step, idx) as plain globals — no module system, the
 * topic's computeSteps(input) is inlined after this file at build time by
 * animate.py. Only one renderer is loaded per page, so the global
 * function names never collide.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-07-02
 *
 * Dependencies: none (renderer-*.js files depend on this, not vice versa)
 * =============================================================================
 */
// ── State ──────────────────────────────────────────
let steps      = [];
let current    = -1;
let playing    = false;
let playTimer  = null;
let animInput  = null;

const PLAY_INTERVAL_MS = 1800;

// ── Input box validators ────────────────────────────
const VALIDATORS = {
    "array-number": (raw) => {
        const parsed = raw.split(",")
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n));
        if (parsed.length < 2) throw new Error("Enter at least 2 numbers.");
        if (parsed.length > 20) throw new Error("Maximum 20 numbers allowed.");
        return parsed;
    },
    "target-number": (raw) => {
        const n = parseInt(raw.trim());
        if (isNaN(n)) throw new Error("Enter a valid target number.");
        return n;
    },
    "tree-values": (raw) => {
        const parsed = raw.split(",")
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n));
        if (parsed.length < 1) throw new Error("Enter at least 1 value.");
        if (parsed.length > 15) throw new Error("Maximum 15 values allowed.");
        return parsed;
    },
    "graph-edges": (raw) => {
        const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) throw new Error("Enter at least 1 edge.");
        if (lines.length > 20) throw new Error("Maximum 20 edges allowed.");
        const edges = [];
        const nodeSet = new Set();
        for (const line of lines) {
            const parts = line.split("-").map(s => s.trim());
            if (parts.length < 2) throw new Error(`Invalid edge: "${line}". Use from-to or from-to-weight.`);
            const from = parts[0], to = parts[1];
            const weight = parts.length > 2 ? parseFloat(parts[2]) : 1;
            edges.push({ from, to, weight: isNaN(weight) ? 1 : weight });
            nodeSet.add(from);
            nodeSet.add(to);
        }
        if (nodeSet.size > 10) throw new Error("Maximum 10 nodes allowed.");
        return { edges, nodes: Array.from(nodeSet) };
    },
    "string-text": (raw) => {
        const s = raw.trim();
        if (s.length === 0) throw new Error("Enter text.");
        if (s.length > 20) throw new Error("Maximum 20 characters allowed.");
        return s;
    },
    "string-pattern": (raw) => {
        const s = raw.trim();
        if (s.length === 0) throw new Error("Enter a pattern.");
        if (s.length > 20) throw new Error("Maximum 20 characters allowed.");
        return s;
    },
    "grid-dims": (raw) => {
        const parts = raw.split(",").map(s => parseInt(s.trim()));
        if (parts.length !== 2 || parts.some(isNaN)) {
            throw new Error("Enter dimensions as rows,cols (e.g. 4,4).");
        }
        const [rows, cols] = parts;
        if (rows < 1 || cols < 1 || rows > 8 || cols > 8) {
            throw new Error("Dimensions must be between 1 and 8.");
        }
        return { rows, cols };
    }
};

const BOX_ID_MAP = {
    "array-number":    "inputArray",
    "target-number":   "inputTarget",
    "tree-values":     "inputTreeValues",
    "graph-edges":     "inputGraphEdges",
    "string-text":     "inputStringText",
    "string-pattern":  "inputStringPattern",
    "grid-dims":        "inputGridDims"
};

const INPUT_KEY_MAP = {
    "array-number":   "array",
    "target-number":  "target",
    "tree-values":    "treeValues",
    "graph-edges":    "graph",
    "string-text":    "text",
    "string-pattern": "pattern",
    "grid-dims":      "gridDims"
};

// ── Collect + validate all present input boxes ─────
function collectInput() {
    const result = {};
    const errEl = document.getElementById("inputError");
    errEl.textContent = "";

    for (const [boxId, elId] of Object.entries(BOX_ID_MAP)) {
        const el = document.getElementById(elId);
        if (!el) continue; // this box not used by this topic

        try {
            const value = VALIDATORS[boxId](el.value);
            result[INPUT_KEY_MAP[boxId]] = value;
        } catch (e) {
            errEl.textContent = e.message;
            throw e;
        }
    }

    return result;
}

// ── Init / Run ───────────────────────────────────────
function initAnimation() {
    stopPlaying();

    let input;
    try {
        input = collectInput();
    } catch (e) {
        return; // error already shown
    }

    animInput = input;

    if (typeof computeSteps !== "function") {
        console.error("computeSteps() not defined — check topic JS injection");
        return;
    }

    steps = computeSteps(input);
    if (!Array.isArray(steps) || steps.length === 0) {
        document.getElementById("inputError").textContent =
            "Animation produced no steps. Check input values.";
        return;
    }

    current = 0;

    if (typeof buildVisual === "function") {
        buildVisual(input);
    }

    // Give DOM time to render before first step (positions etc.)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            renderCurrentStep();
        });
    });
}

// ── Step navigation ──────────────────────────────────
function goStep(dir) {
    const next = current + dir;
    if (next < 0 || next >= steps.length) return;
    current = next;
    renderCurrentStep();
}

function renderCurrentStep() {
    const step = steps[current];
    if (!step) return;

    // Keep the exposed globals live — steps/current/animInput are rebound
    // by reference (steps, current) or value (animInput) on every step
    // change, init, and autoplay tick, not just once at file load.
    window.steps = steps;
    window.current = current;
    window.animInput = animInput;

    if (typeof renderStep === "function") {
        renderStep(step, current);
    }

    updateStepLabel(step);
    updateDecisionBanner(step);
    updateControls();
}

function updateStepLabel(step) {
    const el = document.getElementById("stepLabel");
    if (el) el.innerHTML = step.label || "";
}

function updateDecisionBanner(step) {
    const banner = document.getElementById("decisionBanner");
    if (!banner) return;
    if (step.decision) {
        banner.textContent = step.decision;
        if (typeof gsap !== "undefined") {
            gsap.to(banner, { opacity: 1, duration: 0.3 });
        } else {
            banner.style.opacity = 1;
        }
    } else {
        if (typeof gsap !== "undefined") {
            gsap.to(banner, { opacity: 0, duration: 0.2 });
        } else {
            banner.style.opacity = 0;
        }
    }
}

function updateControls() {
    const prevBtn = document.getElementById("btnPrev");
    const nextBtn = document.getElementById("btnNext");
    const counter = document.getElementById("stepCounter");

    if (prevBtn) prevBtn.disabled = (current === 0);
    if (nextBtn) nextBtn.disabled = (current === steps.length - 1);
    if (counter) counter.textContent = `Step ${current + 1} / ${steps.length}`;
}

// ── Play / Pause ─────────────────────────────────────
function togglePlay() {
    playing = !playing;
    const btn = document.getElementById("btnPlayPause");
    if (btn) btn.textContent = playing ? "\u23F8 Pause" : "\u25B6 Play";
    if (playing) autoPlay();
    else clearTimeout(playTimer);
}

function stopPlaying() {
    playing = false;
    clearTimeout(playTimer);
    const btn = document.getElementById("btnPlayPause");
    if (btn) btn.textContent = "\u25B6 Play";
}

function autoPlay() {
    if (!playing) return;
    if (current >= steps.length - 1) {
        playing = false;
        const btn = document.getElementById("btnPlayPause");
        if (btn) btn.textContent = "\u25B6 Play";
        return;
    }
    goStep(1);
    playTimer = setTimeout(autoPlay, PLAY_INTERVAL_MS);
}

// ── Status bar helper (renderers call this) ─────────
function setStatusBar(items) {
    // items: [{label, value, cssClass}]
    const bar = document.getElementById("statusBar");
    if (!bar) return;
    bar.innerHTML = items.map(item =>
        `<div class="status-item">${item.label}=<span class="${item.cssClass || ''}">${item.value}</span></div>`
    ).join("");
}

// Expose globally for renderer files (no module system — plain script concat).
// window.steps/current/animInput are kept live by renderCurrentStep() on
// every call — see there, not here, for the actual sync.
window.goStep = goStep;
window.togglePlay = togglePlay;
window.initAnimation = initAnimation;
window.setStatusBar = setStatusBar;
