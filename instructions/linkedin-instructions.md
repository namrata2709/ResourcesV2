# LinkedIn Post Instructions — Companion File
# Read this AFTER an aws-*.md or dsa-*.md note has already been generated
# (via aws-standard-instructions.md, aws-additional-lab-instructions.md, or
# dsa-instructions.md). This file does not generate notes — it turns an
# already-finished note into a LinkedIn post. It replaces the old
# "LinkedIn Post" section that used to live inside the monolithic
# instructions.md.

---

## WHEN THIS RUNS

Only two things need to both be true:

1. A note markdown file already exists for the topic — `aws-[slug].md`,
   `aws-[slug]-session-[sessionname]-lab.md`, or `dsa-[slug].md` — either
   generated earlier in this conversation or supplied directly by the user.
2. The user explicitly asks for a LinkedIn post for that topic.

Never generate a LinkedIn post as a side effect of generating a note. If the
user hasn't asked for one yet, don't produce one — just mention it can be
generated on request if it feels natural to.

---

## INPUT SOURCE

Claude does NOT re-derive the topic from scratch. Pull everything from the
already-generated note:

| Post element | Pulled from note |
|---|---|
| Hook / opening line | `Introduction` section + `when_to_use` frontmatter |
| Topic name | `title` frontmatter |
| 3-4 key learnings | `Overall Summary` section + top-level theory subtopic headings |
| Tone / depth | `audience` frontmatter (`beginner` → plain-language hook, `exam` → certification-angle hook, etc.) |
| Hashtag seed terms | `keywords` + `tags` frontmatter |
| Link | note's page URL — `https://namrata2709.github.io/ResourcesV2/data/notes/[type-prefix]-[slug]/notes.html` |

Do not invent facts, numbers, or claims that aren't in the note. If the note
doesn't support a strong stat-driven variation (see below), skip that
variation rather than fabricate one.

---

## OUTPUT FILE

```
[type-prefix]-[slug]-linkedin-post.md
```

e.g. `aws-ec2-linkedin-post.md`, `dsa-merge-sort-linkedin-post.md`,
`aws-ec2-session-week3-lab-linkedin-post.md`

Delivered as a standalone file, same as `image-prompts.md` and
`screenshot-guide.md` — not part of the `notes.html` build pipeline, not
picked up by `generate_notes.py`. Plain markdown, not minified.

---

## STRUCTURE

```markdown
## Main Post
[Attention-grabbing opening — 1 line, no preamble]

[2-3 sentences: the problem/confusion this topic solves]

[3-4 bullet points: key learnings, pulled from Overall Summary]

[Call to action + link to the note]

[5-10 hashtags]

---

## Variations

### Short Version
[Same core message, under ~400 characters]

### Stats/Numbers Version
[Only if the note contains a concrete number, limit, or benchmark worth leading with]

### Question Format
[Opens with a question that mirrors a real confusion the note addresses]

---

## Engagement Tips
- Best posting window: [general guidance]
- Suggested hashtags: [ranked list, broad → niche]
- Who to tag: [only if genuinely relevant — e.g. AWS, re:Invent-style accounts — never fabricate handles]
```

---

## CONTENT RULES

- **Main post**: max 1300 characters, written so the first ~150 characters
  (before "see more") stand alone as a hook — don't waste them on a
  greeting or the topic name alone.
- **No jargon dump** — one technical term per sentence, explained in plain
  words, matching the `audience` level of the source note.
- **Bullets over paragraphs** for the key-learnings block — scannable on
  mobile.
- **One link only** — to the note's `notes.html` page. No secondary links.
- **Hashtags**: 5-10, mix of broad (`#AWS`, `#CloudComputing`, `#DSA`) and
  specific (derived from `keywords`/`tags` frontmatter, e.g. `#EC2`,
  `#MergeSort`).
- **Voice**: first-person, practitioner tone — "here's what confused me
  until..." not "this document explains..."
- **Never** copy full paragraphs verbatim from the note — the post
  summarizes and hooks, it doesn't excerpt.

---

## QUALITY CHECKLIST

- [ ] Main post ≤ 1300 characters, hook lands in first 150
- [ ] Every claim traceable to the source note — nothing fabricated
- [ ] 3-4 bullets pulled from Overall Summary, not reworded theory dump
- [ ] Exactly one link, pointed at the correct `notes.html` URL
- [ ] 5-10 hashtags, broad + specific mix
- [ ] Stats variation included only if the note has a real number to anchor it
- [ ] Tone matches the note's `audience` frontmatter
- [ ] Output filename follows `[type-prefix]-[slug]-linkedin-post.md`
