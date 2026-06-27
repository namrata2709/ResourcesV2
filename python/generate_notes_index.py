"""
generate_notes_index.py

Scans src/data/notes/ for valid note folders and writes src/data/index/notes-index.json.
Also upserts each note's URL(s) into sitemap.xml via sitemap_utils.

Folder naming convention (new notes only — old folders are not migrated):
    <subject>-<topic-slug>                               → no session
    <subject>-<topic-slug>-session-<session-slug>        → has session

    subject  : first segment  (e.g. "aws", "dsa")
    topic    : everything between subject and "-session-" (if present)
               or everything after subject (if no session)
    session  : slug after "-session-" → title-cased human label

File naming convention inside each folder:
    notes.html   → type "notes"
    lab.html     → type "lab"
    ppt.html     → type "ppt"

    A folder may contain any combination of the three types.

Examples:
    aws-vpc-fundamentals-session-post-graduate-restart-v3/
        notes.html
        lab.html
    → subject="aws", session="Post Graduate Restart V3",
      files=[{type:"notes",...}, {type:"lab",...}]

    dsa-merge-sort/
        notes.html
    → subject="dsa", session=null, files=[{type:"notes",...}]

    aws-linux-basics/
        notes.html
    → subject="aws", session=null  (shown as Generic in UI)
"""

import os
import json
import re
import html as html_mod
from datetime import datetime

try:
    from sitemap_utils import load_sitemap, add_url, write_sitemap
    SITEMAP_AVAILABLE = True
except ImportError:
    SITEMAP_AVAILABLE = False
    print("⚠️  sitemap_utils not found — skipping sitemap update")

# ── Paths ──────────────────────────────────────────────────────────────────────

ROOT   = "../src/data/notes"
OUTPUT = "../src/data/index/notes-index.json"

IMAGE_EXT     = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")
CONTENT_TYPES = ("notes", "lab", "ppt")
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

CATEGORY_KEYWORDS = {
    "Compute":      ["ec2", "lambda", "ecs", "eks", "fargate"],
    "Storage":      ["s3", "ebs", "efs", "glacier"],
    "Database":     ["rds", "dynamodb", "redshift", "aurora"],
    "Networking":   ["vpc", "cloudfront", "route53", "alb", "nlb", "linux",
                     "networking", "network"],
    "Security":     ["iam", "kms", "waf", "shield", "cognito"],
    "Monitoring":   ["cloudwatch", "cloudtrail"],
    "Management":   ["cloudformation", "systems-manager"],
    "Fundamentals": ["basics", "introduction", "cloud", "fundamentals"],
    "DSA":          ["array", "linked", "tree", "graph", "sort", "search",
                     "stack", "queue", "heap", "hash", "dp", "recursion",
                     "backtracking", "greedy"],
}


def detect_category(folder_lower: str, subject: str) -> str:
    if subject == "dsa":
        for key in CATEGORY_KEYWORDS["DSA"]:
            if key in folder_lower:
                return "DSA"
        return "DSA"
    for category, keys in CATEGORY_KEYWORDS.items():
        if category == "DSA":
            continue
        if any(k in folder_lower for k in keys):
            return category
    return "General"

# ── File scanner ───────────────────────────────────────────────────────────────

def scan_content_files(base_path: str, folder: str):
    """
    Find notes.html, lab.html and ppt.html in base_path.
    Returns list of file dicts with name, file, type, icon.
    """
    FILE_ICONS = {"notes": "📄", "lab": "🧪", "ppt": "📊"}
    FILE_LABELS = {"notes": "Notes", "lab": "Lab", "ppt": "Presentation"}
    
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
    """A valid folder has at least one of: notes.html, lab.html or ppt.html."""
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


def main():
    notes = []

    for item in sorted(os.listdir(ROOT)):
        path = os.path.join(ROOT, item)
        if is_valid_note_folder(path):
            try:
                notes.append(build_note(item))
            except Exception as e:
                print(f"❌ Failed: {item} → {e}")

    # Sort by date descending
    notes.sort(key=lambda x: parse_date_safe(x["date"]), reverse=True)

    # Write JSON
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"notes": notes}, f, indent=2, ensure_ascii=False)

    print(f"✅ Generated {len(notes)} notes → {OUTPUT}")

    # Update sitemap
    if SITEMAP_AVAILABLE:
        sitemap = load_sitemap()
        today   = datetime.now().strftime("%Y-%m-%d")

        for note in notes:
            for file in note["files"]:
                url = (
                    f"{BASE_URL}src/data/notes/"
                    f"{note['folder']}/{file['file']}"
                )
                add_url(sitemap, url, lastmod=today, priority="0.7")

        write_sitemap(sitemap)
        print(f"✅ Sitemap updated with note URLs")


if __name__ == "__main__":
    main()
