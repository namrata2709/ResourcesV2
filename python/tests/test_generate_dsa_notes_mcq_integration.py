"""
test_generate_dsa_notes_mcq_integration.py

T5-2 (2026-07-26): parse_mcq.py's schema unification was verified via
generate_notes.py's own call site and directly against parse_mcq.py's
own unit tests, but generate_dsa_notes.py calls the exact same
parse_mcq(inner, output_dir) function through its own, separately
implemented parse_md_body()/strip_data_section_wrapper() pipeline --
confirmed via source read to have an identical call site, but never
actually exercised end-to-end. This file closes that gap: proves the
DSA generator's real pipeline produces the same unified schema, not
just that the two source files look alike on paper.
"""

import json

import generate_dsa_notes as gdn

# Uses the bare [mcq]...[/mcq] fallback path (no <collapsible-section>
# wrapper) that strip_data_section_wrapper() supports specifically for
# cases like this -- a minimal, self-contained fixture, not a full
# instructions-compliant note body.
SAMPLE_BODY = """
Some intro prose about sorting algorithms.

[mcq]
q: Which sorting algorithm has O(n log n) worst-case time?
o: Bubble Sort | Merge Sort | Insertion Sort | Selection Sort
c: 1
e: Merge Sort guarantees O(n log n) in all cases due to its divide-and-conquer structure.
wA: Bubble Sort degrades to O(n^2) in the worst case.
w: The other options are also O(n^2) comparison sorts without Merge Sort's guaranteed balanced splits.
d: intermediate
[/mcq]
"""


class TestDsaGeneratorMcqIntegration:
    def test_parse_md_body_writes_unified_schema_mcq_json(self, tmp_path):
        fm = {"_output_dir": str(tmp_path)}
        html = gdn.parse_md_body(SAMPLE_BODY, fm)

        out_path = tmp_path / "json" / "mcq.json"
        assert out_path.exists()
        data = json.loads(out_path.read_text(encoding="utf-8"))

        q = data["questions"][0]
        assert set(q.keys()) >= {"id", "question", "multiSelect", "options"}
        assert "correctAnswer" not in q  # old shape must not leak through here either
        for opt in q["options"]:
            assert set(opt.keys()) >= {"id", "text", "isCorrect", "explanation"}
            assert "letter" not in opt
            assert "why" in opt["explanation"]

    def test_per_option_wA_override_and_shared_w_fallback_both_apply(self, tmp_path):
        """Same per-option explanation behavior parse_mcq.py's own unit
        tests cover in isolation -- confirmed here through the DSA
        generator's real call site, not assumed identical just because
        the function is shared."""
        fm = {"_output_dir": str(tmp_path)}
        gdn.parse_md_body(SAMPLE_BODY, fm)
        data = json.loads((tmp_path / "json" / "mcq.json").read_text(encoding="utf-8"))
        options = data["questions"][0]["options"]

        a = next(o for o in options if o["id"] == "A")
        assert a["explanation"]["why"] == "Bubble Sort degrades to O(n^2) in the worst case."  # wA override

        c = next(o for o in options if o["id"] == "C")
        d = next(o for o in options if o["id"] == "D")
        shared = "The other options are also O(n^2) comparison sorts without Merge Sort's guaranteed balanced splits."
        assert c["explanation"]["why"] == shared  # fell back to shared w
        assert d["explanation"]["why"] == shared

    def test_mcq_container_still_injected_into_html_unchanged(self, tmp_path):
        """The JSON schema change is additive -- the DSA generator's own
        HTML container injection (build_mcq_container(), untouched by
        T5-2) must still work exactly as before."""
        fm = {"_output_dir": str(tmp_path)}
        html = gdn.parse_md_body(SAMPLE_BODY, fm)
        assert '<h2 id="multiple-choice-questions">Multiple Choice Questions</h2>' in html
        assert "[mcq]" not in html
