"""
generate_quiz_list.py
Scans data/quiz/*.json → writes data/index/quiz-index.json.
Also upserts each quiz URL into sitemap.xml via sitemap_utils.

Prunes stale entries: any quiz-index.json entry or sitemap quiz URL whose
source JSON no longer exists in data/quiz/ is removed.

Run from the repo root: python generate_quiz_list.py
"""

import os
import json
from pathlib import Path
from sitemap_utils import add_url, remove_url, load_sitemap, write_sitemap

ROOT     = "../src/data/quiz"
OUTPUT   = "../src/data/index/quiz-index.json"
BASE_URL = "https://namrata2709.github.io/Resources"


def main():
    items = []
    urls  = load_sitemap()
    seen_stems = set()

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

        stem  = Path(filename).stem
        seen_stems.add(stem)

        entry = {"title": title, "file": stem, "topic": topic}
        if data.get("description"):
            entry["description"] = data["description"].strip()
        items.append(entry)

        # Upsert quiz URL into sitemap
        urls = add_url(
            urls,
            f"{BASE_URL}/quiz.html?quiz={stem}",
            changefreq="monthly",
            priority="0.7",
        )

    # ── Prune orphans: quiz.html?quiz=<stem> URLs whose JSON no longer exists ──
    quiz_url_prefix = f"{BASE_URL}/quiz.html?quiz="
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

    items.sort(key=lambda x: (x["topic"], x["title"]))

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"Quizzes": items}, f, indent=2, ensure_ascii=False)

    print(f"✅ Wrote {len(items)} quiz entries to {OUTPUT}")

    write_sitemap(urls)


if __name__ == "__main__":
    main()
