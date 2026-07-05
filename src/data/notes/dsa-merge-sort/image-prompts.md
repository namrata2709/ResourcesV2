## IMAGE 1 of 6 — inline-01-recursion-tree
Filename: inline-01-recursion-tree.png

Create a DSA visualization diagram.

CONCEPT: The complete recursion tree for Merge Sort on [38, 27, 43, 3] — split phase going down, merge phase coming back up, with sorted subarrays labelled at each node.
SHOW:
- Root node at top: [38, 27, 43, 3] — unsorted, default cell colour
- Level 1: [38, 27] (left child) and [43, 3] (right child), downward split arrows in white
- Level 2: single elements [38], [27], [43], [3] — labelled "sorted" in subtle green
- Merge phase upward arrows in amber/gold
- Level 1 merged nodes: [27, 38] and [3, 43] highlighted purple (active merge)
- Root merged result: [3, 27, 38, 43] — found/result green glow
- Left margin labels: "Divide ↓" and "Merge ↑"
- Caption: "log₂(4) = 2 levels | 3 merge operations | O(n log n) total"

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text
- Found/result: #065f46 background, #4ade80 border and glow
- Decision text: amber #fbbf24
- Step label: white #e2e8f0

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted elements.
OUTPUT: 1200x600px PNG

---

## IMAGE 2 of 6 — step-01-initial
Filename: step-01-initial.png

Create a DSA visualization diagram.

CONCEPT: Merge Sort's divide phase — the input array [38, 27, 43, 3, 9, 82, 10] is recursively split in half until every subarray holds one element.
SHOW:
- Original unsorted array [38, 27, 43, 3, 9, 82, 10] at the top as labelled cells
- Tree structure showing splits: level 1 → [38,27,43,3] and [9,82,10]; level 2 → further halves; level 3 → individual elements [38][27][43][3][9][82][10]
- Arrows from each parent to its two children
- Level labels on left: "Level 0 (original)", "Level 1", "Level 2", "Level 3 (base cases)"
- Base-case single-element arrays in found/result green glow
- Note at bottom: "Splitting costs O(1) per call — all real work happens during merge"

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text
- Found/result: #065f46 background, #4ade80 border and glow
- Decision text: amber #fbbf24
- Step label: white #e2e8f0

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted elements.
OUTPUT: 1200x600px PNG

---

## IMAGE 3 of 6 — step-02-leaf-merges
Filename: step-02-leaf-merges.png

Create a DSA visualization diagram.

CONCEPT: The first round of merges — three adjacent pairs of single elements are combined into sorted pairs simultaneously.
SHOW:
- Leaf arrays: [38][27][43][3][9][82][10] across the top
- Three merge operations side by side: [38]+[27]→[27,38]; [43]+[3]→[3,43]; [9]+[82]→[9,82]
- [10] alone with dotted border labelled "waits for next level"
- Active (purple) cell being compared in each merge, resulting sorted pair in green
- i-pointer (blue) and j-pointer (red) on each merge pair
- Annotation: "O(n/2) comparisons across this level"

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text
- Found/result: #065f46 background, #4ade80 border and glow
- Decision text: amber #fbbf24
- Step label: white #e2e8f0

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted elements.
OUTPUT: 1200x600px PNG

---

## IMAGE 4 of 6 — step-03-mid-merges
Filename: step-03-mid-merges.png

Create a DSA visualization diagram.

CONCEPT: Second-level merges combine sorted pairs into groups of four — the two-pointer merge process traced step by step.
SHOW:
- Inputs: [27, 38] and [3, 43] side by side
- Four-step merge trace in a horizontal sequence:
  - Step 1: i→27, j→3 → "27 > 3 → pick 3" (amber label), output [3]
  - Step 2: i→27, j→43 → "27 < 43 → pick 27", output [3, 27]
  - Step 3: i→38, j→43 → "38 < 43 → pick 38", output [3, 27, 38]
  - Step 4: i exhausted → copy 43, output [3, 27, 38, 43]
- Output array [3, 27, 38, 43] at the bottom in green glow
- i (blue) and j (red) pointer labels advancing across subarrays

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text
- Found/result: #065f46 background, #4ade80 border and glow
- Decision text: amber #fbbf24
- Step label: white #e2e8f0

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted elements.
OUTPUT: 1200x600px PNG

---

## IMAGE 5 of 6 — step-04-final-merge
Filename: step-04-final-merge.png

Create a DSA visualization diagram.

CONCEPT: The final merge unites both sorted halves into the fully sorted array, completing the algorithm on [38, 27, 43, 3, 9, 82, 10].
SHOW:
- Left half [3, 27, 38, 43] and right half [9, 10, 82] displayed side by side
- Merge trace: 3 vs 9 → pick 3; 27 vs 9 → pick 9; 27 vs 10 → pick 10; 27 vs 82 → pick 27; 38 vs 82 → pick 38; 43 vs 82 → pick 43; copy 82
- Final sorted array [3, 9, 10, 27, 38, 43, 82] at bottom, all cells green glow
- Small recursion-tree inset (top-right) with final-merge level highlighted purple
- Status bar: "Sort complete — O(n log n)"

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text
- Found/result: #065f46 background, #4ade80 border and glow
- Decision text: amber #fbbf24
- Step label: white #e2e8f0

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted elements.
OUTPUT: 1200x600px PNG

---

## IMAGE 6 of 6 — step-05-complexity
Filename: step-05-complexity.png

Create a DSA visualization diagram.

CONCEPT: Summary reference card — Merge Sort's complexity across all cases and when to choose it over Quick Sort.
SHOW:
- Complexity table: Best/Average/Worst rows × Time/Space/Why columns — all time cells green with label "Always O(n log n) — no bad inputs"
- "Use Merge Sort when:" section (green checkmarks): stable sort needed; sorting a linked list; worst-case guarantee required; external sorting
- "Prefer Quick Sort when:" section (amber warnings): O(1) space required; maximum cache performance needed
- Comparison mini-table: Merge Sort vs Quick Sort across Worst Case / Stable / Extra Space / Linked List

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text
- Found/result: #065f46 background, #4ade80 border and glow
- Decision text: amber #fbbf24
- Step label: white #e2e8f0

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted elements.
OUTPUT: 1200x600px PNG

---

## IMAGE — visual-trace-01-first-level-merge.png
Filename: visual-trace-01-first-level-merge.png

Create a DSA visualization diagram.

CONCEPT: Bottom-up merge at level 1 on [5, 3, 8, 1, 9, 2] — three adjacent pairs merged into sorted pairs to reveal the first-level result.
SHOW:
- Input array [5, 3, 8, 1, 9, 2] at the top with index labels 0–5
- Three merge operations: [5,3]→[3,5]; [8,1]→[1,8]; [9,2]→[2,9]
- Each merge shown with i-pointer (blue) and j-pointer (red)
- Amber decision labels: "5 > 3 → pick 3", "8 > 1 → pick 1", "9 > 2 → pick 2"
- Result row at bottom: [3, 5, 1, 8, 2, 9] in purple/active cells — three sorted pairs visible
- Caption: "After level-1 merges: three sorted pairs, array not yet globally sorted"

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text
- Found/result: #065f46 background, #4ade80 border and glow
- Decision text: amber #fbbf24
- Step label: white #e2e8f0

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted elements.
OUTPUT: 1200x600px PNG

---

## IMAGE — visual-trace-02-full-sort-4-elements.png
Filename: visual-trace-02-full-sort-4-elements.png

Create a DSA visualization diagram.

CONCEPT: Complete Merge Sort execution on [38, 27, 43, 3] showing every merge step and the 5 total comparisons made.
SHOW:
- Top: input [38, 27, 43, 3] in default cells
- Level 1 (left): [38]+[27] → 1 comparison (27 wins) → [27, 38] in green
- Level 1 (right): [43]+[3] → 1 comparison (3 wins) → [3, 43] in green
- Level 2 merge trace of [27,38] and [3,43] in 3 steps: "3 vs 27 → pick 3"; "27 vs 43 → pick 27"; "38 vs 43 → pick 38"; copy 43
- Comparison counter badge top-right: "Comparisons: 5 (1 + 1 + 3)"
- Final result [3, 27, 38, 43] at bottom, all green glow

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text
- Found/result: #065f46 background, #4ade80 border and glow
- Decision text: amber #fbbf24
- Step label: white #e2e8f0

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted elements.
OUTPUT: 1200x600px PNG
