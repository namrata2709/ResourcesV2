"""
parse_contest.py — Parses [contest] blocks, writes json/contest.json
"""

import re
import json
import os


def parse_contest(body_md: str, output_dir: str) -> str:
    pattern = re.compile(r'\[contest\]\s*(.+?)\s*\[/contest\]', re.DOTALL)
    blocks  = pattern.findall(body_md)

    if not blocks:
        return body_md

    problems = []
    for idx, block in enumerate(blocks, start=1):
        p = parse_contest_block(block, idx)
        if p:
            problems.append(p)

    os.makedirs(os.path.join(output_dir, "json"), exist_ok=True)
    out_path = os.path.join(output_dir, "json", "contest.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"problems": problems}, f, indent=2, ensure_ascii=False)

    print(f"✅ contest.json written: {len(problems)} problems → {out_path}")
    return pattern.sub("", body_md)


def parse_contest_block(block: str, idx: int) -> dict | None:
    fields = {}
    for line in block.strip().splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()

    for r in ["title", "platform", "url", "diff", "pattern"]:
        if r not in fields:
            print(f"⚠️  Contest block {idx} missing field: '{r}' — skipping")
            return None

    return {
        "id":       idx,
        "title":    fields["title"],
        "platform": fields["platform"],
        "url":      fields["url"],
        "diff":     fields["diff"],
        "pattern":  fields["pattern"]
    }
