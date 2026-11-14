"""
test_print_coverage_summary.py

Coverage for print_coverage_summary.py (B-4b) -- the script that turns
coverage.xml into the Markdown table posted to the GitHub Actions job
summary. Extracted out of coverage.yml's own `run:` block (see that
file's history / this script's own docstring) specifically so it could
be tested like every other script in this project, rather than living
only as untestable inline YAML.
"""

import pytest

from print_coverage_summary import build_summary, main


COVERAGE_XML = """<?xml version="1.0" ?>
<coverage line-rate="0.459" branch-rate="0.400" lines-covered="2131"
           lines-valid="4646" branches-covered="638" branches-valid="1594">
</coverage>
"""


@pytest.fixture
def coverage_xml_file(tmp_path):
    path = tmp_path / "coverage.xml"
    path.write_text(COVERAGE_XML, encoding="utf-8")
    return str(path)


class TestBuildSummary:
    def test_includes_line_and_branch_rates_as_percentages(self, coverage_xml_file):
        summary = build_summary(coverage_xml_file)
        assert "45.9%" in summary
        assert "40.0%" in summary

    def test_includes_covered_over_total_counts(self, coverage_xml_file):
        summary = build_summary(coverage_xml_file)
        assert "2131/4646" in summary
        assert "638/1594" in summary

    def test_missing_file_raises_file_not_found(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            build_summary(str(tmp_path / "does-not-exist.xml"))


class TestMain:
    def test_main_prints_summary_and_exits_zero(self, coverage_xml_file, capsys):
        main_args = [coverage_xml_file]
        import sys as _sys
        old_argv = _sys.argv
        try:
            _sys.argv = ["print_coverage_summary.py"] + main_args
            main()
        finally:
            _sys.argv = old_argv

        out = capsys.readouterr().out
        assert "Python coverage (pytest-cov)" in out

    def test_main_exits_nonzero_on_missing_file(self, tmp_path, capsys):
        import sys as _sys
        old_argv = _sys.argv
        try:
            _sys.argv = ["print_coverage_summary.py", str(tmp_path / "missing.xml")]
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code != 0
        finally:
            _sys.argv = old_argv

        out = capsys.readouterr().out
        assert "not found" in out
