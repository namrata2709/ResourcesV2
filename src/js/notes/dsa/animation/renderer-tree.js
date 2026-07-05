/**
 * =============================================================================
 * File: renderer-tree.js
 * Path: js/notes/dsa/renderer-tree.js
 * Project: Learning Dashboard
 *
 * Description:
 * SVG tree visualization renderer — covers 47 topics (Binary Tree, BST,
 * AVL, Heap, Tries, Segment Tree, DSU as forest, Game Trees, Treap, Splay
 * Tree, B-Tree). Two build paths, chosen automatically by shape of input:
 *   1. input.treeStructure = {nodes: {id: {val,left,right}}, root: id} —
 *      pre-built by the topic's computeSteps() for anything that isn't a
 *      plain BST (Heap, Trie, Segment Tree, etc.). Used as-is, no insertion.
 *   2. input.treeValues = [...] (no treeStructure) — legacy path, builds a
 *      standard BST via insertBST(). Only correct for genuinely
 *      BST-ordered topics.
 * Layout (subtree-width x, depth-based y) runs identically either way.
 * NOTE: as of 2026-07-03, only path 2 was previously implemented — every
 * topic silently got BST-insert regardless of shape. Non-BST topics
 * (Heap/Trie/Segment Tree/DSU/Treap/Splay/B-Tree) must be updated to emit
 * treeStructure in their computeSteps() output, or they'll still fall
 * through to path 2 and render an incorrect BST. Not yet verified against
 * animate.py or any of those topics' actual computeSteps() — check next
 * time one is uploaded.
 * Defines buildVisual(input)/renderStep(step,idx) as globals, consumed by
 * animation-core.js.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-07-03
 *
 * Dependencies:
 * - js/notes/dsa/animation-core.js (must load first)
 * =============================================================================
 */

let _treeNodes = {};  // id -> {val, left, right, x, y}
let _treeRoot   = null;
const NODE_R   = 22;
const LEVEL_H  = 70;

function buildVisual(input) {
    const canvas = document.getElementById("animCanvas");
    canvas.innerHTML = "";

    _treeNodes = {};
    _treeRoot = null;

    if (input.treeStructure && input.treeStructure.nodes && input.treeStructure.root) {
        // Non-BST topics (Heap, Trie, Segment Tree, DSU, Treap, Splay, B-Tree, ...)
        // supply their own node shape — used as-is, no BST insertion logic applied.
        _treeNodes = input.treeStructure.nodes;
        _treeRoot = input.treeStructure.root;
    } else {
        // Legacy path — only correct for genuinely BST-ordered topics.
        const values = input.treeValues || [];
        values.forEach(val => insertBST(val));
    }

    computeLayout();

    const svgWidth  = Math.max(900, Object.keys(_treeNodes).length * 60);
    const maxDepth  = Math.max(1, ...Object.values(_treeNodes).map(n => n.depth || 0));
    const svgHeight = (maxDepth + 1) * LEVEL_H + 60;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svg.id = "treeSvg";
    canvas.style.minHeight = svgHeight + "px";

    // Draw edges first (so nodes sit on top)
    const edgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    edgeGroup.id = "edgeGroup";
    svg.appendChild(edgeGroup);

    Object.values(_treeNodes).forEach(node => {
        if (node.left !== null && node.left !== undefined) {
            drawEdge(edgeGroup, node.id, node.left);
        }
        if (node.right !== null && node.right !== undefined) {
            drawEdge(edgeGroup, node.id, node.right);
        }
    });

    // Draw nodes
    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeGroup.id = "nodeGroup";
    svg.appendChild(nodeGroup);

    Object.values(_treeNodes).forEach(node => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", NODE_R);
        circle.setAttribute("class", "node-circle");
        circle.id = `node-${node.id}`;
        nodeGroup.appendChild(circle);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", node.x);
        text.setAttribute("y", node.y);
        text.setAttribute("class", "node-text");
        text.textContent = node.val;
        text.id = `node-text-${node.id}`;
        nodeGroup.appendChild(text);
    });

    canvas.appendChild(svg);
}

function insertBST(val) {
    const id = `n${Object.keys(_treeNodes).length}`;
    _treeNodes[id] = { id, val, left: null, right: null, depth: 0 };

    if (_treeRoot === null) {
        _treeRoot = id;
        return;
    }

    let curId = _treeRoot;
    let depth = 0;
    while (true) {
        const cur = _treeNodes[curId];
        depth++;
        if (val < cur.val) {
            if (cur.left === null) { cur.left = id; break; }
            curId = cur.left;
        } else {
            if (cur.right === null) { cur.right = id; break; }
            curId = cur.right;
        }
    }
    _treeNodes[id].depth = depth;
}

function computeLayout() {
    // Compute subtree width (leaf count) for each node, then assign x by
    // in-order position, y by depth. Classic recursive layout.
    let counter = { x: 0 };

    function assignX(id) {
        if (id === null || id === undefined) return;
        const node = _treeNodes[id];
        assignX(node.left);
        node.x = counter.x * 70 + 50;
        counter.x++;
        assignX(node.right);
    }

    function assignY(id, depth) {
        if (id === null || id === undefined) return;
        const node = _treeNodes[id];
        node.depth = depth;
        node.y = depth * LEVEL_H + 40;
        assignY(node.left, depth + 1);
        assignY(node.right, depth + 1);
    }

    assignX(_treeRoot);
    assignY(_treeRoot, 0);
}

function drawEdge(group, fromId, toId) {
    const from = _treeNodes[fromId];
    const to   = _treeNodes[toId];
    if (!from || !to) return;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    line.setAttribute("class", "edge-line");
    line.id = `edge-${fromId}-${toId}`;
    group.appendChild(line);
}

function renderStep(step, idx) {
    // Reset all nodes and edges
    Object.keys(_treeNodes).forEach(id => {
        const circle = document.getElementById(`node-${id}`);
        if (circle) circle.setAttribute("class", "node-circle");
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

    // Found
    if (step.foundNode) {
        const circle = document.getElementById(`node-${step.foundNode}`);
        if (circle) {
            circle.classList.remove("active", "visited");
            circle.classList.add("found");
        }
    }

    // Path edges
    if (step.path && step.path.length > 1) {
        for (let i = 0; i < step.path.length - 1; i++) {
            const edge = document.getElementById(`edge-${step.path[i]}-${step.path[i+1]}`)
                      || document.getElementById(`edge-${step.path[i+1]}-${step.path[i]}`);
            if (edge) edge.classList.add("active");
        }
    }

    // Status bar
    const statusItems = [];
    if (step.activeNode) {
        statusItems.push({ label: "node", value: _treeNodes[step.activeNode]?.val ?? "?", cssClass: "val-mid" });
    }
    if (step.foundNode) {
        statusItems.push({ label: "found", value: _treeNodes[step.foundNode]?.val ?? "?", cssClass: "val-found" });
    }
    setStatusBar(statusItems);
}
