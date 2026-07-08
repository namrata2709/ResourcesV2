"""
test_audit_content.py

Covers the core validation checks in audit_content.py against isolated
fixtures. Not exhaustive of all 22 categories (several are thin wrappers
around the same load_json_strict()/regex pattern already covered), but
hits one representative case per distinct code path.
"""

import json
import os

import pytest

import audit_content as ac


@pytest.fixture
def findings():
    return ac.Findings()


# ── load_json_strict / is_json_empty ────────────────────────────────────────

def test_load_json_strict_detects_syntax_error(tmp_path):
    path = tmp_path / "bad.json"
    path.write_text("{not valid json", encoding="utf-8")
    data, error = ac.load_json_strict(str(path))
    assert data is None
    assert "syntax error" in error


def test_load_json_strict_detects_duplicate_keys(tmp_path):
    path = tmp_path / "dupe.json"
    path.write_text('{"a": 1, "a": 2}', encoding="utf-8")
    data, error = ac.load_json_strict(str(path))
    assert error is not None
    assert "duplicate key" in error


def test_load_json_strict_missing_file(tmp_path):
    data, error = ac.load_json_strict(str(tmp_path / "does-not-exist.json"))
    assert data is None
    assert error == "file does not exist"


def test_is_json_empty_bare_list_and_dict():
    assert ac.is_json_empty([]) is True
    assert ac.is_json_empty({}) is True


def test_is_json_empty_wrapper_key():
    assert ac.is_json_empty({"questions": []}) is True
    assert ac.is_json_empty({"questions": [{"id": 1}]}) is False


# ── extract_ids_from_json / duplicate IDs ───────────────────────────────────

def test_extract_ids_finds_duplicate():
    data = {"questions": [{"id": 1}, {"id": 1}, {"id": 2}]}
    ids = ac.extract_ids_from_json(data)
    assert ids == [1, 1, 2]


def test_extract_ids_returns_empty_for_no_id_bearing_list():
    assert ac.extract_ids_from_json({"terms": [{"term": "x"}]}) == []


# ── audit_folder: missing images, broken links, unused images ──────────────

def make_folder(tmp_path, html_content, images=None):
    folder = tmp_path / "aws-test-folder"
    folder.mkdir()
    (folder / "notes.html").write_text(html_content, encoding="utf-8")
    if images:
        (folder / "images").mkdir()
        for img in images:
            (folder / "images" / img).write_text("fake", encoding="utf-8")
    return folder


def test_missing_image_detected(tmp_path, findings):
    folder = make_folder(tmp_path, '<html><body><img src="images/missing.webp"></body></html>')
    ac.audit_folder("aws-test-folder", str(folder), None, set(), findings)
    errors = findings.by_severity("error")
    assert any("Missing Images" in e["category"] for e in errors)


def test_broken_link_detected(tmp_path, findings):
    folder = make_folder(tmp_path, '<html><body><a href="../does-not-exist/">x</a></body></html>')
    ac.audit_folder("aws-test-folder", str(folder), None, set(), findings)
    errors = findings.by_severity("error")
    assert any("Broken Links" in e["category"] for e in errors)


def test_external_links_never_flagged(tmp_path, findings):
    folder = make_folder(tmp_path, '<html><body><a href="https://aws.amazon.com">x</a></body></html>')
    ac.audit_folder("aws-test-folder", str(folder), None, set(), findings)
    assert findings.items == []


def test_unused_image_detected(tmp_path, findings):
    folder = make_folder(tmp_path, '<html><body>no images referenced</body></html>',
                          images=["orphan.webp"])
    ac.audit_folder("aws-test-folder", str(folder), None, set(), findings)
    warnings = findings.by_severity("warning")
    assert any("Unused Images" in w["category"] for w in warnings)


def test_referenced_image_not_flagged_as_unused(tmp_path, findings):
    folder = make_folder(tmp_path, '<html><body><img src="images/used.webp"></body></html>',
                          images=["used.webp"])
    ac.audit_folder("aws-test-folder", str(folder), None, set(), findings)
    assert not any(f["category"] == "Unused Images" for f in findings.items)


def test_empty_img_src_flagged(tmp_path, findings):
    folder = make_folder(tmp_path, '<html><body><img src=""></body></html>')
    ac.audit_folder("aws-test-folder", str(folder), None, set(), findings)
    errors = findings.by_severity("error")
    assert any("Broken Image References" in e["category"] for e in errors)


def test_unrecognized_html_file_flagged_unused(tmp_path, findings):
    folder = tmp_path / "aws-test-folder"
    folder.mkdir()
    (folder / "notes.html").write_text("<html></html>", encoding="utf-8")
    (folder / "old-backup.html").write_text("<html></html>", encoding="utf-8")
    ac.audit_folder("aws-test-folder", str(folder), None, set(), findings)
    warnings = findings.by_severity("warning")
    assert any("old-backup.html" in w["message"] for w in warnings)


# ── Global checks ────────────────────────────────────────────────────────────

def test_duplicate_topics_detected(findings):
    notes = [
        {"title": "EC2 Basics", "folder": "a"},
        {"title": "EC2 Basics", "folder": "b"},
        {"title": "S3 Basics", "folder": "c"},
    ]
    ac.check_duplicate_topics(notes, findings)
    assert findings.warning_count == 1
    assert "2 folders" in findings.items[0]["message"]


def test_resource_detection_flags_unindexed_folder(findings):
    disk_folders = {"aws-a", "aws-b"}
    notes = [{"folder": "aws-a"}]  # aws-b missing from index
    ac.check_resource_detection(disk_folders, notes, [], set(), findings)
    errors = findings.by_severity("error")
    assert any(e["scope"] == "aws-b" for e in errors)


def test_related_resource_check_noop_when_field_absent(findings):
    notes = [{"folder": "a", "title": "x"}]  # no "related" key anywhere
    ac.check_related_resources(notes, findings)
    assert findings.items == []


def test_related_resource_check_flags_missing_target(findings):
    notes = [
        {"folder": "a", "title": "x", "related": ["does-not-exist"]},
        {"folder": "b", "title": "y"},
    ]
    ac.check_related_resources(notes, findings)
    assert findings.error_count == 1


# ── Build statistics ─────────────────────────────────────────────────────────

def test_build_statistics_basic_counts():
    notes = [
        {"folder": "aws-a", "subject": "aws", "category": "Compute", "readTimeMinutes": 5,
         "images": [{"file": "a.png"}], "files": [{"type": "notes"}], "title": "A"},
        {"folder": "dsa-b", "subject": "dsa", "category": "Sorting", "readTimeMinutes": 15,
         "images": [], "files": [{"type": "lab"}], "title": "B"},
    ]
    stats = ac.build_statistics(notes, quizzes=[{"title": "Q1"}])
    assert stats["total_subjects"] == 2
    assert stats["total_categories"] == 2
    assert stats["total_notes"] == 2
    assert stats["total_labs"] == 1
    assert stats["total_images"] == 1
    assert stats["total_quizzes"] == 1
    assert stats["average_reading_time"] == 10.0
    assert stats["smallest_note"] == "A"
    assert stats["largest_note"] == "B"
