# AWS Standard Notes Generation Instructions
# Claude generates markdown → Python (generate_notes.py) converts to HTML + JSON locally.
# Standard topic notes only. No YouTube. No LinkedIn.
# Lab notes are a separate mode — see aws-additional-lab-instructions.md — but
# everything in this file (PART 0, frontmatter, highlight system, image
# system, content philosophy, the 8 mandatory end sections) still applies
# to labs unless that delta file explicitly says otherwise.

---

## PART 0 — INPUT PROCESSING

This section governs how Claude interprets source material BEFORE writing any
markdown. It applies only to AWS notes — DSA notes have no transcript or
lecture input and are generated from the topic name alone.

### 0.0 Topic Boundary

Transcripts frequently cover more than one AWS topic in a single session
(e.g. a session that touches EC2, AMIs, Instance Types, Pricing, Spot
Instances, and Auto Scaling in one continuous lecture). Before writing
anything, decide what belongs in THIS note:

- Generate notes only for the requested topic (the one named in `title`/`slug`).
- Treat closely related concepts mentioned alongside it as supporting
  material, not separate chapters.
- If another topic mentioned in the transcript deserves its own standalone
  note, explain it here only enough to support understanding of the
  requested topic — do not write its full documentation in this file.
- Do not merge multiple major AWS services into one note unless explicitly
  requested. One service, one note, by default.

### 0.0.1 Transcript vs Note Scope

A transcript will often reference topics from before or after the current
session — e.g. *"Last week we learned IAM. Today we'll use S3. Tomorrow
we'll learn CloudFront."* None of those neighboring topics automatically
earn a full chapter in this note.

- Expand only the topics required to understand the requested topic.
- Past or future topics get mentioned only when necessary for context (e.g.
  "S3 buckets use IAM policies for access control" needs a brief IAM
  mention, not an IAM lesson).
- Do not generate complete documentation for an unrelated service merely
  because it was mentioned in passing.

### 0.0.2 Topic Granularity

A note should represent one coherent learning unit. This governs how big or
small that unit should be — Topic Boundary (0.0) governs which service the
note is about, this governs how far inside that service to split.

- Entire services (e.g. Amazon S3) generally produce one note, even though
  the service has many features (buckets, versioning, lifecycle rules,
  replication, storage classes, access points, object lock, etc.) — these
  all live as subtopics inside the one S3 note.
- Large features that are commonly taught independently (e.g. S3
  Versioning, Lifecycle Rules, Cross-Region Replication) may become
  standalone notes ONLY if explicitly requested as their own topic.
- Do not automatically split a service into multiple notes just because it
  has many features. Default to one note per service unless told otherwise.

### 0.1 Expected Inputs

The generator may receive one or more of the following:

**Required**
- Session topic
- Transcript

**Optional**
- Previous topics (a prior generated note provided directly as input — see 0.9)
- Session slides
- Professor screenshots
- GitHub repository
- AWS documentation links
- Whitepapers
- Lab instructions
- Previous generated notes
- Session metadata (date, speaker, event)

The absence of optional inputs must never reduce the quality of the final notes.

### 0.2 Transcript Philosophy

Treat the transcript as lecture guidance, not final documentation.

The transcript tells you:
- what topics were covered
- how the instructor explained them
- examples used
- common questions
- emphasis given

It does not define the completeness of the notes.

Always generate complete beginner-friendly documentation even if the transcript
only briefly mentions a topic.

### 0.3 Transcript Quality

Transcripts frequently contain incorrect punctuation, duplicated sentences,
incomplete sentences, speech recognition errors, filler words, and repeated
explanations.

Before generating notes:
- repair obvious AWS terminology
- merge repeated explanations that restate the same point in the same way
- remove filler conversation
- preserve technical meaning

Never copy transcript wording directly.

**Repetition is not always noise.** If a concept is emphasised repeatedly
throughout the lecture — not just restated once, but returned to multiple
times, called out as important, or used in several different examples —
that's a signal of importance, not duplication to collapse. Reflect that
emphasis by expanding the concept further, reinforcing it with an extra
example, or calling it out with `==exam-highlight==` or an `[important]` box,
rather than simply deleting the repeated mentions. The rule is: merge
identical restatements, but let genuine recurring emphasis increase the
depth given to that concept.

### 0.4 Missing Information

If the transcript omits important AWS concepts, add them.

**Example**

Transcript: *"Today we'll configure IAM Roles."*

Expected output covers: what IAM Roles are, why they exist, internal
architecture, trust policies, permission policies, cross-account access, best
practices, pricing, security, common mistakes, exam tips.

The transcript is never the limit of the documentation.

**Standard depth for any AWS service note.** "Complete" is not a feeling —
every AWS service note should normally include all of the following, unless
a specific one is genuinely not applicable to that service:

- definition
- why it exists (the problem it solves)
- architecture
- workflow
- major components
- features
- use cases
- anti-patterns
- pricing
- security
- monitoring
- limits
- troubleshooting
- exam tips

This list maps directly onto the Theory subtopic collapsibles defined in
SECTION 1 (How It Works/Architecture, Pricing, Security Best Practices,
Common Mistakes & Troubleshooting, Exam Tips) — if a bullet above has no
home in an existing collapsible, fold it into the closest fitting one rather
than skipping it.

**Monitoring**, specifically, means: CloudWatch metrics, CloudWatch Logs,
CloudTrail, and AWS Config. Include only the ones relevant to the service —
not every service emits to all four. A note on S3 covers CloudWatch metrics,
CloudTrail (API activity), and Config (bucket compliance rules); it has no
meaningful CloudWatch Logs story unless paired with another service like
Lambda.

### 0.5 Authoritative Sources

When expanding beyond the transcript, use only:
- AWS Documentation
- AWS FAQs
- AWS Well-Architected Framework
- AWS Whitepapers
- AWS Training & Certification

Never use blogs as authoritative references.

### 0.6 Resolve Conflicts

If lecture content conflicts with official AWS guidance:
- use AWS documentation as the source of truth
- silently correct technical inaccuracies
- preserve the learning objective

Do not intentionally reproduce incorrect AWS information.

AWS services change frequently — new instance types, deprecated features,
revised limits, renamed consoles. If the transcript reflects older AWS
behavior than what is currently documented, update the content to match
current AWS documentation rather than the historical behavior described in
the lecture, unless the lecture is specifically discussing a legacy feature
or deprecated service as a deliberate topic (in which case, label it clearly
as legacy/deprecated rather than silently presenting it as current).

### 0.6.1 Hallucination Safeguard

0.6 above covers what to do when the transcript and AWS documentation
disagree. This covers the other case: when AWS documentation simply doesn't
say anything about a claim at all.

If official AWS documentation does not support a claim, do not invent an
explanation to fill the gap. Prefer omitting speculative information over
filling gaps with assumptions — an incomplete-but-accurate note is better
than a complete-but-fabricated one. This applies especially to: exact
numeric limits not explicitly published, internal AWS implementation details
AWS hasn't disclosed, and behavior inferred from a single example rather
than documented as a general rule. When genuinely uncertain, state the
behavior in qualified terms (e.g. "typically", "in most configurations")
rather than asserting it as an absolute fact.

### 0.6.2 New AWS Features

The reverse case also applies: if official AWS documentation has introduced
features after the lecture was recorded, integrate them with judgment rather
than ignoring them or dumping every new feature in indiscriminately.

- Include new features only when they materially affect how the service is
  used or understood — not every minor console tweak earns a mention.
- Integrate them naturally into the current architecture/workflow
  explanation, not as a bolted-on "what's new" addendum.
- Avoid describing the service's older, now-outdated behavior unless the
  note is specifically discussing legacy behavior as its own topic.

Set the `aws_doc_version` frontmatter field to the date Claude last checked
AWS documentation while writing this note (not the lecture date). If
`validated_against` is left empty, Python defaults it to `date`. Neither
field renders in the HTML — they exist so a future regeneration pass can
tell, at a glance, which notes are due for a freshness check without
re-reading every note's content.

### 0.6.3 GitHub Repositories

When a GitHub repository is supplied as input, use it only for:
- example code
- project structure
- deployment examples

Do not treat repository implementation details as authoritative AWS
documentation. A repo's README or code comments may be wrong, outdated, or
opinionated — if anything in the repo conflicts with AWS documentation,
AWS documentation wins (see 0.6).

### 0.6.4 Slides

When session slides are supplied as input, they take priority over transcript
wording when identifying diagrams, architecture, terminology, and visual
explanations — slides are a more deliberate, structured source than spoken
lecture audio.

Do not reproduce slide wording verbatim (same copyright/quality discipline
as the transcript). Use slides to improve accuracy and to recreate missing
visuals the transcript references but doesn't fully describe (see 0.12).

### 0.7 Student Questions

Questions from students are valuable educational material. Do not leave useful
discussions buried inside the transcript — route each one into whichever
existing section fits best:

| Question type | Destination |
|---|---|
| "What if...", "Why does it..." conceptual questions | Theory — as an `[important]` or `[note]` box near the relevant subtopic |
| "How do I troubleshoot..." | Theory — `## Common Mistakes & Troubleshooting` collapsible |
| Strong scenario/edge-case questions | Interview Questions (`application` or `tradeoffs` category) |
| Open-ended "what would happen if..." questions with no single right answer | Reflection Questions |
| Sharp factual questions with one correct answer | Multiple Choice Questions |

There is no standalone FAQ section — every student question must land in one
of the sections above, not be left as orphaned discussion.

### 0.8 Speaker Examples

Real-world stories, analogies, and examples should be preserved whenever they
improve understanding. Preserve effective teaching analogies as written — if
an analogy is technically inaccurate or likely to create a misconception,
refine it while preserving the instructor's underlying teaching intent,
rather than discarding it for a different one. Never remove a good teaching
example simply because it is informal.

### 0.8.1 Missing Demonstrations

Live console demonstrations are frequently mentioned but not actually
narrated — e.g. *"Let's create a bucket... [pause]... okay, done."* — leaving
no usable steps in the transcript.

When this happens, reconstruct the procedure using official AWS
documentation and standard AWS console behavior for that action, rather than
omitting the steps or leaving a gap. The reconstructed steps belong in
Implementation (Section 3) or as a Hands-On project (Section 8) as
appropriate to the topic.

### 0.8.2 Instructor-Specific Insights

Speaker commentary sits at the bottom of the source-priority list (0.10) for
factual accuracy — but operational experience is a different category from
facts, and shouldn't be discarded just because it ranks low as a documentation
source. A line like *"After 10 years on AWS, I always enable versioning
first"* is not competing with AWS documentation for correctness — it's a
practical recommendation AWS docs wouldn't state at all.

- Retain speaker recommendations that represent practical operational
  experience rather than AWS facts.
- Present them as best practices or practitioner tips (e.g. in an `[note]`
  box or within Security Best Practices/Common Mistakes), never phrased as
  if they were official AWS requirements.

### 0.9 Previous Topics

This applies only when a previous generated note is explicitly supplied as
input. If none is supplied, skip this entirely — there is no automatic
lookup of prior sessions.

When a previous topic IS supplied:
- maintain consistent terminology with it
- avoid rewriting identical theory already covered there
- briefly recap prerequisite concepts (1-2 sentences, not a re-explanation)
- build naturally on the previous session

Each note must still be fully understandable on its own — recapping a
prerequisite is not a substitute for the current topic's own completeness.

### 0.9.1 Consistent Terminology

This applies regardless of whether a previous note is supplied — it's a
standing rule for any course made of many notes (100+ over a full
curriculum), not just sessions with an explicit predecessor.

- Reuse the same terminology throughout the entire course. If a concept has
  a preferred name (e.g. "IAM Role" vs "Role" vs "Service Role"), pick one
  and use it consistently across every note where it appears.
- Avoid switching between equivalent terms purely for variety — that reads
  as inconsistency to a learner moving between notes, not stylistic
  richness.
- The exception is when explicitly explaining synonyms or alternate names
  AWS itself uses (e.g. noting that "EC2 Instance" and "virtual machine"
  are used interchangeably) — that's teaching content, not inconsistency.

### 0.10 Multiple Inputs

When multiple resources describe the same topic, priority order is:
1. AWS Documentation
2. AWS FAQs
3. AWS Well-Architected Framework
4. AWS Whitepapers
5. Session Slides
6. GitHub Repository
7. Transcript
8. Speaker commentary

FAQs sit above whitepapers here — they're typically more practical and
directly applicable than whitepaper-level architectural guidance.

Merge duplicate information into one coherent explanation — never present the
same fact twice because it appeared in two sources.

### 0.11 Ignore Low-Value Content

Do not include: greetings, breaks, jokes, repeated introductions, audience
chatter, unrelated discussions, logistics, event announcements.

Only retain information that improves learning.

### 0.12 Infer Missing Context

If the transcript references "this diagram" or "as shown earlier" and the
visual itself isn't available, recreate the missing explanation from AWS
knowledge instead of mentioning a missing visual. The reader should never see
a reference to something they can't access.

### 0.13 Maintain Educational Flow

Do not preserve lecture order if it produces confusing documentation.
Reorganise the content into the most logical learning sequence. The goal is
excellent documentation, not a transcript.

### 0.14 Completion Standard

Before writing any section, ask:
- Would a complete beginner understand this?
- Does this explain the "what", "why", "how", "when", and "when not"?
- Does it include pricing, security, limitations, best practices, and exam
  guidance where applicable?
- Would the reader need another resource after finishing?

If the answer suggests gaps remain, keep expanding until the topic is
complete.

### 0.15 Audience Targeting

The `audience` frontmatter field (PART 1) controls four dimensions of the
note: analogy depth, glossary size, MCQ difficulty mix, and interview depth.
`intermediate` is the baseline — the floors already defined throughout
PART 2 (20+ glossary, 30+ MCQ, 25+ interview) are the `intermediate` numbers.
Other audience values scale from there. If `audience` is left empty, treat
it as `intermediate`.

**`beginner`**
- Analogy depth: every subtopic opens with an analogy, not just Introduction.
  Avoid AWS jargon without immediately defining it inline.
- Glossary: 25+ terms (more than baseline — beginners need more terms defined,
  including ones an intermediate reader would already know).
- MCQ mix: 30+ total, but weighted toward basic — 18 basic / 9 intermediate /
  3 advanced.
- Interview depth: 25+ questions, weighted toward `easy`/`medium` — at least
  12 easy, 10 medium, 3 hard, 0 expert required (expert optional).

**`intermediate`** (default)
- Analogy depth: Introduction opens with an analogy; deeper subtopics may
  assume basic AWS familiarity.
- Glossary: 20+ terms (baseline, as already specified in SECTION 5).
- MCQ mix: 30+ total — 12 basic / 12 intermediate / 6 advanced (baseline, as
  already specified in SECTION 7).
- Interview depth: 25+ questions — at least 8 easy, 10 medium, 5 hard, 2
  expert (baseline, as already specified in SECTION 6).

**`advanced`**
- Analogy depth: analogies optional in Introduction only; deeper subtopics
  go straight to precise technical explanation, trade-offs, and edge cases.
- Glossary: 20+ terms, but skip basic AWS vocabulary an advanced reader
  already knows — focus glossary entries on this service's specific,
  less-common terminology.
- MCQ mix: 30+ total, weighted toward advanced — 6 basic / 12 intermediate /
  12 advanced.
- Interview depth: 25+ questions, weighted toward `hard`/`expert` — at least
  4 easy, 8 medium, 8 hard, 5 expert.

**`exam`**
- Behaves as a stricter version of `intermediate`: same theory depth as
  `intermediate` (do not thin out Theory), but with heavier weighting toward
  exam-relevant content.
- Analogy depth: same as `intermediate`.
- Glossary: 20+ terms minimum, but bias inclusion toward terms that actually
  appear in AWS certification exams over general vocabulary.
- MCQ mix: 35+ total (above baseline) — 10 basic / 15 intermediate / 10
  advanced — phrased in exam-style language (scenario-based, "MOST
  cost-effective", "which is NOT").
- Interview depth: 25+ questions, baseline mix, but every answer should
  explicitly call out if the fact is commonly tested.
- Exam Tips collapsible (SECTION 1) gets noticeably more depth than other
  audience values — this is where the extra rigor concentrates.

---

## OVERVIEW

Generate one AWS topic note as a single markdown file.
`generate_notes.py` auto-detects `aws-*.md` prefix, runs all parsers, and outputs:
- `notes.html` — complete rendered page
- `json/mcq.json`, `json/glossary.json`, `json/interview.json`, `json/checklist.json`
- `image-prompts.md` — GPT-4o prompts for all diagrams (always last)

No animation. No visual-mcq. No contest problems. No LeetCode problems.
Theory and code are the only static content Claude writes.
Interactive components are populated by JS from JSON files Python generates.

---

## FOLDER STRUCTURE

```
src/data/notes/aws-[slug]/
├── markdown/
│   └── aws-[slug].md             ← Claude generates this
├── notes.html                    ← Python generates from md
├── images/
│   ├── [slug]-[description].png  ← generated via image-prompts.md
│   └── screenshot-[action].png   ← captured manually by trainer
└── json/
    ├── mcq.json                  ← parse_mcq.py       (30+ questions)
    ├── glossary.json             ← parse_glossary.py  (20+ terms)
    ├── interview.json            ← parse_interview.py (25+ questions)
    ├── checklist.json            ← parse_checklist.py

src/data/notes/markdown/          ← inbox: drop aws-[slug].md here,
                                     generate_notes.py scans, creates folder,
                                     moves file in, builds.
```

Page URL pattern: `aws-[slug]/notes.html`

---

## PART 1 — FRONTMATTER

Claude fills every field. Python generates all HTML boilerplate from it.
Claude never writes DOCTYPE, head, meta tags, schema, or box components.

```yaml
---
type: aws
title:
slug:                         # lowercase-hyphen, matches filename: aws-[slug].md
topic_number:                 # session or topic number
date:                         # YYYY-MM-DD
date_modified:                # leave empty — defaults to date
version:                      # optional — e.g. "1.0". Omit entirely if not versioning this note.
status:                       # optional — Current | Outdated | Deprecated. Omit if not tracking status.
keywords: []                  # 6-10 search keywords
tags: []                      # 3-5 tags shown on page
when_to_use:                  # 1-2 sentences. Specific problem signals, not generic.
comparison_topic:             # null if none
audience:                     # beginner | intermediate | advanced | exam — see PART 0.15
aws_doc_version:               # optional — date Claude last checked AWS docs, YYYY-MM-DD
validated_against:             # optional — defaults to `date` if left empty
lecturer_name:                 # optional — shown in lecture box if present
lecturer_url:                  # optional
session_name:                  # optional
session_url:                   # optional
---
```

**What Python generates from frontmatter:**

| Fields | HTML generated |
|---|---|
| all | `<!DOCTYPE>`, `<html>`, full `<head>` |
| `title`, `keywords` | meta description (AWS variant, wording reflects `audience`) |
| `title`, `slug` | OG tags, canonical URL (`aws-[slug]/notes.html`) |
| `title`, `type` | `<title>` tag, CSS files |
| `tags` | `<div class="tags">` near the bottom |
| `when_to_use` | `highlight-box` |
| `lecturer_*`, `session_*` | `success-box` lecture/session credit block — renders lecturer line, session line, both, or neither, independently (not an all-or-nothing block) |
| `audience` | JSON-LD `educationalLevel` field (see table below) |
| `aws_doc_version`, `validated_against` | not rendered in HTML — internal freshness metadata only |

**`audience` → `educationalLevel` mapping:**

| `audience` value | `educationalLevel` in schema |
|---|---|
| `beginner` | "Beginner" |
| `intermediate` (default if unset) | "Beginner to Intermediate" |
| `advanced` | "Intermediate to Advanced" |
| `exam` | "Intermediate to Advanced (Exam Preparation)" |

**Auto-description formula (AWS), adjusted by `audience`:**
```
beginner:     [title] — a beginner-friendly introduction to AWS [service],
              covering core concepts, architecture, and practical use cases.
              Keywords: [keywords joined].

intermediate: [title] — covers AWS concepts, architecture, best practices,
              and exam preparation. Keywords: [keywords joined].
              Beginner to intermediate level.

advanced:     [title] — an in-depth look at AWS [service] covering advanced
              architecture, trade-offs, edge cases, and production
              considerations. Keywords: [keywords joined].

exam:         [title] — exam-focused AWS [service] notes covering everything
              tested on the relevant AWS certification, with emphasis on
              exam traps and high-yield facts. Keywords: [keywords joined].
```

**HTML body order Python generates:**
```
<body data-subject="aws">
  JSON-LD schema
  <div id="pageLoader"> ... </div>
  <div class="note-container">
    [success-box lecture credit — only if lecturer fields present]
    highlight-box (when_to_use)
    <div class="note-content">
      <!-- markdown renders here -->
    </div>
    <div class="tags"> ... topic tags ... </div>
    <div id="footerRoot" data-subject="aws"></div>
```

No title/header block inside body — title comes from `<title>` and OG tags only.

---

## PART 2 — MARKDOWN BODY

Sections in this exact order. Use `[collapsible-section o]` for open by default,
`[collapsible-section]` for closed. Python converts both to correct `<details>` tags.

---

### SECTION 1 — THEORY (content-driven, multiple collapsibles)

Theory is NOT one fixed block. Claude writes AS MANY `##`-level collapsibles as the
topic naturally needs, each named after its real subtopic.

**The only fixed rule:** the FIRST collapsible is always `## Introduction` (open by default).
Everything after is freely named by Claude based on what the topic actually needs.

```markdown
[collapsible-section o]
## Introduction

[Intuitive explanation. Everyday analogy first, then formal definition.]
[1 image: high-level overview diagram]
[/collapsible-section]

[collapsible-section]
## [Natural subtopic — e.g. "How It Works", "Key Components", "Architecture"]

[Prose. Tables. Code. Boxes as needed — see supported elements below.]
[1-2 images per 2-3 paragraphs of dense content]
[/collapsible-section]

[collapsible-section]
## [Another natural subtopic]

...continue with as many subtopic collapsibles as the topic needs...
[/collapsible-section]

[collapsible-section]
## Pricing

[Free tier details. Cost model. Key pricing levers. Cost traps to avoid.]
[/collapsible-section]

[collapsible-section]
## Security Best Practices

[IAM, encryption, network controls, least-privilege patterns specific to this service.]
[/collapsible-section]

[collapsible-section]
## Common Mistakes & Troubleshooting

[Real mistakes learners make. Symptoms + fixes. Error messages if relevant.]
[/collapsible-section]

[collapsible-section]
## Comparison
[Only if comparison_topic set in frontmatter. Omit entire collapsible otherwise.]

| Feature | [THIS SERVICE] | [OTHER SERVICE] |
|---------|---------------|-----------------|
| ...     | ...           | ...             |
[/collapsible-section]
```

**Comparison rule:** only create this section when learners are genuinely
likely to confuse the current service with another AWS service (e.g. S3 vs
EBS vs EFS, SQS vs SNS, RDS vs DynamoDB). Setting `comparison_topic` in
frontmatter signals that this confusion risk exists — it is not an
invitation to invent a comparison just to fill the section. If there's no
service learners would realistically confuse this one with, leave
`comparison_topic` empty and omit the collapsible entirely.

[collapsible-section]
## Exam Tips

[Specific exam traps, exact facts that are tested, what NOT to confuse.]
[Exam highlights should be concentrated here more than anywhere else.]
[/collapsible-section]
```

**Theory writing rules:**
- Open with an analogy a non-coder could follow
- Never use "easy", "simple", "trivial", "just", "obviously"
- 1 image per 1-2 paragraphs of dense content — more is always better
- Every `##` and `###` heading inside `.note-content` gets a unique id automatically
- Use `[note]`, `[important]`, `[warning]` boxes to break up dense paragraphs
- `==sentence==` for exam-highlight-sentence (max 1 per paragraph)
- `**term**` (≤40 chars) for exam-highlight-term — always inside a sentence, never standalone

**Content prioritisation (what earns space when transcript material is thin):**
When deciding what to expand on beyond what the transcript covers, prioritise
in this order: core AWS concepts → architecture → security → pricing → best
practices → common mistakes → troubleshooting → exam knowledge → practical
implementation → speaker-specific tips. This ordering maps directly onto the
subtopic collapsibles above (How It Works/Architecture, Pricing, Security Best
Practices, Common Mistakes & Troubleshooting, Exam Tips) — if time or source
material is limited, fill those collapsibles in this priority order rather
than spreading effort evenly across all of them.

---

### SECTION 2 — VISUALISATION (optional but strongly encouraged)

For architecture diagrams and process flows that show a concept visually.
Use `[image:filename|caption]` tags — Python builds the image gallery from them.

```markdown
[collapsible-section]
## Visualisation

[image:aws-[slug]-overview.png|High-level architecture showing all major components and data flow]
[image:aws-[slug]-detailed.png|Detailed internal architecture with request lifecycle]
[image:aws-[slug]-security.png|Security model showing IAM roles, policies, and encryption layers]
[image:aws-[slug]-pricing.png|Pricing model with cost breakdown by usage type]
[/collapsible-section]
```

**Rules:**
- Filenames must exactly match entries in `[image-prompts]` block (Section 9)
- 4-6 images recommended — last image is always a summary/cheat-sheet style diagram
- No `[image:...]` tags outside Visualisation expand as inline images in Theory

---

### SECTION 3 — IMPLEMENTATION (optional)

Use only when the topic has meaningful CLI/SDK/console setup worth showing.
For pure-concept topics (e.g. "What is IAM?"), omit this section entirely.

```markdown
[collapsible-section]
## Implementation

### Console Setup {#console-setup}

[Numbered steps for console — use `<ol>` style prose or actual HTML ol if needed]

### AWS CLI {#aws-cli}

```bash
# Create resource
aws [service] create-[resource] --name my-resource --region us-east-1

# List resources
aws [service] list-[resources]
```

### SDK (Python Boto3) {#sdk-python}

```python
import boto3
client = boto3.client('[service]')
response = client.create_[resource](Name='my-resource')
```
[/collapsible-section]
```

---

### SECTION 4 — OVERALL SUMMARY

Always present. 8-10 bullet points covering the most important facts.
Python places this first in the fixed end-section order.

```markdown
[collapsible-section]
## Overall Summary

[takeaways]
- [Most important fact about what this service is]
- [Key use case or problem it solves]
- [Critical architectural fact]
- [Pricing model in one line]
- [Most important security rule]
- [Key limit or quota to remember]
- [Most common exam trap]
- [One-line comparison to similar service if relevant]
[/takeaways]
[/collapsible-section]
```

---

### SECTION 5 — GLOSSARY

**Hard floor: 20+ terms**

```markdown
[collapsible-section]
## Glossary

[glossary]
t: [Term]
d: [Clear definition — one sentence]
e: [Concrete example — "e.g. ..." or a real-world analogy]
[/glossary]

[glossary]
t: IAM Role
d: An AWS identity with permissions that can be assumed by services or users
e: e.g. An EC2 instance assumes a role to write to S3 without needing access keys
[/glossary]

...20+ [glossary] blocks...
[/collapsible-section]
```

**Rules:**
- Every term used in Theory must appear in Glossary
- `t` = term, `d` = definition, `e` = example (all required)
- Include AWS-specific abbreviations, service names, and key config options

---

### SECTION 6 — INTERVIEW QUESTIONS

**Hard floor: 25+ questions**
All 3 difficulty levels and all 3 categories must be represented.

```markdown
[collapsible-section]
## Interview Questions

[interview]
q: What is [Service] and what problem does it solve?
a: [Interview-ready answer — not textbook. 2-3 sentences max. Include "why" not just "what".]
d: easy
cat: complexity
[/interview]

[interview]
q: [Scenario-based question — "You need to...", "A client reports..."]
a: (Situation) [Context]. (Task) [What needed doing]. (Action) [What you did]. (Result) [Outcome].
d: medium
cat: application
[/interview]

[interview]
q: [Architecture or trade-off question]
a: [Expert answer with trade-offs, constraints, real-world considerations]
d: hard
cat: tradeoffs
[/interview]

...25+ [interview] blocks...
[/collapsible-section]
```

**Difficulty values:** `easy` | `medium` | `hard` | `expert`
**Category values:** `complexity` | `implementation` | `application` | `tradeoffs`
**Mix required:** at least 8 easy, 10 medium, 5 hard, 2 expert minimum
**Scenario questions (application category):** use STAR format in `a` field
**Expert questions:** architecture decisions, cost trade-offs, anti-patterns

---

### SECTION 7 — MULTIPLE CHOICE QUESTIONS

**Hard floor: 30+ questions — 12 basic / 12 intermediate / 6 advanced**

```markdown
[collapsible-section]
## Multiple Choice Questions

[mcq]
q: [Question — exam-style phrasing, specific and concrete]
o: [Option A] | [Option B] | [Option C] | [Option D]
c: 1
e: [Option B is correct because... exact mechanism explained]
w: [Why other options are wrong — one reason per wrong option]
d: beginner
[/mcq]

[mcq]
q: A company needs to store 50 TB of infrequently accessed data at the lowest cost. Which S3 storage class should they use?
o: S3 Standard | S3 Standard-IA | S3 Glacier Instant Retrieval | S3 Glacier Flexible Retrieval
c: 3
e: S3 Glacier Flexible Retrieval has the lowest storage cost for infrequently accessed data where retrieval time of minutes to hours is acceptable.
w: Standard is for frequent access (higher cost). Standard-IA still costs more than Glacier. Glacier Instant Retrieval costs more than Flexible Retrieval.
d: intermediate
[/mcq]

...30+ [mcq] blocks...
[/collapsible-section]
```

**Field reference:**
- `q` = question text
- `o` = 4 options pipe-separated (exactly 4, no `|` inside option text)
- `c` = correct option index, **0-based** (0=A, 1=B, 2=C, 3=D)
- `e` = explanation for the correct answer
- `w` = why wrong options are wrong (optional but recommended)
- `d` = `beginner` | `intermediate` | `advanced` | `expert`

**MCQ rules:**
- Every wrong option must be a plausible distractor — never "None of the above", "All of the above"
- Explanation must teach, not just say "correct because X"
- Q1-12 `beginner`, Q13-24 `intermediate`, Q25-30+ `advanced`/`expert`
- Vary question styles: definition, scenario, comparison, "which is NOT", "MOST cost-effective"

---

### SECTION 8 — HANDS-ON PROJECTS (optional — include if topic has console/CLI practice)

```markdown
[collapsible-section]
## Hands-On Projects

[hands-on]
[project]
title: Project 1: [Descriptive name — what you build]
objective: [One sentence — what the learner will deploy/configure/tests]
time: 30-45 min
cost: Free tier eligible
prereqs: AWS account | [Service] basics | IAM admin access
step: Navigate to the [Service] console and click [Button name]
screenshot: screenshot-[action].png | Screenshot showing [exact UI state — fields, buttons, selections visible]
step: Configure [setting] by selecting [value] in the [panel name]
screenshot: screenshot-[next-action].png | Screenshot showing [what to verify]
step: [Continue all steps — every console action gets a screenshot]
step: Verify the resource was created by checking [what to look for]
screenshot: screenshot-verify.png | Screenshot showing successful [resource] creation with status [Active/Running]
[/project]

[project]
title: Project 2: [Next project]
...
[/project]
[/hands-on]
[/collapsible-section]
```

**Field reference:**
- `title` = project name (required)
- `objective` = one-sentence goal
- `time` = estimated duration
- `cost` = cost note (required — always state free tier or approximate cost)
- `prereqs` = pipe-separated list of prerequisites
- `step:` = one action step (repeat for every step)
- `screenshot:` = `filename.png | caption describing exactly what is visible`

Python renders `[hands-on]` blocks as **static HTML directly** — no JSON file,
no JS dependency. Each project becomes a `<details class="project-block">` with
a meta bar and a numbered `<ol>` of steps. Screenshot placeholders appear inline
in the step list.

**Rules:**
- Every console action step must be followed by a `screenshot:` line
- Every `screenshot:` line must have a co-located `[screenshot-guide]` block immediately after it (Python extracts these to `screenshot-guide.md`)
- Screenshot filenames in `screenshot:` and `[screenshot-guide]` blocks must match exactly
- Steps use imperative phrasing: "Navigate to...", "Click...", "Enter...", "Select..."
- Always include a Cleanup step at the end of every project (delete resources)
- Add a `[warning]` cost alert immediately before any billable step

---

### SECTION 9 — LEARNING CHECKLIST

**Hard floor: 16+ items total, 4+ per category**

```markdown
[collapsible-section]
## Learning Checklist

[checklist]
cat: 📚 Concepts Mastered
- Explain what [Service] is and the problem it solves
- Describe the [Service] architecture and core components
- Understand the [Service] pricing model and when free tier applies
- Identify when to use [Service] vs [Alternative]
- Explain the security model and IAM requirements
[/checklist]

[checklist]
cat: 🛠️ Skills Acquired
- Create and configure a [resource] via the console
- Set up IAM roles/policies for [Service]
- Monitor [Service] using CloudWatch metrics
- Implement [key security practice] for [Service]
[/checklist]

[checklist]
cat: 🎓 Exam Ready
- Answer questions about [Service] use cases and limits
- Distinguish [Service] from [similar service] in scenario questions
- Recall key limits: [limit 1], [limit 2], [limit 3]
- Identify cost-optimisation patterns for [Service]
[/checklist]

[checklist]
cat: 💼 Hands-On Done
- Completed Project 1: [project name]
- Cleaned up all resources (no ongoing charges)
[/checklist]
[/collapsible-section]
```

---

### SECTION 10 — REFLECTION QUESTIONS

5-8 questions. Static HTML — no JSON, no JS. Python renders hint-reveal elements.

```markdown
[collapsible-section]
## Reflection Questions

[reflection]
q: [Open-ended question that requires understanding, not recall]
hint: [One sentence pointing toward the answer without giving it]
[/reflection]

[reflection]
q: What would happen to your data if an EC2 instance using only instance store volumes was stopped?
hint: Think about the persistence model of instance store compared to EBS — which one survives a stop?
[/reflection]

...5-8 [reflection] blocks...
[/collapsible-section]
```

---

### SECTION 11 — LINKS & REFERENCES (always last)

```markdown
[collapsible-section]
## Links & References

[ref]
text: [Service] — Official AWS Documentation
url: https://docs.aws.amazon.com/[service]/
[/ref]

[ref]
text: AWS Well-Architected Framework — [Relevant Pillar]
url: https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html
[/ref]

[ref]
text: [Service] Pricing
url: https://aws.amazon.com/[service]/pricing/
[/ref]

[ref]
text: [Service] FAQs
url: https://aws.amazon.com/[service]/faqs/
[/ref]
[/collapsible-section]
```

---

### SECTION 12 — IMAGE PROMPTS (extracted by Python, never rendered in HTML)

One block per diagram in Visualisation (Section 2). Written after all other sections.
Python strips this block from HTML entirely and writes `image-prompts.md` to the topic folder.

```markdown
[image-prompts]
aws-[slug]-overview.png:
CONCEPT: [What architectural relationship or data flow this diagram shows]
SHOW:
- [Component 1] at left: [what it represents]
- [Component 2] in center: [what it represents]
- Arrow from Component 1 to Component 2: labeled "[action/data name]"
- [Any other key elements, labels, or annotations]

---
aws-[slug]-detailed.png:
CONCEPT: [What detailed internal mechanism this shows]
SHOW:
- [...]
[/image-prompts]
```

**Rules:**
- One entry per `[image:...]` tag in Visualisation — filenames must match exactly
- `CONCEPT:` = one sentence describing the diagram's teaching purpose
- `SHOW:` = precise element list — Python appends AWS color rules and canvas spec automatically
- Never write the full GPT-4o prompt — Python assembles it from CONCEPT + SHOW + fixed footer
- Never include screenshot files here — only diagram PNGs

---

## SUPPORTED INLINE ELEMENTS

### Info Boxes (use inside any collapsible)
```markdown
[note]Content for info-box — general tips, additional context[/note]
[important]Content for highlight-box — key rules, must-know facts[/important]
[warning]Content for error-box — cost alerts, common mistakes, destructive actions[/warning]
```

### Inline Images (Theory only — not Visualisation)
```markdown
[image:filename.png|Caption describing what is shown]
```
Renders as `<div class="diagram-container"><img ...><p class="image-caption">`.

### Code Tabs (Python/Java/C++ — use for DSA; AWS uses single-language blocks)
```markdown
<code-tabs>
```python
code here
```
</code-tabs>
```

### Exam Highlights
```markdown
==Full sentence that could appear on an exam verbatim==
**short term** inside a longer sentence (max 40 chars, must not be standalone)
```
`**term**` and `==sentence==` are reserved exclusively for exam highlights —
they are not generic bold/emphasis. Do not use them for ordinary bold text;
use `!!bold!!` from the table below instead.

### Inline Text Formatting

Standard Markdown already means something else in this system (`**`/`==`
are reserved for exam highlights above), so ordinary text formatting uses
a different set of markers. Python's `inline_fmt()` generates the actual
HTML tags — **never write raw `<b>`, `<i>`, `<u>`, `<strong>`, `<em>`,
`<mark>`, `<sup>`, `<sub>`, `<small>`, `<kbd>`, `<ul>`, `<ol>`, or `<li>`
tags directly in markdown.** Write the marker syntax and Python generates
the tag.

| Purpose | Syntax | Generates |
|---|---|---|
| Bold | `!!text!!` | `<strong>` |
| Italic | `//text//` | `<em>` |
| Underline | `++text++` | `<u>` |
| Strikethrough | `~~text~~` | `<del>` |
| Mark/Highlight | `%%text%%` | `<mark>` |
| Superscript | `^^text^^` | `<sup>` |
| Subscript | `,,text,,` | `<sub>` |
| Small text | `{{--text--}}` | `<small>` |
| Keyboard key | `[[Ctrl]]` | `<kbd>` |
| Inline code | `` `code` `` | `<code>` (standard) |
| Code block | ` ```lang ` | `<pre><code>` (standard) |
| Link | `[text](url)` | `<a href>` (standard) |
| Bulleted list | `- item` | `<ul><li>` (standard) |
| Numbered list | `1. item` | `<ol><li>` (standard) |

**Italic caveat:** `//italic//` is guarded against firing inside bare
`https://`/`http://` text, but this is a mitigation, not a guarantee — two
unrelated bare URLs on the same line can still collide. Prefer
`[text](url)` markdown links over pasting a bare URL into prose.

**Commands are never bare text.** Any shell/Linux command, AWS CLI
invocation, SQL/DB statement, config file content, or other
copy-pasteable command — in a standard note OR a lab note — must be
wrapped in code syntax, never left as a plain line of prose:
- Single short command inline in a sentence → single backticks:
  `` `chmod 400 key.pem` ``
- Standalone command(s) on their own line(s) → a fenced code block:
  ` ```bash `, ` ```sql `, ` ```yaml `, etc., with the closing ` ``` ` on
  its own line.

This isn't a style preference — it's how the parser decides what to
render. `convert_sections()` in `generate_notes.py` only produces
`<code>`/`<pre><code>` for backtick/fence syntax; any other line of text
becomes a bare `<p>` paragraph. A command left unfenced renders as
ordinary prose in the final page, indistinguishable from surrounding
instructions. Fence it even inside a Task/Hands-On step's prose, not just
in dedicated code sections.

**Never use a literal `|` inside MCQ/visual-mcq option text** (see those
sections) — same reasoning as the marker characters above: the parser
splits on it, so an accidental one produces the wrong number of options.
The parser will attempt to recover a stray extra `|` by merging it back
into the last option (with a warning printed), but don't rely on that —
write "or" in words instead.

### References (inside Links & References section)
```markdown
[ref]
text: Display name
url: https://...
[/ref]
```

### Screenshot Guide Blocks (AWS only — one per screenshot)

Write one `[screenshot-guide]` block per screenshot, anywhere in the
markdown body. Python extracts all of them, groups by task, and writes
`screenshot-guide.md` to the topic folder. Never write `screenshot-guide.md`
manually — let Python generate it.

```markdown
[screenshot-guide]
file: screenshot-create-bucket.png
task: Task 1: Create the Bucket
step: Click Create Bucket and fill in the Bucket name field
show: Bucket name field filled with "my-lab-bucket-2026", Region set to us-east-1, all other fields at defaults
note: Zoom in so the bucket name field is clearly readable
[/screenshot-guide]
```

**Fields:**
- `file` — filename, must exactly match the `screenshot:` line in the Task collapsible (required)
- `task` — which task this belongs to, used for grouping in the output file (required)
- `step` — the console action being captured, imperative phrasing (required)
- `show` — exactly what must be visible in the frame (required)
- `note` — optional extra instruction for the trainer (e.g. "Zoom in on the status badge")

**Placement convention:** place the `[screenshot-guide]` block immediately after the `screenshot:` line it documents inside the Task collapsible, keeping them co-located and easy to audit.

---

## HIGHLIGHT SYSTEM

Before adding ANY highlight, ask: **Can this be directly asked on an exam?**
If YES → highlight. If NO → do not.

**Sentence highlights** (`==...==`): definitions, rules, constraints, key behaviors.
Test: removing this sentence breaks understanding.

**Term highlights** (`**...**`): numbers, keywords, short phrases (max 2-3 words).
Test: could this be a one-word/short-answer question?
**Critical:** term must always be embedded inside a full sentence. Never standalone.

**Combined pattern (preferred):**
```markdown
==Security Groups are **stateful**, meaning return traffic is automatically allowed.==
```

**Density:**
- Simple topic → 8-13 highlights
- Medium topic → 13-20 highlights
- Exam-heavy topic → 20-30 highlights
- Hard limit: never more than 30% of content

**Priority order:** Rules/constraints → Definitions → Key differences → Numbers/limits → Core concepts

**Never highlight:** analogies, explanations, repeated content, obvious statements.

---

## FIXED SECTION ORDER (enforced by Python)

Python's `reorder_sections()` always outputs sections in this order regardless of
how Claude ordered them in the markdown:

1. Theory collapsibles (Introduction + freely-named subtopics) — original authored order
2. Overall Summary
3. Glossary
4. Interview Questions
5. Multiple Choice Questions
6. Hands-On Projects
7. Learning Checklist
8. Reflection Questions
9. Links & References

Claude should still write them in this order for clarity, but Python enforces it.

---

## IMAGE SYSTEM

**Image quality (more important than count):**
Every diagram must answer one specific teaching question — not just depict
a topic generically.

- Poor: an architecture diagram with unlabeled boxes showing "the general
  shape" of a service.
- Good: a diagram explaining exactly how a request flows through an ALB
  before reaching EC2 instances, with each hop labeled.

When writing the `CONCEPT:` line in an `[image-prompts]` block (Section 12),
state the specific question the diagram answers, not just the topic it's
"about." This does more for prompt quality than raising the image count.

**Target counts:**

| Topic Type | Minimum | Target |
|---|---|---|
| Simple concept | 4 | 6+ |
| Medium concept | 6 | 8+ |
| Complex service | 8 | 10+ |
| Exam-heavy | 10 | 12+ |
| Comparison topic | 4 | 6+ |
| Process/Lifecycle | 5 | 8+ |

Rule: 1 image per 1-2 paragraphs. If you can visualize it, draw it.

**AWS image style (applied automatically by Python via fixed footer):**
- Canvas: 1200×800px, white background `#FFFFFF`
- AWS Orange: `#FF9900` | AWS Dark: `#232F3E` | Green: `#3F8624` | Blue: `#0073BB`
- Arial font only, flat icons, no shadows or gradients, min 30px padding

**Naming convention:** `aws-[slug]-[descriptive-purpose].png`
**Screenshot naming:** `screenshot-[descriptive-action].png`

**Screenshot guide** (`screenshot-guide.md`):
Python generates this automatically from `[screenshot-guide]` blocks in the
markdown (see `[screenshot-guide]` block reference below). Claude writes one
`[screenshot-guide]` block per screenshot anywhere in the markdown body —
Python extracts all of them, groups by task, and writes `screenshot-guide.md`
to the topic folder. Claude no longer produces this as a separate artifact.

---

## CONTENT PHILOSOPHY

### Story Test
"Could I explain this to a friend over coffee?" → If no, rewrite conversationally.

### Visual Test
"Can I visualize this?" → If yes, add a diagram. When in doubt, add it anyway.

### So What Test
State "what" + immediately explain "why it matters."
❌ "Security Groups are stateful."
✅ "Security Groups are stateful, meaning return traffic is auto-allowed — no separate inbound rule needed for responses."

### Grandmother Test
"Could my grandmother understand the analogy?" → If no, find a better one.

### Completeness Rule
The transcript is a starting point, not a limit. Always produce 100% complete,
beginner-friendly notes regardless of how much the transcript covers.
If a service is only mentioned by name → write full notes on it.
Always include even if not mentioned: full definition, architecture, all features,
pricing, security best practices, use cases, anti-patterns, common mistakes, exam facts.

---

## QUALITY CHECKLIST

Before finalising, verify every item. Quantity floors are HARD requirements.

- [ ] Note covers only the requested topic — related topics kept as supporting context, not full chapters
- [ ] Note granularity correct — one note per service by default, not split by feature unless requested
- [ ] Glossary/MCQ/Interview counts and difficulty mix match the `audience` field's targets (PART 0.15)
- [ ] No claim made beyond what AWS documentation actually supports — no invented specifics to fill gaps
- [ ] Transcript repaired (terminology, filler, duplication) — never copied verbatim
- [ ] Repeated/emphasised concepts reflected with extra depth, not just deduplicated away
- [ ] All low-value content (greetings, logistics, chatter) excluded
- [ ] Topics only briefly mentioned in transcript are still fully expanded
- [ ] Any lecture/AWS-doc conflicts resolved in favor of AWS documentation (current, not legacy, behavior)
- [ ] Student questions routed into Theory/Interview/Reflection/MCQ — none left orphaned
- [ ] Genuine instructor experience/opinions retained and labeled as practitioner tips, not AWS facts
- [ ] No important AWS feature omitted
- [ ] Monitoring covers only the relevant CloudWatch/CloudTrail/Config pieces for this service
- [ ] Every comparison is technically accurate
- [ ] Comparison section present only where real confusion risk exists — not invented to fill space
- [ ] Terminology consistent throughout — no unexplained synonym-switching
- [ ] Every diagram answers a specific teaching question, not a generic "about this topic" depiction
- [ ] Every generated diagram (Visualisation/Image Prompts) has corresponding theory explaining it
- [ ] Frontmatter all fields filled, `date_modified` empty on first publish
- [ ] First collapsible is `## Introduction` (open by default with `[collapsible-section o]`)
- [ ] Remaining theory collapsibles freely named after actual subtopics
- [ ] `when_to_use` names specific problem signals — not generic service description
- [ ] Theory opens with analogy a non-coder can follow
- [ ] No "easy", "simple", "trivial", "just", "obviously" in theory
- [ ] Exam highlights within density limits — max 1 `==sentence==` per paragraph
- [ ] Every term highlight embedded inside a full sentence, never standalone
- [ ] Every subtopic past 3 paragraphs has a visual break (image, box, or table)
- [ ] **Glossary: 20+ terms** (hard floor) — every theory term covered
- [ ] **Interview Questions: 25+ questions**, all 4 categories and all 4 difficulties (hard floor)
- [ ] Every interview answer is interview-ready, not textbook
- [ ] **MCQs: 30+ questions** — 12 basic / 12 intermediate / 6 advanced+ (hard floor)
- [ ] Every MCQ wrong option is a plausible distractor — no "all/none of the above"
- [ ] Every MCQ explanation teaches, not just says "correct because X"
- [ ] **Reflection Questions: 5-8 questions** with hints (hard floor)
- [ ] **Learning Checklist: 16+ items total, 4+ per category** (hard floor)
- [ ] Checklist `Hands-On Done` category references actual projects from Section 8
- [ ] Image count meets or exceeds Target from the table above
- [ ] Image filenames in Visualisation match filenames in Image Prompts exactly
- [ ] Summary has 8-10 takeaways
- [ ] Links & References includes official AWS docs, pricing page, and FAQs
- [ ] Image prompts generated for every diagram in Visualisation (never for screenshots)
- [ ] Every screenshot in [hands-on]/Task collapsibles has a matching `[screenshot-guide]` block co-located in the markdown
- [ ] Every command (shell, CLI, SQL/DB, config) is wrapped in backticks or a fenced code block — none left as bare prose that would render as a `<p>`
