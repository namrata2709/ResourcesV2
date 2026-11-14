"""
generate_sitemap.py

Sitemap consistency check / backfill tool — the periodic safety net, not
the primary mechanism. generate_notes_index.py and generate_quiz_index.py
own add/remove for their own content on every run they make; this script
scans main pages + src/data/notes/ + src/data/quiz/ and adds anything
that's expected but missing from sitemap.xml.

Default mode: non-destructive. Loads the existing sitemap.xml, upserts
(add_url) any URL found by scanning disk that isn't already present, and
NEVER removes anything — deletions are exclusively the two _index.py
scripts' job, so two different scripts never disagree about what should
be pruned.

--rebuild: wipes sitemap.xml and rebuilds it from scratch using only
what's found on disk right now (the old default behavior). Notes are now
included in both modes — previously commented out pending "notes
migration resumes," but scanning whatever's actually on disk is correct
regardless of migration status (it just reflects however many folders
exist right now, currently 5 samples).

Run from python/: python generate_sitemap.py [--rebuild]
"""

import os
import json
import argparse
from pathlib import Path
from datetime import datetime
from utils.sitemap import add_url, load_sitemap, write_sitemap
from utils.site_config import BASE_URL
NOTES_DIR     = "../web/public/data/notes"
QUIZ_DIR      = "../web/public/data/quiz"
CONTENT_TYPES = ("notes", "lab", "slides")


def main():
    ap = argparse.ArgumentParser(
        description="Verify/backfill sitemap.xml (default), or fully rebuild it with --rebuild."
    )
    ap.add_argument(
        "--rebuild", action="store_true",
        help="Wipe sitemap.xml and rebuild it from scratch using only what's on disk right now."
    )
    args = ap.parse_args()

    urls = [] if args.rebuild else load_sitemap()
    known_locs = {u["loc"].rstrip("/") for u in urls}
    added = 0

    def touch(loc, **kw):
        nonlocal urls, added
        if loc.rstrip("/") not in known_locs:
            added += 1
        urls = add_url(urls, loc, **kw)

    # ── Main pages ───────────────────────────────────────────────────────
    # T5-2 (2026-07-26): clean-path shapes (T3-6's NotesIndex/QuizIndex
    # routes), not the old notes-index.html/quiz-index.html vanilla pages.
    main_pages = [
        ("",             "1.0", "weekly"),
        ("notes-index",  "0.9", "weekly"),
        ("quiz-index",   "0.9", "weekly"),
    ]
    for path, priority, changefreq in main_pages:
        touch(f"{BASE_URL}/{path}", changefreq=changefreq, priority=priority)

    # ── Notes — scan every valid folder's actual content files ─────────
    # T5-3a owns /notes/:folder (notes.html + lab.html content);
    # T5-4 owns /slides/:folder (slides.html + slides-overview.html
    # content) — deduped to one sitemap entry per folder per route, same
    # as generate_notes_index.py's own sitemap block (see that file for
    # the fuller reasoning, including the still-open notes.html-vs-
    # lab.html question T5-3a's own ticket text flags).
    NOTES_FILE_PREFIXES = ("notes", "lab")
    SLIDES_FILE_PREFIXES = ("slides",)

    notes_path = Path(NOTES_DIR)
    if notes_path.exists():
        for folder in sorted(notes_path.iterdir()):
            if not folder.is_dir() or folder.name.startswith('.'):
                continue
            has_notes_file = False
            has_slides_file = False
            latest_mtime = None
            for fname in sorted(os.listdir(folder)):
                if not fname.lower().endswith(".html"):
                    continue
                if not any(fname.lower().startswith(t) for t in CONTENT_TYPES):
                    continue
                fpath = folder / fname
                mtime = fpath.stat().st_mtime
                latest_mtime = mtime if latest_mtime is None else max(latest_mtime, mtime)
                if fname.lower().startswith(NOTES_FILE_PREFIXES):
                    has_notes_file = True
                if fname.lower().startswith(SLIDES_FILE_PREFIXES):
                    has_slides_file = True

            if latest_mtime is None:
                continue
            lastmod = datetime.fromtimestamp(latest_mtime).strftime('%Y-%m-%d')
            if has_notes_file:
                touch(f"{BASE_URL}/notes/{folder.name}", changefreq="monthly", priority="0.7", lastmod=lastmod)
            if has_slides_file:
                touch(f"{BASE_URL}/slides/{folder.name}", changefreq="monthly", priority="0.7", lastmod=lastmod)

    # ── Quizzes ──────────────────────────────────────────────────────────
    # T5-1 owns /quiz/:quizId, replacing quiz.html?quiz=<stem>.
    quiz_path = Path(QUIZ_DIR)
    if quiz_path.exists():
        for f in sorted(quiz_path.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            if not data.get("title") or not data.get("topic"):
                continue
            touch(f"{BASE_URL}/quiz/{f.stem}", changefreq="monthly", priority="0.7")

    write_sitemap(urls)

    mode = "rebuild (wiped and rebuilt from scratch)" if args.rebuild else "backfill (existing entries preserved)"
    print(f"  Mode       : {mode}")
    print(f"  Main pages : {len(main_pages)}")
    print(f"  Total URLs : {len(urls)}")
    if not args.rebuild:
        print(f"  Added      : {added} missing/new URL(s)")


if __name__ == "__main__":
    main()
