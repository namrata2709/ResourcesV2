"""
print_coverage_summary.py

Reads coverage.xml (produced by `pytest --cov-report=xml`) and prints a
GitHub Actions job-summary-flavored Markdown table to stdout. Pulled out
of python/.github/workflows/coverage.yml's `run:` block into a real
file rather than an inline heredoc -- a multi-line Python script
embedded directly in a YAML block scalar is fragile (indentation that's
consistent for the *shell* block can still desync from what Python's
own top-level-statement indentation rules require), and a real .py file
gets the same "read it in the editor with real syntax highlighting" and
"can add a test for it later if it grows" benefits every other script
in this project already gets.

Run from python/: python print_coverage_summary.py [coverage.xml]
"""

import sys
import xml.etree.ElementTree as ET


def build_summary(coverage_xml_path: str) -> str:
    root = ET.parse(coverage_xml_path).getroot()
    line_rate = float(root.get("line-rate", 0)) * 100
    branch_rate = float(root.get("branch-rate", 0)) * 100
    lines_covered = root.get("lines-covered")
    lines_valid = root.get("lines-valid")
    branches_covered = root.get("branches-covered")
    branches_valid = root.get("branches-valid")

    return (
        "## Python coverage (pytest-cov)\n"
        "| Metric | Covered/Total | % |\n"
        "|---|---|---|\n"
        f"| Lines | {lines_covered}/{lines_valid} | {line_rate:.1f}% |\n"
        f"| Branches | {branches_covered}/{branches_valid} | {branch_rate:.1f}% |\n"
    )


def main():
    coverage_xml_path = sys.argv[1] if len(sys.argv) > 1 else "coverage.xml"
    try:
        print(build_summary(coverage_xml_path))
    except FileNotFoundError:
        print(f"{coverage_xml_path} not found — coverage run may have failed.")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
