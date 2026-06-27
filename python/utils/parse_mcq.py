"""
parse_mcq.py -- Parses [mcq] blocks from md body and writes json/mcq.json
Called by build.py when [mcq] blocks are found.
Usage: parse_mcq(body_md, output_dir)

JSON schema matches notes-mcq.js (shared, reused from AWS) EXACTLY:
{
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": [{"letter":"A","text":"..."}, ...],
      "correctAnswer": "B",
      "difficulty": "basic" | "intermediate" | "advanced",
      "explanation": {"correct": "...", "why": "..."}
    }
  ]
}
"""

import re
import json
import os

LETTERS = ["A", "B", "C", "D"]


def parse_mcq(body_md: str, output_dir: str) -> str:
    """
    Finds all [mcq]...[/mcq] blocks in body_md.
    Writes json/mcq.json to output_dir.
    Returns body_md with all [mcq] blocks stripped out.
    """
    pattern = re.compile(r'\[mcq\]\s*(.+?)\s*\[/mcq\]', re.DOTALL)
    blocks  = pattern.findall(body_md)

    if not blocks:
        return body_md

    questions = []
    for idx, block in enumerate(blocks, start=1):
        q = parse_mcq_block(block, idx)
        if q:
            questions.append(q)

    os.makedirs(os.path.join(output_dir, "json"), exist_ok=True)
    out_path = os.path.join(output_dir, "json", "mcq.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"questions": questions}, f, indent=2, ensure_ascii=False)

    print(f"mcq.json written: {len(questions)} questions -> {out_path}")

    body_md = pattern.sub("", body_md)
    return body_md


def parse_mcq_block(block: str, idx: int):
    """
    Parses one [mcq] block into a question dict matching AWS schema.

    Fields:
      q:  question text
      o:  options pipe-separated, exactly 4
      c:  correct option index, 0-based (0=A, 1=B, 2=C, 3=D)
      e:  explanation for the correct answer (the "correct" sub-field)
      w:  why the other options are wrong (the "why" sub-field) -- optional
      d:  difficulty -- beginner/intermediate/advanced/expert, mapped to
          AWS's basic/intermediate/advanced bands
    """
    fields = {}
    for line in block.strip().splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()

    required = ["q", "o", "c", "e", "d"]
    for r in required:
        if r not in fields:
            print(f"MCQ block {idx} missing field: '{r}' -- skipping")
            return None

    options = [o.strip() for o in fields["o"].split("|")]
    if len(options) > 4:
        print(f"MCQ block {idx} has {len(options)} pieces after splitting on '|' "
              f"-- likely a stray '|' inside option text. Merging the extra "
              f"piece(s) back into the last option. Fix the source md to avoid "
              f"relying on this recovery.")
        options = options[:3] + ["|".join(options[3:])]
    elif len(options) < 4:
        print(f"MCQ block {idx} must have exactly 4 options -- got {len(options)}")
        return None

    try:
        correct_idx = int(fields["c"])
        if correct_idx not in range(4):
            raise ValueError
    except ValueError:
        print(f"MCQ block {idx} correct index must be 0-3 -- got '{fields['c']}'")
        return None

    difficulty_map = {
        "beginner":     "basic",
        "intermediate": "intermediate",
        "advanced":     "advanced",
        "expert":       "advanced",
    }
    difficulty = difficulty_map.get(fields["d"].lower(), "basic")

    options_obj = [
        {"letter": LETTERS[i], "text": opt}
        for i, opt in enumerate(options)
    ]
    correct_letter = LETTERS[correct_idx]

    why_text = fields.get("w", "The other options describe related but distinct concepts.")

    return {
        "id":            idx,
        "question":      fields["q"],
        "options":       options_obj,
        "correctAnswer": correct_letter,
        "difficulty":    difficulty,
        "explanation": {
            "correct": fields["e"],
            "why":     why_text
        }
    }
