-- Phase 2 ship #17 — per-league state cache.
--
-- The discovery script (packages/content-engine/src/content_engine/scripts/
-- discover.py) currently scans 3 gameweeks heuristically when looking
-- for upcoming fixtures. That works for EPL (where we know the season's
-- in flight at GW35) but breaks across season boundaries + adds latency
-- on every cron run.
--
-- This table caches the "current state" per (sport, league_id):
--   * football: current gameweek number + last-completed gameweek
--   * NBA: current playoff round + active series count
--   * F1: current round + last-completed round + season
--   * tennis: current week + active tournament id
--
-- Updated by the discovery script when it observes the world has
-- moved (e.g. every fixture in current GW finished → bump
-- current_gameweek). Read by future cron runs to skip the
-- heuristic scan.
--
-- Key shape: (sport_id, league_id, season) so the same physical
-- row carries a season's worth of state. New season → new row.

CREATE TABLE IF NOT EXISTS public.ce_league_state (
    sport_id text NOT NULL,         -- 'football' | 'nba' | 'f1' | 'tennis'
    league_id text NOT NULL,        -- 'epl' | 'liga-1-id' | 'nba-playoffs-2026' | ...
    season text NOT NULL,           -- '2025-26' | '2026' | ...
    -- Football-specific
    current_gameweek int,
    last_completed_gameweek int,
    -- F1-specific (round number 1..24)
    current_round int,
    last_completed_round int,
    -- NBA playoffs (round 1..4)
    current_playoff_round text,     -- '1st Round' | 'Conference Semifinals' | 'Conference Finals' | 'NBA Finals'
    active_series_count int,
    -- Tennis (active tournament)
    active_tournament_id text,
    active_tournament_name text,
    -- Bookkeeping
    updated_at timestamptz NOT NULL DEFAULT now(),
    notes text,
    PRIMARY KEY (sport_id, league_id, season)
);

ALTER TABLE public.ce_league_state ENABLE ROW LEVEL SECURITY;

-- Anon read (SPA prerender + future client-side surfaces). Editor
-- isn't writing this directly — only the cron does, via service-role.
DROP POLICY IF EXISTS "ce_league_state_read_anon" ON public.ce_league_state;
CREATE POLICY "ce_league_state_read_anon"
    ON public.ce_league_state FOR SELECT
    TO anon, authenticated
    USING (true);

-- No anon INSERT/UPDATE/DELETE — service-role only.

CREATE INDEX IF NOT EXISTS ce_league_state_updated_at_idx
    ON public.ce_league_state (updated_at DESC);

COMMENT ON TABLE public.ce_league_state IS
    'Current state per league/sport — gameweek, round, active tournament. Cron updates; discovery script reads to skip heuristic scans.';
