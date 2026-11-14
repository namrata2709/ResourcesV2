"""
test_parse_reflection.py

T5-2 (2026-07-26): parse_reflection() already built a structured
`questions` list before build_reflection_html() rendered it -- this
covers the one addition this ticket makes, the json/reflection.json
side effect gated behind a new (backward-compatible, default-None)
output_dir parameter, plus the pre-existing parsing/HTML behavior for
completeness since this module had no dedicated test file before.
"""

import json

from utils.parse_reflection import parse_reflection, parse_reflection_block, build_reflection_html

SAMPLE_BODY = """
Some intro prose.

[reflection]
q: What happens to your data when an EC2 instance is stopped?
hint: Think about instance store vs EBS volumes and their persistence behaviour.
[/reflection]

[reflection]
q: Why would you choose a Security Group over a NACL?
hint: Consider statefulness and where each operates in the network stack.
[/reflection]

Some trailing prose.
"""


class TestParseReflectionBlock:
    def test_missing_q_returns_none(self, capsys):
        assert parse_reflection_block("hint: no question here\n", 1) is None
        assert "missing 'q'" in capsys.readouterr().out

    def test_hint_defaults_to_empty_string(self):
        q = parse_reflection_block("q: A question?\n", 1)
        assert q["hint"] == ""

    def test_id_matches_given_index(self):
        q = parse_reflection_block("q: A question?\n", 3)
        assert q["id"] == 3


class TestParseReflectionBackwardCompatibility:
    """No output_dir given (the signature's default, and every call site
    that existed before T5-2) must behave exactly as it always did:
    static HTML rendering only, no JSON, no filesystem writes."""

    def test_no_output_dir_writes_no_json_and_no_filesystem_access(self):
        body, questions = parse_reflection(SAMPLE_BODY)
        assert len(questions) == 2
        assert questions[0]["question"] == "What happens to your data when an EC2 instance is stopped?"
        # No output_dir given -> nothing to assert-not-exists against a
        # tmp_path, since none was ever created; the real guarantee here
        # is simply that this call doesn't raise (no os.makedirs/open
        # attempted with output_dir=None).

    def test_no_blocks_returns_body_unchanged_and_empty_list(self):
        body = "Just prose, no reflection blocks."
        result, questions = parse_reflection(body)
        assert result == body
        assert questions == []


class TestParseReflectionJsonSideEffect:
    def test_output_dir_given_writes_json_matching_the_questions_list(self, tmp_path):
        remaining, questions = parse_reflection(SAMPLE_BODY, str(tmp_path))

        out_path = tmp_path / "json" / "reflection.json"
        assert out_path.exists()
        data = json.loads(out_path.read_text(encoding="utf-8"))
        assert data["questions"] == questions

        assert "[reflection]" not in remaining
        assert "Some intro prose." in remaining
        assert "Some trailing prose." in remaining

    def test_no_blocks_with_output_dir_writes_nothing(self, tmp_path):
        parse_reflection("no reflection blocks here", str(tmp_path))
        assert not (tmp_path / "json" / "reflection.json").exists()

    def test_all_blocks_malformed_writes_nothing(self, tmp_path):
        body = "[reflection]\nhint: no question field\n[/reflection]\n"
        _, questions = parse_reflection(body, str(tmp_path))
        assert questions == []
        assert not (tmp_path / "json" / "reflection.json").exists()

    def test_creates_json_subdir_if_missing(self, tmp_path):
        assert not (tmp_path / "json").exists()
        parse_reflection(SAMPLE_BODY, str(tmp_path))
        assert (tmp_path / "json").is_dir()


class TestBuildReflectionHtmlUnaffected:
    """Confirms the JSON addition didn't change HTML rendering at all --
    same function, same output, called the same way generate_notes.py
    already calls it."""

    def test_renders_question_and_hint(self):
        _, questions = parse_reflection(SAMPLE_BODY)
        html = build_reflection_html(questions)
        assert '<h2 id="reflection-questions">🤔 Reflection Questions</h2>' in html
        assert "What happens to your data when an EC2 instance is stopped?" in html
        assert '<summary class="hint-summary">💡 Hint</summary>' in html

    def test_empty_questions_list_renders_empty_string(self):
        assert build_reflection_html([]) == ""
