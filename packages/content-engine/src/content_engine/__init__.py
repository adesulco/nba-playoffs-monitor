"""Gibol Content Engine.

Bahasa-first sports content generation pipeline. Ingests fixtures + events
from API-Football / ESPN / jolpica-f1, runs them through Sonnet 4.6 / Haiku 4.5
agents with prompt caching, applies the quality-gate stack (fact validator,
banned-phrase regex, dedup simhash, schema validity, external plagiarism check),
and publishes JSON articles to ``public/content/{type}/{slug}.json`` for the
Vite SPA to consume.

See ``spec-content-agent.md`` (repo root) for the full architecture and
``packages/content-engine/STATUS.md`` for the current phase.

Phase 0 (current): foundation only — ingestion + normalization + Anthropic SDK
wrapper. No agents yet; those land Phase 1.
"""

__version__ = "0.0.1"
__all__ = ["__version__"]
