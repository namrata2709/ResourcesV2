"""
parse_visual_mcq.py — Parses [visual-mcq] blocks, writes json/visual-mcq.json
"""

import re
import json
import os


def parse_visual_mcq(body_md: str, output_dir: str) -> str:
    pattern = re.compile(r'\[visual-mcq\]\s*(.+?)\s*\[/visual-mcq\]', re.DOTALL)
    blocks  = pattern.findall(body_md)

    if not blocks:
        return body_md

    questions = []
    for idx, block in enumerate(blocks, start=1):
        q = parse_visual_mcq_block(block, idx)
        if q:
            questions.append(q)

    os.makedirs(os.path.join(output_dir, "json"), exist_ok=True)
    out_path = os.path.join(output_dir, "json", "visual-mcq.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"questions": questions}, f, indent=2, ensure_ascii=False)

    print(f"✅ visual-mcq.json written: {len(questions)} questions → {out_path}")
    return pattern.sub("", body_md)


def parse_visual_mcq_block(block: str, idx: int) -> dict | None:
    """
    Parses one [visual-mcq] block.
    Handles multiline code field — everything between code: and next field.
    """
    valid_types = {"fillblank", "trace", "output", "spotbug"}
    valid_diff  = {"beginner", "intermediate", "advanced", "expert"}

    fields  = {}
    lines   = block.strip().splitlines()
    i       = 0
    in_code = False
    code_lines = []

    while i < len(lines):
        line = lines[i].strip()

        # Start of code block
        if line.startswith("code:"):
            in_code = True
            rest = line[5:].strip()
            if rest:
                code_lines.append(rest)
            i += 1
            continue

        # End of code block — next single-char field key
        if in_code:
            if re.match(r'^[a-z]+:', line) and not line.startswith("code:"):
                fields["code"] = "\n".join(code_lines).strip()
                code_lines = []
                in_code = False
                # Don't increment — reprocess this line
                continue
            else:
                code_lines.append(lines[i].rstrip())
                i += 1
                continue

        if line and ":" in line:
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()

        i += 1

    if in_code:
        fields["code"] = "\n".join(code_lines).strip()

    # Validate
    q_type = fields.get("type", "").lower()
    if q_type not in valid_types:
        print(f"⚠️  Visual MCQ block {idx} invalid type '{q_type}' — skipping")
        return None

    for r in ["q", "o", "c", "e", "d"]:
        if r not in fields:
            print(f"⚠️  Visual MCQ block {idx} missing field: '{r}' — skipping")
            return None

    if q_type == "trace" and "img" not in fields:
        print(f"⚠️  Visual MCQ block {idx} type=trace requires img field — skipping")
        return None

    options = [o.strip() for o in fields["o"].split("|")]
    if len(options) > 4:
        print(f"⚠️  Visual MCQ block {idx} has {len(options)} pieces after splitting "
              f"on '|' — likely a stray '|' inside option text. Merging the extra "
              f"piece(s) back into the last option. Fix the source md to avoid "
              f"relying on this recovery.")
        options = options[:3] + ["|".join(options[3:])]
    elif len(options) < 4:
        print(f"⚠️  Visual MCQ block {idx} must have 4 options — got {len(options)}")
        return None

    try:
        correct = int(fields["c"])
        if correct not in range(4):
            raise ValueError
    except ValueError:
        print(f"⚠️  Visual MCQ block {idx} correct index must be 0-3")
        return None

    diff = fields["d"].lower()
    if diff not in valid_diff:
        diff = "beginner"

    return {
        "id":          idx,
        "type":        q_type,
        "difficulty":  diff,
        "question":    fields["q"],
        "code":        fields.get("code", ""),
        "image":       fields.get("img", ""),
        "options":     options,
        "correct":     correct,
        "explanation": fields["e"]
    }
