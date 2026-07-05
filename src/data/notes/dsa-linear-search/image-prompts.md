## IMAGE — overview.png
Filename: overview.png

Create a DSA visualization diagram.

CONCEPT: Linear search scans an unsorted array from left to right, comparing each element to the target until a match is found or the array is exhausted.
SHOW:
- Unsorted array [3, 7, 1, 9, 4, 6, 2, 8] on the left with cells labelled index 0-7
- A magnifying-glass or pointer icon moving left to right
- Target value "4" shown in a box on the right labeled "target"
- An arrow from the array to a green result box showing "Found at index 4"
- A red result path showing "Not found → return -1" as an alternative outcome below

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text -- must be visibly darker than active
- Found/result: #065f46 background, #4ade80 border and glow
- Low pointer: blue #38bdf8 triangle + label
- High pointer: red #f87171 triangle + label
- Mid pointer: purple #a855f7 triangle + label
- Decision text: amber #fbbf24
- Step label: white #e2e8f0
- Status bar: #1e293b background

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted
elements, clean monospace values, professional DSA tool aesthetic.
No clutter. Every element must teach the concept.

OUTPUT: 1200x600px PNG

---

## IMAGE 1 of 6 — inline-01-trace-example
Filename: inline-01-trace-example.png

Create a DSA visualization diagram.

CONCEPT: Step-by-step comparison trace showing how linear search eliminates elements one by one until the target is found.
SHOW:
- Array [3, 7, 1, 9, 4, 6, 2, 8] with index labels 0–7 below each cell
- Cells at indices 0–3 (values 3, 7, 1, 9) greyed out with small ✗ marks indicating failed comparisons
- Cell at index 4 (value 4) highlighted bright green with a ✓ checkmark
- An orange pointer arrow labelled "i" sitting below index 4
- Target badge "target = 4" in the top-right corner
- Comparison annotations: "3≠4", "7≠4", "1≠4", "9≠4", "4==4 ✓" shown above or below each cell

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text -- must be visibly darker than active
- Found/result: #065f46 background, #4ade80 border and glow
- Low pointer: blue #38bdf8 triangle + label
- High pointer: red #f87171 triangle + label
- Mid pointer: purple #a855f7 triangle + label
- Decision text: amber #fbbf24
- Step label: white #e2e8f0
- Status bar: #1e293b background

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted
elements, clean monospace values, professional DSA tool aesthetic.
No clutter. Every element must teach the concept.

OUTPUT: 1200x600px PNG

---

## IMAGE 2 of 6 — step-01-initial
Filename: step-01-initial.png

Create a DSA visualization diagram.

CONCEPT: Initial state — the pointer is at index 0 and no elements have been examined yet.
SHOW:
- Array [3, 7, 1, 9, 4, 6, 2, 8] with all cells in neutral colour
- An orange "i" pointer arrow below index 0
- Target value badge "target = 4" in the top right
- A comparison label "Checking index 0: 3 ≠ 4"
- Step counter "Step 1 of 5" in the corner

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text -- must be visibly darker than active
- Found/result: #065f46 background, #4ade80 border and glow
- Low pointer: blue #38bdf8 triangle + label
- High pointer: red #f87171 triangle + label
- Mid pointer: purple #a855f7 triangle + label
- Decision text: amber #fbbf24
- Step label: white #e2e8f0
- Status bar: #1e293b background

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted
elements, clean monospace values, professional DSA tool aesthetic.
No clutter. Every element must teach the concept.

OUTPUT: 1200x600px PNG

---

## IMAGE 3 of 6 — step-02-scanning
Filename: step-02-scanning.png

Create a DSA visualization diagram.

CONCEPT: Scanning phase — elements at indices 0, 1, 2, 3 have been checked and eliminated; pointer is now at index 3.
SHOW:
- Array [3, 7, 1, 9, 4, 6, 2, 8]
- Indices 0-2 greyed out with small ✗ marks (values 3, 7, 1 eliminated)
- Orange "i" pointer below index 3 (value 9)
- Comparison label "Checking index 3: 9 ≠ 4"
- Eliminated count badge "3 eliminated"

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text -- must be visibly darker than active
- Found/result: #065f46 background, #4ade80 border and glow
- Low pointer: blue #38bdf8 triangle + label
- High pointer: red #f87171 triangle + label
- Mid pointer: purple #a855f7 triangle + label
- Decision text: amber #fbbf24
- Step label: white #e2e8f0
- Status bar: #1e293b background

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted
elements, clean monospace values, professional DSA tool aesthetic.
No clutter. Every element must teach the concept.

OUTPUT: 1200x600px PNG

---

## IMAGE 4 of 6 — step-03-match
Filename: step-03-match.png

Create a DSA visualization diagram.

CONCEPT: Match found — the pointer reaches index 4 where value 4 equals the target; the cell lights up green.
SHOW:
- Array [3, 7, 1, 9, 4, 6, 2, 8]
- Indices 0-3 greyed out
- Index 4 cell highlighted bright green with a ✓ checkmark, value "4"
- Green result banner "return 4" at the top
- Orange "i" pointer below index 4

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text -- must be visibly darker than active
- Found/result: #065f46 background, #4ade80 border and glow
- Low pointer: blue #38bdf8 triangle + label
- High pointer: red #f87171 triangle + label
- Mid pointer: purple #a855f7 triangle + label
- Decision text: amber #fbbf24
- Step label: white #e2e8f0
- Status bar: #1e293b background

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted
elements, clean monospace values, professional DSA tool aesthetic.
No clutter. Every element must teach the concept.

OUTPUT: 1200x600px PNG

---

## IMAGE 5 of 6 — step-04-not-found
Filename: step-04-not-found.png

Create a DSA visualization diagram.

CONCEPT: Not-found scenario — same array searched for target = 5; every element is eliminated and -1 is returned.
SHOW:
- Array [3, 7, 1, 9, 4, 6, 2, 8] with all 8 cells greyed out and ✗ marks
- Target badge "target = 5"
- Red result banner "return -1 (not found)"
- All eight comparison labels visible below the array: "3≠5, 7≠5, 1≠5, 9≠5, 4≠5, 6≠5, 2≠5, 8≠5"

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text -- must be visibly darker than active
- Found/result: #065f46 background, #4ade80 border and glow
- Low pointer: blue #38bdf8 triangle + label
- High pointer: red #f87171 triangle + label
- Mid pointer: purple #a855f7 triangle + label
- Decision text: amber #fbbf24
- Step label: white #e2e8f0
- Status bar: #1e293b background

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted
elements, clean monospace values, professional DSA tool aesthetic.
No clutter. Every element must teach the concept.

OUTPUT: 1200x600px PNG

---

## IMAGE 6 of 6 — step-05-complexity
Filename: step-05-complexity.png

Create a DSA visualization diagram.

CONCEPT: Complexity summary and decision guide for when to use linear search versus binary search.
SHOW:
- Complexity table with three rows: Best O(1), Average O(n), Worst O(n), Space O(1)
- Decision flowchart: "Array sorted?" → Yes → Binary Search O(log n); No → Linear Search O(n)
- When-to-use signals: unsorted data, linked list, data stream, n is small, search once
- When NOT to use: large sorted array, many repeated queries on same data

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text -- must be visibly darker than active
- Found/result: #065f46 background, #4ade80 border and glow
- Low pointer: blue #38bdf8 triangle + label
- High pointer: red #f87171 triangle + label
- Mid pointer: purple #a855f7 triangle + label
- Decision text: amber #fbbf24
- Step label: white #e2e8f0
- Status bar: #1e293b background

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted
elements, clean monospace values, professional DSA tool aesthetic.
No clutter. Every element must teach the concept.

OUTPUT: 1200x600px PNG

---

## IMAGE — summary.png
Filename: summary.png

Create a DSA visualization diagram.

CONCEPT: All-in-one reference diagram — complexity, decision signals, sentinel trick, and comparison with binary search.
SHOW:
- Complexity table: Best O(1), Avg O(n/2), Worst O(n), Space O(1)
- Mini comparison table: Linear vs Binary — sorted required, complexity, space, linked list support
- Sentinel trick diagram: arr[n-1] = target before loop, remove bounds check, restore after
- Key pattern signals: "unsorted", "linked list", "stream", "find all", "small n"
- Crossover note: "Sort + binary wins when k > log n queries on same data"

COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text -- must be visibly darker than active
- Found/result: #065f46 background, #4ade80 border and glow
- Low pointer: blue #38bdf8 triangle + label
- High pointer: red #f87171 triangle + label
- Mid pointer: purple #a855f7 triangle + label
- Decision text: amber #fbbf24
- Step label: white #e2e8f0
- Status bar: #1e293b background

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted
elements, clean monospace values, professional DSA tool aesthetic.
No clutter. Every element must teach the concept.

OUTPUT: 1200x600px PNG
