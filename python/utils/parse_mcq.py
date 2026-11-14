"""
parse_mcq.py -- Parses [mcq] blocks from md body and writes json/mcq.json
Called by build.py when [mcq] blocks are found.
Usage: parse_mcq(body_md, output_dir)

SCHEMA (T5-2, 2026-07-26): unified with the standalone quiz.json schema,
confirmed directly against real quiz.json sample files
(additional_networking_protocols.json, additional_networking_technologies.json)
and the React QuestionCard's own type definitions -- not guessed:
{
  "questions": [
    {
      "id": 1,
      "question": "...",
      "multiSelect": false,
      "difficulty": "basic" | "intermediate" | "advanced",  # optional, kept -- not on the ticket's drop list
      "options": [
        {
          "id": "A",
          "text": "...",
          "isCorrect": true,
          "explanation": {"why": "..."}
        },
        ...
      ]
    }
  ]
}

Previously this wrote a notes-mcq-only shape (`options:[{letter,text}]`,
top-level `correctAnswer`/`explanation:{correct,why}`) that only the
notes-page MCQ renderer understood. quiz.json (standalone quizzes,
hand-authored under data/quiz/) already used the per-option
id/text/isCorrect/explanation.why shape. Unifying on quiz.json's shape
means the SAME JSON file can now be consumed by both the notes-page MCQ
renderer and the standalone quiz engine (T1-5's "Open as Quiz" link),
which was the whole point of this schema-unification pass.

Every option now carries its own `explanation.why` (not just the correct
one). The `[mcq]` block's authoring format supports this two ways:
  - `w:` -- one shared "why the others are wrong" text, applied to every
    wrong option (the original, still-fully-supported syntax -- every
    block written before T5-2 keeps working exactly as before).
  - `wA:`/`wB:`/`wC:`/`wD:` (new, T5-2 2026-07-26) -- optional, genuinely
    distinct per-option explanations. When given for a specific letter,
    it wins over the shared `w:` for that option. Purely additive; an
    author can add these incrementally to existing questions without
    touching `w:` or rewriting anything else.
`aws-standard-instructions.md`/`dsa-instructions.md`'s field references
were updated in the same pass to document `wA`/`wB`/`wC`/`wD`.

Rich optional quiz.json fields (learnMore, keyPoints, examples, analogy,
comparison, keyDistinction, confusion, evaluationStatus) and category/tags
are explicitly NOT written here -- decided 2026-07-26 as not worth the
per-question authoring burden for notes-MCQ blocks, and the unified
schema only requires them "if genuinely present" (QuizExplanation's
React type treats all of them as optional).
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
    Parses one [mcq] block into a question dict matching the unified
    notes-MCQ/quiz.json schema (see module docstring).

    Fields:
      q:   question text
      o:   options pipe-separated, exactly 4
      c:   correct option index, 0-based (0=A, 1=B, 2=C, 3=D)
      e:   explanation for the correct answer
      w:   why the other options are wrong -- shared fallback across
           every wrong option's explanation.why when no per-option wA/
           wB/wC/wD is given (optional)
      wA/wB/wC/wD: (new, T5-2 2026-07-26) optional per-option
           explanation for that specific wrong option. Takes priority
           over `w` for that letter when both are present. Purely
           additive -- every [mcq] block written before this change
           only had `w`, and continues to work exactly as before with
           the same wrong-option text repeated for every wrong option.
      d:   difficulty -- beginner/intermediate/advanced/expert, mapped
           to AWS's basic/intermediate/advanced bands
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

    correct_explanation = fields["e"]
    shared_wrong_explanation = fields.get("w", "The other options describe related but distinct concepts.")

    def wrong_explanation_for(letter: str) -> str:
        # Per-option field (wA/wB/wC/wD) wins if an author has written
        # one for this specific letter; otherwise fall back to the
        # shared `w` (or its own default if `w` was omitted too).
        return fields.get(f"w{letter}", shared_wrong_explanation)

    options_obj = [
        {
            "id": LETTERS[i],
            "text": opt,
            "isCorrect": i == correct_idx,
            "explanation": {
                "why": correct_explanation if i == correct_idx else wrong_explanation_for(LETTERS[i])
            },
        }
        for i, opt in enumerate(options)
    ]

    return {
        "id":         idx,
        "question":   fields["q"],
        "multiSelect": False,  # the [mcq] block syntax has no multi-select concept today
        "difficulty": difficulty,
        "options":    options_obj,
    }
