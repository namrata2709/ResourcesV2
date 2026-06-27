"""
parse_glossary.py — Parses [glossary] blocks from md, writes json/glossary.json
"""

import re
import json
import os


def parse_glossary(body_md: str, output_dir: str) -> str:
    pattern = re.compile(r'\[glossary\]\s*(.+?)\s*\[/glossary\]', re.DOTALL)
    blocks  = pattern.findall(body_md)

    if not blocks:
        return body_md

    terms = []
    for idx, block in enumerate(blocks, start=1):
        t = parse_glossary_block(block, idx)
        if t:
            terms.append(t)

    os.makedirs(os.path.join(output_dir, "json"), exist_ok=True)
    out_path = os.path.join(output_dir, "json", "glossary.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"terms": terms}, f, indent=2, ensure_ascii=False)

    print(f"✅ glossary.json written: {len(terms)} terms → {out_path}")
    return pattern.sub("", body_md)


def parse_glossary_block(block: str, idx: int) -> dict | None:
    fields = {}
    for line in block.strip().splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()

    for r in ["t", "d", "e"]:
        if r not in fields:
            print(f"⚠️  Glossary block {idx} missing field: '{r}' — skipping")
            return None

    return {
        "term":       fields["t"],
        "definition": fields["d"],
        "example":    fields["e"]
    }
