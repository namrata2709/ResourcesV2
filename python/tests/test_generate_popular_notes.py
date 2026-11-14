"""
test_generate_popular_notes.py

First real test coverage for generate_popular_notes.py -- previously
had none at all, because the script itself didn't exist (B-6). Covers:
resolving a curated folder against notes-index.json, passing through an
external entry, skipping a stale/renamed folder without failing the
whole run, skipping a malformed external entry, and de-duplicating a
folder that's curated twice.
"""

import json
import sys

import pytest


@pytest.fixture
def popular_notes_env(tmp_path, monkeypatch):
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    index_dir = tmp_path / "index"
    index_dir.mkdir()

    import generate_popular_notes as gpn

    monkeypatch.setattr(gpn, "CURATED_INPUT", str(config_dir / "popular-notes-curated.json"))
    monkeypatch.setattr(gpn, "NOTES_INDEX", str(index_dir / "notes-index.json"))
    monkeypatch.setattr(gpn, "OUTPUT", str(index_dir / "popular-notes.json"))

    return gpn, config_dir, index_dir, tmp_path


def write_curated(config_dir, entries):
    (config_dir / "popular-notes-curated.json").write_text(
        json.dumps({"entries": entries}), encoding="utf-8"
    )


def write_notes_index(index_dir, notes):
    (index_dir / "notes-index.json").write_text(
        json.dumps({"notes": notes}), encoding="utf-8"
    )


def read_output(index_dir):
    return json.loads((index_dir / "popular-notes.json").read_text(encoding="utf-8"))


def note(folder, title="Merge Sort", subject="dsa", category="Sorting"):
    return {"folder": folder, "title": title, "subject": subject, "category": category}


class TestPopularNotesBasics:
    def test_resolves_a_curated_folder_from_notes_index(self, popular_notes_env):
        gpn, config_dir, index_dir, _ = popular_notes_env
        write_curated(config_dir, [{"folder": "dsa-merge-sort"}])
        write_notes_index(index_dir, [note("dsa-merge-sort")])

        gpn.main()

        items = read_output(index_dir)["notes"]
        assert items == [{
            "folder": "dsa-merge-sort",
            "title": "Merge Sort",
            "subject": "dsa",
            "category": "Sorting",
            "url": "/notes/dsa-merge-sort",
            "internal": True,
            "curated": True,
        }]

    def test_passes_through_a_well_formed_external_entry(self, popular_notes_env):
        gpn, config_dir, index_dir, _ = popular_notes_env
        write_curated(config_dir, [
            {"title": "AWS re/Start", "url": "https://aws.amazon.com/restart/", "category": "Program"}
        ])
        write_notes_index(index_dir, [])

        gpn.main()

        items = read_output(index_dir)["notes"]
        assert items == [{
            "folder": "external-aws-re-start",
            "title": "AWS re/Start",
            "subject": "",
            "category": "Program",
            "url": "https://aws.amazon.com/restart/",
            "internal": False,
            "curated": True,
        }]

    def test_skips_a_stale_folder_without_failing_the_run(self, popular_notes_env):
        gpn, config_dir, index_dir, _ = popular_notes_env
        write_curated(config_dir, [
            {"folder": "dsa-merge-sort"},
            {"folder": "dsa-folder-that-was-deleted"},
        ])
        write_notes_index(index_dir, [note("dsa-merge-sort")])

        gpn.main()

        items = read_output(index_dir)["notes"]
        assert len(items) == 1
        assert items[0]["folder"] == "dsa-merge-sort"

    def test_skips_an_external_entry_missing_required_fields(self, popular_notes_env):
        gpn, config_dir, index_dir, _ = popular_notes_env
        write_curated(config_dir, [{"title": "No URL here"}])
        write_notes_index(index_dir, [])

        gpn.main()

        assert read_output(index_dir)["notes"] == []

    def test_deduplicates_a_folder_curated_twice(self, popular_notes_env):
        gpn, config_dir, index_dir, _ = popular_notes_env
        write_curated(config_dir, [{"folder": "dsa-merge-sort"}, {"folder": "dsa-merge-sort"}])
        write_notes_index(index_dir, [note("dsa-merge-sort")])

        gpn.main()

        assert len(read_output(index_dir)["notes"]) == 1

    def test_multiple_entries_preserve_curated_order(self, popular_notes_env):
        gpn, config_dir, index_dir, _ = popular_notes_env
        write_curated(config_dir, [{"folder": "dsa-linear-search"}, {"folder": "dsa-merge-sort"}])
        write_notes_index(index_dir, [
            note("dsa-merge-sort", title="Merge Sort"),
            note("dsa-linear-search", title="Linear Search", category="Searching"),
        ])

        gpn.main()

        items = read_output(index_dir)["notes"]
        assert [item["folder"] for item in items] == ["dsa-linear-search", "dsa-merge-sort"]


class TestPopularNotesErrorHandling:
    def test_missing_curated_file_exits_nonzero(self, popular_notes_env):
        gpn, _config_dir, index_dir, _ = popular_notes_env
        write_notes_index(index_dir, [])

        with pytest.raises(SystemExit) as exc_info:
            gpn.main()
        assert exc_info.value.code != 0

    def test_missing_notes_index_exits_nonzero(self, popular_notes_env):
        gpn, config_dir, _index_dir, _ = popular_notes_env
        write_curated(config_dir, [{"folder": "dsa-merge-sort"}])

        with pytest.raises(SystemExit) as exc_info:
            gpn.main()
        assert exc_info.value.code != 0

    def test_invalid_json_in_curated_file_exits_nonzero(self, popular_notes_env):
        gpn, config_dir, index_dir, _ = popular_notes_env
        (config_dir / "popular-notes-curated.json").write_text("{not valid json", encoding="utf-8")
        write_notes_index(index_dir, [])

        with pytest.raises(SystemExit) as exc_info:
            gpn.main()
        assert exc_info.value.code != 0

    def test_note_missing_required_field_is_skipped(self, popular_notes_env):
        gpn, config_dir, index_dir, _ = popular_notes_env
        write_curated(config_dir, [{"folder": "dsa-merge-sort"}])
        write_notes_index(index_dir, [{"folder": "dsa-merge-sort", "title": "Merge Sort"}])  # no subject/category

        gpn.main()

        assert read_output(index_dir)["notes"] == []
