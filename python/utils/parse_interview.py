"""
parse_interview.py — Parses [interview] blocks, writes json/interview.json
"""

import re
import json
import os


def parse_interview(body_md: str, output_dir: str) -> str:
    pattern = re.compile(r'\[interview\]\s*(.+?)\s*\[/interview\]', re.DOTALL)
    blocks  = pattern.findall(body_md)

    if not blocks:
        return body_md

    questions = []
    for idx, block in enumerate(blocks, start=1):
        q = parse_interview_block(block, idx)
        if q:
            questions.append(q)

    os.makedirs(os.path.join(output_dir, "json"), exist_ok=True)
    out_path = os.path.join(output_dir, "json", "interview.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"questions": questions}, f, indent=2, ensure_ascii=False)

    print(f"✅ interview.json written: {len(questions)} questions → {out_path}")
    return pattern.sub("", body_md)


def parse_interview_block(block: str, idx: int) -> dict | None:
    fields = {}
    for line in block.strip().splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()

    for r in ["q", "a", "d", "cat"]:
        if r not in fields:
            print(f"⚠️  Interview block {idx} missing field: '{r}' — skipping")
            return None

    valid_diff = {"easy", "medium", "hard", "expert"}
    difficulty = fields["d"].lower()
    if difficulty not in valid_diff:
        print(f"⚠️  Interview block {idx} difficulty '{difficulty}' invalid — defaulting to easy")
        difficulty = "easy"

    valid_cat = {"complexity", "implementation", "application", "tradeoffs"}
    category = fields["cat"].lower()
    if category not in valid_cat:
        print(f"⚠️  Interview block {idx} category '{category}' invalid — defaulting to implementation")
        category = "implementation"

    return {
        "id":         idx,
        "question":   fields["q"],
        "answer":     fields["a"],
        "difficulty": difficulty,
        "category":   category
    }
