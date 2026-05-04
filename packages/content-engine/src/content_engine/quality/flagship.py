"""Flagship-article detection.

Phase 1 ship #15 — per CLAUDE.md non-negotiable rule #10 ("High-profile
matches always get human review even after auto-publish is on") and
the locked decision in docs/content-engine-response.md § 8.

Flagship articles ALWAYS require manual editor approval. The auto-
publish path skips them and leaves the article as `manual_review:true`
even when the sport is otherwise auto-publishing.

This first cut is **explicit**: hardcoded team pairs, circuits, series
states. Future ship adds dynamic rules (top-4-vs-top-4, championship
implications, table position) once the engine has Supabase-backed
standings + championship-state caches.

Each `is_flagship_*` function takes the article's context (or
frontmatter) and returns a boolean. The function returning True means
"NEVER auto-publish this; always manual review."
"""

from __future__ import annotations

from typing import Any


# ── Football (EPL + Liga 1) ──────────────────────────────────────────────


# Explicit derby + classico pairs that always need editor review.
# Stored as frozenset so order doesn't matter (home-vs-away same as
# away-vs-home). Names are lowercased for case-insensitive comparison.
_FOOTBALL_FLAGSHIP_PAIRS = {
    "epl": [
        # North London derby
        frozenset({"arsenal", "tottenham", "tottenham hotspur"}),
        # Manchester rivalries
        frozenset({"manchester united", "liverpool"}),
        frozenset({"manchester united", "manchester city"}),
        # Merseyside derby
        frozenset({"liverpool", "everton"}),
        # London top-tier derbies
        frozenset({"chelsea", "arsenal"}),
        frozenset({"chelsea", "tottenham", "tottenham hotspur"}),
        # Big-game matchups
        frozenset({"liverpool", "manchester city"}),
        frozenset({"arsenal", "manchester city"}),
        frozenset({"liverpool", "arsenal"}),
        frozenset({"chelsea", "liverpool"}),
        frozenset({"manchester united", "arsenal"}),
        frozenset({"manchester united", "chelsea"}),
    ],
    "liga-1-id": [
        # El Clasico Indonesia (per existing /derby/persija-persib surface)
        frozenset({"persija jakarta", "persib bandung"}),
        frozenset({"persija", "persib"}),
        # Derby JATIM (East Java rivalry — biggest fan culture clash)
        frozenset({"persebaya surabaya", "arema fc"}),
        frozenset({"persebaya", "arema"}),
        # Derby Jawa Tengah (Solo vs Semarang)
        frozenset({"persis solo", "psis semarang"}),
        frozenset({"persis", "psis"}),
        # Derby Yogyakarta (Sleman vs PSIM)
        frozenset({"pss sleman", "psim"}),
        frozenset({"pss sleman", "psim yogyakarta"}),
        # Derby Jabodetabek (Jakarta vs Tangerang)
        frozenset({"persija jakarta", "persita"}),
        frozenset({"persija", "persita"}),
        # Sumatra-Sulawesi-Java cross-island rivalries
        frozenset({"psm makassar", "persib bandung"}),
        frozenset({"psm makassar", "persija jakarta"}),
        frozenset({"semen padang", "psm makassar"}),
        # Bali-Java meets
        frozenset({"bali united", "persija jakarta"}),
        frozenset({"bali united", "persib bandung"}),
        # Borneo-Java showdown (title race)
        frozenset({"pusamania borneo", "persib bandung"}),
        frozenset({"pusamania borneo", "persija jakarta"}),
    ],
}


def is_flagship_football(fixture: dict[str, Any]) -> tuple[bool, str | None]:
    """Returns (is_flagship, reason).

    Phase 1 explicit-only. Pass a normalized fixture dict — uses
    `league_id`, `home_team`, `away_team` fields.
    """
    league_id = fixture.get("league_id") or fixture.get("league")
    home = (fixture.get("home_team") or "").lower().strip()
    away = (fixture.get("away_team") or "").lower().strip()
    pair = frozenset({home, away})

    flagship_pairs = _FOOTBALL_FLAGSHIP_PAIRS.get(league_id, [])
    for fp in flagship_pairs:
        # frozenset intersection: any home/away name matches the
        # flagship pair? We require BOTH names to overlap.
        if pair & fp == pair and len(pair) == 2:
            return True, f"flagship-pair derby ({home} vs {away})"

    return False, None


# ── NBA ──────────────────────────────────────────────────────────────────


def is_flagship_nba(article_ctx: dict[str, Any]) -> tuple[bool, str | None]:
    """Series-level flagship rules. Always-flagship series rounds:
    Conference Finals, NBA Finals, any Game 7. Plus elimination games
    where one of the storied franchises is at stake (LAL/GSW/BOS/MIA/NYK).

    Pass the recap or preview context dict — uses `series_round`,
    `series_summary` fields.
    """
    series_round = (article_ctx.get("series_round") or "").lower()
    series_summary = (article_ctx.get("series_summary") or "").lower()

    if "conference final" in series_round:
        return True, "Conference Finals"
    if "nba final" in series_round or series_round.endswith("finals"):
        return True, "NBA Finals"

    # Game 7 in any series — series tied 3-3 means next is Game 7;
    # also catch the Game 7 itself (series ends 4-3).
    if "3-3" in series_summary:
        return True, "Game 7 imminent"
    if "tied 3-3" in series_summary:
        return True, "Game 7 imminent"

    # Elimination games against storied franchises — match on team abbr
    storied = {"LAL", "GSW", "BOS", "MIA", "NYK"}
    abbrs = {
        (article_ctx.get("home_abbr") or "").upper(),
        (article_ctx.get("away_abbr") or "").upper(),
    }
    if abbrs & storied and ("3-1" in series_summary or "3-2" in series_summary):
        return True, "elimination game vs storied franchise"

    return False, None


# ── F1 ───────────────────────────────────────────────────────────────────


# Iconic / culturally-significant tracks where journalism stakes are
# high. Match against race name (case-insensitive substring).
_F1_FLAGSHIP_RACE_KEYWORDS = [
    "monaco",
    "monza", "italian",
    "silverstone", "british",
    "spa", "belgian",
    "abu dhabi",
    "interlagos", "brazilian",
    "suzuka", "japanese",  # cultural significance for the engine
]


def is_flagship_f1(race_meta: dict[str, Any]) -> tuple[bool, str | None]:
    """F1 flagship rules: iconic tracks + season opener + season finale.

    Pass the race meta dict — uses `race_name`, `round`, `circuit`.
    """
    race_name = (race_meta.get("race_name") or "").lower()
    circuit = (race_meta.get("circuit") or "").lower()
    target = f"{race_name} {circuit}"

    for keyword in _F1_FLAGSHIP_RACE_KEYWORDS:
        if keyword in target:
            return True, f"iconic circuit / cultural ({keyword})"

    # Season opener
    if race_meta.get("round") == 1:
        return True, "season opener"
    # Season finale — calendar shape varies; treat any round in the
    # last-3 of a typical 22-24 race calendar as flagship.
    round_num = race_meta.get("round")
    if round_num and round_num >= 22:
        return True, "season finale window"

    return False, None


# ── Tennis ───────────────────────────────────────────────────────────────


def is_flagship_tennis(article_ctx: dict[str, Any]) -> tuple[bool, str | None]:
    """Tennis flagship rules: Grand Slam SF/F, ATP/WTA Finals, Big-4
    matchups. Phase 1 ship #15 only generates rankings (no match
    recaps yet) so this returns False — rankings are templated and
    safe to auto-publish.

    Future ship #15b: when match recaps land, flag GS SF/F and
    Big-4 matchups (Sinner / Alcaraz / Djokovic / Zverev pairings).
    """
    # Rankings articles are never flagship.
    if (article_ctx.get("article_type") or "").startswith("ranking"):
        return False, None
    return False, None


# ── Dispatch ─────────────────────────────────────────────────────────────


def is_flagship(sport_or_league: str, ctx: dict[str, Any]) -> tuple[bool, str | None]:
    """Top-level dispatch. Returns (is_flagship, reason).

    `sport_or_league` is the league/sport id from frontmatter.league
    (e.g. "epl", "liga-1-id", "nba", "f1", "tennis").
    """
    sport_or_league = (sport_or_league or "").lower()
    if sport_or_league in {"epl", "liga-1-id"}:
        return is_flagship_football(ctx)
    if sport_or_league == "nba":
        return is_flagship_nba(ctx)
    if sport_or_league == "f1":
        return is_flagship_f1(ctx)
    if sport_or_league == "tennis":
        return is_flagship_tennis(ctx)
    # Unknown sport → conservative: treat as flagship (require manual
    # review) so we never accidentally auto-publish unconfigured
    # content.
    return True, "unknown sport — defaulting to manual review"
