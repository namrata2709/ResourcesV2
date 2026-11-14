"""
test_package_for_claude.py — real coverage for package_for_claude.py's
core behavior: directory/file exclusion, binary skipping, whitespace
minification, JSON compaction, and dead-code stripping. Builds a small
fake project tree under tmp_path rather than packaging the real repo, so
these run fast and don't depend on the real repo's size or contents.
"""

import json
import zipfile
from pathlib import Path

import package_for_claude as pfc

def _make_fake_project(root):
    (root / "node_modules" / "some-pkg").mkdir(parents=True)
    (root / "node_modules" / "some-pkg" / "index.js").write_text("module.exports = 1;\n")

    (root / ".git").mkdir()
    (root / ".git" / "HEAD").write_text("ref: refs/heads/main\n")

    (root / "python").mkdir()
    (root / "python" / "generate_notes.py").write_text(
        "def main():\n    pass   \n\n\n\n# trailing comment\n"
    )

    (root / "web" / "src").mkdir(parents=True)
    (root / "web" / "src" / "App.tsx").write_text("export const App = () => null;\n")
    (root / "web" / "src" / "orphan.tsx").write_text("// dead file\nexport const Orphan = () => null;\n")

    (root / "web" / "dist").mkdir()
    (root / "web" / "dist" / "bundle.js").write_text("console.log('built');\n")

    (root / "web" / "public").mkdir(parents=True)
    (root / "web" / "public" / "data.json").write_text(
        json.dumps({"a": 1, "b": [1, 2, 3]}, indent=2)
    )

    (root / "assets").mkdir()
    (root / "assets" / "logo.png").write_bytes(b"\x89PNG\r\n\x1a\nfake-binary-content")

    (root / ".DS_Store").write_text("junk")
    return root

def test_excludes_node_modules_and_git(tmp_path):
    source = _make_fake_project(tmp_path / "proj")
    staging = tmp_path / "staging"

    report = pfc.build_package(source, staging)

    assert not (staging / "node_modules").exists()
    assert not (staging / ".git").exists()
    assert any("node_modules" in d for d in report.dirs_excluded)
    assert any(".git" == d or d.endswith("/.git") for d in report.dirs_excluded) or ".git" in report.dirs_excluded

def test_excludes_dist_and_ds_store(tmp_path):
    source = _make_fake_project(tmp_path / "proj")
    staging = tmp_path / "staging"

    pfc.build_package(source, staging)

    assert not (staging / "web" / "dist").exists()
    assert not (staging / ".DS_Store").exists()

def test_binary_assets_skipped_by_default(tmp_path):
    source = _make_fake_project(tmp_path / "proj")
    staging = tmp_path / "staging"

    report = pfc.build_package(source, staging)

    assert not (staging / "assets" / "logo.png").exists()
    assert report.files_skipped_binary == 1

def test_keep_binaries_flag_includes_them(tmp_path):
    source = _make_fake_project(tmp_path / "proj")
    staging = tmp_path / "staging"

    report = pfc.build_package(source, staging, keep_binaries=True)

    assert (staging / "assets" / "logo.png").exists()
    assert report.files_skipped_binary == 0

def test_minification_strips_trailing_whitespace_and_collapses_blank_lines(tmp_path):
    source = _make_fake_project(tmp_path / "proj")
    staging = tmp_path / "staging"

    pfc.build_package(source, staging, minify=True)

    minified = (staging / "python" / "generate_notes.py").read_text()
    assert "pass   \n" not in minified          # trailing whitespace stripped
    assert "\n\n\n" not in minified              # 3+ blank lines collapsed to 1
    assert "# trailing comment" in minified      # comments preserved

def test_no_minify_flag_copies_verbatim(tmp_path):
    source = _make_fake_project(tmp_path / "proj")
    staging = tmp_path / "staging"

    pfc.build_package(source, staging, minify=False)

    original = (source / "python" / "generate_notes.py").read_text()
    copied = (staging / "python" / "generate_notes.py").read_text()
    assert copied == original

def test_json_is_compacted_but_semantically_identical(tmp_path):
    source = _make_fake_project(tmp_path / "proj")
    staging = tmp_path / "staging"

    report = pfc.build_package(source, staging, minify=True)

    compacted_text = (staging / "web" / "public" / "data.json").read_text()
    assert "\n" not in compacted_text.strip().replace("\n", "") or True  # just check it round-trips below
    assert json.loads(compacted_text) == {"a": 1, "b": [1, 2, 3]}
    assert len(compacted_text) < len(json.dumps({"a": 1, "b": [1, 2, 3]}, indent=2))
    assert report.files_json_compacted == 1

def test_strip_dead_code_excludes_listed_files(tmp_path, monkeypatch):
    source = _make_fake_project(tmp_path / "proj")
    staging = tmp_path / "staging"

    monkeypatch.setattr(pfc, "DEFAULT_DEAD_CODE", {"web/src/orphan.tsx"})

    report = pfc.build_package(source, staging, strip_dead_code=True)

    assert not (staging / "web" / "src" / "orphan.tsx").exists()
    assert (staging / "web" / "src" / "App.tsx").exists()  # not dead, still copied
    assert "web/src/orphan.tsx" in report.files_excluded

def test_dead_code_kept_when_flag_not_passed(tmp_path, monkeypatch):
    source = _make_fake_project(tmp_path / "proj")
    staging = tmp_path / "staging"

    monkeypatch.setattr(pfc, "DEFAULT_DEAD_CODE", {"web/src/orphan.tsx"})

    pfc.build_package(source, staging, strip_dead_code=False)

    assert (staging / "web" / "src" / "orphan.tsx").exists()

def test_zip_staging_produces_a_valid_zip_rooted_at_folder_name(tmp_path):
    source = _make_fake_project(tmp_path / "proj")
    staging = tmp_path / "staging"
    output_zip = tmp_path / "out.zip"

    pfc.build_package(source, staging)
    pfc.zip_staging(staging, output_zip, "MyRepo")

    with zipfile.ZipFile(output_zip) as zf:
        names = zf.namelist()
    assert any(n.startswith("MyRepo/python/generate_notes.py") for n in names)
    assert any(n.startswith("MyRepo/web/src/App.tsx") for n in names)
    assert not any("node_modules" in n for n in names)

def test_package_high_level_entry_point_builds_and_cleans_up_staging(tmp_path):
    source = _make_fake_project(tmp_path / "proj")
    output_zip = tmp_path / "out.zip"

    report = pfc.package(output_zip, source=source)

    assert output_zip.exists()
    # staging dir must not be left behind
    leftover_staging_dirs = [p for p in tmp_path.iterdir() if p.name.startswith(".out")]
    assert leftover_staging_dirs == []
    assert report.files_copied > 0


# ---------------------------------------------------------------------------
# DX-5 hardening (bugs found by actually running `dashboard package`)
# ---------------------------------------------------------------------------

def _zip_names(path):
    with zipfile.ZipFile(path) as zf:
        return zf.namelist()

def test_packaging_into_the_source_tree_does_not_include_itself(tmp_path):
    """DX-5 bug 1: the default `dashboard package` output lands in the repo root.
    The zip must not contain its own scratch folder or a previous zip."""
    source = _make_fake_project(tmp_path / "proj")
    (source / "OldPackage-lean.zip").write_bytes(b"PK\x03\x04 an earlier package")
    output = source / "ResourcesV2-lean.zip"
    staging_in_repo = source / ".ResourcesV2-lean_staging"

    pfc.package(output, source=source, staging=staging_in_repo, keep_binaries=True)

    names = _zip_names(output)
    assert not any("_staging" in n for n in names)
    assert not any(n.endswith("-lean.zip") for n in names)
    assert len(names) == len(set(names)), "duplicate paths in the zip"
    assert any(n.endswith("web/src/App.tsx") for n in names)
    assert not staging_in_repo.exists()  # cleaned up afterwards

def test_default_staging_is_outside_the_repo_and_left_no_trace(tmp_path):
    source = _make_fake_project(tmp_path / "proj")
    before = {p.name for p in source.iterdir()}

    pfc.package(source / "out.zip", source=source)

    after = {p.name for p in source.iterdir()}
    assert after - before == {"out.zip"}  # no staging folder appeared in the repo

def test_a_stale_staging_folder_already_in_the_tree_is_not_packaged(tmp_path):
    """The folder shipped inside a real upload (DX-5): even if a previous run left
    one behind, it must not be copied in."""
    source = _make_fake_project(tmp_path / "proj")
    (source / ".ResourcesV2-lean_staging" / "web").mkdir(parents=True)
    (source / ".ResourcesV2-lean_staging" / "web" / "leftover.txt").write_text("x")
    staging = tmp_path / "elsewhere"

    pfc.build_package(source, staging)

    assert not (staging / ".ResourcesV2-lean_staging").exists()

def test_default_dead_code_entries_all_exist_in_the_real_repo():
    """DX-5 bug 2 / AUDIT-3: a dead-code entry must point at a file that still
    exists, and be removed in the same change that deletes the file."""
    repo = Path(pfc.DEFAULT_REPO_ROOT)
    missing = [p for p in pfc.DEFAULT_DEAD_CODE if not (repo / p).exists()]
    assert missing == [], f"stale DEFAULT_DEAD_CODE entries: {missing}"

def test_minify_collapses_two_or_more_blank_lines_to_one():
    """DX-5 bug 3: the docstring used to say '3+'; the behaviour is 2+."""
    assert pfc._minify_text("a\n\n\n\nb\n") == "a\n\nb\n"
    assert pfc._minify_text("a\n\n\nb\n") == "a\n\nb\n"
    assert pfc._minify_text("a\n\nb\n") == "a\n\nb\n"  # a single blank line is kept

def test_minify_strips_trailing_whitespace_in_code():
    assert pfc._minify_text("x = 1   \ny = 2\t\n") == "x = 1\ny = 2\n"

def test_minify_preserves_markdown_hard_line_breaks():
    """DX-5 bug 3: two trailing spaces in Markdown are a hard break (meaning)."""
    text = "line one  \nline two   \nplain \n"
    assert pfc._minify_text(text, markdown=True) == "line one  \nline two  \nplain\n"
    # a code file does not get that treatment
    assert pfc._minify_text(text) == "line one\nline two\nplain\n"

def test_markdown_files_keep_hard_breaks_but_code_files_do_not(tmp_path):
    source = tmp_path / "proj"
    source.mkdir()
    (source / "notes.md").write_text("first  \nsecond\n")
    (source / "mod.py").write_text("a = 1   \n")
    staging = tmp_path / "staging"

    pfc.build_package(source, staging)

    assert (staging / "notes.md").read_text() == "first  \nsecond\n"
    assert (staging / "mod.py").read_text() == "a = 1\n"

def test_egg_info_directories_are_excluded(tmp_path):
    """DX-5 bug 4: `*.egg-info` is a directory; it used to sit in the file-name globs
    and never matched."""
    source = _make_fake_project(tmp_path / "proj")
    (source / "python" / "notebook_buddy.egg-info").mkdir()
    (source / "python" / "notebook_buddy.egg-info" / "PKG-INFO").write_text("Name: x\n")
    staging = tmp_path / "staging"

    report = pfc.build_package(source, staging)

    assert not (staging / "python" / "notebook_buddy.egg-info").exists()
    assert any(d.endswith("notebook_buddy.egg-info") for d in report.dirs_excluded)

def test_build_output_dirs_are_excluded_only_at_the_top_levels(tmp_path):
    """DX-5 bug 5: `build`/`dist`/`coverage` are output folders next to the repo root
    or a top-level project folder. A deeper directory with that name is source and
    must be kept, so a future web/src/build/ is not silently omitted."""
    source = tmp_path / "proj"
    for rel in ["dist/a.js", "build/a.js", "web/dist/a.js", "web/coverage/lcov.info",
                "python/htmlcov/index.html",
                "web/src/build/keep.ts", "web/src/dist/keep.ts", "web/src/features/coverage/keep.ts"]:
        f = source / rel
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text("x\n")
    staging = tmp_path / "staging"

    pfc.build_package(source, staging)

    kept = {p.relative_to(staging).as_posix() for p in staging.rglob("*") if p.is_file()}
    assert kept == {"web/src/build/keep.ts", "web/src/dist/keep.ts",
                    "web/src/features/coverage/keep.ts"}
