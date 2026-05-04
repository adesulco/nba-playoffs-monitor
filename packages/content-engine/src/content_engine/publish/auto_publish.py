"""Auto-publish path — write ce_article_publishes row immediately when
the sport is in the auto-publish allowlist AND the article isn't
flagship.

Phase 1 ship #15. Same write the editor's `/api/approve` endpoint
performs, but invoked at generation time by the discovery script
running in GitHub Actions (where SUPABASE_SERVICE_ROLE_KEY is
available as a secret).

Doctrine references:
* CLAUDE.md non-negotiable rule #8: "No auto-publish in Phase 1.
  Auto-publish enabled in Phase 2 for non-flagship matches."
* CLAUDE.md non-negotiable rule #10: "High-profile matches always
  get human review even after auto-publish is on."
* docs/content-engine-response.md § 8: locked decision — flagship
  list lives in quality/flagship.py.

This module is the BRIDGE between those two doctrine items: when
called, it consults BOTH the per-sport allowlist (config) AND the
flagship rules (quality/flagship.py) before deciding to write a
publish ledger row.

API:

    from content_engine.publish import auto_publish
    result = auto_publish.maybe_publish(
        slug="japanese-grand-prix-2026",
        type_="recap",
        sport_id="f1",
        flagship_ctx={"race_name": "Japanese Grand Prix", "round": 3, ...},
    )
    if result.published:
        log.info("auto-published", slug=result.slug)
    else:
        log.info("manual review queued", reason=result.reason)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import structlog

from content_engine.config import settings
from content_engine.quality import flagship

log = structlog.get_logger()


@dataclass
class AutoPublishResult:
    """Outcome of the maybe_publish call."""

    published: bool
    slug: str
    type: str
    reason: str
    flagship_reason: str | None = None
    error: str | None = None


def _make_admin_client():
    """Lazy-init a supabase service-role client. Raises only if the
    publish path is actually called without a service-role key — Phase 1
    deployments without auto-publish never hit this code.
    """
    from supabase import create_client
    if not settings.supabase_service_role_key:
        raise RuntimeError(
            "auto_publish: SUPABASE_SERVICE_ROLE_KEY missing. "
            "Set it in the GH Actions / Vercel env to enable auto-publish."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def maybe_publish(
    *,
    slug: str,
    type_: str,
    sport_id: str | None,
    flagship_ctx: dict[str, Any] | None = None,
    notes: str | None = None,
) -> AutoPublishResult:
    """If conditions are met, insert a row into ce_article_publishes.

    Conditions (ALL must be true to publish):
      1. ``settings.is_sport_auto_publish(sport_id)`` — sport is in
         the auto-publish allowlist (env var ``AUTO_PUBLISH_SPORTS``).
      2. ``not flagship.is_flagship(sport_id, flagship_ctx)`` — the
         article is not a flagship match per the doctrine list.
      3. ``settings.supabase_service_role_key`` is set.

    On success: writes the publish row + returns published=True.
    On any condition failing: returns published=False with the reason.

    The article is ALWAYS written to disk regardless of this call —
    auto-publish only affects whether a Supabase publish row is also
    written. Manual review queue handles the non-auto-published path.
    """
    if not sport_id:
        return AutoPublishResult(
            published=False, slug=slug, type=type_,
            reason="sport_id missing — defaulting to manual review",
        )

    if not settings.is_sport_auto_publish(sport_id):
        return AutoPublishResult(
            published=False, slug=slug, type=type_,
            reason=f"auto_publish disabled for sport '{sport_id}' (not in AUTO_PUBLISH_SPORTS)",
        )

    is_flag, flag_reason = flagship.is_flagship(sport_id, flagship_ctx or {})
    if is_flag:
        return AutoPublishResult(
            published=False, slug=slug, type=type_,
            reason="flagship article — manual review per doctrine",
            flagship_reason=flag_reason,
        )

    # All conditions met — write the publish row.
    try:
        client = _make_admin_client()
    except Exception as exc:  # noqa: BLE001
        return AutoPublishResult(
            published=False, slug=slug, type=type_,
            reason="supabase admin client unavailable",
            error=str(exc),
        )

    try:
        row = {
            "slug": slug,
            "type": type_,
            "approver_email": "auto-publish@gibol.co",
            "editor_notes": (notes or f"Auto-published by content-engine cron (sport={sport_id}, non-flagship)"),
        }
        client.table("ce_article_publishes").upsert(row, on_conflict="slug,type").execute()
    except Exception as exc:  # noqa: BLE001
        log.warning("auto_publish.upsert_failed", slug=slug, error=str(exc))
        return AutoPublishResult(
            published=False, slug=slug, type=type_,
            reason="supabase upsert failed",
            error=str(exc),
        )

    log.info("auto_publish.published", slug=slug, type=type_, sport_id=sport_id)
    return AutoPublishResult(
        published=True, slug=slug, type=type_,
        reason=f"auto-published (sport={sport_id}, non-flagship)",
    )
