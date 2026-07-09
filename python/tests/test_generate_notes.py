"""
test_generate_notes.py

First real test coverage for generate_notes.py — previously had none at
all, despite being the largest, most complex file in the pipeline (2000+
lines) and the one most directly modified across this thread (version-
info bar, read-time badge, section icons, the BASE_URL fix).

Scope: the functions built/touched directly in this thread, testable in
isolation without needing the full build_html()/parse_md_body() pipeline
(which would need every utils.parse_*/animate/parse_slides module wired
together end-to-end — a bigger, separate effort, not attempted here).
Not exhaustive of the whole file; a first real foothold, not full
coverage.
"""

import re

import pytest

import generate_notes as gn


# ── BASE_URL / SITE_BASE wiring (ticket T0-1) ───────────────────────────────

def test_base_url_comes_from_shared_site_config():
    from utils.site_config import BASE_URL as shared_base_url
    assert gn.BASE_URL == shared_base_url
    assert gn.BASE_URL == "https://namrata2709.github.io/ResourcesV2"


def test_site_base_has_trailing_slash_derived_from_base_url():
    assert gn.SITE_BASE == gn.BASE_URL + "/"


def test_type_config_urls_use_shared_base_url():
    for subject in ("aws", "dsa"):
        assert gn.TYPE_CONFIG[subject]["base_url"].startswith(gn.BASE_URL)
        assert "ResourcesV2" in gn.TYPE_CONFIG[subject]["base_url"]
        assert "/Resources/" not in gn.TYPE_CONFIG[subject]["base_url"], (
            "stale non-V2 domain should not appear anywhere in TYPE_CONFIG"
        )


# ── calculate_read_time() ───────────────────────────────────────────────────

def test_calculate_read_time_basic_word_count():
    html = "<p>" + " ".join(["word"] * 450) + "</p>"   # 450 words / 225 wpm = 2 min
    result = gn.calculate_read_time(html, wpm=225)
    assert result["word_count"] == 450
    assert result["read_time_minutes"] == 2


def test_calculate_read_time_excludes_script_and_style():
    html = (
        "<script>var x = 'this should not count as words at all here';</script>"
        "<style>.foo { color: red; not-real-words-either; }</style>"
        "<p>" + " ".join(["word"] * 225) + "</p>"
    )
    result = gn.calculate_read_time(html, wpm=225)
    assert result["word_count"] == 225, (
        f"expected only the <p> content counted, got {result['word_count']} words "
        f"— script/style content leaked into the count"
    )


def test_calculate_read_time_rounds_up_minimum_one_minute():
    html = "<p>just a few words here</p>"
    result = gn.calculate_read_time(html, wpm=225)
    assert result["read_time_minutes"] >= 1, "should never report 0 minutes for non-empty content"


def test_calculate_read_time_empty_content():
    result = gn.calculate_read_time("", wpm=225)
    assert result["word_count"] == 0


# ── build_version_info_bar() ────────────────────────────────────────────────

def test_version_info_bar_renders_all_three_fields():
    fm = {"version": "1.0", "status": "Current", "date_modified": "2026-06-14"}
    bar = gn.build_version_info_bar(fm)
    assert "1.0" in bar
    assert "June 14, 2026" in bar
    assert "✅" in bar and "Current" in bar
    assert 'class="version-info-bar"' in bar


def test_version_info_bar_empty_when_no_fields_set():
    assert gn.build_version_info_bar({}) == ""


def test_version_info_bar_falls_back_to_date_when_no_date_modified():
    fm = {"version": "2.0", "date": "2026-01-01"}
    bar = gn.build_version_info_bar(fm)
    assert "January 01, 2026" in bar


def test_version_info_bar_status_icon_for_outdated():
    bar = gn.build_version_info_bar({"status": "Outdated"})
    assert "⚠️" in bar


def test_version_info_bar_only_version_set():
    bar = gn.build_version_info_bar({"version": "3.1"})
    assert "3.1" in bar
    assert "Last Updated" not in bar
    assert "Status" not in bar


# ── build_read_time_badge() ──────────────────────────────────────────────────

def test_read_time_badge_renders_minutes():
    badge = gn.build_read_time_badge({"read_time_minutes": 5})
    assert "5 min read" in badge
    assert 'class="read-time-badge"' in badge


def test_read_time_badge_empty_when_zero_minutes():
    assert gn.build_read_time_badge({"read_time_minutes": 0}) == ""


def test_read_time_badge_empty_when_key_missing():
    assert gn.build_read_time_badge({}) == ""


# ── insert_after_title_block() ──────────────────────────────────────────────

def test_insert_after_title_and_date_paragraph():
    parsed = (
        '<h1>Test Title</h1>\n'
        '<p>📅 May 25, 2026</p>\n'
        '<p>Rest of content</p>'
    )
    result = gn.insert_after_title_block(parsed, "<div>INJECTED</div>")
    assert result.index("</h1>") < result.index("📅") < result.index("INJECTED") < result.index("Rest of content")


def test_insert_falls_back_to_after_h1_when_no_date_paragraph():
    parsed = '<h1>Test Title</h1>\n<p>No date emoji here</p>'
    result = gn.insert_after_title_block(parsed, "<div>INJECTED</div>")
    assert result.index("</h1>") < result.index("INJECTED") < result.index("No date emoji")


def test_insert_prepends_when_no_h1_at_all():
    """Matches real compliant-note behavior — per both instruction files,
    notes shouldn't have a body <h1> at all, so this fallback path is the
    one that actually runs in practice."""
    parsed = '<p>No heading in this note at all</p>'
    result = gn.insert_after_title_block(parsed, "<div>INJECTED</div>")
    assert result.index("INJECTED") < result.index("No heading")


def test_insert_returns_unchanged_when_injection_empty():
    parsed = '<h1>Title</h1><p>content</p>'
    assert gn.insert_after_title_block(parsed, "") == parsed


# ── Fixed-section icons ──────────────────────────────────────────────────────

def test_problems_container_has_icon():
    assert "🧩" in gn.build_problems_container()


def test_contest_container_has_icon():
    assert "🏆" in gn.build_contest_container()


def test_visual_mcq_container_has_icon():
    assert "🖼️" in gn.build_visual_mcq_container()


@pytest.mark.parametrize("builder,icon", [
    ("build_problems_container", "🧩"),
    ("build_contest_container", "🏆"),
    ("build_visual_mcq_container", "🖼️"),
])
def test_all_fixed_sections_have_a_collapsible_wrapper_and_icon(builder, icon):
    html = getattr(gn, builder)()
    assert 'class="collapsible-section"' in html
    assert icon in html
    assert "<summary><h2" in html
