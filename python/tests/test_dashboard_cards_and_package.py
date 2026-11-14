"""
test_dashboard_cards_and_package.py

Covers two additions from this audit:
  - `dashboard cards` — wires generate_dashboard_cards.py into dashboard.py
    for the first time (it was real and confirmed working, but had no
    subcommand at all before this).
  - `dashboard package` — wires the new package_for_claude.py in, for
    building a lean repo zip to share in a Claude chat.

Follows test_dashboard.py's existing style: monkeypatch the wrapper
function rather than invoking a real subprocess/module.
"""

import os

import pytest

import dashboard

class FakeArgs:
    def __init__(self, output=None, no_minify=False, keep_binaries=False, strip_dead_code=False,
                 exclude_file=None):
        self.output = output
        self.no_minify = no_minify
        self.keep_binaries = keep_binaries
        self.strip_dead_code = strip_dead_code
        self.exclude_file = exclude_file if exclude_file is not None else []

# ── dashboard cards ─────────────────────────────────────────────────────

def test_cmd_cards_runs_generate_dashboard_cards_script(monkeypatch):
    calls = []
    monkeypatch.setattr(dashboard, "run_script",
                         lambda script, extra_args=None: calls.append((script, list(extra_args or []))) or 0)

    rc = dashboard.cmd_cards(FakeArgs())

    assert rc == 0
    assert calls == [("generate_dashboard_cards.py", [])]

def test_cmd_cards_propagates_a_real_failure(monkeypatch):
    monkeypatch.setattr(dashboard, "run_script", lambda script, extra_args=None: 1)
    assert dashboard.cmd_cards(FakeArgs()) == 1

# ── dashboard package ───────────────────────────────────────────────────

class FakeReport:
    """Mirrors package_for_claude.PackageReport's fields the printer reads."""
    files_copied = 12
    files_minified = 8
    files_json_compacted = 2
    files_skipped_binary = 3
    bytes_before = 2_000_000
    bytes_after = 1_500_000

@pytest.fixture
def fake_package_for_claude(monkeypatch, tmp_path):
    """
    Stands in for the real package_for_claude module: `pfc.package(...)`
    just writes a small real zip (so os.path.getsize works) and returns a
    FakeReport, instead of actually walking/minifying the whole repo.
    """
    import sys
    import types
    import zipfile

    calls = []
    fake_module = types.ModuleType("package_for_claude")

    def fake_package(output, **kwargs):
        calls.append((output, kwargs))
        with zipfile.ZipFile(output, "w") as zf:
            zf.writestr("placeholder.txt", "fake package contents")
        return FakeReport()

    fake_module.package = fake_package
    monkeypatch.setitem(sys.modules, "package_for_claude", fake_module)
    return calls

def test_cmd_package_uses_default_output_path_in_repo_root(fake_package_for_claude, monkeypatch, tmp_path):
    monkeypatch.setattr(dashboard, "REPO_ROOT", str(tmp_path))

    rc = dashboard.cmd_package(FakeArgs())

    assert rc == 0
    assert len(fake_package_for_claude) == 1
    output_path, kwargs = fake_package_for_claude[0]
    assert str(output_path) == os.path.join(str(tmp_path), "ResourcesV2-lean.zip")
    assert kwargs == {"minify": True, "keep_binaries": False, "strip_dead_code": False,
                       "extra_exclude_files": set()}

def test_cmd_package_respects_custom_output_path(fake_package_for_claude, tmp_path):
    custom = str(tmp_path / "my-export.zip")
    rc = dashboard.cmd_package(FakeArgs(output=custom))

    assert rc == 0
    output_path, _kwargs = fake_package_for_claude[0]
    assert str(output_path) == custom

def test_cmd_package_flags_map_to_package_kwargs(fake_package_for_claude, tmp_path):
    dashboard.cmd_package(FakeArgs(
        output=str(tmp_path / "out.zip"),
        no_minify=True,
        keep_binaries=True,
        strip_dead_code=True,
    ))

    _output_path, kwargs = fake_package_for_claude[0]
    assert kwargs == {"minify": False, "keep_binaries": True, "strip_dead_code": True,
                       "extra_exclude_files": set()}

def test_cmd_package_exclude_file_maps_to_extra_exclude_files_kwarg(fake_package_for_claude, tmp_path):
    """DX-5: --exclude-file (repeatable) now threads through to
    package_for_claude.package()'s extra_exclude_files, matching what the
    standalone package_for_claude.py CLI has always supported."""
    dashboard.cmd_package(FakeArgs(
        output=str(tmp_path / "out.zip"),
        exclude_file=["notebook-buddy-docs/manual-test-case-log.xlsx", "web/dist/stale.js"],
    ))

    _output_path, kwargs = fake_package_for_claude[0]
    assert kwargs["extra_exclude_files"] == {
        "notebook-buddy-docs/manual-test-case-log.xlsx", "web/dist/stale.js",
    }

def test_cmd_package_prints_a_size_report(fake_package_for_claude, tmp_path, capsys):
    dashboard.cmd_package(FakeArgs(output=str(tmp_path / "out.zip")))

    out = capsys.readouterr().out
    assert "Final zip:" in out
    assert "minified (text):    8" in out
    assert "compacted (JSON):   2" in out
