"""
build.py — DSA/AWS Notes Markdown to HTML converter
Usage: python build.py <topic-slug-or-md-path>
Converts a markdown note file into a complete HTML page + all JSON files.
"""

import sys
import os
import re
import json
import html as html_mod

try:
    import yaml
except ImportError:
    print("Missing dependency: pip install pyyaml")
    sys.exit(1)

from utils.parse_mcq import parse_mcq
from utils.parse_glossary import parse_glossary
from utils.parse_interview import parse_interview
from utils.parse_checklist import parse_checklist
from utils.parse_problems import parse_problems
from utils.parse_contest import parse_contest
from utils.parse_visual_mcq import parse_visual_mcq
import utils.animate as animate


# CONFIG — type-based rules

TYPE_CONFIG = {
    "dsa": {
        "title_suffix": "DSA Notes",
        "extra_css":    "dsa-notes.css",
        "path_segment": "data/notes/dsa/",
        "path_depth":   "../../../../",
        "base_url":     "https://namrata2709.github.io/Resources/data/notes/dsa/",
    },
    "aws": {
        "title_suffix": "AWS Notes",
        "extra_css":    "aws-notes.css",
        "path_segment": "data/notes/aws/",
        "path_depth":   "../../../../",
        "base_url":     "https://namrata2709.github.io/Resources/data/notes/aws/",
    },
}

SITE_BASE = "https://namrata2709.github.io/Resources/"


# ENTRY POINT

def build_html(md_path: str) -> str:
    raw = read_file(md_path)
    frontmatter, body_md = parse_frontmatter(raw)
    validate_frontmatter(frontmatter)

    md_dir = os.path.dirname(md_path)
    # If md lives inside a markdown/ subfolder (dsa-[slug]/markdown/x.md),
    # the real topic root is one level up -- that's where json/, images/,
    # notes.html, and the animation html all belong.
    topic_root = os.path.dirname(md_dir) if os.path.basename(md_dir) == "markdown" else md_dir
    frontmatter['_output_dir'] = topic_root

    cfg = TYPE_CONFIG.get(frontmatter.get("type", "dsa"), TYPE_CONFIG["dsa"])

    html_parts = [
        build_doctype(),
        build_head(frontmatter, cfg),
        build_body(frontmatter, body_md, cfg),
    ]

    try:
        animate.run(md_path, project_root="..")
    except Exception as e:
        print(f"Animation generation skipped: {e}")

    return "\n".join(html_parts)


# FILE I/O

def read_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_file(path: str, content: str):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


# FRONTMATTER

def parse_frontmatter(raw: str):
    if not raw.startswith("---"):
        return {}, raw

    end = raw.find("---", 3)
    if end == -1:
        return {}, raw

    yaml_block = raw[3:end].strip()
    body = raw[end + 3:].strip()

    frontmatter = yaml.safe_load(yaml_block) or {}
    return frontmatter, body


def validate_frontmatter(fm: dict):
    required = ["type", "title", "slug", "date", "keywords", "tags"]
    for field in required:
        if field not in fm:
            print(f"Missing frontmatter field: {field}")


# DOCTYPE

def build_doctype() -> str:
    return '<!DOCTYPE html>\n<html lang="en">'


# HEAD

def build_head(fm: dict, cfg: dict) -> str:
    parts = ["<head>"]
    parts += add_meta_basic()
    parts += add_meta_seo(fm, cfg)
    parts += add_title(fm, cfg)
    parts += add_stylesheets(cfg)
    parts += add_scripts(cfg)
    parts.append("</head>")
    return "\n".join(parts)


def add_meta_basic():
    return [
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    ]


def add_meta_seo(fm: dict, cfg: dict):
    title      = fm.get("title", "")
    slug       = fm.get("slug", "")
    keywords   = fm.get("keywords", [])
    suffix     = cfg["title_suffix"]
    base_url   = cfg["base_url"]

    keywords_str = ", ".join(keywords) if isinstance(keywords, list) else keywords

    description = (
        f"{title} — covers theory, implementation, complexity analysis, "
        f"LeetCode problems, and interview questions. "
        f"Keywords: {keywords_str}. Beginner to expert level."
    )

    page_url = f"{base_url}{slug}/{slug}-notes.html"

    return [
        f'    <meta name="description" content="{description}">',
        f'    <meta name="keywords" content="{keywords_str}, DSA, algorithms, data structures">',
        f'    <meta property="og:title" content="{title} - {suffix}">',
        f'    <meta property="og:description" content="{description}">',
        '    <meta property="og:type" content="article">',
        f'    <meta property="og:url" content="{page_url}">',
        f'    <link rel="canonical" href="{page_url}">',
    ]


def add_title(fm: dict, cfg: dict):
    title  = fm.get("title", "Notes")
    suffix = cfg["title_suffix"]
    return [f"    <title>{title} - {suffix}</title>"]


def add_stylesheets(cfg: dict):
    depth = cfg["path_depth"]
    return [
        f'    <link rel="stylesheet" href="{depth}css/styles.css">',
        f'    <link rel="stylesheet" href="{depth}css/notes/notes.css">',
        f'    <link rel="stylesheet" href="{depth}css/notes/dsa/{cfg["extra_css"]}">',
    ]


def add_scripts(cfg: dict):
    depth = cfg["path_depth"]
    return [
        '    <!-- theme.js must be in head -- sets data-theme before paint -->',
        f'    <script src="{depth}js/shared/theme.js"></script>',
    ]


# LECTURE BOX

def build_lecture_box(fm: dict) -> str:
    name    = fm.get("lecturer_name", "")
    url     = fm.get("lecturer_url", "")
    session = fm.get("session_name", "")
    s_url   = fm.get("session_url", "")

    if not all([name, url, session, s_url]):
        return ""

    return "\n".join([
        '<div class="success-box">',
        '    <p>',
        '        \U0001f393 <strong>Lecture by:</strong> ',
        f'        <a href="{url}" target="_blank" rel="noopener noreferrer">{name}</a><br>',
        '        \U0001f4ac <strong>Session:</strong> ',
        f'        <a href="{s_url}" target="_blank" rel="noopener noreferrer">{session} &rarr;</a>',
        '    </p>',
        '</div>',
    ])


# WHEN TO USE BOX

def build_when_to_use(fm: dict) -> str:
    when = fm.get("when_to_use", "")
    if not when:
        return ""

    return "\n".join([
        '<div class="highlight-box" role="note" aria-label="When to use">',
        '    <p><strong>When to use:</strong> ' + when + '</p>',
        '</div>',
    ])


# NOTE HEADER

def build_note_header(fm: dict) -> str:
    title        = fm.get("title", "")
    note_type    = fm.get("type", "dsa")
    topic_number = fm.get("topic_number", "")
    date_mod     = str(fm.get("date_modified") or fm.get("date", ""))
    tags         = fm.get("tags", [])

    if note_type == "dsa" and topic_number:
        date_line = f"Topic {topic_number} of 200 &middot; Last updated {date_mod}"
    else:
        date_line = f"Last updated {date_mod}"

    tag_spans = "\n".join(
        f'        <span class="tag">{tag}</span>'
        for tag in tags
    )

    return "\n".join([
        '<div class="note-header">',
        f'    <h1>{title}</h1>',
        '    <div class="note-date">',
        f'        {date_line}',
        '    </div>',
        '    <div class="tags" aria-label="Topic tags">',
        tag_spans,
        '    </div>',
        '</div>',
    ])


# SECTION CONTAINERS

def build_mcq_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="multiple-choice-questions">Multiple Choice Questions</h2></summary>
<div class="section-content">
<div class="quiz-header-info">
    <p>Test your knowledge with immediate feedback.</p>
</div>
<div class="quiz-navigation">
    <button onclick="previousQuestion()" class="quiz-nav-btn" id="prevBtn">&#8592; Previous</button>
    <div class="quiz-info">
        <span class="quiz-counter" id="quizCounter">Question 1 of ?</span>
        <span class="quiz-score-display" id="quizScoreDisplay">Score: 0/0 (0%)</span>
    </div>
    <button onclick="nextQuestion()" class="quiz-nav-btn" id="nextBtn">Next &#8594;</button>
</div>
<div class="quiz-carousel-container" id="quizContainer" data-mcq-source="json/mcq.json"></div>
<div class="quiz-summary-section">
    <button onclick="showQuizSummary()" class="quiz-summary-btn">View Summary</button>
    <div class="quiz-reset-container">
        <button onclick="resetEntireQuiz()" class="quiz-reset-btn">Reset Quiz</button>
    </div>
</div>
</div>
</details>"""


def build_glossary_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="glossary">Glossary</h2></summary>
<div class="section-content">
<div id="glossaryContainer"
     data-glossary-source="json/glossary.json">
</div>
</div>
</details>"""


def build_interview_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="interview-questions">Interview Questions</h2></summary>
<div class="section-content">
<p class="interview-intro">Test your understanding with these questions.</p>
<div class="interview-progress">
    <p id="interviewProgress">Progress: 0/? (0%)</p>
</div>
<div class="flashcard-navigation">
    <button onclick="previousInterviewQuestion()" class="nav-btn" id="prevInterviewBtn">&#8592; Previous</button>
    <span id="interviewCounter" class="card-counter">1 / ?</span>
    <button onclick="nextInterviewQuestion()" class="nav-btn" id="nextInterviewBtn">Next &#8594;</button>
</div>
<div class="flashcard-deck" id="interviewContainer" data-interview-source="json/interview.json"></div>
<div class="quiz-reset-container">
    <button onclick="resetInterviewProgress()" class="quiz-reset-btn">Reset Progress</button>
</div>
</div>
</details>"""


def build_checklist_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="learning-checklist">Learning Checklist</h2></summary>
<div class="section-content">
<div class="checklist-progress">
    <p>Progress: <span id="checklistProgress">0/0</span></p>
    <div class="progress-bar">
        <div class="progress-fill" id="progressFill" style="width: 0%;">0%</div>
    </div>
</div>
<div id="checklistContainer"
     data-checklist-source="json/checklist.json">
</div>
<div class="quiz-reset-container">
    <button onclick="resetChecklist()" class="quiz-reset-btn">Reset Checklist</button>
</div>
</div>
</details>"""


def build_problems_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="leetcode-problems">LeetCode Problems</h2></summary>
<div class="section-content">
<div id="problemsContainer"
     data-problems-source="json/problems.json">
</div>
</div>
</details>"""


def build_contest_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="contest-problems">Contest Problems</h2></summary>
<div class="section-content">
<div id="contestContainer"
     data-contest-source="json/contest.json">
</div>
</div>
</details>"""


def build_visual_mcq_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="visual-questions">Visual Questions</h2></summary>
<div class="section-content">
<div class="quiz-header-info">
    <span id="visualMcqCounter">Question 1 of ?</span>
    <span id="visualMcqProgress">Answered: 0/0</span>
</div>
<div id="visualMcqContainer"
     data-visual-mcq-source="json/visual-mcq.json">
</div>
<div class="quiz-navigation">
    <button id="visualPrevBtn" class="quiz-nav-btn" disabled>&#8592; Prev</button>
    <button id="visualNextBtn" class="quiz-nav-btn">Next &#8594;</button>
</div>
<div class="quiz-reset-container">
    <button onclick="resetVisualMcq()" class="quiz-reset-btn">Reset Progress</button>
</div>
</div>
</details>"""


# VISUALISATION PARSER

def expand_visualisation(text: str, slug: str = '', animation_name: str = '') -> str:
    """
    Builds the two-panel viz gallery from [image:...] tags found ONLY
    inside the Visualisation collapsible block -- never touches inline
    [image:...] tags used elsewhere in Theory subtopics, which render as
    plain standalone <img> tags via expand_inline_images() instead.
    """
    section_pattern = re.compile(
        r'(<summary><h2(?:\s+id="[^"]*")?>Visualisation</h2></summary>\s*'
        r'<div class="section-content">)(.*?)(</div>\s*</details>)',
        re.DOTALL
    )
    section_match = section_pattern.search(text)
    if not section_match:
        return text

    section_inner = section_match.group(2)

    pattern = r'\[image:([^|\]]+)\|([^\]]+)\]'
    images = re.findall(pattern, section_inner)

    if not images:
        return text

    total = len(images)

    img_tags = []
    for idx, (filename, caption) in enumerate(images):
        active = ' active' if idx == 0 else ""
        img_tags.append(
            f'<img src="images/{filename.strip()}" ' +
            f'alt="{caption.strip()}" ' +
            f'class="viz-step-img{active}" data-step="{idx + 1}" ' +
            f'data-caption="{caption.strip()}">'
        )

    imgs_html = "\n        ".join(img_tags)

    # Animation html now lives in the same folder as the notes file
    anim_url = f"{animation_name}.html"

    viz_html = f"""<div class="viz-panel">

    <div class="viz-tab-bar" role="tablist">
        <button class="viz-tab active"
                role="tab" aria-selected="true"
                aria-controls="viz-images" id="tab-images">
            Step-by-Step
        </button>
        <button class="viz-tab"
                role="tab" aria-selected="false"
                aria-controls="viz-animation" id="tab-animation">
            Animation
        </button>
    </div>

    <div class="viz-images" id="viz-images" role="tabpanel"
         aria-labelledby="tab-images">
        {imgs_html}
        <div class="viz-nav" aria-label="Image navigation">
            <button id="viz-prev" aria-label="Previous step">&#8592; Prev</button>
            <span class="viz-counter">
                Step <span id="viz-current">1</span>
                of <span id="viz-total">{total}</span>
            </span>
            <button id="viz-next" aria-label="Next step">Next &#8594;</button>
        </div>
        <p class="image-caption" id="viz-caption">{images[0][1].strip()}</p>
    </div>

    <div class="viz-animation" id="viz-animation" role="tabpanel"
         aria-labelledby="tab-animation" style="display:none;">
        <iframe src="{anim_url}" width="100%" height="780"
                frameborder="0" title="Interactive animation"
                loading="lazy"></iframe>
        <div class="viz-animation-footer">
            <a href="{anim_url}" target="_blank"
               rel="noopener" class="viz-fullscreen-link">
                Open full screen &#8599;
            </a>
        </div>
    </div>

</div>"""

    # Replace ONLY the matched Visualisation section's inner content,
    # not the whole document -- this is what keeps inline theory images
    # completely untouched.
    new_section = section_match.group(1) + '\n' + viz_html + '\n' + section_match.group(3)
    text = text[:section_match.start()] + new_section + text[section_match.end():]
    return text


def expand_inline_images(text: str) -> str:
    """
    Converts any remaining [image:file|caption] tags (i.e. ones NOT
    inside the Visualisation section, already consumed by
    expand_visualisation above) into plain standalone <img> + caption
    pairs. Used for inline supporting images mid-subtopic in Theory.
    """
    pattern = re.compile(r'\[image:([^|\]]+)\|([^\]]+)\]')

    def replace(match):
        filename = match.group(1).strip()
        caption = match.group(2).strip()
        return (
            f'<div class="diagram-container">\n'
            f'<img src="images/{filename}" alt="{caption}" class="provided-image">\n'
            f'<p class="image-caption">{caption}</p>\n'
            f'</div>'
        )

    return pattern.sub(replace, text)


# CODE TABS PARSER

def expand_code_tabs(text: str) -> str:
    pattern = re.compile(r'<code-tabs>\s*(.+?)\s*</code-tabs>', re.DOTALL)

    def normalize_code(code: str) -> str:
        """
        Collapses 2+ consecutive blank lines down to a single blank line.
        Claude sometimes double-spaces every statement; real code style
        uses at most one blank line between logical groups.
        """
        lines = code.split("\n")
        result = []
        blank_run = 0
        for line in lines:
            if line.strip() == "":
                blank_run += 1
                if blank_run <= 1:
                    result.append(line)
            else:
                blank_run = 0
                result.append(line)
        return "\n".join(result).strip()

    def replace_block(match):
        inner = match.group(1)

        fence_pattern = re.compile(
            r'```(python|java|cpp)\s*\n(.+?)\n```', re.DOTALL
        )
        blocks = fence_pattern.findall(inner)

        if not blocks:
            return match.group(0)

        lang_labels = {"python": "Python", "java": "Java", "cpp": "C++"}

        tab_bar = ['<div class="code-tab-bar" role="tablist">']
        for idx, (lang, _) in enumerate(blocks):
            active = ' active' if idx == 0 else ""
            tab_bar.append(
                f'    <button class="code-tab{active}" role="tab" ' +
                f'aria-selected="{"true" if idx == 0 else "false"}" ' +
                f'data-lang="{lang}">{lang_labels.get(lang, lang)}</button>'
            )
        tab_bar.append("</div>")

        panels = []
        for idx, (lang, code) in enumerate(blocks):
            active  = ' active' if idx == 0 else ""
            display = "" if idx == 0 else ' style="display:none;"'
            escaped = html_mod.escape(normalize_code(code))
            panels.append(
                f'<div class="code-panel{active}" id="code-{lang}"{display}>\n' +
                f'<pre><code class="language-{lang}">{escaped}</code></pre>\n' +
                '</div>'
            )

        return "\n".join(tab_bar + panels)

    return pattern.sub(replace_block, text)


# YOUTUBE + REFERENCES PARSERS

def expand_youtube(text: str) -> str:
    level_labels = {
        "beginner":     "Beginner",
        "intermediate": "Intermediate",
        "advanced":     "Advanced"
    }

    def replace_block(match):
        fields = {}
        for line in match.group(1).strip().splitlines():
            line = line.strip()
            if not line or ":" not in line:
                continue
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()

        title   = fields.get("title", "")
        channel = fields.get("channel", "")
        url     = fields.get("url", "")
        level   = level_labels.get(fields.get("level", "").lower(), "")
        why     = fields.get("why", "")

        link = (f'<a href="{url}" target="_blank" rel="noopener">' +
                'Watch &#8599;</a>') if url else ""

        return (
            '<div class="interview-question">\n' +
            f'    <strong>{title}</strong> &mdash; {channel}<br>\n' +
            f'    <span>{level}</span>' +
            (f' &middot; {why}' if why else '') + '<br>\n' +
            f'    {link}\n' +
            '</div>'
        )

    return re.sub(
        r'\[youtube\]\s*(.+?)\s*\[/youtube\]',
        replace_block,
        text,
        flags=re.DOTALL
    )


def expand_references(text: str) -> str:
    refs = []

    def collect_ref(match):
        fields = {}
        for line in match.group(1).strip().splitlines():
            line = line.strip()
            if not line or ":" not in line:
                continue
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()
        display = fields.get("text", "")
        url     = fields.get("url", "").strip()
        if url:
            refs.append(
                f'<li><a href="{url}" target="_blank" rel="noopener">{display}</a></li>'
            )
        else:
            refs.append(f'<li>{display}</li>')
        return "REFS_PLACEHOLDER"

    cleaned = re.sub(
        r'\[ref\]\s*(.+?)\s*\[/ref\]',
        collect_ref,
        text,
        flags=re.DOTALL
    )

    if not refs:
        return text

    ul = '<ul>\n' + '\n'.join(f'    {r}' for r in refs) + '\n</ul>'

    cleaned = re.sub(r'REFS_PLACEHOLDER\s*', "", cleaned)

    cleaned = re.sub(
        r'(<summary><h2(?:\s+id="[^"]*")?>Links[^<]*References</h2></summary>\s*<div class="section-content">)(.*?)(</div>\s*</details>)',
        lambda m: m.group(1) + '\n' + ul + '\n' + m.group(3),
        cleaned,
        flags=re.DOTALL,
        count=1
    )

    return cleaned


# IMAGE PROMPTS PARSER

FIXED_PROMPT_FOOTER = """
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

OUTPUT: 1200x600px PNG"""


def extract_visualisation_image_order(body_md: str) -> list:
    """
    Returns [(filename, caption), ...] in order, read from the
    Visualisation section's [image:...] tags, BEFORE expand_visualisation
    consumes them. Used later by expand_image_prompts to derive step
    numbers and filenames without Claude needing to repeat them.
    """
    pattern = r'\[image:([^|\]]+)\|([^\]]+)\]'
    matches = re.findall(pattern, body_md)
    return [(f.strip(), c.strip()) for f, c in matches]


def expand_image_prompts(text: str, output_dir: str = '.', viz_image_order: list = None) -> str:
    """
    Extracts [image-prompts]...[/image-prompts] block. Claude writes only
    a minimal per-image block (filename key + CONCEPT + SHOW). This
    function looks up each filename against viz_image_order (captured
    from Visualisation's [image:...] tags before they were consumed) to
    derive the step number, then assembles the full prompt by appending
    FIXED_PROMPT_FOOTER -- eliminating ~10 lines of identical boilerplate
    Claude would otherwise repeat verbatim for every single image.
    Writes the assembled result to a SEPARATE plain markdown file
    (image-prompts.md) -- never inlined into the notes page.
    """
    pattern = re.compile(
        r'\[image-prompts\]\s*(.+?)\s*\[/image-prompts\]',
        re.DOTALL
    )
    match = pattern.search(text)
    if not match:
        return text

    raw = match.group(1).strip()
    viz_image_order = viz_image_order or []
    filename_to_step = {fn: i + 1 for i, (fn, _) in enumerate(viz_image_order)}
    total = len(viz_image_order)

    blocks = [b.strip() for b in re.split(r'\n---\n', raw) if b.strip()]

    assembled = []
    for block in blocks:
        header_match = re.match(r'^([^\n:]+\.png):\s*\n(.*)', block, re.DOTALL)
        if not header_match:
            print(f"⚠️  Malformed image-prompts block, skipping: {block[:60]}")
            continue

        filename = header_match.group(1).strip()
        body = header_match.group(2).strip()

        step = filename_to_step.get(filename)
        if step is None:
            print(f"⚠️  image-prompts filename '{filename}' not found in Visualisation section -- step number unknown")
            step_label = f"IMAGE — {filename}"
        else:
            step_label = f"IMAGE {step} of {total} — {filename.rsplit('.', 1)[0]}"

        full_prompt = (
            f"## {step_label}\n"
            f"Filename: {filename}\n\n"
            f"Create a DSA visualization diagram.\n\n"
            f"{body}\n"
            f"{FIXED_PROMPT_FOOTER}"
        )
        assembled.append(full_prompt)

    final_md = "\n\n---\n\n".join(assembled)

    out_path = os.path.join(output_dir, "image-prompts.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(final_md + "\n")
    print(f"✅ image-prompts.md written → {out_path}")

    text = pattern.sub("", text)
    return text


# EXAM HIGHLIGHTS

def expand_exam_highlights(text: str) -> str:
    text = re.sub(
        r'==(.+?)==',
        r'<span class="exam-highlight-sentence">\1</span>',
        text
    )

    text = re.sub(
        r'\*\*([^*]{1,40})\*\*',
        lambda m: (
            f'<span class="exam-highlight-term" data-term="{m.group(1)}">' +
            m.group(1) + '</span>'
        ),
        text
    )

    return text


# COLLAPSIBLE SECTION SHORTHAND

def slugify(text: str) -> str:
    """
    Converts heading text to a URL-safe id: lowercase, spaces and
    punctuation to hyphens, emojis stripped. Matches AWS ID convention.
    """
    text = re.sub(r'[^\w\s-]', '', text)  # strip emoji/punctuation
    text = text.strip().lower()
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text).strip('-')
    return text or "section"


def parse_heading_id(heading_text: str, used_ids: set) -> tuple:
    """
    Extracts an explicit {#id} tag from heading text if present, otherwise
    auto-generates one via slugify(). Ensures uniqueness within the page
    by appending -2, -3, etc on collision. Returns (clean_text, id).
    """
    explicit = re.search(r'\{#([\w-]+)\}\s*$', heading_text)
    if explicit:
        base_id = explicit.group(1)
        clean_text = heading_text[:explicit.start()].strip()
    else:
        clean_text = heading_text.strip()
        base_id = slugify(clean_text)

    final_id = base_id
    n = 2
    while final_id in used_ids:
        final_id = f"{base_id}-{n}"
        n += 1
    used_ids.add(final_id)

    return clean_text, final_id


def expand_collapsible(text: str, used_ids: set = None) -> str:
    """
    <collapsible-section o> -> <details class="collapsible-section" open>
    <collapsible-section>   -> <details class="collapsible-section">
    Every ## heading immediately inside becomes <summary><h2 id="...">,
    with a mandatory unique id -- required by the bookmark/TOC system
    (see Static Page Elements). Supports explicit {#custom-id} override.
    """
    if used_ids is None:
        used_ids = set()

    text = re.sub(
        r'<collapsible-section o>',
        '<details class="collapsible-section" open>',
        text
    )
    text = re.sub(
        r'<collapsible-section>',
        '<details class="collapsible-section">',
        text
    )
    # Each </collapsible-section> closes both the section-content div
    # opened below and the <details> tag itself.
    text = text.replace("</collapsible-section>", "</div>\n</details>")

    def replace_heading(match):
        details_tag = match.group(1)
        heading_text = match.group(2)
        clean_text, heading_id = parse_heading_id(heading_text, used_ids)
        return (
            f'{details_tag}\n'
            f'<summary><h2 id="{heading_id}">{clean_text}</h2></summary>\n'
            f'<div class="section-content">'
        )

    text = re.sub(
        r'(<details[^>]*>)\s*\n## (.+)',
        replace_heading,
        text
    )

    # h3 headings anywhere in the body also need ids (used inside theory
    # subtopics, e.g. "### Pseudocode {#pseudocode}")
    def replace_h3(match):
        heading_text = match.group(1)
        clean_text, heading_id = parse_heading_id(heading_text, used_ids)
        return f'<h3 id="{heading_id}">{clean_text}</h3>'

    # Applied later by convert_sections for plain ### lines -- handled there
    # to avoid double-processing; this function only owns ## (h2) ids.

    return text


# SUMMARY PARSER

def expand_summary(text: str) -> str:
    def replace_takeaways(match):
        inner = match.group(1).strip()
        items = [
            line.strip()[2:].strip()
            for line in inner.splitlines()
            if line.strip().startswith("- ")
        ]
        lis = "\n".join(f"        <li>{item}</li>" for item in items)
        return (
            '<div class="highlight-box">\n' +
            '    <p><strong>Key Takeaways:</strong></p>\n' +
            '    <ul>\n' +
            lis + '\n' +
            '    </ul>\n' +
            '</div>'
        )

    text = re.sub(
        r'\[takeaways\]\s*(.+?)\s*\[/takeaways\]',
        replace_takeaways,
        text,
        flags=re.DOTALL
    )
    return text


# CALLOUT BOXES (theory density breaks)

CALLOUT_BOX_CLASS = {
    "note":      "info-box",
    "important": "highlight-box",
    "warning":   "error-box",
}


def expand_callout_boxes(text: str) -> str:
    """
    [note]...[/note]           -> info-box
    [important]...[/important] -> highlight-box
    [warning]...[/warning]     -> error-box
    Content inside is plain prose -- wrapped in a single <p>.
    Used inline within Theory & Notes to break up dense paragraphs.
    """
    for tag, css_class in CALLOUT_BOX_CLASS.items():
        pattern = re.compile(
            r'\[' + tag + r'\]\s*(.+?)\s*\[/' + tag + r'\]',
            re.DOTALL
        )

        def replace(match, css_class=css_class):
            inner = match.group(1).strip()
            return (
                f'<div class="{css_class}">\n'
                f'    <p>{inner}</p>\n'
                f'</div>'
            )

        text = pattern.sub(replace, text)

    return text


# MARKDOWN BODY PARSER

DATA_SECTION_HEADINGS = {
    "mcq":         "Multiple Choice Questions",
    "glossary":    "Glossary",
    "interview":   "Interview Questions",
    "checklist":   "Learning Checklist",
    "problem":     "LeetCode Problems",
    "contest":     "Contest Problems",
    "visual-mcq":  "Visual Questions",
}


def strip_data_section_wrapper(body_md: str, tag: str, heading: str) -> tuple:
    """
    Removes the ENTIRE <collapsible-section ...>## Heading ... [data blocks]
    ... </collapsible-section> wrapper for a data-driven section, returning
    (body_md_with_wrapper_removed, extracted_data_blocks_text_or_None).
    This prevents Claude's original heading from leaking through as an
    empty duplicate section once the [tag] blocks are parsed into JSON.

    Falls back to grabbing bare [tag]...[/tag] blocks with no wrapper at
    all (defensive -- real Claude-authored md always has the wrapper per
    instructionsV2, but earlier or hand-edited md files may not).
    """
    pattern = re.compile(
        r'<collapsible-section[^>]*>\s*\n##\s*' + re.escape(heading) +
        r'\s*\n(.*?)\n</collapsible-section>',
        re.DOTALL
    )
    match = pattern.search(body_md)
    if match:
        inner = match.group(1)
        body_md = body_md[:match.start()] + body_md[match.end():]
        return body_md, inner

    # Fallback: bare blocks, no collapsible-section/heading wrapper at all
    bare_pattern = re.compile(
        r'(?:\[' + re.escape(tag) + r'\]\s*.*?\s*\[/' + re.escape(tag) + r'\]\s*)+',
        re.DOTALL
    )
    bare_match = bare_pattern.search(body_md)
    if bare_match:
        inner = bare_match.group(0)
        body_md = body_md[:bare_match.start()] + body_md[bare_match.end():]
        return body_md, inner

    return body_md, None


def parse_md_body(body_md: str, fm: dict) -> str:
    output_dir = fm.get('_output_dir', '.')

    # Strip [animation]...[/animation] entirely -- handled by animate.py separately
    body_md = re.sub(r'\[animation\].+?\[/animation\]', '', body_md, flags=re.DOTALL)

    # For each data-driven section: extract its whole wrapper out of the main
    # body first (so no empty duplicate heading is left behind), parse the
    # data blocks from the extracted text, then append ONLY the rendered
    # container in the position where the section originally appeared.
    injected_containers = []

    for tag, heading in DATA_SECTION_HEADINGS.items():
        body_md, inner = strip_data_section_wrapper(body_md, tag, heading)
        if inner is None:
            continue

        if tag == "mcq":
            parse_mcq(inner, output_dir)
            injected_containers.append(build_mcq_container())
        elif tag == "glossary":
            parse_glossary(inner, output_dir)
            injected_containers.append(build_glossary_container())
        elif tag == "interview":
            parse_interview(inner, output_dir)
            injected_containers.append(build_interview_container())
        elif tag == "checklist":
            parse_checklist(inner, output_dir)
            injected_containers.append(build_checklist_container())
        elif tag == "problem":
            parse_problems(inner, output_dir)
            injected_containers.append(build_problems_container())
        elif tag == "contest":
            parse_contest(inner, output_dir)
            injected_containers.append(build_contest_container())
        elif tag == "visual-mcq":
            parse_visual_mcq(inner, output_dir)
            injected_containers.append(build_visual_mcq_container())

    page_used_ids = set()
    body_md = expand_collapsible(body_md, used_ids=page_used_ids)

    slug = fm.get("slug", "")
    animation_name = fm.get("animation_name") or f"{slug}-animation"

    # Capture the Visualisation image list BEFORE expand_visualisation
    # consumes the [image:...] tags -- expand_image_prompts needs the
    # filename -> step number mapping to assemble full prompts later.
    viz_image_order = extract_visualisation_image_order(body_md)

    body_md = expand_visualisation(body_md, slug=slug, animation_name=animation_name)

    takeaway_blocks = {}
    def _stash_takeaway(m):
        key = f'TAKEAWAY_PLACEHOLDER_{len(takeaway_blocks)}_END'
        takeaway_blocks[key] = m.group(0)
        return key
    body_md = re.sub(r'\[takeaways\].+?\[/takeaways\]', _stash_takeaway, body_md, flags=re.DOTALL)
    body_md = re.sub(r'\[youtube\].+?\[/youtube\]', _stash_takeaway, body_md, flags=re.DOTALL)
    body_md = re.sub(r'\[ref\].+?\[/ref\]', _stash_takeaway, body_md, flags=re.DOTALL)
    body_md = re.sub(r'\[image-prompts\].+?\[/image-prompts\]', _stash_takeaway, body_md, flags=re.DOTALL)
    body_md = re.sub(r'\[note\].+?\[/note\]', _stash_takeaway, body_md, flags=re.DOTALL)
    body_md = re.sub(r'\[important\].+?\[/important\]', _stash_takeaway, body_md, flags=re.DOTALL)
    body_md = re.sub(r'\[warning\].+?\[/warning\]', _stash_takeaway, body_md, flags=re.DOTALL)
    body_md = re.sub(r'\[image:[^|\]]+\|[^\]]+\]', _stash_takeaway, body_md)

    body_md = expand_code_tabs(body_md)
    body_md = expand_exam_highlights(body_md)

    html = convert_sections(body_md, used_ids=page_used_ids)

    for key, block in takeaway_blocks.items():
        html = html.replace(key, block)

    html = expand_summary(html)
    html = expand_callout_boxes(html)
    html = expand_inline_images(html)
    html = expand_youtube(html)
    html = expand_references(html)
    html = expand_image_prompts(html, output_dir, viz_image_order)

    # Enforce canonical section order regardless of how Claude ordered
    # them in the md. Each data-driven section's pre-rendered container
    # (built earlier) replaces its own leftover position; everything else
    # is reordered by extracting each <details>...</details> block by its
    # heading and reassembling in CANONICAL_SECTION_ORDER.
    html = reorder_sections(html, injected_containers)

    return html


FIXED_SECTION_ORDER = [
    "Visualisation",
    "Implementation",
    "Summary",
    "Glossary",
    "Interview Questions",
    "Multiple Choice Questions",
    "Visual Questions",
    "LeetCode Problems",
    "Contest Problems",
    "Learning Checklist",
    "YouTube Recommendations",
    "Links & References",
]


def reorder_sections(html: str, injected_containers: list) -> str:
    """
    Extracts every top-level <details class="collapsible-section" ...>
    ...</details> block by its <h2 id="..."> heading text.

    Theory is content-driven: Claude writes any number of freely-named
    collapsibles (Introduction, plus whatever subtopics the topic needs).
    These are NOT in FIXED_SECTION_ORDER, so they are recognized by
    EXCLUSION -- any heading not matching a known fixed-section name is
    treated as a theory subtopic and kept in its original authored order,
    pinned to the very front of the page (theory always comes first).

    Fixed sections (Visualisation onward) are then appended in
    FIXED_SECTION_ORDER regardless of how Claude wrote them.

    Data-driven containers (built earlier, e.g. MCQ/Glossary) are matched
    by heading and take priority over any stray empty block with the same
    name.
    """
    block_pattern = re.compile(
        r'<details class="collapsible-section"[^>]*>\s*'
        r'<summary><h2(?:\s+id="[^"]*")?>(.*?)</h2></summary>.*?</details>',
        re.DOTALL
    )

    theory_blocks = []   # (heading, full_block) in original order
    fixed_found = {}     # heading -> full_block

    for match in block_pattern.finditer(html):
        heading = match.group(1).strip()
        block = match.group(0)
        if heading in FIXED_SECTION_ORDER:
            fixed_found[heading] = block
        else:
            theory_blocks.append((heading, block))

    # Data-driven containers override any stray empty block with same heading
    for container in injected_containers:
        m = re.search(r'<h2(?:\s+id="[^"]*")?>(.*?)</h2>', container)
        if m:
            heading = m.group(1).strip()
            fixed_found[heading] = container

    remainder = block_pattern.sub("", html).strip()

    ordered = [block for _, block in theory_blocks]

    used = set()
    for heading in FIXED_SECTION_ORDER:
        if heading in fixed_found:
            ordered.append(fixed_found[heading])
            used.add(heading)

    # Any fixed-list heading found but somehow not matched above (defensive)
    for heading, block in fixed_found.items():
        if heading not in used:
            ordered.append(block)

    result = "\n\n".join(ordered)
    if remainder:
        result = remainder + "\n\n" + result

    return result


def convert_sections(body_md: str, used_ids: set = None) -> str:
    if used_ids is None:
        used_ids = set()
    lines = body_md.split("\n")
    output = []
    in_pre   = False
    in_table = False
    in_ul    = False
    pre_lang = ""
    i = 0

    def close_ul():
        nonlocal in_ul
        if in_ul:
            output.append("</ul>")
            in_ul = False

    def close_table():
        nonlocal in_table
        if in_table:
            output.append("</tbody></table>")
            in_table = False

    def inline_fmt(text: str) -> str:
        text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
        text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)',
                      r'<a href="\2">\1</a>', text)
        return text

    def is_table_separator(line: str) -> bool:
        return bool(re.match(r'^[\|\s\-:]+$', line.strip()))

    def parse_table_row(line: str):
        return [c.strip() for c in line.strip().strip("|").split("|")]

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("```"):
            if not in_pre:
                close_ul()
                close_table()
                pre_lang = stripped[3:].strip()
                css = f' class="language-{pre_lang}"' if pre_lang else ""
                output.append(f"<pre><code{css}>")
                in_pre = True
            else:
                output.append("</code></pre>")
                in_pre = False
            i += 1
            continue

        if in_pre:
            output.append(html_mod.escape(line))
            i += 1
            continue

        # Literal <pre><code...> already produced by expand_code_tabs (or
        # any other earlier expansion step) -- its content is already
        # HTML-escaped, so pass every line through verbatim until the
        # matching closing tag instead of re-wrapping each line in <p>.
        if stripped.startswith("<pre>") or stripped.startswith("<pre ") or re.match(r'^<pre\b', stripped):
            close_ul()
            close_table()
            output.append(line)
            i += 1
            while i < len(lines):
                output.append(lines[i])
                if "</pre>" in lines[i]:
                    i += 1
                    break
                i += 1
            continue

        is_html = (
            (stripped.startswith("<") and not stripped.startswith("<p>")) or
            stripped.startswith("TAKEAWAY_PLACEHOLDER_") or
            stripped.startswith("aria-") or
            stripped.startswith("role=") or
            stripped.startswith("id=") or
            stripped.startswith("data-") or
            stripped.startswith("style=") or
            stripped == "/>" or
            stripped.startswith("loading=") or
            stripped.startswith("frameborder=") or
            stripped.startswith("width=") or
            stripped.startswith("height=") or
            stripped.startswith("target=") or
            stripped.startswith("rel=") or
            stripped.startswith("href=") or
            stripped.startswith("src=") or
            stripped.startswith("class=") or
            stripped.startswith("alt=")
        )
        if is_html:
            close_ul()
            close_table()
            output.append(line)
            i += 1
            continue

        if stripped.startswith("|"):
            close_ul()
            if not in_table:
                cells = parse_table_row(line)
                output.append("<table>")
                output.append("<thead><tr>")
                for cell in cells:
                    output.append(f"<th>{inline_fmt(cell)}</th>")
                output.append("</tr></thead>")
                i += 1
                if i < len(lines) and is_table_separator(lines[i]):
                    i += 1
                output.append("<tbody>")
                in_table = True
            else:
                cells = parse_table_row(line)
                output.append("<tr>")
                for cell in cells:
                    output.append(f"<td>{inline_fmt(cell)}</td>")
                output.append("</tr>")
                i += 1
            continue
        else:
            close_table()

        if line.startswith("#### "):
            close_ul()
            output.append(f"<h4>{inline_fmt(line[5:].strip())}</h4>")
        elif line.startswith("### "):
            close_ul()
            heading_text = line[4:].strip()
            clean_text, heading_id = parse_heading_id(heading_text, used_ids)
            output.append(f'<h3 id="{heading_id}">{inline_fmt(clean_text)}</h3>')
        elif line.startswith("## "):
            close_ul()
            output.append(f"<h2>{inline_fmt(line[3:].strip())}</h2>")
        elif line.startswith("# "):
            close_ul()
            output.append(f"<h1>{inline_fmt(line[2:].strip())}</h1>")
        elif stripped.startswith("- "):
            if not in_ul:
                output.append("<ul>")
                in_ul = True
            output.append(f"<li>{inline_fmt(stripped[2:])}</li>")
        elif stripped == "":
            close_ul()
            output.append("")
        else:
            close_ul()
            output.append(f"<p>{inline_fmt(stripped)}</p>")

        i += 1

    close_table()
    close_ul()
    if in_pre:
        output.append("</code></pre>")

    return "\n".join(output)


# BODY

def build_body(fm: dict, body_md: str, cfg: dict) -> str:
    note_type = fm.get("type", "dsa")
    depth     = cfg["path_depth"]
    slug      = fm.get("slug", "")

    parsed_sections = parse_md_body(body_md, fm)

    return "\n".join([
        f'<body class="complete-notes {note_type}-notes">',
        "",
        build_schema_ld(fm, cfg),
        "",
        '<div class="note-container">',
        "",
        build_note_header(fm),
        "",
        build_when_to_use(fm),
        "",
        '<div class="note-content">',
        "",
        parsed_sections,
        "",
        "</div><!-- end note-content -->",
        "",
        "</div><!-- end note-container -->",
        "",
        f'<script src="{depth}js/notes/{note_type}/{note_type}-page.js" async="false"></script>',
        "",
        "</body>",
        "</html>",
    ])


def build_schema_ld(fm: dict, cfg: dict) -> str:
    title        = fm.get("title", "")
    slug         = fm.get("slug", "")
    keywords     = fm.get("keywords", [])
    date_pub     = str(fm.get("date", ""))
    date_mod     = str(fm.get("date_modified") or date_pub)
    base_url     = cfg["base_url"]
    suffix       = cfg["title_suffix"]

    keywords_str = ", ".join(keywords) if isinstance(keywords, list) else keywords
    description  = (
        f"{title} — covers theory, implementation, complexity analysis, "
        f"LeetCode problems, and interview questions. "
        f"Keywords: {keywords_str}. Beginner to expert level."
    )

    page_url     = f"{base_url}{slug}/{slug}-notes.html"

    schema = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": f"{title} - {suffix}",
        "description": description,
        "author": {
            "@type": "Person",
            "name": "Namrata Mulwani",
            "email": "awslecturenotes@gmail.com"
        },
        "datePublished": date_pub,
        "dateModified":  date_mod,
        "publisher": {
            "@type": "Person",
            "name": "Namrata Mulwani"
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": page_url
        },
        "articleSection": suffix,
        "keywords": keywords if isinstance(keywords, list) else [keywords],
        "educationalLevel": "Beginner to Expert"
    }

    schema_json = json.dumps(schema, indent=4, ensure_ascii=False)

    return "\n".join([
        '<script type="application/ld+json">',
        schema_json,
        "</script>",
    ])


# CLI

def resolve_md_path(arg: str) -> str:
    if arg.endswith(".md") and os.path.exists(arg):
        return arg

    guesses = [
        f"data/notes/dsa/dsa-{arg}/{arg}.md",
        f"data/notes/dsa/{arg}/{arg}.md",
        f"data/notes/aws/{arg}/{arg}.md",
        f"{arg}.md",
    ]
    for path in guesses:
        if os.path.exists(path):
            return path

    print(f"Could not find md file for: {arg}")
    sys.exit(1)


def get_output_path(md_path: str, slug: str) -> str:
    folder = os.path.dirname(md_path)
    return os.path.join(folder, "notes.html")


MARKDOWN_INBOX = "../src/data/notes/markdown"
DSA_NOTES_ROOT = "../src/data/notes"


def scan_and_build_inbox():
    """
    Batch mode: scans data/notes/markdown/ for any dsa-*.md file.
    For each one found:
      1. Create src/data/notes/dsa/dsa-[slug]/{json,markdown,images}/
      2. Move the md into that folder's markdown/ subfolder
      3. Build it (HTML, JSON, image-prompts.md, animation.html)
    """
    if not os.path.isdir(MARKDOWN_INBOX):
        print(f"No inbox folder found at {MARKDOWN_INBOX}")
        return

    found = [f for f in os.listdir(MARKDOWN_INBOX)
             if f.startswith("dsa-") and f.endswith(".md")]

    if not found:
        print(f"No dsa-*.md files found in {MARKDOWN_INBOX}")
        return

    for filename in found:
        src_path = os.path.join(MARKDOWN_INBOX, filename)
        slug = filename[len("dsa-"):-len(".md")]
        topic_folder = os.path.join(DSA_NOTES_ROOT, f"dsa-{slug}")

        for sub in ("json", "markdown", "images"):
            os.makedirs(os.path.join(topic_folder, sub), exist_ok=True)

        dest_path = os.path.join(topic_folder, "markdown", filename)
        os.replace(src_path, dest_path)
        print(f"Moved {filename} -> {dest_path}")

        try:
            html = build_html(dest_path)
            out_path = os.path.join(topic_folder, "notes.html")
            write_file(out_path, html)
            print(f"Output: {out_path}")
        except Exception as e:
            print(f"Build failed for {filename}: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        # No argument -- default to inbox scan mode
        scan_and_build_inbox()
        sys.exit(0)

    if sys.argv[1] == "--scan":
        scan_and_build_inbox()
        sys.exit(0)

    md_path = resolve_md_path(sys.argv[1])
    print(f"Building: {md_path}")

    html    = build_html(md_path)
    raw     = read_file(md_path)
    fm, _   = parse_frontmatter(raw)
    slug    = fm.get("slug", "output")
    out     = get_output_path(md_path, slug)

    write_file(out, html)
    print(f"Output: {out}")