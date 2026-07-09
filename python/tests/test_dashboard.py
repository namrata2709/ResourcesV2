"""
test_dashboard.py

Covers the two things fixed this round:
  - cmd_notes now chains generate_notes.py -> generate_notes_index.py,
    instead of only ever calling the index step (the actual bug reported)
  - cmd_notes(slug) passes the slug through to generate_notes.py instead
    of running scan mode
  - cmd_notes stops before the index step if generate_notes.py fails
  - cmd_new_notes correctly detects/reports what's in the markdown inbox

Uses monkeypatch on dashboard.run_script rather than actually invoking
subprocess/the real scripts — these tests are about dashboard.py's own
orchestration logic, not re-testing generate_notes.py itself.
"""

import argparse
import os

import pytest

import dashboard


class FakeArgs:
    def __init__(self, slug=None, rebuild=False):
        self.slug = slug
        self.rebuild = rebuild


@pytest.fixture
def call_log(monkeypatch):
    """Replaces dashboard.run_script with a recorder instead of a real
    subprocess call, and lets each test control what it returns."""
    calls = []
    return_codes = {"default": 0}

    def fake_run_script(script_name, extra_args=None):
        calls.append((script_name, list(extra_args or [])))
        return return_codes.get(script_name, return_codes["default"])

    monkeypatch.setattr(dashboard, "run_script", fake_run_script)
    return calls, return_codes


# ── cmd_notes chains generate_notes.py -> generate_notes_index.py ──────────

def test_cmd_notes_no_slug_calls_scan_then_index(call_log):
    calls, _ = call_log
    dashboard.cmd_notes(FakeArgs())

    assert calls[0][0] == "generate_notes.py"
    assert calls[0][1] == []          # no args = scan mode
    assert calls[1][0] == "generate_notes_index.py"


def test_cmd_notes_with_slug_passes_it_through(call_log):
    calls, _ = call_log
    dashboard.cmd_notes(FakeArgs(slug="ec2-basics"))

    assert calls[0] == ("generate_notes.py", ["ec2-basics"])
    assert calls[1][0] == "generate_notes_index.py"


def test_cmd_notes_rebuild_flag_passed_to_index_step_only(call_log):
    calls, _ = call_log
    dashboard.cmd_notes(FakeArgs(rebuild=True))

    assert calls[0] == ("generate_notes.py", [])   # generate_notes.py has no --rebuild concept
    assert calls[1] == ("generate_notes_index.py", ["--rebuild"])


def test_cmd_notes_stops_before_index_step_if_scan_fails(call_log):
    calls, codes = call_log
    codes["generate_notes.py"] = 1   # simulate a conversion failure

    rc = dashboard.cmd_notes(FakeArgs())

    assert rc == 1
    assert len(calls) == 1, "generate_notes_index.py should NOT run after a failed conversion step"
    assert calls[0][0] == "generate_notes.py"


# ── cmd_all still chains notes -> quiz -> sitemap correctly ─────────────────

def test_cmd_all_runs_all_steps_in_order(call_log):
    calls, _ = call_log
    args = FakeArgs()
    dashboard.cmd_all(args)

    script_order = [c[0] for c in calls]
    assert script_order == [
        "generate_notes.py", "generate_notes_index.py",
        "generate_quiz_index.py",
        "generate_sitemap.py",
        "audit_content.py",
    ]


def test_cmd_all_stops_if_notes_step_fails(call_log):
    calls, codes = call_log
    codes["generate_notes.py"] = 1

    rc = dashboard.cmd_all(FakeArgs())

    assert rc == 1
    assert "generate_quiz_index.py" not in [c[0] for c in calls]
    assert "generate_sitemap.py" not in [c[0] for c in calls]


# ── cmd_new_notes inbox detection ───────────────────────────────────────────

def test_new_notes_detects_pending_files(tmp_path, monkeypatch, call_log):
    monkeypatch.setattr(dashboard, "MARKDOWN_INBOX", str(tmp_path))
    (tmp_path / "aws-ec2-basics.md").write_text("---\ntitle: x\n---\n# x")
    (tmp_path / "dsa-linked-list.md").write_text("---\ntitle: y\n---\n# y")
    (tmp_path / "notes.txt").write_text("should be ignored")   # wrong extension
    (tmp_path / "readme.md").write_text("wrong prefix")         # no aws-/dsa- prefix

    dashboard.cmd_new_notes(FakeArgs())

    calls, _ = call_log
    assert calls[0][0] == "generate_notes.py"
    assert calls[1][0] == "generate_notes_index.py"


def test_new_notes_handles_empty_inbox_without_crashing(tmp_path, monkeypatch, call_log):
    monkeypatch.setattr(dashboard, "MARKDOWN_INBOX", str(tmp_path))
    rc = dashboard.cmd_new_notes(FakeArgs())
    assert rc == 0


def test_new_notes_handles_missing_inbox_folder_without_crashing(tmp_path, monkeypatch, call_log):
    monkeypatch.setattr(dashboard, "MARKDOWN_INBOX", str(tmp_path / "does-not-exist"))
    rc = dashboard.cmd_new_notes(FakeArgs())
    assert rc == 0


def test_new_notes_stops_before_index_if_conversion_fails(tmp_path, monkeypatch, call_log):
    monkeypatch.setattr(dashboard, "MARKDOWN_INBOX", str(tmp_path))
    calls, codes = call_log
    codes["generate_notes.py"] = 1

    rc = dashboard.cmd_new_notes(FakeArgs())

    assert rc == 1
    assert len(calls) == 1
