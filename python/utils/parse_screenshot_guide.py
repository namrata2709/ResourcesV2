"""
parse_screenshot_guide.py — Parses [screenshot-guide] blocks from md body,
writes screenshot-guide.md to the topic folder.

Unlike other parsers, this produces a Markdown file (not JSON) — it's a
human-readable capture guide for the trainer, not a data file for the JS.

Markdown syntax (one block per screenshot, anywhere in the md body):

[screenshot-guide]
file: screenshot-create-bucket.png
task: Task 1: Create the Bucket
step: Click Create Bucket and fill in the Bucket name field
show: Bucket name field filled with "my-lab-bucket-2026", Region set to us-east-1, all other fields at defaults
[/screenshot-guide]

Fields:
  file  — filename, must match the screenshot: line in the [hands-on] or Task collapsible (required)
  task  — which task/section this screenshot belongs to (required)
  step  — the console action being captured, imperative phrasing (required)
  show  — exactly what must be visible in the frame (required)
  note  — optional extra instruction for the trainer (e.g. "Zoom in on the status badge")
"""

import re
import os


def parse_screenshot_guide(body_md: str, output_dir: str) -> str:
    """
    Finds all [screenshot-guide]...[/screenshot-guide] blocks in body_md.
    Writes screenshot-guide.md to output_dir.
    Returns body_md with all [screenshot-guide] blocks stripped out.
    """
    pattern = re.compile(
        r'\[screenshot-guide\]\s*(.+?)\s*\[/screenshot-guide\]',
        re.DOTALL
    )
    blocks = pattern.findall(body_md)

    if not blocks:
        return body_md

    screenshots = []
    for idx, block in enumerate(blocks, start=1):
        s = parse_screenshot_block(block, idx)
        if s:
            screenshots.append(s)

    if screenshots:
        out_path = os.path.join(output_dir, "screenshot-guide.md")
        write_screenshot_guide(screenshots, out_path)
        print(f"✅ screenshot-guide.md written: {len(screenshots)} screenshots → {out_path}")

    return pattern.sub("", body_md)


def parse_screenshot_block(block: str, idx: int) -> dict | None:
    fields = {}
    for line in block.strip().splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()

    for required in ["file", "task", "step", "show"]:
        if required not in fields:
            print(f"⚠️  Screenshot-guide block {idx} missing field: '{required}' — skipping")
            return None

    return {
        "idx":  idx,
        "file": fields["file"],
        "task": fields["task"],
        "step": fields["step"],
        "show": fields["show"],
        "note": fields.get("note", ""),
    }


def write_screenshot_guide(screenshots: list[dict], out_path: str):
    """
    Writes the combined screenshot-guide.md grouped by task.
    """
    lines = [
        "# Screenshot Guide\n",
        "One entry per screenshot. Capture each in sequence during the lab.\n",
        "---\n",
    ]

    # Group by task, preserving first-seen order
    tasks_seen = []
    by_task    = {}
    for s in screenshots:
        task = s["task"]
        if task not in by_task:
            by_task[task] = []
            tasks_seen.append(task)
        by_task[task].append(s)

    for task in tasks_seen:
        lines.append(f"## {task}\n")
        for s in by_task[task]:
            lines.append(f"### {s['idx']}. `{s['file']}`\n")
            lines.append(f"**Console action:** {s['step']}\n")
            lines.append(f"**What must be visible:** {s['show']}\n")
            if s["note"]:
                lines.append(f"**Trainer note:** {s['note']}\n")
            lines.append("---\n")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
