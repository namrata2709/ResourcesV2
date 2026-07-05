"""
generate_notes_index.py

Scans src/data/notes/ for valid note folders and writes src/data/index/notes-index.json.
Also upserts each note's URL(s) into sitemap.xml via utils.sitemap.

Default mode is INCREMENTAL, diffed against the existing notes-index.json:

    - New folder (wasn't in the previous index)  -> add to index, add its
      URLs to the sitemap.
    - Existing folder, "format" unchanged (files[] and images[] identical
      to last run) AND title unchanged -> skip entirely. The old entry is
      reused as-is; nothing is recomputed, nothing is written to the
      sitemap.
    - Existing folder, files[]/images[]/title changed -> the index entry
      is refreshed, but the sitemap is deliberately left untouched for
      that folder. Content edits inside an already-published folder don't
      need a fresh sitemap ping — only a folder appearing or disappearing
      does. (Trade-off: if a *file* is removed from an otherwise-existing
      folder, e.g. lab.html deleted but notes.html kept, that file's old
      sitemap URL is not pruned by this path — only a full folder removal
      triggers a sitemap removal. Acceptable today since it matches what
      was asked for; flag if that gap ever needs closing.)
    - Folder that was in the previous index but no longer exists on disk
      -> removed from both notes-index.json and the sitemap.

--rebuild: ignores any existing notes-index.json/sitemap.xml state.
Every folder is treated as new (full recompute, full sitemap write) —
the old unconditional behavior.

Folder naming convention (new notes only — old folders are not migrated):
    <subject>-<topic-slug>                               → no session
    <subject>-<topic-slug>-session-<session-slug>        → has session

    subject  : first segment  (e.g. "aws", "dsa")
    topic    : everything between subject and "-session-" (if present)
               or everything after subject (if no session)
    session  : slug after "-session-" → title-cased human label

File naming convention inside each folder:
    notes.html            → type "notes"
    lab.html               → type "lab"
    slides.html             → type "slides"  (Presentation Mode deck — see
                                aws-presentation-instructions.md; any subject)
    slides-overview.html    → also type "slides" (Video Slides companion
                                deck — see video-slides-instructions.md).
                                Deliberately NOT split into its own type:
                                both are "a slide deck" from the UI's point
                                of view and both render "Presentation" with
                                the same icon. A folder can contain
                                notes.html + slides-overview.html together
                                (a note with its video companion), or a
                                slides-only folder can contain just
                                slides.html (a rewritten Presentation-Mode
                                deck living in its own [subject]-[slug]-slides/
                                folder per aws-presentation-instructions.md).

    ("ppt.html" / type "ppt" used to exist for older manually-built decks.
    Nothing generates ppt.html anymore — parse_slides.py is the only deck
    builder now, and it always writes slides.html or slides-overview.html —
    so the type has been removed. If you find an old ppt.html file on disk,
    rename it to slides.html; the index no longer recognizes ppt.html.)

Every folder processed (added or updated — unchanged folders reuse their
old entry without re-validation, since nothing about them changed) is
also run through a non-fatal validation check (missing title, missing
files, missing images, empty/unreadable content files, missing DSA
companion JSON) — warnings print to console, generation always
continues. This replaces the standalone ensure_structure_notes.py
concept; folder health-checking lives here now instead of a second
script.

Run from python/: python generate_notes_index.py [--rebuild]
"""

import os
import json
import re
import argparse
import html as html_mod
from datetime import datetime

try:
    from utils.sitemap import load_sitemap, add_url, remove_url, write_sitemap
    SITEMAP_AVAILABLE = True
except ImportError:
    SITEMAP_AVAILABLE = False
    print("⚠️  utils.sitemap not found — skipping sitemap update")

# ── Paths ──────────────────────────────────────────────────────────────────────

ROOT   = "../src/data/notes"
OUTPUT = "../src/data/index/notes-index.json"

IMAGE_EXT     = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")
CONTENT_TYPES = ("notes", "lab", "slides")
BASE_URL      = "https://namrata2709.github.io/Resources/"

# ── Text helpers ───────────────────────────────────────────────────────────────

def normalize_text(text: str) -> str:
    text = html_mod.unescape(text)
    text = re.sub(r'^[^\w]+', '', text)
    text = text.replace("-", " ").replace("_", " ")
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def smart_title(text: str) -> str:
    """Title-case words; preserve all-uppercase (AWS, EC2, VPC, DSA …)."""
    keep_upper = {"AWS", "EC2", "S3", "VPC", "IAM", "RDS", "EBS", "EFS",
                  "SQS", "SNS", "KMS", "ELB", "ALB", "NLB", "WAF", "DSA",
                  "TCP", "UDP", "HTTP", "HTTPS", "API", "DNS", "CDN", "CI",
                  "CD", "SQL", "NoSQL", "JSON", "YAML", "HTML", "CSS", "JS"}
    result = []
    for w in text.split():
        upper = w.upper()
        result.append(upper if upper in keep_upper or any(ch.isdigit() for ch in w)
                      else w.capitalize())
    return " ".join(result)


def session_slug_to_label(slug: str) -> str:
    """Convert 'post-graduate-restart-v3' → 'Post Graduate Restart V3'."""
    return " ".join(
        part.upper() if re.fullmatch(r'v\d+', part, re.IGNORECASE) else part.capitalize()
        for part in slug.split("-")
    )


def parse_date_safe(date_str: str):
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except Exception:
        return datetime.min

# ── Folder name parser ─────────────────────────────────────────────────────────

def parse_folder_name(folder: str):
    """
    Returns (subject, topic_slug, session_label | None).

    Pattern: <subject>-<topic>[-session-<session>]
    Subject is always the first dash-separated segment.
    """
    session_label = None
    topic_slug    = folder

    # Split on "-session-"
    if "-session-" in folder:
        before, after = folder.split("-session-", 1)
        session_label = session_slug_to_label(after)
        topic_slug    = before           # e.g. "aws-vpc-fundamentals"
    # else topic_slug = full folder name

    parts   = topic_slug.split("-", 1)
    subject = parts[0].lower()          # "aws" / "dsa"
    topic   = parts[1] if len(parts) > 1 else topic_slug

    return subject, topic, session_label

# ── HTML content readers ───────────────────────────────────────────────────────

def read_html_file(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return None


def extract_title(content: str):
    if not content:
        return None
    m = re.search(r'<h1>(.*?)</h1>', content, re.DOTALL)
    if not m:
        return None
    return smart_title(normalize_text(m.group(1)))


def extract_date(content: str):
    if not content:
        return None
    m = re.search(r'📅\s*(.*?)</p>', content)
    if not m:
        return None
    try:
        return datetime.strptime(m.group(1).strip(), "%B %d, %Y").strftime("%Y-%m-%d")
    except Exception:
        return None


def extract_tags(content: str):
    if not content:
        return []
    matches = re.findall(r'<span class="tag">(.*?)</span>', content)
    tags    = [normalize_text(t) for t in matches if t.strip()]
    return list(dict.fromkeys(tags))   # deduplicate, preserve order


def extract_metadata_date(base_path: str):
    path = os.path.join(base_path, "metadata.json")
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get("date")
    except Exception:
        return None


def fallback_folder_date(base_path: str):
    oldest = None
    for root, _, files in os.walk(base_path):
        for fname in files:
            try:
                t = os.path.getmtime(os.path.join(root, fname))
                if oldest is None or t < oldest:
                    oldest = t
            except Exception:
                continue
    if oldest:
        return datetime.fromtimestamp(oldest).strftime("%Y-%m-%d")
    return "1970-01-01"

# ── Category / Icon detection ─────────────────────────────────────────────────
# Categories + keywords now live in one place: data/config/category-icons.json
# (shared with notes-index.js, which reads the same file for display icons).
# This script only needs the "keywords" side of it. Add a new category or
# tweak its keywords in that JSON — no code change needed here.

CATEGORY_ICONS_PATH = "../src/data/config/category-icons.json"

# Which category-icons.json keys belong to which subject, so an AWS folder
# can't accidentally match a DSA-only category (e.g. "Queue") or vice versa.
# Update these two sets if a category is added/renamed in the JSON.
AWS_CATEGORY_NAMES = {
    "General", "Fundamentals", "Compute", "Storage", "Database", "Networking",
    "Security", "Monitoring", "Management", "Analytics", "Machine Learning",
    "Containers", "Serverless", "Messaging", "Identity", "Cost Management",
    "Billing", "DevOps", "Migration", "Automation", "Integration",
    "Governance", "Content Delivery", "Developer Tools", "Media Services",
    "Machine Images", "End User Computing",
}
DSA_CATEGORY_NAMES = {
    "Arrays", "Strings", "Linked List", "Trees", "Graphs", "Sorting",
    "Searching", "Dynamic Programming", "Recursion", "Stack", "Queue",
    "Heap", "Hashing", "Greedy", "Backtracking", "Bit Manipulation", "Math",
    "Two Pointers", "Sliding Window", "Divide and Conquer", "Matrix",
    "Trie", "Sets",
}

# Small built-in safety net in case the JSON fails to load, mirroring the
# fallback pattern already used in notes-index.js.
FALLBACK_CATEGORY_KEYWORDS = {
    "Compute":      ["ec2", "lambda", "ecs", "eks", "fargate"],
    "Storage":      ["s3", "ebs", "efs", "glacier"],
    "Database":     ["rds", "dynamodb", "redshift", "aurora"],
    "Networking":   ["vpc", "cloudfront", "route53", "alb", "nlb", "linux",
                      "networking", "network"],
    "Security":     ["iam", "kms", "waf", "shield", "cognito"],
    "Monitoring":   ["cloudwatch", "cloudtrail"],
    "Management":   ["cloudformation", "systems-manager"],
    "Fundamentals": ["basics", "introduction", "cloud", "fundamentals"],
}


def load_category_keywords():
    """
    Loads category-icons.json and returns {category: [keywords...]},
    excluding "default" and any category with no keywords. Falls back to
    FALLBACK_CATEGORY_KEYWORDS (AWS-only) if the file is missing/invalid.
    """
    try:
        with open(CATEGORY_ICONS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        keywords = {
            category: entry.get("keywords", [])
            for category, entry in data.items()
            if category != "default" and entry.get("keywords")
        }
        if keywords:
            print(f"✅ Loaded {len(keywords)} categories with keywords from {CATEGORY_ICONS_PATH}")
            return keywords
        
        raise ValueError("no categories with keywords found")
    except Exception as exc:
        print(f"⚠️  Could not load {CATEGORY_ICONS_PATH} ({exc}) — using built-in fallback keywords")
        return dict(FALLBACK_CATEGORY_KEYWORDS)


CATEGORY_KEYWORDS = load_category_keywords()


def detect_category(folder_lower: str, subject: str) -> str:
    # Keywords like "merge sort" have spaces; folder names use dashes
    # ("dsa-merge-sort") — normalize so both match the same way.
    folder_norm = folder_lower.replace("-", " ")

    allowed_names = DSA_CATEGORY_NAMES if subject == "dsa" else AWS_CATEGORY_NAMES
    default_category = "General" if subject != "dsa" else "Fundamentals"

    # "General"/"Fundamentals" are the designated fallback (returned below
    # if nothing more specific matches) — they must NOT also be checked in
    # this loop. dict/JSON key order determines which category wins on a
    # first-match basis, and General/Fundamentals's broad keywords
    # ("overview", "introduction", "fundamentals") sit early in
    # category-icons.json, so without this exclusion they'd steal matches
    # from far more specific categories appearing later in the file —
    # e.g. "aws-ec2-fundamentals" matching "Fundamentals" (keyword
    # "fundamentals") before ever reaching "Compute" (keyword "ec2"), or
    # "aws-eks-containers-overview" matching "General" (keyword
    # "overview") before reaching "Containers" (keywords "eks"/
    # "containers"). Both confirmed as real failures before this fix.
    for category, keys in CATEGORY_KEYWORDS.items():
        if category not in allowed_names:
            continue
        if category in ("General", "Fundamentals"):
            continue
        if any(key in folder_norm for key in keys):
            return category

    return default_category

# ── File scanner ───────────────────────────────────────────────────────────────

def scan_content_files(base_path: str, folder: str):
    """
    Find notes.html, lab.html, slides.html and slides-overview.html in
    base_path. slides.html (Presentation Mode) and slides-overview.html
    (Video Slides companion) both map to type "slides" — see the module
    docstring for why they're intentionally not split into separate types.
    Returns list of file dicts with name, file, type, icon.
    """
    FILE_ICONS = {"notes": "📄", "lab": "🧪", "slides": "🖥️"}
    FILE_LABELS = {"notes": "Notes", "lab": "Lab", "slides": "Presentation"}

    results = []
    try:
        entries = os.listdir(base_path)
    except Exception:
        return results

    for fname in sorted(entries):
        if not fname.lower().endswith(".html"):
            continue

        ftype = None
        for t in CONTENT_TYPES:
            if fname.lower().startswith(t):
                ftype = t
                break

        if ftype is None:
            continue   # skip complete.html, overview.html, anything not prefixed

        name = FILE_LABELS[ftype]

        results.append({
            "name": name,
            "file": fname,
            "type": ftype,
            "icon": FILE_ICONS[ftype]
        })

    return results


def scan_images(base_path: str):
    img_dir = os.path.join(base_path, "images")
    if not os.path.isdir(img_dir):
        return []
    images = []
    for fname in os.listdir(img_dir):
        if fname.lower().endswith(IMAGE_EXT):
            stem = os.path.splitext(fname)[0]
            images.append({
                "name": smart_title(normalize_text(stem)),
                "file": fname
            })
    return sorted(images, key=lambda x: x["file"])

# ── Main builder ───────────────────────────────────────────────────────────────

def build_note(folder: str):
    base              = os.path.join(ROOT, folder)
    subject, topic, session_label = parse_folder_name(folder)

    # Collect content files
    files  = scan_content_files(base, folder)
    images = scan_images(base)

    # Try to read an HTML file for metadata (prefer notes- file, fallback to first)
    primary_content = None
    for f in files:
        content = read_html_file(os.path.join(base, f["file"]))

        if content:
            primary_content = content

            if f["type"] == "notes":
                break   # prefer notes type for title/tags/date

    # Title: from HTML h1, else smart-title the topic slug
    title = extract_title(primary_content) or smart_title(normalize_text(topic))

    # Category
    category = detect_category(folder.lower(), subject)

    # Tags
    tags = extract_tags(primary_content) or [category]

    # Date priority: metadata.json > HTML inline date > folder mtime
    date = (
        extract_metadata_date(base)
        or extract_date(primary_content)
        or fallback_folder_date(base)
    )

    return {
        "title":     title,
        "folder":    folder,
        "subject":   subject,
        "session":   session_label,   # None → shown as Generic in UI
        "date":      date,
        "category":  category,
        "tags":      tags,
        "hasImages": bool(images),
        "images":    images,
        "files":     files
    }


def is_valid_note_folder(path: str) -> bool:
    """A valid folder has at least one of: notes.html, lab.html or slides.html."""
    if not os.path.isdir(path):
        return False
    fname = os.path.basename(path)
    if fname.startswith('.') or fname in ('images', 'json', '__pycache__'):
        return False
    try:
        return any(
            fname.lower() == f"{t}.html"
            for t in CONTENT_TYPES
            for fname in os.listdir(path)
        )
    except Exception:
        return False


def load_previous_index():
    """Returns {folder_name: note_dict} from the existing OUTPUT file, or {}."""
    if not os.path.exists(OUTPUT):
        return {}
    try:
        with open(OUTPUT, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {n["folder"]: n for n in data.get("notes", []) if "folder" in n}
    except (json.JSONDecodeError, OSError) as exc:
        print(f"⚠️  Could not read existing {OUTPUT} ({exc}) — treating as first run")
        return {}

# ── Validation / health-check (US-A04 — folded in here, no standalone script) ──

def validate_note(note: dict, base_path: str) -> list:
    """
    Non-fatal structure/content checks for one note folder. Returns a list
    of warning strings (empty = clean). Never raises, never stops
    generation — matches the "warn, don't fail" behavior asked for.
    """
    warnings = []

    if not note.get("title") or not note["title"].strip():
        warnings.append("missing/empty title")

    if not note.get("files"):
        warnings.append("no recognized content files (notes.html/lab.html/slides.html)")

    if not note.get("tags"):
        warnings.append("no tags found (falling back to category as sole tag)")

    has_notes_type = any(f["type"] == "notes" for f in note.get("files", []))
    if has_notes_type and not note.get("hasImages"):
        warnings.append("notes.html present but images/ folder is empty or missing")

    for f in note.get("files", []):
        fpath = os.path.join(base_path, f["file"])
        content = read_html_file(fpath)
        if not content or not content.strip():
            warnings.append(f"{f['file']} is empty or unreadable")
        elif f["type"] == "notes" and "<h1>" not in content:
            warnings.append(f"{f['file']} has no <h1> — title fell back to the folder slug")

    # Required JSON companions — only for folders that actually have
    # notes.html. A slides-only folder (Presentation Mode / Video Slides,
    # per generate_notes.py's routing) has no mcq/glossary/checklist/
    # interview sections generated for it at all, so checking for these
    # files there was a false positive — fixed this round.
    if has_notes_type:
        for required in ("mcq.json", "glossary.json", "checklist.json", "interview.json"):
            json_path = os.path.join(base_path, "json", required)
            if not os.path.exists(json_path):
                warnings.append(f"missing json/{required}")
            else:
                try:
                    with open(json_path, "r", encoding="utf-8") as jf:
                        json.load(jf)
                except (json.JSONDecodeError, OSError) as exc:
                    warnings.append(f"json/{required} is invalid JSON ({exc})")

    # DSA-specific companions (per the DSA content-type table in PROJECT.md)
    # Also gated on has_notes_type — same reasoning, a DSA slides-only
    # folder wouldn't have visual-mcq.json/problems.json either.
    if has_notes_type and note.get("subject") == "dsa":
        for companion in ("visual-mcq.json", "problems.json"):
            if not os.path.exists(os.path.join(base_path, "json", companion)):
                warnings.append(f"DSA folder missing json/{companion}")

    return warnings


def main():
    ap = argparse.ArgumentParser(
        description="Generate notes-index.json and update sitemap.xml"
    )
    ap.add_argument(
        "--rebuild", action="store_true",
        help="Ignore existing notes-index.json/sitemap state; recompute and re-write everything."
    )
    args = ap.parse_args()

    old_by_folder = {} if args.rebuild else load_previous_index()

    notes = []
    current_folders = set()
    sitemap_touch_folders = set()   # folders whose URLs get (re)written this run
    added = updated = unchanged = 0
    folders_with_warnings = 0

    for item in sorted(os.listdir(ROOT)):
        path = os.path.join(ROOT, item)
        if not is_valid_note_folder(path):
            continue
        current_folders.add(item)

        old_entry = old_by_folder.get(item)

        try:
            new_note = build_note(item)
        except Exception as e:
            print(f"❌ Failed: {item} → {e}")
            continue

        warnings = validate_note(new_note, path)
        if warnings:
            folders_with_warnings += 1
            print(f"  ⚠️  {item}:")
            for w in warnings:
                print(f"       - {w}")

        if old_entry is None:
            # New folder — full add, sitemap touched
            notes.append(new_note)
            sitemap_touch_folders.add(item)
            added += 1
            continue

        format_changed = (
            new_note["files"] != old_entry.get("files")
            or new_note["images"] != old_entry.get("images")
        )
        title_changed = new_note["title"] != old_entry.get("title")

        if format_changed or title_changed:
            # Content changed — refresh the index entry, but deliberately
            # do NOT touch the sitemap for this folder (see module docstring).
            notes.append(new_note)
            updated += 1
        else:
            # Nothing relevant changed — reuse the old entry verbatim,
            # don't even touch its date/tags from a fresh recompute.
            notes.append(old_entry)
            unchanged += 1

    stale_folders = set(old_by_folder) - current_folders

    notes.sort(key=lambda x: parse_date_safe(x["date"]), reverse=True)

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"notes": notes}, f, indent=2, ensure_ascii=False)

    print(
        f"✅ Generated {len(notes)} notes → {OUTPUT}  "
        f"(added {added}, updated {updated}, unchanged {unchanged}, "
        f"removed {len(stale_folders)})"
    )
    if folders_with_warnings:
        print(f"  ⚠️  {folders_with_warnings} folder(s) have validation warnings — see above")
    else:
        print(f"  ✅ No validation warnings — every folder clean")

    if not SITEMAP_AVAILABLE:
        return

    sitemap = [] if args.rebuild else load_sitemap()
    today = datetime.now().strftime("%Y-%m-%d")
    note_prefix = f"{BASE_URL}data/notes/"

    touch_set = current_folders if args.rebuild else sitemap_touch_folders
    for note in notes:
        if note["folder"] not in touch_set:
            continue
        for file in note["files"]:
            url = f"{note_prefix}{note['folder']}/{file['file']}"
            sitemap = add_url(sitemap, url, lastmod=today, priority="0.7")

    removed = 0
    for folder in stale_folders:
        folder_prefix = f"{note_prefix}{folder}/"
        for entry in list(sitemap):
            if entry["loc"].startswith(folder_prefix):
                sitemap = remove_url(sitemap, entry["loc"])
                removed += 1
                print(f"  🗑️  Removed stale sitemap entry: {entry['loc']} (folder deleted)")

    if removed:
        print(f"  Pruned {removed} stale note URL(s) from sitemap")

    write_sitemap(sitemap)
    print(f"✅ Sitemap updated")


if __name__ == "__main__":
    main()
