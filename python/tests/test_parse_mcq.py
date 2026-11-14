"""
test_parse_mcq.py

Covers parse_mcq.py's unified notes-MCQ/quiz.json schema (T5-2,
2026-07-26): every option carries id/text/isCorrect/explanation.why,
matching the real quiz.json shape and the React QuestionCard's type
definitions -- not the old letter/correctAnswer/single-explanation
shape.
"""

import json

from utils.parse_mcq import parse_mcq, parse_mcq_block

VALID_BLOCK = """
q: Which AWS service provides object storage?
o: EC2|S3|RDS|Lambda
c: 1
e: S3 is purpose-built object storage.
w: The other services solve compute, relational-database, or serverless-function problems, not object storage.
d: intermediate
"""


class TestParseMcqBlock:
    def test_returns_unified_shape(self):
        q = parse_mcq_block(VALID_BLOCK, 1)
        assert q["id"] == 1
        assert q["question"] == "Which AWS service provides object storage?"
        assert q["multiSelect"] is False
        assert q["difficulty"] == "intermediate"
        assert "options" in q
        assert "correctAnswer" not in q  # old shape's top-level field must be gone
        assert "explanation" not in q     # old shape's top-level explanation must be gone

    def test_every_option_has_id_text_isCorrect_and_explanation_why(self):
        q = parse_mcq_block(VALID_BLOCK, 1)
        assert len(q["options"]) == 4
        for i, opt in enumerate(q["options"]):
            assert opt["id"] == ["A", "B", "C", "D"][i]
            assert isinstance(opt["text"], str) and opt["text"]
            assert isinstance(opt["isCorrect"], bool)
            assert "letter" not in opt  # old field name must be gone
            assert "why" in opt["explanation"]

    def test_exactly_one_option_is_correct_matching_the_c_index(self):
        q = parse_mcq_block(VALID_BLOCK, 1)
        correct = [o for o in q["options"] if o["isCorrect"]]
        assert len(correct) == 1
        assert correct[0]["id"] == "B"  # c: 1 -> index 1 -> B
        assert correct[0]["text"] == "S3"

    def test_correct_option_explanation_uses_e_field(self):
        q = parse_mcq_block(VALID_BLOCK, 1)
        correct = next(o for o in q["options"] if o["isCorrect"])
        assert correct["explanation"]["why"] == "S3 is purpose-built object storage."

    def test_every_wrong_option_gets_an_explanation_not_just_the_correct_one(self):
        """The unification's core requirement: every option has explanation.why,
        not just the correct one (the old schema only explained the correct
        answer)."""
        q = parse_mcq_block(VALID_BLOCK, 1)
        wrong = [o for o in q["options"] if not o["isCorrect"]]
        assert len(wrong) == 3
        for opt in wrong:
            assert opt["explanation"]["why"] == (
                "The other services solve compute, relational-database, "
                "or serverless-function problems, not object storage."
            )

    def test_wrong_option_explanation_falls_back_to_default_when_w_omitted(self):
        block = VALID_BLOCK.replace(
            "w: The other services solve compute, relational-database, or "
            "serverless-function problems, not object storage.\n",
            "",
        )
        q = parse_mcq_block(block, 1)
        wrong = [o for o in q["options"] if not o["isCorrect"]]
        for opt in wrong:
            assert opt["explanation"]["why"] == (
                "The other options describe related but distinct concepts."
            )

    def test_per_option_wX_field_wins_over_shared_w_for_that_letter(self):
        """T5-2 (2026-07-26): wA/wB/wC/wD let an author give a genuinely
        distinct explanation per wrong option, taking priority over the
        shared `w:` fallback for that specific letter only."""
        block = VALID_BLOCK + "wA: EC2 is compute, not storage.\nwD: Lambda is serverless compute, not storage.\n"
        q = parse_mcq_block(block, 1)
        by_id = {o["id"]: o for o in q["options"]}

        assert by_id["A"]["explanation"]["why"] == "EC2 is compute, not storage."
        assert by_id["D"]["explanation"]["why"] == "Lambda is serverless compute, not storage."
        # C has no wC field -- falls back to the shared `w:` text, same as before.
        assert by_id["C"]["explanation"]["why"] == (
            "The other services solve compute, relational-database, or "
            "serverless-function problems, not object storage."
        )

    def test_per_option_wX_field_works_even_without_a_shared_w_field(self):
        block = VALID_BLOCK.replace(
            "w: The other services solve compute, relational-database, or "
            "serverless-function problems, not object storage.\n",
            "",
        ) + "wA: EC2 is compute, not storage.\n"
        q = parse_mcq_block(block, 1)
        by_id = {o["id"]: o for o in q["options"]}

        assert by_id["A"]["explanation"]["why"] == "EC2 is compute, not storage."
        # C/D have neither wC/wD nor a shared w -- generic default fallback.
        assert by_id["C"]["explanation"]["why"] == (
            "The other options describe related but distinct concepts."
        )

    def test_pre_t5_2_blocks_with_only_shared_w_still_work_unchanged(self):
        """Backward-compatibility guard: every [mcq] block written before
        wA/wB/wC/wD existed only had `w:` -- must keep producing the same
        output it always did."""
        q = parse_mcq_block(VALID_BLOCK, 1)
        wrong = [o for o in q["options"] if not o["isCorrect"]]
        assert all(
            opt["explanation"]["why"] == (
                "The other services solve compute, relational-database, "
                "or serverless-function problems, not object storage."
            )
            for opt in wrong
        )

    def test_missing_required_field_returns_none(self):
        block = "q: Question?\no: A|B|C|D\nc: 0\nd: basic\n"  # missing e
        assert parse_mcq_block(block, 1) is None

    def test_wrong_option_count_returns_none(self):
        block = "q: Question?\no: A|B|C\nc: 0\ne: because.\nd: basic\n"
        assert parse_mcq_block(block, 1) is None

    def test_out_of_range_correct_index_returns_none(self):
        block = "q: Question?\no: A|B|C|D\nc: 5\ne: because.\nd: basic\n"
        assert parse_mcq_block(block, 1) is None

    def test_difficulty_mapping(self):
        for raw, expected in [
            ("beginner", "basic"),
            ("intermediate", "intermediate"),
            ("advanced", "advanced"),
            ("expert", "advanced"),
            ("nonsense", "basic"),
        ]:
            block = f"q: Q?\no: A|B|C|D\nc: 0\ne: because.\nd: {raw}\n"
            q = parse_mcq_block(block, 1)
            assert q["difficulty"] == expected


class TestParseMcq:
    def test_writes_json_mcq_file_with_unified_shape(self, tmp_path):
        body = f"Some prose.\n[mcq]{VALID_BLOCK}[/mcq]\nMore prose."
        remaining = parse_mcq(body, str(tmp_path))

        out_path = tmp_path / "json" / "mcq.json"
        assert out_path.exists()
        data = json.loads(out_path.read_text(encoding="utf-8"))
        assert len(data["questions"]) == 1
        q = data["questions"][0]
        assert q["options"][1]["isCorrect"] is True
        assert q["options"][1]["explanation"]["why"] == "S3 is purpose-built object storage."

        # [mcq] block stripped from the returned body.
        assert "[mcq]" not in remaining
        assert "Some prose." in remaining
        assert "More prose." in remaining

    def test_no_blocks_returns_body_unchanged_and_writes_nothing(self, tmp_path):
        body = "Just prose, no mcq blocks here."
        result = parse_mcq(body, str(tmp_path))
        assert result == body
        assert not (tmp_path / "json" / "mcq.json").exists()

    def test_multiple_blocks_get_sequential_ids(self, tmp_path):
        block2 = VALID_BLOCK.replace("Which AWS service", "Which other AWS service")
        body = f"[mcq]{VALID_BLOCK}[/mcq]\n[mcq]{block2}[/mcq]"
        parse_mcq(body, str(tmp_path))
        data = json.loads((tmp_path / "json" / "mcq.json").read_text(encoding="utf-8"))
        assert [q["id"] for q in data["questions"]] == [1, 2]

    def test_output_matches_real_quiz_json_shape(self, tmp_path):
        """Cross-check against the real quiz.json contract this schema was
        unified with -- every field the React QuizOption type requires
        must be present, and no old-shape field must leak through."""
        body = f"[mcq]{VALID_BLOCK}[/mcq]"
        parse_mcq(body, str(tmp_path))
        data = json.loads((tmp_path / "json" / "mcq.json").read_text(encoding="utf-8"))
        q = data["questions"][0]

        assert set(q.keys()) >= {"id", "question", "multiSelect", "options"}
        for opt in q["options"]:
            assert set(opt.keys()) >= {"id", "text", "isCorrect", "explanation"}
            assert "why" in opt["explanation"]
