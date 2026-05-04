"""Preview context assembler — builds the user-message dict for the
preview writer agent from a normalized fixture + supplementary feeds.

Phase 1 ship #2. The preview agent's prompt template (spec § 5.2,
implemented in ``agents.preview._format_fixture_user_message``) takes
a context dict with keys like ``home_position``, ``home_form``,
``home_top_scorer``, ``h2h_summary`` etc. Ship #1 passed placeholders
("—", "Belum tersedia") because the supplementary endpoints weren't
wired. This module is the "wire it up" step.

Design notes:

- **In-process cache (per-run only).** Standings + topscorers are
  league-wide and stable across a gameweek; we cache them within a
  single CLI invocation so a 10-fixture batch hits the API 2× instead
  of 20×. No persistent cache yet — that lands in ship #3 with the
  ce_standings + ce_topscorers tables.

- **Soft failure.** If standings or H2H or topscorers fetch fails,
  log the exception and leave the corresponding context fields as
  None. The preview writer prompt is built to admit gaps gracefully
  ("data belum tersedia") — partial degradation > halt-on-error.

- **Time formatting.** ``kickoff_local`` formats the fixture's UTC
  kickoff as "{D Mon YYYY, HH.mm} WIB" (Asia/Jakarta = UTC+7). This
  is what Bahasa readers expect; previously we passed a UTC string
  which the writer dutifully echoed.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

from content_engine.data import api_football, normalizer

log = structlog.get_logger()


# Asia/Jakarta is a fixed UTC+7 offset — no DST. We avoid pulling
# pytz/zoneinfo for a single offset.
_WIB = timezone(timedelta(hours=7), name="WIB")


# Module-level cache. Keys are (kind, league_id) tuples; values are the
# already-normalized lists. Cleared by clear_cache() between batch runs
# if the caller wants fresh data. Within a single CLI invocation, every
# preview after the first hits cache for standings + topscorers.
_CACHE: dict[tuple[str, str], Any] = {}


def clear_cache() -> None:
    """Drop the in-process cache. Mainly useful for tests + long-running
    orchestrators where a daily refresh is wanted."""
    _CACHE.clear()


def _fmt_kickoff_wib(dt_utc: datetime) -> str:
    """Format a UTC datetime as a WIB-localized human string.

    Output shape: "2 Mei 2026, 23.30 WIB". Bahasa-localized month names
    inline (no locale hop) since Python's strftime %B respects the
    process locale and we don't want to mutate it.
    """
    if not dt_utc:
        return "—"
    months = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    wib = dt_utc.astimezone(_WIB)
    return f"{wib.day} {months[wib.month]} {wib.year}, {wib.strftime('%H.%M')} WIB"


async def _get_standings(league_id: str) -> list[dict[str, Any]]:
    """Cached standings fetch. Returns empty list on failure."""
    key = ("standings", league_id)
    if key in _CACHE:
        return _CACHE[key]
    try:
        raw = await api_football.fetch_standings(league_id)
        rows = normalizer.normalize_standings(raw)
        _CACHE[key] = rows
        return rows
    except Exception as exc:  # noqa: BLE001
        log.warning("preview_context.standings_fetch_failed", error=str(exc), league_id=league_id)
        _CACHE[key] = []  # cache the failure so we don't retry within the run
        return []


async def _get_topscorers(league_id: str) -> list[dict[str, Any]]:
    """Cached top-scorers fetch. Returns empty list on failure."""
    key = ("topscorers", league_id)
    if key in _CACHE:
        return _CACHE[key]
    try:
        raw = await api_football.fetch_topscorers(league_id)
        rows = normalizer.normalize_topscorers(raw)
        _CACHE[key] = rows
        return rows
    except Exception as exc:  # noqa: BLE001
        log.warning("preview_context.topscorers_fetch_failed", error=str(exc), league_id=league_id)
        _CACHE[key] = []
        return []


async def _get_team_injuries(team_id: int, league_id: str) -> list[dict[str, Any]]:
    """Cached per-team injuries fetch. Returns empty list on failure.

    Caches by (team_id, league_id) — same team appears in multiple
    fixtures across a gameweek, so a 10-fixture batch hits the
    /injuries endpoint at most 20 times (10 home + 10 away) instead
    of redundantly per article.
    """
    key = ("injuries", f"{league_id}:{team_id}")
    if key in _CACHE:
        return _CACHE[key]
    try:
        raw = await api_football.fetch_team_injuries(team_id, league_id)
        rows = normalizer.normalize_injuries(raw)
        _CACHE[key] = rows
        return rows
    except Exception as exc:  # noqa: BLE001
        log.warning(
            "preview_context.injuries_fetch_failed",
            error=str(exc), team_id=team_id, league_id=league_id,
        )
        _CACHE[key] = []
        return []


def _format_injuries(rows: list[dict[str, Any]]) -> str:
    """Render injury rows into a single-line string the writer prompt
    expects.

    Output examples (for the writer's home_injuries / away_injuries
    field — single string, comma-separated):

      "B. Saka (Thigh problems), W. Saliba (Sprained ankle), Trossard (Doubtful)"
      "Belum ada update cedera resmi."

    The writer agent's prompt is built around this single-line shape;
    if we passed a structured list it'd have to translate, which adds
    a hallucination surface. Pre-format means the writer reads
    literally.
    """
    if not rows:
        return "Belum ada update cedera resmi."
    bits: list[str] = []
    for r in rows:
        name = r.get("player_name") or "?"
        reason = (r.get("reason") or "").strip()
        if reason and reason != "—":
            bits.append(f"{name} ({reason})")
        else:
            bits.append(name)
    return ", ".join(bits)


def _find_in_standings(rows: list[dict[str, Any]], team_name: str) -> dict[str, Any] | None:
    """Lookup with relaxed matching. API-Football team names are stable
    but case-sensitive at the comparison; lowercase + trim for safety."""
    target = (team_name or "").lower().strip()
    for r in rows:
        if (r.get("team_name") or "").lower().strip() == target:
            return r
    return None


_LEAGUE_LABEL = {
    "epl": "Liga Inggris 2025-26",
    "liga-1-id": "Super League Indonesia 2025-26",
}

_BROADCAST = {
    "epl": "Vidio, beIN Sports",
    "liga-1-id": "Vidio, Indosiar, MNCTV",
}


async def build_context(fx: dict[str, Any]) -> dict[str, Any]:
    """Assemble a full preview-writer context dict from a normalized fixture.

    ``fx`` is a row from ``normalizer.normalize_epl_fixtures`` (or the
    Liga 1 equivalent). It already has ``home_team``, ``away_team``,
    ``kickoff_utc``, ``venue``, ``league_id``.

    Returns a dict matching the template keys in
    ``agents.preview._format_fixture_user_message``. Any field where
    the supplementary fetch failed is left as None — the agent's
    formatter renders those as "—" so the writer prompt admits the gap
    cleanly rather than fabricating.

    Phase 1 ship #2 leaves the following fields stubbed:
      - home_injuries / away_injuries: Phase 1 ship #3 (lineup/injuries
        endpoint, plus the Vercel-proxy adapter for the news feed).
      - context_notes: derived in Phase 2 from standings deltas
        ("Arsenal butuh 3 poin demi gelar"). For now we emit a generic
        line.
    """
    league_id = fx.get("league_id") or "epl"
    home = fx["home_team"]
    away = fx["away_team"]

    # Standings + form lookup
    standings = await _get_standings(league_id)
    home_row = _find_in_standings(standings, home)
    away_row = _find_in_standings(standings, away)

    # Top-scorer lookup (per-team picked from league-wide leaderboard)
    scorers = await _get_topscorers(league_id)
    home_scorer = normalizer.find_team_top_scorer(scorers, home)
    away_scorer = normalizer.find_team_top_scorer(scorers, away)

    # Per-team injury list. Phase 1 ship #6: closes the
    # "Belum ada update cedera resmi" stub. Uses the team_id from
    # standings (which we already loaded). If standings failed we
    # don't have team_ids, so injuries become "—" — not a regression
    # vs ship #2.
    home_injuries: list[dict[str, Any]] = []
    away_injuries: list[dict[str, Any]] = []
    if home_row and home_row.get("team_id"):
        home_injuries = await _get_team_injuries(home_row["team_id"], league_id)
    if away_row and away_row.get("team_id"):
        away_injuries = await _get_team_injuries(away_row["team_id"], league_id)

    # H2H — needs team IDs which we get from the standings rows. If
    # standings failed, skip H2H rather than guessing.
    h2h_summary = None
    if home_row and away_row:
        try:
            raw_h2h = await api_football.fetch_h2h(
                home_row["team_id"], away_row["team_id"], last=5
            )
            h2h = normalizer.normalize_h2h(raw_h2h, home_team=home, away_team=away)
            if h2h["summary"]:
                # Pre-format for the writer: the summary string + a
                # 1-line aggregate. Easier for the model to weave into
                # prose than five separate lines.
                h2h_summary = (
                    f"{h2h['summary']}. "
                    f"({h2h['wins_home']}M-{h2h['draws']}S-{h2h['wins_away']}K dari {home} POV)"
                )
        except Exception as exc:  # noqa: BLE001
            log.warning("preview_context.h2h_fetch_failed", error=str(exc), home=home, away=away)

    ctx: dict[str, Any] = {
        "league_name": _LEAGUE_LABEL.get(league_id, league_id),
        "kickoff_local": _fmt_kickoff_wib(fx["kickoff_utc"]),
        "venue": fx.get("venue") or "—",
        "home_team": home,
        "home_position": home_row["rank"] if home_row else None,
        "home_form": home_row["form"] if home_row else None,
        "home_top_scorer": home_scorer["name"] if home_scorer else None,
        "home_top_goals": home_scorer["goals"] if home_scorer else None,
        "home_injuries": _format_injuries(home_injuries),
        "away_team": away,
        "away_position": away_row["rank"] if away_row else None,
        "away_form": away_row["form"] if away_row else None,
        "away_top_scorer": away_scorer["name"] if away_scorer else None,
        "away_top_goals": away_scorer["goals"] if away_scorer else None,
        "away_injuries": _format_injuries(away_injuries),
        "h2h_summary": h2h_summary or "Data H2H belum tersedia di sistem.",
        "context_notes": _derive_context_notes(home_row, away_row),
        "broadcast": _BROADCAST.get(league_id, "Cek penyedia siaran resmi."),
    }

    log.info(
        "preview_context.built",
        home=home,
        away=away,
        home_pos=ctx.get("home_position"),
        away_pos=ctx.get("away_position"),
        h2h_chars=len(ctx.get("h2h_summary") or ""),
    )

    return ctx


def _derive_context_notes(
    home_row: dict[str, Any] | None,
    away_row: dict[str, Any] | None,
) -> str:
    """Light Bahasa one-liner about the matchup's stakes from the table.

    This is rule-based, not LLM. Keeps the writer focused: rather than
    asking Sonnet to invent a "stakes" sentence, we hand it a factual
    framing it can build on. Phase 2 will deepen this with title-race
    + relegation thresholds + form deltas.
    """
    if not home_row or not away_row:
        return "Klasemen belum lengkap di sistem; preview ditulis dari konteks fixture dasar."

    h_rank = home_row.get("rank") or 99
    a_rank = away_row.get("rank") or 99
    h_pts = home_row.get("points") or 0
    a_pts = away_row.get("points") or 0

    bits: list[str] = []
    # Rank gap
    if abs(h_rank - a_rank) <= 2:
        bits.append(f"Selisih posisi tipis ({home_row['team_name']} ke-{h_rank}, {away_row['team_name']} ke-{a_rank}), laga ini bisa menggeser klasemen.")
    elif h_rank <= 4 and a_rank <= 4:
        bits.append("Dua tim papan atas, hasil laga ini langsung berdampak ke perebutan zona Champions.")
    elif h_rank >= 17 or a_rank >= 17:
        bits.append("Salah satu tim ada di zona degradasi, tiga poin di sini bobotnya jauh dari biasa.")
    elif h_rank <= 4 or a_rank <= 4:
        top_team = home_row["team_name"] if h_rank <= 4 else away_row["team_name"]
        bits.append(f"{top_team} masih bermain di papan atas, lawan datang dengan agenda lain.")

    # Points context
    bits.append(f"Setelah {home_row.get('played')} laga, {home_row['team_name']} {h_pts} poin dan {away_row['team_name']} {a_pts} poin.")

    return " ".join(bits)
