"""
animate.py — Extracts [animation] block from topic md, assembles final
animation HTML by inlining: animation-core.css, animation-core.js,
the matching renderer-[type].js, and Claude's computeSteps().

Usage: python animate.py <topic-md-path>
Output: data/notes/dsa-[slug]/[animation_name].html
"""

import re
import os
import sys
import json

CSS_DIR = "css/notes/dsa"        # animation-core.css
JS_DIR  = "js/notes/dsa/animation"  # animation-core.js, renderer-*.js

INPUT_BOX_TEMPLATES = {
    "array-number": {
        "label": "Array (comma-separated numbers)",
        "id": "inputArray",
        "maxlength": 80
    },
    "target-number": {
        "label": "Target",
        "id": "inputTarget",
        "maxlength": 10
    },
    "tree-values": {
        "label": "Tree values (comma-separated numbers)",
        "id": "inputTreeValues",
        "maxlength": 60
    },
    "graph-edges": {
        "label": "Edges (one per line: from-to-weight)",
        "id": "inputGraphEdges",
        "maxlength": 200,
        "textarea": True
    },
    "string-text": {
        "label": "Text",
        "id": "inputStringText",
        "maxlength": 20
    },
    "string-pattern": {
        "label": "Pattern",
        "id": "inputStringPattern",
        "maxlength": 20
    },
    "grid-dims": {
        "label": "Rows,Cols (e.g. 4,4)",
        "id": "inputGridDims",
        "maxlength": 10
    },
}


def extract_animation_block(body_md: str) -> dict | None:
    """
    Finds [animation]...[/animation] block.
    Returns dict with fields + raw JS code, or None if not found.
    """
    match = re.search(r'\[animation\]\s*(.+?)\s*\[/animation\]', body_md, re.DOTALL)
    if not match:
        return None

    block = match.group(1)

    # Extract JS code block
    js_match = re.search(r'```js\s*(.+?)\s*```', block, re.DOTALL)
    if not js_match:
        print("⚠️  [animation] block missing ```js computeSteps() code")
        return None
    js_code = js_match.group(1)

    # Remove JS block from rest before parsing fields
    fields_text = block[:js_match.start()]

    fields = {}
    for line in fields_text.strip().splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()

    # Parse input_boxes list: "[array-number, target-number]"
    boxes_raw = fields.get("input_boxes", "[]").strip("[]")
    input_boxes = [b.strip() for b in boxes_raw.split(",") if b.strip()]

    # Collect default_* fields
    defaults = {
        k.replace("default_", ""): v
        for k, v in fields.items()
        if k.startswith("default_")
    }

    anim_type = fields.get("type", "array")

    return {
        "type": anim_type,
        "input_boxes": input_boxes,
        "defaults": defaults,
        "js_code": js_code
    }


def build_input_panel(input_boxes: list, defaults: dict) -> str:
    """
    Generates input panel HTML from fixed box library.
    """
    groups = []
    for box_id in input_boxes:
        tpl = INPUT_BOX_TEMPLATES.get(box_id)
        if not tpl:
            print(f"⚠️  Unknown input box: {box_id} — skipping")
            continue

        default_key = box_id.split("-")[0]  # array-number -> array
        default_val = defaults.get(default_key, "")

        if tpl.get("textarea"):
            field_html = (
                f'<textarea id="{tpl["id"]}" maxlength="{tpl["maxlength"]}" '
                f'rows="3">{default_val}</textarea>'
            )
        else:
            field_html = (
                f'<input type="text" id="{tpl["id"]}" '
                f'value="{default_val}" maxlength="{tpl["maxlength"]}">'
            )

        groups.append(
            f'<div class="input-group" data-box="{box_id}">\n'
            f'    <label>{tpl["label"]}</label>\n'
            f'    {field_html}\n'
            f'</div>'
        )

    groups_html = "\n    ".join(groups)

    return f"""<div class="input-panel">
    {groups_html}
    <button class="run-btn" onclick="initAnimation()">Run</button>
    <div class="input-error" id="inputError"></div>
</div>"""


def build_animation_html(fm: dict, anim: dict, output_path_depth: str) -> str:
    """
    Assembles complete animation HTML.
    fm: topic frontmatter (for title)
    anim: dict from extract_animation_block()

    CSS and shared JS engine/renderer files are LINKED via href/src, not
    inlined. They live at css/notes/dsa/animation-core.css, js/notes/dsa/animation/animation-core.js,
    js/notes/dsa/animation/renderer-[type].js and are shared across all animation pages
    on the same domain -- linking lets the browser cache them once instead of
    re-downloading identical bytes inside every single animation HTML file.
    Only Claude's topic-specific computeSteps() differs per topic, so that
    is the only piece actually inlined.
    """
    title = fm.get("title", "Animation")
    anim_type = anim["type"]
    depth = "../../../"  # data/notes/dsa/[slug]/[file]-animation.html -> project root

    input_panel = build_input_panel(anim["input_boxes"], anim["defaults"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — Animation</title>
<link rel="stylesheet" href="{depth}css/notes/dsa/animation-core.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
</head>
<body>

<div class="anim-header">
    <div class="anim-title">{title}</div>
    <div class="anim-subtitle">Interactive step-by-step animation</div>
</div>

{input_panel}

<div class="step-label" id="stepLabel"><strong>Press Run</strong> to begin.</div>

<div class="anim-canvas" id="animCanvas" data-renderer="{anim_type}"></div>

<div class="decision-banner" id="decisionBanner"></div>

<div class="status-bar" id="statusBar"></div>

<div class="controls">
    <button class="ctrl-btn" id="btnPrev" onclick="goStep(-1)" disabled>&#9664; Prev</button>
    <button class="ctrl-btn primary" id="btnPlayPause" onclick="togglePlay()">&#9654; Play</button>
    <button class="ctrl-btn" id="btnNext" onclick="goStep(1)" disabled>Next &#9654;</button>
    <button class="ctrl-btn" onclick="initAnimation()">&#8635; Restart</button>
    <div class="step-counter" id="stepCounter">Step 0 / 0</div>
</div>

<script src="{depth}js/notes/dsa/animation/animation-core.js"></script>
<script src="{depth}js/notes/dsa/animation/renderer-{anim_type}.js"></script>
<script>
// ── computeSteps() — topic specific, inlined since unique per topic ──
{anim["js_code"]}

// ── boot ──
window.addEventListener('load', initAnimation);
window.addEventListener('resize', () => {{ if (typeof current !== 'undefined' && current >= 0) renderStep(current); }});
</script>
</body>
</html>"""


def read_shared_file(filename: str, sub_dir: str, project_root: str) -> str:
    path = os.path.join(project_root, sub_dir, filename)
    if not os.path.exists(path):
        print(f"⚠️  Shared file not found: {path} — using empty placeholder")
        return f"/* {filename} not found */"
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def run(md_path: str, project_root: str = ".."):
    from  generate_dsa_notes import parse_frontmatter, read_file  # reuse existing parser

    raw = read_file(md_path)
    fm, body = parse_frontmatter(raw)

    anim = extract_animation_block(body)
    if anim is None:
        print("ℹ️  No [animation] block found — skipping animation generation")
        return

    slug = fm.get("slug", "topic")
    animation_name = fm.get("animation_name") or f"{slug}-animation"

    html = build_animation_html(fm, anim, project_root)

    out_dir = os.path.join(project_root,"src", "data", "notes", f"dsa-{slug}")
    print(project_root)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{animation_name}.html")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ animation.html written → {out_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python animate.py <topic-md-path>")
        sys.exit(1)
    run(sys.argv[1])
