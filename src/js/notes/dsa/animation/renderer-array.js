/**
 * renderer-array.js — Renders array-shaped visualizations.
 * Covers 56 topics: search, sort, sliding window, two pointers,
 * stack/queue/deque, linked list (linked mode), sieve, streaming.
 *
 * Step schema this renderer consumes:
 * {
 *   array: [...],                  // optional — only needed if array changes (sort)
 *   active: [i, ...],              // indices to highlight purple
 *   eliminated: [i, ...],          // indices to fade dark
 *   swapped: [i, j],               // optional — pair to highlight orange
 *   compared: [i, ...],            // optional — amber outline
 *   found: i | null,                // index to highlight green
 *   pointers: { low, high, mid, i, j },  // any subset, null = hidden
 *   label: "",
 *   decision: ""
 * }
 *
 * Exposes: buildVisual(input), renderStep(step, idx)
 */

let _arrValues = [];

function buildVisual(input) {
    const canvas = document.getElementById("animCanvas");
    canvas.innerHTML = "";

    _arrValues = input.array || [];

    // Pointer row (absolute positioned, filled in by renderStep)
    const pointerRow = document.createElement("div");
    pointerRow.id = "pointerRow";
    pointerRow.style.position = "relative";
    pointerRow.style.height = "40px";
    canvas.appendChild(pointerRow);

    ["low", "mid", "high", "i", "j"].forEach(name => {
        const ptr = document.createElement("div");
        ptr.id = `ptr-${name}`;
        ptr.className = `pointer pointer-${name}`;
        ptr.style.opacity = "0";
        ptr.innerHTML = `
            <div class="pointer-label">${name}=?</div>
            <div class="pointer-arrow"></div>
        `;
        pointerRow.appendChild(ptr);
    });

    // Array row
    const arrRow = document.createElement("div");
    arrRow.id = "arrayRow";
    arrRow.style.display = "flex";
    arrRow.style.justifyContent = "center";
    arrRow.style.gap = "6px";
    canvas.appendChild(arrRow);

    // Index row
    const idxRow = document.createElement("div");
    idxRow.id = "indexRow";
    idxRow.style.display = "flex";
    idxRow.style.justifyContent = "center";
    idxRow.style.gap = "6px";
    idxRow.style.marginTop = "6px";
    canvas.appendChild(idxRow);

    _arrValues.forEach((val, i) => {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.id = `cell-${i}`;
        cell.textContent = val;
        arrRow.appendChild(cell);

        const lbl = document.createElement("div");
        lbl.className = "index-label";
        lbl.style.width = "64px";
        lbl.textContent = i;
        idxRow.appendChild(lbl);
    });
}

function renderStep(step, idx) {
    // If array values changed (e.g. after a swap in sort), update them
    if (step.array) {
        _arrValues = step.array;
        step.array.forEach((val, i) => {
            const cell = document.getElementById(`cell-${i}`);
            if (cell) cell.textContent = val;
        });
    }

    // Reset all cell classes
    _arrValues.forEach((_, i) => {
        const cell = document.getElementById(`cell-${i}`);
        if (cell) cell.className = "cell";
    });

    // Apply eliminated
    (step.eliminated || []).forEach(i => {
        const cell = document.getElementById(`cell-${i}`);
        if (cell) cell.classList.add("eliminated");
    });

    // Apply active
    (step.active || []).forEach(i => {
        const cell = document.getElementById(`cell-${i}`);
        if (cell) {
            cell.classList.remove("eliminated");
            cell.classList.add("active");
        }
    });

    // Apply compared (amber outline, doesn't override active/eliminated bg)
    (step.compared || []).forEach(i => {
        const cell = document.getElementById(`cell-${i}`);
        if (cell) cell.classList.add("compared");
    });

    // Apply swapped pair
    if (step.swapped && step.swapped.length === 2) {
        step.swapped.forEach(i => {
            const cell = document.getElementById(`cell-${i}`);
            if (cell) cell.classList.add("swapped");
        });
    }

    // Apply found
    if (step.found !== null && step.found !== undefined) {
        const cell = document.getElementById(`cell-${step.found}`);
        if (cell) {
            cell.classList.remove("eliminated", "active");
            cell.classList.add("found");
        }
    }

    // Position pointers
    const pointers = step.pointers || {};
    ["low", "mid", "high", "i", "j"].forEach(name => {
        const ptr = document.getElementById(`ptr-${name}`);
        if (!ptr) return;
        const cellIdx = pointers[name];
        if (cellIdx === null || cellIdx === undefined) {
            ptr.style.opacity = "0";
            return;
        }
        ptr.style.opacity = "1";
        ptr.querySelector(".pointer-label").textContent = `${name}=${cellIdx}`;
        positionPointer(ptr, cellIdx);
    });

    // Status bar
    const statusItems = [];
    if (pointers.low  !== undefined && pointers.low  !== null) statusItems.push({ label: "low",  value: pointers.low,  cssClass: "val-low" });
    if (pointers.high !== undefined && pointers.high !== null) statusItems.push({ label: "high", value: pointers.high, cssClass: "val-high" });
    if (pointers.mid  !== undefined && pointers.mid  !== null) statusItems.push({ label: "mid",  value: pointers.mid,  cssClass: "val-mid" });
    if (step.found !== null && step.found !== undefined) {
        statusItems.push({ label: "result", value: `found @ ${step.found}`, cssClass: "val-found" });
    }
    setStatusBar(statusItems);
}

function positionPointer(ptrEl, cellIdx) {
    const cell = document.getElementById(`cell-${cellIdx}`);
    const canvas = document.getElementById("animCanvas");
    if (!cell || !canvas) return;

    const cellRect   = cell.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const centerX = (cellRect.left + cellRect.width / 2) - canvasRect.left;

    ptrEl.style.position = "absolute";
    ptrEl.style.left = centerX + "px";
    ptrEl.style.top = "0";
}
