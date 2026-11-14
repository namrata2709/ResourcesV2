"""
test_generate_quiz_index.py

First real test coverage for generate_quiz_index.py — previously had
none at all. Covers the basic index-writing behavior plus T5-2's
(2026-07-26) sitemap URL-shape change specifically: /quiz/<stem>
(matching T5-1's React route), not the old quiz.html?quiz=<stem>
query-string form.
"""

import json
import sys

import pytest


@pytest.fixture
def quiz_env(tmp_path, monkeypatch):
    quiz_dir = tmp_path / "quiz"
    quiz_dir.mkdir()

    import generate_quiz_index as gqi
    import utils.sitemap as sitemap_utils

    monkeypatch.setattr(gqi, "ROOT", str(quiz_dir))
    monkeypatch.setattr(gqi, "OUTPUT", str(tmp_path / "index" / "quiz-index.json"))
    monkeypatch.setattr(sitemap_utils, "SITEMAP_FILE", str(tmp_path / "sitemap.xml"))

    return gqi, quiz_dir, tmp_path, sitemap_utils


def run_main(gqi, monkeypatch, rebuild=False):
    argv = ["generate_quiz_index.py"]
    if rebuild:
        argv.append("--rebuild")
    monkeypatch.setattr(sys, "argv", argv)
    gqi.main()


def write_quiz(quiz_dir, stem, title="VPC Basics", topic="VPC", description=None, question_count=0):
    data = {"title": title, "topic": topic}
    if description:
        data["description"] = description
    data["questions"] = [{"id": i + 1, "question": f"Q{i + 1}?"} for i in range(question_count)]
    (quiz_dir / f"{stem}.json").write_text(json.dumps(data), encoding="utf-8")


def read_index(tmp_path):
    return json.loads((tmp_path / "index" / "quiz-index.json").read_text(encoding="utf-8"))


class TestQuizIndexBasics:
    def test_writes_one_entry_per_valid_quiz_json(self, quiz_env, monkeypatch):
        gqi, quiz_dir, tmp_path, _ = quiz_env
        write_quiz(quiz_dir, "vpc-basics")
        run_main(gqi, monkeypatch)

        items = read_index(tmp_path)["Quizzes"]
        assert len(items) == 1
        assert items[0] == {
            "title": "VPC Basics", "file": "vpc-basics", "topic": "VPC",
            "questionCount": 0, "estimatedMinutes": 1,
        }

    def test_skips_quiz_missing_title_or_topic(self, quiz_env, monkeypatch, capsys):
        gqi, quiz_dir, tmp_path, _ = quiz_env
        (quiz_dir / "broken.json").write_text(json.dumps({"title": "No Topic"}), encoding="utf-8")
        run_main(gqi, monkeypatch)

        assert read_index(tmp_path)["Quizzes"] == []
        assert "SKIP broken.json" in capsys.readouterr().out

    def test_true_duplicate_same_title_and_topic_is_skipped(self, quiz_env, monkeypatch, capsys):
        gqi, quiz_dir, tmp_path, _ = quiz_env
        write_quiz(quiz_dir, "vpc-basics-a", title="VPC Basics", topic="VPC")
        write_quiz(quiz_dir, "vpc-basics-b", title="VPC Basics", topic="VPC")
        run_main(gqi, monkeypatch)

        items = read_index(tmp_path)["Quizzes"]
        assert len(items) == 1  # first file wins, second skipped
        assert "duplicate quiz" in capsys.readouterr().out

    def test_same_title_different_topic_is_not_a_duplicate(self, quiz_env, monkeypatch):
        gqi, quiz_dir, tmp_path, _ = quiz_env
        write_quiz(quiz_dir, "ec2-fundamentals", title="Fundamentals", topic="EC2")
        write_quiz(quiz_dir, "s3-fundamentals", title="Fundamentals", topic="S3")
        run_main(gqi, monkeypatch)

        items = read_index(tmp_path)["Quizzes"]
        assert len(items) == 2


class TestCalculateQuizTime:
    """PY-1: question-count-based time estimate, the quiz equivalent of
    generate_notes.py's calculate_read_time()."""

    def test_exact_computed_value_20_questions(self, quiz_env):
        gqi, *_ = quiz_env
        result = gqi.calculate_quiz_time(20, seconds_per_question=45)
        assert result == {"question_count": 20, "estimated_minutes": 15}

    def test_zero_questions_returns_minimum_one_minute(self, quiz_env):
        gqi, *_ = quiz_env
        result = gqi.calculate_quiz_time(0, seconds_per_question=45)
        assert result["estimated_minutes"] == 1

    def test_one_question_returns_minimum_one_minute(self, quiz_env):
        gqi, *_ = quiz_env
        result = gqi.calculate_quiz_time(1, seconds_per_question=45)
        assert result["estimated_minutes"] == 1

    def test_uses_module_default_seconds_per_question(self, quiz_env):
        gqi, *_ = quiz_env
        result = gqi.calculate_quiz_time(20)
        assert result == {"question_count": 20, "estimated_minutes": 15}


class TestQuizIndexEstimatedMinutes:
    """PY-1: quiz-index.json entries carry questionCount/estimatedMinutes."""

    def test_entry_carries_question_count_and_estimated_minutes(self, quiz_env, monkeypatch):
        gqi, quiz_dir, tmp_path, _ = quiz_env
        write_quiz(quiz_dir, "vpc-basics", question_count=20)
        run_main(gqi, monkeypatch)

        items = read_index(tmp_path)["Quizzes"]
        assert items[0]["questionCount"] == 20
        assert items[0]["estimatedMinutes"] == 15

    def test_zero_question_quiz_never_reports_zero_minutes(self, quiz_env, monkeypatch):
        gqi, quiz_dir, tmp_path, _ = quiz_env
        write_quiz(quiz_dir, "empty-quiz", question_count=0)
        run_main(gqi, monkeypatch)

        items = read_index(tmp_path)["Quizzes"]
        assert items[0]["questionCount"] == 0
        assert items[0]["estimatedMinutes"] == 1


class TestQuizIndexSitemapUrlShape:
    """T5-2 (2026-07-26): /quiz/<stem>, not quiz.html?quiz=<stem>."""

    def test_adds_clean_path_quiz_url(self, quiz_env, monkeypatch):
        gqi, quiz_dir, tmp_path, sitemap_utils = quiz_env
        write_quiz(quiz_dir, "vpc-basics")
        run_main(gqi, monkeypatch)

        urls = sitemap_utils.load_sitemap()
        locs = {u["loc"] for u in urls}
        assert any(loc.rstrip("/").endswith("/quiz/vpc-basics") for loc in locs)
        assert not any("quiz.html?quiz=" in loc for loc in locs)

    def test_prunes_orphaned_quiz_url_when_source_json_removed(self, quiz_env, monkeypatch):
        gqi, quiz_dir, tmp_path, sitemap_utils = quiz_env
        write_quiz(quiz_dir, "vpc-basics")
        run_main(gqi, monkeypatch)
        assert any(
            u["loc"].rstrip("/").endswith("/quiz/vpc-basics")
            for u in sitemap_utils.load_sitemap()
        )

        (quiz_dir / "vpc-basics.json").unlink()
        run_main(gqi, monkeypatch)

        urls_after = sitemap_utils.load_sitemap()
        assert not any(
            u["loc"].rstrip("/").endswith("/quiz/vpc-basics") for u in urls_after
        )

    def test_prune_does_not_remove_unrelated_clean_path_entries(self, quiz_env, monkeypatch):
        """Regression guard: pruning matches on the /quiz/ prefix -- an
        unrelated /quiz/other-quiz entry whose JSON still exists must
        survive a run that removes a different quiz."""
        gqi, quiz_dir, tmp_path, sitemap_utils = quiz_env
        write_quiz(quiz_dir, "vpc-basics")
        write_quiz(quiz_dir, "iam-basics", title="IAM Basics", topic="IAM")
        run_main(gqi, monkeypatch)

        (quiz_dir / "vpc-basics.json").unlink()
        run_main(gqi, monkeypatch)

        urls = sitemap_utils.load_sitemap()
        locs = {u["loc"].rstrip("/") for u in urls}
        assert any(loc.endswith("/quiz/iam-basics") for loc in locs)
        assert not any(loc.endswith("/quiz/vpc-basics") for loc in locs)

    def test_rebuild_starts_sitemap_from_scratch(self, quiz_env, monkeypatch):
        gqi, quiz_dir, tmp_path, sitemap_utils = quiz_env
        sitemap_utils.write_sitemap([
            {"loc": "https://namrata2709.github.io/ResourcesV2/quiz/stale-quiz",
             "lastmod": "2020-01-01", "changefreq": "monthly", "priority": "0.7"}
        ])
        run_main(gqi, monkeypatch, rebuild=True)

        locs = {u["loc"] for u in sitemap_utils.load_sitemap()}
        assert not any("stale-quiz" in loc for loc in locs)
