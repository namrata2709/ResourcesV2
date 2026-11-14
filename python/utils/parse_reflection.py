"""
parse_reflection.py — Parses [reflection] blocks from md body.
Renders to STATIC HTML (unchanged) AND, as of T5-2 (2026-07-26), also
persists the same already-structured questions list to
json/reflection.json — the React Note page (T5-3a) needs real
structured data to render from, not a scrape of the static HTML.

Markdown syntax:
[reflection]
q: What happens to your data when an EC2 instance is stopped?
hint: Think about instance store vs EBS volumes and their persistence behaviour.
[/reflection]

[reflection]
q: Why would you choose a Security Group over a NACL?
hint: Consider statefulness and where each operates in the network stack.
[/reflection]
"""

import json
import os
import re
import html as html_mod


def parse_reflection(body_md: str, output_dir: str = None) -> tuple[str, list[dict]]:
    """
    Finds all [reflection]...[/reflection] blocks in body_md.
    Returns (body_md_with_blocks_stripped, list_of_question_dicts).
    Caller still builds static HTML from the list via
    build_reflection_html(), unchanged.

    Side effect (T5-2): when output_dir is given, also writes
    json/reflection.json with the same structured questions list — a
    strictly additive change; passing no output_dir (the previous
    default, and every existing call site before this ticket) preserves
    the old "no JSON, static HTML only" behavior exactly.
    """
    pattern = re.compile(r'\[reflection\]\s*(.+?)\s*\[/reflection\]', re.DOTALL)
    blocks = pattern.findall(body_md)

    if not blocks:
        return body_md, []

    questions = []
    for idx, block in enumerate(blocks, start=1):
        q = parse_reflection_block(block, idx)
        if q:
            questions.append(q)

    body_md = pattern.sub("", body_md)

    if output_dir and questions:
        os.makedirs(os.path.join(output_dir, "json"), exist_ok=True)
        out_path = os.path.join(output_dir, "json", "reflection.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"questions": questions}, f, indent=2, ensure_ascii=False)

    print(f"✅ reflection: {len(questions)} questions parsed (static HTML" +
          (", json/reflection.json written)" if output_dir and questions else ", no JSON)"))
    return body_md, questions


def parse_reflection_block(block: str, idx: int) -> dict | None:
    fields = {}
    for line in block.strip().splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()

    if "q" not in fields:
        print(f"⚠️  Reflection block {idx} missing 'q' field — skipping")
        return None

    return {
        "id":       idx,
        "question": fields["q"],
        "hint":     fields.get("hint", "")
    }


def build_reflection_html(questions: list[dict]) -> str:
    """
    Builds the static HTML for the Reflection Questions collapsible section.
    Uses hint-details/hint-summary pattern matching instructions.md spec.
    Called by generate_notes.py after parse_reflection() runs.
    """
    if not questions:
        return ""

    blocks = []
    for q in questions:
        question = html_mod.escape(q["question"])
        hint     = html_mod.escape(q["hint"]) if q["hint"] else ""

        hint_html = ""
        if hint:
            hint_html = (
                '\n<details class="hint-details">'
                '\n<summary class="hint-summary">💡 Hint</summary>'
                '\n<div class="hint-content">'
                f'\n<p>{hint}</p>'
                '\n</div>'
                '\n</details>'
            )

        blocks.append(
            f'<div class="question-block">'
            f'\n<h4>{q["id"]}. {question}</h4>'
            f'{hint_html}'
            f'\n</div>'
        )

    inner = "\n".join(blocks)

    return (
        '<details class="collapsible-section">'
        '\n<summary><h2 id="reflection-questions">🤔 Reflection Questions</h2></summary>'
        '\n<div class="section-content">'
        f'\n{inner}'
        '\n</div>'
        '\n</details>'
    )
