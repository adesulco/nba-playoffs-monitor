"""Unit tests for the API-Football normalizer.

Phase 0 acceptance: every fixture in a real API-Football EPL gameweek
response normalizes cleanly with no schema mismatches and no fabricated
fields. Tests cover:

  * Status code mapping (TBD/NS → scheduled, FT → final, etc.)
  * Kickoff parsing (ISO8601 with offset → UTC)
  * Venue formatting ("name, city")
  * Missing-id / missing-kickoff rows are skipped, not crashed
  * Score handling for live + final + scheduled

Tests don't hit the network — they feed the normalizer hand-crafted
response shapes that match real API-Football output.
"""

from __future__ import annotations

from datetime import datetime, timezone

from content_engine.data.normalizer import (
    _af_kickoff_utc,
    _af_status,
    _af_venue,
    normalize_epl_fixtures,
    normalize_liga1_fixtures,
)


# ── Status mapping ────────────────────────────────────────────────────────


def test_af_status_scheduled():
    assert _af_status("NS") == "scheduled"
    assert _af_status("TBD") == "scheduled"
    assert _af_status("") == "scheduled"


def test_af_status_live():
    assert _af_status("1H") == "live"
    assert _af_status("HT") == "live"
    assert _af_status("2H") == "live"
    assert _af_status("ET") == "live"
    assert _af_status("LIVE") == "live"


def test_af_status_final():
    assert _af_status("FT") == "final"
    assert _af_status("AET") == "final"
    assert _af_status("PEN") == "final"


def test_af_status_postponed_cancelled():
    assert _af_status("PST") == "postponed"
    assert _af_status("CANC") == "cancelled"
    assert _af_status("ABD") == "cancelled"


def test_af_status_walkover():
    assert _af_status("AWD") == "walkover"
    assert _af_status("WO") == "walkover"


def test_af_status_unknown_falls_back_to_scheduled():
    # API-Football could add new codes; we don't crash.
    assert _af_status("WTF") == "scheduled"
    assert _af_status(None) == "scheduled"  # type: ignore[arg-type]


# ── Kickoff parsing ───────────────────────────────────────────────────────


def test_af_kickoff_utc_with_offset():
    """API-Football returns ISO8601 with explicit offset; we coerce to UTC."""
    dt = _af_kickoff_utc("2026-04-27T22:00:00+00:00")
    assert dt == datetime(2026, 4, 27, 22, 0, 0, tzinfo=timezone.utc)


def test_af_kickoff_utc_with_non_zero_offset():
    """Coerce a +07:00 (WIB) timestamp to UTC."""
    dt = _af_kickoff_utc("2026-04-27T15:30:00+07:00")
    assert dt == datetime(2026, 4, 27, 8, 30, 0, tzinfo=timezone.utc)


def test_af_kickoff_utc_naive_assumed_utc():
    """A naive datetime gets UTC tzinfo attached (defensive)."""
    dt = _af_kickoff_utc("2026-04-27T22:00:00")
    assert dt is not None
    assert dt.tzinfo == timezone.utc


def test_af_kickoff_utc_none():
    assert _af_kickoff_utc(None) is None
    assert _af_kickoff_utc("") is None


def test_af_kickoff_utc_garbage_returns_none():
    """Bad input doesn't crash — the row gets skipped instead."""
    assert _af_kickoff_utc("not a date") is None


# ── Venue formatting ──────────────────────────────────────────────────────


def test_af_venue_name_and_city():
    assert _af_venue({"name": "Anfield", "city": "Liverpool"}) == "Anfield, Liverpool"


def test_af_venue_name_only():
    assert _af_venue({"name": "Anfield"}) == "Anfield"


def test_af_venue_city_only():
    assert _af_venue({"city": "Liverpool"}) == "Liverpool"


def test_af_venue_none():
    assert _af_venue(None) is None
    assert _af_venue({}) is None


# ── Full EPL fixture normalization ────────────────────────────────────────


def _epl_fixture_response(*fixtures) -> dict:
    """Wrap fixture dicts in the API-Football response envelope."""
    return {"get": "fixtures", "results": len(fixtures), "response": list(fixtures)}


def _liverpool_arsenal_scheduled() -> dict:
    return {
        "fixture": {
            "id": 1234567,
            "date": "2026-04-27T22:00:00+00:00",
            "status": {"short": "NS", "long": "Not Started"},
            "venue": {"name": "Anfield", "city": "Liverpool"},
        },
        "teams": {
            "home": {"id": 40, "name": "Liverpool"},
            "away": {"id": 42, "name": "Arsenal"},
        },
        "goals": {"home": None, "away": None},
    }


def _final_match_with_score() -> dict:
    return {
        "fixture": {
            "id": 9999991,
            "date": "2026-04-26T14:00:00+00:00",
            "status": {"short": "FT"},
            "venue": {"name": "Etihad", "city": "Manchester"},
        },
        "teams": {
            "home": {"id": 50, "name": "Manchester City"},
            "away": {"id": 33, "name": "Manchester United"},
        },
        "goals": {"home": 2, "away": 1},
    }


def test_normalize_epl_basic_scheduled():
    raw = _epl_fixture_response(_liverpool_arsenal_scheduled())
    rows = normalize_epl_fixtures(raw, gameweek=35)

    assert len(rows) == 1
    fx = rows[0]
    assert fx["league_id"] == "epl"
    assert fx["source_fixture_id"] == "1234567"
    assert fx["status"] == "scheduled"
    assert fx["home_team"] == "Liverpool"
    assert fx["away_team"] == "Arsenal"
    assert fx["home_score"] is None
    assert fx["away_score"] is None
    assert fx["venue"] == "Anfield, Liverpool"
    assert fx["season"] == "2025-26"
    assert fx["gameweek"] == 35
    assert fx["kickoff_utc"] == datetime(2026, 4, 27, 22, 0, 0, tzinfo=timezone.utc)


def test_normalize_epl_final_with_score():
    raw = _epl_fixture_response(_final_match_with_score())
    rows = normalize_epl_fixtures(raw, gameweek=35)

    assert len(rows) == 1
    fx = rows[0]
    assert fx["status"] == "final"
    assert fx["home_score"] == 2
    assert fx["away_score"] == 1


def test_normalize_epl_skips_missing_id():
    """A fixture with no id can't be deduped — skip it, don't crash."""
    bad = _liverpool_arsenal_scheduled()
    bad["fixture"]["id"] = None
    raw = _epl_fixture_response(bad, _final_match_with_score())

    rows = normalize_epl_fixtures(raw, gameweek=35)
    # Only the good one survives.
    assert len(rows) == 1
    assert rows[0]["source_fixture_id"] == "9999991"


def test_normalize_epl_skips_bad_kickoff():
    """Bad ISO date — log + skip, don't crash the gameweek."""
    bad = _liverpool_arsenal_scheduled()
    bad["fixture"]["date"] = "not a date"
    raw = _epl_fixture_response(bad, _final_match_with_score())

    rows = normalize_epl_fixtures(raw, gameweek=35)
    assert len(rows) == 1
    assert rows[0]["source_fixture_id"] == "9999991"


def test_normalize_epl_empty_response():
    raw = _epl_fixture_response()
    rows = normalize_epl_fixtures(raw, gameweek=35)
    assert rows == []


def test_normalize_epl_response_missing_response_key():
    """Sometimes API-Football returns errors / empty responses; don't crash."""
    rows = normalize_epl_fixtures({"errors": ["rate limit"]}, gameweek=35)
    assert rows == []


# ── Liga 1 ─────────────────────────────────────────────────────────────────


def test_normalize_liga1_uses_correct_league_id():
    """Same shape as EPL but with league_id = liga-1-id."""
    raw = _epl_fixture_response(_liverpool_arsenal_scheduled())
    rows = normalize_liga1_fixtures(raw, gameweek=1)
    assert len(rows) == 1
    assert rows[0]["league_id"] == "liga-1-id"
    assert rows[0]["gameweek"] == 1


# ── Provenance: every output field is sourced from input ──────────────────


def test_normalize_no_fabricated_fields():
    """Critical per CLAUDE.md non-negotiable rule #6 ('Ground every factual
    claim in source data'). The normalizer must never invent data — every
    field on the output is either from the input or explicitly tagged
    null. This test is the safety net.
    """
    raw = _epl_fixture_response(_liverpool_arsenal_scheduled())
    fx = normalize_epl_fixtures(raw, gameweek=35)[0]

    # Every field that came from input is verifiable
    assert fx["home_team"] == "Liverpool"  # from raw.teams.home.name
    assert fx["away_team"] == "Arsenal"  # from raw.teams.away.name
    assert fx["home_score"] is None  # from raw.goals.home (was None)
    assert fx["away_score"] is None  # from raw.goals.away (was None)

    # Never invented:
    # - no "predicted_winner" or anything derived from absent data
    # - kickoff is the parsed input, not a default like "now"
    expected_keys = {
        "league_id", "source_fixture_id", "kickoff_utc", "venue", "status",
        "home_team", "away_team", "home_score", "away_score", "season", "gameweek",
    }
    assert set(fx.keys()) == expected_keys, (
        f"Normalizer leaked unexpected fields: {set(fx.keys()) - expected_keys}"
    )
