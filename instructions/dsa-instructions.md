# DSA Notes Generation Instructions V2
# Claude generates markdown → Python converts to HTML locally.

---

## OVERVIEW

Generate one DSA topic note as a single markdown file.
Python build script converts it to complete HTML + all JSON files.
Every note covers the topic from beginner to expert in flowing prose.
No difficulty sections or tabs — starts simple, builds to expert naturally.
Interactive components populated by JS from JSON files Python generates.
Theory and code are the only static content Claude writes.

---

## FOLDER STRUCTURE

```
src/data/notes/dsa-[slug]/
├── markdown/
│   └── dsa-[slug].md             ← Claude generates this
├── notes.html                    ← Python generates from md
├── [animation-name].html         ← Python generates via animate.py
├── images/
│   ├── step-01-[description].png
│   └── ...
└── json/
    ├── mcq.json                  ← parse_mcq.py
    ├── visual-mcq.json           ← parse_visual_mcq.py
    ├── problems.json             ← parse_problems.py
    ├── contest.json              ← parse_contest.py
    ├── checklist.json            ← parse_checklist.py
    ├── glossary.json             ← parse_glossary.py
    └── interview.json            ← parse_interview.py

src/data/notes/markdown/          ← inbox: drop dsa-[slug].md here,
                                      generate_dsa_notes.py scans it,
                                      creates the topic folder, moves
                                      the file in, then builds

css/
├── styles.css                    ← shared, all notes
├── notes/
│   ├── notes.css                 ← shared, all notes
│   └── dsa/
│       ├── dsa-notes.css         ← DSA notes specific
│       ├── dsa-print.css         ← DSA print rules
│       └── animation-core.css    ← shared, all animations

js/
├── shared/
│   └── site-config.js            ← theme + site-wide config, loads in head
├── notes/
│   ├── notes-*.js                ← shared (reused from AWS)
│   ├── notes-page-core.js        ← boots notes page (shared, all subjects)
│   └── dsa/
│       ├── dsa-visualisation.js  ← image slideshow + animation tab
│       ├── dsa-problems.js
│       ├── dsa-contest.js
│       ├── dsa-visual-mcq.js
│       ├── dsa-print.js
│       └── animation/
│           ├── animation-core.js ← controls, validation, play/pause
│           ├── renderer-array.js
│           ├── renderer-tree.js
│           ├── renderer-graph.js
│           ├── renderer-grid.js
│           ├── renderer-string.js
│           └── renderer-number.js
```

Page URL pattern: `dsa-[slug]/notes.html` — note the hyphen in
`dsa-[slug]`, not a nested `dsa/[slug]/` path.

---

## PART 1 — FRONTMATTER

Claude fills this block. Python generates all HTML boilerplate from it.
Claude never writes DOCTYPE, head, meta tags, schema, or box components.

```yaml
---
type: dsa
title:
slug:
topic_number:
date:
date_modified:        # leave empty — defaults to date
keywords: []
tags: []              # 3-5 tags
prerequisites: []     # on hold
when_to_use:          # 1-2 sentences. Specific problem signals, not generic.
comparison_topic:     # null if none
lc_tag_url:
cp_algorithms_url:    # null if none
cses_section:         # null if none
animation_name:       # defaults to [slug]-animation if empty
---
```

**What Python generates from frontmatter:**

| Fields | HTML generated |
|---|---|
| all | `<!DOCTYPE>`, `<html>`, full `<head>` |
| `title`, `keywords` | auto-generated meta description |
| `title`, `slug` | OG tags, canonical URL (`dsa-[slug]/notes.html`) |
| `title`, `type` | `<title>` tag, CSS + JS files |
| `tags` | `<div class="tags">` near the bottom of the body |
| `when_to_use` | `highlight-box` |
| all | JSON-LD schema |

**Auto-description formula:**
```
[title] — covers theory, implementation, complexity analysis,
LeetCode problems, and interview questions.
Keywords: [keywords joined]. Beginner to expert level.
```

**HTML body order Python generates:**
```
<body data-subject="dsa">
  JSON-LD schema
  <div id="pageLoader"> ... loading spinner ... </div>
  <div class="note-container">
    highlight-box (when_to_use)
    <div class="note-content">
      <!-- markdown renders here -->
    </div>
    <div class="tags"> ... topic tags ... </div>
    <div id="footerRoot" data-subject="dsa"></div>
```

There is no title/header block inside the body — the page title comes
from `<title>` and OG tags only. Tags render near the bottom, not under
a heading.

---

## PART 2 — MARKDOWN BODY

Sections in this exact order. Use `[collapsible-section o]` for open by default,
`[collapsible-section]` for closed. Python converts both to correct `<details>` tags.

---

### SECTION 1 — THEORY (content-driven, multiple collapsibles)

Theory is NOT one fixed "Theory & Notes" block. Like AWS notes, Claude
writes AS MANY `##`-level collapsibles as the topic naturally needs, each
named after its real subtopic. A simple topic might have 4 collapsibles
(Introduction, How It Works, Complexity, Common Mistakes). A rich topic
might have 8+ (Introduction, Quick Recap, Core Mechanism, Edge Cases,
Comparison, Advanced Variant, Real-World Application, Common Mistakes).

**The only fixed rule:** the FIRST collapsible is always `## Introduction`.
Everything after it is freely named by Claude based on what the topic
actually needs — same as AWS's "content drives structure, don't force
templates" principle.

```markdown
[collapsible-section o]
## Introduction

[Intuitive explanation. Everyday analogy if possible.]
[Formal definition after intuition.]
[/collapsible-section]

[collapsible-section]
## [Natural subtopic name — e.g. "How It Works", "The Merge Step",
##  "Why Stability Matters" — named after actual content, not generic]

[Prose. Tables. Code. Boxes as needed -- see supported elements below.]
[/collapsible-section]

[collapsible-section]
## [Another natural subtopic]

...continue with as many subtopic collapsibles as the topic needs...
[/collapsible-section]

[collapsible-section]
## Complexity Analysis

| Case    | Time | Space | Why               |
|---------|------|-------|-------------------|
| Best    | O(?) | O(?)  | [one line reason] |
| Average | O(?) | O(?)  | [one line reason] |
| Worst   | O(?) | O(?)  | [one line reason] |
[/collapsible-section]

[collapsible-section]
## Comparison
[Only if comparison_topic set in frontmatter. Omit this whole collapsible otherwise.]

| Feature | [THIS] | [OTHER] |
|---------|--------|---------|
| [row]   | [val]  | [val]   |
[/collapsible-section]

[collapsible-section]
## Common Mistakes

- [Specific mistake 1 — never generic]
- [Specific mistake 2]
- [Specific mistake 3]
[/collapsible-section]
```

**Heading IDs are MANDATORY** (this is how the bookmark/TOC system works —
see Static Page Elements section below). Every `##` heading Claude writes
must get a matching `id` via this shorthand:

```markdown
## How It Works {#how-it-works}
```

Python strips the `{#...}` and emits `<h2 id="how-it-works">How It Works</h2>`.
ID = lowercase heading text, spaces and punctuation replaced with hyphens.

**Supported markdown elements (inside any theory collapsible):**

| Markdown | Converts to | Notes |
|---|---|---|
| `### Heading {#id}` | `<h3 id="...">` | sub-subsections, also needs an id |
| ` ```code``` ` | `<pre><code>` | pseudocode |
| paragraph | `<p>` | default for all prose |
| `\| table \|` | `<table>` | complexity, comparison |
| `- item` | `<ul><li>` | bulleted lists |
| `1. item` | `<ol><li>` | numbered lists |
| `` `code` `` | `<code>` | inline code |
| `[text](url)` | `<a href>` | links |
| `!!text!!` | `<strong>` | bold |
| `//text//` | `<em>` | italic — avoid bare `https://` URLs in prose, use `[text](url)` instead |
| `++text++` | `<u>` | underline |
| `~~text~~` | `<del>` | strikethrough |
| `%%text%%` | `<mark>` | mark/highlight (not the same as exam highlights below) |
| `^^text^^` | `<sup>` | superscript |
| `,,text,,` | `<sub>` | subscript |
| `{{--text--}}` | `<small>` | small text |
| `[[Ctrl]]` | `<kbd>` | keyboard key |
| `==sentence==` | `exam-highlight-sentence` span | key sentences — **reserved**, not generic highlight |
| `**term**` | `exam-highlight-term` span | key terms — **reserved**, not generic bold |
| `[image:file\|caption]` | `<img>` with caption | inline images, mid-subtopic |
| `[note]...[/note]` | `info-box` | a useful aside, doesn't fit main flow |
| `[important]...[/important]` | `highlight-box` | the single most important insight in a subtopic |
| `[warning]...[/warning]` | `error-box` | a trap or frequently-made mistake |

**Never write raw HTML tags directly** (`<b>`, `<i>`, `<u>`, `<strong>`,
`<em>`, `<mark>`, `<sup>`, `<sub>`, `<small>`, `<kbd>`, `<ul>`, `<ol>`,
`<li>`, etc.) — use the marker syntax above and Python's `inline_fmt()`
generates the tag. `**term**` and `==sentence==` are the one deliberate
exception: they're reserved for exam highlights, not generic
bold/emphasis — use `!!text!!` for ordinary bold.

**Theory writing rules:**
- Introduction opens with an everyday analogy before any technical definition. Test: could you explain this opening paragraph to someone who has never coded?
- The story test: theory should read like an explanation from a knowledgeable friend, not a textbook. No passive voice, no "it can be seen that".
- Never use "easy", "simple", "trivial", "just", "obviously" — condescending.
- Every complexity claim must have a Why explaining the reasoning in one line, not restating the complexity.
- Exam highlights: `==highlight==` for the single most important sentence per paragraph. `**term**` for technical terms being defined for the first time. Never highlight more than one sentence per paragraph.
- `when_to_use` in frontmatter must name specific problem signals, not describe the algorithm. Bad: "Use when you need efficient searching." Good: "Use when the problem gives a sorted array and asks for a specific value, position, or existence check."
- Advanced material gets its own collapsible(s), continuing naturally — not gated behind a difficulty label, but given its own clearly-named section so a beginner can skip it and an advanced reader can jump straight to it via the TOC.

**Density and visual breaks (within each collapsible):**
- After every 2-3 paragraphs of prose, break the wall of text with one of: a `[note]`, `[important]`, `[warning]` box, a small table, or an inline `[image:...]`.
- Equations with multiple terms (e.g. `O((n log n) / p + n)`) go on their own line, never buried mid-sentence.
- Any subtopic collapsible past 3 paragraphs needs at least one visual break — image, important-box, or table. Never neither.
- **Boxes and tables are not a substitute for images — at least one subtopic across the whole Theory section must include a real inline `[image:...]`**, not just text boxes. A Theory section with zero inline images anywhere, even if every box/table rule is technically satisfied, has not used the medium fully — pick the subtopic where a diagram would help most (usually a "how it works" or "in depth" subtopic showing a worked example) and add one. This image gets its own entry in IMAGE PROMPTS, filename pattern `inline-0N-[short-description].png` — it is separate from both the Visualisation gallery and any Visual Questions trace images.
- Do not overuse boxes — rhythm is prose, prose, break, prose, prose, break, not a box after every sentence.

---

### SECTION 2 — VISUALISATION

```markdown
[collapsible-section o]
## Visualisation

[image:step-01-initial.png|Step 1: what is shown]
[image:step-02-[short-description].png|Step 2: what is shown]
[image:step-03-[short-description].png|Step 3: what is shown]
[image:step-04-[short-description].png|Step 4: what is shown]
[image:step-05-complexity.png|Complexity and when-to-use summary]
[/collapsible-section]
```

**Canonical filename pattern — always use this, no variation:**
`step-0N-[short-description].png` where N is the step number and
`[short-description]` is 1-3 words, lowercase, hyphenated (e.g.
`step-02-split`, not `step-02-first-merges-leaf-level`). The FIRST image
is always exactly `step-01-initial.png` and the LAST is always exactly
`step-0N-complexity.png` — these two never vary by topic. Keeping the
pattern fixed (rather than fully descriptive per-topic names) makes the
200-topic image set scannable and consistent, and avoids any chance the
same filename gets reused with different content across two runs.

**Rules:**
- 5-6 images minimum. Last always exactly `step-0N-complexity.png`.
- Filenames must exactly match filenames in IMAGE PROMPTS section.
- Python generates full two-panel HTML (slideshow + animation iframe).
- Animation path: relative, resolved automatically by Python from `slug` and `animation_name` — Claude never writes the animation path or URL anywhere.

---

### SECTION 3 — IMPLEMENTATION

```markdown
[collapsible-section o]
## Implementation

<code-tabs>
```python
# Time: O(?) | Space: O(?)
[implementation]
```

```java
// Time: O(?) | Space: O(?)
[implementation]
```

```cpp
// Time: O(?) | Space: O(?)
[implementation]
```
</code-tabs>

### Dry Run
[Prose walkthrough with small concrete example.]

### Variations

```python
# Variation: [name]
[code]
```
[/collapsible-section]
```

**Rules:**
- All 3 languages always, in order Python → Java → C++.
- Every implementation must be correct and complete — paste it into an interpreter and it runs.
- Complexity comment on every function: `# Time: O(?) | Space: O(?)`.
- Comments inside code only on non-obvious lines — not on every line.
- Dry Run: trace a concrete small example step by step in prose. Show variable values changing. Not a table — flowing sentences.
- Variations: only include variations that a student would genuinely encounter in interviews or competitive programming. Not contrived.

---

### SECTION 4 — SUMMARY

```markdown
[collapsible-section o]
## Summary

[2-3 sentence summary.]

[takeaways]
- Most important thing
- Second takeaway
- Third takeaway
- Interview pattern signal
- Expert level nuance
[/takeaways]
[/collapsible-section]
```

**Rules:** Exactly 5 takeaways. Last always expert level or interview signal.
No JSON, no JS — pure static HTML.

---

### SECTION 5 — GLOSSARY

```markdown
[collapsible-section]
## Glossary

[glossary]
t:
d:
e:
[/glossary]
[/collapsible-section]
```

**Fields:** `t` term, `d` definition (one sentence), `e` concrete example.
**FLOOR: minimum 15 terms.** This is a hard requirement, not a target —
if your count is below 15, you have not finished. Include every term used
in Theory plus enough adjacent terms to reach the floor. A learner should
never hit an undefined term, and the glossary should be exhaustive for
the topic's vocabulary, not just the bare minimum used in prose.

---

### SECTION 6 — INTERVIEW QUESTIONS

```markdown
[collapsible-section]
## Interview Questions

[interview]
q:
a:
d: easy
cat: implementation
[/interview]
[/collapsible-section]
```

**Fields:** `q` question, `a` answer (3-5 sentences, interview-ready),
`d` difficulty (easy/medium/hard/expert),
`cat` category (complexity/implementation/application/tradeoffs).
**FLOOR: minimum 25 questions**, spread across all 4 categories and all
4 difficulty levels — roughly 6-7 per category. This is a hard
requirement. Every answer must be interview-ready, not textbook — include
what an interviewer actually wants to hear, tradeoffs, follow-up signals.

---

### SECTION 7 — MULTIPLE CHOICE QUESTIONS

```markdown
[collapsible-section]
## Multiple Choice Questions

[mcq]
q:
o: option A | option B | option C | option D
c: 0
e:
w:
d: beginner
[/mcq]
[/collapsible-section]
```

**Fields:** `q` question, `o` options pipe-separated (exactly 4),
`c` correct 0-based index, `e` explanation for the correct answer,
`w` why the wrong options are wrong (optional but strongly preferred —
omitting it produces a generic fallback line), `d` difficulty.
**Never use a literal `|` character inside any option's text** — the
parser splits on every `|` it finds, so an option containing one (a
bitwise OR, a regex alternation, anything) silently produces 5+ pieces
instead of 4. The parser recovers by merging the extra piece(s) back into
the last option (with a warning printed) rather than dropping the
question outright, but the resulting option text will be wrong/garbled —
don't rely on the recovery. If an option must express alternation, write
"or" in words instead.
**FLOOR: minimum 30 questions** — 12 basic, 12 intermediate, 6 advanced
or expert. This is a hard requirement, same rigor as the 30+ AWS standard.
DSA topics support this easily: complexity variants (best/avg/worst
separately), edge cases, comparisons to alternative algorithms, code-trace
questions, and practical-use questions all count as distinct angles.
Wrong options must be plausible — a student who half-understands the
topic should find them believable. Good distractors are: common
misconceptions, off-by-one errors in complexity, correct answers to a
slightly different question. No "all of the above" or "none of the above".

---

### SECTION 8 — VISUAL QUESTIONS

```markdown
[collapsible-section]
## Visual Questions

[visual-mcq]
type: fillblank
d: beginner
q:
code:
[code with ____ blanks]
o: option A | option B | option C | option D
c: 0
e:
[/visual-mcq]

[visual-mcq]
type: trace
d: intermediate
q:
img: images/[filename].png
o: option A | option B | option C | option D
c: 0
e:
[/visual-mcq]

[visual-mcq]
type: output
d: intermediate
q:
code:
[code to trace]
o: option A | option B | option C | option D
c: 0
e:
[/visual-mcq]

[visual-mcq]
type: spotbug
d: advanced
q: What is wrong with this implementation?
code:
[code with subtle bug]
o: option A | option B | option C | option D
c: 0
e:
[/visual-mcq]
[/collapsible-section]
```

**Types:** `fillblank` beginner, `trace` intermediate (requires `img`),
`output` intermediate, `spotbug` advanced.
**FLOOR: minimum 8 questions — 2 of each of the 4 types.** This is a hard
requirement. Bugs must be subtle — off-by-one, wrong condition, missing
edge case, never a syntax error.
**Never use a literal `|` character inside any option's text** — same
parser limitation as MCQ above. Write "or" in words if alternation is
genuinely needed inside an option.

**Trace image rule — never reuse a Visualisation image for a `trace`
question unless the question's array/data is IDENTICAL to what that
image actually shows.** Each `trace` question needs its own dedicated
image showing the exact data the question asks about — generate a new
image prompt for it in the IMAGE PROMPTS section (filename pattern:
`visual-trace-0N-[short-description].png`) rather than pointing `img:`
at one of the Visualisation section's `step-0N` images. A learner must
never see a picture of one array while being asked about a different one.

---

### SECTION 9 — LEETCODE PROBLEMS

```markdown
[collapsible-section o]
## LeetCode Problems

[problem]
n: [LC number]
title:
url: https://leetcode.com/problems/[slug]/
diff: easy
pattern: [specific technique tested]
[/problem]
[/collapsible-section]
```

**Fields:** `n` LC number, `title`, `url`, `diff` (easy/medium/hard), `pattern`.
**FLOOR: minimum 6 problems — 2 easy, 2 medium, 2 hard.** This is a hard
requirement. Every problem must directly use this topic. Pattern names
the specific technique — not just the topic name.

---

### SECTION 10 — CONTEST PROBLEMS

```markdown
[collapsible-section]
## Contest Problems

[contest]
title:
platform: Codeforces
url:
diff: hard
pattern: [one line — no approach spoilers]
[/contest]
[/collapsible-section]
```

**Fields:** `title`, `platform` (Codeforces/CSES/AtCoder/LeetCode), `url`, `diff`, `pattern`.
**FLOOR: minimum 3 problems for beginner/intermediate topics, minimum 5
for advanced/expert topics.** This is a hard requirement. Pattern is one
line maximum — never spoil the approach. Include CSES link if a section
exists. Order easiest first.

---

### SECTION 11 — LEARNING CHECKLIST

```markdown
[collapsible-section]
## Learning Checklist

[checklist]
cat: Understanding
- I can explain [TOPIC] without CS jargon
- I understand why time complexity is O(?)
[/checklist]

[checklist]
cat: Implementation
- I can implement [TOPIC] from scratch without reference
- I can implement [VARIATION] from scratch
[/checklist]

[checklist]
cat: Problem Solving
- I solved [Easy LC problem] without hints
- I solved [Medium LC problem] without hints
- I attempted [Hard LC problem]
[/checklist]

[checklist]
cat: Expert Level
- I know when NOT to use [TOPIC]
- I can identify [TOPIC] pattern in unseen problems
[/checklist]
[/collapsible-section]
```

**Rules:** Always exactly 4 categories in this order.
**FLOOR: minimum 4 items per category, minimum 16 items total.** This is
a hard requirement. Items must be verifiable. Problem Solving items
reference actual LC problems from Section 9.

---

### SECTION 12 — YOUTUBE RECOMMENDATIONS

```markdown
[collapsible-section]
## YouTube Recommendations

[youtube]
title:
channel:
url:
level: beginner
why: [one line — why this video specifically]
[/youtube]
```

**Fields:** `title`, `channel`, `url`, `level` (beginner/intermediate/advanced), `why`.
**FLOOR: minimum 3 videos, one per difficulty level.** This is a hard
requirement. Verify every link before including. Prefer: NeetCode, Abdul
Bari, William Fiset, Errichto, MIT OCW. Each `why` must explain what
specifically makes this video better than alternatives for this topic.

---

### SECTION 13 — LINKS & REFERENCES

```markdown
[collapsible-section]
## Links & References

[ref]
text: CP Algorithms — [TOPIC]
url: https://cp-algorithms.com/[path]/
[/ref]

[ref]
text: CLRS Chapter N — [Chapter Title]
url:
[/ref]
[/collapsible-section]
```

**Fields:** `text` display text, `url` (leave empty for book references).
**Rules:** Always include CP Algorithms if page exists, CSES if applicable,
GeeksForGeeks, CLRS chapter, Competitive Programmer's Handbook chapter.
Python renders static `<ul>` — no JSON. No quantity floor — completeness
of relevant sources matters more than a count.

---

### IMAGE PROMPTS

After all sections, generate GPT-4o prompts for every image listed in
Section 2's Visualisation block. Claude writes ONLY the per-image
content that genuinely varies (CONCEPT + SHOW) — Python derives the
filename and step number from the matching `[image:...]` tag in
Visualisation, and appends the fixed COLOR RULES / STYLE / OUTPUT
footer automatically. This eliminates ~10 lines of identical
boilerplate that would otherwise repeat 5-6 times per topic for zero
reason — it never varies.

```markdown
[image-prompts]
step-01-initial.png:
CONCEPT: [what this step teaches — one sentence]
SHOW:
- [element 1]
- [element 2]
---
step-02-[short-description].png:
CONCEPT: [what this step teaches — one sentence]
SHOW:
- [element 1]
- [element 2]
---
[repeat one block per image, same filenames and order as Section 2]
[/image-prompts]
```

**Rules:**
- One block per image in Visualisation, same filenames, same order.
- CONCEPT is the most important line — one sentence on what student learns at this specific step.
- SHOW lists only the elements needed for this specific step — 3-6 bullet points, concrete (exact values, not placeholders).
- Never write COLOR RULES, STYLE, or OUTPUT lines — Python appends these automatically from a fixed template. Writing them yourself just duplicates effort with zero benefit.
- Never write the "Filename:" line or "IMAGE N of M" header — Python derives both from the `step-0N-...png:` key matching Section 2.

**Consistency rule:** the starting data shown in `step-01-initial.png`'s
SHOW lines must be the exact same array/input used in the Animation
block's `default_array` (Section: Animation, below). Two different
starting values for the same topic — one in the static image, one in
the live animation — is a real bug, the same class of mismatch that
trace-type Visual Questions images must also avoid (see Section 8).

---

---

### CHOOSING WHETHER A TOPIC NEEDS ANIMATION

Most topics benefit from animation. A minority are pure concept/
architecture topics with no single execution trace to step through —
for those, skip the `[animation]` block entirely (omit it from the md,
no error results, `animate.py` just does nothing).

**Skip animation for:** topics whose entire content is a definition,
a complexity comparison, or an architectural/conceptual diagram with no
step-by-step execution — e.g. Variables, Data Types, Big O, Time/Space
Complexity, Amortized Analysis, MapReduce Concepts, CRDTs, Concurrent
Data Structures (timing diagrams, not a clean step sequence), Pattern
Recognition in Problem Solving. If you genuinely cannot describe "step 1,
step 2, step 3" for a topic without it feeling forced, skip it.

**Otherwise, animate.** This covers the large majority of the 200 topics,
including ones that might look "too advanced to animate" at first glance —
flow algorithms, geometry, game theory, and expert structures all reduce
cleanly to one of the six renderer families below once you find the right
shape. When in doubt, animate — a forced-but-clear animation beats no
animation more often than not.

### CHOOSING THE RENDERER TYPE

Six renderer families exist. Pick the one whose visual shape actually
matches the topic — not by category label, but by what's really on
screen at each step.

| `type` | Pick this when the topic's state is fundamentally... | Examples |
|---|---|---|
| `array` | A row of cells with pointers moving over them — includes linear structures (stack/queue/linked list, displayed as a row with arrows) and anything array-shaped | Search, sort, sliding window, two pointers, stack, queue, linked list, sieve, LRU cache, streaming algorithms |
| `tree` | Nodes connected in a hierarchy — includes anything that is literally a tree, a forest (DSU), a game tree, or a trie | Binary tree, BST, AVL, heap, DSU, tries, segment tree, recursion/call trees, backtracking decision trees, game theory trees, treap, B-tree |
| `graph` | Nodes connected by arbitrary edges with no fixed hierarchy — includes geometry (points + edges) and flow networks | BFS, DFS, Dijkstra, MST, SCC, flow/matching, geometry (points on a plane), consistent hashing (ring topology) |
| `grid` | A 2D table being filled cell by cell, where each cell depends on specific other cells | DP tables (Knapsack, LCS, LIS), matrix operations, Floyd-Warshall (it's an N×N matrix, not a graph traversal) |
| `string` | Two rows of characters being compared/shifted against each other | KMP, Rabin-Karp, Z-algorithm, Rolling Hash, Suffix Array |
| `number` | A single equation or a small set of named values transforming step by step — no spatial layout at all | Sieve concepts at the number level, GCD, modular arithmetic, CRT, Miller-Rabin, simulated annealing |

**When a topic seems to span two types**, pick by what actually changes
on screen most: a heap is usually shown as a tree even though it is array-
backed internally, because the conceptual operations (sift up/down) are a
tree operation. DSU is a forest, not a generic graph, because each
operation is about tree structure (union, find root), not edge traversal.

---

### ANIMATION

Lives inside the same topic md, after Image Prompts. One block, Claude
fills frontmatter-style fields plus one JS function. Python extracts this
block, picks the matching renderer, and outputs a separate animation HTML
file at `src/data/notes/dsa-[slug]/[animation_name].html` — the same
topic folder as `notes.html`, per the FOLDER STRUCTURE at the top of this
file (not a separate `data/animation/` tree).

```markdown
[animation]
type: array
input_boxes: [array-number, target-number]
default_array: 2,5,8,12,16,23,38,45,56,72
default_target: 23

```js
function computeSteps(input) {
    const arr = input.array;
    const target = input.target;
    const steps = [];
    let low = 0, high = arr.length - 1;

    steps.push({
        active: [], eliminated: [], found: null,
        pointers: { low, high, mid: null },
        label: `Initial state — searching for ${target}`,
        decision: ""
    });

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (arr[mid] === target) {
            steps.push({
                active: [mid], eliminated: [], found: mid,
                pointers: { low, high, mid },
                label: `arr[${mid}] = ${target} — found!`,
                decision: `${arr[mid]} == ${target} → found at index ${mid}`
            });
            break;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return steps;
}
```
[/animation]
```

**Fields:**
- `type` — array / tree / graph / grid / string / number. Picks the renderer.
- `input_boxes` — list from fixed box library (see below). Python renders these.
- `default_*` — one default value per box, used to pre-fill and auto-run on load.
- JS code block — exactly one function `computeSteps(input)`. Pure function:
  takes parsed input, returns array of state objects matching the renderer's schema.

**Claude writes ONLY `computeSteps()`.** No HTML, no CSS, no DOM access,
no controls, no validation — Python owns all of that.

**Consistency rule:** `default_array` (or `default_*` for whichever input
box applies) must use the exact same starting values shown in
`step-01-initial.png`'s SHOW lines in IMAGE PROMPTS. A learner switching
between the Step-by-Step tab and the Animation tab should see the same
starting data in both — a mismatch here is the same class of bug as
Visual Questions reusing the wrong image (see Section 8's Trace image
rule). Pick the array/input once, reuse it everywhere it appears.

**Fixed input box library** (Python validates, Claude just references by id):

| Box id | Validates | Max |
|---|---|---|
| `array-number` | comma-separated ints | 20 values |
| `target-number` | single int | — |
| `tree-values` | comma-separated ints | 15 values |
| `graph-edges` | "from-to-weight" lines | 10 nodes, 20 edges |
| `string-text` | plain text | 20 chars |
| `string-pattern` | plain text | 20 chars |
| `grid-dims` | two ints (rows,cols) | 8x8 |

**State schema per renderer type** (what `computeSteps()` must return):

```js
// type: array
{ active: [i,...], eliminated: [i,...], found: i|null,
  pointers: {low,high,mid,i,j}, label: "", decision: "" }

// type: tree
{ activeNode, visitedNodes: [...], comparedNodes: [...],
  path: [...], label: "", decision: "" }

// type: graph
{ visitedNodes: [...], activeEdge: {from,to}, distances: {...},
  selectedEdges: [...], label: "", decision: "" }

// type: grid
{ activeCell: [r,c], dependsOn: [[r,c],...], value, label: "", decision: "" }

// type: string
{ textPointer, patternPointer, matched: [...], mismatch,
  label: "", decision: "" }

// type: number
{ equation: "", values: {...}, label: "", decision: "" }
```

**Rules:**
- `computeSteps()` must be deterministic and pure — same input always same steps.
- First step always shows initial state with empty decision.
- Last step always shows final result (found/not found/complete).
- Label and decision are plain text — Python escapes for display.
- Python calls `python animate.py [topic-slug]` separately from `build.py`.


## QUALITY CHECKLIST

Before finalising, verify every item. Quantity floors are HARD
requirements — if your count is below the floor, you have not finished.

- [ ] Frontmatter all fields filled, `date_modified` empty on first publish
- [ ] First collapsible is `## Introduction`, remaining theory collapsibles freely named by actual subtopic
- [ ] Every `##` and `###` heading has a unique id (explicit `{#id}` or auto-generated)
- [ ] `when_to_use` names specific problem signals — not algorithm description
- [ ] Theory opens with an analogy a non-coder could follow
- [ ] No "easy", "simple", "trivial", "just", "obviously" anywhere in theory
- [ ] Exam highlights used sparingly — max one `==sentence==` per paragraph
- [ ] Every subtopic past 3 paragraphs has a visual break — image, `[note]`/`[important]`/`[warning]` box, or table
- [ ] All 3 language implementations correct and runnable
- [ ] Complexity table Why column filled for every row
- [ ] Visualisation has 5-6 images, last is complexity summary
- [ ] Image filenames in Section 2 match filenames in Image Prompts exactly
- [ ] Summary has exactly 5 takeaways
- [ ] **Glossary: 15+ terms** (hard floor)
- [ ] Glossary includes every term used in theory
- [ ] **Interview Questions: 25+ questions**, all 4 categories and all 4 difficulties represented (hard floor)
- [ ] Every interview answer is interview-ready, not textbook
- [ ] **Multiple Choice Questions: 30+ questions** — 12 basic / 12 intermediate / 6 advanced+ (hard floor)
- [ ] Every MCQ wrong option is a plausible distractor, never "all/none of the above"
- [ ] Every MCQ explanation teaches — not just says "correct because X"
- [ ] **Visual Questions: 8+ questions** — 2 of each of the 4 types (hard floor)
- [ ] **LeetCode Problems: 6+ problems** — 2 easy, 2 medium, 2 hard, all directly test topic (hard floor)
- [ ] **Contest Problems: 3+ for beginner/intermediate, 5+ for advanced/expert** (hard floor)
- [ ] Contest pattern tag present, no approach spoilers
- [ ] **Learning Checklist: 16+ items total, 4+ per category** (hard floor)
- [ ] Checklist Problem Solving items reference actual LC problems from Section 9
- [ ] **YouTube: 3+ videos**, one per difficulty level, links verified (hard floor)
- [ ] References includes CP Algorithms if exists, CSES if applicable
- [ ] Image prompts generated for every image in Section 2
