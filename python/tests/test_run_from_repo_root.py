"""
Regression test for the 2026-11 deploy failure: the deploy workflow ran
`pytest python/tests/` from the repo root, where the pipeline's relative data paths
(`../web/public/data/config/subjects.json`) do not resolve, so collection aborted with
"subjects.json not found" and not one test ran.

tests/conftest.py now pins the working directory; this test proves the suite really
does collect and pass when started from the repo root (the exact CI invocation).
"""
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_a_test_module_that_imports_the_generator_passes_from_the_repo_root():
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "python/tests/test_body_prose_extraction.py",
         "-q", "-p", "no:cacheprovider"],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=120,
    )
    assert result.returncode == 0, result.stdout[-1500:] + result.stderr[-500:]
    assert "subjects.json not found" not in result.stdout
