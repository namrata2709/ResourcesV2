"""
parse_checklist.py — Parses [checklist] blocks, writes json/checklist.json
"""

import re
import json
import os


def parse_checklist(body_md: str, output_dir: str) -> str:
    pattern = re.compile(r'\[checklist\]\s*(.+?)\s*\[/checklist\]', re.DOTALL)
    blocks  = pattern.findall(body_md)

    if not blocks:
        return body_md

    categories = []
    item_counter = 1
    for block in blocks:
        cat = parse_checklist_block(block, item_counter)
        if cat:
            item_counter += len(cat["items"])
            categories.append(cat)

    os.makedirs(os.path.join(output_dir, "json"), exist_ok=True)
    out_path = os.path.join(output_dir, "json", "checklist.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"categories": categories}, f, indent=2, ensure_ascii=False)

    total = sum(len(c["items"]) for c in categories)
    print(f"✅ checklist.json written: {len(categories)} categories, {total} items → {out_path}")
    return pattern.sub("", body_md)


def parse_checklist_block(block: str, start_id: int) -> dict | None:
    lines  = block.strip().splitlines()
    title  = None
    items  = []
    item_n = start_id

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith("cat:"):
            title = line.partition(":")[2].strip()
        elif line.startswith("- "):
            items.append({
                "id":   f"c{item_n}",
                "text": line[2:].strip()
            })
            item_n += 1

    if not title:
        print(f"⚠️  Checklist block missing cat: field — skipping")
        return None
    if not items:
        print(f"⚠️  Checklist category '{title}' has no items — skipping")
        return None

    return {"title": title, "items": items}
