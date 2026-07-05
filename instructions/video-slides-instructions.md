# Video Slides Instructions — Companion File
# Read this ALONGSIDE whichever instructions file generated the source note
# (aws-standard-instructions.md, aws-additional-lab-instructions.md,
# dsa-instructions.md, or any future subject's instructions file) AND
# aws-presentation-instructions.md AND linkedin-instructions.md — this file
# borrows from all of them rather than replacing any of them:
#
#   - Trigger pattern ("runs after a note already exists, only on request")
#     → same as linkedin-instructions.md
#   - Deck engine, HTML/CSS/JS, slide density caps, [engage] mechanics
#     → same as aws-presentation-instructions.md (slides.css / slides.js,
#       unchanged — see HTML/CSS/JS CONTRACT below)
#   - Slide content menu and depth
#     → the 12 YouTube-slide content types from the retired monolithic
#       instructions.md, kept as-is because they're a proven menu for this
#       exact use case
#
# This file is subject-agnostic. It works for any note the pipeline already
# knows how to generate — AWS, DSA, or any future subject added later — by
# reading the source note's own `type:` frontmatter and folder convention
# rather than hardcoding one subject's rules. Nothing here should need to be
# rewritten just because a new subject gets added; only extended if that
# subject's notes have a genuinely new structural concept.
#
# This file does not generate notes and does not require a source deck
# (pptx/pdf). The finished note IS the source, regardless of subject.

---

## WHEN THIS RUNS

Only two things need to both be true:

1. A note markdown file already exists for the topic — `aws-[slug].md`,
   `aws-[slug]-session-[sessionname]-lab.md`, `dsa-[slug].md`, or the
   equivalent for any future subject — either generated earlier in this
   conversation or supplied directly by the user.
2. The user explicitly asks for a video deck / YouTube slides / presentation
   for that topic.

Never generate a video deck as a side effect of generating a note. If the
user hasn't asked for one yet, don't produce one — just mention it can be
generated on request if it feels natural to (same restraint as the LinkedIn
post rule).

This mode does **not** require an uploaded `.pptx`/`.pdf` source deck —
that's what distinguishes it from `aws-presentation-instructions.md`'s
Presentation Mode, which rewrites an uploaded deck. Here, the already-
generated note is the only source, whatever subject it belongs to, and
there is no copyright-rewrite concern to manage — it's Claude's own content
being restructured, not a third party's.

---

## INPUT SOURCE — PULLED FROM THE NOTE, NOT RE-DERIVED

| Deck element | Pulled from note |
|---|---|
| Title slide | `title` frontmatter, plus `session_name`/`lecturer_name` if the subject's frontmatter has them (e.g. AWS) — omit the credit line entirely if the subject doesn't (e.g. DSA) |
| Learning objectives | `when_to_use` frontmatter + Overall Summary |
| Definition + analogy slides | Each top-level theory subtopic's opening explanation |
| Architecture/flow diagrams | Existing images (or animations, for subjects that use them — e.g. DSA's `animation_name`) already in the note's own assets. Reuse directly if the framing fits a slide, or produce a simplified/cropped slide-friendly version. No regeneration mandate — these are already Claude's own original assets, not a third-party source to rewrite around. |
| Key features / best practices | Bullet content already in the note's theory sections |
| Use cases | Real examples already written into the note |
| Common mistakes | Whatever form the subject's note already uses for this — AWS anti-pattern/limits content, DSA common-bug/complexity-mistake content (e.g. `spotbug`-type questions), or the equivalent for a future subject |
| Exam tips | Only pulled if the note's frontmatter has an `audience: exam` field (or equivalent) and it's set — subjects without that field simply skip this slide type, no special-casing needed |
| Speaker notes (all slides) | Rewritten from the note's own explanations into spoken narration — see SPEAKER NOTES ARE THE SCRIPT below |
| Hashtag-equivalent (tags) | `keywords` + `tags` frontmatter, used for `video_tags` |

Do not invent facts, numbers, or examples that aren't in the note — same
no-fabrication rule as the LinkedIn file.

---

## FILENAME & FOLDER PATTERN

The deck is a companion artifact of an existing note, not a new topic — it
lives inside that note's own folder, not a sibling `-slides` folder, using
whatever `[type-prefix]-[slug]` convention the source note's subject
already uses (`aws-[slug]`, `dsa-[slug]`, or a future subject's own
prefix).

**Inbox filename (as authored/dropped in for the pipeline to pick up):**

```
[subject]-[topic-slug]-slides-overview.md
```

e.g. `aws-ec2-slides-overview.md`, `dsa-graphs-slides-overview.md`. The
slug is required here — the inbox is a flat folder shared by every content
type, so the source markdown has to carry the topic slug to be routed to
the right existing note folder at all (same reasoning as a lab's
`-session-[name]-lab.md` filename). A matching topic folder
(`[subject]-[topic-slug]/`) must already exist from a standard note or lab
— if it doesn't, the build fails with an error rather than creating a new
folder.

**Once routed, the file is renamed to a fixed name inside that existing
folder** — the slug doesn't need repeating there since the folder itself
already carries it:

```
src/data/notes/[type-prefix]-[topic-slug]/  (existing note folder)
├── markdown/
│   ├── [type-prefix]-[topic-slug].md       (existing standard/lab note)
│   └── slides-overview.md                   (renamed on arrival — fixed filename)
├── notes.html                               (existing)
├── slides-overview.html                     (fixed filename, always)
├── images/                                   (existing — reused where possible)
└── json/
    └── knowledge-check.json                  (only if [poll]/[predict] blocks exist)
```

The output filename is always `slides-overview.html` — never slug-based —
since the folder name already carries the slug and the note already owns
`notes.html` as its fixed name in the same pattern. Only the *inbox*
filename is slug-based; that's purely a routing detail, not a change to
where or how the deck ultimately lives.

---

## FRONTMATTER

```yaml
---
type:                          # inherited from the source note (aws, dsa, or any future subject) — never re-authored
title:                         # inherited from the source note
slug:                          # inherited from the source note
topic_number:                  # inherited from the source note
date:
date_modified:
derived_from_note: true       # always true — marks this as a companion, not a standalone topic
presentation: true
audience:                     # inherited from the source note, if that subject has this field
session_name:                 # only if the subject's notes use session credit (e.g. AWS) — omit otherwise
session_url:
lecturer_name:
lecturer_url:
video_title:                  # separate from the note's title — written for YouTube discoverability
video_description:
video_tags: []                 # seeded from note's keywords + tags
thumbnail_prompt:              # one image-generation prompt for the video thumbnail
slide_count:                  # actual count produced
estimated_duration:           # sum of per-slide timing estimates, e.g. "8:30"
---
```

---

## STRUCTURE — FIXED DECK ORDER

Unlike Presentation Mode's generic concept/diagram/example loop, this deck
uses the 12-type YouTube slide menu, repeated per major theory subtopic in
the source note:

Every block below includes a `[notes]` placeholder. This is not
decorative — per SPEAKER NOTES ARE THE SCRIPT below, `[notes]` is
**mandatory on every slide, no exceptions, including title and CTA**. If a
slide is generated without one, that slide is incomplete, full stop.

```markdown
[slide type="title"]
# [video_title]
[subtitle, session/lecturer credit if present in the note]
[notes]
[0:00–m:ss] Cold-open hook narration — see SPEAKER NOTES ARE THE SCRIPT below.
[/notes]
[/slide]

[slide type="objectives"]
## What You'll Learn
- [3-5 objective bullets, from when_to_use + Overall Summary]
[notes]
[m:ss–m:ss] Narration walking through why these objectives matter.
[/notes]
[/slide]

... repeat the block below once per major theory subtopic in the note ...

[slide type="section-divider"]        (only if the note has 2+ subtopics — skip for single-topic notes)
## [Subtopic Name]
[notes]
[m:ss–m:ss] Brief narrated transition into this subtopic.
[/notes]
[/slide]

[slide type="concept"]
## [Subtopic]: what it is
[Definition + a plain-language analogy — this is the "hook" slide for the subtopic]
[notes]
[m:ss–m:ss] Narration explaining the definition/analogy in spoken language.
[/notes]
[/slide]

[slide type="diagram"]                 (only if the note has a diagram for this subtopic)
## [What this diagram answers]
[diagram-prompt]
CONCEPT: [the specific relationship/flow being shown — reuse the note's existing image if it fits, per INPUT SOURCE above]
[/diagram-prompt]
[notes]
[m:ss–m:ss] Narration walking through the diagram as it's shown on screen.
[/notes]
[/slide]

[slide type="concept"]
## Key Features
[≤5 bullets, pulled from the note's feature list for this subtopic]
[notes]
[m:ss–m:ss] Narration expanding each bullet in spoken language.
[/notes]
[/slide]

[slide type="example"]
## Use Case: [scenario name]
[Real example already written in the note, restated as a short walkthrough — ≤5 bullets OR ≤120 words. Not heading-only.]
[notes]
[m:ss–m:ss] Narration walking through the use case.
[/notes]
[/slide]

[slide type="mistakes"]                (only if the note has anti-pattern/limits content for this subtopic)
## Common Mistakes
[The specific anti-pattern(s) from the note's mistakes/limits content — ≤5 bullets OR ≤120 words. Not heading-only.]
[notes]
[m:ss–m:ss] Narration on why this mistake happens and how to avoid it.
[/notes]
[/slide]

... end repeat ...

[slide type="example"]                 (only if the note is a lab or has a hands-on section — skip for theory-only notes)
## Let's See It In Action
[Demo transition slide — signals a hands-on segment is coming in the video, does not itself contain lab steps]
[notes]
[m:ss–m:ss] Narration framing the upcoming demo.
[/notes]
[/slide]

[slide type="exam-tips"]               (only if audience: exam, or the note has exam callouts)
## Exam Tips
[The specific exam callouts from the note's frontmatter/content — ≤5 bullets OR ≤120 words. Not heading-only.]
[notes]
[m:ss–m:ss] Narration flagging what's exam-relevant and why.
[/notes]
[/slide]

[slide type="concept"]
## Best Practices
[The specific best-practice bullets from the note's content — ≤5 bullets OR ≤120 words. Not heading-only.]
[notes]
[m:ss–m:ss] Narration expanding each best practice.
[/notes]
[/slide]

[slide type="summary"]
## Summary
[5-8 top-level takeaways across the whole deck]
[notes]
[m:ss–m:ss] Narration recapping the deck's key takeaways.
[/notes]
[/slide]

[slide type="cta"]
## [Call to action]
[Link back to the full note's notes.html, subscribe/next-video prompt]
[notes]
[m:ss–m:ss] Sign-off narration — see SPEAKER NOTES ARE THE SCRIPT below.
[/notes]
[/slide]
```

Skip rules are structural, not optional style choices — a theory-only note
produces no demo-transition slide, a `beginner`/`intermediate` audience note
produces no exam-tips slide, and a subtopic with no documented anti-pattern
produces no mistakes slide. Don't pad the deck to hit the 12-type menu if
the note doesn't support a given type.

---

## SPEAKER NOTES ARE THE SCRIPT

This is the one place this file overrides Presentation Mode's default: in
`aws-presentation-instructions.md`, speaker notes are optional and off by
default. Here, they are **mandatory and on by default for every slide** —
they ARE the video script, not an optional extra. There is no separate
`[topic]-script.md` file anymore; everything that used to live in a
standalone script (intro/section/outro timing, narration, production notes)
now lives inside each slide's `[notes]` block.

```markdown
[slide type="concept"]
## S3 Storage Classes: what they are
- Multiple storage tiers for different access patterns
- Same durability, different cost/retrieval tradeoffs
[notes]
[0:45–1:20]
Think of storage classes like choosing between a desk drawer and a storage
unit. Standard is your desk drawer — instant access, costs more. Glacier
is the storage unit across town — cheap, but you have to plan ahead to get
something out of it.

🎬 Production: show the desk-drawer/storage-unit split-screen graphic while
narrating. On-screen text: "Same durability. Different cost."
[/notes]
[/slide]
```

Rules for `[notes]` blocks:

- **Timing estimate first** — `[m:ss–m:ss]`, sequential across the deck,
  summing to `estimated_duration` in frontmatter.
- **Narration in first-person practitioner voice** — same voice as the
  LinkedIn file's rule, written to be read aloud, not documentation prose
  read verbatim from the note.
- **Rewritten, not copied** — narration explains the slide's point in
  spoken language; it is not the note's paragraph pasted in with a
  timestamp glued on.
- **Production line optional per slide** — a `🎬 Production:` line for
  B-roll, on-screen text, or pacing cues, only where it adds something
  beyond what's obvious from the slide itself.
- **Title and CTA slides still get notes** — a title slide's notes cover
  the video's cold-open hook; the CTA slide's notes cover the sign-off.
  Nothing in the deck is exempt.

---

## SLIDE DENSITY LIMITS (hard caps — same as Presentation Mode)

- 1 heading per slide.
- Maximum 5 bullets per slide, OR maximum 120 words per slide, whichever is
  hit first. This cap applies to the **visible slide only** — the `[notes]`
  script narration is not subject to it.
- One idea per slide.

---

## INTERACTIVITY — OPTIONAL, RARE

`[engage]` slides (`[think]` / `[scenario]` / `[poll]` / `[predict]` /
`[pause]`) are supported by the same deck engine but rarely appropriate
here — this is a pre-recorded, narrated video, not a live session, so
there's no one in the room to answer a poll. Use only a `[pause]` or
`[think]` slide occasionally, scripted in the notes as a moment where the
narration explicitly tells the viewer to pause the video and think it
through, e.g. *"Take a second — pause here if you want to guess before I
tell you."* Skip `[poll]`/`[predict]`'s answer-reveal mechanics entirely
unless there's a genuine reason to use them; `knowledge-check.json` is
almost never needed for this deck type.

---

## HTML / CSS / JS — REUSES THE EXISTING DECK ENGINE, UNCHANGED

No new stylesheet or script. This deck loads the same `slides.css` /
`slides.js` used by Presentation Mode — same slide shell, same chrome, same
speaker-notes drawer (the right-side push panel, not a floating overlay).
The only behavioral difference is that the notes drawer is meant to be
opened by default when the deck is used for actual video recording, since
the notes ARE the script being read — no new toggle or panel component is
needed for that, it's just how this deck type is used.

New slide `data-type` values introduced by this file (`mistakes`,
`exam-tips`, `cta`) reuse existing CSS building blocks rather than
inventing new ones:

- `data-type="mistakes"` → same visual language as `.engage-card`, left
  border in a warning tone, no reveal button.
- `data-type="exam-tips"` → `.icon-grid` or `.stat-row`, whichever fits the
  content (a handful of short tips reads better as an icon grid; one or two
  hard numbers reads better as stat cards).
- `data-type="cta"` → same centered layout as `.slide[data-type="summary"]`,
  with a single prominent link/button to the note's `notes.html`.

---

## WHAT STAYS THE SAME AS aws-presentation-instructions.md

- Deck engine, chrome, keyboard nav, fullscreen, TOC, progress bar.
- Reuses whichever visual palette the subject's own notes already use for
  generated diagrams (e.g. the AWS Orange/Dark/Green/Blue flat palette for
  AWS notes) — this file doesn't define a palette of its own.
- The "could this be read aloud in under 20 seconds?" test for slide text.
- No highlight markup (`==...==`, `**...**`) — same reasoning, doesn't map
  to slide bullets.

## WHAT'S DIFFERENT FROM aws-presentation-instructions.md

| | Presentation Mode | Video Slides |
|---|---|---|
| Trigger | `-slides.md` filename or `presentation: true`, requires a source deck upload | Runs after a note already exists, on explicit request only — no upload needed |
| Source | Uploaded pptx/pdf, rewritten for copyright reasons | The already-generated note, restructured (no copyright concern) |
| Slide content menu | Generic concept/diagram/example loop | Fixed 12-type YouTube menu (title, objectives, definition+analogy, diagram, features, use cases, demo transition, mistakes, exam tips, best practices, summary, CTA) |
| Speaker notes | Optional, off by default | Mandatory, on by default — this IS the video script |
| Output location | Own `aws-[slug]-slides/` folder | Inside the existing note's folder, fixed filename `slides-overview.html` |
| Interactivity | `[engage]` used ~1/section | `[engage]` rare, narration-scripted pause moments only |

---

## QUALITY CHECKLIST

- [ ] Only generated because the user explicitly asked, and only after the source note already exists
- [ ] No fact, number, or example appears that isn't traceable to the source note
- [ ] Output is `slides-overview.html` inside the existing note's topic folder, not a new folder
- [ ] `video_title`, `video_description`, `video_tags`, `thumbnail_prompt` filled in frontmatter
- [ ] Deck follows the fixed 12-type order, with skip rules applied (no demo-transition on theory-only notes, no exam-tips unless warranted, no mistakes slide without source content)
- [ ] Every slide passes the 1-heading / ≤5-bullet-or-≤120-word visible-content cap
- [ ] No slide is heading-only — `Use Case`, `Common Mistakes`, `Exam Tips`, `Best Practices`, and `diagram` slides all have real body content, not just a title (title/section-divider/demo-transition are the only slides where a short/no body is by design)
- [ ] Every single slide has a `[notes]` block with a timing estimate and rewritten (not copied) narration — including title and CTA, no exceptions
- [ ] `estimated_duration` in frontmatter matches the sum of per-slide timing estimates
- [ ] No `[topic]-script.md` file generated — script content lives only in `[notes]` blocks
- [ ] Loads existing `slides.css`/`slides.js` only — no new stylesheet or script file
- [ ] `knowledge-check.json` omitted unless a `[poll]`/`[predict]` block is genuinely used
- [ ] No highlight markup present anywhere
