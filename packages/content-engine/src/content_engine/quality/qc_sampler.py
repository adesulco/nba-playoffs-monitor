"""QC sampling gate — decide whether an article gets the Opus 4.7
editorial review pass.

Phase 2 ship #19. Per CLAUDE.md agent table: "10% sample editorial
check". Default sample rate is 10% — adjustable via env var
``QC_SAMPLE_RATE`` (0.0-1.0).

Sampling is DETERMINISTIC by slug — same slug always either gets
QC or doesn't. This makes regeneration reproducible (a regen of the
same article won't surprise the editor by showing/hiding QC) AND
keeps the sampler cheap (no random number state to manage).

Usage from a CLI command::

    from content_engine.quality import qc_sampler
    qc_review = await qc_sampler.maybe_review(
        slug=article_slug, type_="recap",
        body_md=body, source_context=source_ctx, title=title,
    )
    # qc_review is None when not sampled, or a QcReport when reviewed.
    if qc_review:
        frontmatter["qc_review"] = qc_review.to_frontmatter()
"""

from __future__ import annotations

import hashlib
import os
from typing import Any

import structlog

from content_engine.agents import qc as qc_agent

log = structlog.get_logger()


def _sample_rate() -> float:
    """Read the env var with bounds-clamping.

    Default 0.10 = 10% per CLAUDE.md. Set ``QC_SAMPLE_RATE=0`` to
    disable QC entirely (e.g. dry-run mode that should be free).
    Set ``QC_SAMPLE_RATE=1`` to QC every article (debugging).
    """
    raw = os.environ.get("QC_SAMPLE_RATE", "0.10")
    try:
        v = float(raw)
    except ValueError:
        return 0.10
    if v < 0:
        return 0.0
    if v > 1:
        return 1.0
    return v


def is_sampled(slug: str) -> bool:
    """Return True iff this slug falls in the sample.

    Hash the slug to a number in [0, 1000), compare to
    sample_rate * 1000. Deterministic per slug — same input always
    same output, which means a regen of an existing article gets the
    same sampling decision (no surprise QC reviews appearing on
    re-runs).
    """
    rate = _sample_rate()
    if rate <= 0:
        return False
    if rate >= 1:
        return True
    # Hash → 0..999
    h = hashlib.sha256(slug.encode("utf-8")).hexdigest()
    bucket = int(h[:6], 16) % 1000
    return bucket < int(rate * 1000)


async def maybe_review(
    *,
    slug: str,
    type_: str,
    body_md: str,
    source_context: str | None = None,
    title: str | None = None,
) -> qc_agent.QcReport | None:
    """If the slug is sampled, run the Opus QC pass and return the
    report. Otherwise return None.
    """
    if not is_sampled(slug):
        log.info("qc_sampler.skip", slug=slug, sample_rate=_sample_rate())
        return None
    log.info("qc_sampler.run", slug=slug, sample_rate=_sample_rate())
    try:
        return await qc_agent.review(
            body_md, article_type=type_,
            source_context=source_context, title=title,
        )
    except Exception as exc:  # noqa: BLE001
        # QC is advisory — never block publish on a QC error. Log it
        # so it surfaces in the cron log + return None so the CLI
        # writes the article without a qc_review field.
        log.warning("qc_sampler.failed", slug=slug, error=str(exc))
        return None
