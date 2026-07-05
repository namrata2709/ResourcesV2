"""
test_generate_notes_index_validation.py

Regression coverage for US-A03 (smart title generation, HTML entity
decoding) and US-A04 (validate_note() folder health checks) — the two
stories that were marked "closed" without actual pytest coverage the
first time around. This file is that missing coverage.
"""

import json
import os

import pytest

import generate_notes_index as gni


# ── US-A03: smart_title() acronym preservation ──────────────────────────────

@pytest.mark.parametrize("raw,expected", [
    ("ec2 fundamentals", "EC2 Fundamentals"),
    ("aws lambda introduction", "AWS Lambda Introduction"),
    ("s3 storage basics", "S3 Storage Basics"),
    ("vpc networking", "VPC Networking"),
    ("dynamic programming basics", "Dynamic Programming Basics"),  # no acronyms — plain title-case
    ("dsa linked list", "DSA Linked List"),
])
def test_smart_title_preserves_known_acronyms(raw, expected):
    assert gni.smart_title(raw) == expected


def test_smart_title_preserves_version_like_tokens_with_digits():
    # any_upper.isdigit() branch — tokens containing digits pass through uppercased
    result = gni.smart_title("ec2 v3 basics")
    assert "V3" in result or "v3".upper() in result.upper()


# ── US-A03: normalize_text() HTML entity decoding ───────────────────────────

def test_normalize_text_decodes_html_entities():
    assert gni.normalize_text("S3 &amp; EC2") == "S3 & EC2"
    assert gni.normalize_text("a &gt; b") == "a > b"


def test_normalize_text_strips_leading_punctuation_and_collapses_whitespace():
    assert gni.normalize_text("  -_ ec2   fundamentals  ") == "ec2 fundamentals"


def test_extract_title_uses_h1_and_applies_smart_title():
    content = "<html><body><h1>ec2 &amp; lambda basics</h1></body></html>"
    title = gni.extract_title(content)
    assert title == "EC2 & Lambda Basics"


def test_extract_title_returns_none_without_h1():
    assert gni.extract_title("<html><body><p>no heading</p></body></html>") is None


# ── US-A04: validate_note() ──────────────────────────────────────────────────

def make_full_folder(base_path):
    """A fully compliant folder — should produce zero warnings."""
    os.makedirs(base_path)
    with open(os.path.join(base_path, "notes.html"), "w", encoding="utf-8") as f:
        f.write(
            "<html><body><h1>EC2 Fundamentals</h1>"
            "<p>📅 January 1, 2026</p>"
            "<span class=\"tag\">EC2</span></body></html>"
        )
    os.makedirs(os.path.join(base_path, "images"))
    with open(os.path.join(base_path, "images", "diagram.png"), "wb") as f:
        f.write(b"fake-image-bytes")
    os.makedirs(os.path.join(base_path, "json"))
    for name in ("mcq.json", "glossary.json", "checklist.json", "interview.json"):
        with open(os.path.join(base_path, "json", name), "w", encoding="utf-8") as f:
            json.dump([], f)


def test_validate_note_clean_folder_has_no_warnings(tmp_path):
    folder = tmp_path / "aws-ec2-fundamentals"
    make_full_folder(str(folder))

    # build_note reads from gni.ROOT + folder name, so call it the way main() does:
    gni.ROOT = str(tmp_path)
    note = gni.build_note(folder.name)

    warnings = gni.validate_note(note, str(folder))
    assert warnings == [], f"expected zero warnings, got: {warnings}"


def test_validate_note_flags_missing_json_companions(tmp_path):
    folder = tmp_path / "aws-ec2-fundamentals"
    make_full_folder(str(folder))
    # Remove one required JSON file
    os.remove(os.path.join(str(folder), "json", "glossary.json"))

    gni.ROOT = str(tmp_path)
    note = gni.build_note(folder.name)
    warnings = gni.validate_note(note, str(folder))

    assert any("glossary.json" in w for w in warnings)


def test_validate_note_flags_invalid_json(tmp_path):
    folder = tmp_path / "aws-ec2-fundamentals"
    make_full_folder(str(folder))
    with open(os.path.join(str(folder), "json", "mcq.json"), "w", encoding="utf-8") as f:
        f.write("{not valid json")

    gni.ROOT = str(tmp_path)
    note = gni.build_note(folder.name)
    warnings = gni.validate_note(note, str(folder))

    assert any("mcq.json is invalid JSON" in w for w in warnings)


def test_validate_note_flags_missing_images(tmp_path):
    folder = tmp_path / "aws-ec2-fundamentals"
    make_full_folder(str(folder))
    import shutil
    shutil.rmtree(os.path.join(str(folder), "images"))

    gni.ROOT = str(tmp_path)
    note = gni.build_note(folder.name)
    warnings = gni.validate_note(note, str(folder))

    assert any("images" in w for w in warnings)


def test_validate_note_flags_missing_h1(tmp_path):
    folder = tmp_path / "aws-ec2-fundamentals"
    make_full_folder(str(folder))
    with open(os.path.join(str(folder), "notes.html"), "w", encoding="utf-8") as f:
        f.write("<html><body><p>No heading here</p></body></html>")

    gni.ROOT = str(tmp_path)
    note = gni.build_note(folder.name)
    warnings = gni.validate_note(note, str(folder))

    assert any("<h1>" in w for w in warnings)


def test_validate_note_flags_dsa_missing_companions(tmp_path):
    folder = tmp_path / "dsa-linked-lists"
    make_full_folder(str(folder))

    gni.ROOT = str(tmp_path)
    note = gni.build_note(folder.name)
    assert note["subject"] == "dsa"

    warnings = gni.validate_note(note, str(folder))
    assert any("visual-mcq.json" in w for w in warnings)
    assert any("problems.json" in w for w in warnings)


# ── Regression tests for the category-matching order bug ───────────────────
# General/Fundamentals sit early in category-icons.json and have broad
# keywords ("overview", "introduction", "fundamentals") that would
# otherwise steal matches from more specific categories appearing later
# in the file, on a first-match-wins basis.

@pytest.fixture
def category_keywords_fixture(tmp_path, monkeypatch):
    """Points detect_category() at a small, controlled category-icons.json
    shaped like the real one, so these tests don't depend on the real
    file's exact contents or path."""
    icons_path = tmp_path / "category-icons.json"
    icons_path.write_text(json.dumps({
        "default": {"icon": "📂", "keywords": []},
        "General": {"icon": "📂", "keywords": ["general", "overview", "misc"]},
        "Fundamentals": {"icon": "📚", "keywords": ["fundamentals", "introduction", "basics"]},
        "Compute": {"icon": "⚙️", "keywords": ["ec2", "compute", "lambda"]},
        "Containers": {"icon": "📦", "keywords": ["eks", "ecs", "containers", "docker"]},
        "Sorting": {"icon": "↕️", "keywords": ["sort", "sorting", "merge sort"]},
    }), encoding="utf-8")

    monkeypatch.setattr(gni, "CATEGORY_ICONS_PATH", str(icons_path))
    monkeypatch.setattr(gni, "AWS_CATEGORY_NAMES",
                         {"General", "Fundamentals", "Compute", "Containers"})
    monkeypatch.setattr(gni, "DSA_CATEGORY_NAMES", {"Sorting"})
    monkeypatch.setattr(gni, "CATEGORY_KEYWORDS", gni.load_category_keywords())


def test_specific_category_wins_over_early_fundamentals_match(category_keywords_fixture):
    # "fundamentals" (Fundamentals) and "ec2" (Compute) both appear —
    # Compute must win, not whichever sits earlier in the JSON.
    assert gni.detect_category("aws-ec2-fundamentals", "aws") == "Compute"


def test_specific_category_wins_over_early_general_match(category_keywords_fixture):
    # "overview" (General) and "eks"/"containers" (Containers) both
    # appear — Containers must win.
    assert gni.detect_category("aws-eks-containers-overview", "aws") == "Containers"


def test_genuinely_generic_folder_still_falls_back_to_general(category_keywords_fixture):
    # Sanity check the fix didn't overshoot — a folder matching nothing
    # specific should still correctly fall back to the default.
    assert gni.detect_category("aws-random-unknown-topic", "aws") == "General"


def test_dsa_specific_category_still_matches_normally(category_keywords_fixture):
    assert gni.detect_category("dsa-merge-sort", "dsa") == "Sorting"


# ── Regression test for the slides-only false-positive fix ─────────────────

def make_slides_only_folder(base_path):
    """A folder with only slides.html — no notes.html, no json/ at all.
    Matches real content like aws-introduction-to-computing."""
    os.makedirs(base_path)
    with open(os.path.join(base_path, "slides.html"), "w", encoding="utf-8") as f:
        f.write("<html><body><h1>Introduction to Computing</h1></body></html>")


def test_validate_note_slides_only_folder_not_flagged_for_notes_json(tmp_path):
    folder = tmp_path / "aws-introduction-to-computing"
    make_slides_only_folder(str(folder))

    gni.ROOT = str(tmp_path)
    note = gni.build_note(folder.name)
    warnings = gni.validate_note(note, str(folder))

    assert not any("json/" in w for w in warnings), (
        f"slides-only folder should never be checked for mcq/glossary/checklist/"
        f"interview json — got: {warnings}"
    )


def test_validate_note_slides_only_folder_not_flagged_for_images():
    """A slides-only folder shouldn't get the 'notes.html present but images
    missing' warning either, since that check is also gated on has_notes_type."""
    note = {
        "title": "Introduction to Computing",
        "files": [{"name": "Presentation", "file": "slides.html", "type": "slides", "icon": "🖥️"}],
        "tags": ["Fundamentals"],
        "hasImages": False,
        "subject": "aws",
    }
    # validate_note reads file contents from base_path for the empty/h1 checks,
    # so give it a real (if minimal) folder rather than mocking read_html_file.
    import tempfile, shutil
    tmp = tempfile.mkdtemp()
    try:
        with open(os.path.join(tmp, "slides.html"), "w", encoding="utf-8") as f:
            f.write("<html><body><h1>Introduction to Computing</h1></body></html>")
        warnings = gni.validate_note(note, tmp)
        assert not any("images" in w for w in warnings)
    finally:
        shutil.rmtree(tmp)


def test_validate_note_notes_type_folder_still_flagged_for_missing_json(tmp_path):
    """Sanity check the fix didn't overshoot — a real notes.html folder
    missing its json companions should still be flagged."""
    folder = tmp_path / "aws-ec2-fundamentals"
    os.makedirs(str(folder))
    with open(os.path.join(str(folder), "notes.html"), "w", encoding="utf-8") as f:
        f.write("<html><body><h1>EC2 Fundamentals</h1></body></html>")
    # no json/ folder at all

    gni.ROOT = str(tmp_path)
    note = gni.build_note(folder.name)
    warnings = gni.validate_note(note, str(folder))

    assert any("mcq.json" in w for w in warnings)
    assert any("glossary.json" in w for w in warnings)
    assert any("checklist.json" in w for w in warnings)
    assert any("interview.json" in w for w in warnings)
