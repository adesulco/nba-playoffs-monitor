"""Anthropic SDK wrapper.

Single chokepoint for every API call. Per ``CLAUDE.md`` non-negotiable rule
"Voice rules are sacred": every agent call routes through here so prompt
caching, voice-rules context, and budget enforcement happen consistently.

Phase 0: bare-minimum wrapper, prompt caching enabled by default, no actual
agent logic yet (writers land Phase 1). What this file gives us today:

  * ``client`` — module-level lazy AsyncAnthropic instance
  * ``cached_system(text)`` — wraps a system prompt block with the cache
    breakpoint that Anthropic's prompt caching needs
  * ``run_messages(...)`` — thin send wrapper that records token spend in
    ``ce_article_runs`` (Phase 1 will use it; Phase 0 can call it for ad-hoc
    eval)
  * ``check_budget(agent)`` — fetches today's spend for an agent and raises
    ``BudgetExceededError`` if over ``settings.daily_token_budget_usd``

Per spec § 5.1: caching gives 90% off cached input tokens. The voice-rules.md
text + system prompt = ~3K stable tokens; caching them brings per-call
overhead to near-zero.
"""

from __future__ import annotations

from typing import Any

import structlog
from anthropic import AsyncAnthropic
from anthropic.types import MessageParam

from content_engine.config import settings

log = structlog.get_logger()


# Lazy module-level client — instantiated on first use so import cost is
# zero for callers that only need the helper functions (e.g. cached_system
# from a unit test).
_client: AsyncAnthropic | None = None


def get_client() -> AsyncAnthropic:
    """Return the shared AsyncAnthropic instance.

    Singleton because the SDK manages its own connection pool internally
    and there's no benefit to multiple instances per process.
    """
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


class BudgetExceededError(RuntimeError):
    """Raised when an agent's daily token spend hits the configured cap.

    Per ``CLAUDE.md`` non-negotiable rule "Cost cap is enforced": when this
    fires, the agent halts for the rest of the UTC day. No silent degrade.
    """


def cached_system(text: str) -> list[dict[str, Any]]:
    """Wrap a system prompt with the cache breakpoint.

    Anthropic's prompt caching requires the cache marker to be on the
    LAST block of the cached content. We always cache the system prompt
    (voice rules + agent system instructions) since those are stable
    across calls — that's the 90% cache hit rate we expect.

    Returns a single content block with ``cache_control: {type: 'ephemeral'}``.
    Caller passes the result as ``system=...`` to ``messages.create``.

    Example::

        from content_engine.prompts import load_voice_rules, load_preview_system

        voice = load_voice_rules()
        agent = load_preview_system()
        system = cached_system(voice + "\\n\\n" + agent)

        msg = await client.messages.create(
            model=settings.model_narrative,
            max_tokens=1500,
            system=system,
            messages=[{"role": "user", "content": fixture_block}],
        )
    """
    block: dict[str, Any] = {"type": "text", "text": text}
    if settings.enable_prompt_cache:
        block["cache_control"] = {"type": "ephemeral"}
    return [block]


async def run_messages(
    *,
    agent: str,
    model: str,
    system: list[dict[str, Any]] | str,
    messages: list[MessageParam],
    max_tokens: int = 2000,
    extra_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Send a Messages request, record cost in ``ce_article_runs``, return result.

    ``agent`` is a string label used for budget tracking + logs:
    ``preview-writer`` / ``recap-writer`` / ``standings-explainer`` /
    ``profile-writer`` / ``race-writer`` / ``qc-reviewer`` / ``voice-linter`` /
    ``fact-validator``.

    Phase 0: the function is callable but ``ce_article_runs`` insertion is
    deferred to Phase 1 (writers don't run yet). The budget check IS active
    so any ad-hoc Phase 0 calls already participate.
    """
    await check_budget(agent)

    client = get_client()
    log.info("anthropic.request", agent=agent, model=model, max_tokens=max_tokens)

    response = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,  # type: ignore[arg-type]  # SDK accepts str | list of blocks
        messages=messages,
    )

    usage = response.usage
    cost_usd = _cost_estimate(
        model=model,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        cache_creation=getattr(usage, "cache_creation_input_tokens", 0) or 0,
        cache_read=getattr(usage, "cache_read_input_tokens", 0) or 0,
    )

    log.info(
        "anthropic.response",
        agent=agent,
        model=model,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        cache_read=getattr(usage, "cache_read_input_tokens", 0) or 0,
        cost_usd=round(cost_usd, 4),
    )

    # Phase 1: persist to ce_article_runs so cumulative spend per agent per
    # day is queryable for the budget gate. Stub for now.
    _ = extra_metadata  # consumed when persistence lands

    return {
        "text": response.content[0].text if response.content else "",
        "stop_reason": response.stop_reason,
        "usage": {
            "input_tokens": usage.input_tokens,
            "output_tokens": usage.output_tokens,
            "cache_creation_input_tokens": getattr(usage, "cache_creation_input_tokens", 0) or 0,
            "cache_read_input_tokens": getattr(usage, "cache_read_input_tokens", 0) or 0,
            "cost_usd": cost_usd,
        },
    }


# ── Budget enforcement ─────────────────────────────────────────────────────


async def check_budget(agent: str) -> None:
    """Raise ``BudgetExceededError`` if today's spend for this agent ≥ cap.

    Looks at ``ce_article_runs`` filtered to the calling agent and the current
    UTC day. Phase 0 stub: returns without checking since no agents run yet.
    Phase 1 will query the table.
    """
    # Phase 0 stub. Wire to db.fetch_today_spend(agent) in Phase 1.
    _ = agent
    return


# ── Cost estimation ────────────────────────────────────────────────────────


# Per-model rates (USD per 1M tokens). Source: Anthropic pricing page Apr 2026.
# Cache-write priced at 1.25x base input (the cache-creation premium).
# Cache-read priced at 0.10x base input (the 90% off win).
_RATES = {
    # Sonnet 4.6: $3 / $15 per 1M input/output (standard).
    "claude-sonnet-4-6": {"in": 3.00, "out": 15.00},
    # Haiku 4.5: $0.25 / $1.25.
    "claude-haiku-4-5-20251001": {"in": 0.25, "out": 1.25},
    # Opus 4.7: $15 / $75.
    "claude-opus-4-7": {"in": 15.00, "out": 75.00},
}


def _cost_estimate(
    *,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_creation: int,
    cache_read: int,
) -> float:
    """Estimate cost in USD for a single Messages call.

    Cache reads are priced at 10% of base input (the 90% saving). Cache
    creation is priced at 125% of base input (the cache-write premium).
    Regular non-cached input is the remainder ``input_tokens`` figure
    excluding cache_creation + cache_read.
    """
    rate = _RATES.get(model)
    if not rate:
        log.warning("anthropic.cost.unknown_model", model=model)
        return 0.0

    base_in = max(0, input_tokens - cache_creation - cache_read)
    cost = (
        base_in * rate["in"] / 1_000_000
        + cache_creation * rate["in"] * 1.25 / 1_000_000
        + cache_read * rate["in"] * 0.10 / 1_000_000
        + output_tokens * rate["out"] / 1_000_000
    )
    return round(cost, 6)
