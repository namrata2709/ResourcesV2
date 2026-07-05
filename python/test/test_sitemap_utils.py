"""
test_sitemap_utils.py — covers the shared add_url/remove_url/load_sitemap/
write_sitemap helpers every generator script depends on.
"""

import pytest


@pytest.fixture
def sitemap_module(tmp_path, monkeypatch):
    import utils.sitemap as sitemap_utils
    monkeypatch.setattr(sitemap_utils, "SITEMAP_FILE", str(tmp_path / "sitemap.xml"))
    return sitemap_utils


def test_add_url_appends_new(sitemap_module):
    urls = sitemap_module.add_url([], "https://example.com/a", priority="0.7")
    assert len(urls) == 1
    assert urls[0]["loc"] == "https://example.com/a"


def test_add_url_upserts_existing(sitemap_module):
    urls = sitemap_module.add_url([], "https://example.com/a", priority="0.5")
    urls = sitemap_module.add_url(urls, "https://example.com/a", priority="0.9")
    assert len(urls) == 1
    assert urls[0]["priority"] == "0.9"


def test_add_url_ignores_trailing_slash_difference(sitemap_module):
    urls = sitemap_module.add_url([], "https://example.com/a")
    urls = sitemap_module.add_url(urls, "https://example.com/a/", priority="0.9")
    assert len(urls) == 1, "trailing-slash variants should be treated as the same URL"


def test_remove_url(sitemap_module):
    urls = sitemap_module.add_url([], "https://example.com/a")
    urls = sitemap_module.remove_url(urls, "https://example.com/a")
    assert urls == []


def test_remove_url_missing_is_safe(sitemap_module):
    urls = sitemap_module.remove_url([], "https://example.com/does-not-exist")
    assert urls == []


def test_write_then_load_roundtrip(sitemap_module):
    urls = sitemap_module.add_url([], "https://example.com/a", priority="0.7")
    sitemap_module.write_sitemap(urls)
    loaded = sitemap_module.load_sitemap()
    assert len(loaded) == 1
    assert loaded[0]["loc"] == "https://example.com/a"


def test_load_missing_file_returns_empty(sitemap_module):
    assert sitemap_module.load_sitemap() == []
