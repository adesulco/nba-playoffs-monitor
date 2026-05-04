"""Unit tests for the Anthropic SDK wrapper.

Phase 0: tests that don't require a real network call. Cost estimation
math is the highest-leverage thing to lock down — getting it wrong
means the budget gate misfires.
"""

from __future__ import annotations

from content_engine.anthropic_client import _cost_estimate, cached_system


# ── cached_system ─────────────────────────────────────────────────────────


def test_cached_system_returns_block_with_cache_marker(monkeypatch):
    """Default config = caching enabled → block has cache_control."""
    blocks = cached_system("voice rules go here")
    assert isinstance(blocks, list)
    assert len(blocks) == 1
    assert blocks[0]["type"] == "text"
    assert blocks[0]["text"] == "voice rules go here"
    assert blocks[0]["cache_control"] == {"type": "ephemeral"}


def test_cached_system_skips_marker_when_caching_disabled(monkeypatch):
    """If a deployment forces enable_prompt_cache=false (e.g. for debugging),
    the cache_control block isn't emitted."""
    from content_engine import anthropic_client
    from content_engine.config import settings

    monkeypatch.setattr(settings, "enable_prompt_cache", False)
    blocks = anthropic_client.cached_system("voice rules go here")
    assert "cache_control" not in blocks[0]


# ── Cost estimation ───────────────────────────────────────────────────────


def test_cost_sonnet_no_cache():
    """Sonnet 4.6 standard call — 1k input, 500 output, no cache.

    1000 * 3 / 1M + 500 * 15 / 1M = 0.003 + 0.0075 = 0.0105 USD.
    """
    cost = _cost_estimate(
        model="claude-sonnet-4-6-20260415",
        input_tokens=1000,
        output_tokens=500,
        cache_creation=0,
        cache_read=0,
    )
    assert abs(cost - 0.0105) < 1e-6


def test_cost_sonnet_with_cache_read():
    """Sonnet 4.6 with 800/1000 input cached (the 90% saving case).

    Base in: 1000 - 0 - 800 = 200 tokens at $3/1M    = $0.0006
    Cache read: 800 tokens at $3*0.10 / 1M             = $0.00024
    Output: 500 tokens at $15/1M                       = $0.0075
    Total = $0.00834
    """
    cost = _cost_estimate(
        model="claude-sonnet-4-6-20260415",
        input_tokens=1000,
        output_tokens=500,
        cache_creation=0,
        cache_read=800,
    )
    expected = 200 * 3 / 1_000_000 + 800 * 3 * 0.10 / 1_000_000 + 500 * 15 / 1_000_000
    assert abs(cost - expected) < 1e-6


def test_cost_sonnet_with_cache_creation():
    """First call creates the cache (premium pricing) then subsequent reads
    benefit. The spec § 5.1 expects this to amortize fast (~3-5 calls)."""
    cost = _cost_estimate(
        model="claude-sonnet-4-6-20260415",
        input_tokens=1000,
        output_tokens=500,
        cache_creation=800,
        cache_read=0,
    )
    expected = 200 * 3 / 1_000_000 + 800 * 3 * 1.25 / 1_000_000 + 500 * 15 / 1_000_000
    assert abs(cost - expected) < 1e-6


def test_cost_haiku():
    """Haiku 4.5: $0.25 / $1.25 per 1M. Cheapest model — used for templated
    + voice lint."""
    cost = _cost_estimate(
        model="claude-haiku-4-5-20260415",
        input_tokens=2000,
        output_tokens=300,
        cache_creation=0,
        cache_read=0,
    )
    expected = 2000 * 0.25 / 1_000_000 + 300 * 1.25 / 1_000_000
    assert abs(cost - expected) < 1e-6


def test_cost_opus():
    """Opus 4.7: $15 / $75 per 1M. Used only for the 10% QC sample sweep —
    expensive, so the 10% rate ceiling is critical."""
    cost = _cost_estimate(
        model="claude-opus-4-7-20260415",
        input_tokens=2000,
        output_tokens=400,
        cache_creation=0,
        cache_read=0,
    )
    expected = 2000 * 15 / 1_000_000 + 400 * 75 / 1_000_000
    assert abs(cost - expected) < 1e-6


def test_cost_unknown_model_returns_zero():
    """Defensive: a model string not in _RATES (e.g. when pinning a new
    Claude version) returns 0 + logs a warning. Better to under-attribute
    than crash on a model bump."""
    cost = _cost_estimate(
        model="claude-some-future-model",
        input_tokens=1000,
        output_tokens=500,
        cache_creation=0,
        cache_read=0,
    )
    assert cost == 0.0
