"""
generate_sitemap.py
Rebuilds sitemap.xml from scratch — main pages + all quizzes.
Notes logic is commented out for now (see below) — re-enable once the
notes migration resumes.
Run from the repo root: python generate_sitemap.py

Other generator scripts (generate_quiz_list.py, generate_notes_json.py, etc.)
import sitemap_utils directly to upsert individual URLs without a full rebuild.
"""

import os
import json
from pathlib import Path
from sitemap_utils import add_url, write_sitemap

BASE_URL   = "https://namrata2709.github.io/Resources"
NOTES_DIR  = "../data/notes"
QUIZ_DIR   = "../data/quiz"


def main():
    urls = []

    # ── Main pages ────────────────────────────────────────────────────────────
    main_pages = [
        ("",                 "1.0", "weekly"),
        ("notes-index.html",       "0.9", "weekly"),
        ("quiz-index.html",   "0.9", "weekly"),
    ]
    for path, priority, changefreq in main_pages:
        urls = add_url(urls, f"{BASE_URL}/{path}", changefreq=changefreq, priority=priority)

    # ── Notes — complete.html per folder ─────────────────────────────────────
    # Commented out per request — re-enable once notes migration resumes.
    # notes_path = Path(NOTES_DIR)
    # if notes_path.exists():
    #     for folder in sorted(notes_path.iterdir()):
    #         if not folder.is_dir() or folder.name.startswith('.'):
    #             continue
    #         complete = folder / "complete.html"
    #         if complete.exists():
    #             from datetime import datetime
    #             lastmod = datetime.fromtimestamp(complete.stat().st_mtime).strftime('%Y-%m-%d')
    #             urls = add_url(
    #                 urls,
    #                 f"{BASE_URL}/data/notes/{folder.name}/complete.html",
    #                 changefreq="monthly",
    #                 priority="0.7",
    #                 lastmod=lastmod,
    #             )

    # ── Quizzes — quiz.html?quiz=<file> per JSON ─────────────────────────────
    quiz_path = Path(QUIZ_DIR)
    if quiz_path.exists():
        for f in sorted(quiz_path.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            if not data.get("title") or not data.get("topic"):
                continue
            urls = add_url(
                urls,
                f"{BASE_URL}/quiz.html?quiz={f.stem}",
                changefreq="monthly",
                priority="0.7",
            )

    write_sitemap(urls)
    print(f"  Main pages : {len(main_pages)}")


if __name__ == "__main__":
    main()
