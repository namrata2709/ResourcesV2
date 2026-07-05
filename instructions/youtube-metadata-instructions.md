# YouTube Metadata Instructions — Companion File
# Read this AFTER an aws-*.md or dsa-*.md note has already been generated
# (via aws-standard-instructions.md, aws-additional-lab-instructions.md, or
# dsa-instructions.md). This file does not generate notes, scripts, or
# slides — it turns an already-finished note into YouTube upload metadata
# (title, description, tags, thumbnail text). It replaces the "Video
# metadata (title, description, tags, thumbnail)" line that used to live
# inside the old monolithic instructions.md's Video Script section.
#
# This is metadata for a video ABOUT the note's topic — it is unrelated to
# the DSA note's own "YouTube Recommendations" section (which links OUT to
# existing third-party videos as study references). Do not confuse the two.

---

## WHEN THIS RUNS

Only two things need to both be true:

1. A note markdown file already exists for the topic — `aws-[slug].md`,
   `aws-[slug]-session-[sessionname]-lab.md`, or `dsa-[slug].md` — either
   generated earlier in this conversation or supplied directly by the user.
2. The user explicitly asks for YouTube metadata for that topic (or asks
   for a video script/upload package that includes metadata).

Never generate this as a side effect of generating a note. If the user
hasn't asked for it yet, don't produce it.

---

## INPUT SOURCE

Claude does NOT re-derive the topic from scratch. Pull everything from the
already-generated note:

| Metadata element | Pulled from note |
|---|---|
| Core keyword phrase | `title` frontmatter |
| Search keywords | `keywords` frontmatter |
| Description hook | `Introduction` section + `when_to_use` frontmatter |
| Chapter/timestamp candidates | `##`-level theory subtopic headings, in order |
| Tag list seed | `keywords` + `tags` frontmatter |
| Difficulty framing | `audience` frontmatter (`beginner` → "no prior experience needed," `exam` → certification framing, etc.) |
| Companion link | note's page URL — `https://namrata2709.github.io/Resources/data/notes/[type-prefix]-[slug]/notes.html` |

Do not invent facts, numbers, or claims that aren't in the note. Timestamp
labels are derived from actual section headings in the note, not guessed
video pacing — if a script/slides file already exists for this topic in the
conversation, prefer its section timing over the note's headings for
timestamps.

---

## OUTPUT FILE

```
[type-prefix]-[slug]-youtube-metadata.md
```

e.g. `aws-ec2-youtube-metadata.md`, `dsa-merge-sort-youtube-metadata.md`,
`aws-ec2-session-week3-lab-youtube-metadata.md`

Delivered as a standalone file, same as `image-prompts.md` and
`screenshot-guide.md` — not part of the `notes.html` build pipeline, not
picked up by `generate_notes.py`. Plain markdown, not minified.

---

## STRUCTURE

```markdown
## Title Options
1. [Primary — keyword-first, ≤ 70 characters]
2. [Alternative — question format]
3. [Alternative — number/list format, only if the note supports a real count, e.g. "5 EC2 Instance Types Explained"]
4. [Alternative — beginner/exam framing, matched to `audience`]
5. [Alternative — problem/solution framing]

---

## Description

[Hook — 2-3 sentences, first 150 characters must stand alone above the "show more" fold]

[What this video covers — 3-5 bullet points, matched to the note's theory subtopics]

### Timestamps
0:00 Intro
[m:ss] [Chapter title — one per major theory subtopic, in note order]
[m:ss] Summary / Wrap-up

### Links
- Full written notes: [notes.html URL]
- [Other links only if present in the note's Links & References section]

### Tags (inline, end of description)
[5-10 hashtags, same style as the hashtag rules below]

---

## Tags (YouTube tag field)
[15-30 comma-separated tags, broad → specific, no # symbols]

---

## Thumbnail Text
1. [Option — 3-5 words max, high-contrast phrase]
2. [Option — alternative angle]
3. [Option — number/stat driven, only if the note supports one]

---

## Category & Playlist
- YouTube category: [Education / Science & Technology — pick one]
- Suggested playlist: [matches the note's series, e.g. "AWS for Beginners", "DSA Sorting Algorithms"]
```

---

## CONTENT RULES

- **Titles**: ≤ 70 characters (YouTube truncates beyond this in search
  results). Lead with the core keyword phrase, not a generic hook.
- **Description hook**: first ~150 characters must work standalone —
  that's all that shows before "Show more."
- **Timestamps**: must be in ascending order, must map to real section
  headings in the note (or the script, if one already exists) — never
  fabricate timing not grounded in actual content structure.
- **Tags field**: comma-separated, no `#`, mix broad terms (`AWS`, `Data
  Structures`) with specific ones pulled from `keywords`/`tags`
  frontmatter (`EC2`, `Merge Sort`). No duplicate tags across singular/
  plural forms.
- **Thumbnail text**: short enough to read at a glance on mobile — 3-5
  words, no full sentences.
- **Voice**: matches the note's `audience` level — a beginner note gets
  approachable, plain-language titles/descriptions; an exam-focused note
  can lead with certification framing.
- **Never** copy full paragraphs verbatim from the note into the
  description — summarize and hook, don't excerpt.

---

## QUALITY CHECKLIST

- [ ] Primary title ≤ 70 characters, keyword-first
- [ ] At least 5 title options, each a genuinely different angle (not reworded duplicates)
- [ ] Description hook stands alone in first ~150 characters
- [ ] Timestamps map to real section headings, in ascending order
- [ ] Exactly one companion link, pointed at the correct `notes.html` URL
- [ ] Tag field has 15-30 tags, no duplicates, no `#` symbols
- [ ] Thumbnail text options are 3-5 words, high-contrast phrasing
- [ ] Category and playlist suggestion included
- [ ] Every claim traceable to the source note (or existing script/slides) — nothing fabricated
- [ ] Output filename follows `[type-prefix]-[slug]-youtube-metadata.md`
