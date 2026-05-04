"""Data ingestion + normalization + persistence.

Phase 0 modules:

  * ``api_football`` — fetch fixtures, lineups, events from API-Football v3
  * ``normalizer`` — feed-specific JSON → unified ``ce_*`` schema dicts
  * ``db`` — asyncpg pool + upsert helpers for ``ce_fixtures``, ``ce_events``, ``ce_stats``

Phase 1+ adds:

  * ``espn`` — NBA Playoffs scoreboard + box scores
  * ``jolpica_f1`` — F1 calendar + driver/constructor standings + race results
  * ``news`` — BBC, ESPN, The Athletic, Detik Sport, Bola.net text excerpts
    (factual context only, never quoted directly per spec § 4.1)
"""
