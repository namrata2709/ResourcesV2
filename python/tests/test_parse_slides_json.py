"""
test_parse_slides_json.py

T5-2 (2026-07-26): parse_slides_body() already returns a fully
structured per-slide list in memory -- this covers the one addition
this ticket makes, write_slides_json(), persisting that list to
json/slides.json for the React Slides page (T5-4) to consume, without
changing parse_slides_body()'s own structured output at all.
"""

import json

from utils.parse_slides import parse_slides_body, write_slides_json

SAMPLE_DECK = """
[slide type="title"]
# Welcome to EC2

Some intro text.
[/slide]
[notes]
Say hello and introduce the topic.
[/notes]

[slide type="concept"]
EC2 provides resizable compute capacity.
[/slide]

[slide type="engage"]
[poll]
What's your experience level with EC2?
A) Beginner
B) Intermediate
C) Advanced
[/poll]
[/slide]
"""


class TestWriteSlidesJson:
    def test_writes_json_file_matching_parse_slides_body_output(self, tmp_path):
        slides = parse_slides_body(SAMPLE_DECK)
        write_slides_json(slides, str(tmp_path))

        out_path = tmp_path / "json" / "slides.json"
        assert out_path.exists()

        data = json.loads(out_path.read_text(encoding="utf-8"))
        assert "slides" in data
        assert data["slides"] == slides  # byte-for-byte the same structure, just persisted

    def test_preserves_per_slide_structure_including_notes_and_engage(self, tmp_path):
        slides = parse_slides_body(SAMPLE_DECK)
        write_slides_json(slides, str(tmp_path))
        data = json.loads((tmp_path / "json" / "slides.json").read_text(encoding="utf-8"))

        title_slide = data["slides"][0]
        assert title_slide["type"] == "title"
        assert title_slide["notes_html"] is not None
        assert "hello" in title_slide["notes_html"]

        engage_slide = data["slides"][2]
        assert engage_slide["type"] == "engage"
        assert engage_slide["engage"]["kind"] == "poll"
        assert len(engage_slide["engage"]["options"]) == 3

    def test_creates_json_subdir_if_missing(self, tmp_path):
        assert not (tmp_path / "json").exists()
        write_slides_json(parse_slides_body(SAMPLE_DECK), str(tmp_path))
        assert (tmp_path / "json").is_dir()

    def test_empty_slide_list_still_writes_a_valid_file(self, tmp_path):
        write_slides_json([], str(tmp_path))
        data = json.loads((tmp_path / "json" / "slides.json").read_text(encoding="utf-8"))
        assert data == {"slides": []}
