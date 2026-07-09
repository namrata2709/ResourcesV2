"""
parse_slides.py — Parses Presentation Mode markdown ([subject]-[slug]-slides.md)
into slides.html, plus diagram-prompts.md as a side effect (same pattern
image-prompts.md uses for standard notes).

Subject-agnostic: works for aws-*, dsa-*, or any future subject the pipeline
knows about (see generate_notes.py's TYPE_CONFIG/detect_subject). Nothing in
this file hardcodes "aws" — the caller passes the detected subject in and
every subject-facing string (title suffix, meta tags, data-subject attribute)
is derived from it. See SUBJECT_LABELS/SUBJECT_KEYWORDS below to add copy for
a new subject.

No JSON is written for presentation content. Poll/predict questions and
their reveal answers are authored directly in the slide markdown and
rendered straight into slides.html.

Trigger (checked by generate_notes.py before routing here) — either of:
    1. Presentation Mode (presentation-instructions.md):
       filename matches  [subject]-[slug]-slides.md   OR   presentation: true
    2. Video Slides mode (video-slides-instructions.md), a companion deck
       generated from an already-existing note rather than an uploaded
       source deck:  filename matches  [subject]-[slug]-slides-overview.md
       OR frontmatter sets  derived_from_note: true
       (this ALSO sets presentation: true, since it reuses this engine —
       generate_notes.py checks the video-slides trigger first so it isn't
       misdetected as Presentation Mode; the two modes only differ in
       output filename/folder, decided by generate_notes.py, not here)

Both modes share every function in this file unchanged — parsing and
rendering don't need to know which mode triggered them. Slide types
introduced by Video Slides mode (mistakes, exam-tips, cta) need no special
parsing branch below; they fall through to the generic plain-text+images
branch in parse_slide(), same as concept/example/recap/summary, and pick
up their distinct visual treatment from slides.css via the data-type
attribute alone.

Slide types:
    title | objectives | section-divider | concept | diagram | example |
    engage | comparison | stat | icon-grid | code | recap | summary |
    mistakes | exam-tips | cta   (Video Slides mode only, generic rendering)

Markdown block syntax:
    [slide type="..."]
    ## Heading
    - bullet
    - bullet
    [/slide]

    Images — usable inside ANY slide type, one or more per slide. Each
    occurrence becomes a numbered placeholder in the HTML and an entry in
    diagram-prompts.md, in document order:
    [image]
    CONCEPT: what this image should show
    caption: optional short caption shown under the placeholder
    [/image]
    ([diagram-prompt]...[/diagram-prompt] still works as an alias, for
    decks authored before [image] existed.)

    type="comparison" — 2-3 side-by-side columns:
    [column]
    title: On-Demand
    - No upfront commitment
    - Highest per-hour rate
    [/column]

    type="stat" — one or more big-number callouts:
    [stat]
    value: 99.999999999%
    label: Designed durability (11 nines)
    [/stat]

    type="icon-grid" — icon + short label, repeatable:
    [icon-item]
    icon: 🖥️
    label: Compute
    [/icon-item]

    type="code" — one code block, language optional:
    [code lang="bash"]
    aws s3 ls
    [/code]

    Inside an engage slide (exactly one of these):
    [think]...[/think]
    [scenario]...[/scenario]
    [poll] question \n A) opt \n B) opt \n [reveal]...[/reveal] [/poll]
    [predict] question \n [reveal]...[/reveal] [/predict]
    [pause]...[/pause]

    Optional, any slide — like presenter notes in Google Slides/PowerPoint:
    doesn't change the slide's own layout, shown/hidden on demand via the
    notes-panel toggle in the chrome bar instead of always being visible:
    [notes]
    Fuller explanation, in full sentences/paragraphs. Supports the same
    minimal markup as slide bodies (## headings, - bullets, paragraphs).
    [/notes]

Does NOT support the notes-only highlight system (==...==, **...**) — see
aws-presentation-instructions.md.
"""

import re
import os
import json
import html as html_mod

FILENAME_RE = re.compile(r'^[a-z0-9]+-[a-z0-9\-]+-slides\.md$')
# Video Slides mode companion source file — [subject]-[slug]-slides-overview.md
# Deliberately does NOT overlap with FILENAME_RE: that pattern requires the
# filename to END in "-slides.md", and this one ends in "-slides-overview.md",
# so a file can only ever match one of the two.
VIDEO_OVERVIEW_FILENAME_RE = re.compile(r'^[a-z0-9]+-[a-z0-9\-]+-slides-overview\.md$')

# Subject-facing copy for build_slides_html()'s <title>/meta tags. Add an
# entry here when a new subject gets Presentation/Video-Slides support —
# nothing else in this file needs to change.
SUBJECT_LABELS = {
    "aws": "AWS",
    "dsa": "DSA",
}
SUBJECT_KEYWORDS = {
    "aws": "AWS, cloud",
    "dsa": "DSA, algorithms, data structures",
}

SLIDE_BLOCK_RE = re.compile(
    r'\[slide\s+type="(?P<type>[a-z\-]+)"\]\s*(?P<body>.+?)\s*\[/slide\]'
    r'(?:\s*\[notes\]\s*(?P<trailing_notes>.+?)\s*\[/notes\])?',
    re.DOTALL,
)
ENGAGE_BLOCK_RE = re.compile(
    r'\[(?P<kind>think|scenario|poll|predict|pause)\]\s*(?P<body>.+?)\s*\[/(?P=kind)\]',
    re.DOTALL,
)
REVEAL_RE = re.compile(r'\[reveal\]\s*(?P<text>.+?)\s*\[/reveal\]', re.DOTALL)

# [image] is the current syntax; [diagram-prompt] is kept as an alias for
# decks authored before it existed. Both usable any number of times, in
# any slide type.
IMAGE_BLOCK_RE = re.compile(
    r'\[(?:image|diagram-prompt)\]\s*(?P<body>.+?)\s*\[/(?:image|diagram-prompt)\]',
    re.DOTALL,
)
IMAGE_PLACEHOLDER_RE = re.compile(r'<p>\x00IMG:(\d+)\x00</p>')

COLUMN_RE = re.compile(r'\[column\]\s*(?P<body>.+?)\s*\[/column\]', re.DOTALL)
STAT_RE = re.compile(r'\[stat\]\s*(?P<body>.+?)\s*\[/stat\]', re.DOTALL)
ICON_ITEM_RE = re.compile(r'\[icon-item\]\s*(?P<body>.+?)\s*\[/icon-item\]', re.DOTALL)
CODE_RE = re.compile(
    r'\[code(?:\s+lang="(?P<lang>[a-zA-Z0-9+#\-]*)")?\]\s*\n?(?P<body>.*?)\[/code\]',
    re.DOTALL,
)

NOTES_RE = re.compile(r'\[notes\]\s*(?P<text>.+?)\s*\[/notes\]', re.DOTALL)
OPTION_RE = re.compile(r'^[A-D]\)\s*(.+)$', re.MULTILINE)

ENGAGE_LABELS = {
    "think": "Think About It",
    "scenario": "Scenario",
    "poll": "Quick Poll",
    "predict": "Predict",
    "pause": "Pause & Discuss",
}

PRESENTATION_PATH_DEPTH = "../../../"


# ─── TRIGGER DETECTION ──────────────────────────────────────────────────────

def is_presentation(md_path: str, fm: dict) -> bool:
    if FILENAME_RE.match(os.path.basename(md_path).lower()):
        return True
    return bool(fm.get("presentation") is True)


def is_video_slides_overview(md_path: str, fm: dict) -> bool:
    if VIDEO_OVERVIEW_FILENAME_RE.match(os.path.basename(md_path).lower()):
        return True
    return bool(fm.get("derived_from_note") is True)


# ─── FIELD PARSING HELPER (key: value lines, shared by several blocks) ────

def parse_fields(block: str) -> dict:
    fields = {}
    for line in block.strip().splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip().lower()] = value.strip()
    return fields


# ─── INLINE TEXT (deliberately minimal — no highlight system) ─────────────

def render_inline(text: str) -> str:
    lines = [ln.rstrip() for ln in text.strip("\n").split("\n")]
    parts, bullets = [], []

    def flush():
        if bullets:
            items = "".join(f"<li>{html_mod.escape(b)}</li>" for b in bullets)
            parts.append(f"<ul>{items}</ul>")
            bullets.clear()

    for line in lines:
        if not line.strip():
            flush()
        elif line.startswith("## "):
            flush()
            parts.append(f"<h2>{html_mod.escape(line[3:].strip())}</h2>")
        elif line.startswith("# "):
            flush()
            parts.append(f"<h1>{html_mod.escape(line[2:].strip())}</h1>")
        elif line.startswith("- "):
            bullets.append(line[2:].strip())
        else:
            flush()
            parts.append(f"<p>{html_mod.escape(line.strip())}</p>")
    flush()
    return "\n".join(parts)


# ─── IMAGES (multi-image, any slide type) ──────────────────────────────────

def extract_images(body: str) -> tuple:
    """
    Replaces every [image]/[diagram-prompt] block in body with a
    \x00IMG:N\x00 token line (numbered in document order), and returns
    (body_with_tokens, images_list). images_list entries: {index, concept, caption}.
    """
    images = []
    counter = {"n": 0}

    def repl(m):
        counter["n"] += 1
        n = counter["n"]
        fields = parse_fields(m.group("body"))
        concept = fields.get("concept") or m.group("body").strip()
        caption = fields.get("caption")
        images.append({"index": n, "concept": concept, "caption": caption})
        return f"\n\x00IMG:{n}\x00\n"

    new_body = IMAGE_BLOCK_RE.sub(repl, body)
    return new_body, images


def render_body_with_images(body: str, images: list) -> str:
    """
    Runs render_inline() on body (which contains \x00IMG:N\x00 token
    lines), then swaps each rendered token paragraph for the actual
    visual placeholder div.
    """
    # render_inline wraps our bare token line in <p>...</p> like any other
    # plain-text line — swap those back out for the real placeholder markup.
    html = render_inline(body)

    def swap(m):
        n = int(m.group(1))
        img = next((i for i in images if i["index"] == n), None)
        if img is None:
            return ""
        caption_html = (
            f'<span class="visual-caption">{html_mod.escape(img["caption"])}</span>'
            if img.get("caption") else ""
        )
        return (
            f'<div class="visual-placeholder" data-image-index="{n}" aria-hidden="true">'
            f'Image goes here — see diagram-prompts.md #{n}{caption_html}'
            f'</div>'
        )

    return IMAGE_PLACEHOLDER_RE.sub(swap, html)


# ─── SLIDE PARSING ──────────────────────────────────────────────────────────

def parse_engage_block(kind: str, body: str) -> dict:
    reveal_match = REVEAL_RE.search(body)
    reveal = reveal_match.group("text").strip() if reveal_match else None
    body_no_reveal = REVEAL_RE.sub("", body).strip()

    options = OPTION_RE.findall(body_no_reveal) if kind in ("poll", "predict") else []
    question = body_no_reveal
    first_opt = re.search(r'^[A-D]\)\s', body_no_reveal, re.MULTILINE)
    if first_opt:
        question = body_no_reveal[: first_opt.start()].strip()

    return {"kind": kind, "question": question, "options": options, "reveal": reveal}


def parse_columns(body: str, idx: int) -> list:
    columns = []
    for m in COLUMN_RE.finditer(body):
        fields = parse_fields(m.group("body"))
        bullets = [ln[2:].strip() for ln in m.group("body").splitlines() if ln.strip().startswith("- ")]
        title = fields.get("title", "")
        if not title:
            print(f"⚠️  Slide {idx}: [column] block missing 'title:' — skipping")
            continue
        columns.append({"title": title, "bullets": bullets})
    if len(columns) < 2:
        print(f"⚠️  Slide {idx}: type=\"comparison\" needs at least 2 [column] blocks — got {len(columns)}")
    if len(columns) > 3:
        print(f"⚠️  Slide {idx}: {len(columns)} columns is dense for a comparison slide — consider splitting")
    return columns


def parse_stats(body: str, idx: int) -> list:
    stats = []
    for m in STAT_RE.finditer(body):
        fields = parse_fields(m.group("body"))
        if "value" not in fields or "label" not in fields:
            print(f"⚠️  Slide {idx}: [stat] block missing 'value:' or 'label:' — skipping")
            continue
        stats.append({"value": fields["value"], "label": fields["label"]})
    return stats


def parse_icon_items(body: str, idx: int) -> list:
    items = []
    for m in ICON_ITEM_RE.finditer(body):
        fields = parse_fields(m.group("body"))
        if "icon" not in fields or "label" not in fields:
            print(f"⚠️  Slide {idx}: [icon-item] block missing 'icon:' or 'label:' — skipping")
            continue
        items.append({"icon": fields["icon"], "label": fields["label"]})
    if len(items) > 8:
        print(f"⚠️  Slide {idx}: {len(items)} icon items is a lot for one slide — consider splitting")
    return items


def parse_code(body: str, idx: int) -> dict:
    m = CODE_RE.search(body)
    if not m:
        print(f"⚠️  Slide {idx}: type=\"code\" but no [code]...[/code] block found")
        return {"lang": "", "code": ""}
    return {"lang": (m.group("lang") or "").strip(), "code": m.group("body").rstrip("\n")}


def parse_slide(slide_type: str, raw_body: str, idx: int, external_notes: str = None) -> dict:
    slide = {"type": slide_type, "index": idx}

    # [notes] — visible only via the toggleable notes panel, never affects
    # this slide's own layout. Supports two authoring conventions:
    #   1. [notes]...[/notes] placed right after [/slide] (the convention
    #      every real deck actually uses) — passed in via external_notes,
    #      already extracted by SLIDE_BLOCK_RE.
    #   2. [notes]...[/notes] nested inside [slide]...[/slide] (the
    #      convention shown as the worked example in
    #      video-slides-instructions.md) — still supported for any deck
    #      authored that way.
    # external_notes takes priority since it's the far more common case;
    # falls back to an inside-body match if not present.
    if external_notes:
        slide["notes_html"] = render_inline(external_notes)
        body = raw_body.strip()
    else:
        notes_match = NOTES_RE.search(raw_body)
        slide["notes_html"] = render_inline(notes_match.group("text")) if notes_match else None
        body = NOTES_RE.sub("", raw_body).strip()

    if slide_type == "engage":
        m = ENGAGE_BLOCK_RE.search(body)
        if not m:
            print(f"⚠️  Slide {idx} is type=\"engage\" but has no think/scenario/poll/predict/pause block — skipping engage content")
            slide["engage"] = None
        else:
            slide["engage"] = parse_engage_block(m.group("kind"), m.group("body"))
        slide["html"] = None
        slide["images"] = []

    elif slide_type == "comparison":
        slide["columns"] = parse_columns(body, idx)
        remaining = COLUMN_RE.sub("", body).strip()
        body_tok, images = extract_images(remaining)
        slide["html"] = render_body_with_images(body_tok, images) if body_tok.strip() else ""
        slide["images"] = images

    elif slide_type == "stat":
        slide["stats"] = parse_stats(body, idx)
        remaining = STAT_RE.sub("", body).strip()
        body_tok, images = extract_images(remaining)
        slide["html"] = render_body_with_images(body_tok, images) if body_tok.strip() else ""
        slide["images"] = images

    elif slide_type == "icon-grid":
        slide["icon_items"] = parse_icon_items(body, idx)
        remaining = ICON_ITEM_RE.sub("", body).strip()
        body_tok, images = extract_images(remaining)
        slide["html"] = render_body_with_images(body_tok, images) if body_tok.strip() else ""
        slide["images"] = images

    elif slide_type == "code":
        slide["code"] = parse_code(body, idx)
        remaining = CODE_RE.sub("", body).strip()
        body_tok, images = extract_images(remaining)
        slide["html"] = render_body_with_images(body_tok, images) if body_tok.strip() else ""
        slide["images"] = []  # code slides don't carry visual-prompt images

    else:
        # title | objectives | section-divider | concept | diagram |
        # example | recap | summary — plain text + zero or more [image]s
        body_tok, images = extract_images(body)
        slide["html"] = render_body_with_images(body_tok, images)
        slide["images"] = images

    return slide


def parse_slides_body(body_md: str) -> list:
    slides = [
        parse_slide(m.group("type"), m.group("body"), i, external_notes=m.group("trailing_notes"))
        for i, m in enumerate(SLIDE_BLOCK_RE.finditer(body_md), start=1)
    ]
    if not slides:
        print("⚠️  No [slide type=\"...\"]...[/slide] blocks found in presentation markdown")
    return slides


# ─── SLIDE HTML ──────────────────────────────────────────────────────────

def render_engage_html(engage: dict) -> str:
    if engage is None:
        return ""
    kind = engage["kind"]
    label = ENGAGE_LABELS[kind]
    parts = [f'<div class="engage-card" data-kind="{kind}">']
    parts.append(f'<span class="engage-label">{html_mod.escape(label)}</span>')
    parts.append(f'<p class="engage-question">{html_mod.escape(engage["question"])}</p>')

    if engage["options"]:
        parts.append('<ul class="engage-options">')
        for i, opt in enumerate(engage["options"]):
            letter = chr(65 + i)
            parts.append(
                f'<li class="engage-option" data-option="{letter}">'
                f'<button type="button" class="engage-option-btn">{letter}) {html_mod.escape(opt)}</button>'
                f'</li>'
            )
        parts.append("</ul>")

    if engage["reveal"]:
        parts.append('<button type="button" class="engage-reveal-btn" data-reveal-toggle>Reveal</button>')
        parts.append(f'<div class="engage-reveal" hidden>{html_mod.escape(engage["reveal"])}</div>')

    parts.append("</div>")
    return "\n".join(parts)


def render_comparison_html(columns: list) -> str:
    parts = ['<div class="comparison-grid">']
    for col in columns:
        items = "".join(f"<li>{html_mod.escape(b)}</li>" for b in col["bullets"])
        parts.append(
            '<div class="comparison-column">'
            f'<h3 class="comparison-title">{html_mod.escape(col["title"])}</h3>'
            f'<ul>{items}</ul>'
            '</div>'
        )
    parts.append("</div>")
    return "\n".join(parts)


def render_stat_html(stats: list) -> str:
    parts = ['<div class="stat-row">']
    for s in stats:
        parts.append(
            '<div class="stat-card">'
            f'<span class="stat-value">{html_mod.escape(s["value"])}</span>'
            f'<span class="stat-label">{html_mod.escape(s["label"])}</span>'
            '</div>'
        )
    parts.append("</div>")
    return "\n".join(parts)


def render_icon_grid_html(items: list) -> str:
    parts = ['<div class="icon-grid">']
    for it in items:
        parts.append(
            '<div class="icon-item">'
            f'<span class="icon-item-glyph" aria-hidden="true">{html_mod.escape(it["icon"])}</span>'
            f'<span class="icon-item-label">{html_mod.escape(it["label"])}</span>'
            '</div>'
        )
    parts.append("</div>")
    return "\n".join(parts)


def render_code_html(code: dict) -> str:
    lang = code.get("lang") or ""
    lang_class = f' class="language-{html_mod.escape(lang)}"' if lang else ""
    return f'<pre class="slide-code"><code{lang_class}>{html_mod.escape(code["code"])}</code></pre>'


def render_slide_section(slide: dict) -> str:
    stype = slide["type"]

    if stype == "engage":
        body_inner = render_engage_html(slide["engage"])
    elif stype == "comparison":
        body_inner = (slide["html"] + "\n" if slide["html"] else "") + render_comparison_html(slide["columns"])
    elif stype == "stat":
        body_inner = (slide["html"] + "\n" if slide["html"] else "") + render_stat_html(slide["stats"])
    elif stype == "icon-grid":
        body_inner = (slide["html"] + "\n" if slide["html"] else "") + render_icon_grid_html(slide["icon_items"])
    elif stype == "code":
        body_inner = (slide["html"] + "\n" if slide["html"] else "") + render_code_html(slide["code"])
    else:
        body_inner = slide["html"]

    notes_data = ""
    if slide.get("notes_html"):
        notes_data = f'\n  <div class="slide-notes-content" hidden>{slide["notes_html"]}</div>'

    return (
        f'<section class="slide" data-type="{stype}" data-index="{slide["index"]}">\n'
        f'  <div class="slide-body">\n{body_inner}\n  </div>{notes_data}\n'
        f'</section>'
    )


def build_toc_entries(slides: list) -> list:
    entries = []
    for s in slides:
        if s["type"] == "section-divider":
            m = re.search(r'<h2>(.*?)</h2>', s.get("html") or "")
            entries.append({"index": s["index"], "title": m.group(1) if m else "Section"})
    return entries


# ─── OUTPUT: slides.html ────────────────────────────────────────────────

def build_slides_html(fm: dict, body_md: str, subject: str = "aws") -> tuple:
    """
    Returns (html_str, slides_list) — caller (generate_notes.py) writes the
    html and calls write_diagram_prompts() with the returned slides_list.

    subject: "aws" | "dsa" | any future subject key from TYPE_CONFIG.
    Drives the <title> suffix, meta description/keywords, and the
    data-subject attribute on <body>/#footerRoot — nothing else in this
    function is subject-specific. Defaults to "aws" only for backward
    compatibility with older call sites; generate_notes.py always passes
    the subject it already detected.

    T1-2: <body> no longer sets data-no-nav="true" — that single flag was
    the root cause behind Findings 25/26/29 (back button/breadcrumb,
    footer, and favorites all disappearing on the deck). Removing it lets
    site-config.js's existing `data-no-nav !== 'true'` check load
    navigation.js like any other page. notes-favorite.js and
    notes-accessibility.js are also now loaded directly here (via explicit
    <script> tags) rather than through notes-page-core.js's
    SHARED_MODULES list, since slides.html doesn't run that boot file at
    all — see slides.js's updated header comment for the other half of
    this fix (building/showing the breadcrumb, and hiding chrome on
    fullscreen).
    """
    slides = parse_slides_body(body_md)
    fm["slide_count"] = len(slides)

    title = fm.get("title", fm.get("slug", "Presentation"))
    keywords = fm.get("keywords", [])
    keywords_str = ", ".join(keywords) if isinstance(keywords, list) else keywords
    depth = PRESENTATION_PATH_DEPTH

    subject_label    = SUBJECT_LABELS.get(subject, subject.upper())
    subject_keywords = SUBJECT_KEYWORDS.get(subject, subject_label)

    toc_json = json.dumps(build_toc_entries(slides))
    sections_html = "\n".join(render_slide_section(s) for s in slides)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html_mod.escape(title)} - {html_mod.escape(subject_label)} Presentation</title>
<meta name="description" content="{html_mod.escape(title)} — {html_mod.escape(subject_label)} presentation deck.">
<meta name="keywords" content="{html_mod.escape(keywords_str)}, {html_mod.escape(subject_keywords)}">
<link rel="stylesheet" href="{depth}css/styles.css">
<link rel="stylesheet" href="{depth}css/notes/slides.css">
<script src="{depth}js/shared/site-config.js"></script>
</head>
<body data-subject="{subject}" data-mode="presentation">

<div id="pageLoader" class="page-loader">
    <div class="loader-spinner"></div>
    <p class="loader-text">Loading...</p>
</div>

<div id="slideProgress" class="slide-progress" role="progressbar" aria-label="Slide progress"></div>

<header class="slide-chrome slide-chrome-top">
  <button type="button" id="tocToggle" class="slide-chrome-btn" aria-label="Table of contents">&#9776;</button>
  <span id="slideCounter" class="slide-counter">1 / {len(slides)}</span>
  <div class="slide-chrome-right">
    <button type="button" id="notesToggle" class="slide-chrome-btn" aria-label="Toggle speaker notes">&#128221;</button>
    <button type="button" id="fullscreenToggle" class="slide-chrome-btn" aria-label="Fullscreen">&#9974;</button>
  </div>
</header>

<nav id="slideToc" class="slide-toc" hidden data-entries='{toc_json}'></nav>

<aside id="notesPanel" class="notes-panel" hidden>
  <div class="notes-panel-header">
    <span>Speaker Notes</span>
    <button type="button" id="notesPanelClose" class="notes-panel-close" aria-label="Close speaker notes">&times;</button>
  </div>
  <div id="notesPanelContent" class="notes-panel-content"></div>
</aside>

<main id="deck" class="slide-deck">
{sections_html}
</main>

<footer class="slide-chrome slide-chrome-bottom">
  <button type="button" id="prevSlide" class="slide-nav-btn" aria-label="Previous slide">&#8592;</button>
  <button type="button" id="nextSlide" class="slide-nav-btn" aria-label="Next slide">&#8594;</button>
</footer>

<div id="footerRoot" data-subject="{subject}"></div>

<script src="{depth}js/notes/notes-accessibility.js"></script>
<script src="{depth}js/notes/notes-favorite.js"></script>
<script src="{depth}js/notes/slides.js" async="false"></script>
</body>
</html>
"""
    return html, slides


# ─── OUTPUT: diagram-prompts.md ─────────────────────────────────────────

def write_diagram_prompts(slides: list, output_dir: str, slug: str):
    """
    Collects every [image]/[diagram-prompt] across every slide type (not
    just "diagram" slides — comparison/stat/icon-grid/concept/etc. can all
    carry images now) and writes one prompt file per deck.
    """
    entries = [
        (s["index"], img)
        for s in slides
        for img in s.get("images", [])
    ]
    if not entries:
        return

    lines = [f"# Diagram Prompts — {slug}\n"]
    for slide_idx, img in entries:
        lines.append(f"## Slide {slide_idx}, image #{img['index']}\n")
        lines.append(img["concept"])
        if img.get("caption"):
            lines.append(f"\nCaption: {img['caption']}")
        lines.append("")

    out_path = os.path.join(output_dir, "diagram-prompts.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"✅ diagram-prompts.md written: {len(entries)} images → {out_path}")
