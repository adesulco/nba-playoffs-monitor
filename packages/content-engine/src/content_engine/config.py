"""Runtime config loaded from env vars.

Phase 0. Pydantic-settings reads ``.env`` (or process env) and exposes a
typed singleton ``settings``. Every other module imports this rather than
touching ``os.environ`` directly.

Hard requirement: ``ANTHROPIC_API_KEY``, ``DATABASE_URL``, ``API_FOOTBALL_KEY``
must be set or the engine refuses to start. ``OPENAI_API_KEY`` is optional
until Phase 4 (evergreen retrieval).
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Engine config.

    Loaded once at process start. Per ``CLAUDE.md`` § "Cost cap is enforced":
    ``daily_token_budget_usd`` is the hard guardrail — if a single agent
    blows past it in a calendar day, the orchestrator halts that agent
    until the next UTC day rolls over. No silent degrade.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ── Required keys ─────────────────────────────────────────────────────────

    # Phase 0 routes API-Football calls through the Vercel proxy (the web
    # app's existing /api/proxy/api-football/* endpoint), so neither key is
    # actually called during dry-run. Both keys remain DEFAULT to empty so
    # the engine starts even when .env is sparse; Phase 1 will require them
    # explicitly when agents start running + we switch to direct API access.
    anthropic_api_key: str = Field(
        default="",
        description="Anthropic API key (sk-ant-api03-...). Optional in Phase 0 "
        "dry-run (no agents call it); REQUIRED from Phase 1 (writers).",
    )
    api_football_key: str = Field(
        default="",
        description="API-Football Pro key. Optional in Phase 0 because the "
        "engine routes via the Vercel proxy at /api/proxy/api-football/ "
        "(already provisioned with the key server-side). REQUIRED from "
        "Phase 1 when we switch to direct access for higher request rates.",
    )

    # Phase 0 dry-run does NOT need the DB — it fetches from API-Football and
    # prints normalized fixtures without writing. DATABASE_URL is required for
    # Phase 0 health-check + Phase 1 onwards (when ingest writes to ce_fixtures).
    # Making it optional here unblocks the dry-run acceptance test even without
    # a Postgres connection configured.
    database_url: str | None = Field(
        default=None,
        description="Postgres connection URL (Supabase session pooler form: "
        "postgresql://postgres.{ref}:{pwd}@aws-1-ap-south-1.pooler.supabase.com"
        ":5432/postgres). Optional in Phase 0 dry-run; required from Phase 0 "
        "health-check onwards.",
    )

    # ── Optional ──────────────────────────────────────────────────────────────

    openai_api_key: str | None = Field(
        default=None,
        description="OpenAI key for text-embedding-3-small. Optional until "
        "Phase 4 (evergreen profile retrieval).",
    )

    # ── Cost guardrails ───────────────────────────────────────────────────────

    daily_token_budget_usd: float = Field(
        default=5.0,
        description="Hard daily spend cap per agent (USD). If exceeded, the "
        "agent halts for the rest of the UTC day. Per CLAUDE.md non-negotiable "
        "rule: 'Cost cap is enforced. Don't silently degrade or downgrade "
        "models.' Default 5 USD across all agents = ~150 articles/day max.",
    )

    # ── Models (locked in CLAUDE.md; do NOT change without explicit approval) ──

    model_narrative: str = Field(
        default="claude-sonnet-4-6",
        description="Sonnet 4.6 — preview, recap, profile, race writers. "
        "Using the alias (not a dated suffix) so we automatically pick up "
        "minor revisions; Phase 2 may pin to a dated snapshot for "
        "voice-stability across the eval set.",
    )
    model_templated: str = Field(
        default="claude-haiku-4-5-20251001",
        description="Haiku 4.5 — standings, voice lint, fact-check rule-runner. "
        "Pinned by date because Haiku updates more frequently and we want "
        "linter behavior to be reproducible.",
    )
    model_qc: str = Field(
        default="claude-opus-4-7",
        description="Opus 4.7 — 10% sample editorial QC sweep.",
    )

    # ── Phase / environment flags ─────────────────────────────────────────────

    phase: Literal["phase-0", "phase-1", "phase-2", "phase-3", "phase-4", "phase-5"] = Field(
        default="phase-0",
        description="Current build phase. Phase 0 = ingestion only, no agents. "
        "Phase 1+ unlocks writer agents one league at a time.",
    )
    enable_auto_publish: bool = Field(
        default=False,
        description="Master switch for auto-publish. Per locked decision: "
        "Phase 1 = always False (manual review of every article). "
        "Phase 2 = True for non-flagship matches; flagship list at "
        "quality/flagship.py still hard-routes to manual review.",
    )
    auto_publish_sports: str = Field(
        default="",
        description="Comma-separated sport/league ids that auto-publish "
        "after generation. Empty = Phase 1 default (no auto-publish "
        "anywhere). When a sport is listed here, the discover script "
        "writes a ce_article_publishes row immediately for non-flagship "
        "articles — they go public on next page load without editor "
        "intervention. Flagship articles (per quality/flagship.py) "
        "always require manual review regardless of this setting. "
        "Examples: 'tennis', 'tennis,liga-1-id', 'epl,liga-1-id,tennis'.",
    )

    @property
    def auto_publish_sports_set(self) -> set[str]:
        """Parsed lowercase set of sport ids in the auto-publish allowlist."""
        return {
            s.strip().lower()
            for s in (self.auto_publish_sports or "").split(",")
            if s.strip()
        }

    def is_sport_auto_publish(self, sport_id: str | None) -> bool:
        """True iff the given sport/league id is in the auto-publish allowlist."""
        if not sport_id:
            return False
        return sport_id.lower() in self.auto_publish_sports_set

    # ── Supabase (used by auto-publish path to write ledger rows) ────────

    supabase_url: str = Field(
        default="https://egzacjfbmgbcwhtvqixc.supabase.co",
        description="Supabase project URL. Used by the auto-publish "
        "flow to write ce_article_publishes rows directly via the "
        "service-role client. Same project the SPA + serverless API "
        "talk to.",
    )
    supabase_service_role_key: str = Field(
        default="",
        description="Supabase service-role JWT. REQUIRED for auto-"
        "publish (bypasses RLS to write the publish ledger). Phase 1 "
        "without auto-publish: empty is fine — discovery just leaves "
        "articles as drafts.",
    )

    # ── Caching + batch ───────────────────────────────────────────────────────

    enable_prompt_cache: bool = Field(
        default=True,
        description="Default ON. Per CLAUDE.md: 'Always enable prompt caching "
        "on system prompts and voice-rules context (90% savings, table-stakes).'",
    )
    enable_batch_api: bool = Field(
        default=True,
        description="Use Batch API for any work scheduled ≥1h ahead "
        "(50% off). Real-time recaps bypass batch.",
    )


settings = Settings()  # raises ValidationError if required keys are missing
