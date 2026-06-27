/**
 * renderer-grid.js — Renders 2D grid visualizations.
 * Covers 11 topics: Knapsack, LCS, Matrix DP, Bitmask DP, Digit DP,
 * Matrix Exponentiation, Gaussian Elimination, Sparse Table, Hungarian.
 *
 * Step schema:
 * {
 *   grid: [[...], [...]],          // full grid values, updated each step
 *   activeCell: [r, c],             // current cell being computed
 *   dependsOn: [[r,c], [r,c], ...], // cells this depends on (amber outline)
 *   rowLabels: [...],                // optional — left side labels
 *   colLabels: [...],                // optional — top labels
 *   label: "",
 *   decision: ""
 * }
 *
 * Exposes: buildVisual(input), renderStep(step, idx)
 */

let _rows = 0;
let _cols = 0;

function buildVisual(input) {
    const canvas = document.getElementById("animCanvas");
    canvas.innerHTML = "";

    const dims = input.gridDims || { rows: 1, cols: (input.array || []).length || 5 };
    _rows = dims.rows;
    _cols = dims.cols;

    const table = document.createElement("table");
    table.id = "gridTable";
    table.style.borderCollapse = "collapse";
    table.style.margin = "0 auto";

    for (let r = 0; r < _rows; r++) {
        const tr = document.createElement("tr");
        for (let c = 0; c < _cols; c++) {
            const td = document.createElement("td");
            td.id = `grid-${r}-${c}`;
            td.className = "cell";
            td.style.width = "52px";
            td.style.height = "52px";
            td.style.fontSize = "1rem";
            td.style.borderRadius = "0";
            td.style.margin = "0";
            td.textContent = "";
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    canvas.appendChild(table);
}

function renderStep(step, idx) {
    const grid = step.grid || [];

    // Reset all cells
    for (let r = 0; r < _rows; r++) {
        for (let c = 0; c < _cols; c++) {
            const cell = document.getElementById(`grid-${r}-${c}`);
            if (!cell) continue;
            cell.className = "cell";
            cell.style.borderRadius = "0";
            const val = grid[r] && grid[r][c];
            cell.textContent = (val !== undefined && val !== null) ? val : "";
        }
    }

    // dependsOn — amber outline
    (step.dependsOn || []).forEach(([r, c]) => {
        const cell = document.getElementById(`grid-${r}-${c}`);
        if (cell) cell.classList.add("compared");
    });

    // active cell
    if (step.activeCell) {
        const [r, c] = step.activeCell;
        const cell = document.getElementById(`grid-${r}-${c}`);
        if (cell) {
            cell.classList.remove("compared");
            cell.classList.add("active");
        }
    }

    // Status bar
    const statusItems = [];
    if (step.activeCell) {
        statusItems.push({ label: "cell", value: `[${step.activeCell[0]},${step.activeCell[1]}]`, cssClass: "val-mid" });
    }
    if (step.activeCell && step.grid) {
        const [r, c] = step.activeCell;
        const val = step.grid[r] && step.grid[r][c];
        if (val !== undefined) statusItems.push({ label: "value", value: val, cssClass: "val-found" });
    }
    setStatusBar(statusItems);
}
