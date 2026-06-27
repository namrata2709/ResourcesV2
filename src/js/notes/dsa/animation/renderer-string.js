/**
 * renderer-string.js — Renders two-row string matching visualizations.
 * Covers 6 topics: KMP, Rabin-Karp, Z-algorithm, Rolling Hash, Suffix Array.
 *
 * Step schema:
 * {
 *   textPointer: i,          // index in text being compared
 *   patternPointer: j,       // index in pattern being compared
 *   matched: [i, ...],       // text indices confirmed matching (green)
 *   mismatch: i | null,       // text index where mismatch occurred (red)
 *   patternShift: n,          // optional — how far pattern has shifted (display only)
 *   label: "",
 *   decision: ""
 * }
 *
 * Exposes: buildVisual(input), renderStep(step, idx)
 */

let _text = "";
let _pattern = "";

function buildVisual(input) {
    const canvas = document.getElementById("animCanvas");
    canvas.innerHTML = "";

    _text    = input.text || "";
    _pattern = input.pattern || "";

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "20px";
    wrap.style.alignItems = "center";

    // Text row
    const textLabel = document.createElement("div");
    textLabel.textContent = "TEXT";
    textLabel.style.fontSize = "0.75rem";
    textLabel.style.color = "#64748b";
    textLabel.style.alignSelf = "flex-start";
    wrap.appendChild(textLabel);

    const textRow = buildCharRow(_text, "text");
    wrap.appendChild(textRow);

    // Pattern row
    const patternLabel = document.createElement("div");
    patternLabel.textContent = "PATTERN";
    patternLabel.style.fontSize = "0.75rem";
    patternLabel.style.color = "#64748b";
    patternLabel.style.alignSelf = "flex-start";
    patternLabel.style.marginTop = "10px";
    wrap.appendChild(patternLabel);

    const patternRow = buildCharRow(_pattern, "pattern");
    patternRow.id = "patternRow";
    wrap.appendChild(patternRow);

    canvas.appendChild(wrap);
}

function buildCharRow(str, prefix) {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "4px";

    const row = document.createElement("div");
    row.id = `${prefix}Row`;
    row.style.display = "flex";
    row.style.gap = "4px";

    const idxRow = document.createElement("div");
    idxRow.style.display = "flex";
    idxRow.style.gap = "4px";

    [...str].forEach((ch, i) => {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.id = `${prefix}-${i}`;
        cell.style.width = "44px";
        cell.style.height = "44px";
        cell.style.fontSize = "1.1rem";
        cell.textContent = ch;
        row.appendChild(cell);

        const lbl = document.createElement("div");
        lbl.className = "index-label";
        lbl.style.width = "44px";
        lbl.textContent = i;
        idxRow.appendChild(lbl);
    });

    container.appendChild(row);
    container.appendChild(idxRow);
    return container;
}

function renderStep(step, idx) {
    // Reset text cells
    [..._text].forEach((_, i) => {
        const cell = document.getElementById(`text-${i}`);
        if (cell) cell.className = "cell";
        cell.style.width = "44px";
        cell.style.height = "44px";
        cell.style.fontSize = "1.1rem";
    });

    // Reset pattern cells
    [..._pattern].forEach((_, i) => {
        const cell = document.getElementById(`pattern-${i}`);
        if (cell) {
            cell.className = "cell";
            cell.style.width = "44px";
            cell.style.height = "44px";
            cell.style.fontSize = "1.1rem";
        }
    });

    // Apply matched
    (step.matched || []).forEach(i => {
        const cell = document.getElementById(`text-${i}`);
        if (cell) cell.classList.add("found");
    });

    // Apply pattern shift offset (visual only — reposition pattern row)
    if (step.patternShift !== undefined && step.patternShift !== null) {
        const patternRow = document.getElementById("patternRow");
        if (patternRow) {
            patternRow.style.marginLeft = `${step.patternShift * 48}px`;
        }
    }

    // Active comparison pointers
    if (step.textPointer !== undefined && step.textPointer !== null) {
        const cell = document.getElementById(`text-${step.textPointer}`);
        if (cell) cell.classList.add("active");
    }
    if (step.patternPointer !== undefined && step.patternPointer !== null) {
        const cell = document.getElementById(`pattern-${step.patternPointer}`);
        if (cell) cell.classList.add("active");
    }

    // Mismatch
    if (step.mismatch !== undefined && step.mismatch !== null) {
        const cell = document.getElementById(`text-${step.mismatch}`);
        if (cell) {
            cell.classList.remove("active");
            cell.classList.add("swapped"); // reuse orange "swapped" style for mismatch
        }
    }

    // Status bar
    const statusItems = [];
    if (step.textPointer !== undefined && step.textPointer !== null) {
        statusItems.push({ label: "i", value: step.textPointer, cssClass: "val-low" });
    }
    if (step.patternPointer !== undefined && step.patternPointer !== null) {
        statusItems.push({ label: "j", value: step.patternPointer, cssClass: "val-mid" });
    }
    if (step.matched && step.matched.length > 0) {
        statusItems.push({ label: "matched", value: step.matched.length, cssClass: "val-found" });
    }
    setStatusBar(statusItems);
}
