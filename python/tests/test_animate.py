"""
test_animate.py

First test coverage for utils/animate.py, added alongside T1-4
(standardize DSA animation theming across light/dark/comfort).

Scope: build_animation_html()'s theme-bootstrap output specifically —
the piece T1-4 actually changed. Not exercising extract_animation_block()/
build_input_panel()/run() end-to-end; that's a separate, bigger effort
(same "not attempted here" scoping test_generate_notes.py's own header
comment already applies to this pipeline).
"""

import re

import pytest

from utils import animate


def _sample_anim(**overrides):
    anim = {
        "type": "array",
        "input_boxes": [],
        "defaults": {},
        "js_code": "function computeSteps() { return []; }",
    }
    anim.update(overrides)
    return anim


def _render(title="Merge Sort"):
    fm = {"title": title, "slug": "merge-sort"}
    return animate.build_animation_html(fm, _sample_anim())


# ── T1-4: theme bootstrap script ────────────────────────────────────────

def test_reads_the_same_localstorage_theme_key_as_the_rest_of_the_site():
    html = _render()
    # Same key lib/theme.ts's STORAGE_KEY uses ("theme"), not a
    # differently-named/parallel channel.
    assert 'localStorage.getItem("theme")' in html


def test_sets_data_theme_on_the_document_element():
    html = _render()
    assert 'document.documentElement.setAttribute("data-theme"' in html


def test_recognizes_all_three_themes():
    html = _render()
    for theme in ("light", "dark", "comfort"):
        assert f'"{theme}"' in html


def test_defaults_to_light_and_fails_silently_on_storage_errors():
    html = _render()
    assert 'var theme = "light";' in html
    # Matches lib/theme.ts's getSavedTheme() try/catch-and-fall-back-silently
    # contract (private browsing / storage disabled shouldn't throw).
    assert "try {" in html and "catch (e)" in html


def test_theme_script_runs_before_the_linked_stylesheet():
    html = _render()
    # Must run (and therefore set data-theme) before animation-core.css
    # is applied, or there's a flash of the wrong theme on load.
    theme_script_pos = html.index('localStorage.getItem("theme")')
    stylesheet_pos = html.index("animation-core.css")
    assert theme_script_pos < stylesheet_pos


# ── T1-4: inlined theme CSS variables ───────────────────────────────────

@pytest.mark.parametrize("theme", ["light", "dark", "comfort"])
def test_each_theme_block_is_present(theme):
    html = _render()
    assert f'[data-theme="{theme}"]' in html


def test_theme_variable_names_match_the_react_app(theme_vars=(
    "--bg-primary", "--bg-secondary", "--bg-card",
    "--text-primary", "--text-secondary", "--text-muted",
    "--border-color", "--shadow",
    "--primary", "--primary-hover", "--accent", "--accent-hover",
)):
    html = _render()
    for var in theme_vars:
        assert var in html, f"missing {var} — should match web/web/src/index.css"


def test_dark_theme_values_match_index_css_exactly():
    html = _render()
    # Spot-check a few real values from web/web/src/index.css's
    # [data-theme='dark'] block, not just that the variable names exist.
    dark_block_match = re.search(
        r'\[data-theme="dark"\]\s*\{([^}]+)\}', html
    )
    assert dark_block_match, "no [data-theme=\"dark\"] block found"
    dark_block = dark_block_match.group(1)
    assert "--bg-primary: #0b1330;" in dark_block
    assert "--text-primary: #fff9ee;" in dark_block


# ── Unrelated existing behavior — confirm the T1-4 change didn't disturb it ──

def test_title_and_renderer_type_still_present():
    html = _render(title="Binary Search")
    assert "Binary Search" in html
    assert 'data-renderer="array"' in html


def test_computeSteps_js_code_still_inlined():
    html = _render()
    assert "function computeSteps() { return []; }" in html
