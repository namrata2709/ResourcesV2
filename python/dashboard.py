#!/usr/bin/env python3
"""
dashboard.py — single CLI entry point for Notebook Buddy's whole toolchain:
the Python content pipeline AND the React/Vite app in web/. Lives in
python/, same folder as every generator script it wraps.

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
    dashboard popular-notes        → regenerate popular-notes.json (B-6)
                                     from src/data/config/popular-notes-
                                     curated.json + the current
                                     notes-index.json. Not part of
                                     `dashboard all` — run it explicitly
                                     when the curated list changes.
    dashboard cards                → regenerate dashboard-cards.json from
                                     subjects.json (generate_dashboard_
                                     cards.py) — real, but previously never
                                     wired into dashboard.py. Not part of
                                     `dashboard all`, same reasoning as
                                     popular-notes.
    dashboard all     [--rebuild] → notes (scan mode), then quiz, then
                                     sitemap; stops immediately if any
                                     step fails
    dashboard package [--output PATH] [--strip-dead-code] [--keep-binaries]
                                     [--no-minify]
                                   → build a lean, filtered zip of the whole
                                     repo for sharing in a Claude chat
                                     (see package_for_claude.py)
    dashboard test    [-k EXPR] [--verbose]
                                   → run the pytest suite in python/tests/

  React app (web/) — thin wrappers over the real npm scripts (DX-3):
    dashboard web-dev     [--port N] [--host H]
                                   → `npm run dev` in web/ (Vite dev server)
    dashboard web-build           → `npm run build` in web/ (tsc -b + vite
                                     build); stops on first error, propagates
                                     npm's exit code
    dashboard web-preview [--port N] [--host H]
                                   → `npm run preview` in web/ (serves the
                                     built output; run web-build first)

--rebuild on quiz/sitemap/notes is passed straight through to the
underlying _index.py script — see each script's own docstring for exactly
what it does in rebuild vs. default mode. generate_notes.py itself has no
--rebuild concept (it's a markdown→HTML converter, not an index builder),
so --rebuild never gets passed to it.
"""

import argparse
import shutil
import subprocess
import sys
import os
from pathlib import Path

HERE      = os.path.dirname(os.path.abspath(__file__))   # .../python
REPO_ROOT = os.path.dirname(HERE)                          # repo root
WEB_DIR   = os.path.join(REPO_ROOT, "web")                # React/Vite app (package.json lives here)
MARKDOWN_INBOX = os.path.join(WEB_DIR, "public", "data", "notes", "markdown")   # was src/data/notes/markdown before vanilla was deleted


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
            print("   Drop a new aws-<slug>.md or dsa-<slug>.md file there, then run this again.")
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


def cmd_popular_notes(args):
    """
    Cross-references src/data/config/popular-notes-curated.json against
    the current notes-index.json to (re)write popular-notes.json (B-6).
    Not part of `dashboard all` — it has its own hand-curated input file
    to edit (adding/removing a folder slug), not something that changes
    just because notes/quiz/sitemap were regenerated. Run it explicitly
    whenever the curated list itself changes, or after a note referenced
    in it gets renamed/recategorized and needs its resolved fields
    refreshed.
    """
    return run_script("generate_popular_notes.py")


def cmd_cards(args):
    """
    Regenerates dashboard-cards.json from subjects.json (generate_dashboard_
    cards.py) — confirmed real this audit, but previously never wired into
    dashboard.py at all (no subcommand existed for it, even though notes/
    quiz/sitemap/popular-notes all had one). Adding a subject to
    subjects.json is enough; no manual dashboard-cards.json edit needed.
    Every non-subject ("standalone") card already in the output file — e.g.
    quiz, calendar — round-trips untouched, since this script has no source
    of truth for those beyond the existing file itself. Not part of
    `dashboard all`, same reasoning as popular-notes: it has its own input
    (subjects.json) that doesn't change just because notes/quiz/sitemap did.
    """
    return run_script("generate_dashboard_cards.py")


def cmd_package(args):
    """
    Builds a lean, filtered zip of the whole repo for sharing in a Claude
    chat (package_for_claude.py) — excludes node_modules/.venv/.git/dist/
    caches, applies safe comment-preserving whitespace minification to
    text/code files, and compacts JSON structurally. See
    package_for_claude.py's own module docstring for exactly what's
    excluded and why.
    """
    import package_for_claude as pfc

    output = os.path.abspath(args.output) if args.output else os.path.join(REPO_ROOT, "ResourcesV2-lean.zip")
    report = pfc.package(
        Path(output),
        minify=not args.no_minify,
        keep_binaries=args.keep_binaries,
        strip_dead_code=args.strip_dead_code,
        extra_exclude_files=set(args.exclude_file),
    )

    def mb(n):
        return f"{n / (1024 * 1024):.2f} MB"

    zip_size = os.path.getsize(output)
    print(f"Source tree read:     {mb(report.bytes_before)}")
    print(f"Copied into package:  {mb(report.bytes_after)}  ({report.files_copied} files)")
    print(f"  minified (text):    {report.files_minified}")
    print(f"  compacted (JSON):   {report.files_json_compacted}")
    print(f"  binaries skipped:   {report.files_skipped_binary}")
    print(f"Final zip:            {mb(zip_size)}  -> {output}")
    return 0


def cmd_audit(args):
    """
    Cross-repo validation report (audit_content.py) — missing images,
    broken links, duplicate topics/slugs/ids, invalid JSON/categories/
    tags/dates, unused files/images, build statistics. Runs AFTER
    generation, never blocks or modifies it — reports.py always exits 0
    for warnings; only errors get flagged, they don't stop anything here
    either (per the spec: "build should complete successfully even when
    warnings exist, but should clearly distinguish between warnings and
    errors").
    """
    return run_script("audit_content.py", ["--quiet"] if args.quiet else [])


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
    print("\n── audit " + "─" * 42)
    # Audit runs even if this is reached with args that don't have --quiet
    # set (e.g. called from "all") — default to verbose findings output.
    if not hasattr(args, "quiet"):
        args.quiet = False
    cmd_audit(args)   # never gates the build — errors are reported, not fatal here
    print("\n✅ all: notes, quiz, sitemap, and audit all completed.")
    return 0


def cmd_test(args):
    cmd = [sys.executable, "-m", "pytest"]
    if args.verbose:
        cmd.append("-vv")
    if args.k:
        cmd += ["-k", args.k]
    return subprocess.run(cmd, cwd=HERE).returncode


def run_npm_script(script, extra_args=None):
    """
    Runs `npm run <script> [-- <extra_args>]` inside web/ and returns npm's
    exit code — unchanged, so `dashboard web-build` fails exactly when
    `npm run build` fails. Output streams live (no capture): unlike the
    old vanilla-site build command (removed — vanilla src/ was scrapped
    and permanently deleted, see CHANGELOG.md), tsc/vite already print
    one clean, ordered error block.

    Fails with a plain message (exit 1) instead of a traceback when the
    preconditions aren't met: no web/ folder, npm not on PATH, or
    node_modules missing (npm would otherwise die with a cryptic
    "vite: not found").
    """
    if not os.path.isdir(WEB_DIR):
        print(f"❌ {WEB_DIR} doesn't exist — expected the React app in web/ next to python/.")
        return 1

    # shutil.which resolves npm.cmd on Windows, where plain "npm" won't spawn.
    npm = shutil.which("npm")
    if npm is None:
        print("❌ npm not found on PATH — install Node.js, then re-run.")
        return 1

    if not os.path.isdir(os.path.join(WEB_DIR, "node_modules")):
        print(f"❌ {os.path.join(WEB_DIR, 'node_modules')} is missing — "
              f"run `npm install` in web/ first.")
        return 1

    cmd = [npm, "run", script]
    if extra_args:
        cmd += ["--"] + list(extra_args)
    try:
        return subprocess.run(cmd, cwd=WEB_DIR, check=False).returncode
    except KeyboardInterrupt:
        return 0   # Ctrl+C is the normal way to stop dev/preview servers


def _vite_server_args(args):
    """--port/--host → Vite CLI flags, only when the user actually gave them."""
    extra = []
    if args.port is not None:
        extra += ["--port", str(args.port)]
    if args.host:
        extra += ["--host", args.host]
    return extra


def cmd_web_dev(args):
    return run_npm_script("dev", _vite_server_args(args))


def cmd_web_build(args):
    print("Running React build (npm run build in web/)...")
    rc = run_npm_script("build")
    if rc != 0:
        print(f"\n❌ WEB BUILD FAILED (exit {rc}) — see the output above.")
        return rc
    print("✅ Web build succeeded — web/dist/ is up to date.")
    return 0


def cmd_web_preview(args):
    return run_npm_script("preview", _vite_server_args(args))


def build_parser():
    ap = argparse.ArgumentParser(
        prog="dashboard",
        description="Notebook Buddy CLI",
        epilog=(
            "Python content pipeline: notes, new-notes, quiz, sitemap, popular-notes, "
            "cards, package, audit, all, test\n"
            "React app (web/):        web-dev, web-build, web-preview"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
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

    p_popular = sub.add_parser(
        "popular-notes",
        help="Regenerate popular-notes.json from the curated folder list + notes-index.json (B-6)."
    )
    p_popular.set_defaults(func=cmd_popular_notes)

    p_cards = sub.add_parser(
        "cards",
        help="Regenerate dashboard-cards.json from subjects.json (generate_dashboard_cards.py)."
    )
    p_cards.set_defaults(func=cmd_cards)

    p_package = sub.add_parser(
        "package",
        help="Build a lean, filtered zip of the repo for sharing in a Claude chat."
    )
    p_package.add_argument("--output", type=str, default=None,
                            help="Output .zip path (default: <repo root>/ResourcesV2-lean.zip).")
    p_package.add_argument("--no-minify", action="store_true",
                            help="Copy files verbatim, skip whitespace/JSON minification.")
    p_package.add_argument("--keep-binaries", action="store_true",
                            help="Include images/fonts/media instead of excluding them.")
    p_package.add_argument("--strip-dead-code", action="store_true",
                            help="Also exclude known-dead files (see package_for_claude.DEFAULT_DEAD_CODE).")
    p_package.add_argument("--exclude-file", action="append", default=[],
                            help="Extra repo-relative file path to exclude (repeatable).")
    p_package.set_defaults(func=cmd_package)

    p_audit = sub.add_parser(
        "audit",
        help="Cross-repo validation report — missing images, broken links, "
             "duplicates, invalid JSON/categories/dates, unused files. "
             "Writes reports/build-report.{html,md,json}."
    )
    p_audit.add_argument("--quiet", action="store_true",
                          help="Suppress per-finding console output, just show the summary.")
    p_audit.set_defaults(func=cmd_audit)

    p_test = sub.add_parser("test", help="Run the pytest suite in python/tests/.")
    p_test.add_argument("-k", type=str, default=None, help="Only run tests matching this expression.")
    p_test.add_argument("--verbose", action="store_true")
    p_test.set_defaults(func=cmd_test)

    for name, fn, helptext in (
        ("web-dev", cmd_web_dev, "React app: start the Vite dev server (npm run dev in web/)."),
        ("web-preview", cmd_web_preview, "React app: serve the built output (npm run preview in web/)."),
    ):
        p = sub.add_parser(name, help=helptext)
        p.add_argument("--port", type=int, default=None, help="Override Vite's default port.")
        p.add_argument("--host", type=str, default=None, help="Bind address (e.g. 0.0.0.0 to expose on the LAN).")
        p.set_defaults(func=fn)

    p_web_build = sub.add_parser("web-build", help="React app: type-check + production build (npm run build in web/).")
    p_web_build.set_defaults(func=cmd_web_build)

    return ap


def main(argv=None):
    ap = build_parser()
    args = ap.parse_args(argv)

    if not args.command:
        ap.print_help()
        return 0

    return args.func(args) or 0


if __name__ == "__main__":
    sys.exit(main())
