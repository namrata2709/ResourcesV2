"""
animate.py — Extracts [animation] block from topic md, assembles final
animation HTML by inlining: animation-core.css, animation-core.js,
the matching renderer-[type].js, and Claude's computeSteps().

T1-4: the generated page also bootstraps its own [data-theme] from the
same "theme" localStorage key the rest of the site uses (light/dark/
comfort, default light) — see build_animation_html()'s inline <script>/
<style>. This page is a standalone document (embedded via an <iframe> in
DsaAnimation.tsx) so it does not inherit data-theme from any parent
document automatically; it has to read localStorage and apply the
attribute itself.

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


def build_animation_html(fm: dict, anim: dict, output_path_depth: str = "../../../") -> str:
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

    T1-4: also inlines a theme-bootstrap <script> (reads localStorage's
    "theme" key, sets data-theme on <html>) and a <style> block with the
    same light/dark/comfort CSS variables the React app defines, so this
    standalone page matches the site's current theme rather than always
    rendering in whatever animation-core.css hardcodes. Both are inlined
    (not linked) since they're small and need to run/apply before the
    linked animation-core.css stylesheet, to avoid a flash of the wrong
    theme.
    """
    title = fm.get("title", "Animation")
    anim_type = anim["type"]
    # src/data/notes/dsa-[slug]/[animation_name].html -> project root is 3
    # levels up (dsa-[slug] -> notes -> data -> root); css/ and js/ are
    # siblings of data/ at the root. Kept as a parameter (rather than
    # hardcoded) so the caller's project_root stays the single source of
    # truth instead of two independently-maintained constants drifting.
    depth = output_path_depth

    input_panel = build_input_panel(anim["input_boxes"], anim["defaults"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — Animation</title>
<script>
// T1-4 — theme bootstrap. This standalone page does not inherit
// [data-theme] from the parent app document (different <html> element,
// loaded here as its own document, e.g. via DsaAnimation.tsx's iframe),
// so it must read the same localStorage key the rest of the site writes
// and apply it itself. Same key/values/fallback as lib/theme.ts's
// getSavedTheme() (ported from js/shared/theme.js): key "theme", one of
// "light" | "dark" | "comfort", default "light" if unset/invalid.
// Runs synchronously before the stylesheet link below so the correct
// theme is already set by the time CSS is applied — avoids a flash of
// the wrong theme on load.
(function() {{
    var THEMES = ["light", "dark", "comfort"];
    var theme = "light";
    try {{
        var saved = localStorage.getItem("theme");
        if (THEMES.indexOf(saved) !== -1) {{
            theme = saved;
        }}
    }} catch (e) {{
        // Private-browsing / storage-disabled: fail silently, same as
        // lib/theme.ts's getSavedTheme().
    }}
    document.documentElement.setAttribute("data-theme", theme);
}})();
</script>
<style>
/* T1-4 — shared theme tokens, ported 1:1 from web/web/src/index.css so
   this standalone page has the same variables available regardless of
   what animation-core.css itself currently does with them. If/when
   animation-core.css's own hardcoded hex values are swapped for
   var(--bg-primary) etc., these definitions are the source of truth to
   match — kept here (rather than assuming animation-core.css already
   defines them) since this generator has no way to verify that file's
   contents at generation time. */
:root,
[data-theme="light"] {{
    --bg-primary: #ffffff;
    --bg-secondary: #f6f4ff;
    --bg-card: rgba(255, 255, 255, 0.97);
    --text-primary: #0f1f4e;
    --text-secondary: #3d3d3d;
    --text-muted: #64748b;
    --border-color: rgba(15, 31, 78, 0.1);
    --shadow: rgba(15, 31, 78, 0.12);
    --primary: #7c4dff;
    --primary-hover: #6a3fe0;
    --accent: #512dab;
    --accent-hover: #3f2287;
}}
[data-theme="dark"] {{
    --bg-primary: #0b1330;
    --bg-secondary: #0f1f4e;
    --bg-card: #16224f;
    --text-primary: #fff9ee;
    --text-secondary: #e2d4c1;
    --text-muted: #9aa5c9;
    --border-color: rgba(255, 249, 238, 0.1);
    --shadow: rgba(0, 0, 0, 0.4);
    --primary: #9b7bff;
    --primary-hover: #ab8fff;
    --accent: #7c4dff;
    --accent-hover: #6a3fe0;
}}
[data-theme="comfort"] {{
    --bg-primary: #fff9ee;
    --bg-secondary: #f6e9d8;
    --bg-card: #fffdf7;
    --text-primary: #3f2a12;
    --text-secondary: #6a3e1e;
    --text-muted: #8a6b52;
    --border-color: rgba(106, 62, 30, 0.15);
    --shadow: rgba(106, 62, 30, 0.15);
    --primary: #7c4dff;
    --primary-hover: #6a3fe0;
    --accent: #ffb347;
    --accent-hover: #e89c34;
}}
body {{
    background: var(--bg-primary);
    color: var(--text-primary);
}}
</style>
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
    <button class="ctrl-btn" id="btnPrev" onclick="goStep(-1)" disabled> &#9664; Prev</button>
    <button class="ctrl-btn primary" id="btnPlayPause" onclick="togglePlay()"> &#9654; Play</button>
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
    from generate_notes import parse_frontmatter, read_file  # reuse unified parser

    raw = read_file(md_path)
    fm, body = parse_frontmatter(raw)

    anim = extract_animation_block(body)
    if anim is None:
        print("ℹ️  No [animation] block found — skipping animation generation")
        return

    slug = fm.get("slug", "topic")
    animation_name = fm.get("animation_name") or f"{slug}-animation"

    # project_root is a filesystem path (used below for os.path.join), not
    # the href-relative depth the animation page needs for its <link>/<script>
    # tags — those are two different things and must not be conflated.
    # src/data/notes/dsa-[slug]/[animation_name].html is 3 levels above the
    # project root, matching generate_notes.py's path_depth for notes.html.
    html = build_animation_html(fm, anim, output_path_depth="../../../")

    out_dir = os.path.join(project_root,"src", "data", "notes", f"dsa-{slug}")
    
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
