"""
test_parse_screenshot_guide.py

T5-2 (2026-07-26): parse_screenshot_guide() already built a structured
`screenshots` list before write_screenshot_guide() rendered it to
screenshot-guide.md -- this covers the one addition this ticket makes,
the json/screenshot-guide.json side effect, plus the pre-existing
parsing/grouping behavior for completeness since this module had no
dedicated test file before.
"""

import json

from utils.parse_screenshot_guide import (
    parse_screenshot_guide,
    parse_screenshot_block,
    write_screenshot_guide,
)

SAMPLE_BODY = """
Some intro prose.

[screenshot-guide]
file: screenshot-create-bucket.png
task: Task 1: Create the Bucket
step: Click Create Bucket and fill in the Bucket name field
show: Bucket name field filled with "my-lab-bucket-2026"
[/screenshot-guide]

[screenshot-guide]
file: screenshot-enable-versioning.png
task: Task 1: Create the Bucket
step: Toggle versioning on
show: Versioning toggle in the "Enabled" position
note: Zoom in on the toggle
[/screenshot-guide]

[screenshot-guide]
file: screenshot-attach-policy.png
task: Task 2: Attach a Bucket Policy
step: Paste the policy JSON and click Save
show: Save confirmation banner
[/screenshot-guide]

Some trailing prose.
"""


class TestParseScreenshotBlock:
    def test_missing_required_field_returns_none(self, capsys):
        block = "file: shot.png\ntask: Task 1\nstep: Do a thing\n"  # missing show
        assert parse_screenshot_block(block, 1) is None
        assert "missing field: 'show'" in capsys.readouterr().out

    def test_note_defaults_to_empty_string(self):
        block = "file: shot.png\ntask: Task 1\nstep: Do a thing\nshow: The thing done\n"
        s = parse_screenshot_block(block, 1)
        assert s["note"] == ""

    def test_idx_matches_given_index(self):
        block = "file: shot.png\ntask: Task 1\nstep: Do a thing\nshow: The thing done\n"
        s = parse_screenshot_block(block, 5)
        assert s["idx"] == 5


class TestParseScreenshotGuide:
    def test_no_blocks_returns_body_unchanged_and_writes_nothing(self, tmp_path):
        body = "Just prose, no screenshot-guide blocks."
        result = parse_screenshot_guide(body, str(tmp_path))
        assert result == body
        assert not (tmp_path / "screenshot-guide.md").exists()
        assert not (tmp_path / "json" / "screenshot-guide.json").exists()

    def test_strips_blocks_from_returned_body(self, tmp_path):
        remaining = parse_screenshot_guide(SAMPLE_BODY, str(tmp_path))
        assert "[screenshot-guide]" not in remaining
        assert "Some intro prose." in remaining
        assert "Some trailing prose." in remaining

    def test_writes_both_markdown_and_json(self, tmp_path):
        parse_screenshot_guide(SAMPLE_BODY, str(tmp_path))
        assert (tmp_path / "screenshot-guide.md").exists()
        assert (tmp_path / "json" / "screenshot-guide.json").exists()

    def test_json_matches_the_structured_screenshots_list_the_md_was_built_from(self, tmp_path):
        parse_screenshot_guide(SAMPLE_BODY, str(tmp_path))
        data = json.loads((tmp_path / "json" / "screenshot-guide.json").read_text(encoding="utf-8"))
        assert len(data["screenshots"]) == 3
        assert data["screenshots"][0]["file"] == "screenshot-create-bucket.png"
        assert data["screenshots"][1]["note"] == "Zoom in on the toggle"
        assert data["screenshots"][2]["task"] == "Task 2: Attach a Bucket Policy"

        md_text = (tmp_path / "screenshot-guide.md").read_text(encoding="utf-8")
        for s in data["screenshots"]:
            assert s["file"] in md_text

    def test_all_blocks_malformed_writes_neither_file(self, tmp_path):
        body = "[screenshot-guide]\nfile: shot.png\n[/screenshot-guide]\n"  # missing task/step/show
        parse_screenshot_guide(body, str(tmp_path))
        assert not (tmp_path / "screenshot-guide.md").exists()
        assert not (tmp_path / "json" / "screenshot-guide.json").exists()

    def test_creates_json_subdir_if_missing(self, tmp_path):
        assert not (tmp_path / "json").exists()
        parse_screenshot_guide(SAMPLE_BODY, str(tmp_path))
        assert (tmp_path / "json").is_dir()


class TestWriteScreenshotGuideGroupingUnaffected:
    """Confirms the JSON addition didn't change the .md grouping-by-task
    behavior at all -- same function, same output."""

    def test_groups_by_task_preserving_first_seen_order(self, tmp_path):
        parse_screenshot_guide(SAMPLE_BODY, str(tmp_path))
        md_text = (tmp_path / "screenshot-guide.md").read_text(encoding="utf-8")
        task1_pos = md_text.index("## Task 1: Create the Bucket")
        task2_pos = md_text.index("## Task 2: Attach a Bucket Policy")
        assert task1_pos < task2_pos
        # Both Task 1 screenshots appear under the single Task 1 heading,
        # not split across two headings.
        assert md_text.count("## Task 1: Create the Bucket") == 1

    def test_trainer_note_only_rendered_when_present(self):
        screenshots = [
            {"idx": 1, "file": "a.png", "task": "T", "step": "s", "show": "sh", "note": ""},
            {"idx": 2, "file": "b.png", "task": "T", "step": "s", "show": "sh", "note": "Zoom in"},
        ]
        import tempfile, os
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "guide.md")
            write_screenshot_guide(screenshots, out)
            text = open(out, encoding="utf-8").read()
        assert text.count("**Trainer note:**") == 1
        assert "Zoom in" in text
