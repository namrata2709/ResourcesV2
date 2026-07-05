# AWS Lab Instructions — Delta File
# Read this ALONGSIDE aws-standard-instructions.md, not instead of it.
#
# Everything in the standard file still applies to lab notes: PART 0 (Input
# Processing), frontmatter mechanics, audience targeting, the highlight
# system, the image system, content philosophy, and the 8 mandatory end
# sections in the same fixed order. This file only states what's DIFFERENT
# for labs. If something isn't mentioned here, assume the standard file's
# rule applies unchanged.

---

## WHAT TRIGGERS LAB MODE

A note is built in lab mode when EITHER of these is true:

1. The markdown filename matches `aws-[topic-slug]-session-[sessionname]-lab.md`
   (must contain `-session-` AND end in `-lab.md`)
2. Frontmatter explicitly sets `lab: true` (override, for when the filename
   doesn't follow the pattern exactly)

If neither is true, the file builds as a standard AWS note even if its
content looks lab-like — the trigger is structural (filename/frontmatter),
not a guess based on content.

---

## FILENAME & FOLDER PATTERN

```
aws-[topic-slug]-session-[sessionname]-lab.md
```

Examples:
- `aws-ec2-session-week3-lab.md`
- `aws-iam-roles-session-module2-lab.md`

The output folder inherits the FULL slug after `aws-`, including the
`-session-[sessionname]-lab` portion — this is automatic, not a separate
naming step:

```
src/data/notes/aws-[topic-slug]-session-[sessionname]-lab/
├── markdown/
│   └── aws-[topic-slug]-session-[sessionname]-lab.md
├── notes.html
├── images/
└── json/
```

This keeps multiple variants of the same topic (e.g. a standard EC2 note and
an EC2 lab from a specific session) in separate folders rather than
colliding. A lab is still a kind of note — it produces `notes.html` through
the exact same build pipeline as standard notes, just with a different
internal section structure.

`session_name` becomes a REQUIRED frontmatter field for lab notes (it's
optional for standard notes). `session_url`, `lecturer_name`, and
`lecturer_url` remain optional, same as standard notes — fill in whichever
you have; the lecture/session credit box renders whatever subset is present
(see standard file, lecture box behavior).

---

## FRONTMATTER — NO CHANGES BEYOND `session_name`

Same frontmatter fields as the standard file. `audience` works identically
for labs — `beginner` still gets more analogies and a larger glossary,
`exam` still gets heavier MCQ/exam-tip weighting, etc. (see standard file
PART 0.15). The only frontmatter difference: `session_name` is required, not
optional, since a lab is always tied to a specific session by definition.

---

## STRUCTURE — THE RATIO FLIPS

Standard AWS notes are theory-led with hands-on practice as one collapsible
near the end. Labs flip this: roughly 20% theory, 80% task execution.

### Fixed lab body order

```markdown
<collapsible-section o>
## Introduction
[Brief — what this lab builds and why, 2-3 sentences. Not a full theory
section. Open by default, same as standard notes.]
</collapsible-section>

<collapsible-section>
## Background

[Theory needed to understand the lab, structured as nested collapsibles for
what/why/when/how. This replaces the freely-named subtopic collapsibles from
the standard file's Theory section — for labs, theory exists ONLY to support
the tasks, not as a standalone deep-dive.]

<collapsible-section>
### What is [concept]?
[...]
</collapsible-section>

<collapsible-section>
### Why does it matter for this lab?
[...]
</collapsible-section>
</collapsible-section>

<collapsible-section>
## Lab Overview

[What this lab covers end to end. Architecture being built. Time estimate.
Cost estimate. Prerequisites.]
</collapsible-section>

<collapsible-section>
## What You Will Accomplish

[takeaways]
- [Concrete, checkable outcome 1]
- [Concrete, checkable outcome 2]
[/takeaways]
</collapsible-section>

<collapsible-section>
## Task 1: [Task name]

[Steps as <ol>. Every CLI command in full, fenced as code — a standalone
command gets its own ` ```bash `/` ```sql ` fenced block, a short command
mentioned inline gets single backticks — never left as a bare line of
text (see standard file's Supported Inline Elements, "Commands are never
bare text"). Screenshot placeholder after every console action — see
Hands-On Projects field reference in the standard file, Section 8. Cost
alert box ([warning]) before any billable step.]
</collapsible-section>

<collapsible-section>
## Task 2: [Task name]
[...]
</collapsible-section>

[...one collapsible per task, each its own <details> — never a bare h3
inside a parent h2 section. Every task is independently collapsible.]

<collapsible-section>
## Cleanup

[Mandatory. Every resource created in the lab gets an explicit teardown
step. This is not optional and not folded into the last task — it is its
own section so it can't be missed.]
</collapsible-section>
```

After Cleanup, the same 8 mandatory end sections from the standard file
follow, in the same fixed order:

1. Overall Summary
2. Glossary
3. Interview Questions
4. Multiple Choice Questions
5. Hands-On Projects *(optional — see below)*
6. Learning Checklist
7. Reflection Questions
8. Links & References

**Hands-On Projects in a lab note:** since the entire body of a lab IS a
hands-on project, the dedicated `[hands-on]` section (standard file, Section
8) is usually redundant and can be omitted — the Task collapsibles already
serve that role. Only include `[hands-on]` if the lab has an OPTIONAL
extended/bonus project beyond the core tasks.

---

## EXTENDED TASKS (optional)

If the lab has bonus/stretch tasks beyond the core lab, add them as their
own collapsibles after the last numbered Task and before Cleanup:

```markdown
<collapsible-section>
## Extended Task: [Name]
[Same structure as a regular Task — <ol> steps, screenshots, cost alerts.]
</collapsible-section>
```

Extended Tasks still get cleaned up in the same Cleanup section — don't
create a second cleanup block.

---

## NO BARE HEADINGS INSIDE COLLAPSIBLE SECTIONS

This is a hard structural rule specific to labs: every `h3`-level grouping
inside a `##`-level collapsible MUST be wrapped in its own `<details>`. A
bare `### Sub-step` heading floating inside a `<collapsible-section>` is not
allowed — wrap it as its own nested `<collapsible-section>` (see the
Background example above). This keeps long task lists collapsible
individually instead of forcing the whole task open or closed as one block.

---

## PERSONAL ACCOUNT SETUP (conditional, rare)

Only include this if explicitly requested. When included, it goes inside an
"Original Guided Lab" collapsible, positioned before Task 1:

```markdown
<collapsible-section>
## Original Guided Lab

<collapsible-section>
### Personal Account Setup
[Steps for setting up a personal AWS account to follow along, if this lab
was originally run in a sandbox/event-provided account.]
</collapsible-section>

[Rest of the original guided lab content, if relevant.]
</collapsible-section>
```

If not explicitly requested, omit entirely — do not add this by default.

---

## COST ALERTS

Every lab task that creates a billable resource gets a `[warning]` box
immediately before the step that creates it:

```markdown
[warning]This step creates a resource that may incur charges outside the
free tier. Estimated cost: [amount]. Remember to complete Cleanup at the
end of this lab.[/warning]
```

This is mandatory wherever a step is billable — it is not optional styling,
it's a safety requirement for learners working in their own AWS accounts.

---

## SCREENSHOTS

Same rules as the standard file's Hands-On Projects field reference: every
console action step gets a `screenshot:` line with filename and a caption
describing exactly what must be visible in the frame. Since a lab is almost
entirely console actions, expect a screenshot after nearly every step — this
is normal for labs, not over-documentation.

**`screenshot-guide.md` is auto-generated by Python** from `[screenshot-guide]`
blocks written inline in the markdown (see SUPPORTED INLINE ELEMENTS in the
standard file). Place one `[screenshot-guide]` block immediately after each
`screenshot:` line inside every Task collapsible — Python collects all of
them, groups by task, and writes `screenshot-guide.md` to the topic folder.
Since labs are screenshot-dense, expect a `[screenshot-guide]` block after
nearly every step. Never write `screenshot-guide.md` manually.

---

## WHAT STAYS EXACTLY THE SAME AS STANDARD NOTES

To be explicit about what this delta file does NOT change:

- PART 0 Input Processing (transcript handling, source priority, hallucination
  safeguard, topic boundary, granularity — all identical)
- Frontmatter mechanics and all fields except `session_name` becoming required
- `audience` targeting and its effect on glossary/MCQ/interview depth
- The highlight system (`==sentence==`, `**term**`) and density caps
- The image system (quality rule, target counts, AWS color palette,
  `[image-prompts]` block format)
- Glossary, Interview Questions, MCQ, Learning Checklist, Reflection
  Questions — same field syntax, same hard floors, same parsers
- Links & References — same `[ref]` syntax, always last
- The Comparison rule (only when genuine confusion risk exists)
- The Quality Checklist — all items still apply; add the lab-specific ones
  below

---

## LAB-SPECIFIC QUALITY CHECKLIST ADDITIONS

In addition to every item in the standard file's Quality Checklist:

- [ ] Filename follows `aws-[slug]-session-[name]-lab.md` exactly
- [ ] `session_name` filled in frontmatter (required for labs)
- [ ] Theory-to-task ratio is roughly 20/80, not theory-heavy
- [ ] Every task is its own `<details>` — no bare h3 inside a parent section
- [ ] Every console action step has a matching `screenshot:` line AND a co-located `[screenshot-guide]` block immediately after it
- [ ] Every billable step has a `[warning]` cost alert immediately before it
- [ ] Cleanup section exists and tears down every resource created
- [ ] Personal Account Setup included only if explicitly requested
- [ ] `[hands-on]` block omitted unless there's a genuine optional bonus
      project beyond the core lab tasks
- [ ] Every command (chmod, aws cli, docker, sql, etc.) is backtick- or
      fence-wrapped — none left as bare text that would render as a `<p>`
      instead of `<code>`/`<pre><code>`
