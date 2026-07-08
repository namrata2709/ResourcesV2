"""
audit_content.py

Cross-repo build validation report. Runs AFTER generation (notes/quiz/
sitemap already built by generate_notes_index.py/generate_quiz_index.py)
— never blocks, modifies, or re-runs generation itself. Scans
src/data/notes/, src/data/quiz/, and the generated indexes, producing
Info/Warning/Error findings plus build statistics, then writes
reports/build-report.{html,md,json} and prints a console summary.

The build always exits 0 for warnings — only unhandled exceptions or
being unable to read the indexes at all would ever produce a non-zero
exit here. Errors are still clearly flagged in every report (and in the
console ✗ count), the intent is "never block the pipeline," not
"errors don't matter" — see BUILD SUMMARY at the bottom for the exact
console/report wording.

Categories implemented, numbered to match the original spec:

  1.  Missing images        — <img src> referencing a file not on disk
  2.  Broken internal links — <a href> to a relative path not on disk
  3.  Broken image refs     — empty <img src="">, JSON "image"/"img"
                               fields pointing at missing files
  4.  Missing JSON files    — mcq/glossary/checklist/interview.json
  5.  Empty JSON            — [] or {} (or a wrapper key holding one)
  6.  Invalid JSON          — syntax errors, duplicate keys
  7.  Duplicate topics      — same title string across >1 folder
  8.  Duplicate slugs       — same canonical-URL slug across >1 folder
                               (best-effort — see extract_slug()'s
                               docstring on the exact HTML it expects)
  9.  Duplicate IDs         — within one JSON file's item list
  10. Unused HTML files     — present but not a recognized content type
  11. Unused images         — in images/ but never referenced anywhere
  12. Missing metadata      — title/subject/category/tags absent
  13/14. Invalid category   — note["category"] not in category-icons.json
  15. Invalid tags          — empty-string tags, exact duplicates
  16. Invalid dates         — date/lastModified that doesn't parse
  17. Reading time sanity   — 0 minutes, or implausibly long (>120)
  18. Resource-detection    — folder exists on disk but missing from
      cross-check              notes-index.json/quiz-index.json
  21. Build statistics
  22. Build summary

Best-effort / lower confidence — no confirmed frontmatter field exists
for these yet, implemented defensively so they activate automatically
if/when such a field shows up, but currently likely to report "nothing
to check" on real content:
  19. Related-resource validation — looks for a "related" field on any
      note; if none exist anywhere, reports 0 findings rather than
      erroring.
  20. Session-against-a-list validation — session labels are freeform
      strings (parse_folder_name()'s -session-<slug> suffix), not drawn
      from a fixed enum anywhere I've seen — this just reports the
      distinct sessions actually found, informationally, rather than
      validating against a canonical list that doesn't exist yet.

Run from python/: python audit_content.py
"""

import os
import re
import json
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict

NOTES_ROOT   = "../src/data/notes"
QUIZ_ROOT    = "../src/data/quiz"
NOTES_INDEX  = "../src/data/index/notes-index.json"
QUIZ_INDEX   = "../src/data/index/quiz-index.json"
CATEGORY_ICONS_PATH = "../src/data/config/category-icons.json"
REPORTS_DIR  = "../reports"

CONTENT_TYPES = ("notes", "lab", "slides")
REQUIRED_JSON_FILES = ("mcq.json", "glossary.json", "checklist.json", "interview.json")
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")

READ_TIME_LOW_THRESHOLD  = 1     # 0 minutes is always suspicious
READ_TIME_HIGH_THRESHOLD = 120   # >2 hours for a single note is suspicious

REQUIRED_METADATA_FIELDS = ("title", "subject", "category", "tags")


# ── Finding collector ───────────────────────────────────────────────────────

class Findings:
    """Plain list of dicts under the hood — kept as a small class only for
    the convenience methods, not because the data needs to be more than
    a list of {category, severity, scope, message} dicts."""

    def __init__(self):
        self.items = []

    def add(self, category: str, severity: str, scope: str, message: str):
        self.items.append({
            "category": category,
            "severity": severity,   # "info" | "warning" | "error"
            "scope":    scope,      # folder name, or "global"
            "message":  message,
        })

    def by_severity(self, severity: str):
        return [f for f in self.items if f["severity"] == severity]

    @property
    def error_count(self):
        return len(self.by_severity("error"))

    @property
    def warning_count(self):
        return len(self.by_severity("warning"))

    @property
    def info_count(self):
        return len(self.by_severity("info"))


# ── Shared helpers ───────────────────────────────────────────────────────────

def read_file(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except (OSError, UnicodeDecodeError):
        return None


def load_json_strict(path: str):
    """
    Returns (data, error). error is None on success, else a string
    describing what went wrong (syntax error or duplicate key).
    Duplicate-key detection needs an object_pairs_hook — plain json.load()
    silently keeps only the last occurrence of a repeated key otherwise.
    """
    if not os.path.exists(path):
        return None, "file does not exist"

    seen_dupe = []

    def dupe_check_hook(pairs):
        keys = [k for k, _ in pairs]
        dupes = {k for k in keys if keys.count(k) > 1}
        if dupes:
            seen_dupe.extend(dupes)
        return dict(pairs)

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f, object_pairs_hook=dupe_check_hook)
    except json.JSONDecodeError as e:
        return None, f"syntax error: {e}"
    except OSError as e:
        return None, f"could not read file: {e}"

    if seen_dupe:
        return data, f"duplicate key(s): {', '.join(sorted(set(seen_dupe)))}"

    return data, None


def is_json_empty(data) -> bool:
    if data in ({}, []):
        return True
    if isinstance(data, dict):
        # Wrapper-key JSON like {"questions": []} / {"terms": []} —
        # every parser in this pipeline uses exactly one top-level list.
        for v in data.values():
            if isinstance(v, list):
                return len(v) == 0
    return False


def extract_local_refs(content: str, attr_pattern: str):
    """Generic <tag attr="..."> extractor for href/src style attributes."""
    if not content:
        return []
    return re.findall(attr_pattern, content)


def is_external_or_special_link(href: str) -> bool:
    href = href.strip()
    if not href:
        return False  # empty href IS worth flagging, handled separately
    return href.startswith(("http://", "https://", "mailto:", "tel:", "#", "javascript:"))


def extract_slug(content: str):
    """
    Best-effort: pulls the slug out of <link rel="canonical" href="...">,
    matching the "title, slug -> OG/canonical" row from the instructions
    docs. Expects the canonical URL's last path segment (before .html or
    a trailing slash) to BE the slug. Returns None if no canonical tag is
    found at all — callers should treat that as "can't check," not as a
    finding on its own, since this hasn't been confirmed against a real
    generated page yet.
    """
    if not content:
        return None
    m = re.search(r'<link rel="canonical" href="([^"]+)">', content)
    if not m:
        return None
    url = m.group(1).rstrip("/")
    segment = url.split("/")[-1]
    return segment[:-5] if segment.endswith(".html") else segment


def extract_ids_from_json(data, list_keys=("questions", "terms", "items", "problems")):
    """Returns a list of 'id' values from whichever wrapper list key is
    present, or [] if the JSON has no id-bearing list (e.g. glossary
    terms don't carry ids in this schema — checked defensively)."""
    if not isinstance(data, dict):
        return []
    for key in list_keys:
        items = data.get(key)
        if isinstance(items, list):
            return [item.get("id") for item in items if isinstance(item, dict) and "id" in item]
    return []


# ── Per-folder checks (categories 1-3, 9-11, 15-17) ─────────────────────────

def audit_folder(folder_name: str, folder_path: str, note_entry: dict,
                  category_names: set, findings: Findings):
    html_files = []
    try:
        html_files = [f for f in os.listdir(folder_path) if f.lower().endswith(".html")]
    except OSError:
        return

    referenced_images = set()
    all_content = ""

    for fname in html_files:
        content = read_file(os.path.join(folder_path, fname))
        if content is None:
            continue
        all_content += content

        # ── #1/#3: images referenced by this file ───────────────────────
        for src in extract_local_refs(content, r'<img[^>]*\bsrc="([^"]*)"'):
            if not src.strip():
                findings.add("Broken Image References", "error", folder_name,
                             f"{fname}: <img> with empty src=\"\"")
                continue
            if src.startswith(("http://", "https://", "data:")):
                continue
            referenced_images.add(os.path.basename(src))
            resolved = os.path.normpath(os.path.join(folder_path, src))
            if not os.path.exists(resolved):
                findings.add("Missing Images", "error", folder_name,
                             f"{fname} references \"{src}\" — not found on disk")

        # ── #2: internal links ───────────────────────────────────────────
        for href in extract_local_refs(content, r'<a[^>]*\bhref="([^"]*)"'):
            if not href.strip():
                continue  # empty href on an <a> is common (JS-driven), not a broken link per se
            if is_external_or_special_link(href):
                continue
            clean = href.split("#")[0].split("?")[0]
            if not clean:
                continue
            resolved = os.path.normpath(os.path.join(folder_path, clean))
            if not os.path.exists(resolved) and not os.path.exists(resolved + ".html"):
                findings.add("Broken Links", "error", folder_name,
                             f"{fname}: link to \"{href}\" does not resolve to an existing file")

        # ── #10: unused HTML files (not a recognized content type) ──────
        if not any(fname.lower().startswith(t) for t in CONTENT_TYPES):
            findings.add("Unused Files", "warning", folder_name,
                         f"{fname} is not a recognized content type "
                         f"(expected one of: {', '.join(t + '.html' for t in CONTENT_TYPES)}) "
                         f"— appears unused")

    # ── #11: unused images ───────────────────────────────────────────────
    images_dir = os.path.join(folder_path, "images")
    if os.path.isdir(images_dir):
        try:
            on_disk = {f for f in os.listdir(images_dir) if f.lower().endswith(IMAGE_EXT)}
        except OSError:
            on_disk = set()
        for img in sorted(on_disk - referenced_images):
            findings.add("Unused Images", "warning", folder_name,
                         f"images/{img} exists but is never referenced by any file in this folder")

    # ── #4/#5/#6/#9: JSON companions ─────────────────────────────────────
    json_dir = os.path.join(folder_path, "json")
    has_notes_type = note_entry is not None and any(
        f.get("type") == "notes" for f in note_entry.get("files", [])
    )
    if has_notes_type:
        for required in REQUIRED_JSON_FILES:
            path = os.path.join(json_dir, required)
            data, error = load_json_strict(path)
            if error == "file does not exist":
                findings.add("Missing JSON Files", "error", folder_name, f"missing json/{required}")
                continue
            if error:
                findings.add("Invalid JSON", "error", folder_name, f"json/{required}: {error}")
                continue
            if is_json_empty(data):
                findings.add("Empty JSON", "warning", folder_name, f"json/{required} has no entries")
                continue

            ids = extract_ids_from_json(data)
            if ids:
                dupes = {i for i in ids if ids.count(i) > 1}
                if dupes:
                    findings.add("Duplicate IDs", "error", folder_name,
                                 f"json/{required} has duplicate id(s): {sorted(dupes)}")

            # #3 (JSON side): "image"/"img" fields pointing at missing files
            for item in (data.get("questions") or []):
                img_field = item.get("image") or item.get("img")
                if img_field:
                    resolved = os.path.normpath(os.path.join(folder_path, "images", os.path.basename(img_field)))
                    if not os.path.exists(resolved):
                        findings.add("Broken Image References", "error", folder_name,
                                     f"json/{required}: image \"{img_field}\" not found in images/")

    # ── #12: missing metadata ────────────────────────────────────────────
    if note_entry is not None:
        for field in REQUIRED_METADATA_FIELDS:
            value = note_entry.get(field)
            if not value:
                findings.add("Missing Metadata", "error", folder_name,
                             f"note entry is missing required field '{field}'")

        # ── #13/14: category validity ────────────────────────────────────
        category = note_entry.get("category")
        if category and category_names and category not in category_names:
            findings.add("Invalid Categories", "error", folder_name,
                         f"category \"{category}\" is not in category-icons.json")

        # ── #15: tags ─────────────────────────────────────────────────────
        tags = note_entry.get("tags", [])
        if any(not t.strip() for t in tags):
            findings.add("Invalid Tags", "warning", folder_name, "one or more empty tags")
        dupes = {t for t in tags if tags.count(t) > 1}
        if dupes:
            findings.add("Invalid Tags", "warning", folder_name, f"duplicate tag(s): {sorted(dupes)}")

        # ── #16: dates ────────────────────────────────────────────────────
        for date_field in ("date", "lastModified"):
            raw = note_entry.get(date_field)
            if raw:
                try:
                    datetime.strptime(str(raw)[:10], "%Y-%m-%d")
                except ValueError:
                    findings.add("Invalid Dates", "error", folder_name,
                                 f"{date_field} \"{raw}\" does not parse as YYYY-MM-DD")

        # ── #17: reading time sanity ──────────────────────────────────────
        minutes = note_entry.get("readTimeMinutes")
        if minutes is not None:
            if minutes < READ_TIME_LOW_THRESHOLD:
                findings.add("Reading Time", "warning", folder_name,
                             f"readTimeMinutes is {minutes} — looks incorrect")
            elif minutes > READ_TIME_HIGH_THRESHOLD:
                findings.add("Reading Time", "warning", folder_name,
                             f"readTimeMinutes is {minutes} — implausibly long, worth checking")

    return all_content


# ── Global checks (categories 7, 8, 18-20) ──────────────────────────────────

def check_duplicate_topics(notes: list, findings: Findings):
    by_title = defaultdict(list)
    for n in notes:
        by_title[n.get("title", "")].append(n["folder"])
    for title, folders in by_title.items():
        if title and len(folders) > 1:
            findings.add("Duplicate Topics", "warning", "global",
                         f"title \"{title}\" appears in {len(folders)} folders: {folders}")


def check_duplicate_slugs(notes: list, findings: Findings):
    by_slug = defaultdict(list)
    checked_any = False
    for n in notes:
        content = read_file(os.path.join(NOTES_ROOT, n["folder"], "notes.html"))
        if content is None:
            continue
        slug = extract_slug(content)
        if slug is None:
            continue
        checked_any = True
        by_slug[slug].append(n["folder"])
    if not checked_any:
        findings.add("Duplicate Slugs", "info", "global",
                     "no <link rel=\"canonical\"> tags found — slug check skipped (best-effort, unconfirmed field)")
        return
    for slug, folders in by_slug.items():
        if len(folders) > 1:
            findings.add("Duplicate Slugs", "error", "global",
                         f"slug \"{slug}\" appears in {len(folders)} folders: {folders}")


def check_resource_detection(disk_folders: set, notes: list, quizzes: list,
                              disk_quiz_files: set, findings: Findings):
    indexed_folders = {n["folder"] for n in notes}
    for missing in sorted(disk_folders - indexed_folders):
        findings.add("Resource Detection", "error", missing,
                     "folder exists on disk but is missing from notes-index.json — "
                     "re-run generate_notes_index.py")

    indexed_quiz_files = {q["file"] for q in quizzes}
    for missing in sorted(disk_quiz_files - indexed_quiz_files):
        findings.add("Resource Detection", "error", missing,
                     "quiz JSON exists on disk but is missing from quiz-index.json — "
                     "re-run generate_quiz_index.py")


def check_sessions(notes: list, findings: Findings):
    sessions = sorted({n["session"] for n in notes if n.get("session")})
    if sessions:
        findings.add("Session Validation", "info", "global",
                     f"{len(sessions)} distinct session(s) found: {sessions} "
                     f"(informational — no canonical session list exists yet to validate against)")


def check_related_resources(notes: list, findings: Findings):
    any_related_field = any("related" in n for n in notes)
    if not any_related_field:
        return  # nothing to check — field doesn't exist in current schema
    folder_set = {n["folder"] for n in notes}
    for n in notes:
        for rel in n.get("related", []):
            if rel not in folder_set:
                findings.add("Related Resource Validation", "error", n["folder"],
                             f"related resource \"{rel}\" does not exist")


# ── Build statistics (category 21) ──────────────────────────────────────────

def build_statistics(notes: list, quizzes: list) -> dict:
    subjects   = {n.get("subject") for n in notes}
    categories = {n.get("category") for n in notes}
    labs       = sum(1 for n in notes for f in n.get("files", []) if f.get("type") == "lab")
    slides     = sum(1 for n in notes for f in n.get("files", []) if f.get("type") == "slides")
    images     = sum(len(n.get("images", [])) for n in notes)

    read_times = [n["readTimeMinutes"] for n in notes if n.get("readTimeMinutes")]
    avg_read_time = round(sum(read_times) / len(read_times), 1) if read_times else 0

    mcq_count = 0
    glossary_count = 0
    for n in notes:
        mcq_data, _ = load_json_strict(os.path.join(NOTES_ROOT, n["folder"], "json", "mcq.json"))
        if isinstance(mcq_data, dict):
            mcq_count += len(mcq_data.get("questions", []))
        gloss_data, _ = load_json_strict(os.path.join(NOTES_ROOT, n["folder"], "json", "glossary.json"))
        if isinstance(gloss_data, dict):
            glossary_count += len(gloss_data.get("terms", []))

    by_size = sorted(notes, key=lambda n: n.get("readTimeMinutes") or 0)

    return {
        "total_subjects":       len(subjects),
        "total_categories":     len(categories),
        "total_notes":          len(notes),
        "total_labs":           labs,
        "total_slides":         slides,
        "total_images":         images,
        "total_quizzes":        len(quizzes),
        "total_mcqs":           mcq_count,
        "total_glossary_terms": glossary_count,
        "average_reading_time": avg_read_time,
        "smallest_note":        by_size[0]["title"] if by_size else None,
        "largest_note":         by_size[-1]["title"] if by_size else None,
    }


# ── Report writers ───────────────────────────────────────────────────────────

def write_json_report(stats: dict, findings: Findings, path: str):
    payload = {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "errors":   findings.error_count,
            "warnings": findings.warning_count,
            "info":     findings.info_count,
            "status":   "BUILD SUCCESS" if findings.error_count == 0 else "BUILD SUCCESS WITH ERRORS",
        },
        "statistics": stats,
        "findings": findings.items,
    }
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def write_markdown_report(stats: dict, findings: Findings, path: str):
    lines = [
        "# Build Report",
        f"_Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}_",
        "",
        f"**Errors:** {findings.error_count}  |  **Warnings:** {findings.warning_count}  |  **Info:** {findings.info_count}",
        "",
        "## Build Statistics",
        "",
    ]
    for key, value in stats.items():
        label = key.replace("_", " ").title()
        lines.append(f"- **{label}:** {value}")

    for severity, icon in (("error", "❌"), ("warning", "⚠️"), ("info", "ℹ️")):
        items = findings.by_severity(severity)
        if not items:
            continue
        lines += ["", f"## {icon} {severity.title()}s ({len(items)})", ""]
        for item in items:
            lines.append(f"- **[{item['category']}]** `{item['scope']}` — {item['message']}")

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def write_html_report(stats: dict, findings: Findings, path: str):
    def esc(s):
        return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    rows = []
    for severity, color in (("error", "#dc2626"), ("warning", "#d97706"), ("info", "#2563eb")):
        for item in findings.by_severity(severity):
            rows.append(
                f'<tr><td style="color:{color};font-weight:600">{severity.upper()}</td>'
                f'<td>{esc(item["category"])}</td><td>{esc(item["scope"])}</td>'
                f'<td>{esc(item["message"])}</td></tr>'
            )

    stats_rows = "".join(
        f"<tr><td>{esc(k.replace('_', ' ').title())}</td><td>{esc(v)}</td></tr>"
        for k, v in stats.items()
    )

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Build Report</title>
<style>
body {{ font-family: -apple-system, sans-serif; margin: 2rem; color: #1a1a1a; }}
table {{ border-collapse: collapse; width: 100%; margin-bottom: 2rem; }}
td, th {{ border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 14px; }}
th {{ background: #f5f5f5; }}
h1 {{ margin-bottom: 0.2rem; }}
.summary {{ font-size: 16px; margin-bottom: 1.5rem; }}
</style></head>
<body>
<h1>Build Report</h1>
<p class="summary">Errors: <strong>{findings.error_count}</strong> &nbsp;
Warnings: <strong>{findings.warning_count}</strong> &nbsp;
Info: <strong>{findings.info_count}</strong></p>

<h2>Build Statistics</h2>
<table><tr><th>Metric</th><th>Value</th></tr>{stats_rows}</table>

<h2>Findings</h2>
<table><tr><th>Severity</th><th>Category</th><th>Scope</th><th>Message</th></tr>
{"".join(rows) if rows else '<tr><td colspan="4">No findings — clean build.</td></tr>'}
</table>
</body></html>"""

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)


def print_console_summary(stats: dict, findings: Findings):
    print("✓ Validation Complete")
    print(f"⚠ {findings.warning_count} Warning(s)")
    print(f"✗ {findings.error_count} Error(s)")
    print()
    status = "BUILD SUCCESS" if findings.error_count == 0 else "BUILD SUCCESS WITH ERRORS"
    print(status)
    print(f"  Warnings: {findings.warning_count}")
    print(f"  Errors:   {findings.error_count}")
    print("  Generated:")
    for name in ("build-report.html", "build-report.md", "build-report.json"):
        print(f"    reports/{name}")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Cross-repo build validation report.")
    ap.add_argument("--quiet", action="store_true", help="Suppress per-finding console output, just show the summary.")
    args = ap.parse_args()

    findings = Findings()

    notes, err = load_json_strict(NOTES_INDEX)
    if err:
        print(f"❌ Could not read {NOTES_INDEX}: {err}")
        notes = {"notes": []}
    notes = notes.get("notes", []) if notes else []

    quizzes, err = load_json_strict(QUIZ_INDEX)
    if err:
        print(f"❌ Could not read {QUIZ_INDEX}: {err}")
        quizzes = {"Quizzes": []}
    quizzes = quizzes.get("Quizzes", []) if quizzes else []

    category_data, _ = load_json_strict(CATEGORY_ICONS_PATH)
    category_names = set(category_data.keys()) if isinstance(category_data, dict) else set()

    disk_folders = set()
    if os.path.isdir(NOTES_ROOT):
        disk_folders = {
            f for f in os.listdir(NOTES_ROOT)
            if os.path.isdir(os.path.join(NOTES_ROOT, f)) and not f.startswith(".")
        }

    notes_by_folder = {n["folder"]: n for n in notes}
    for folder in sorted(disk_folders):
        audit_folder(folder, os.path.join(NOTES_ROOT, folder),
                     notes_by_folder.get(folder), category_names, findings)

    disk_quiz_files = set()
    if os.path.isdir(QUIZ_ROOT):
        disk_quiz_files = {Path(f).stem for f in os.listdir(QUIZ_ROOT) if f.endswith(".json")}

    check_duplicate_topics(notes, findings)
    check_duplicate_slugs(notes, findings)
    check_resource_detection(disk_folders, notes, quizzes, disk_quiz_files, findings)
    check_sessions(notes, findings)
    check_related_resources(notes, findings)

    stats = build_statistics(notes, quizzes)

    write_json_report(stats, findings, os.path.join(REPORTS_DIR, "build-report.json"))
    write_markdown_report(stats, findings, os.path.join(REPORTS_DIR, "build-report.md"))
    write_html_report(stats, findings, os.path.join(REPORTS_DIR, "build-report.html"))

    if not args.quiet:
        for item in findings.items:
            icon = {"error": "✗", "warning": "⚠", "info": "ℹ"}[item["severity"]]
            print(f"{icon} [{item['category']}] {item['scope']}: {item['message']}")
        print()

    print_console_summary(stats, findings)


if __name__ == "__main__":
    main()
