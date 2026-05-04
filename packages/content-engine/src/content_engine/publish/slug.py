"""Slug generator for content URLs.

Bahasa-friendly: lowercase, kebab-case, latin-only fallback for any
non-ASCII glyph. Deterministic — same fixture inputs → same slug.

Slug shapes (per docs/content-engine-response.md § 1 URL co-existence
rule, NOT colliding with existing canonical team / driver pages):

    /preview/{home-slug}-vs-{away-slug}-{yyyy-mm-dd}
    /recap/{home-slug}-vs-{away-slug}-{yyyy-mm-dd}
    /standings/{league-slug}/pekan-{n}
    /h2h/{team-a-slug}-vs-{team-b-slug}
    /glossary/{term-slug}
"""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime


_NON_ALPHANUM = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    """Lowercase + ASCII-fold + collapse runs of non-alphanumeric to '-'.

    "Manchester United" → "manchester-united"
    "São Paulo" → "sao-paulo"
    "Persija Jakarta" → "persija-jakarta"
    """
    if not text:
        return ""
    # NFKD splits accented chars into base + combining marks; encoding to
    # ASCII with errors='ignore' drops the marks. Idiomatic Bahasa is
    # essentially ASCII-clean already; this handles the foreign-club edge
    # cases (São, Müller, Atlético).
    folded = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    lowered = folded.lower()
    cleaned = _NON_ALPHANUM.sub("-", lowered).strip("-")
    return cleaned


def fixture_slug(home: str, away: str, kickoff: datetime) -> str:
    """Slug for a per-fixture preview/recap article.

    Format: ``{home}-vs-{away}-{yyyy-mm-dd}``. Date is the kickoff in
    the venue's local calendar — passed in as a datetime; we use UTC date
    here for determinism (the SPA route doesn't care about TZ).

    Example: ``liverpool-vs-arsenal-2026-04-27``.
    """
    return f"{slugify(home)}-vs-{slugify(away)}-{kickoff.strftime('%Y-%m-%d')}"


def tennis_match_slug(
    p1_name: str,
    p2_name: str,
    tournament: str,
    year: int,
) -> str:
    """Slug for a tennis match recap article.

    Format: ``{loser-last}-vs-{winner-last}-{tournament-slug}-{year}``
    where the winner is determined by caller passing them as p1 (the
    convention in the rest of the engine: home/winner first).

    Example: ``alcaraz-vs-sinner-mutua-madrid-open-2026``.

    For matches where we don't know which side is winner yet (rare —
    only if called from a not-yet-finished match), the order is just
    p1-vs-p2.
    """
    p1_slug = slugify((p1_name or "").rsplit(" ", 1)[-1] or "p1")
    p2_slug = slugify((p2_name or "").rsplit(" ", 1)[-1] or "p2")
    tournament_slug = slugify(tournament or "tournament")
    return f"{p1_slug}-vs-{p2_slug}-{tournament_slug}-{year}"


def tennis_rankings_slug(tour: str, year: int, week_iso: str | None = None) -> str:
    """Slug for a weekly tennis rankings explainer.

    Format: ``ranking-{tour}-{year}-pekan-{ISO-week}`` when week is
    known, else ``ranking-{tour}-{year}-{YYYY-MM-DD}``.

    Examples:
      ``ranking-atp-2026-pekan-17``
      ``ranking-wta-2026-pekan-17``
    """
    base = f"ranking-{slugify(tour)}-{year}"
    if week_iso:
        base += f"-{week_iso}"
    return base


def nba_series_slug(home_abbr: str, away_abbr: str, round_label: str, year: int) -> str:
    """Slug for an NBA series-state article.

    Format: ``nba-series-{round-slug}-{away}-vs-{home}-{year}``.

    Example: ``nba-series-round-1-east-phi-vs-bos-2026``.
    """
    return (
        f"nba-series-{slugify(round_label)}-"
        f"{slugify(away_abbr)}-vs-{slugify(home_abbr)}-{year}"
    )


def f1_championship_slug(season: int, round_num: int) -> str:
    """Slug for an F1 championship-state article.

    Format: ``f1-championship-{season}-after-round-{N}``.

    Example: ``f1-championship-2026-after-round-3``.
    """
    return f"f1-championship-{season}-after-round-{round_num}"


def f1_race_slug(race_name: str, season: int) -> str:
    """Slug for an F1 race preview/recap article.

    Format: ``{race-name-slug}-{season}``. Race name comes from
    jolpica ("Japanese Grand Prix") and gets slugified
    ("japanese-grand-prix"). Season suffix prevents collision
    across years (Japanese GP exists every season).

    Example: ``japanese-grand-prix-2026``, ``miami-grand-prix-2026``.
    """
    name = slugify(race_name or "grand-prix")
    return f"{name}-{season}"


def h2h_slug(team_a: str, team_b: str, league_id: str = "") -> str:
    """Slug for a head-to-head article (Phase 2 ship #23).

    Format: ``{team-a}-vs-{team-b}-h2h`` with team names sorted
    alphabetically so the same pair always produces the same slug
    regardless of input order ("Liverpool vs Arsenal" and "Arsenal
    vs Liverpool" both yield ``arsenal-vs-liverpool-h2h``).

    When ``league_id`` is provided, prepends it for cross-sport
    disambiguation (``epl-arsenal-vs-liverpool-h2h``).

    Examples:
      ``epl-arsenal-vs-liverpool-h2h``
      ``liga-1-id-persib-bandung-vs-persija-jakarta-h2h``
      ``nba-bos-vs-phi-h2h``
    """
    a = slugify(team_a or "")
    b = slugify(team_b or "")
    if not a:
        a = "team-a"
    if not b:
        b = "team-b"
    # Sort to make order-independent.
    first, second = sorted([a, b])
    base = f"{first}-vs-{second}-h2h"
    if league_id:
        return f"{league_id}-{base}"
    return base


def football_team_profile_slug(team_name: str, league_id: str) -> str:
    """Slug for an EPL / Liga 1 team profile (Phase 2 ship #22).

    Format: ``{league-id}-{team-slug}``.

    Examples:
      ``epl-liverpool-fc``
      ``epl-manchester-united``
      ``liga-1-id-persija-jakarta``
      ``liga-1-id-persib-bandung``

    Same shape convention as nba_team_profile_slug — sport/league-id
    prefix lets the single ``/profile/`` route serve all sports.
    """
    base = slugify(team_name or "team")
    if not base:
        base = "team"
    return f"{league_id}-{base}"


def f1_driver_profile_slug(driver_code: str, driver_name: str = "") -> str:
    """Slug for an F1 driver profile (Phase 2 ship #22).

    Format: ``f1-{driver-slug}``. Prefer driver full name when
    available; fall back to FIA driver code (3-letter, e.g. VER, HAM).

    Examples:
      ``f1-max-verstappen``
      ``f1-lewis-hamilton``
      ``f1-charles-leclerc``
    """
    name = slugify(driver_name or "")
    code = slugify((driver_code or "").lower())
    base = name or code or "driver"
    return f"f1-{base}"


def nba_player_profile_slug(player_name: str) -> str:
    """Slug for an NBA player profile (Phase 2 ship #24).

    Format: ``pemain-nba-{player-slug}``. Uses the ``pemain``
    namespace prefix (Bahasa for "player") to distinguish from
    team profiles which use ``nba-{team-slug}``. The on-disk
    folder is ``pemain`` (matches json_writer's allowed-types
    list); SPA route is the same /profile/:slug as team profiles.

    Examples:
      ``pemain-nba-jaylen-brown``
      ``pemain-nba-jayson-tatum``
      ``pemain-nba-luka-doncic``
    """
    base = slugify(player_name or "player")
    if not base:
        base = "player"
    return f"pemain-nba-{base}"


def tennis_player_profile_slug(player_name: str) -> str:
    """Slug for a tennis player profile (Phase 2 ship #22).

    Format: ``tennis-{player-slug}``.

    Examples:
      ``tennis-jannik-sinner``
      ``tennis-iga-swiatek``
      ``tennis-carlos-alcaraz``
    """
    base = slugify(player_name or "player")
    if not base:
        base = "player"
    return f"tennis-{base}"


def nba_team_profile_slug(team_slug: str, team_abbr: str = "") -> str:
    """Slug for an NBA team profile article (Phase 2 ship #21).

    Format: ``nba-{team-slug}``.

    Team-slug source: ESPN's ``team.slug`` field (e.g.
    ``boston-celtics``). When ESPN's slug is empty (defensive), we
    fall back to the abbreviation lower-cased ("bos"), but in
    practice ESPN always populates it.

    Examples:
      ``nba-boston-celtics``
      ``nba-los-angeles-lakers``
      ``nba-philadelphia-76ers``

    Sport-id prefix lets a single ``/profile/`` route serve all sports
    without per-sport sub-routing. EPL profile ships as ``epl-arsenal``,
    Liga 1 as ``liga-1-id-persija``, F1 driver as ``f1-max-verstappen``,
    tennis player as ``tennis-jannik-sinner``. The "profil" framing is
    in the URL path itself (``/profile/...``) and in the article title,
    not the slug — keeps URLs short and category-clean.

    Distinct from existing canonical NBA team pages at
    ``/nba-playoff-2026/[teamSlug]`` (those are LIVE dashboards;
    profiles are evergreen narrative articles).
    """
    base = slugify(team_slug or "")
    if not base and team_abbr:
        base = slugify(team_abbr.lower())
    if not base:
        base = "team"
    return f"nba-{base}"


def nba_game_slug(
    home_abbr: str,
    away_abbr: str,
    tipoff: datetime,
    game_number: int | None = None,
) -> str:
    """Slug for an NBA game preview/recap.

    Format: ``{away}-at-{home}-{yyyy-mm-dd}-g{N}`` when game_number is
    known, else just ``{away}-at-{home}-{yyyy-mm-dd}``.

    NBA convention is "away at home" not "home vs away" because in
    basketball the road team gets billed first ("Lakers at Nuggets").
    Abbreviations (LAL, BOS, PHI) keep the slug short. Game number
    appended so two games of the same series in the same week don't
    collide.

    Example: ``phi-at-bos-2026-04-26-g4``
    """
    base = f"{slugify(away_abbr)}-at-{slugify(home_abbr)}-{tipoff.strftime('%Y-%m-%d')}"
    if game_number is not None and game_number >= 1:
        base += f"-g{game_number}"
    return base
