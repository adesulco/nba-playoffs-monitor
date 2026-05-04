"""Write generated articles as JSON to ``public/content/{type}/{slug}.json``.

Phase 1 — Vite-aligned per docs/content-engine-response.md § 1. The SPA's
new ``/preview/[slug]``, ``/recap/[slug]``, etc. routes fetch this JSON
on mount and render the body markdown via the existing markdown
component. Prerender pass at build time also reads these files and emits
prerendered HTML for crawlers + share-link unfurl.

Output schema (stable; SPA + prerender both depend on it):

    {
      "type":         "preview" | "recap" | "standings" | "race-preview" | ...,
      "slug":         "liverpool-vs-arsenal-2026-04-27",
      "title":        "Preview Liverpool vs Arsenal: Si Merah Wajib...",
      "description":  "Liverpool tuan rumah Arsenal di Anfield...",
      "body_md":      "...the article markdown...",
      "frontmatter": {
        "league":       "epl",
        "fixture_id":   "1234567",      // optional, present for match-driven
        "home_team":    "Liverpool",     // optional, match-driven only
        "away_team":    "Arsenal",
        "kickoff_utc":  "2026-04-27T22:00:00+00:00",
        "venue":        "Anfield, Liverpool",
        "published_at": "2026-04-27T08:00:00+00:00",
        "version":      1,
        "model":        "claude-sonnet-4-6-20260415",
        "manual_review": true            // set true while ENABLE_AUTO_PUBLISH=false
      },
      "schema_jsonld": { ... }           // SportsEvent + NewsArticle JSON-LD
    }
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import structlog

log = structlog.get_logger()


# public/content/ at the repo root. The package lives at
# packages/content-engine/src/content_engine/publish/json_writer.py
# so we walk up 5 levels to the repo root.
_REPO_ROOT = Path(__file__).resolve().parents[5]
_CONTENT_ROOT = _REPO_ROOT / "public" / "content"


def _content_path(type_: str, slug: str) -> Path:
    """Resolve the on-disk path for a published article. Creates the
    parent directory if absent."""
    path = _CONTENT_ROOT / type_ / f"{slug}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def write_article(
    *,
    type_: str,
    slug: str,
    title: str,
    description: str,
    body_md: str,
    frontmatter: dict[str, Any],
    schema_jsonld: dict[str, Any] | None = None,
) -> Path:
    """Serialize an article dict and write it to disk.

    Returns the full path written. Raises ``ValueError`` for unknown
    type or empty body. Existing files at the same slug are overwritten
    (idempotent — same fixture → same slug → same file).
    """
    if type_ not in {"preview", "recap", "standings", "race-preview", "race-recap", "h2h", "glossary", "team", "pemain"}:
        raise ValueError(f"unknown article type: {type_!r}")
    if not body_md or not body_md.strip():
        raise ValueError("body_md is empty — refusing to write")

    # Stamp published_at if the caller didn't.
    fm = dict(frontmatter)
    fm.setdefault(
        "published_at",
        datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
    )
    fm.setdefault("version", 1)
    # Phase 1: every article ships with manual_review=true. Phase 2
    # flips this for non-flagship matches (the orchestrator does it,
    # not the writer — keeping it explicit at write time helps the
    # review queue UI know which articles are still pending sign-off).
    fm.setdefault("manual_review", True)

    payload = {
        "type": type_,
        "slug": slug,
        "title": title,
        "description": description,
        "body_md": body_md.strip() + "\n",
        "frontmatter": fm,
        "schema_jsonld": schema_jsonld or {},
    }

    path = _content_path(type_, slug)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False, sort_keys=False)
        f.write("\n")
    log.info(
        "publish.json_writer.written",
        type=type_,
        slug=slug,
        bytes=path.stat().st_size,
        path=str(path.relative_to(_REPO_ROOT)),
    )
    return path
