"""
parse_problems.py — Parses [problem] blocks, writes json/problems.json
"""

import re
import json
import os


def parse_problems(body_md: str, output_dir: str) -> str:
    pattern = re.compile(r'\[problem\]\s*(.+?)\s*\[/problem\]', re.DOTALL)
    blocks  = pattern.findall(body_md)

    if not blocks:
        return body_md

    problems = []
    for idx, block in enumerate(blocks, start=1):
        p = parse_problem_block(block, idx)
        if p:
            problems.append(p)

    os.makedirs(os.path.join(output_dir, "json"), exist_ok=True)
    out_path = os.path.join(output_dir, "json", "problems.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"problems": problems}, f, indent=2, ensure_ascii=False)

    print(f"✅ problems.json written: {len(problems)} problems → {out_path}")
    return pattern.sub("", body_md)


def parse_problem_block(block: str, idx: int) -> dict | None:
    fields = {}
    for line in block.strip().splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()

    for r in ["title", "url", "diff", "pattern"]:
        if r not in fields:
            print(f"⚠️  Problem block {idx} missing field: '{r}' — skipping")
            return None

    valid_diff = {"easy", "medium", "hard"}
    diff = fields["diff"].lower()
    if diff not in valid_diff:
        print(f"⚠️  Problem block {idx} diff '{diff}' invalid — defaulting to medium")
        diff = "medium"

    return {
        "id":      idx,
        "number":  fields.get("n", ""),
        "title":   fields["title"],
        "url":     fields["url"],
        "diff":    diff,
        "pattern": fields["pattern"]
    }
