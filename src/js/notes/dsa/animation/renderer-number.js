/**
 * renderer-number.js — Renders equation/value stepping visualizations.
 * Covers 16 topics: Sieve concepts, GCD, Modular Arithmetic, CRT,
 * Miller-Rabin, Simulated Annealing, Rate Limiter, Lock-Free CAS.
 * Simplest renderer — no spatial layout, just text + values that change.
 *
 * Step schema:
 * {
 *   equation: "gcd(48, 18)",        // current expression, plain text
 *   values: { a: 48, b: 18 },       // named values shown as cards
 *   highlight: "a",                  // optional — which value key to highlight
 *   label: "",
 *   decision: ""
 * }
 *
 * Exposes: buildVisual(input), renderStep(step, idx)
 */

function buildVisual(input) {
    const canvas = document.getElementById("animCanvas");
    canvas.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "24px";

    const equationBox = document.createElement("div");
    equationBox.id = "equationBox";
    equationBox.style.fontFamily = "'Courier New', monospace";
    equationBox.style.fontSize = "1.6rem";
    equationBox.style.fontWeight = "700";
    equationBox.style.color = "#e2e8f0";
    equationBox.style.padding = "16px 24px";
    equationBox.style.background = "#1e2130";
    equationBox.style.border = "1.5px solid #2a2d3a";
    equationBox.style.borderRadius = "8px";
    equationBox.style.minWidth = "240px";
    equationBox.style.textAlign = "center";
    wrap.appendChild(equationBox);

    const valuesRow = document.createElement("div");
    valuesRow.id = "valuesRow";
    valuesRow.style.display = "flex";
    valuesRow.style.gap = "12px";
    valuesRow.style.flexWrap = "wrap";
    valuesRow.style.justifyContent = "center";
    wrap.appendChild(valuesRow);

    canvas.appendChild(wrap);
}

function renderStep(step, idx) {
    const eqBox = document.getElementById("equationBox");
    if (eqBox) eqBox.textContent = step.equation || "";

    const valuesRow = document.getElementById("valuesRow");
    if (valuesRow) {
        valuesRow.innerHTML = "";
        const values = step.values || {};
        Object.entries(values).forEach(([key, val]) => {
            const card = document.createElement("div");
            card.className = "cell";
            card.style.width = "auto";
            card.style.minWidth = "64px";
            card.style.height = "56px";
            card.style.padding = "0 14px";
            card.style.fontSize = "1rem";
            card.style.flexDirection = "column";
            card.style.display = "flex";
            card.style.alignItems = "center";
            card.style.justifyContent = "center";

            if (step.highlight === key) {
                card.classList.add("active");
            }

            const lbl = document.createElement("div");
            lbl.style.fontSize = "0.65rem";
            lbl.style.color = "#94a3b8";
            lbl.style.fontWeight = "400";
            lbl.textContent = key;

            const valEl = document.createElement("div");
            valEl.textContent = val;

            card.appendChild(lbl);
            card.appendChild(valEl);
            valuesRow.appendChild(card);
        });
    }

    // Status bar — show all values as well
    const statusItems = Object.entries(step.values || {}).map(([key, val]) => ({
        label: key, value: val, cssClass: (step.highlight === key) ? "val-mid" : ""
    }));
    setStatusBar(statusItems);
}
