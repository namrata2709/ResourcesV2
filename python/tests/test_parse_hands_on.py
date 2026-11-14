"""
test_parse_hands_on.py

T5-2 (2026-07-26): parse_hands_on() already built a structured `projects`
list before rendering to HTML -- this covers the one addition this
ticket makes, the json/hands-on.json side effect, without changing the
existing HTML-rendering behavior at all.
"""

import json

from utils.parse_hands_on import parse_hands_on, parse_project_block

SAMPLE_BODY = """
Some intro prose.

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
title: Project 2: Attach an EBS Volume
step: Navigate to the Volumes page
[/project]
[/hands-on]

Some trailing prose.
"""


class TestParseProjectBlock:
    def test_missing_title_returns_none(self, capsys):
        assert parse_project_block("objective: no title here\n", 1) is None
        assert "missing 'title'" in capsys.readouterr().out

    def test_parses_steps_and_screenshots_in_order(self):
        block = (
            "title: T\n"
            "step: First step\n"
            "screenshot: shot.png | What must be visible\n"
            "step: Second step\n"
        )
        p = parse_project_block(block, 1)
        assert [s["type"] for s in p["steps"]] == ["step", "screenshot", "step"]
        assert p["steps"][1] == {
            "type": "screenshot", "filename": "shot.png", "caption": "What must be visible"
        }

    def test_screenshot_without_caption_pipe(self):
        block = "title: T\nscreenshot: shot.png\n"
        p = parse_project_block(block, 1)
        assert p["steps"][0] == {"type": "screenshot", "filename": "shot.png", "caption": ""}

    def test_prereqs_split_on_pipe(self):
        block = "title: T\nprereqs: AWS account | EC2 basics | IAM basics\n"
        p = parse_project_block(block, 1)
        assert p["prereqs"] == ["AWS account", "EC2 basics", "IAM basics"]

    def test_id_matches_the_given_index(self):
        p = parse_project_block("title: T\n", 7)
        assert p["id"] == 7


class TestParseHandsOnJsonSideEffect:
    def test_no_hands_on_block_writes_nothing(self, tmp_path):
        body, html = parse_hands_on("Just prose, no hands-on block.", str(tmp_path))
        assert html == ""
        assert not (tmp_path / "json" / "hands-on.json").exists()

    def test_writes_json_matching_the_structured_projects_list(self, tmp_path):
        remaining, html = parse_hands_on(SAMPLE_BODY, str(tmp_path))

        out_path = tmp_path / "json" / "hands-on.json"
        assert out_path.exists()
        data = json.loads(out_path.read_text(encoding="utf-8"))
        assert len(data["projects"]) == 2
        assert data["projects"][0]["title"] == "Project 1: Launch an EC2 Instance"
        assert data["projects"][0]["prereqs"] == ["AWS account", "EC2 basics"]
        assert data["projects"][1]["title"] == "Project 2: Attach an EBS Volume"

        # [hands-on] block stripped from the returned body; surrounding
        # prose survives untouched.
        assert "[hands-on]" not in remaining
        assert "Some intro prose." in remaining
        assert "Some trailing prose." in remaining

        # HTML side is unaffected by the JSON addition -- still real
        # rendered project HTML, same as before this ticket.
        assert '<details class="project-block" open>' in html
        assert "Launch an EC2 Instance" in html

    def test_json_projects_list_is_exactly_the_list_html_was_rendered_from(self, tmp_path):
        """The whole point of this addition: the JSON isn't a second,
        independently-derived representation -- it's the same in-memory
        `projects` list build_hands_on_html() already rendered from."""
        remaining, html = parse_hands_on(SAMPLE_BODY, str(tmp_path))
        data = json.loads((tmp_path / "json" / "hands-on.json").read_text(encoding="utf-8"))

        for project in data["projects"]:
            assert project["title"] in html
            for step in project["steps"]:
                if step["type"] == "step":
                    assert step["text"] in html
                elif step["type"] == "screenshot":
                    assert step["filename"] in html

    def test_creates_json_subdir_if_missing(self, tmp_path):
        assert not (tmp_path / "json").exists()
        parse_hands_on(SAMPLE_BODY, str(tmp_path))
        assert (tmp_path / "json").is_dir()

    def test_all_projects_skipped_writes_no_json(self, tmp_path):
        """A [hands-on] block whose only [project] is malformed (missing
        title) should behave like there was no hands-on content at all --
        no empty json/hands-on.json left behind."""
        body = "[hands-on]\n[project]\nobjective: no title\n[/project]\n[/hands-on]\n"
        _, html = parse_hands_on(body, str(tmp_path))
        assert html == ""
        assert not (tmp_path / "json" / "hands-on.json").exists()

    def test_default_output_dir_does_not_crash_when_no_projects(self):
        """output_dir defaults to '.' -- confirm the no-op (empty body)
        path never touches the filesystem, so the default is safe to
        call without an explicit output_dir."""
        body, html = parse_hands_on("no hands-on block here")
        assert html == ""
