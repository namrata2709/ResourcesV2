"""
generate_popular_notes.py

Reads src/data/config/popular-notes-curated.json (a small, hand-curated
list of folder slugs -- and optionally full external entries) and
cross-references src/data/index/notes-index.json (the real, generated
note metadata) to write src/data/index/popular-notes.json -- the file
NotFound.tsx's PopularNotes component fetches (B-6).

This script did not previously exist. PopularNotes.tsx and popular-
notes.json's own delivery referenced it by name as already-real
infrastructure; it wasn't -- popular-notes.json existed only as a
hand-placed static file with no generator behind it. This is that
generator, built to reproduce that same file's exact shape and content
so the previously-shipped output stays valid rather than needing a
frontend change alongside it.

Why curated + cross-referenced, not computed from real traffic: this
site has no backend and no auth (see sprint-tickets-tracks-PREB.md's
Track M, M3-2's security-scope note) -- there is no site-wide visit/
favorite signal anywhere for a script to compute a real "most popular"
list from, only per-visitor localStorage (which PopularNotes.tsx's own
sibling, RecentlyViewed, already reads for THIS visitor specifically,
per-browser, never site-wide). A hand-curated list is the honest v1 the
original B-6 ticket text explicitly allows ("most-favorited/most-
visited if that data exists; otherwise a manually-curated list as v1")
-- this is that v1, not a placeholder standing in for a v2 that would
first need new user-facing tracking infrastructure to exist.

Why cross-reference notes-index.json instead of hand-typing the full
output shape directly: hand-typing title/subject/category/url per
curated entry means four more places for those fields to silently drift
the next time a note is renamed, recategorized, or moved. Instead, the
curated input only names a folder slug, and this script looks up
today's real title/subject/category from notes-index.json every run --
the same single source of truth generate_dashboard_cards.py and
generate_notes.py already treat as authoritative for their own outputs.
A stale/renamed folder slug in the curated list is skipped with a
warning, not a build failure -- one bad curated entry shouldn't block
the rest of the list from generating.

Two entry shapes are supported in the curated input, matching exactly
what PopularNotes.tsx's PopularNoteEntry type needs to render either
kind correctly:

  {"folder": "dsa-merge-sort"}
      -- resolved entirely from notes-index.json (title/subject/
      category/url looked up live every run).

  {"title": "...", "url": "https://...", "category": "..."}
      -- passed through for a genuinely external resource with no
      "folder" to resolve against this site's own notes-index.json.
      Always emitted with "internal": false. "folder" is synthesized as
      "external-<slugified-title>" purely so PopularNotes.tsx still has
      a stable React list key -- the frontend doesn't otherwise use
      this field for external entries.

Run from python/: python generate_popular_notes.py
"""

import os
import re
import json

CURATED_INPUT = "../web/public/data/config/popular-notes-curated.json"
NOTES_INDEX = "../web/public/data/index/notes-index.json"
OUTPUT = "../web/public/data/index/popular-notes.json"


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return re.sub(r"-+", "-", slug).strip("-")


def load_curated() -> list[dict]:
    try:
        with open(CURATED_INPUT, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ {CURATED_INPUT} not found -- nothing to curate from.")
        raise SystemExit(1)
    except json.JSONDecodeError as e:
        print(f"❌ {CURATED_INPUT} is not valid JSON: {e}")
        raise SystemExit(1)

    entries = data.get("entries", [])
    if not entries:
        print(f"⚠️  {CURATED_INPUT} has 0 entries -- popular-notes.json will be empty.")
    return entries


def load_notes_by_folder() -> dict:
    try:
        with open(NOTES_INDEX, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ {NOTES_INDEX} not found -- run generate_notes_index.py first.")
        raise SystemExit(1)
    except json.JSONDecodeError as e:
        print(f"❌ {NOTES_INDEX} is not valid JSON: {e}")
        raise SystemExit(1)

    return {n["folder"]: n for n in data.get("notes", []) if n.get("folder")}


def resolve_internal(folder: str, notes_by_folder: dict):
    note = notes_by_folder.get(folder)
    if note is None:
        print(f"  ⚠️  SKIP '{folder}': not found in notes-index.json (renamed or deleted?)")
        return None

    missing = [field for field in ("title", "subject", "category") if not note.get(field)]
    if missing:
        print(f"  ⚠️  SKIP '{folder}': notes-index.json entry is missing {missing}")
        return None

    return {
        "folder": folder,
        "title": note["title"],
        "subject": note["subject"],
        "category": note["category"],
        "url": f"/notes/{folder}",
        "internal": True,
        "curated": True,
    }


def resolve_external(entry: dict):
    missing = [field for field in ("title", "url") if not entry.get(field)]
    if missing:
        print(f"  ⚠️  SKIP external entry {entry!r}: missing {missing}")
        return None

    return {
        "folder": f"external-{slugify(entry['title'])}",
        "title": entry["title"],
        "subject": entry.get("subject", ""),
        "category": entry.get("category", ""),
        "url": entry["url"],
        "internal": False,
        "curated": True,
    }


def build_entries(curated: list[dict], notes_by_folder: dict) -> list[dict]:
    resolved = []
    seen_folders = set()

    for entry in curated:
        item = resolve_internal(entry["folder"], notes_by_folder) if "folder" in entry else resolve_external(entry)

        if item is None:
            continue
        if item["folder"] in seen_folders:
            print(f"  ⚠️  SKIP duplicate entry: '{item['folder']}' already added")
            continue
        seen_folders.add(item["folder"])
        resolved.append(item)

    return resolved


def main():
    curated = load_curated()
    notes_by_folder = load_notes_by_folder()
    resolved = build_entries(curated, notes_by_folder)

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"notes": resolved}, f, indent=2, ensure_ascii=False)
        f.write("\n")

    label = "entry" if len(resolved) == 1 else "entries"
    print(f"✅ Wrote {len(resolved)} popular-notes {label} to {OUTPUT}")


if __name__ == "__main__":
    main()
