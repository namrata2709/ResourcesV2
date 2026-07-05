"""
generate_notes.py — Unified AWS + DSA Notes Markdown → HTML converter.
Usage:
  python generate_notes.py <slug-or-md-path>   # single file
  python generate_notes.py --scan               # batch inbox scan
  python generate_notes.py                      # same as --scan

Auto-detects subject from filename prefix:
  aws-*.md  →  AWS notes  (no animation, adds Reflection + Hands-On)
  dsa-*.md  →  DSA notes  (animation via animate.py, Visual MCQ, Contest)
"""

import sys
import os
import re
import json
import html as html_mod


# Preserve valid HTML entities after escaping.
# Example:
#   &#8599;   -> &#8599;
#   &rarr;    -> &rarr;
#   &copy;    -> &copy;
# while still escaping everything else safely.
_HTML_ENTITY_RE = re.compile(
    r'&amp;('
    r'#\d+;|'                 # decimal numeric entity
    r'#x[0-9A-Fa-f]+;|'        # hexadecimal numeric entity
    r'[A-Za-z][A-Za-z0-9]+;'   # named entity
    r')'
)
try:
    import yaml
except ImportError:
    print("Missing dependency: pip install pyyaml")
    sys.exit(1)
    
try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependency: pip install beautifulsoup4")
    sys.exit(1)

from utils.parse_mcq        import parse_mcq
from utils.parse_glossary   import parse_glossary
from utils.parse_interview  import parse_interview
from utils.parse_checklist  import parse_checklist
from utils.parse_problems   import parse_problems
from utils.parse_contest    import parse_contest
from utils.parse_visual_mcq import parse_visual_mcq
from utils.parse_hands_on   import parse_hands_on
from utils.parse_reflection import parse_reflection, build_reflection_html
from utils.parse_screenshot_guide import parse_screenshot_guide
import utils.animate as animate
from utils.parse_slides import is_presentation, is_video_slides_overview, build_slides_html, write_diagram_prompts


# ─── CONFIG ────────────────────────────────────────────────────────────────────

TYPE_CONFIG = {
    "dsa": {
        "title_suffix":  "DSA Notes",
        "extra_css":     "dsa-notes.css",          # loaded in addition to shared css
        # No nested subject folder — notes.html lives at data/notes/dsa-[slug]/,
        # not data/notes/dsa/dsa-[slug]/.
        "path_segment":  "data/notes/",
        "path_depth":    "../../../",              # data/notes/dsa-[slug]/notes.html -> project root (css/js are 3 levels up, siblings of data/)
        "base_url":      "https://namrata2709.github.io/Resources/data/notes/",
        "subject":       "dsa",
        "has_animation": True,
        "folder_prefix": "dsa",
    },
    "aws": {
        "title_suffix":  "AWS Notes",
        "extra_css":     None,                     # no extra css for aws
        "path_segment":  "data/notes/",
        "path_depth":    "../../../",              # data/notes/aws-[slug]/notes.html -> project root
        "base_url":      "https://namrata2709.github.io/Resources/data/notes/",
        "subject":       "aws",
        "has_animation": False,
        "folder_prefix": "aws",
    },
}

SITE_BASE = "https://namrata2709.github.io/Resources/"

# Sections that exist in DSA only
DSA_ONLY_SECTIONS = {"visual-mcq", "contest"}

# Sections that exist in AWS only
AWS_ONLY_SECTIONS = {"hands-on", "reflection"}

# Ordered heading text for data-driven sections (used by strip + reorder)
DATA_SECTION_HEADINGS = {
    "mcq":        "Multiple Choice Questions",
    "glossary":   "Glossary",
    "interview":  "Interview Questions",
    "checklist":  "Learning Checklist",
    "problem":    "LeetCode Problems",
    "contest":    "Contest Problems",          # DSA only
    "visual-mcq": "Visual Questions",          # DSA only
    "hands-on":   "Hands-On Projects",         # AWS only
    "reflection": "Reflection Questions",      # AWS only (static HTML)
}

# Fixed canonical section order — theory blocks precede this list
DSA_FIXED_SECTION_ORDER = [
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

AWS_FIXED_SECTION_ORDER = [
    "Overall Summary",
    "Glossary",
    "Interview Questions",
    "Multiple Choice Questions",
    "Hands-On Projects",
    "Learning Checklist",
    "Reflection Questions",
    "Links & References",
]

# Lab notes keep the same 8 mandatory end sections as standard AWS notes —
# only the theory-side structure differs (Lab Overview, What You Will
# Accomplish, and Tasks precede them instead of freely-named subtopics).
AWS_LAB_FIXED_SECTION_ORDER = AWS_FIXED_SECTION_ORDER


# ─── READING TIME ──────────────────────────────────────────────────────────────

def calculate_read_time(html_fragment: str, wpm: int = 225) -> dict:
    """
    Estimates reading time from a fragment of rendered HTML (intended to be
    called on `parsed_sections` — the note's prose content only, before it's
    wrapped in the full page shell). Interactive containers (quiz/glossary/
    checklist/interview) are populated later via JSON+JS and are empty at
    this point, so they're correctly excluded from the word count.
    """
    soup = BeautifulSoup(html_fragment, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    words = text.split()
    word_count = len(words)
    minutes = max(1, round(word_count / wpm))
    return {"word_count": word_count, "read_time_minutes": minutes}

# ─── FILE I/O ──────────────────────────────────────────────────────────────────

def read_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_file(path: str, content: str):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


# ─── AUDIENCE TARGETING ────────────────────────────────────────────────────────

AWS_EDU_LEVEL = {
    "beginner":     "Beginner",
    "intermediate": "Beginner to Intermediate",
    "advanced":     "Intermediate to Advanced",
    "exam":         "Intermediate to Advanced (Exam Preparation)",
}

AWS_DESCRIPTION_TEMPLATE = {
    "beginner": (
        "{title} — a beginner-friendly introduction to AWS, covering core "
        "concepts, architecture, and practical use cases. Keywords: {keywords}."
    ),
    "intermediate": (
        "{title} — covers AWS concepts, architecture, best practices, and "
        "exam preparation. Keywords: {keywords}. Beginner to intermediate level."
    ),
    "advanced": (
        "{title} — an in-depth look covering advanced architecture, "
        "trade-offs, edge cases, and production considerations. "
        "Keywords: {keywords}."
    ),
    "exam": (
        "{title} — exam-focused notes covering everything tested on the "
        "relevant AWS certification, with emphasis on exam traps and "
        "high-yield facts. Keywords: {keywords}."
    ),
}


def get_audience(fm: dict) -> str:
    audience = (fm.get("audience") or "intermediate").strip().lower()
    if audience not in AWS_EDU_LEVEL:
        print(f"⚠️  Unknown audience '{audience}' — defaulting to 'intermediate'")
        audience = "intermediate"
    return audience


def build_aws_description(fm: dict, keywords_str: str) -> str:
    title    = fm.get("title", "")
    audience = get_audience(fm)
    return AWS_DESCRIPTION_TEMPLATE[audience].format(title=title, keywords=keywords_str)


def build_description(fm: dict, cfg: dict, keywords_str: str) -> str:
    title = fm.get("title", "")
    if cfg["subject"] == "dsa":
        return (
            f"{title} — covers theory, implementation, complexity analysis, "
            f"LeetCode problems, and interview questions. "
            f"Keywords: {keywords_str}. Beginner to expert level."
        )
    return build_aws_description(fm, keywords_str)


def build_edu_level(fm: dict, cfg: dict) -> str:
    if cfg["subject"] == "dsa":
        return "Beginner to Expert"
    return AWS_EDU_LEVEL[get_audience(fm)]


# ─── SUBJECT DETECTION ─────────────────────────────────────────────────────────

def detect_subject(md_path: str, frontmatter: dict) -> str:
    """
    Detects subject (aws | dsa) from:
    1. Frontmatter 'type' field (most explicit)
    2. Filename prefix aws-*.md / dsa-*.md
    Defaults to 'dsa' with a warning if neither matches.
    """
    fm_type = frontmatter.get("type", "").lower()
    if fm_type in TYPE_CONFIG:
        return fm_type

    basename = os.path.basename(md_path).lower()
    if basename.startswith("aws-"):
        return "aws"
    if basename.startswith("dsa-"):
        return "dsa"

    print(f"⚠️  Could not detect subject for '{basename}' — defaulting to 'dsa'")
    return "dsa"


def detect_lab_mode(md_path: str, frontmatter: dict) -> bool:
    """
    Detects whether this is a lab note (AWS only).
    Filename pattern: aws-[topic-slug]-session-[sessionname]-lab.md
    Folder naming naturally inherits the -lab suffix since the folder slug
    is derived from everything after the 'aws-' prefix — no separate folder
    logic needed.

    Frontmatter 'lab: true' is also honored as an explicit override, in case
    the filename doesn't follow the pattern exactly.
    """
    if frontmatter.get("lab") is True:
        return True

    basename = os.path.basename(md_path).lower()
    if basename.endswith("-lab.md") and "-session-" in basename:
        return True

    return False


def detect_presentation_mode(md_path: str, frontmatter: dict) -> bool:
    """
    Detects presentation-mode (any subject — aws, dsa, or a future one).
    Filename pattern: [subject]-[slug]-slides.md, or frontmatter
    `presentation: true` override. Delegates to utils.parse_slides.is_presentation
    so the trigger logic lives in one place.

    NOTE: Video Slides mode (see detect_video_slides_mode below) also sets
    `presentation: true` in its frontmatter, since it reuses this same
    deck engine. Callers MUST check detect_video_slides_mode() first —
    it is checked before this function everywhere in this file — or a
    video-slides companion deck will be misdetected as Presentation Mode.
    """
    return is_presentation(md_path, frontmatter)


def detect_video_slides_mode(md_path: str, frontmatter: dict) -> bool:
    """
    Detects Video Slides mode (see video-slides-instructions.md) — a
    companion deck generated from an ALREADY-EXISTING note, not a
    Presentation Mode deck rewritten from an uploaded pptx/pdf source.

    Triggered by EITHER:
      1. Filename matches [subject]-[topic-slug]-slides-overview.md — the
         source markdown carries the topic slug so the inbox scanner can
         route it to the right existing topic folder by filename alone.
      2. Frontmatter `derived_from_note: true` (override, for files that
         don't follow the naming pattern, or authored directly into an
         existing topic's markdown/ folder without going through the inbox).

    The OUTPUT filename is still always the fixed `slides-overview.html`
    regardless of topic/slug (see get_output_path) — only the SOURCE
    markdown filename is now slug-based, purely so it's detectable and
    routable from the flat inbox the same way every other content type is.

    This must be checked BEFORE detect_presentation_mode() everywhere,
    since video-slides frontmatter also sets `presentation: true` (it
    reuses the same slide-deck engine) and a [subject]-[slug]-slides-overview.md
    filename does NOT match the presentation FILENAME_RE (it ends in
    "-slides-overview.md", not "-slides.md") — but checking order still
    matters for the frontmatter-only override path.
    """
    return is_video_slides_overview(md_path, frontmatter)


# ─── FRONTMATTER ───────────────────────────────────────────────────────────────

def parse_frontmatter(raw: str):
    if not raw.startswith("---"):
        return {}, raw
    end = raw.find("---", 3)
    if end == -1:
        return {}, raw
    yaml_block = raw[3:end].strip()
    body       = raw[end + 3:].strip()
    frontmatter = yaml.safe_load(yaml_block) or {}
    return frontmatter, body


def validate_frontmatter(fm: dict, subject: str, is_lab: bool = False):
    base_required = ["type", "title", "slug", "date", "keywords", "tags"]
    aws_extra     = ["when_to_use"]          # shared with DSA but critical for AWS
    lab_extra     = ["session_name"]          # labs always belong to a named session
    required = base_required + (aws_extra if subject == "aws" else [])
    if is_lab:
        required = required + lab_extra
    for field in required:
        if field not in fm:
            print(f"⚠️  Missing frontmatter field: '{field}'")

    if subject == "aws" and not fm.get("validated_against"):
        fm["validated_against"] = fm.get("date")


# ─── HTML HEAD ─────────────────────────────────────────────────────────────────

def build_doctype() -> str:
    return '<!DOCTYPE html>\n<html lang="en">'


def build_head(fm: dict, cfg: dict) -> str:
    parts = ["<head>"]
    parts += _meta_basic()
    parts += _meta_seo(fm, cfg)
    parts += _meta_og(fm, cfg)
    parts += _title(fm, cfg)
    parts += _stylesheets(cfg)
    parts += _head_scripts(cfg)
    parts.append("</head>")
    return "\n".join(parts)


def _meta_basic():
    return [
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    ]


def _meta_seo(fm: dict, cfg: dict):
    title        = fm.get("title", "")
    keywords     = fm.get("keywords", [])
    slug         = fm.get("slug", "")
    suffix       = cfg["title_suffix"]
    base_url     = cfg["base_url"]
    subject      = cfg["subject"]
    keywords_str = ", ".join(keywords) if isinstance(keywords, list) else keywords

    description = build_description(fm, cfg, keywords_str)
    page_url    = f"{base_url}{subject}-{slug}/notes.html"

    return [
        f'    <meta name="description" content="{html_mod.escape(description, quote=True)}">',
        f'    <meta name="keywords" content="{html_mod.escape(keywords_str, quote=True)}, AWS, cloud, certification">',
        f'    <link rel="canonical" href="{html_mod.escape(page_url, quote=True)}">',
    ]


def _meta_og(fm: dict, cfg: dict):
    title    = fm.get("title", "")
    slug     = fm.get("slug", "")
    suffix   = cfg["title_suffix"]
    base_url = cfg["base_url"]
    subject  = cfg["subject"]

    keywords     = fm.get("keywords", [])
    keywords_str = ", ".join(keywords) if isinstance(keywords, list) else keywords

    description = build_description(fm, cfg, keywords_str)
    page_url    = f"{base_url}{subject}-{slug}/notes.html"

    og_title = safe_escape(f"{title} - {suffix}", quote=True)
    return [
        f'    <meta property="og:title" content="{og_title}">',
        f'    <meta property="og:description" content="{html_mod.escape(description, quote=True)}">',
        '    <meta property="og:type" content="article">',
        f'    <meta property="og:url" content="{html_mod.escape(page_url, quote=True)}">',
    ]


def _title(fm: dict, cfg: dict):
    title  = safe_escape(fm.get("title", "Notes"))
    suffix = cfg["title_suffix"]
    return [f"    <title>{title} - {suffix}</title>"]


def _stylesheets(cfg: dict):
    depth = cfg["path_depth"]
    sheets = [
        f'    <link rel="stylesheet" href="{depth}css/styles.css">',
        f'    <link rel="stylesheet" href="{depth}css/notes/notes.css">',
    ]
    if cfg.get("extra_css"):
        sheets.append(
            f'    <link rel="stylesheet" href="{depth}css/notes/dsa/{cfg["extra_css"]}">'
        )
    return sheets


def _head_scripts(cfg: dict):
    depth = cfg["path_depth"]
    return [f'    <script src="{depth}js/shared/site-config.js"></script>']


# ─── SCHEMA ────────────────────────────────────────────────────────────────────

def build_schema_ld(fm: dict, cfg: dict) -> str:
    title        = fm.get("title", "")
    slug         = fm.get("slug", "")
    keywords     = fm.get("keywords", [])
    date_pub     = str(fm.get("date", ""))
    date_mod     = str(fm.get("date_modified") or date_pub)
    base_url     = cfg["base_url"]
    suffix       = cfg["title_suffix"]
    subject      = cfg["subject"]
    keywords_str = ", ".join(keywords) if isinstance(keywords, list) else keywords

    description = build_description(fm, cfg, keywords_str)
    edu_level   = build_edu_level(fm, cfg)
    page_url    = f"{base_url}{subject}-{slug}/notes.html"

    schema = {
        "@context": "https://schema.org",
        "@type":    "TechArticle",
        "headline": f"{title} - {suffix}",
        "description": description,
        "author": {
            "@type": "Person",
            "name":  "Namrata Mulwani",
            "email": "awslecturenotes@gmail.com"
        },
        "datePublished":  date_pub,
        "dateModified":   date_mod,
        "publisher": {
            "@type": "Person",
            "name":  "Namrata Mulwani"
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id":   page_url
        },
        "articleSection":  suffix,
        "keywords":        keywords if isinstance(keywords, list) else [keywords],
        "educationalLevel": edu_level,
    }

    return "\n".join([
        '<script type="application/ld+json">',
        json.dumps(schema, indent=4, ensure_ascii=False),
        "</script>",
    ])


# ─── WHEN TO USE BOX ───────────────────────────────────────────────────────────

def build_when_to_use(fm: dict) -> str:
    when = fm.get("when_to_use", "")
    if not when:
        return ""
    when = safe_escape(when)
    return "\n".join([
        '<div class="highlight-box" role="note" aria-label="When to use">',
        f'    <p><strong>When to use:</strong> {when}</p>',
        '</div>',
    ])


# ─── LECTURE BOX (AWS only) ────────────────────────────────────────────────────

def build_lecture_box(fm: dict) -> str:
    name    = safe_escape(fm.get("lecturer_name"))
    url     = safe_escape(fm.get("lecturer_url"), quote=True)
    session = safe_escape(fm.get("session_name"))
    s_url   = safe_escape(fm.get("session_url"), quote=True)

    lines = []
    if name:
        lecturer_line = (
            f'<a href="{url}" target="_blank" rel="noopener noreferrer">{name}</a>'
            if url else name
        )
        lines.append(f'        🎓 <strong>Lecture by:</strong> {lecturer_line}')
    if session:
        session_line = (
            f'<a href="{s_url}" target="_blank" rel="noopener noreferrer">{session} &rarr;</a>'
            if s_url else session
        )
        lines.append(f'        💬 <strong>Session:</strong> {session_line}')

    if not lines:
        return ""

    return "\n".join([
        '<div class="success-box">',
        '    <p>',
        '<br>\n'.join(lines),
        '    </p>',
        '</div>',
    ])


# ─── SECTION CONTAINER BUILDERS ────────────────────────────────────────────────

def build_mcq_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="multiple-choice-questions">📝 Multiple Choice Questions</h2></summary>
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
    <button onclick="showQuizSummary()" class="quiz-summary-btn">📊 View Summary</button>
    <div class="quiz-reset-container">
        <button onclick="resetEntireQuiz()" class="quiz-reset-btn">🔄 Reset Quiz</button>
    </div>
</div>
</div>
</details>"""


def build_glossary_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="glossary">📖 Glossary</h2></summary>
<div class="section-content">
<div id="glossaryContainer" data-glossary-source="json/glossary.json"></div>
</div>
</details>"""


def build_interview_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="interview-questions">🎤 Interview Questions</h2></summary>
<div class="section-content">
<p class="interview-intro">📚 Test your understanding with these questions.</p>
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
    <button onclick="resetInterviewProgress()" class="quiz-reset-btn">🔄 Reset Progress</button>
</div>
</div>
</details>"""


def build_checklist_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="learning-checklist">☑️ Learning Checklist</h2></summary>
<div class="section-content">
<div class="checklist-progress">
    <p>Progress: <span id="checklistProgress">0/0</span></p>
    <div class="progress-bar">
        <div class="progress-fill" id="progressFill" style="width: 0%;">0%</div>
    </div>
</div>
<div id="checklistContainer" data-checklist-source="json/checklist.json"></div>
<div class="quiz-reset-container">
    <button onclick="resetChecklist()" class="quiz-reset-btn">🔄 Reset Checklist</button>
</div>
</div>
</details>"""


def build_problems_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="leetcode-problems">LeetCode Problems</h2></summary>
<div class="section-content">
<div id="problemsContainer" data-problems-source="json/problems.json"></div>
</div>
</details>"""


def build_contest_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="contest-problems">Contest Problems</h2></summary>
<div class="section-content">
<div id="contestContainer" data-contest-source="json/contest.json"></div>
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
<div id="visualMcqContainer" data-visual-mcq-source="json/visual-mcq.json"></div>
<div class="quiz-navigation">
    <button id="visualPrevBtn" class="quiz-nav-btn" disabled>&#8592; Prev</button>
    <button id="visualNextBtn" class="quiz-nav-btn">Next &#8594;</button>
</div>
<div class="quiz-reset-container">
    <button onclick="resetVisualMcq()" class="quiz-reset-btn">🔄 Reset Progress</button>
</div>
</div>
</details>"""


def build_hands_on_html_section(projects_html: str) -> str:
    """
    Wraps static project HTML in the collapsible-section shell.
    projects_html comes directly from parse_hands_on() — no JS, no JSON.
    """
    if not projects_html:
        return ""
    return (
        '<details class="collapsible-section">\n'
        '<summary><h2 id="hands-on-projects">💼 Hands-On Projects</h2></summary>\n'
        '<div class="section-content">\n'
        + projects_html + '\n'
        '</div>\n'
        '</details>'
    )


# ─── VISUALISATION PARSER (DSA) ────────────────────────────────────────────────

def expand_visualisation(text: str, slug: str = '', animation_name: str = '') -> str:
    section_pattern = re.compile(
        r'(<summary><h2(?:\s+id="[^"]*")?>Visualisation</h2></summary>\s*'
        r'<div class="section-content">)(.*?)(</div>\s*</details>)',
        re.DOTALL
    )
    section_match = section_pattern.search(text)
    if not section_match:
        return text

    section_inner = section_match.group(2)
    images = re.findall(r'\[image:([^|\]]+)\|([^\]]+)\]', section_inner)
    if not images:
        return text

    total = len(images)
    img_tags = []
    for idx, (filename, caption) in enumerate(images):
        active = ' active' if idx == 0 else ""
        img_tags.append(
            f'<img src="images/{filename.strip()}" '
            f'alt="{caption.strip()}" '
            f'class="viz-step-img{active}" data-step="{idx + 1}" '
            f'data-caption="{caption.strip()}">'
        )

    imgs_html  = "\n        ".join(img_tags)
    anim_url   = f"{animation_name}.html"

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
            <div class="viz-counter">
                <span>Step <span id="viz-current">1</span></span>
                <span>of <span id="viz-total">{total}</span></span>
            </div>
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

    new_section = section_match.group(1) + '\n' + viz_html + '\n' + section_match.group(3)
    return text[:section_match.start()] + new_section + text[section_match.end():]


def extract_visualisation_image_order(body_md: str) -> list:
    matches = re.findall(r'\[image:([^|\]]+)\|([^\]]+)\]', body_md)
    return [(f.strip(), c.strip()) for f, c in matches]


# ─── INLINE IMAGES ─────────────────────────────────────────────────────────────

def expand_inline_images(text: str) -> str:
    pattern = re.compile(r'\[image:([^|\]]+)\|([^\]]+)\]')

    def replace(match):
        filename = match.group(1).strip()
        caption  = match.group(2).strip()
        return (
            f'<div class="diagram-container">\n'
            f'<img src="images/{filename}" alt="{caption}" '
            f'loading="lazy" decoding="async" class="provided-image">\n'
            f'<p class="image-caption"><em>{caption}</em></p>\n'
            f'</div>'
        )

    return pattern.sub(replace, text)


# ─── CODE TABS ─────────────────────────────────────────────────────────────────

def expand_code_tabs(text: str) -> str:
    pattern = re.compile(r'<code-tabs>\s*(.+?)\s*</code-tabs>', re.DOTALL)

    def normalize_code(code: str) -> str:
        lines  = code.split("\n")
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
                f'    <button class="code-tab{active}" role="tab" '
                f'aria-selected="{"true" if idx == 0 else "false"}" '
                f'data-lang="{lang}">{lang_labels.get(lang, lang)}</button>'
            )
        tab_bar.append("</div>")

        panels = []
        for idx, (lang, code) in enumerate(blocks):
            active  = ' active' if idx == 0 else ""
            display = "" if idx == 0 else ' style="display:none;"'
            escaped = safe_escape(normalize_code(code))
            panels.append(
                f'<div class="code-panel{active}" id="code-{lang}"{display}>\n'
                f'<pre><code class="language-{lang}">{escaped}</code></pre>\n'
                f'</div>'
            )

        return "\n".join(tab_bar + panels)

    return pattern.sub(replace_block, text)


# ─── YOUTUBE + REFERENCES ──────────────────────────────────────────────────────

def expand_youtube(text: str) -> str:
    level_labels = {
        "beginner":     "Beginner",
        "intermediate": "Intermediate",
        "advanced":     "Advanced",
    }

    def replace_block(match):
        fields = {}
        for line in match.group(1).strip().splitlines():
            line = line.strip()
            if not line or ":" not in line:
                continue
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()

        title   = safe_escape(fields.get("title", ""))
        channel = safe_escape(fields.get("channel", ""))
        url     = safe_escape(fields.get("url", ""), quote=True)
        level   = level_labels.get(fields.get("level", "").lower(), "")
        why     = safe_escape(fields.get("why", ""))
        link    = (f'<a href="{url}" target="_blank" rel="noopener">Watch &#8599;</a>'
                   if url else "")

        return (
            '<div class="interview-question">\n'
            f'    <strong>{title}</strong> &mdash; {channel}<br>\n'
            f'    <span>{level}</span>'
            + (f' &middot; {why}' if why else '') + '<br>\n'
            f'    {link}\n'
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
        display = safe_escape(fields.get("text", ""))
        url     = safe_escape(fields.get("url", "").strip(), quote=True)
        refs.append(
            f'<li><a href="{url}" target="_blank" rel="noopener">{display}</a></li>'
            if url else f'<li>{display}</li>'
        )
        return "REFS_PLACEHOLDER"

    cleaned = re.sub(
        r'\[ref\]\s*(.+?)\s*\[/ref\]',
        collect_ref,
        text,
        flags=re.DOTALL
    )

    if not refs:
        return text

    ul      = '<ul>\n' + '\n'.join(f'    {r}' for r in refs) + '\n</ul>'
    cleaned = re.sub(r'REFS_PLACEHOLDER\s*', "", cleaned)
    cleaned = re.sub(
        r'(<summary><h2(?:\s+id="[^"]*")?>Links[^<]*References</h2></summary>\s*<div class="section-content">)(.*?)(</div>\s*</details>)',
        lambda m: m.group(1) + '\n' + ul + '\n' + m.group(3),
        cleaned,
        flags=re.DOTALL,
        count=1
    )
    return cleaned


# ─── IMAGE PROMPTS ─────────────────────────────────────────────────────────────

# DSA uses dark navy style; AWS uses white background / AWS-orange style
DSA_PROMPT_FOOTER = """
COLOR RULES (fixed across every topic):
- Background: dark navy #0f1117
- Array cells default: #1e2130, monospace font
- Active/current: #7c3aed background, white text, purple glow
- Eliminated: #111827 background, #374151 text
- Found/result: #065f46 background, #4ade80 border and glow
- Decision text: amber #fbbf24
- Step label: white #e2e8f0

STYLE: Modern dark UI, subtle 3D depth on cells, neon glow on highlighted elements.
OUTPUT: 1200x600px PNG"""

AWS_PROMPT_FOOTER = """
COLOR PALETTE (USE ONLY THESE):
- AWS Orange: #FF9900
- AWS Dark: #232F3E
- Green: #3F8624
- Blue: #0073BB
- Black: #000000
- White: #FFFFFF

STYLE CONSTRAINTS:
- Canvas: 1200x800px, solid white background (#FFFFFF)
- All rectangles: Rounded corners 8px radius
- All text: Arial font family ONLY
- All icons: Simple, flat, monochrome
- Line widths: 2-3px consistently
- No shadows, gradients, or 3D effects
- No decorative elements
- Minimum 30px padding from canvas edges

CRITICAL RULES:
- Follow coordinates EXACTLY as specified
- Do NOT add creative embellishments
- Do NOT change colors
- Do NOT add extra elements
OUTPUT: PNG"""


def expand_image_prompts(text: str, output_dir: str = '.', viz_image_order: list = None,
                         subject: str = "dsa") -> str:
    pattern = re.compile(
        r'\[image-prompts\]\s*(.+?)\s*\[/image-prompts\]',
        re.DOTALL
    )
    match = pattern.search(text)
    if not match:
        return text

    raw              = match.group(1).strip()
    viz_image_order  = viz_image_order or []
    filename_to_step = {fn: i + 1 for i, (fn, _) in enumerate(viz_image_order)}
    total            = len(viz_image_order)
    footer           = DSA_PROMPT_FOOTER if subject == "dsa" else AWS_PROMPT_FOOTER

    blocks    = [b.strip() for b in re.split(r'\n---\n', raw) if b.strip()]
    assembled = []

    for block in blocks:
        header_match = re.match(r'^([^\n:]+\.png):\s*\n(.*)', block, re.DOTALL)
        if not header_match:
            print(f"⚠️  Malformed image-prompts block, skipping: {block[:60]}")
            continue

        filename = header_match.group(1).strip()
        body     = header_match.group(2).strip()
        step     = filename_to_step.get(filename)

        if step is None:
            step_label = f"IMAGE — {filename}"
        else:
            step_label = f"IMAGE {step} of {total} — {filename.rsplit('.', 1)[0]}"

        full_prompt = (
            f"## {step_label}\n"
            f"Filename: {filename}\n\n"
            f"Create a {'DSA visualization' if subject == 'dsa' else 'AWS architecture'} diagram.\n\n"
            f"{body}\n"
            f"{footer}"
        )
        assembled.append(full_prompt)

    final_md  = "\n\n---\n\n".join(assembled)
    out_path  = os.path.join(output_dir, "image-prompts.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(final_md + "\n")
    print(f"✅ image-prompts.md written → {out_path}")

    return pattern.sub("", text)


# ─── EXAM HIGHLIGHTS ───────────────────────────────────────────────────────────

def expand_exam_highlights(text: str) -> str:
    text = re.sub(
        r'==(.+?)==',
        r'<span class="exam-highlight-sentence">\1</span>',
        text
    )
    text = re.sub(
        r'\*\*([^*]{1,40})\*\*',
        lambda m: (
            f'<span class="exam-highlight-term" data-term="{m.group(1)}">'
            + m.group(1) + '</span>'
        ),
        text
    )
    return text


# ─── CALLOUT BOXES ─────────────────────────────────────────────────────────────

CALLOUT_BOX_CLASS = {
    "note":      "info-box",
    "important": "highlight-box",
    "warning":   "error-box",
}


def expand_callout_boxes(text: str) -> str:
    for tag, css_class in CALLOUT_BOX_CLASS.items():
        pattern = re.compile(
            r'\[' + tag + r'\]\s*(.+?)\s*\[/' + tag + r'\]',
            re.DOTALL
        )

        def replace(match, css_class=css_class):
            inner = safe_escape(match.group(1).strip())
            return (
                f'<div class="{css_class}">\n'
                f'    <p>{inner}</p>\n'
                f'</div>'
            )

        text = pattern.sub(replace, text)
    return text


# ─── SUMMARY / TAKEAWAYS ───────────────────────────────────────────────────────

def expand_summary(text: str) -> str:
    def replace_takeaways(match):
        inner = match.group(1).strip()
        items = [
            safe_escape(line.strip()[2:].strip())
            for line in inner.splitlines()
            if line.strip().startswith("- ")
        ]
        lis = "\n".join(f"        <li>{item}</li>" for item in items)
        return (
            '<div class="highlight-box">\n'
            '    <p><strong>Key Takeaways:</strong></p>\n'
            '    <ul>\n'
            + lis + '\n'
            '    </ul>\n'
            '</div>'
        )

    return re.sub(
        r'\[takeaways\]\s*(.+?)\s*\[/takeaways\]',
        replace_takeaways,
        text,
        flags=re.DOTALL
    )


# ─── COLLAPSIBLE SECTION EXPANSION ─────────────────────────────────────────────

MAX_ID_LEN = 60  # hard cap so a long/garbled heading can't produce a runaway id


def slugify(text: str) -> str:
    # Defense in depth: collapse any stray newlines/control chars first, in
    # case a heading_text ever arrives multi-line (e.g. from a future regex
    # change upstream) instead of the single-line string this function
    # currently always receives. Without this, a slug could silently swallow
    # unrelated content that appeared on a later line.
    text = re.sub(r'[\r\n\t]+', ' ', text)
    text = re.sub(r'[^\w\s-]', '', text)
    text = text.strip().lower()
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text).strip('-')

    if not text:
        return "section"

    # Truncate on a hyphen boundary so we never cut a word in half (which is
    # exactly what produced the "task-5-migr..." style corruption — a slug
    # truncated mid-word became visually indistinguishable from a slug that
    # had unrelated content spliced onto it).
    if len(text) > MAX_ID_LEN:
        text = text[:MAX_ID_LEN].rsplit('-', 1)[0] or text[:MAX_ID_LEN]

    # HTML ids should not start with a digit (fragile for CSS/JS selectors
    # even though the HTML5 spec technically allows it).
    if text[0].isdigit():
        text = f"sec-{text}"

    return text


def parse_heading_id(heading_text: str, used_ids: set) -> tuple:
    explicit = re.search(r'\{#([\w-]+)\}\s*$', heading_text)
    if explicit:
        base_id    = explicit.group(1)[:MAX_ID_LEN].strip('-') or "section"
        clean_text = heading_text[:explicit.start()].strip()
    else:
        clean_text = heading_text.strip()
        base_id    = slugify(clean_text)

    final_id = base_id
    n = 2
    while final_id in used_ids:
        final_id = f"{base_id}-{n}"
        n += 1
    used_ids.add(final_id)
    return clean_text, final_id


def expand_collapsible(text: str, used_ids: set = None) -> str:
    if used_ids is None:
        used_ids = set()

    text = re.sub(r'\[collapsible-section o\]', '<details class="collapsible-section" open>', text)
    text = re.sub(r'\[collapsible-section\]',   '<details class="collapsible-section">',      text)
    text = text.replace("[/collapsible-section]", "</div>\n</details>")

    def replace_heading(match):
        details_tag  = match.group(1)
        hashes       = match.group(2)
        heading_text = match.group(3)
        level        = len(hashes)  # 2 for "##", 3 for "###"
        clean_text, heading_id = parse_heading_id(heading_text, used_ids)
        return (
            f'{details_tag}\n'
            f'<summary><h{level} id="{heading_id}">{clean_text}</h{level}></summary>\n'
            f'<div class="section-content">'
        )

    # Matches both "## Heading" (top-level collapsibles) and "### Heading"
    # (nested collapsibles, e.g. inside a lab's Background section) directly
    # following a <details> tag.
    text = re.sub(
        r'(<details[^>]*>)\s*\n(##{1,2}) (.+)',
        replace_heading,
        text
    )
    return text


# ─── MARKDOWN → HTML ───────────────────────────────────────────────────────────

def convert_sections(body_md: str, used_ids: set = None) -> str:
    if used_ids is None:
        used_ids = set()

    lines    = body_md.split("\n")
    output   = []
    in_pre   = False
    in_table = False
    in_ul    = False
    in_ol    = False
    pre_lang = ""
    i = 0

    ol_item_re = re.compile(r'^(\d+)\.\s+(.*)$')

    def close_ul():
        nonlocal in_ul
        if in_ul:
            output.append("</ul>")
            in_ul = False

    def close_ol():
        nonlocal in_ol
        if in_ol:
            output.append("</ol>")
            in_ol = False

    def close_lists():
        close_ul()
        close_ol()

    def close_table():
        nonlocal in_table
        if in_table:
            output.append("</tbody></table>")
            in_table = False

    def inline_fmt(text: str) -> str:
        # Order matters: code first so formatting characters inside code
        # spans are never reinterpreted. **term** and ==sentence== are
        # deliberately NOT touched here — they're reserved for exam
        # highlights and are converted later by expand_exam_highlights(),
        # after convert_sections has finished escaping everything else.
        text = safe_escape(text)
        text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
        text = re.sub(r'\[\[([^\]]+)\]\]', r'<kbd>\1</kbd>', text)               # [[Ctrl]] -> keyboard key
        text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)   # [text](url)
        text = re.sub(r'!!(.+?)!!', r'<strong>\1</strong>', text)                 # !!bold!!
        text = re.sub(r'\+\+(.+?)\+\+', r'<u>\1</u>', text)                       # ++underline++
        # //italic// — guarded with a negative lookbehind for ':' so this
        # doesn't fire on "https://" / "http://" appearing as plain text
        # (not wrapped in a markdown link). This is a mitigation, not a
        # guarantee — two unrelated bare URLs on the same line can still
        # collide. Prefer [text](url) links over bare URLs in prose.
        text = re.sub(r'(?<!:)//(.+?)//', r'<em>\1</em>', text)
        text = re.sub(r'~~(.+?)~~', r'<del>\1</del>', text)                       # ~~strike~~
        text = re.sub(r'%%(.+?)%%', r'<mark>\1</mark>', text)                     # %%highlight%%
        text = re.sub(r'\^\^(.+?)\^\^', r'<sup>\1</sup>', text)                   # ^^superscript^^
        text = re.sub(r',,(.+?),,', r'<sub>\1</sub>', text)                       # ,,subscript,,
        text = re.sub(r'\{\{--(.+?)--\}\}', r'<small>\1</small>', text)           # {{--small--}}
        return text

    def is_table_separator(line: str) -> bool:
        return bool(re.match(r'^[\|\s\-:]+$', line.strip()))

    def parse_table_row(line: str):
        return [c.strip() for c in line.strip().strip("|").split("|")]

    while i < len(lines):
        line    = lines[i]
        stripped = line.strip()

        if stripped.startswith("```"):
            if not in_pre:
                close_lists(); close_table()
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

        if stripped.startswith("<pre>") or stripped.startswith("<pre ") or re.match(r'^<pre\b', stripped):
            close_lists(); close_table()
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
            close_lists(); close_table()
            output.append(line)
            i += 1
            continue

        if stripped.startswith("|"):
            close_lists()
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
            close_lists()
            output.append(f"<h4>{inline_fmt(line[5:].strip())}</h4>")
        elif line.startswith("### "):
            close_lists()
            heading_text = line[4:].strip()
            clean_text, heading_id = parse_heading_id(heading_text, used_ids)
            output.append(f'<h3 id="{heading_id}">{inline_fmt(clean_text)}</h3>')
        elif line.startswith("## "):
            close_lists()
            heading_text = line[3:].strip()
            clean_text, heading_id = parse_heading_id(heading_text, used_ids)
            output.append(f'<h2 id="{heading_id}">{inline_fmt(clean_text)}</h2>')
        elif line.startswith("# "):
            close_lists()
            output.append(f"<h1>{inline_fmt(line[2:].strip())}</h1>")
        elif stripped.startswith("- "):
            close_ol()
            if not in_ul:
                output.append("<ul>")
                in_ul = True
            output.append(f"<li>{inline_fmt(stripped[2:])}</li>")
        elif ol_item_re.match(stripped):
            close_ul()
            if not in_ol:
                output.append("<ol>")
                in_ol = True
            output.append(f"<li>{inline_fmt(ol_item_re.match(stripped).group(2))}</li>")
        elif stripped == "":
            close_lists()
            output.append("")
        else:
            close_lists()
            output.append(f"<p>{inline_fmt(stripped)}</p>")

        i += 1

    close_table()
    close_lists()
    if in_pre:
        output.append("</code></pre>")

    return "\n".join(output)


def safe_escape(value, quote=False):
    """
    HTML-escape text while preserving existing HTML entities.

    Examples:
        "A < B"               -> "A &lt; B"
        "&#8599;"             -> "&#8599;"
        "&rarr;"              -> "&rarr;"
        "&copy;"              -> "&copy;"
        "<script>"            -> "&lt;script&gt;"
    """
    if value is None:
        return ""

    escaped = html_mod.escape(str(value), quote=quote)
    return _HTML_ENTITY_RE.sub(r'&\1', escaped)
# ─── SECTION STRIPPING ─────────────────────────────────────────────────────────

def strip_data_section_wrapper(body_md: str, tag: str, heading: str) -> tuple:
    """
    Removes the entire <collapsible-section>##Heading...[blocks]...</collapsible-section>
    wrapper for a data-driven section. Returns (cleaned_body, extracted_inner | None).
    Falls back to grabbing bare [tag]...[/tag] blocks with no wrapper.
    """
    pattern = re.compile(
        r'<collapsible-section[^>]*>\s*\n##\s*' + re.escape(heading) +
        r'\s*\n(.*?)\n</collapsible-section>',
        re.DOTALL
    )
    match = pattern.search(body_md)
    if match:
        inner  = match.group(1)
        body_md = body_md[:match.start()] + body_md[match.end():]
        return body_md, inner

    bare_pattern = re.compile(
        r'(?:\[' + re.escape(tag) + r'\]\s*.*?\s*\[/' + re.escape(tag) + r'\]\s*)+',
        re.DOTALL
    )
    bare_match = bare_pattern.search(body_md)
    if bare_match:
        inner  = bare_match.group(0)
        body_md = body_md[:bare_match.start()] + body_md[bare_match.end():]
        return body_md, inner

    return body_md, None


# ─── SECTION REORDERING ────────────────────────────────────────────────────────

def reorder_sections(html: str, injected_containers: list, subject: str, is_lab: bool = False) -> str:
    """
    Extracts all top-level <details class="collapsible-section"> blocks.
    Theory blocks (headings NOT in the fixed order list) stay first, in
    original authored order. Fixed sections follow in canonical order.
    Data-driven containers override any stray empty block with same heading.

    Uses depth-tracking extraction to correctly handle nested <details>
    elements inside collapsible sections (e.g. lab Background with nested
    subsections) — the naive DOTALL regex stops at the first </details>
    instead of the matching outer one.
    """
    if subject == "dsa":
        fixed_order = DSA_FIXED_SECTION_ORDER
    elif is_lab:
        fixed_order = AWS_LAB_FIXED_SECTION_ORDER
    else:
        fixed_order = AWS_FIXED_SECTION_ORDER

    fixed_order_ids = [slugify(h) for h in fixed_order]

    def extract_top_level_blocks(text: str) -> list[tuple[int, int, str]]:
        """
        Returns list of (start, end, full_block_text) for every top-level
        <details class="collapsible-section"...> in text, tracking nesting
        depth so inner <details> don't terminate the outer block early.
        """
        results  = []
        i        = 0
        length   = len(text)
        open_tag = re.compile(r'<details\b[^>]*>', re.IGNORECASE)
        close_tag = re.compile(r'</details\s*>', re.IGNORECASE)

        while i < length:
            # Find the next top-level collapsible-section opening tag
            m = re.search(r'<details class="collapsible-section"[^>]*>', text[i:], re.IGNORECASE)
            if not m:
                break

            start  = i + m.start()
            depth  = 1
            cursor = i + m.end()

            while cursor < length and depth > 0:
                next_open  = open_tag.search(text, cursor)
                next_close = close_tag.search(text, cursor)

                if not next_close:
                    break

                if next_open and next_open.start() < next_close.start():
                    depth  += 1
                    cursor  = next_open.end()
                else:
                    depth  -= 1
                    cursor  = next_close.end()

            results.append((start, cursor, text[start:cursor]))
            i = cursor

        return results

    def get_block_heading_id(block: str) -> str:
        """
        Extracts the heading id from the first <summary><h2|h3 id="...">
        inside a block. Falls back to slugifying the heading text.
        """
        m = re.search(r'<summary><h[23](?:\s+id="([^"]*)")?>(.*?)</h[23]>', block)
        if not m:
            return ""
        return m.group(1) or slugify(m.group(2).strip())

    # ── Extract all top-level collapsible-section blocks ──
    blocks   = extract_top_level_blocks(html)
    theory_blocks = []
    fixed_found   = {}

    for start, end, block in blocks:
        key = get_block_heading_id(block)
        if key in fixed_order_ids:
            fixed_found[key] = block
        else:
            theory_blocks.append(block)

    # ── Override with injected data-driven containers ──
    for container in injected_containers:
        key = get_block_heading_id(container)
        if key:
            fixed_found[key] = container

    # ── Remove all top-level blocks from html (remainder = non-block content) ──
    remainder = html
    for start, end, block in reversed(blocks):
        remainder = remainder[:start] + remainder[end:]
    remainder = remainder.strip()

    # ── Reassemble: theory first (original order), then fixed order ──
    ordered = list(theory_blocks)
    used    = set()

    for key in fixed_order_ids:
        if key in fixed_found:
            ordered.append(fixed_found[key])
            used.add(key)

    for key, block in fixed_found.items():
        if key not in used:
            ordered.append(block)

    result = "\n\n".join(ordered)
    if remainder:
        result = remainder + "\n\n" + result
    return result


# ─── MAIN BODY PARSER ──────────────────────────────────────────────────────────

def parse_md_body(body_md: str, fm: dict, subject: str, is_lab: bool = False) -> str:
    output_dir = fm.get('_output_dir', '.')

    # DSA only: strip animation block (animate.py handles it separately)
    if subject == "dsa":
        body_md = re.sub(r'\[animation\].+?\[/animation\]', '', body_md, flags=re.DOTALL)

    # AWS only: extract [screenshot-guide] blocks → screenshot-guide.md
    # Runs before any stashing so the blocks are cleanly stripped from the
    # body before downstream processing.
    if subject == "aws":
        body_md = parse_screenshot_guide(body_md, output_dir)

    # AWS only: strip the Reflection Questions wrapper, then parse its
    # [reflection] blocks (static HTML, no JSON). Stripping the wrapper
    # first (same as every other data-driven section) prevents an empty
    # duplicate shell being left behind in the body.
    reflection_html = ""
    if subject == "aws":
        body_md, reflection_inner = strip_data_section_wrapper(
            body_md, "reflection", DATA_SECTION_HEADINGS["reflection"]
        )
        if reflection_inner is not None:
            _, reflection_questions = parse_reflection(reflection_inner)
            reflection_html = build_reflection_html(reflection_questions)

    # For each data-driven section: strip wrapper, parse JSON, queue container
    injected_containers = []

    for tag, heading in DATA_SECTION_HEADINGS.items():
        # Skip sections that don't belong to this subject
        if tag in DSA_ONLY_SECTIONS and subject != "dsa":
            continue
        if tag in AWS_ONLY_SECTIONS and subject != "aws":
            continue
        # reflection handled above (static HTML, no JSON parse step)
        if tag == "reflection":
            continue

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
        elif tag == "hands-on":
            # inner already has the [hands-on]...[/hands-on] wrapper stripped
            # by strip_data_section_wrapper — wrap it back so parse_hands_on
            # can find its [project] blocks via its own outer pattern.
            wrapped = f"[hands-on]{inner}[/hands-on]"
            _, projects_html = parse_hands_on(wrapped, output_dir)
            if projects_html:
                # parse_hands_on() builds this HTML on its own, entirely
                # outside the main convert_sections()/expand_*() pipeline
                # below. That means any [warning]/[note]/[important] box or
                # **bold**/==highlight== markup written inside a step's text
                # (e.g. a cost alert embedded in a numbered step) is never
                # touched by expand_callout_boxes()/expand_exam_highlights()
                # and leaks into the page as literal bracket/asterisk text.
                # Run the same two expansions here, in the same order used
                # in the main pipeline (callout boxes first, so their
                # safe_escape() call can't double-escape spans that
                # exam-highlight expansion would otherwise inject first).
                projects_html = expand_callout_boxes(projects_html)
                projects_html = expand_exam_highlights(projects_html)
                injected_containers.append(build_hands_on_html_section(projects_html))

    # If we have reflection HTML, inject it as a container too
    if reflection_html:
        injected_containers.append(reflection_html)

    page_used_ids = set()
    body_md = expand_collapsible(body_md, used_ids=page_used_ids)

    # DSA only: visualisation tab panel
    viz_image_order = []
    if subject == "dsa":
        slug           = fm.get("slug", "")
        animation_name = fm.get("animation_name") or f"{slug}-animation"
        viz_image_order = extract_visualisation_image_order(body_md)
        body_md = expand_visualisation(body_md, slug=slug, animation_name=animation_name)

    # Stash blocks that must survive convert_sections unchanged
    takeaway_blocks = {}

    def _stash(m):
        key = f'TAKEAWAY_PLACEHOLDER_{len(takeaway_blocks)}_END'
        takeaway_blocks[key] = m.group(0)
        return key

    stash_patterns = [
        r'\[takeaways\].+?\[/takeaways\]',
        r'\[youtube\].+?\[/youtube\]',
        r'\[ref\].+?\[/ref\]',
        r'\[image-prompts\].+?\[/image-prompts\]',
        r'\[screenshot-guide\].+?\[/screenshot-guide\]',  # safety — should be gone by now
        r'\[note\].+?\[/note\]',
        r'\[important\].+?\[/important\]',
        r'\[warning\].+?\[/warning\]',
        r'\[image:[^|\]]+\|[^\]]+\]',
    ]
    for pat in stash_patterns:
        body_md = re.sub(pat, _stash, body_md, flags=re.DOTALL)

    body_md = expand_code_tabs(body_md)
    html    = convert_sections(body_md, used_ids=page_used_ids)

    # Restore stashed blocks
    for key, block in takeaway_blocks.items():
        html = html.replace(key, block)

    # expand_summary() and expand_callout_boxes() must run BEFORE
    # expand_exam_highlights(). Both call safe_escape() on their restored
    # stash content, and safe_escape() HTML-escapes '<' / '>'. If exam
    # highlights ran first, the <span class="exam-highlight-term"...>
    # tags they inject would themselves get escaped into literal
    # "&lt;span...&gt;" text the next time safe_escape() touched that
    # block — which is exactly the raw-span-text-leaking-into-the-page
    # bug. Running these two first means safe_escape() only ever sees
    # plain markdown (with **term** / ==sentence== still untouched), and
    # expand_exam_highlights() converts those markers into spans afterward,
    # once, with nothing left to double-escape them.
    html = expand_summary(html)
    html = expand_callout_boxes(html)

    html = expand_exam_highlights(html)

    html = expand_inline_images(html)
    html = expand_youtube(html)
    html = expand_references(html)
    html = expand_image_prompts(html, output_dir, viz_image_order, subject=subject)
    html = reorder_sections(html, injected_containers, subject=subject, is_lab=is_lab)

    return html


# ─── BODY BUILDER ──────────────────────────────────────────────────────────────

def build_body(fm: dict, body_md: str, cfg: dict, subject: str, is_lab: bool = False) -> str:
    depth     = cfg["path_depth"]
    note_type = subject
    mode_attr = ' data-mode="lab"' if is_lab else ""

    parsed_sections = parse_md_body(body_md, fm, subject, is_lab=is_lab)
    read_time = calculate_read_time(parsed_sections)          # <-- NEW

    # AWS gets a lecture box (and lab notes always have session info); DSA doesn't use it
    extra_top = build_lecture_box(fm) if subject == "aws" else ""

    return "\n".join([
        f'<body data-subject="{note_type}"{mode_attr}>',
        "",
        build_schema_ld(fm, cfg),
        "",
        '<div id="pageLoader" class="page-loader">',
        '    <div class="loader-spinner"></div>',
        '    <p class="loader-text">Loading...</p>',
        '</div>',
        '',
        '<div class="note-container">',
        "",
        extra_top,
        "",
        build_when_to_use(fm),
        "",
        '<div class="note-content">',
        "",
        parsed_sections,
        "",
        f'<div class="tags" aria-label="Topic tags">',
        *[f'    <span class="tag">{tag}</span>' for tag in fm.get("tags", [])],
        '</div>',
        '',
        "",
        "</div><!-- end note-content -->",
        "",
        "</div><!-- end note-container -->",
        f'<div id="footerRoot" data-subject="{note_type}"></div>',
        "",
        f'<script>window.NoteReadTime = {json.dumps(read_time)};</script>',   # <-- NEW
        f'<script src="{depth}js/notes/notes-page-core.js" async="false"></script>',
        "",
        "</body>",
        "</html>",
    ])


# ─── TOP-LEVEL BUILD ───────────────────────────────────────────────────────────

def build_html(md_path: str) -> str:
    raw = read_file(md_path)
    fm, body_md = parse_frontmatter(raw)

    # Presentation Mode and Video Slides mode are both a third content
    # type, structurally unrelated to the collapsible-section AWS/DSA note
    # pipeline below — they share one builder in utils/parse_slides.py.
    # Side-effect files (knowledge-check json, diagram-prompts.md) are
    # written here, same pattern as the DSA animate.run() side effect
    # further down for the standard pipeline.
    #
    # Video Slides mode MUST be checked first: it also sets
    # `presentation: true` in its frontmatter (see detect_presentation_mode
    # docstring), so checking presentation mode first would misdetect it.
    if detect_video_slides_mode(md_path, fm) or detect_presentation_mode(md_path, fm):
        md_dir = os.path.dirname(md_path)
        topic_root = os.path.dirname(md_dir) if os.path.basename(md_dir) == "markdown" else md_dir
        subject = detect_subject(md_path, fm)
        html, slides = build_slides_html(fm, body_md, subject=subject)
        slug = fm.get("slug", "presentation")
        write_diagram_prompts(slides, topic_root, slug)
        return html

    subject = detect_subject(md_path, fm)
    cfg     = TYPE_CONFIG[subject]
    is_lab  = detect_lab_mode(md_path, fm) if subject == "aws" else False

    validate_frontmatter(fm, subject, is_lab=is_lab)

    md_dir     = os.path.dirname(md_path)
    topic_root = os.path.dirname(md_dir) if os.path.basename(md_dir) == "markdown" else md_dir
    fm['_output_dir'] = topic_root

    html_parts = [
        build_doctype(),
        build_head(fm, cfg),
        build_body(fm, body_md, cfg, subject, is_lab=is_lab),
    ]

    # DSA: run animate.py as a side effect
    if subject == "dsa" and cfg["has_animation"]:
        try:
            animate.run(md_path, project_root="..")
        except Exception as e:
            print(f"⚠️  Animation generation skipped: {e}")

    return "\n".join(html_parts)


# ─── CLI + INBOX SCAN ──────────────────────────────────────────────────────────

MARKDOWN_INBOX = "../src/data/notes/markdown"
NOTES_ROOT     = "../src/data/notes"


def resolve_md_path(arg: str) -> str:
    if arg.endswith(".md") and os.path.exists(arg):
        return arg

    guesses = [
        f"../src/data/notes/dsa-{arg}/markdown/dsa-{arg}.md",
        f"../src/data/notes/aws-{arg}/markdown/aws-{arg}.md",
        f"../src/data/notes/dsa-{arg}/{arg}.md",
        f"../src/data/notes/aws-{arg}/{arg}.md",
        f"{arg}.md",
    ]
    for path in guesses:
        if os.path.exists(path):
            return path

    print(f"❌ Could not find md file for: {arg}")
    sys.exit(1)


def get_output_path(md_path: str) -> str:
    """
    Resolves the output HTML path for single-file CLI builds.

    Uses the same topic_root resolution as build_html() (parent of the
    markdown/ subfolder) rather than the raw dirname of md_path — md_path
    normally lives at .../[subject]-[slug]/markdown/[file].md, so a plain
    os.path.dirname() would incorrectly place the output HTML inside the
    markdown/ subfolder itself instead of at the topic root.

    Filename is chosen by content type — Video Slides mode is checked
    before Presentation Mode since it also sets `presentation: true` (see
    detect_presentation_mode's docstring).
    """
    md_dir = os.path.dirname(md_path)
    topic_root = os.path.dirname(md_dir) if os.path.basename(md_dir) == "markdown" else md_dir
    raw = read_file(md_path)
    fm, _ = parse_frontmatter(raw)
    if detect_video_slides_mode(md_path, fm):
        filename = "slides-overview.html"
    elif detect_presentation_mode(md_path, fm):
        filename = "slides.html"
    else:
        filename = "notes.html"
    return os.path.join(topic_root, filename)


def scan_and_build_inbox():
    """
    Batch mode: scans MARKDOWN_INBOX for any aws-*.md or dsa-*.md file.
    For each one found, one of three routes applies:

      A. Video Slides mode — [subject]-[topic-slug]-slides-overview.md.
         This is a COMPANION to a note that must already exist. It is
         routed into that note's EXISTING topic folder (base slug, with
         "-slides-overview" stripped) and copied in as the fixed filename
         markdown/slides-overview.md — never a new folder. If the base
         topic folder doesn't exist yet, this is a build error: you can't
         generate a video-slides companion for a note that hasn't been
         built.

      B. Presentation mode — [subject]-[topic-slug]-slides.md. Gets its
         OWN topic folder, [subject]-[topic-slug]-slides/, same convention
         as a lab's "-session-[name]-lab" suffix — it is a distinct deck,
         not a variant of the standard note, so it doesn't share a folder
         with one. (Earlier versions of this pipeline stripped "-slides"
         and merged it into the standard note's folder; that contradicted
         presentation-instructions.md and has been reverted.)

      C. Everything else (standard notes, labs) — folder inherits the
         full slug, unchanged.

    For A and B: build it (HTML + diagram-prompts.md side effect).
    For C: build it (HTML + JSON files + image-prompts.md + animation if DSA).
    """
    if not os.path.isdir(MARKDOWN_INBOX):
        print(f"❌ No inbox folder found at {MARKDOWN_INBOX}")
        return

    found = [
        f for f in os.listdir(MARKDOWN_INBOX)
        if (f.startswith("aws-") or f.startswith("dsa-")) and f.endswith(".md")
    ]

    if not found:
        print(f"No aws-*.md or dsa-*.md files found in {MARKDOWN_INBOX}")
        return

    for filename in found:
        if filename.startswith("aws-"):
            subject = "aws"
            slug    = filename[len("aws-"):-len(".md")]
        else:
            subject = "dsa"
            slug    = filename[len("dsa-"):-len(".md")]

        src_path = os.path.join(MARKDOWN_INBOX, filename)

        # ── Route A: Video Slides mode — companion to an EXISTING note ──
        if slug.endswith("-slides-overview"):
            base_slug    = slug[: -len("-slides-overview")]
            topic_folder = os.path.join(NOTES_ROOT, f"{subject}-{base_slug}")

            if not os.path.isdir(topic_folder):
                print(
                    f"❌ Video-slides companion '{filename}' has no matching "
                    f"note folder ({topic_folder}) — build the note first. Skipping."
                )
                continue

            os.makedirs(os.path.join(topic_folder, "markdown"), exist_ok=True)
            # Fixed filename on disk, per video-slides-instructions.md — the
            # topic folder already carries the slug, so the markdown source
            # (like the html output) doesn't need to repeat it.
            dest_path = os.path.join(topic_folder, "markdown", "slides-overview.md")
            os.replace(src_path, dest_path)
            print(f"📦 Moved {filename} → {dest_path}")

            try:
                html     = build_html(dest_path)
                out_path = os.path.join(topic_folder, "slides-overview.html")
                write_file(out_path, html)
                print(f"✅ Output: {out_path}")
            except Exception as e:
                print(f"❌ Build failed for {filename}: {e}")
                import traceback; traceback.print_exc()
            continue

        # ── Route B: Presentation mode — own [subject]-[slug]-slides/ folder ──
        # ── Route C: everything else — folder inherits the full slug ──
        topic_folder = os.path.join(NOTES_ROOT, f"{subject}-{slug}")

        for sub in ("json", "markdown", "images"):
            os.makedirs(os.path.join(topic_folder, sub), exist_ok=True)

        dest_path = os.path.join(topic_folder, "markdown", filename)
        os.replace(src_path, dest_path)
        print(f"📦 Moved {filename} → {dest_path}")

        try:
            html      = build_html(dest_path)
            dest_fm, _ = parse_frontmatter(read_file(dest_path))
            out_name  = "slides.html" if detect_presentation_mode(dest_path, dest_fm) else "notes.html"
            out_path  = os.path.join(topic_folder, out_name)
            write_file(out_path, html)
            print(f"✅ Output: {out_path}")
        except Exception as e:
            print(f"❌ Build failed for {filename}: {e}")
            import traceback; traceback.print_exc()


def scan_and_build_video_slides():
    """
    Video Slides mode files (slides-overview.md, `derived_from_note: true`)
    are authored directly into an EXISTING topic's markdown/ subfolder —
    per video-slides-instructions.md they are a companion to a note that's
    already been built, so they never pass through the flat MARKDOWN_INBOX
    the way new-topic aws-*.md/dsa-*.md files do, and scan_and_build_inbox()
    would never find them (its filter only matches aws-*/dsa-* filenames
    in that flat inbox folder).

    This walks NOTES_ROOT looking for markdown/slides-overview.md inside
    any existing topic folder and (re)builds slides-overview.html at that
    topic's root — matching build_html()'s topic_root resolution and the
    fixed-filename output rule from video-slides-instructions.md.
    """
    if not os.path.isdir(NOTES_ROOT):
        return

    for topic_name in sorted(os.listdir(NOTES_ROOT)):
        topic_folder = os.path.join(NOTES_ROOT, topic_name)
        md_path = os.path.join(topic_folder, "markdown", "slides-overview.md")
        if not os.path.isfile(md_path):
            continue

        try:
            html = build_html(md_path)
            out_path = os.path.join(topic_folder, "slides-overview.html")
            write_file(out_path, html)
            print(f"✅ Video slides output: {out_path}")
        except Exception as e:
            print(f"❌ Video slides build failed for {topic_name}: {e}")
            import traceback; traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] == "--scan":
        scan_and_build_inbox()
        scan_and_build_video_slides()
        sys.exit(0)

    md_path = resolve_md_path(sys.argv[1])
    print(f"🔨 Building: {md_path}")

    html     = build_html(md_path)
    raw      = read_file(md_path)
    fm, _    = parse_frontmatter(raw)
    out_path = get_output_path(md_path)

    write_file(out_path, html)
    print(f"✅ Output: {out_path}")