"""
parse_hands_on.py — Parses [hands-on] wrapper containing [project] blocks.
Renders directly to static HTML — no JSON, no JS dependency.
Same model as parse_reflection.py (block syntax for clean authoring,
Python converts to ready-to-render HTML).

Markdown syntax:
[hands-on]
[project]
title: Project 1: Launch an EC2 Instance
objective: Deploy a web server on EC2
time: 30-45 min
cost: Free tier eligible
prereqs: AWS account | EC2 basics
step: Open the EC2 console and click Launch Instance
screenshot: screenshot-launch-instance.png | Launch Instance wizard visible
step: Select t2.micro instance type
[/project]

[project]
title: Project 2: ...
...
[/project]
[/hands-on]
"""

import re
import html as html_mod


def parse_hands_on(body_md: str, output_dir: str = ".") -> tuple[str, str]:
    """
    Finds [hands-on]...[/hands-on] block, parses nested [project] blocks,
    returns (body_md_with_block_stripped, static_html_string).
    output_dir kept for signature compatibility — no files written.
    """
    outer = re.compile(r'\[hands-on\]\s*(.+?)\s*\[/hands-on\]', re.DOTALL)
    outer_match = outer.search(body_md)

    if not outer_match:
        return body_md, ""

    inner = outer_match.group(1)
    projects = []

    project_pattern = re.compile(r'\[project\]\s*(.+?)\s*\[/project\]', re.DOTALL)
    for idx, pm in enumerate(project_pattern.finditer(inner), start=1):
        p = parse_project_block(pm.group(1), idx)
        if p:
            projects.append(p)

    body_md = outer.sub("", body_md)
    html    = build_hands_on_html(projects)
    print(f"✅ hands-on: {len(projects)} projects rendered as static HTML")
    return body_md, html


def parse_project_block(block: str, idx: int) -> dict | None:
    fields = {}
    steps  = []

    for line in block.strip().splitlines():
        line = line.strip()
        if not line:
            continue

        if line.startswith("step:"):
            text = line[5:].strip()
            if text:
                steps.append({"type": "step", "text": text})

        elif line.startswith("screenshot:"):
            rest = line[11:].strip()
            if "|" in rest:
                filename, _, caption = rest.partition("|")
                steps.append({
                    "type":     "screenshot",
                    "filename": filename.strip(),
                    "caption":  caption.strip()
                })
            else:
                steps.append({
                    "type":     "screenshot",
                    "filename": rest.strip(),
                    "caption":  ""
                })

        elif ":" in line:
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()

    if "title" not in fields:
        print(f"⚠️  Project block {idx} missing 'title' field — skipping")
        return None

    prereqs = []
    if "prereqs" in fields:
        prereqs = [p.strip() for p in fields["prereqs"].split("|") if p.strip()]

    return {
        "id":        idx,
        "title":     fields["title"],
        "objective": fields.get("objective", ""),
        "time":      fields.get("time", ""),
        "cost":      fields.get("cost", ""),
        "prereqs":   prereqs,
        "steps":     steps,
    }


def build_hands_on_html(projects: list[dict]) -> str:
    """
    Renders all projects to static HTML.
    Each project is a <details class="project-block"> with:
      - meta bar (time, cost, prereqs)
      - <ol> of steps, with screenshot placeholders inline
    """
    if not projects:
        return ""

    parts = []
    for p in projects:
        parts.append(_render_project(p))

    return "\n\n".join(parts)


def _render_project(p: dict) -> str:
    title     = html_mod.escape(p["title"])
    objective = html_mod.escape(p["objective"])
    time_str  = html_mod.escape(p["time"])
    cost_str  = html_mod.escape(p["cost"])
    prereqs   = p["prereqs"]
    steps     = p["steps"]

    lines = [
        f'<details class="project-block" open>',
        f'<summary><h3 class="project-title">{title}</h3></summary>',
        f'<div class="project-content">',
    ]

    if objective:
        lines.append(f'<p class="project-objective"><strong>Objective:</strong> {objective}</p>')

    # Meta bar
    meta_parts = []
    if time_str:
        meta_parts.append(f'<span class="meta-time">⏱ {time_str}</span>')
    if cost_str:
        meta_parts.append(f'<span class="meta-cost">💰 {cost_str}</span>')
    if prereqs:
        prereq_str = " · ".join(html_mod.escape(r) for r in prereqs)
        meta_parts.append(f'<span class="meta-prereqs">📋 Prerequisites: {prereq_str}</span>')
    if meta_parts:
        lines.append(f'<div class="project-meta">{" ".join(meta_parts)}</div>')

    # Steps
    if steps:
        lines.append('<ol class="project-steps">')
        for s in steps:
            if s["type"] == "step":
                lines.append(f'<li>{html_mod.escape(s["text"])}</li>')
            elif s["type"] == "screenshot":
                filename = html_mod.escape(s["filename"])
                caption  = html_mod.escape(s["caption"])
                lines.append(
                    f'<li class="screenshot-placeholder">'
                    f'<span class="screenshot-label">📷 Screenshot:</span> '
                    f'<code>{filename}</code>'
                    + (f' — {caption}' if caption else "")
                    + '</li>'
                )
        lines.append('</ol>')

    lines += ['</div>', '</details>']
    return "\n".join(lines)
