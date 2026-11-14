"""
test_body_prose_extraction.py

Covers extract_body_prose()/write_body_prose_json() (T5-2, 2026-07-26)
and their wiring into parse_md_body(). Two things matter equally here:

  1. The JSON extractor produces correct structured data for each block
     type named in the ticket (headings, callouts, collapsibles,
     references, summary/takeaways, exam-highlights, YouTube embeds,
     inline images) -- plus lists/tables/code as prerequisites the
     line-based walker needs to handle correctly to get anything else
     right.
  2. Wiring the extractor into parse_md_body() has NOT changed the real
     HTML output -- exercised here via a full parse_md_body() call
     (previously untested end-to-end by this suite at all; see this
     file's own regression note below), asserting the same HTML markers
     the pre-existing convert_sections()/expand_*() functions have
     always produced.
"""

import json

import pytest

import generate_notes as gn


SAMPLE_BODY = """## Getting Started {#getting-started}

EC2 provides !!resizable!! compute capacity. //It scales// to your needs.
This is a **KeyTerm** you must remember. ==This whole sentence matters for the exam.==

- First bullet with `inline code`
- Second bullet

1. Step one
2. Step two

| Instance | vCPU |
|----------|------|
| t2.micro | 1    |
| t2.small | 1    |

[note]
Remember to stop unused instances.
[/note]

[collapsible-section o]
## Advanced Topics

Nested content lives here.

### Nested Subsection

Deeper content.
[/collapsible-section]

[collapsible-section]
## Links & References

[ref]
text: AWS EC2 Documentation
url: https://docs.aws.amazon.com/ec2/
[/ref]
[/collapsible-section]

[takeaways]
- Takeaway one
- Takeaway two
[/takeaways]

[youtube]
title: EC2 Deep Dive
channel: AWS Training
url: https://youtube.com/watch?v=abc123
level: intermediate
why: Great overview of instance types
[/youtube]

[image:ec2-diagram.png|EC2 architecture diagram]
"""


class TestExtractBodyProse:
    def test_extracts_headings_with_ids_and_runs(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        heading = next(b for b in blocks if b["type"] == "heading")
        assert heading["level"] == 2
        assert heading["id"] == "getting-started"
        assert heading["text"][0]["text"] == "Getting Started"

    def test_extracts_paragraph_runs_with_marks(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        para = next(
            b for b in blocks
            if b["type"] == "paragraph" and any(r["mark"] == "bold" for r in b["runs"])
        )
        marks = {r["mark"] for r in para["runs"]}
        assert "bold" in marks       # !!resizable!!
        assert "italic" in marks     # //It scales//

    def test_extracts_exam_highlight_term_and_sentence(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        term_para = next(
            b for b in blocks
            if b["type"] == "paragraph" and any(r["mark"] == "examTerm" for r in b["runs"])
        )
        term_run = next(r for r in term_para["runs"] if r["mark"] == "examTerm")
        assert term_run["text"] == "KeyTerm"

        sentence_para = next(
            b for b in blocks
            if b["type"] == "paragraph" and any(r["mark"] == "examSentence" for r in b["runs"])
        )
        sentence_run = next(r for r in sentence_para["runs"] if r["mark"] == "examSentence")
        assert sentence_run["text"] == "This whole sentence matters for the exam."

    def test_extracts_unordered_and_ordered_lists_separately(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        ul = next(b for b in blocks if b["type"] == "list" and not b["ordered"])
        ol = next(b for b in blocks if b["type"] == "list" and b["ordered"])
        assert len(ul["items"]) == 2
        assert len(ol["items"]) == 2
        # inline code inside a list item is still tokenized as a run
        code_run = next(r for r in ul["items"][0] if r["mark"] == "code")
        assert code_run["text"] == "inline code"

    def test_extracts_table_headers_and_rows(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        table = next(b for b in blocks if b["type"] == "table")
        assert table["headers"] == ["Instance", "vCPU"]
        assert len(table["rows"]) == 2
        assert table["rows"][0][0][0]["text"] == "t2.micro"

    def test_extracts_callout_with_kind_and_runs(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        callout = next(b for b in blocks if b["type"] == "callout")
        assert callout["kind"] == "note"
        assert "stop unused instances" in callout["runs"][0]["text"]

    def test_extracts_collapsible_with_nested_children_and_open_flag(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        collapsible = next(b for b in blocks if b["type"] == "collapsible")
        assert collapsible["open"] is True
        assert collapsible["heading"] == "Advanced Topics"
        assert collapsible["level"] == 2

        child_para = next(c for c in collapsible["children"] if c["type"] == "paragraph")
        assert "Nested content lives here" in child_para["runs"][0]["text"]

        nested_heading = next(c for c in collapsible["children"] if c["type"] == "heading")
        assert nested_heading["level"] == 3
        assert nested_heading["text"][0]["text"] == "Nested Subsection"

    def test_extracts_references_list(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        # Nested inside the "Links & References" collapsible in the
        # fixture (matches real note structure -- expand_references()'s
        # own regex requires that wrapping heading to render at all).
        collapsible = next(
            b for b in blocks
            if b["type"] == "collapsible" and b["heading"] == "Links & References"
        )
        refs = next(c for c in collapsible["children"] if c["type"] == "references")
        assert refs["items"] == [
            {"text": "AWS EC2 Documentation", "url": "https://docs.aws.amazon.com/ec2/"}
        ]

    def test_extracts_takeaways_items(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        takeaways = next(b for b in blocks if b["type"] == "takeaways")
        assert len(takeaways["items"]) == 2
        assert takeaways["items"][0][0]["text"] == "Takeaway one"

    def test_extracts_youtube_fields(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        yt = next(b for b in blocks if b["type"] == "youtube")
        assert yt["title"] == "EC2 Deep Dive"
        assert yt["channel"] == "AWS Training"
        assert yt["url"] == "https://youtube.com/watch?v=abc123"
        assert yt["level"] == "intermediate"

    def test_extracts_inline_image(self):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        img = next(b for b in blocks if b["type"] == "image")
        assert img["filename"] == "ec2-diagram.png"
        assert img["caption"] == "EC2 architecture diagram"

    def test_does_not_mutate_the_input_string(self):
        original = SAMPLE_BODY
        gn.extract_body_prose(SAMPLE_BODY)
        assert SAMPLE_BODY == original  # str immutability guarantee, asserted explicitly

    def test_code_tabs_captured_opaquely_not_expanded(self):
        body = "<code-tabs>\n```python\nprint(1)\n```\n</code-tabs>\n"
        blocks = gn.extract_body_prose(body)
        assert any(b["type"] == "code_tabs_raw" for b in blocks), (
            "code-tabs is T5-3b's territory -- must not silently vanish, "
            "and must not be expanded here either"
        )

    def test_fenced_code_block_captured_as_code_type(self):
        body = "```python\nprint('hi')\n```\n"
        blocks = gn.extract_body_prose(body)
        code = next(b for b in blocks if b["type"] == "code")
        assert code["lang"] == "python"
        assert "print('hi')" in code["code"]

    def test_stash_blocks_nested_inside_a_collapsible_resolve_correctly(self):
        """Regression test for a real bug found and fixed during T5-2:
        callout/youtube/ref/takeaways/image blocks living INSIDE a
        [collapsible-section] must resolve to real structured data
        inside that collapsible's own children, not leak a raw
        placeholder-key string (or worse, silently vanish) because the
        outer scope's stash pass ran across the whole text before
        collapsible boundaries were respected."""
        body = (
            "[collapsible-section]\n"
            "## Nested Section\n"
            "[note]\nDon't forget this.\n[/note]\n"
            "[/collapsible-section]\n"
        )
        blocks = gn.extract_body_prose(body)
        collapsible = next(b for b in blocks if b["type"] == "collapsible")
        callout = next(c for c in collapsible["children"] if c["type"] == "callout")
        assert callout["kind"] == "note"
        assert "Don't forget this" in callout["runs"][0]["text"]
        # No stray control-character placeholder text anywhere in the tree.
        assert "\x00" not in json.dumps(blocks)

    def test_every_block_at_every_nesting_level_gets_a_blockid(self):
        """P1-1: generate_notes.py must actually stamp blockId -- this
        was previously claimed by a comment in types.ts but never
        implemented (zero blockId/block_id hits anywhere in this file).
        Every block reachable from the fixture, at every nesting depth
        (including inside a [collapsible-section] and its own nested
        [ref] block), must carry a non-empty string blockId."""
        blocks = gn.extract_body_prose(SAMPLE_BODY)

        def all_blocks(block_list):
            for b in block_list:
                yield b
                if b["type"] == "collapsible":
                    yield from all_blocks(b["children"])

        collected = list(all_blocks(blocks))
        assert len(collected) > 5, "fixture should exercise multiple block types/levels"
        for b in collected:
            assert "blockId" in b, f"block missing blockId: {b.get('type')}"
            assert isinstance(b["blockId"], str) and b["blockId"], (
                f"blockId must be a non-empty string: {b.get('type')}"
            )

    def test_blockids_are_unique_and_sequential_in_document_order(self):
        """Sequential in document order, shared across the whole
        recursive walk -- a parent collapsible numbers lower than every
        one of its own children, and no id repeats anywhere in the tree."""
        blocks = gn.extract_body_prose(SAMPLE_BODY)

        def all_blocks(block_list):
            for b in block_list:
                yield b
                if b["type"] == "collapsible":
                    yield from all_blocks(b["children"])

        collected = list(all_blocks(blocks))
        ids = [b["blockId"] for b in collected]
        assert len(ids) == len(set(ids)), "blockId values must be unique across the whole document"

        collapsible = next(b for b in blocks if b["type"] == "collapsible")
        parent_n = int(collapsible["blockId"].rsplit("-", 1)[1])
        for child in collapsible["children"]:
            child_n = int(child["blockId"].rsplit("-", 1)[1])
            assert parent_n < child_n, (
                "a collapsible's own blockId must number lower than its children's"
            )

    def test_blockids_are_stable_across_two_regenerations_of_identical_markdown(self):
        """The real stability contract this ticket promises: regenerating
        from the SAME markdown twice produces identical blockIds -- not
        randomized, not content-hashed, purely positional."""
        first = gn.extract_body_prose(SAMPLE_BODY)
        second = gn.extract_body_prose(SAMPLE_BODY)

        def ids(block_list):
            out = []
            for b in block_list:
                out.append(b["blockId"])
                if b["type"] == "collapsible":
                    out.extend(ids(b["children"]))
            return out

        assert ids(first) == ids(second)

    def test_two_levels_of_nested_collapsibles_both_resolve(self):
        body = (
            "[collapsible-section o]\n"
            "## Outer\n"
            "[collapsible-section]\n"
            "### Inner\n"
            "Inner paragraph text.\n"
            "[/collapsible-section]\n"
            "[/collapsible-section]\n"
        )
        blocks = gn.extract_body_prose(body)
        outer = next(b for b in blocks if b["type"] == "collapsible")
        assert outer["heading"] == "Outer"
        assert outer["open"] is True
        inner = next(c for c in outer["children"] if c["type"] == "collapsible")
        assert inner["heading"] == "Inner"
        assert inner["level"] == 3
        inner_para = next(c for c in inner["children"] if c["type"] == "paragraph")
        assert "Inner paragraph text" in inner_para["runs"][0]["text"]


class TestWriteBodyProseJson:
    def test_writes_json_file_with_blocks_key(self, tmp_path):
        blocks = gn.extract_body_prose(SAMPLE_BODY)
        gn.write_body_prose_json(blocks, str(tmp_path))
        out_path = tmp_path / "json" / "body-prose.json"
        assert out_path.exists()
        data = json.loads(out_path.read_text(encoding="utf-8"))
        assert data["blocks"] == blocks


class TestParseMdBodyIntegration:
    """
    Exercises parse_md_body() end-to-end -- previously not covered by
    this test suite at all (test_generate_notes.py's own header says so
    explicitly). This is the actual regression check that wiring the new
    extractor into parse_md_body() left the real HTML pipeline alone:
    the same convert_sections()/expand_*() functions run exactly as
    before (untouched by this ticket), so their output here is the
    expected functional result, not a snapshot copy.
    """

    def test_returns_normal_html_and_also_writes_body_prose_json(self, tmp_path):
        fm = {"_output_dir": str(tmp_path), "slug": "ec2-fundamentals"}
        html = gn.parse_md_body(SAMPLE_BODY, fm, subject="aws")

        # Existing HTML pipeline still runs and produces real HTML.
        assert '<h2 id="getting-started">Getting Started</h2>' in html
        assert "<strong>resizable</strong>" in html
        assert "<em>It scales</em>" in html
        assert '<span class="exam-highlight-term"' in html
        assert '<span class="exam-highlight-sentence">' in html
        assert "<details" in html and "Advanced Topics" in html
        assert '<div class="info-box">' in html  # [note] callout
        assert "docs.aws.amazon.com" in html      # [ref]
        assert "Key Takeaways" in html             # [takeaways]
        assert "EC2 Deep Dive" in html              # [youtube]
        assert "ec2-diagram.png" in html            # [image:...]

        # New side effect: body-prose.json also written, same output_dir.
        out_path = tmp_path / "json" / "body-prose.json"
        assert out_path.exists()
        data = json.loads(out_path.read_text(encoding="utf-8"))
        assert len(data["blocks"]) > 0
        assert any(b["type"] == "heading" for b in data["blocks"])
        assert any(b["type"] == "collapsible" for b in data["blocks"])

    def test_body_prose_json_heading_ids_match_the_real_html_heading_ids(self, tmp_path):
        """The extractor's own used_ids set is independent of the real
        pipeline's page_used_ids -- this proves they still land on
        identical ids given identical input, so a React page rendering
        from the JSON can link to the same #anchor the vanilla HTML page
        uses."""
        fm = {"_output_dir": str(tmp_path), "slug": "ec2-fundamentals"}
        html = gn.parse_md_body(SAMPLE_BODY, fm, subject="aws")
        data = json.loads((tmp_path / "json" / "body-prose.json").read_text(encoding="utf-8"))

        json_heading = next(b for b in data["blocks"] if b["type"] == "heading")
        assert f'id="{json_heading["id"]}"' in html

    def test_dsa_subject_also_produces_body_prose_json(self, tmp_path):
        """Confirms the extractor works on the DSA subject branch too --
        not just AWS. DSA-specific [animation] blocks are stripped
        before this point (untouched by this ticket); ordinary body
        prose alongside them should extract normally."""
        body = (
            "[animation]\nsome animation config, not reader prose\n[/animation]\n\n"
            "## Two-Pointer Technique\n\n"
            "This pattern uses !!two indices!! moving toward each other.\n"
        )
        fm = {"_output_dir": str(tmp_path), "slug": "two-pointer"}
        html = gn.parse_md_body(body, fm, subject="dsa")

        assert '<h2 id="two-pointer-technique">Two-Pointer Technique</h2>' in html
        assert "some animation config" not in html  # [animation] correctly stripped

        data = json.loads((tmp_path / "json" / "body-prose.json").read_text(encoding="utf-8"))
        heading = next(b for b in data["blocks"] if b["type"] == "heading")
        assert heading["text"][0]["text"] == "Two-Pointer Technique"
        # [animation] block must not leak into body-prose JSON either --
        # it was stripped before extract_body_prose() ever saw the text.
        assert "some animation config" not in json.dumps(data)
