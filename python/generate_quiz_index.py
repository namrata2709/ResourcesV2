"""
generate_quiz_index.py

Scans src/data/quiz/*.json -> writes src/data/index/quiz-index.json.
Also upserts each quiz URL into sitemap.xml via utils.sitemap.

quiz-index.json is always fully rebuilt from what's on disk right now —
that already means a quiz JSON that no longer exists on disk can never
appear in the output, and a quiz JSON that DOES exist is always included
exactly once. What's new in this version:

- Duplicate detection uses (title, topic), not title alone. Two quizzes
  CAN legitimately share a title if their topic differs (e.g. a
  "Fundamentals" quiz under both "EC2" and "S3") — that's not a
  duplicate. A true duplicate (same title AND same topic, appearing in
  two different JSON files) is skipped with a warning; first file found
  wins.
- Sitemap side still prunes any /quiz/<stem> entry whose source
  JSON no longer exists (unchanged logic, just re-verified against the
  new duplicate handling; URL shape updated T5-2 2026-07-26 from the old
  quiz.html?quiz=<stem> query-string form to the clean /quiz/:quizId
  path T5-1's React route uses).
- PY-1: each entry now also carries questionCount and estimatedMinutes,
  mirroring what generate_notes.py's calculate_read_time() already does
  for notes — question-count-based instead of word-count-based, since a
  quiz has no prose to count words in. Feeds T3-4's reading-time-style
  sort in QuizIndex.tsx, previously impossible because the index carried
  no count at all.

--rebuild: forces the sitemap side to start from an empty list (old
"rebuild from scratch" behavior) instead of loading + upserting against
the existing sitemap.xml. quiz-index.json itself has no other state to
diff against, so --rebuild doesn't change how it's built — it only
matters for the sitemap.

Run from python/: python generate_quiz_index.py [--rebuild]
"""

import os
import json
import argparse
from pathlib import Path
from utils.sitemap import add_url, remove_url, load_sitemap, write_sitemap
from utils.site_config import BASE_URL

ROOT     = "../web/public/data/quiz"
OUTPUT   = "../web/public/data/index/quiz-index.json"

# PY-1: tunable default, matching calculate_read_time()'s wpm=225 convention
# in generate_notes.py — a single named constant, not a magic number inline.
SECONDS_PER_QUESTION = 45


def calculate_quiz_time(question_count: int, seconds_per_question: int = SECONDS_PER_QUESTION) -> dict:
    """Question-count-based time estimate, the quiz equivalent of
    generate_notes.py's word-count-based calculate_read_time(). Always at
    least 1 minute, even for a 0- or 1-question quiz — never 0 or negative.
    """
    minutes = max(1, round(question_count * seconds_per_question / 60))
    return {"question_count": question_count, "estimated_minutes": minutes}


def main():
    parser = argparse.ArgumentParser(
        description="Generate quiz-index.json and update sitemap.xml"
    )
    parser.add_argument(
        "--rebuild", action="store_true",
        help="Start the sitemap from scratch instead of upserting against the existing file."
    )
    args = parser.parse_args()

    items = []
    urls = [] if args.rebuild else load_sitemap()
    seen_keys = set()    # (title, topic) — true-duplicate detection
    seen_stems = set()   # file stems present this run, for pruning

    skipped_duplicates = 0

    for filename in sorted(os.listdir(ROOT)):
        if not filename.lower().endswith(".json"):
            continue

        path = os.path.join(ROOT, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError) as exc:
            print(f"  SKIP {filename}: {exc}")
            continue

        title = data.get("title", "").strip()
        topic = data.get("topic", "").strip()

        if not title or not topic:
            print(f"  SKIP {filename}: missing title or topic")
            continue

        key = (title, topic)
        if key in seen_keys:
            print(
                f"  ⚠️  SKIP {filename}: duplicate quiz — title '{title}' + "
                f"topic '{topic}' already seen in another file"
            )
            skipped_duplicates += 1
            continue
        seen_keys.add(key)

        stem = Path(filename).stem
        seen_stems.add(stem)

        questions = data.get("questions", [])
        question_count = len(questions) if isinstance(questions, list) else 0
        quiz_time = calculate_quiz_time(question_count)

        entry = {"title": title, "file": stem, "topic": topic}
        if data.get("description"):
            entry["description"] = data["description"].strip()
        entry["questionCount"] = quiz_time["question_count"]
        entry["estimatedMinutes"] = quiz_time["estimated_minutes"]
        items.append(entry)

        urls = add_url(
            urls,
            f"{BASE_URL}/quiz/{stem}",
            changefreq="monthly",
            priority="0.7",
        )

    # ── Prune orphans: /quiz/<stem> URLs whose JSON no longer exists ──
    # T5-2 (2026-07-26): clean-path shape (T5-1's /quiz/:quizId route),
    # not the old quiz.html?quiz=<stem> query-string URL.
    quiz_url_prefix = f"{BASE_URL}/quiz/"
    removed = 0
    for entry in list(urls):
        loc = entry["loc"]
        if loc.startswith(quiz_url_prefix):
            stem = loc[len(quiz_url_prefix):]
            if stem not in seen_stems:
                urls = remove_url(urls, loc)
                removed += 1
                print(f"  🗑️  Removed stale sitemap entry: {loc}")

    if removed:
        print(f"  Pruned {removed} stale quiz URL(s) from sitemap")
    if skipped_duplicates:
        print(f"  ⚠️  Skipped {skipped_duplicates} duplicate quiz file(s) — see warnings above")

    items.sort(key=lambda x: (x["topic"], x["title"]))

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"Quizzes": items}, f, indent=2, ensure_ascii=False)

    print(f"✅ Wrote {len(items)} quiz entries to {OUTPUT}")

    write_sitemap(urls)


if __name__ == "__main__":
    main()
