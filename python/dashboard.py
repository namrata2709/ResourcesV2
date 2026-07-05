#!/usr/bin/env python3
"""
dashboard.py — single CLI entry point for the Learning Dashboard's Python
tooling. Lives in python/, same folder as every generator script it wraps.

Usage (run from python/, or via dashboard.bat from anywhere in the repo):
    dashboard                     → show command list
    dashboard notes   [slug] [--rebuild]
                                   → markdown → HTML, then reindex.
                                     No slug: scans the markdown inbox for
                                     new files (generate_notes.py's own
                                     --scan behavior, which also re-checks
                                     existing topics' slides-overview.md
                                     companions) — this is the step that
                                     was MISSING before; `dashboard notes`
                                     used to only reindex, never actually
                                     convert markdown to HTML.
                                     With a slug: rebuilds that ONE
                                     existing note (e.g. `dashboard notes
                                     ec2-basics` or `dashboard notes
                                     aws-ec2-basics`) — for after editing
                                     a note's markdown directly, since scan
                                     mode only picks up the flat inbox, not
                                     edits to already-placed files.
                                     --rebuild only affects the index step.
    dashboard new-notes            → alias for `dashboard notes` (no slug),
                                     but lists what's waiting in the
                                     markdown inbox first, so it's obvious
                                     whether there's anything to pick up
                                     before it runs.
    dashboard quiz    [--rebuild]
    dashboard sitemap [--rebuild]
    dashboard all     [--rebuild] → notes (scan mode), then quiz, then
                                     sitemap; stops immediately if any
                                     step fails
    dashboard serve   [--dist] [--port 8000]
                                   → serve src/ (default) or dist/ locally,
                                     no more "cd src && python -m http.server"
    dashboard test    [-k EXPR] [--verbose]
                                   → run the pytest suite in python/tests/
    dashboard build   [--open]    → run tools/minify.js, stop on first error
                                     with a clearly bounded error block
                                     (see cmd_build docstring below)

--rebuild on quiz/sitemap/notes is passed straight through to the
underlying _index.py script — see each script's own docstring for exactly
what it does in rebuild vs. default mode. generate_notes.py itself has no
--rebuild concept (it's a markdown→HTML converter, not an index builder),
so --rebuild never gets passed to it.
"""

import argparse
import subprocess
import sys
import os

HERE      = os.path.dirname(os.path.abspath(__file__))   # .../python
REPO_ROOT = os.path.dirname(HERE)                          # repo root
SRC_DIR   = os.path.join(REPO_ROOT, "src")
DIST_DIR  = os.path.join(REPO_ROOT, "dist")
MARKDOWN_INBOX = os.path.join(SRC_DIR, "data", "notes", "markdown")


def run_script(script_name, extra_args=None):
    cmd = [sys.executable, script_name] + list(extra_args or [])
    result = subprocess.run(cmd, cwd=HERE)
    return result.returncode


def cmd_notes(args):
    """
    Chains generate_notes.py (markdown -> HTML) then
    generate_notes_index.py (index + sitemap). This was the actual gap
    before — `dashboard notes` only ever called the index step, so new
    markdown dropped in the inbox never got converted at all.
    """
    if args.slug:
        rc = run_script("generate_notes.py", [args.slug])
    else:
        rc = run_script("generate_notes.py")  # no args = --scan (inbox + video-slides re-check)

    if rc != 0:
        print(f"❌ generate_notes.py failed (exit {rc}) — stopping before the index step.")
        return rc

    return run_script("generate_notes_index.py", ["--rebuild"] if args.rebuild else [])


def cmd_new_notes(args):
    """
    Same underlying chain as `dashboard notes` (no slug), but shows what's
    actually sitting in the markdown inbox first — so running it either
    confirms something real is about to happen, or tells you plainly
    there's nothing to pick up instead of running silently either way.
    """
    if os.path.isdir(MARKDOWN_INBOX):
        pending = sorted(
            f for f in os.listdir(MARKDOWN_INBOX)
            if (f.startswith("aws-") or f.startswith("dsa-")) and f.endswith(".md")
        )
        if pending:
            print(f"📥 {len(pending)} file(s) waiting in {MARKDOWN_INBOX}:")
            for f in pending:
                print(f"   - {f}")
        else:
            print(f"📭 Nothing waiting in {MARKDOWN_INBOX}.")
            print(f"   Drop a new aws-<slug>.md or dsa-<slug>.md file there, then run this again.")
    else:
        print(f"⚠️  Inbox folder doesn't exist yet: {MARKDOWN_INBOX}")

    rc = run_script("generate_notes.py")
    if rc != 0:
        print(f"❌ generate_notes.py failed (exit {rc}) — stopping before the index step.")
        return rc

    return run_script("generate_notes_index.py")


def cmd_quiz(args):
    return run_script("generate_quiz_index.py", ["--rebuild"] if args.rebuild else [])


def cmd_sitemap(args):
    return run_script("generate_sitemap.py", ["--rebuild"] if args.rebuild else [])


def cmd_all(args):
    steps = (("notes", cmd_notes), ("quiz", cmd_quiz), ("sitemap", cmd_sitemap))
    for name, fn in steps:
        print(f"\n── {name} " + "─" * (50 - len(name)))
        # cmd_notes reads args.slug — "all" never targets a single slug
        if name == "notes" and not hasattr(args, "slug"):
            args.slug = None
        rc = fn(args)
        if rc != 0:
            print(f"\n❌ Stopped — '{name}' step failed (exit code {rc}). "
                  f"Fix it before the remaining steps run.")
            return rc
    print("\n✅ all: notes, quiz, and sitemap all completed successfully.")
    return 0


def cmd_serve(args):
    target = DIST_DIR if args.dist else SRC_DIR
    if not os.path.isdir(target):
        print(f"❌ {target} doesn't exist. "
              f"{'Run `dashboard build` first.' if args.dist else ''}")
        return 1
    label = "dist/" if args.dist else "src/"
    print(f"Serving {label} at http://localhost:{args.port}  (Ctrl+C to stop)")
    try:
        return subprocess.run(
            [sys.executable, "-m", "http.server", str(args.port)],
            cwd=target,
        ).returncode
    except KeyboardInterrupt:
        return 0


def cmd_test(args):
    cmd = [sys.executable, "-m", "pytest"]
    if args.verbose:
        cmd.append("-vv")
    if args.k:
        cmd += ["-k", args.k]
    return subprocess.run(cmd, cwd=HERE).returncode


def cmd_build(args):
    """
    Runs tools/minify.js and fails fast.

    The original complaint: when minify.js hits a parse error partway
    through a file, Node's stack trace mixes the *original* file's line
    number with whatever internal line count minify.js/terser is tracking
    (e.g. "line 300" reported against a 100-line file) — and because the
    script kept going after the first failure, several of these mixed-up
    traces end up stacked in the terminal, making it hard to tell which
    error is which or where to actually scroll to.

    This wrapper doesn't fix minify.js's own line-number reporting (that
    needs an edit inside tools/minify.js itself — happy to do that too if
    you upload it) — but it does two things immediately, without touching
    minify.js:
      1. Captures all output instead of letting it stream live, so once
         it fails you get ONE clearly bounded error block instead of
         output interleaved across multiple file attempts.
      2. Stops there — doesn't run cmd_serve/anything else afterward, and
         propagates the real exit code, so a failed build is unambiguous
         (no dist/ preview to "check sometimes" after a failed run — the
         build command flat out won't get that far).
    """
    print("Running build (tools/minify.js)...")
    result = subprocess.run(
        ["node", "tools/minify.js"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout)

    if result.returncode != 0:
        print("\n" + "=" * 60)
        print("❌ BUILD FAILED — stopped at first error, full output below")
        print("=" * 60)
        print(result.stderr)
        print("=" * 60)
        return result.returncode

    print("✅ Build succeeded — dist/ is up to date.")
    if args.open:
        return cmd_serve(argparse.Namespace(dist=True, port=args.port))
    return 0


def main():
    ap = argparse.ArgumentParser(prog="dashboard", description="Learning Dashboard CLI")
    sub = ap.add_subparsers(dest="command")

    p_notes = sub.add_parser("notes", help="Markdown -> HTML, then reindex.")
    p_notes.add_argument(
        "slug", nargs="?", default=None,
        help="Rebuild one existing note by slug (e.g. 'ec2-basics' or 'aws-ec2-basics'). "
             "Omit to scan the markdown inbox for new files instead."
    )
    p_notes.add_argument("--rebuild", action="store_true",
                          help="Full index rebuild from scratch instead of incremental (index step only).")
    p_notes.set_defaults(func=cmd_notes)

    p_new = sub.add_parser(
        "new-notes",
        help="Process new .md files waiting in the markdown inbox, then reindex."
    )
    p_new.set_defaults(func=cmd_new_notes)

    for name, fn in (("quiz", cmd_quiz), ("sitemap", cmd_sitemap), ("all", cmd_all)):
        p = sub.add_parser(name)
        p.add_argument("--rebuild", action="store_true",
                        help="Full rebuild from scratch instead of incremental.")
        p.set_defaults(func=fn)

    p_serve = sub.add_parser("serve", help="Serve src/ (default) or dist/ locally.")
    p_serve.add_argument("--dist", action="store_true", help="Serve dist/ instead of src/.")
    p_serve.add_argument("--port", type=int, default=8000)
    p_serve.set_defaults(func=cmd_serve)

    p_test = sub.add_parser("test", help="Run the pytest suite in python/tests/.")
    p_test.add_argument("-k", type=str, default=None, help="Only run tests matching this expression.")
    p_test.add_argument("--verbose", action="store_true")
    p_test.set_defaults(func=cmd_test)

    p_build = sub.add_parser("build", help="Run tools/minify.js, stop on first error.")
    p_build.add_argument("--open", action="store_true", help="Serve dist/ after a successful build.")
    p_build.add_argument("--port", type=int, default=8000)
    p_build.set_defaults(func=cmd_build)

    args = ap.parse_args()

    if not args.command:
        ap.print_help()
        return 0

    return args.func(args) or 0


if __name__ == "__main__":
    sys.exit(main())
