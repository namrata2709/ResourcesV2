"""
parse_reflection.py — Parses [reflection] blocks from md body.
Unlike other parsers, reflection questions are rendered to STATIC HTML
(no JSON, no JS dependency). The entire Reflection Questions section is
replaced with a pre-built HTML block containing hint-reveal details elements.

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

import re
import html as html_mod


def parse_reflection(body_md: str) -> tuple[str, list[dict]]:
    """
    Finds all [reflection]...[/reflection] blocks in body_md.
    Returns (body_md_with_blocks_stripped, list_of_question_dicts).
    Does NOT write any JSON — caller builds static HTML from the list.
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
    print(f"✅ reflection: {len(questions)} questions parsed (static HTML, no JSON)")
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
