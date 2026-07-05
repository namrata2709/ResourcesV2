/**
 * =============================================================================
 * File: renderer-graph.js
 * Path: js/notes/dsa/animation/renderer-graph.js
 * Project: Learning Dashboard
 *
 * Description:
 * SVG graph visualization renderer — covers 35 topics (BFS, DFS,
 * Dijkstra, MST, SCC, Flow, Bipartite Matching). Uses a fixed circular
 * layout (nodes evenly spaced on a circle, no simulation) — good for
 * ≤10-node inputs. Defines buildVisual(input)/renderStep(step,idx) as
 * globals, consumed by animation-core.js.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - js/notes/dsa/animation-core.js (must load first)
 * =============================================================================
 */

let _graphNodes = {};  // id -> {x, y}
let _graphEdges = [];  // [{from, to, weight}]

function buildVisual(input) {
    const canvas = document.getElementById("animCanvas");
    canvas.innerHTML = "";

    const graphData = input.graph || { nodes: [], edges: [] };
    _graphEdges = graphData.edges || [];

    const nodeIds = graphData.nodes || [];
    _graphNodes = {};

    const svgSize = 480;
    const cx = svgSize / 2, cy = svgSize / 2;
    const radius = svgSize / 2 - 60;

    nodeIds.forEach((id, i) => {
        const angle = (2 * Math.PI * i) / nodeIds.length - Math.PI / 2;
        _graphNodes[id] = {
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle)
        };
    });

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${svgSize} ${svgSize}`);
    svg.id = "graphSvg";
    canvas.style.minHeight = svgSize + "px";
    canvas.style.display = "flex";
    canvas.style.justifyContent = "center";

    const edgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    edgeGroup.id = "edgeGroup";
    svg.appendChild(edgeGroup);

    _graphEdges.forEach((edge, i) => {
        const from = _graphNodes[edge.from];
        const to   = _graphNodes[edge.to];
        if (!from || !to) return;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", from.x);
        line.setAttribute("y1", from.y);
        line.setAttribute("x2", to.x);
        line.setAttribute("y2", to.y);
        line.setAttribute("class", "edge-line");
        line.id = `edge-${edge.from}-${edge.to}`;
        edgeGroup.appendChild(line);

        // Weight label at midpoint
        if (edge.weight !== undefined && edge.weight !== 1) {
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", midX);
            text.setAttribute("y", midY - 6);
            text.setAttribute("class", "edge-weight");
            text.textContent = edge.weight;
            edgeGroup.appendChild(text);
        }
    });

    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeGroup.id = "nodeGroup";
    svg.appendChild(nodeGroup);

    nodeIds.forEach(id => {
        const pos = _graphNodes[id];
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", pos.x);
        circle.setAttribute("cy", pos.y);
        circle.setAttribute("r", 22);
        circle.setAttribute("class", "node-circle");
        circle.id = `node-${id}`;
        nodeGroup.appendChild(circle);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", pos.x);
        text.setAttribute("y", pos.y);
        text.setAttribute("class", "node-text");
        text.textContent = id;
        nodeGroup.appendChild(text);

        // Distance label (Dijkstra etc) — below node, filled per step
        const distText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        distText.setAttribute("x", pos.x);
        distText.setAttribute("y", pos.y + 38);
        distText.setAttribute("class", "edge-weight");
        distText.id = `dist-${id}`;
        distText.textContent = "";
        nodeGroup.appendChild(distText);
    });

    canvas.appendChild(svg);
}

function renderStep(step, idx) {
    // Reset
    Object.keys(_graphNodes).forEach(id => {
        const circle = document.getElementById(`node-${id}`);
        if (circle) circle.setAttribute("class", "node-circle");
        const dist = document.getElementById(`dist-${id}`);
        if (dist) dist.textContent = "";
    });
    document.querySelectorAll(".edge-line").forEach(edge => {
        edge.setAttribute("class", "edge-line");
    });

    // Visited
    (step.visitedNodes || []).forEach(id => {
        const circle = document.getElementById(`node-${id}`);
        if (circle) circle.classList.add("visited");
    });

    // Active
    if (step.activeNode) {
        const circle = document.getElementById(`node-${step.activeNode}`);
        if (circle) {
            circle.classList.remove("visited");
            circle.classList.add("active");
        }
    }

    // Active edge
    if (step.activeEdge) {
        const edge = document.getElementById(`edge-${step.activeEdge.from}-${step.activeEdge.to}`)
                  || document.getElementById(`edge-${step.activeEdge.to}-${step.activeEdge.from}`);
        if (edge) edge.classList.add("active");
    }

    // Selected edges (MST, matching)
    (step.selectedEdges || []).forEach(e => {
        const edge = document.getElementById(`edge-${e.from}-${e.to}`)
                  || document.getElementById(`edge-${e.to}-${e.from}`);
        if (edge) edge.classList.add("selected");
    });

    // Distances
    if (step.distances) {
        Object.entries(step.distances).forEach(([id, val]) => {
            const dist = document.getElementById(`dist-${id}`);
            if (dist) dist.textContent = (val === Infinity) ? "∞" : val;
        });
    }

    // Status bar
    const statusItems = [];
    if (step.activeNode) statusItems.push({ label: "node", value: step.activeNode, cssClass: "val-mid" });
    if (step.visitedNodes) statusItems.push({ label: "visited", value: step.visitedNodes.length, cssClass: "val-low" });
    setStatusBar(statusItems);
}
