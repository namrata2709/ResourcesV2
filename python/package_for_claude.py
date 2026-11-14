#!/usr/bin/env python3
"""
package_for_claude.py — build a lean project zip for sharing in a Claude chat.

Lives in python/, alongside the other CLI-callable scripts dashboard.py
wraps (same pattern as generate_notes.py, audit_content.py, etc.) — but it
packages the WHOLE repo (both python/ and web/), not just one side of it.
Normally run via `dashboard package`, not invoked directly.

Why this exists
----------------
A raw `zip -r` of the repo is ~400MB, almost all of it node_modules (one
copy per checkout: root, web/, python/), .venv, .git history, and
web/dist build output — none of which Claude needs to review source,
tickets, or content. This script copies only what's useful, applies a
safe (comment-preserving) whitespace minification to text/code files,
and compresses JSON payloads structurally, then zips the result.

What it does NOT do
--------------------
- Does not strip comments. This project's own CHANGELOG/HANDOFF discipline
  treats source comments as decision records — stripping them would
  destroy exactly the context a reviewer needs.
- Does not touch the real repo. It only READS `--source` (default: the
  repo root, one level up from this file) and WRITES a new copy under
  `--staging` (default: a temporary directory OUTSIDE the repo) before zipping. Nothing in the original tree is modified
  or deleted.
- Does not decide what counts as "dead code" for you. Known dead files
  can be excluded via --exclude-file or --strip-dead-code, but nothing
  is removed from your real repo — only left out of the zip.

Usage (standalone)
-------------------
    python package_for_claude.py --output ../ResourcesV2-lean.zip
    python package_for_claude.py --source /path/to/repo --output out.zip --no-minify
    python package_for_claude.py --output out.zip --strip-dead-code
    python package_for_claude.py --output out.zip --keep-binaries

Usage (via dashboard.py, the normal path)
-------------------------------------------
    dashboard package
    dashboard package --output ~/Desktop/ResourcesV2-lean.zip --strip-dead-code

Exit: prints a before/after size report and a manifest of what was
excluded, so nothing is silently dropped without a record.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import shutil
import sys
import tempfile
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))          # .../python
DEFAULT_REPO_ROOT = os.path.dirname(HERE)                   # repo root, one level up

# ---------------------------------------------------------------------------
# Defaults — tuned to this specific repo's real bloat sources, confirmed by
# direct inspection (node_modules x3 ~360MB, .venv 31MB, .git 7.2MB,
# web/dist 3.8MB, __pycache__/.pytest_cache).
# ---------------------------------------------------------------------------

# Directory names excluded wherever they appear, at any depth.
DEFAULT_EXCLUDE_DIRS = {
    ".git", ".venv", "venv", "node_modules", "__pycache__", ".pytest_cache",
    ".vscode", ".idea", ".turbo", ".cache",
}

# Build/test OUTPUT directory names. Excluded only when they sit directly under
# the repo root or under a top-level project folder (e.g. `dist/`, `web/dist`,
# `web/coverage`, `python/htmlcov`) — i.e. at most DEFAULT_ROOT_DIR_DEPTH path
# parts from the repo root. A deeper directory with one of these names is
# *source* and is kept, so a future `web/src/build/` is never silently omitted.
DEFAULT_EXCLUDE_ROOT_DIRS = {
    "dist", "build", "coverage", "htmlcov", "playwright-report", "test-results",
}
DEFAULT_ROOT_DIR_DEPTH = 2

# Glob patterns matched against DIRECTORY names, at any depth. `*.egg-info` is a
# directory, so it belongs here and not in the file-name globs. The `.*_staging`
# pattern is the packager's own scratch directory (belt and braces — the walk also
# skips the exact staging path it was given).
DEFAULT_EXCLUDE_DIR_GLOBS = {"*.egg-info", ".*_staging"}

# Exact file names excluded wherever they appear.
DEFAULT_EXCLUDE_FILES = {
    ".DS_Store", "Thumbs.db", "package-lock.json", "npm-shrinkwrap.json",
}

# Glob patterns (matched against the file name) excluded wherever they appear.
DEFAULT_EXCLUDE_GLOBS = {
    "*.pyc", "*.pyo", "*.log", "*.lock", "*-lean.zip",
}

# Binary/asset extensions Claude has no use for when reviewing source/content
# (images, fonts, audio/video, compiled artifacts). Off by default via
# --keep-binaries if the task genuinely needs them (e.g. reviewing an
# actual image asset).
DEFAULT_BINARY_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".bmp",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".mp4", ".mp3", ".wav", ".webm",
    ".zip", ".gz", ".tar", ".7z",
    ".pdf",
}

# Text/code extensions eligible for the safe whitespace-only minification.
MINIFY_TEXT_EXTS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".css", ".scss",
    ".html", ".md", ".yml", ".yaml", ".sh", ".bat",
}

# JSON is minified structurally (re-serialized with no indentation/whitespace)
# rather than line-by-line — semantically identical, much smaller for large
# generated data files (quiz-index.json, dashboard-cards.json, etc.).
JSON_EXT = ".json"

# Known-dead source files that `--strip-dead-code` leaves out of the package
# (confirmed unreferenced by direct grep during a source audit). Only excluded
# when --strip-dead-code is passed — never deleted from the real repo by this
# script.
# Empty on purpose after AUDIT-3 (2026-11): the previously listed files
# (`web/src/hooks/useOnlineStatus.ts`, `web/src/pages/Quiz/QuestionCard.tsx`,
# `web/src/pages/Quiz/icons.tsx`) are deleted. Add a path here only while the
# file still exists and is unused; remove it in the same change that deletes it.
DEFAULT_DEAD_CODE: set = set()


@dataclass
class PackageReport:
    files_copied: int = 0
    files_minified: int = 0
    files_json_compacted: int = 0
    files_skipped_binary: int = 0
    dirs_excluded: list[str] = field(default_factory=list)
    files_excluded: list[str] = field(default_factory=list)
    bytes_before: int = 0
    bytes_after: int = 0

def _is_excluded_dir(rel_dir: str, name: str, exclude_dirs: set[str],
                      root_dirs: set[str] | None = None,
                      dir_globs: set[str] | None = None) -> bool:
    """rel_dir is the directory's path relative to the repo root, '/'-separated."""
    if name in exclude_dirs:
        return True
    if root_dirs and name in root_dirs and len(rel_dir.split("/")) <= DEFAULT_ROOT_DIR_DEPTH:
        return True
    return bool(dir_globs) and any(fnmatch.fnmatch(name, pat) for pat in dir_globs)

def _is_excluded_file(rel_path: str, name: str, exclude_files: set[str],
                       exclude_globs: set[str], dead_code: set[str]) -> bool:
    if name in exclude_files:
        return True
    if rel_path.replace(os.sep, "/") in dead_code:
        return True
    return any(fnmatch.fnmatch(name, pat) for pat in exclude_globs)

def _minify_text(content: str, *, markdown: bool = False) -> str:
    """Whitespace-only minification: strip trailing whitespace per line,
    collapse 2+ consecutive blank lines to 1. Comments and code structure
    are left completely intact.

    For Markdown (`markdown=True`), two or more trailing spaces are a hard
    line break, which is meaning, not whitespace: such lines are normalised to
    exactly two trailing spaces instead of being stripped.
    """
    lines = []
    for line in content.splitlines():
        stripped = line.rstrip()
        if markdown and stripped and line.endswith("  "):
            stripped += "  "
        lines.append(stripped)
    out: list[str] = []
    blank_run = 0
    for line in lines:
        if line == "":
            blank_run += 1
            if blank_run <= 1:
                out.append(line)
        else:
            blank_run = 0
            out.append(line)
    return "\n".join(out) + "\n"

def _compact_json(content: str) -> str | None:
    try:
        data = json.loads(content)
    except (json.JSONDecodeError, ValueError):
        return None
    return json.dumps(data, separators=(",", ":"), ensure_ascii=False)

def build_package(
    source: Path,
    staging: Path,
    *,
    minify: bool = True,
    keep_binaries: bool = False,
    strip_dead_code: bool = False,
    exclude_dirs: set[str] | None = None,
    exclude_files: set[str] | None = None,
    exclude_globs: set[str] | None = None,
    exclude_root_dirs: set[str] | None = None,
    exclude_dir_globs: set[str] | None = None,
    extra_exclude_files: set[str] | None = None,
    skip_paths: set[Path] | None = None,
) -> PackageReport:
    exclude_dirs = exclude_dirs or set(DEFAULT_EXCLUDE_DIRS)
    exclude_files = exclude_files or set(DEFAULT_EXCLUDE_FILES)
    exclude_globs = exclude_globs or set(DEFAULT_EXCLUDE_GLOBS)
    exclude_root_dirs = DEFAULT_EXCLUDE_ROOT_DIRS if exclude_root_dirs is None else exclude_root_dirs
    exclude_dir_globs = DEFAULT_EXCLUDE_DIR_GLOBS if exclude_dir_globs is None else exclude_dir_globs
    # Exact paths that must never be walked into or copied: the staging directory
    # and the output zip. Without this, packaging into the source tree (the
    # default for `dashboard package`) copies the zip's own scratch folder, and a
    # previous zip, into the new zip.
    skip_resolved = {Path(p).resolve() for p in (skip_paths or set())}
    dead_code = set(DEFAULT_DEAD_CODE) if strip_dead_code else set()
    if extra_exclude_files:
        dead_code |= extra_exclude_files

    report = PackageReport()

    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    for root, dirs, files in os.walk(source):
        root_path = Path(root)
        rel_root = root_path.relative_to(source)

        pruned = []
        for d in list(dirs):
            rel_dir = (rel_root / d).as_posix()
            if (root_path / d).resolve() in skip_resolved or \
                    _is_excluded_dir(rel_dir, d, exclude_dirs, exclude_root_dirs, exclude_dir_globs):
                report.dirs_excluded.append(str(rel_root / d))
            else:
                pruned.append(d)
        dirs[:] = pruned

        for f in files:
            rel_path = str(rel_root / f) if str(rel_root) != "." else f
            if (root_path / f).resolve() in skip_resolved or \
                    _is_excluded_file(rel_path, f, exclude_files, exclude_globs, dead_code):
                report.files_excluded.append(rel_path)
                continue

            src_file = root_path / f
            ext = src_file.suffix.lower()

            if ext in DEFAULT_BINARY_EXTS and not keep_binaries:
                report.files_skipped_binary += 1
                report.files_excluded.append(rel_path)
                continue

            try:
                size_before = src_file.stat().st_size
            except OSError:
                continue
            report.bytes_before += size_before

            dest_file = staging / rel_path
            dest_file.parent.mkdir(parents=True, exist_ok=True)

            if ext == JSON_EXT and minify:
                try:
                    text = src_file.read_text(encoding="utf-8")
                except (UnicodeDecodeError, OSError):
                    shutil.copy2(src_file, dest_file)
                else:
                    compacted = _compact_json(text)
                    if compacted is not None:
                        dest_file.write_text(compacted, encoding="utf-8")
                        report.files_json_compacted += 1
                    else:
                        dest_file.write_text(text, encoding="utf-8")
            elif ext in MINIFY_TEXT_EXTS and minify:
                try:
                    text = src_file.read_text(encoding="utf-8")
                except (UnicodeDecodeError, OSError):
                    shutil.copy2(src_file, dest_file)
                else:
                    dest_file.write_text(_minify_text(text, markdown=(ext == ".md")), encoding="utf-8")
                    report.files_minified += 1
            else:
                shutil.copy2(src_file, dest_file)

            report.files_copied += 1
            report.bytes_after += dest_file.stat().st_size

    return report

def zip_staging(staging: Path, output_zip: Path, root_folder_name: str) -> None:
    if output_zip.exists():
        output_zip.unlink()
    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for root, _dirs, files in os.walk(staging):
            for f in files:
                full = Path(root) / f
                arcname = Path(root_folder_name) / full.relative_to(staging)
                zf.write(full, arcname)

def package(
    output: Path,
    *,
    source: Path | None = None,
    staging: Path | None = None,
    minify: bool = True,
    keep_binaries: bool = False,
    strip_dead_code: bool = False,
    extra_exclude_files: set[str] | None = None,
) -> PackageReport:
    """
    High-level entry point used by dashboard.py's `cmd_package` — builds the
    filtered copy and zips it in one call, cleaning up the staging dir
    afterward either way. Returns the PackageReport for the caller to print.
    """
    source = source or Path(DEFAULT_REPO_ROOT)
    # Default scratch space is a temporary directory OUTSIDE the repo, so a
    # crash cannot leave a staging folder inside the source tree.
    staging = staging or Path(tempfile.mkdtemp(prefix="package_for_claude_"))

    report = build_package(
        source, staging,
        minify=minify,
        keep_binaries=keep_binaries,
        strip_dead_code=strip_dead_code,
        extra_exclude_files=extra_exclude_files,
        skip_paths={staging, output},
    )
    try:
        zip_staging(staging, output, source.name)
    finally:
        shutil.rmtree(staging, ignore_errors=True)
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", type=Path, default=Path(DEFAULT_REPO_ROOT),
                         help="Path to the repo root (default: one level up from this file, i.e. the real repo root).")
    parser.add_argument("--output", required=True, type=Path, help="Path to the output .zip file")
    parser.add_argument("--staging", type=Path, default=None, help="Temp dir for the filtered copy (default: a temporary directory outside the repo)")
    parser.add_argument("--no-minify", dest="minify", action="store_false", help="Copy files verbatim, skip whitespace/JSON minification")
    parser.add_argument("--keep-binaries", action="store_true", help="Include images/fonts/media instead of excluding them")
    parser.add_argument("--strip-dead-code", action="store_true", help="Also exclude the known-dead files listed in DEFAULT_DEAD_CODE")
    parser.add_argument("--exclude-file", action="append", default=[], help="Extra repo-relative file path to exclude (repeatable)")
    args = parser.parse_args()

    source = args.source.resolve()
    if not source.is_dir():
        sys.exit(f"Source not found: {source}")

    report = package(
        args.output,
        source=source,
        staging=args.staging,
        minify=args.minify,
        keep_binaries=args.keep_binaries,
        strip_dead_code=args.strip_dead_code,
        extra_exclude_files=set(args.exclude_file),
    )

    zip_size = args.output.stat().st_size

    def mb(n: int) -> str:
        return f"{n / (1024 * 1024):.2f} MB"

    print(f"Source tree read:     {mb(report.bytes_before)}")
    print(f"Copied into package:  {mb(report.bytes_after)}  ({report.files_copied} files)")
    print(f"  minified (text):    {report.files_minified}")
    print(f"  compacted (JSON):   {report.files_json_compacted}")
    print(f"  binaries skipped:   {report.files_skipped_binary}")
    print(f"Final zip:            {mb(zip_size)}  -> {args.output}")
    print(f"Directories excluded: {len(set(report.dirs_excluded))}")
    print(f"Files excluded:       {len(report.files_excluded)}")

if __name__ == "__main__":
    main()
