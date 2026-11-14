"""
test_generate_sitemap.py

Covers:
  - default (backfill) mode adds missing URLs without touching existing
    entries' lastmod/priority
  - --rebuild wipes and rebuilds from scratch (an entry not derivable
    from disk scan again disappears)
  - notes are scanned in both modes (previously commented out — now active)
"""

import json
import sys

import pytest


@pytest.fixture
def sitemap_env(tmp_path, monkeypatch):
    notes_dir = tmp_path / "notes"
    quiz_dir  = tmp_path / "quiz"
    notes_dir.mkdir()
    quiz_dir.mkdir()

    import generate_sitemap as gs
    import utils.sitemap as sitemap_utils

    monkeypatch.setattr(gs, "NOTES_DIR", str(notes_dir))
    monkeypatch.setattr(gs, "QUIZ_DIR", str(quiz_dir))
    monkeypatch.setattr(sitemap_utils, "SITEMAP_FILE", str(tmp_path / "sitemap.xml"))

    return gs, notes_dir, quiz_dir, sitemap_utils


def run_main(gs, monkeypatch, rebuild=False):
    argv = ["generate_sitemap.py"]
    if rebuild:
        argv.append("--rebuild")
    monkeypatch.setattr(sys, "argv", argv)
    gs.main()


def test_backfill_adds_missing_without_wiping_existing(sitemap_env, monkeypatch):
    gs, notes_dir, quiz_dir, sitemap_utils = sitemap_env

    # Seed with an entry that a scan of disk would NOT recreate (e.g. a
    # manually-added page, or one added by a script this test doesn't run)
    sitemap_utils.write_sitemap([
        {"loc": "https://namrata2709.github.io/ResourcesV2/labs.html",
         "lastmod": "2020-01-01", "changefreq": "yearly", "priority": "0.3"}
    ])

    (quiz_dir / "vpc-basics.json").write_text(
        json.dumps({"title": "VPC Basics", "topic": "VPC"}), encoding="utf-8"
    )

    run_main(gs, monkeypatch, rebuild=False)

    urls = sitemap_utils.load_sitemap()
    locs = {u["loc"] for u in urls}
    assert "https://namrata2709.github.io/ResourcesV2/labs.html" in locs, \
        "backfill mode must not wipe an entry it didn't itself generate"
    assert any("vpc-basics" in loc for loc in locs)

    # The pre-seeded entry's original lastmod should be untouched
    seeded = next(u for u in urls if u["loc"].endswith("labs.html"))
    assert seeded["lastmod"] == "2020-01-01"


def test_rebuild_drops_entries_not_derivable_from_disk(sitemap_env, monkeypatch):
    gs, notes_dir, quiz_dir, sitemap_utils = sitemap_env

    sitemap_utils.write_sitemap([
        {"loc": "https://namrata2709.github.io/ResourcesV2/labs.html",
         "lastmod": "2020-01-01", "changefreq": "yearly", "priority": "0.3"}
    ])

    run_main(gs, monkeypatch, rebuild=True)

    urls = sitemap_utils.load_sitemap()
    locs = {u["loc"] for u in urls}
    assert "https://namrata2709.github.io/ResourcesV2/labs.html" not in locs, \
        "--rebuild should only contain what disk scan produces"


def test_notes_are_scanned_in_default_mode(sitemap_env, monkeypatch):
    gs, notes_dir, quiz_dir, sitemap_utils = sitemap_env

    folder = notes_dir / "aws-ec2-fundamentals"
    folder.mkdir()
    (folder / "notes.html").write_text("<html></html>", encoding="utf-8")

    run_main(gs, monkeypatch, rebuild=False)

    urls = sitemap_utils.load_sitemap()
    assert any("aws-ec2-fundamentals" in u["loc"] for u in urls), \
        "notes scanning should be active (previously commented out)"


# ── T5-2 (2026-07-26): clean-path URL shapes, not the old .html/query-string ones ──

def test_main_pages_use_clean_paths_not_html_extensions(sitemap_env, monkeypatch):
    gs, notes_dir, quiz_dir, sitemap_utils = sitemap_env
    run_main(gs, monkeypatch, rebuild=False)

    urls = sitemap_utils.load_sitemap()
    locs = {u["loc"] for u in urls}
    assert any(loc.rstrip("/").endswith("/notes-index") for loc in locs)
    assert any(loc.rstrip("/").endswith("/quiz-index") for loc in locs)
    assert not any("notes-index.html" in loc or "quiz-index.html" in loc for loc in locs), \
        "old .html main-page URLs must not be emitted anymore"


def test_notes_html_and_lab_html_both_map_to_one_deduped_notes_folder_route(sitemap_env, monkeypatch):
    gs, notes_dir, quiz_dir, sitemap_utils = sitemap_env

    folder = notes_dir / "aws-ec2-fundamentals"
    folder.mkdir()
    (folder / "notes.html").write_text("<html></html>", encoding="utf-8")
    (folder / "lab.html").write_text("<html></html>", encoding="utf-8")

    run_main(gs, monkeypatch, rebuild=False)

    urls = sitemap_utils.load_sitemap()
    matching = [u for u in urls if u["loc"].rstrip("/").endswith("/notes/aws-ec2-fundamentals")]
    assert len(matching) == 1, (
        "notes.html and lab.html both resolve to T5-3a's single /notes/:folder "
        "route -- must dedupe to exactly one sitemap entry, not two"
    )
    assert not any("data/notes" in u["loc"] for u in urls), \
        "old data/notes/<folder>/<file>.html shape must not be emitted anymore"


def test_slides_html_maps_to_slides_folder_route_separately_from_notes(sitemap_env, monkeypatch):
    gs, notes_dir, quiz_dir, sitemap_utils = sitemap_env

    folder = notes_dir / "aws-vpc-deep-dive"
    folder.mkdir()
    (folder / "notes.html").write_text("<html></html>", encoding="utf-8")
    (folder / "slides.html").write_text("<html></html>", encoding="utf-8")

    run_main(gs, monkeypatch, rebuild=False)

    urls = sitemap_utils.load_sitemap()
    locs = {u["loc"].rstrip("/") for u in urls}
    assert any(loc.endswith("/notes/aws-vpc-deep-dive") for loc in locs)
    assert any(loc.endswith("/slides/aws-vpc-deep-dive") for loc in locs), (
        "a folder with both notes.html and slides.html should get TWO distinct "
        "route entries -- T5-3a's /notes/:folder and T5-4's /slides/:folder are "
        "different routes, not the same one"
    )


def test_quiz_urls_use_clean_path_not_query_string(sitemap_env, monkeypatch):
    gs, notes_dir, quiz_dir, sitemap_utils = sitemap_env

    (quiz_dir / "vpc-basics.json").write_text(
        json.dumps({"title": "VPC Basics", "topic": "VPC"}), encoding="utf-8"
    )
    run_main(gs, monkeypatch, rebuild=False)

    urls = sitemap_utils.load_sitemap()
    locs = {u["loc"] for u in urls}
    assert any(loc.rstrip("/").endswith("/quiz/vpc-basics") for loc in locs)
    assert not any("quiz.html?quiz=" in loc for loc in locs), \
        "old quiz.html?quiz=<stem> query-string shape must not be emitted anymore"
