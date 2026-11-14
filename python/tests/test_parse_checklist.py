"""
test_parse_checklist.py — new coverage for utils/parse_checklist.py.

Previously untested: this and every other utils/parse_*.py module (11
files, ~1,750 lines total) plus animate.py were only ever mentioned inside
test_generate_notes.py's own comment explaining why it does NOT exercise
them directly ("would need every utils.parse_*/animate/parse_slides module
wired"). This is the first dedicated unit test for one of them, meant as
the pattern to repeat for the rest (parse_contest, parse_glossary,
parse_hands_on, parse_interview, parse_mcq, parse_problems, parse_reflection,
parse_screenshot_guide, parse_visual_mcq, animate — parse_slides.py, at 661
lines the largest and feeding the real shipped T5-4 Slides feature, is the
highest-value one to do next).

Run: dashboard test -k parse_checklist   (from python/)
"""

import json

from utils.parse_checklist import parse_checklist, parse_checklist_block


def test_single_category_written_to_json(tmp_path):
    body = """
Some prose before.

[checklist]
cat: Before you begin
- Install the CLI
- Configure credentials
[/checklist]

Some prose after.
"""
    remaining = parse_checklist(body, str(tmp_path))

    out_file = tmp_path / "json" / "checklist.json"
    assert out_file.exists()
    data = json.loads(out_file.read_text(encoding="utf-8"))

    assert len(data["categories"]) == 1
    cat = data["categories"][0]
    assert cat["title"] == "Before you begin"
    assert [item["text"] for item in cat["items"]] == ["Install the CLI", "Configure credentials"]
    # ids are sequential starting at c1, not per-category
    assert [item["id"] for item in cat["items"]] == ["c1", "c2"]

    # the [checklist]...[/checklist] block itself is stripped from the body
    assert "[checklist]" not in remaining
    assert "Some prose before." in remaining
    assert "Some prose after." in remaining


def test_item_ids_are_sequential_across_multiple_categories(tmp_path):
    body = """
[checklist]
cat: First
- One
- Two
[/checklist]

[checklist]
cat: Second
- Three
[/checklist]
"""
    parse_checklist(body, str(tmp_path))
    data = json.loads((tmp_path / "json" / "checklist.json").read_text(encoding="utf-8"))

    all_ids = [item["id"] for cat in data["categories"] for item in cat["items"]]
    assert all_ids == ["c1", "c2", "c3"]


def test_no_checklist_blocks_returns_body_unchanged_and_writes_nothing(tmp_path):
    body = "Just plain prose, no checklist here."
    remaining = parse_checklist(body, str(tmp_path))

    assert remaining == body
    assert not (tmp_path / "json" / "checklist.json").exists()


def test_block_missing_cat_field_is_skipped(tmp_path, capsys):
    body = """
[checklist]
- Item with no category title
[/checklist]
"""
    parse_checklist(body, str(tmp_path))
    data = json.loads((tmp_path / "json" / "checklist.json").read_text(encoding="utf-8"))

    assert data["categories"] == []
    assert "missing cat:" in capsys.readouterr().out.lower()


def test_block_with_cat_but_no_items_is_skipped(tmp_path, capsys):
    body = """
[checklist]
cat: Empty category
[/checklist]
"""
    parse_checklist(body, str(tmp_path))
    data = json.loads((tmp_path / "json" / "checklist.json").read_text(encoding="utf-8"))

    assert data["categories"] == []
    assert "no items" in capsys.readouterr().out.lower()


def test_parse_checklist_block_directly_with_custom_start_id():
    result = parse_checklist_block("cat: Custom\n- A\n- B\n- C", start_id=10)
    assert result["title"] == "Custom"
    assert [item["id"] for item in result["items"]] == ["c10", "c11", "c12"]
