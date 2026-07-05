"""
test_generate_notes_index.py

Covers the diff-based incremental behavior:
  - new folder -> added to index, sitemap touched
  - unchanged folder (same files/images/title) -> skipped entirely,
    old entry reused verbatim
  - files/images/title changed -> index entry refreshed, sitemap
    deliberately NOT touched for that folder
  - folder removed from disk -> removed from index AND sitemap
  - --rebuild ignores prior state, recomputes + re-touches everything
"""

import json
import os
import sys

import pytest


def make_note_folder(notes_dir, folder_name, title="EC2 Fundamentals",
                      extra_files=None):
    """Creates a minimal valid note folder with a notes.html containing
    an <h1> title, so build_note() has something real to parse."""
    folder = notes_dir / folder_name
    folder.mkdir(parents=True)
    (folder / "notes.html").write_text(
        f"<html><body><h1>{title}</h1>"
        f"<p>📅 January 1, 2026</p></body></html>",
        encoding="utf-8",
    )
    if extra_files:
        for fname in extra_files:
            (folder / fname).write_text("<html></html>", encoding="utf-8")
    return folder


@pytest.fixture
def notes_env(tmp_path, monkeypatch):
    notes_dir = tmp_path / "notes"
    index_dir = tmp_path / "index"
    notes_dir.mkdir()
    index_dir.mkdir()

    import generate_notes_index as gni
    import utils.sitemap as sitemap_utils

    monkeypatch.setattr(gni, "ROOT", str(notes_dir))
    monkeypatch.setattr(gni, "OUTPUT", str(index_dir / "notes-index.json"))
    monkeypatch.setattr(sitemap_utils, "SITEMAP_FILE", str(tmp_path / "sitemap.xml"))

    return gni, notes_dir, index_dir


def run_main(gni, monkeypatch, rebuild=False):
    argv = ["generate_notes_index.py"]
    if rebuild:
        argv.append("--rebuild")
    monkeypatch.setattr(sys, "argv", argv)
    gni.main()


def read_index(index_dir):
    return json.loads((index_dir / "notes-index.json").read_text(encoding="utf-8"))


def note_urls_in_sitemap(folder_name):
    import utils.sitemap as sitemap_utils
    urls = sitemap_utils.load_sitemap()
    return [u for u in urls if f"data/notes/{folder_name}/" in u["loc"]]


# ── New folder: added, sitemap touched ─────────────────────────────────────

def test_new_folder_added_and_sitemap_touched(notes_env, monkeypatch):
    gni, notes_dir, index_dir = notes_env
    make_note_folder(notes_dir, "aws-ec2-fundamentals")

    run_main(gni, monkeypatch)

    notes = read_index(index_dir)["notes"]
    assert len(notes) == 1
    assert notes[0]["folder"] == "aws-ec2-fundamentals"
    assert len(note_urls_in_sitemap("aws-ec2-fundamentals")) == 1


# ── Unchanged folder: fully skipped on second run ───────────────────────────

def test_unchanged_folder_skipped(notes_env, monkeypatch, capsys):
    gni, notes_dir, index_dir = notes_env
    make_note_folder(notes_dir, "aws-ec2-fundamentals")

    run_main(gni, monkeypatch)
    run_main(gni, monkeypatch)   # second run, nothing changed

    captured = capsys.readouterr()
    assert "unchanged 1" in captured.out
    assert "added 0" in captured.out
    assert "updated 0" in captured.out


# ── Format changed (new file added to folder): index updated, sitemap untouched ─

def test_format_changed_updates_index_not_sitemap(notes_env, monkeypatch):
    gni, notes_dir, index_dir = notes_env
    folder = make_note_folder(notes_dir, "aws-ec2-fundamentals")

    run_main(gni, monkeypatch)
    urls_before = note_urls_in_sitemap("aws-ec2-fundamentals")
    assert len(urls_before) == 1   # just notes.html

    # Add a lab.html — this changes the "files" list (format)
    (folder / "lab.html").write_text("<html></html>", encoding="utf-8")
    run_main(gni, monkeypatch)

    notes = read_index(index_dir)["notes"]
    file_names = {f["file"] for f in notes[0]["files"]}
    assert file_names == {"notes.html", "lab.html"}, \
        "index should reflect the new file"

    urls_after = note_urls_in_sitemap("aws-ec2-fundamentals")
    assert len(urls_after) == len(urls_before), \
        "sitemap should NOT be touched for a content-only change on an existing folder"


# ── Folder removed: dropped from index AND sitemap ──────────────────────────

def test_removed_folder_pruned_from_index_and_sitemap(notes_env, monkeypatch):
    gni, notes_dir, index_dir = notes_env
    import shutil

    make_note_folder(notes_dir, "aws-ec2-fundamentals")
    run_main(gni, monkeypatch)
    assert len(read_index(index_dir)["notes"]) == 1
    assert len(note_urls_in_sitemap("aws-ec2-fundamentals")) == 1

    shutil.rmtree(notes_dir / "aws-ec2-fundamentals")
    run_main(gni, monkeypatch)

    assert read_index(index_dir)["notes"] == []
    assert note_urls_in_sitemap("aws-ec2-fundamentals") == []


# ── --rebuild recomputes and re-touches everything, ignoring prior state ────

def test_rebuild_flag_recomputes_unconditionally(notes_env, monkeypatch, capsys):
    gni, notes_dir, index_dir = notes_env
    make_note_folder(notes_dir, "aws-ec2-fundamentals")

    run_main(gni, monkeypatch)             # normal first run
    run_main(gni, monkeypatch, rebuild=True)  # forced rebuild, same content

    captured = capsys.readouterr()
    # Under --rebuild every folder is treated as "new" (old_by_folder is
    # ignored entirely), so it should show up as "added", not "unchanged"
    assert "added 1" in captured.out
