"""
test_parse_glossary.py — new coverage for utils/parse_glossary.py.

See test_parse_checklist.py's module docstring for why this file exists —
same "previously zero coverage" gap, same repeatable pattern.

Run: dashboard test -k parse_glossary   (from python/)
"""

import json

from utils.parse_glossary import parse_glossary, parse_glossary_block


def test_single_term_written_to_json(tmp_path):
    body = """
[glossary]
t: Idempotent
d: An operation that has the same effect no matter how many times it runs.
e: Calling PUT on the same S3 key twice with the same body.
[/glossary]
"""
    remaining = parse_glossary(body, str(tmp_path))

    out_file = tmp_path / "json" / "glossary.json"
    data = json.loads(out_file.read_text(encoding="utf-8"))

    assert len(data["terms"]) == 1
    term = data["terms"][0]
    assert term["term"] == "Idempotent"
    assert term["definition"].startswith("An operation")
    assert term["example"].startswith("Calling PUT")
    assert "[glossary]" not in remaining


def test_multiple_terms_preserve_order(tmp_path):
    body = """
[glossary]
t: AZ
d: Availability Zone
e: us-east-1a
[/glossary]

[glossary]
t: Region
d: A geographic area with multiple AZs
e: us-east-1
[/glossary]
"""
    parse_glossary(body, str(tmp_path))
    data = json.loads((tmp_path / "json" / "glossary.json").read_text(encoding="utf-8"))

    assert [t["term"] for t in data["terms"]] == ["AZ", "Region"]


def test_block_missing_required_field_is_skipped(tmp_path, capsys):
    body = """
[glossary]
t: Incomplete
d: Missing the example field
[/glossary]
"""
    parse_glossary(body, str(tmp_path))
    data = json.loads((tmp_path / "json" / "glossary.json").read_text(encoding="utf-8"))

    assert data["terms"] == []
    assert "missing field: 'e'" in capsys.readouterr().out.lower()


def test_no_glossary_blocks_returns_body_unchanged_and_writes_nothing(tmp_path):
    body = "No glossary markers in this note at all."
    remaining = parse_glossary(body, str(tmp_path))

    assert remaining == body
    assert not (tmp_path / "json" / "glossary.json").exists()


def test_value_containing_a_colon_is_preserved_after_first_split():
    # partition(":") splits on the FIRST colon only — a definition that
    # itself contains ":" (e.g. "IAM: Identity and Access Management")
    # must not be truncated.
    result = parse_glossary_block(
        "t: IAM\nd: Identity and Access Management: AWS's permissions system\ne: Attaching a policy to a role",
        idx=1,
    )
    assert result["definition"] == "Identity and Access Management: AWS's permissions system"
