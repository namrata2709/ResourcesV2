"""
test_dashboard.py

DX-3 (bottom of file): web-dev / web-build / web-preview wrappers and the
"Notebook Buddy CLI" rename.

Earlier round — covers the two things fixed:
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

import os
import subprocess

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

# ── DX-3: React app subcommands + rename ────────────────────────────────────

@pytest.fixture
def web_env(tmp_path, monkeypatch):
    """A fake web/ dir with node_modules, a fake npm on PATH, and a recorder
    standing in for subprocess.run. Returns (calls, state)."""
    web = tmp_path / "web"
    (web / "node_modules").mkdir(parents=True)
    monkeypatch.setattr(dashboard, "WEB_DIR", str(web))
    monkeypatch.setattr(dashboard.shutil, "which", lambda name: "/fake/bin/npm" if name == "npm" else None)

    calls = []
    state = {"rc": 0, "raise": None}

    def fake_run(cmd, cwd=None, **kw):
        calls.append((list(cmd), cwd))
        if state["raise"]:
            raise state["raise"]
        return subprocess.CompletedProcess(cmd, state["rc"])

    monkeypatch.setattr(dashboard.subprocess, "run", fake_run)
    return calls, state, str(web)

def test_parser_description_is_notebook_buddy_not_learning_dashboard():
    ap = dashboard.build_parser()
    assert ap.description == "Notebook Buddy CLI"
    assert "Learning Dashboard" not in dashboard.build_parser().format_help()

def test_help_lists_full_toolchain(capsys):
    dashboard.main([])
    out = capsys.readouterr().out
    for name in ("notes", "quiz", "sitemap", "cards", "package", "audit", "test",
                 "web-dev", "web-build", "web-preview"):
        assert name in out

def test_web_build_runs_npm_run_build_in_web_dir(web_env):
    calls, _, web = web_env
    rc = dashboard.main(["web-build"])
    assert rc == 0
    assert calls == [(["/fake/bin/npm", "run", "build"], web)]

def test_web_build_propagates_failure_exit_code(web_env, capsys):
    _, state, _ = web_env
    state["rc"] = 2
    rc = dashboard.main(["web-build"])
    assert rc == 2
    assert "WEB BUILD FAILED" in capsys.readouterr().out

def test_web_dev_defaults_pass_no_extra_args(web_env):
    calls, _, web = web_env
    dashboard.main(["web-dev"])
    assert calls == [(["/fake/bin/npm", "run", "dev"], web)]

def test_web_dev_passes_port_and_host_after_double_dash(web_env):
    calls, _, _ = web_env
    dashboard.main(["web-dev", "--port", "5174", "--host", "0.0.0.0"])
    assert calls[0][0] == ["/fake/bin/npm", "run", "dev", "--", "--port", "5174", "--host", "0.0.0.0"]

def test_web_preview_runs_npm_run_preview_with_port(web_env):
    calls, _, web = web_env
    dashboard.main(["web-preview", "--port", "4173"])
    assert calls == [(["/fake/bin/npm", "run", "preview", "--", "--port", "4173"], web)]

def test_web_dev_ctrl_c_exits_cleanly(web_env):
    _, state, _ = web_env
    state["raise"] = KeyboardInterrupt()
    assert dashboard.main(["web-dev"]) == 0

def test_web_commands_fail_cleanly_when_web_dir_missing(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(dashboard, "WEB_DIR", str(tmp_path / "nope"))
    assert dashboard.main(["web-build"]) == 1
    assert "doesn't exist" in capsys.readouterr().out

def test_web_commands_fail_cleanly_when_npm_missing(web_env, monkeypatch, capsys):
    calls, _, _ = web_env
    monkeypatch.setattr(dashboard.shutil, "which", lambda name: None)
    assert dashboard.main(["web-build"]) == 1
    assert "npm not found" in capsys.readouterr().out
    assert calls == []

def test_web_commands_fail_cleanly_when_node_modules_missing(web_env, capsys):
    calls, _, web = web_env
    os.rmdir(os.path.join(web, "node_modules"))
    assert dashboard.main(["web-dev"]) == 1
    assert "npm install" in capsys.readouterr().out
    assert calls == []

def test_all_does_not_touch_web_build(call_log, monkeypatch):
    """`dashboard all` stays Python-only — web builds are explicit."""
    def boom(*a, **k):
        raise AssertionError("cmd_all must not invoke npm")
    monkeypatch.setattr(dashboard, "run_npm_script", boom)
    dashboard.cmd_all(FakeArgs())

def test_package_exclude_file_flag_is_repeatable():
    """`dashboard package --exclude-file a --exclude-file b` parses both
    into args.exclude_file, matching package_for_claude.py's own CLI.
    (DX-5 — the flag was entirely missing from this subparser before;
    the resulting kwargs passthrough is covered in
    test_dashboard_cards_and_package.py, which already mocks pfc.package.)"""
    ap = dashboard.build_parser()
    args = ap.parse_args(["package", "--exclude-file", "a.txt", "--exclude-file", "b/c.txt"])
    assert args.exclude_file == ["a.txt", "b/c.txt"]
