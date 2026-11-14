# Presentation Mode Instructions — Delta File
# Read this ALONGSIDE the standard instructions file for whichever subject
# triggered it (aws-standard-instructions.md, dsa-instructions.md, or any
# future subject's instructions file), not instead of it.
#
# Everything in that standard file still applies unless explicitly overridden
# below: frontmatter mechanics, audience targeting, the image *quality*
# philosophy (specific-question diagrams, not generic ones), and the source
# hygiene rules in PART 0 (topic boundary, granularity, authoritative
# sources, conflict resolution). This file states what's DIFFERENT for
# presentations. If something isn't mentioned here, assume the relevant
# standard file's rule applies unchanged.
#
# Presentation Mode is a THIRD content type, not a note variant:
#   aws-standard-instructions.md / dsa-instructions.md → Standard Notes
#   aws-additional-lab-instructions.md → Lab Notes (delta, AWS only)
#   aws-presentation-instructions.md   → Presentation Slides (delta) ← this file
#
# SUBJECT-AGNOSTIC, LIKE THE CODE THAT BUILDS IT: this file is kept beside
# the AWS instructions (and named after AWS) because AWS is where it's used
# most today, but the mechanism it describes is not AWS-specific — it
# mirrors generate_notes.py's TYPE_CONFIG / detect_subject and
# parse_slides.py's SUBJECT_LABELS / SUBJECT_KEYWORDS, both of which key off
# whatever subject the filename or `type:` frontmatter declares (aws, dsa,
# or any future subject added to TYPE_CONFIG). Everywhere below that says
# "aws-[topic-slug]-slides.md", read it as "[subject]-[topic-slug]-slides.md"
# for any subject the pipeline knows about. Only the specific example values
# (AWS Orange/Dark palette, `session_name` credit box) are AWS-specific —
# swap those for whatever the triggering subject's own notes already use.

---

## WHAT TRIGGERS PRESENTATION MODE

A deck is built in presentation mode when EITHER of these is true:

1. The markdown filename matches `[subject]-[topic-slug]-slides.md`
   (e.g. `aws-ec2-slides.md`, `dsa-graphs-slides.md`) — `subject` is
   whatever prefix the pipeline already recognizes (aws, dsa, or a future
   subject in `generate_notes.py`'s `TYPE_CONFIG`).
2. Frontmatter explicitly sets `presentation: true` (override, for when the
   filename doesn't follow the pattern exactly)

Presentation mode also requires a **source deck** as input — a `.pptx` or
`.pdf` file (exported slides, lecture deck, vendor training deck, etc.).
Without a source deck, this mode has nothing to rewrite from and should not
be used — generate a standard note instead.

---

## THE ONE RULE THAT MATTERS MOST: SLIDES ARE A SOURCE, NOT A TEMPLATE

**The uploaded PPTX/PDF is a source to learn from and rewrite, never a
layout to reproduce.** This is the copyright boundary and it is not
optional styling — it is a hard content rule, same tier as the AWS
Authoritative Sources rule in the standard file.

Before writing any slide markdown, Claude must:

1. **Extract, don't transcribe.** Read the source deck slide by slide and
   identify: the learning objective, the core concept(s), any data/numbers
   that are factual (not creative), and the diagram's *meaning* (what
   relationship or flow it's showing) — not its visual form.
2. **Discard the source's creative expression entirely.** This means:
   - Never reuse the source's exact wording, sentence structure, or bullet phrasing.
   - Never reuse the source's slide titles verbatim.
   - Never reuse the source's bullet ORDER as if it were the only valid sequence — restructure around the clearest teaching order, not the deck's order.
   - Never redraw or closely imitate the source's diagrams, icons, artwork, or layout.
   - Never reuse the source's exact color palette/branding if it belongs to a vendor or instructor's deck template.
3. **Rebuild from the facts up.** Facts, definitions, and figures (e.g. "S3 offers 11 nines of durability") are not copyrightable and may be restated freely, in Claude's own words. The deck's specific *expression* of those facts is what must never survive into the output.
4. **Regenerate every visual.** Any diagram, chart, or process graphic in the source becomes a newly designed SVG/HTML/CSS visual built by Claude — same underlying relationship, entirely original presentation. See DIAGRAM REGENERATION below.

If Claude cannot confidently separate "the fact being taught" from "the
deck's specific expression of it" for a given slide, default to a fuller
rewrite and a plainer, more original diagram rather than risk close
paraphrase.

This mirrors the standard file's Transcript Philosophy (0.2–0.3): the
source tells Claude *what was covered and how it was explained*, it does
not define what the output looks like.

---

## FILENAME & FOLDER PATTERN

```
[subject]-[topic-slug]-slides.md
```

Output folder:

```
src/data/notes/[subject]-[topic-slug]-slides/
├── markdown/
│   └── [subject]-[topic-slug]-slides.md
├── slides.html
├── images/
└── json/
    └── knowledge-check.json      ← only if any [poll]/[predict]/[think] block exists
```

Keeping `-slides` in the slug (same convention as `-lab`) keeps a
presentation deck for a topic in its own folder, separate from any standard
note or lab on that same topic. This applies the same way whether `subject`
is `aws`, `dsa`, or a future subject — `generate_notes.py`'s inbox scanner
routes by the `[subject]-` prefix alone, so nothing here is AWS-specific.

`session_name` (plus `session_url`/`lecturer_name`/`lecturer_url`) only
applies to subjects whose notes already use a lecture/session credit box —
AWS does, so it's REQUIRED for AWS presentations (same reasoning as labs: a
deck is always tied to a specific session/source). For a subject whose notes
don't carry session credit (e.g. DSA), omit these fields entirely rather
than leaving them blank.

---

## FRONTMATTER

```yaml
---
type: aws                     # or dsa, or any future subject — inherited from the pipeline's subject detection
title:
slug:
topic_number:
date:
date_modified:
keywords: []
tags: []
when_to_use:
presentation: true
source_type:                  # pptx | pdf
source_title:                 # original deck's title/filename, for internal tracking only — never rendered verbatim as the output title
slide_count:                  # actual count Claude produced, not the source's count
audience:                     # beginner | intermediate | advanced | exam
session_name:                 # required only for subjects that use session credit (e.g. AWS) — omit for subjects that don't (e.g. DSA)
session_url:
lecturer_name:
lecturer_url:
---
```

`audience` still shifts tone and analogy depth the same way it does for
notes, but has **no effect on quantity floors** — presentations have no
glossary/MCQ/interview count targets (see INTERACTIVITY below).

---

## STRUCTURE — FIXED DECK ORDER

```markdown
[slide type="title"]
# [Topic Title]
[subtitle, session/lecturer credit — same optional fields as standard notes]
[/slide]

[slide type="objectives"]
## What You'll Learn
- [3-5 objective bullets, each a concrete outcome]
[/slide]

[slide type="section-divider"]
## [Section Name]
[/slide]

[slide type="concept"]
## [One idea, title as a plain noun phrase — never the source's exact heading]
[≤5 bullets OR ≤120 words. One idea per slide — see SLIDE DENSITY LIMITS.]
[/slide]

[slide type="diagram"]
## [What this diagram answers]
[diagram-prompt]
CONCEPT: [the specific relationship/flow being shown]
[/diagram-prompt]
[/slide]

[slide type="example"]
## Example: [scenario name]
[Walk through the scenario: setup → decision point → outcome. ≤5 bullets OR ≤120 words — same density cap as concept slides. A heading with no walkthrough underneath fails the checklist below.]
[/slide]

[slide type="engage"]
[one of: think | scenario | poll | predict | pause — see INTERACTIVITY]
[/slide]

... (repeat concept/diagram/example/engage slides per section) ...

[slide type="recap"]
## Recap: [Section Name]
[3-4 bullets, restating — not repeating verbatim — the section's key points]
[/slide]

[slide type="summary"]
## Summary
[5-8 top-level takeaways across the whole deck]
[/slide]
```

Each `[slide]` block maps 1:1 to one rendered `<section class="slide">` in
`slides.html`. Unlike notes, there is no collapsible system in presentation
mode — slides are sequential, not expandable.

---

## SLIDE DENSITY LIMITS (hard caps)

- **1 heading per slide.**
- **Maximum 5 bullets per slide**, OR
- **Maximum 120 words per slide** (whichever is hit first).
- **Minimum floor:** every `concept`, `example`, and `recap` slide needs at
  least 2 bullets or ~40 words under the heading. A heading with nothing
  else is only acceptable for `title`, `section-divider`, and `diagram`
  (whose content lives in the generated image, not slide text) — no other
  slide type may ship as heading-only.
- One idea per slide. If a concept needs more, split it into multiple
  `concept` slides rather than lengthening one.

Test before finalizing any slide: *could this be read aloud in under 20
seconds?* If not, split it.

---

## DIAGRAM REGENERATION

Every diagram in the source deck gets rebuilt as an **original SVG/HTML/CSS
visual** — never a redrawn copy of the source's diagram.

- Identify what relationship the source diagram communicates (a flow, a
  hierarchy, a comparison, a before/after) — not its specific boxes, icons,
  or arrangement.
- Rebuild that relationship using simple CSS boxes/arrows or SVG shapes in
  whichever visual language the triggering subject's own notes already use
  (same palette rule as that subject's standard notes) — flat, no
  shadows/gradients. For AWS: AWS Orange `#FF9900`, AWS Dark `#232F3E`,
  Green `#3F8624`, Blue `#0073BB`. A future subject uses its own established
  palette instead; this file doesn't hardcode one.
- Use the same `[diagram-prompt]` → image-generation handoff pattern as the
  standard file's `[image-prompts]` block, but scoped per-slide instead of
  collected at the end, since each diagram slide is self-contained.
- Never generate an image that visually imitates a known vendor's slide
  template, icon set, or brand illustration style.

---

## INTERACTIVITY — LIGHTWEIGHT ONLY, NOT NOTES-STYLE STUDY TOOLS

Presentations do **not** get the standard file's Glossary, Interview
Questions, MCQ bank, Learning Checklist, or Reflection Questions sections.
Those are study-tool depth that belongs to notes, not a live-paced deck.

Instead, use `[engage]` slides sparingly (roughly one per section, not one
per concept) using one of five lightweight patterns:

| Pattern | Use for |
|---|---|
| `[think]` | A single reflective question before revealing the next slide |
| `[scenario]` | A short "what would you do" mini-scenario |
| `[poll]` | A quick single-question poll, 2-4 options, no scoring |
| `[predict]` | "Before we continue, what do you think happens when...?" |
| `[pause]` | A discussion prompt with no right answer, just a beat to reflect |

Example:

```markdown
[slide type="engage"]
[poll]
Before we continue...
Which storage class would you pick for data accessed once a year?
A) S3 Standard
B) S3 Glacier
C) S3 Intelligent-Tiering
[reveal]C — Intelligent-Tiering, if access pattern is unpredictable. Glacier if you know it's rarely-to-never accessed.[/reveal]
[/poll]
[/slide]
```

Only build `json/knowledge-check.json` if the deck actually contains
`[poll]`/`[predict]` blocks that need answer-reveal state. If a deck has no
engage slides beyond `[think]`/`[pause]` (which need no stored state), skip
the JSON file entirely.

**Speaker notes are optional and off by default.** Only include a
`[notes]...[/notes]` block under a slide if explicitly requested — by
default, omit speaker notes so the deck doesn't quietly turn back into a
documentation page.

---

## HTML / CSS / JS CONTRACT

**HTML skeleton** (what Claude's markdown compiles to):

```html
<section class="slide" data-type="concept">
  <div class="slide-title">...</div>
  <div class="slide-body">...</div>
  <div class="slide-footer">...</div>
</section>
```

**CSS — reuse, don't fork the theme.**
`slides.css` (`css/notes/slides.css`) already exists in the project and is
the only stylesheet a presentation page loads for deck-specific styling.
Rules:

- `slides.css` must pull its colors, fonts, and light/dark/comfort theme
  values from the site's existing CSS custom properties in `styles.css` —
  the same single source of truth every other page uses. Do not hardcode a
  separate palette.
- `slides.css` does **not** inherit or import `notes.css`. A presentation
  page is a different composition (full-viewport sequential sections, not a
  scrolling document with collapsibles) and should stay structurally
  independent, same reasoning as `dsa-notes.css` staying separate from
  `notes.css`.
- No print stylesheet fork needed initially — "Print PDF" in the nav bar
  can trigger the browser's native print-to-PDF on the current slide
  sequence rather than requiring a dedicated `slides-print.css`, unless you
  want per-slide pagination later.

**JS — navigation and chrome only, nothing from the notes study toolkit.**
A new `slides.js` (`js/notes/slides.js` or `js/slides/slides.js`, matching
the `slides.css` relocation note already flagged in PROJECT.md) should
provide:

- Next / previous slide, jump-to-slide
- Keyboard nav: `←` `→` `Space` `Page Up` `Page Down` `Home` `End`
- Progress bar + slide counter (`Slide 4 / 18`)
- Table of contents / section jump menu
- Fullscreen toggle
- Theme toggle (reuse `theme.js`, don't duplicate the 3-mode cycle)
- Reveal logic for `[poll]`/`[predict]` answer blocks

Explicitly **excluded** from `slides.js` (these are notes-only features and
reappearing here would blur the two systems): in-page search, bookmarks,
reading-time badge, study timer, exam highlight mode.

---

## WHAT'S DIFFERENT FROM STANDARD NOTES (quick reference)

| | Standard Notes | Presentation |
|---|---|---|
| Pacing | Read, self-paced, scrolling | See, click-through, one idea at a time |
| Structure | Theory collapsibles + 8 end sections | Title → Objectives → Section/Concept/Diagram/Example/Engage → Recap → Summary |
| Content per unit | Full paragraph explanations | ≤120 words / ≤5 bullets per slide |
| Study tools | Glossary, 25+ Interview Qs, 30+ MCQs, Checklist, Reflection Qs | None — light `[engage]` prompts only, no scoring/counts |
| Source handling | Transcript = guidance, expand freely | Deck = source to rewrite, never reproduce expression |
| Visuals | Generated diagrams, image-prompts collected at end | Generated diagrams, per-slide, never redrawing the source's diagram |
| CSS | `notes.css` | `slides.css`, independent, same theme variables |
| JS | Full study-tool script set | Navigation/chrome only |

---

## WHAT STAYS THE SAME AS THE STANDARD FILE

- PART 0's non-transcript-specific rules: Topic Boundary, Transcript vs
  Note Scope (read as "deck vs note scope"), Topic Granularity,
  Authoritative Sources, Conflict Resolution.
- Frontmatter mechanics for shared fields (`type`, `title`, `slug`, `date`,
  `keywords`, `tags`, `when_to_use`, `audience`, lecture/session credit
  fields).
- `audience` targeting's effect on tone/analogy depth (just not on
  quantity floors, since presentations have none).
- The image *quality* philosophy: every diagram answers a specific
  teaching question, not a generic "about this topic" depiction.
- The triggering subject's own visual palette and flat-icon style for
  generated diagrams (AWS's palette for AWS decks, DSA's for DSA decks, etc.).
- Links & References is still the final markdown block if the deck cites
  AWS docs, even though presentations skip the other 7 standard end
  sections.

**Not carried over:** the highlight system (`==...==` / `**...**`) — it's a
document-recall tool built for scrolling text, and doesn't map onto short
slide bullets. Don't add highlight markup to presentation markdown.

---

## PRESENTATION-SPECIFIC QUALITY CHECKLIST

- [ ] Filename follows `[subject]-[slug]-slides.md`, or `presentation: true` set explicitly
- [ ] `source_type` filled in frontmatter; `session_name` filled if the subject uses session credit (e.g. AWS), omitted if it doesn't (e.g. DSA)
- [ ] No sentence, bullet, or heading copied verbatim from the source deck
- [ ] No diagram, icon, or layout redrawn to closely resemble the source
- [ ] Every slide passes the 1-heading / ≤5-bullet-or-≤120-word cap
- [ ] No `concept`/`example`/`recap` slide is heading-only — each has at least 2 bullets or ~40 words (title/section-divider/diagram are the only exceptions)
- [ ] Every slide covers exactly one idea (splittable test passed)
- [ ] Every diagram slide answers a specific, stated teaching question
- [ ] `[engage]` slides used sparingly (~1 per section), never a full MCQ/interview bank
- [ ] `knowledge-check.json` only generated if `[poll]`/`[predict]` blocks exist
- [ ] No highlight markup (`==...==`, `**...**`) present anywhere
- [ ] Speaker notes omitted unless explicitly requested
- [ ] Output loads `slides.css` only — no `notes.css` dependency
- [ ] Deck ends with Recap (per section) → Summary, Links & References last if present
