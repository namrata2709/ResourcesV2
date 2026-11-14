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
import itertools
from datetime import datetime


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
from utils.parse_slides import is_presentation, is_video_slides_overview, build_slides_html, write_diagram_prompts, write_slides_json


# ─── CONFIG ────────────────────────────────────────────────────────────────────

from utils.site_config import BASE_URL

# ─── SUBJECT REGISTRY (T3-7) ────────────────────────────────────────────────
# subjects.json is the single source of truth for per-subject config, shared
# with the React app (NotesIndex.tsx reads the same file). Same relative-path
# convention already used for CATEGORY_ICONS_PATH in generate_notes_index.py —
# mirrored here deliberately, not a new scheme.
#
# Adding a 3rd subject: add its entry to subjects.json. No edit needed here
# UNLESS that subject needs subject-specific *content* behavior beyond what
# "features" gates (section order, image-prompt wording) — those still live
# as small subject-keyed lookup tables further down this file (search
# "SUBJECT-KEYED" below), since they're prose/ordering, not simple config.
SUBJECTS_JSON_PATH = "../web/public/data/config/subjects.json"

# Path shape below is uniform across every subject today (confirmed: both
# "aws" and "dsa" used identical values in the old hardcoded TYPE_CONFIG) —
# so it's applied once here rather than duplicated per-entry in the JSON.
_PATH_SEGMENT = "data/notes/"
_PATH_DEPTH   = "../../../"


def _load_subjects_registry() -> dict:
    try:
        with open(SUBJECTS_JSON_PATH, "r", encoding="utf-8") as f:
            registry = json.load(f)
    except FileNotFoundError:
        print(f"❌ subjects.json not found at {SUBJECTS_JSON_PATH} — cannot build without the subject registry.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ subjects.json at {SUBJECTS_JSON_PATH} is not valid JSON: {e}")
        sys.exit(1)

    if not registry:
        print(f"❌ subjects.json at {SUBJECTS_JSON_PATH} is empty — need at least one subject.")
        sys.exit(1)

    return registry


def _validate_meta_description(subject_id: str, meta: dict) -> dict:
    """
    T3-7c: subjects.json is now the source of truth for build_description()/
    build_edu_level()'s per-subject behavior too — no more hardcoded
    cfg["subject"] == "dsa" checks. Validated (not silently defaulted)
    for the same reason detect_subject() no longer silently defaults to
    'dsa' (T3-7b): a subject registered without real metaDescription data
    would otherwise fall through to AWS's audience-variable templates by
    accident, which is wrong for a subject that isn't AWS-shaped.
    """
    if not meta:
        print(f"❌ subjects.json entry '{subject_id}' is missing 'metaDescription' — cannot build without it.")
        sys.exit(1)
    mode = meta.get("mode")
    if mode == "fixed":
        if not meta.get("template") or not meta.get("eduLevel"):
            print(f"❌ subjects.json entry '{subject_id}' has metaDescription.mode='fixed' but is missing 'template'/'eduLevel'.")
            sys.exit(1)
    elif mode == "audience":
        if not meta.get("templates") or not meta.get("eduLevels"):
            print(f"❌ subjects.json entry '{subject_id}' has metaDescription.mode='audience' but is missing 'templates'/'eduLevels'.")
            sys.exit(1)
        if "intermediate" not in meta["templates"] or "intermediate" not in meta["eduLevels"]:
            print(f"❌ subjects.json entry '{subject_id}' metaDescription is missing the 'intermediate' fallback key (used when 'audience:' frontmatter is absent/unrecognized).")
            sys.exit(1)
    else:
        print(f"❌ subjects.json entry '{subject_id}' has an unrecognized metaDescription.mode '{mode}' — expected 'fixed' or 'audience'.")
        sys.exit(1)
    return meta


def _build_type_config() -> dict:
    registry = _load_subjects_registry()
    cfg = {}
    for subject_id, entry in registry.items():
        cfg[subject_id] = {
            "title_suffix":  entry["titleSuffix"],
            "extra_css":     entry.get("extraCss"),
            "path_segment":  _PATH_SEGMENT,
            "path_depth":    _PATH_DEPTH,
            "base_url":      f"{BASE_URL}/{_PATH_SEGMENT}",
            "subject":       subject_id,
            "has_animation": entry.get("hasAnimation", False),
            "folder_prefix": entry.get("folderPrefix", subject_id),
            "features":      set(entry.get("features", [])),
            "meta_description": _validate_meta_description(subject_id, entry.get("metaDescription")),
        }
    return cfg


TYPE_CONFIG = _build_type_config()

SITE_BASE = f"{BASE_URL}/"

# Which DATA_SECTION_HEADINGS tag requires which registry feature to be
# present for a given subject. A tag with no entry here is common to every
# subject and is never skipped. Replaces the old hardcoded
# DSA_ONLY_SECTIONS/AWS_ONLY_SECTIONS sets — add a tag here (not a new set)
# if a future subject introduces another subject-exclusive section.
SECTION_REQUIRES_FEATURE = {
    "visual-mcq": "visualMcq",
    "contest":    "contest",
    "hands-on":   "handsOn",
    "reflection": "reflection",
}

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

# SUBJECT-KEYED (T3-7b): canonical section order is prose/ordering, not a
# simple on/off "feature" — per this file's header comment, kept as an
# explicit per-subject table. Subjects not listed here fall through to
# the is_lab/else branch in reorder_sections() below (today that's just
# AWS's lab vs. non-lab split).
FIXED_SECTION_ORDER_BY_SUBJECT = {
    "dsa": DSA_FIXED_SECTION_ORDER,
}


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
# T3-7c: AWS_EDU_LEVEL/AWS_DESCRIPTION_TEMPLATE's *values* now live in
# subjects.json (aws.metaDescription) — the source of truth moved to the
# registry. The two names are kept here, still populated from the same
# registry data on import, purely so nothing else in this file (or a
# script importing generate_notes) that referenced them by name breaks;
# new code should read cfg["meta_description"] via the functions below,
# not these directly.
AWS_EDU_LEVEL           = TYPE_CONFIG["aws"]["meta_description"]["eduLevels"]
AWS_DESCRIPTION_TEMPLATE = TYPE_CONFIG["aws"]["meta_description"]["templates"]


def get_audience(fm: dict, audience_levels: dict) -> str:
    audience = (fm.get("audience") or "intermediate").strip().lower()
    if audience not in audience_levels:
        print(f"⚠️  Unknown audience '{audience}' — defaulting to 'intermediate'")
        audience = "intermediate"
    return audience


def build_description(fm: dict, cfg: dict, keywords_str: str) -> str:
    """
    T3-7c: registry-driven, not a hardcoded cfg["subject"] == "dsa" check.
    'fixed' subjects (e.g. DSA) use one audience-independent template from
    subjects.json; 'audience' subjects (e.g. AWS) pick a template keyed by
    the note's 'audience:' frontmatter, same as before.
    """
    title = fm.get("title", "")
    meta  = cfg["meta_description"]
    if meta["mode"] == "fixed":
        return meta["template"].format(title=title, keywords=keywords_str)

    audience = get_audience(fm, meta["eduLevels"])
    return meta["templates"][audience].format(title=title, keywords=keywords_str)


def build_edu_level(fm: dict, cfg: dict) -> str:
    """T3-7c: registry-driven, not a hardcoded cfg["subject"] == "dsa" check."""
    meta = cfg["meta_description"]
    if meta["mode"] == "fixed":
        return meta["eduLevel"]

    audience = get_audience(fm, meta["eduLevels"])
    return meta["eduLevels"][audience]


# ─── SUBJECT DETECTION ─────────────────────────────────────────────────────────

def detect_subject(md_path: str, frontmatter: dict) -> str:
    """
    Detects subject from:
    1. Frontmatter 'type' field (most explicit), matched against every
       subject registered in subjects.json — not hardcoded to aws/dsa.
    2. Filename prefix '<subject>-*.md', matched against each registered
       subject's folderPrefix.

    T3-7b: an unrecognized subject is now a hard build failure, not a
    silent 'dsa' default — a 3rd subject with a typo'd 'type:' or an
    unrecognized filename prefix used to be silently misclassified as
    DSA (wrong section order, wrong validation rules, wrong everything)
    with only a printed warning easy to miss in a batch run.
    """
    fm_type = frontmatter.get("type", "").lower()
    if fm_type in TYPE_CONFIG:
        return fm_type

    basename = os.path.basename(md_path).lower()
    for subject_id, cfg in TYPE_CONFIG.items():
        prefix = f"{cfg['folder_prefix']}-"
        if basename.startswith(prefix):
            return subject_id

    known = ", ".join(sorted(TYPE_CONFIG.keys()))
    raise ValueError(
        f"Could not detect subject for '{basename}' — frontmatter 'type' is "
        f"'{fm_type or '(missing)'}' (not one of: {known}), and the filename "
        f"doesn't start with a known prefix. Add a valid 'type:' field to the "
        f"frontmatter, rename the file to match a registered folderPrefix in "
        f"subjects.json, or register the new subject there first."
    )


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


# SUBJECT-KEYED (T3-7b): validation strictness, not a rendering "feature" —
# doesn't belong in subjects.json's features list (that gates content
# sections/behavior; this gates which frontmatter fields are enforced).
# Kept as an explicit per-subject table, same convention as
# PROMPT_FOOTER_BY_SUBJECT/DIAGRAM_LABEL_BY_SUBJECT/FIXED_SECTION_ORDER_BY_SUBJECT
# further down this file, rather than an if/elif chain.
REQUIRED_EXTRA_FIELDS_BY_SUBJECT = {
    "aws": ["when_to_use"],   # shared with DSA but critical for AWS
}

# Subjects that default validated_against to the note's date when the
# author didn't set it explicitly.
DEFAULTS_VALIDATED_AGAINST_TO_DATE = {"aws"}


def validate_frontmatter(fm: dict, subject: str, is_lab: bool = False):
    base_required = ["type", "title", "slug", "date", "keywords", "tags"]
    lab_extra     = ["session_name"]          # labs always belong to a named session
    required = base_required + REQUIRED_EXTRA_FIELDS_BY_SUBJECT.get(subject, [])
    if is_lab:
        required = required + lab_extra
    for field in required:
        if field not in fm:
            print(f"⚠️  Missing frontmatter field: '{field}'")

    if subject in DEFAULTS_VALIDATED_AGAINST_TO_DATE and not fm.get("validated_against"):
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


# ─── VERSION INFO BAR + READ TIME BADGE ────────────────────────────────────────
# Added 2026-07-05. Both are new automated features, not authored in markdown —
# previously, any note showing a "Version / Last Updated / Status" bar or a
# visible "N min read" pill had that hand-typed/hand-edited directly into its
# HTML, since nothing in this pipeline generated either. This makes both
# automatic, driven by frontmatter (version/status) and the existing
# calculate_read_time() computation respectively.

def build_version_info_bar(fm: dict) -> str:
    """
    Renders the "Version: X | Last Updated: Y | Status: Z" bar from
    optional frontmatter fields: version, status, date_modified (falls
    back to date if date_modified isn't set — same fallback
    build_schema_ld() already uses for the invisible JSON-LD dateModified,
    kept consistent here for the visible version).
    Returns "" if none of version/status/last-updated are set, so notes
    without any of these fields don't get an empty bar.
    """
    version = str(fm.get("version", "")).strip()
    status  = str(fm.get("status", "")).strip()
    last_updated_raw = fm.get("date_modified") or fm.get("date", "")

    if not (version or status or last_updated_raw):
        return ""

    parts = []
    if version:
        parts.append(f'<span><strong>Version:</strong> {safe_escape(version)}</span>')

    if last_updated_raw:
        try:
            formatted = datetime.strptime(str(last_updated_raw)[:10], "%Y-%m-%d").strftime("%B %d, %Y")
        except (ValueError, TypeError):
            formatted = safe_escape(str(last_updated_raw))
        parts.append(f'<span><strong>Last Updated:</strong> {formatted}</span>')

    if status:
        status_lower = status.lower()
        icon = "✅" if status_lower == "current" else ("⚠️" if status_lower in ("outdated", "deprecated") else "ℹ️")
        parts.append(f'<span><strong>Status:</strong> {icon} {safe_escape(status)}</span>')

    return "\n".join([
        '<div class="version-info-bar">',
        f'    <p>{" ".join(parts)}</p>',
        '</div>',
    ])


def build_read_time_badge(read_time: dict) -> str:
    """
    Renders the visible "📖 N min read" pill from the same read_time dict
    calculate_read_time() already produces for the invisible
    window.NoteReadTime script tag — no separate calculation, just a
    second, visible rendering of the same value.
    """
    minutes = read_time.get("read_time_minutes")
    if not minutes:
        return ""
    return "\n".join([
        '<div class="read-time-badge">',
        f'    <span>📖 {int(minutes)} min read</span>',
        '</div>',
    ])


def insert_after_title_block(parsed_sections: str, injection: str) -> str:
    """
    Inserts `injection` right after the note's <h1> title and its
    immediately-following date paragraph (the "📅 ..." line — both
    authored directly in markdown, not Python-templated, so this can't
    just be added as a fixed template string; it has to be located in the
    already-rendered output). Falls back to right after the <h1> alone if
    no date paragraph immediately follows it, so this still works for a
    note that has no date line for any reason.
    """
    if not injection:
        return parsed_sections

    m = re.search(r'(<h1>.*?</h1>\s*<p>[^<]*📅[^<]*</p>)', parsed_sections, re.DOTALL)
    if m:
        end = m.end()
        return parsed_sections[:end] + "\n" + injection + "\n" + parsed_sections[end:]

    m = re.search(r'<h1>.*?</h1>', parsed_sections, re.DOTALL)
    if m:
        end = m.end()
        return parsed_sections[:end] + "\n" + injection + "\n" + parsed_sections[end:]

    # No <h1> found at all (shouldn't normally happen) — prepend rather
    # than silently drop the injection.
    return injection + "\n" + parsed_sections



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
<summary><h2 id="leetcode-problems">🧩 LeetCode Problems</h2></summary>
<div class="section-content">
<div id="problemsContainer" data-problems-source="json/problems.json"></div>
</div>
</details>"""


def build_contest_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="contest-problems">🏆 Contest Problems</h2></summary>
<div class="section-content">
<div id="contestContainer" data-contest-source="json/contest.json"></div>
</div>
</details>"""


def build_visual_mcq_container() -> str:
    return """<details class="collapsible-section">
<summary><h2 id="visual-questions">🖼️ Visual Questions</h2></summary>
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
        # [^<]*? before "Visualisation" tolerates an optional icon prefix
        # (e.g. "🎬 Visualisation") without requiring one — this heading
        # is authored directly in markdown, not Python-templated, so
        # matching has to accept whatever the author actually typed.
        r'(<summary><h2(?:\s+id="[^"]*")?>[^<]*?Visualisation</h2></summary>\s*'
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
        # [^<]*? before "Links" tolerates an optional icon prefix (e.g.
        # "🔗 Links & References") — same reasoning as the Visualisation
        # regex above, this heading is markdown-authored, not templated.
        r'(<summary><h2(?:\s+id="[^"]*")?>[^<]*?Links[^<]*References</h2></summary>\s*<div class="section-content">)(.*?)(</div>\s*</details>)',
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

# SUBJECT-KEYED (T3-7b): image-prompt wording is prose, not a rendering
# "feature" — per this file's header comment, these stay as explicit
# per-subject lookup tables rather than being forced into subjects.json's
# features list. AWS is the fallback for any subject without its own
# entry (matches the old ternary's default branch).
PROMPT_FOOTER_BY_SUBJECT = {
    "dsa": DSA_PROMPT_FOOTER,
    "aws": AWS_PROMPT_FOOTER,
}

DIAGRAM_LABEL_BY_SUBJECT = {
    "dsa": "DSA visualization",
    "aws": "AWS architecture",
}


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
    footer           = PROMPT_FOOTER_BY_SUBJECT.get(subject, AWS_PROMPT_FOOTER)

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
            f"Create a {DIAGRAM_LABEL_BY_SUBJECT.get(subject, 'AWS architecture')} diagram.\n\n"
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


# ─── BODY-PROSE JSON EXTRACTOR (T5-2, additive, HTML pipeline untouched) ──────
#
# Parallel to convert_sections()/expand_*() above: reuses the same
# block-detection regexes/patterns, but captures structured data instead
# of building an HTML string. Runs on a COPY of body_md at the same point
# in the pipeline where convert_sections() would normally take over (data-
# driven sections like mcq/glossary/etc. already stripped by
# parse_md_body, [collapsible-section] markers still raw) -- the real
# body_md passed to convert_sections() is never touched by this, so the
# existing HTML output is provably unaffected (covered by
# test_generate_notes.py's byte-for-byte regression check).
#
# Deliberately NOT covered here (belongs to T5-3b, DSA-specific, a
# different ticket):
#   - <code-tabs> blocks (expand_code_tabs) -- captured opaquely below as
#     a `code_tabs_raw` marker block so at least their presence/position
#     is visible in the JSON, not silently dropped.
#   - [visualisation]/[animation] DSA panels -- not reader "body prose"
#     in the same sense; T5-3b's own DsaAnimation/TabPanel work covers
#     these directly against the DSA pipeline's existing image-order
#     tracking.
#
# "image-prompts" in the ticket's block-type list is interpreted here as
# the reader-facing [image:file|caption] inline syntax (expand_inline_
# images) -- the trainer-only [image-prompts]...[/image-prompts] block
# (expand_image_prompts) is stripped from the body_md before this point
# and never rendered to a reader, so there is nothing reader-facing for
# it to contribute to a body-prose JSON.

EXAM_TERM_RE = re.compile(r'\*\*([^*]{1,40})\*\*')
EXAM_SENTENCE_RE = re.compile(r'==(.+?)==')


def _extract_runs(text: str) -> list:
    """
    Splits inline markdown into an ordered list of {"text": ..., "mark":
    ...} runs, mirroring convert_sections()'s inline_fmt() token order
    but producing data instead of HTML tags. `mark` is one of: None
    (plain text), "code", "bold", "italic", "underline", "strike",
    "examTerm", "examSentence", or "link" (link runs also carry `url`).
    Marks are mutually exclusive per run (no nested marks) -- matching
    inline_fmt()'s own flat, non-nested regex chain.
    """
    # Tokenize by scanning for the first match among all patterns, left
    # to right, same "first match wins, no overlap" behavior as chained
    # re.sub calls -- but done as a single left-to-right scan so run
    # order in the output matches source order exactly.
    token_patterns = [
        ("examSentence", EXAM_SENTENCE_RE),
        ("examTerm", EXAM_TERM_RE),
        ("code", re.compile(r'`([^`]+)`')),
        ("kbd", re.compile(r'\[\[([^\]]+)\]\]')),
        ("link", re.compile(r'\[([^\]]+)\]\(([^)]+)\)')),
        ("bold", re.compile(r'!!(.+?)!!')),
        ("underline", re.compile(r'\+\+(.+?)\+\+')),
        ("italic", re.compile(r'(?<!:)//(.+?)//')),
        ("strike", re.compile(r'~~(.+?)~~')),
        ("highlight", re.compile(r'%%(.+?)%%')),
        ("sup", re.compile(r'\^\^(.+?)\^\^')),
        ("sub", re.compile(r',,(.+?),,')),
        ("small", re.compile(r'\{\{--(.+?)--\}\}')),
    ]

    runs = []
    pos = 0
    n = len(text)
    while pos < n:
        best = None  # (start, end, mark, groups)
        for mark, pat in token_patterns:
            m = pat.search(text, pos)
            if m and (best is None or m.start() < best[0]):
                best = (m.start(), m.end(), mark, m.groups())
        if best is None:
            runs.append({"text": text[pos:], "mark": None})
            break
        start, end, mark, groups = best
        if start > pos:
            runs.append({"text": text[pos:start], "mark": None})
        if mark == "link":
            runs.append({"text": groups[0], "mark": "link", "url": groups[1]})
        else:
            runs.append({"text": groups[0], "mark": mark})
        pos = end
    return [r for r in runs if r["text"] != ""] or [{"text": "", "mark": None}]


def _extract_callouts_and_stash(text: str) -> tuple:
    """
    Pulls [note]/[important]/[warning] blocks out as structured callout
    blocks, replacing each with a placeholder so the surrounding
    paragraph/list walk in _extract_blocks() doesn't also try to parse
    their contents as plain prose. Mirrors expand_callout_boxes()'s tag
    set exactly.
    """
    callouts = {}

    def _stash_one(kind):
        def repl(m):
            key = f'\x00CALLOUT_{len(callouts)}\x00'
            callouts[key] = {"type": "callout", "kind": kind, "runs": _extract_runs(m.group(1).strip())}
            return f'\n{key}\n'
        return repl

    for tag in ("note", "important", "warning"):
        text = re.sub(r'\[' + tag + r'\]\s*(.+?)\s*\[/' + tag + r'\]', _stash_one(tag), text, flags=re.DOTALL)
    return text, callouts


def _extract_youtube_and_stash(text: str) -> tuple:
    blocks = {}

    def repl(m):
        fields = {}
        for line in m.group(1).strip().splitlines():
            line = line.strip()
            if not line or ":" not in line:
                continue
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()
        key = f'\x00YOUTUBE_{len(blocks)}\x00'
        blocks[key] = {
            "type": "youtube",
            "title": fields.get("title", ""),
            "channel": fields.get("channel", ""),
            "url": fields.get("url", ""),
            "level": fields.get("level", ""),
            "why": fields.get("why", ""),
        }
        return f'\n{key}\n'

    text = re.sub(r'\[youtube\]\s*(.+?)\s*\[/youtube\]', repl, text, flags=re.DOTALL)
    return text, blocks


def _extract_references_and_stash(text: str) -> tuple:
    refs = []

    def collect(m):
        fields = {}
        for line in m.group(1).strip().splitlines():
            line = line.strip()
            if not line or ":" not in line:
                continue
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()
        refs.append({"text": fields.get("text", ""), "url": fields.get("url", "")})
        return ""

    text = re.sub(r'\[ref\]\s*(.+?)\s*\[/ref\]', collect, text, flags=re.DOTALL)
    if not refs:
        return text, None
    key = '\x00REFERENCES\x00'
    return text + f'\n{key}\n', {key: {"type": "references", "items": refs}}


def _extract_takeaways_and_stash(text: str) -> tuple:
    blocks = {}

    def repl(m):
        items = [
            _extract_runs(line.strip()[2:].strip())
            for line in m.group(1).strip().splitlines()
            if line.strip().startswith("- ")
        ]
        key = f'\x00TAKEAWAYS_{len(blocks)}\x00'
        blocks[key] = {"type": "takeaways", "items": items}
        return f'\n{key}\n'

    text = re.sub(r'\[takeaways\]\s*(.+?)\s*\[/takeaways\]', repl, text, flags=re.DOTALL)
    return text, blocks


def _extract_images_and_stash(text: str) -> tuple:
    blocks = {}

    def repl(m):
        key = f'\x00IMAGE_{len(blocks)}\x00'
        blocks[key] = {"type": "image", "filename": m.group(1).strip(), "caption": m.group(2).strip()}
        return f'\n{key}\n'

    text = re.sub(r'\[image:([^|\]]+)\|([^\]]+)\]', repl, text)
    return text, blocks


def _extract_collapsibles_and_stash(body_md: str) -> tuple:
    """
    Must run BEFORE the other stash-and-extract passes below. Those scan
    the whole text with a single regex/DOTALL search, with no concept of
    collapsible-section boundaries -- if a [ref]/[youtube]/[takeaways]/
    [note] block lives inside a nested [collapsible-section], stashing it
    at the outer level would leave its placeholder marker sitting inside
    the collapsible's own raw text, which then gets recursively
    re-parsed by a DIFFERENT _extract_blocks() call with its own empty
    `stashed` dict -- the marker would never resolve back to real data.
    Extracting collapsible sections first (storing their RAW, still-
    unprocessed inner markdown) and only then running the other stash
    passes on what's left keeps every nested block's stash-and-resolve
    cycle scoped to the single _extract_blocks() call that will actually
    recurse into it.
    """
    lines = body_md.split("\n")
    out_lines = []
    collapsibles = {}
    i = 0
    while i < len(lines):
        stripped = lines[i].strip()
        if stripped.startswith("[collapsible-section"):
            is_open = stripped == "[collapsible-section o]"
            depth = 1
            j = i + 1
            inner_lines = []
            while j < len(lines) and depth > 0:
                if lines[j].strip().startswith("[collapsible-section"):
                    depth += 1
                elif lines[j].strip() == "[/collapsible-section]":
                    depth -= 1
                    if depth == 0:
                        break
                inner_lines.append(lines[j])
                j += 1
            key = f'\x00COLLAPSIBLE_{len(collapsibles)}\x00'
            collapsibles[key] = {"open": is_open, "raw_inner": "\n".join(inner_lines)}
            out_lines.append(key)
            i = j + 1
            continue
        out_lines.append(lines[i])
        i += 1
    return "\n".join(out_lines), collapsibles


def _extract_blocks(body_md: str, used_ids: set, block_id_counter=None) -> list:
    """
    Core recursive walker. Handles headings/paragraphs/lists/tables/code
    fences directly, and [collapsible-section]/[collapsible-section o]
    wrappers by recursing into their inner content -- same nesting
    expand_collapsible() supports (## then ### immediately after
    <details>, e.g. a lab's Background section).

    P1-1: every block this function emits -- at every nesting level,
    including a collapsible's own block AND each of its children --
    gets a stable "blockId" string, e.g. "block-0", "block-1", ...
    Sequential in document order, drawn from a single `itertools.count()`
    shared across the WHOLE recursive walk (not restarted per recursive
    call) -- `block_id_counter` is threaded through recursive
    `_extract_blocks()` calls for exactly this reason. A collapsible's
    own blockId is assigned before recursing into its children, so a
    parent always numbers lower than everything nested inside it,
    matching the order a reader actually encounters them in the
    document.

    Stability tradeoff, matching `types.ts`'s own comment on the React
    side: a blockId is stable (identical) across two regenerations of
    the SAME markdown -- nothing here is randomized or content-hashed,
    so whitespace-only or non-structural edits reproduce the same ids.
    It is NOT robust to a block being inserted/removed/reordered
    upstream of it -- since ids are purely positional, every block
    after the change point renumbers. That's a deliberate, documented
    limitation (positional ids are simple and match "sequential in
    document order" exactly as specced), not an oversight -- highlight
    anchoring code on the React side already treats a highlight whose
    blockId no longer resolves to a real block as orphaned rather than
    assuming positional ids are permanent.
    """
    if block_id_counter is None:
        block_id_counter = itertools.count()

    def emit(block: dict) -> dict:
        """Stamps blockId (document-order-sequential, shared across
        this whole recursive walk) and appends to `blocks`. Every
        block reaching `blocks` -- including stashed callout/youtube/
        references/takeaways/image blocks resolved from their
        placeholder markers -- must go through this, not a bare
        `blocks.append()`, so no block silently skips numbering."""
        block["blockId"] = f"block-{next(block_id_counter)}"
        blocks.append(block)
        return block

    # Collapsible sections are pulled out FIRST, as opaque raw-text
    # placeholders (see _extract_collapsibles_and_stash's docstring for
    # why this must happen before the other stash passes). The other
    # block types with their own explicit markdown wrappers are then
    # stashed from what's left, so the line-based walk below only ever
    # sees plain prose, headings, lists, tables, and placeholder markers.
    body_md, collapsible_blocks = _extract_collapsibles_and_stash(body_md)
    body_md, callouts = _extract_callouts_and_stash(body_md)
    body_md, youtube_blocks = _extract_youtube_and_stash(body_md)
    body_md, ref_block = _extract_references_and_stash(body_md)
    body_md, takeaways_blocks = _extract_takeaways_and_stash(body_md)
    body_md, image_blocks = _extract_images_and_stash(body_md)
    stashed = {**callouts, **youtube_blocks, **(ref_block or {}), **takeaways_blocks, **image_blocks}

    ol_item_re = re.compile(r'^(\d+)\.\s+(.*)$')
    lines = body_md.split("\n")
    blocks = []
    in_ul = in_ol = in_table = in_pre = False
    pre_lang = ""
    pre_lines = []
    ul_items = []
    ol_items = []
    table_headers = []
    table_rows = []
    i = 0

    def close_ul():
        nonlocal in_ul, ul_items
        if in_ul:
            emit({"type": "list", "ordered": False, "items": ul_items})
            in_ul, ul_items = False, []

    def close_ol():
        nonlocal in_ol, ol_items
        if in_ol:
            emit({"type": "list", "ordered": True, "items": ol_items})
            in_ol, ol_items = False, []

    def close_lists():
        close_ul(); close_ol()

    def close_table():
        nonlocal in_table, table_headers, table_rows
        if in_table:
            emit({"type": "table", "headers": table_headers, "rows": table_rows})
            in_table, table_headers, table_rows = False, [], []

    def is_table_separator(line):
        return bool(re.match(r'^[\|\s\-:]+$', line.strip()))

    def parse_table_row(line):
        return [c.strip() for c in line.strip().strip("|").split("|")]

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        key = stripped
        if key in stashed:
            close_lists(); close_table()
            emit(stashed[key])
            i += 1
            continue

        if stripped.startswith("```"):
            if not in_pre:
                close_lists(); close_table()
                pre_lang = stripped[3:].strip()
                in_pre = True
                pre_lines = []
            else:
                emit({"type": "code", "lang": pre_lang, "code": "\n".join(pre_lines)})
                in_pre = False
            i += 1
            continue
        if in_pre:
            pre_lines.append(line)
            i += 1
            continue

        if stripped in collapsible_blocks:
            close_lists(); close_table()
            entry = collapsible_blocks[stripped]
            inner_lines = entry["raw_inner"].split("\n")
            # Heading is the first non-blank line inside (## or ###).
            heading_text, level, remaining_inner = None, 2, inner_lines
            for k, l2 in enumerate(inner_lines):
                s2 = l2.strip()
                if not s2:
                    continue
                if s2.startswith("### "):
                    level, heading_text = 3, s2[4:].strip()
                elif s2.startswith("## "):
                    level, heading_text = 2, s2[3:].strip()
                remaining_inner = inner_lines[k + 1:]
                break
            clean_text, heading_id = parse_heading_id(heading_text or "Section", used_ids)
            # The collapsible's own blockId is claimed BEFORE recursing
            # into its children, so it always numbers lower than
            # anything nested inside it -- matching the order a reader
            # actually encounters them (heading, then its contents),
            # not the order this function happens to finish computing
            # them in.
            own_block_id = f"block-{next(block_id_counter)}"
            # Fresh recursive call on the RAW, still-unprocessed inner
            # markdown -- this is what makes nested [ref]/[youtube]/
            # [note]/etc. blocks resolve correctly (see
            # _extract_collapsibles_and_stash's docstring). The SAME
            # counter is threaded through, not a fresh one, so ids stay
            # sequential across the whole recursive walk, not just
            # within one nesting level.
            children = _extract_blocks("\n".join(remaining_inner), used_ids, block_id_counter)
            blocks.append({
                "type": "collapsible", "level": level, "id": heading_id,
                "heading": clean_text, "open": entry["open"], "children": children,
                "blockId": own_block_id,
            })
            i += 1
            continue

        if stripped.startswith("<code-tabs>"):
            close_lists(); close_table()
            j = i
            while j < len(lines) and "</code-tabs>" not in lines[j]:
                j += 1
            emit({"type": "code_tabs_raw"})  # T5-3b's territory, not expanded here
            i = j + 1
            continue

        # Opaque raw HTML lines (e.g. injected DSA visualisation markup,
        # or any hand-authored HTML) -- not part of "body prose" in the
        # structured sense; captured so nothing silently vanishes, but
        # not parsed further.
        is_html = (
            (stripped.startswith("<") and not stripped.startswith("<p>")) or
            stripped.startswith("aria-") or stripped.startswith("role=") or
            stripped.startswith("id=") or stripped.startswith("data-") or
            stripped.startswith("style=") or stripped == "/>" or
            stripped.startswith("loading=") or stripped.startswith("frameborder=") or
            stripped.startswith("width=") or stripped.startswith("height=") or
            stripped.startswith("target=") or stripped.startswith("rel=") or
            stripped.startswith("href=") or stripped.startswith("src=") or
            stripped.startswith("class=") or stripped.startswith("alt=")
        )
        if is_html:
            close_lists(); close_table()
            if stripped:
                emit({"type": "raw_html", "html": line})
            i += 1
            continue

        if stripped.startswith("|"):
            close_lists()
            if not in_table:
                table_headers = parse_table_row(line)
                i += 1
                if i < len(lines) and is_table_separator(lines[i]):
                    i += 1
                in_table = True
            else:
                table_rows.append([_extract_runs(c) for c in parse_table_row(line)])
                i += 1
            continue
        else:
            close_table()

        if line.startswith("#### "):
            close_lists()
            emit({"type": "heading", "level": 4, "id": None, "text": _extract_runs(line[5:].strip())})
        elif line.startswith("### "):
            close_lists()
            clean_text, heading_id = parse_heading_id(line[4:].strip(), used_ids)
            emit({"type": "heading", "level": 3, "id": heading_id, "text": _extract_runs(clean_text)})
        elif line.startswith("## "):
            close_lists()
            clean_text, heading_id = parse_heading_id(line[3:].strip(), used_ids)
            emit({"type": "heading", "level": 2, "id": heading_id, "text": _extract_runs(clean_text)})
        elif line.startswith("# "):
            close_lists()
            emit({"type": "heading", "level": 1, "id": None, "text": _extract_runs(line[2:].strip())})
        elif stripped.startswith("- "):
            close_ol()
            in_ul = True
            ul_items.append(_extract_runs(stripped[2:]))
        elif ol_item_re.match(stripped):
            close_ul()
            in_ol = True
            ol_items.append(_extract_runs(ol_item_re.match(stripped).group(2)))
        elif stripped == "":
            close_lists()
        else:
            close_lists()
            emit({"type": "paragraph", "runs": _extract_runs(stripped)})

        i += 1

    close_table(); close_lists()
    if in_pre:
        emit({"type": "code", "lang": pre_lang, "code": "\n".join(pre_lines)})

    return blocks


def extract_body_prose(body_md: str) -> list:
    """
    Entry point. body_md should already have data-driven sections
    (mcq/glossary/interview/checklist/problem/contest/visual-mcq/
    reflection/hands-on/screenshot-guide) stripped -- same point in
    parse_md_body() where convert_sections() would normally take over.
    Returns a fresh list; does not mutate body_md's caller-visible state
    (operates on a local copy internally).

    P1-1: seeds the single `itertools.count()` that stamps every block's
    "blockId" (see `_extract_blocks()`'s own docstring for the full
    contract) and hands it to the top-level `_extract_blocks()` call --
    every nested recursive call reuses this same counter, so ids stay
    sequential across the entire note, not just within one nesting level.
    """
    used_ids = set()
    block_id_counter = itertools.count()
    return _extract_blocks(body_md, used_ids, block_id_counter)


def write_body_prose_json(blocks: list, output_dir: str) -> None:
    os.makedirs(os.path.join(output_dir, "json"), exist_ok=True)
    out_path = os.path.join(output_dir, "json", "body-prose.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"blocks": blocks}, f, indent=2, ensure_ascii=False)
    print(f"✅ body-prose.json written: {len(blocks)} top-level blocks → {out_path}")


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
    if subject in FIXED_SECTION_ORDER_BY_SUBJECT:
        fixed_order = FIXED_SECTION_ORDER_BY_SUBJECT[subject]
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
    cfg = TYPE_CONFIG[subject]

    # Animation-bearing subjects only: strip [animation] block (animate.py
    # handles it separately). T3-7b: was hardcoded to "dsa"; now driven by
    # the registry's "animation" feature.
    if "animation" in cfg["features"]:
        body_md = re.sub(r'\[animation\].+?\[/animation\]', '', body_md, flags=re.DOTALL)

    # Subjects with the screenshotGuide feature only: extract
    # [screenshot-guide] blocks → screenshot-guide.md. Runs before any
    # stashing so the blocks are cleanly stripped from the body before
    # downstream processing. T3-7b: was hardcoded to "aws".
    if "screenshotGuide" in cfg["features"]:
        body_md = parse_screenshot_guide(body_md, output_dir)

    # Subjects with the reflection feature only: strip the Reflection
    # Questions wrapper, then parse its [reflection] blocks (static HTML,
    # no JSON). Stripping the wrapper first (same as every other
    # data-driven section) prevents an empty duplicate shell being left
    # behind in the body. T3-7b: was hardcoded to "aws".
    reflection_html = ""
    if "reflection" in cfg["features"]:
        body_md, reflection_inner = strip_data_section_wrapper(
            body_md, "reflection", DATA_SECTION_HEADINGS["reflection"]
        )
        if reflection_inner is not None:
            _, reflection_questions = parse_reflection(reflection_inner, output_dir)
            reflection_html = build_reflection_html(reflection_questions)

    # For each data-driven section: strip wrapper, parse JSON, queue container
    injected_containers = []

    for tag, heading in DATA_SECTION_HEADINGS.items():
        # T3-7b: skip sections gated behind a registry feature this
        # subject doesn't have. Replaces the old (and, as of this
        # session, actually-broken — DSA_ONLY_SECTIONS/AWS_ONLY_SECTIONS
        # were referenced here but never defined anywhere in this file,
        # a live NameError on every run that reached this loop)
        # subject-specific set-membership checks. A tag with no entry in
        # SECTION_REQUIRES_FEATURE is common to every subject and is
        # never skipped here.
        required_feature = SECTION_REQUIRES_FEATURE.get(tag)
        if required_feature and required_feature not in cfg["features"]:
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

    # T5-2: additive body-prose JSON extraction. Runs on a COPY of
    # body_md at this exact point -- data-driven sections already
    # stripped above (mcq/glossary/interview/checklist/problem/contest/
    # visual-mcq/reflection/hands-on/screenshot-guide), but
    # [collapsible-section] markers, callouts, takeaways, youtube, ref,
    # and inline [image:...] syntax are all still raw markdown, exactly
    # what extract_body_prose() expects. The real body_md below is never
    # touched by this block -- existing HTML output is unaffected.
    body_prose_blocks = extract_body_prose(body_md)
    write_body_prose_json(body_prose_blocks, output_dir)

    page_used_ids = set()
    body_md = expand_collapsible(body_md, used_ids=page_used_ids)

    # Animation-bearing subjects only: visualisation tab panel.
    # T3-7b: was hardcoded to "dsa"; now driven by the "animation" feature.
    viz_image_order = []
    if "animation" in cfg["features"]:
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

    # Version info bar + visible read-time badge, positioned right after
    # the title/date (both authored in markdown, not templated here — see
    # insert_after_title_block()'s docstring for why this needs a regex
    # insert rather than a fixed template slot).
    header_extras = "\n".join(filter(None, [
        build_version_info_bar(fm),
        build_read_time_badge(read_time),
    ]))
    parsed_sections = insert_after_title_block(parsed_sections, header_extras)

    # Subjects with the lectureBox feature get a lecture box (and lab notes
    # always have session info). T3-7b: was hardcoded to "aws".
    extra_top = build_lecture_box(fm) if "lectureBox" in cfg["features"] else ""

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
        write_slides_json(slides, topic_root)
        return html

    subject = detect_subject(md_path, fm)
    cfg     = TYPE_CONFIG[subject]
    # Subjects with the labs feature only. T3-7b: was hardcoded to "aws".
    is_lab  = detect_lab_mode(md_path, fm) if "labs" in cfg["features"] else False

    validate_frontmatter(fm, subject, is_lab=is_lab)

    md_dir     = os.path.dirname(md_path)
    topic_root = os.path.dirname(md_dir) if os.path.basename(md_dir) == "markdown" else md_dir
    fm['_output_dir'] = topic_root

    html_parts = [
        build_doctype(),
        build_head(fm, cfg),
        build_body(fm, body_md, cfg, subject, is_lab=is_lab),
    ]

    # T3-7b: "subject == 'dsa'" was fully redundant here — has_animation
    # already resolves per-subject from the registry, so any subject with
    # hasAnimation:true runs animate.py as a side effect, not just "dsa"
    # specifically by name.
    if cfg["has_animation"]:
        try:
            animate.run(md_path, project_root="..")
        except Exception as e:
            print(f"⚠️  Animation generation skipped: {e}")

    return "\n".join(html_parts)


# ─── CLI + INBOX SCAN ──────────────────────────────────────────────────────────

MARKDOWN_INBOX = "../web/public/data/notes/markdown"
NOTES_ROOT     = "../web/public/data/notes"


def resolve_md_path(arg: str) -> str:
    if arg.endswith(".md") and os.path.exists(arg):
        return arg

    guesses = [
        f"../web/public/data/notes/dsa-{arg}/markdown/dsa-{arg}.md",
        f"../web/public/data/notes/aws-{arg}/markdown/aws-{arg}.md",
        f"../web/public/data/notes/dsa-{arg}/{arg}.md",
        f"../web/public/data/notes/aws-{arg}/{arg}.md",
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