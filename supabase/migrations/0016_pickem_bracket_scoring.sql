-- 0016_pickem_bracket_scoring.sql
-- Pick'em bracket scoring layer (Phase 4.5).
-- Implements §10.4 of Gibol-Pickem-Gamification-Spec: "Keep brackets +
-- series + picks for the tournament tree. Add a slot_type to
-- distinguish group-rank picks from knockout-winner picks. Generalise
-- the round-weight table into pickem_rules."
--
-- The existing picks table (created pre-migration, shipped with the NBA
-- best-of-7 series Pick'em) is extended additively:
--   - series_id is allowed to be NULL for WC-style bracket slots
--   - slot_type identifies the slot kind ('group_rank' / 'r32_winner'
--     / 'r16_winner' / 'qf_winner' / 'sf_winner' / 'final_winner' /
--     'champion')
--   - slot_index distinguishes multiple slots of the same type (group
--     letter A..L mapped to 1..12, KO match index 1..16, etc.)
--   - picked_team_code carries the FIFA/ISO alpha-3 code for the
--     picked team (WC bracket data uses codes not UUIDs)
--
-- pickem_rules gains bracket-specific scoring config so the §5.4
-- table is tunable per competition.
--
-- pickem_score_bracket(p_bracket_id) walks every pick on a bracket and
-- compares it against actual results (read from the fixtures table for
-- KO matches + derived group standings). Idempotent; safe to re-run.
--
-- Apply via Supabase SQL Editor:
--   https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new
--
-- Ship target: v0.72.0 (Pick'em P4.5) · 2026-05-23

begin;

-- ===========================================================================
-- 1. picks — add WC bracket slot columns.
-- ===========================================================================

-- series_id becomes nullable so a WC slot pick (no series) can be inserted.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'picks'
      and column_name = 'series_id' and is_nullable = 'NO'
  ) then
    alter table public.picks alter column series_id drop not null;
  end if;
end $$;

alter table public.picks add column if not exists slot_type        text;
alter table public.picks add column if not exists slot_index       int;
alter table public.picks add column if not exists picked_team_code text;
alter table public.picks add column if not exists awarded_points   int;
alter table public.picks add column if not exists scored_at        timestamptz;

-- A row is either:
--   - an NBA-series pick (series_id NOT NULL, slot_type NULL), or
--   - a WC bracket-slot pick (series_id NULL, slot_type NOT NULL).
alter table public.picks drop constraint if exists picks_slot_xor;
alter table public.picks add constraint picks_slot_xor check (
  (series_id is not null and slot_type is null)
  or
  (series_id is null and slot_type is not null)
);

alter table public.picks drop constraint if exists picks_slot_type_check;
alter table public.picks add constraint picks_slot_type_check check (
  slot_type is null or slot_type in (
    'group_rank',   -- one row per (bracket, group, rank); slot_index = (group_letter-1)*3 + rank
    'r32_winner',   -- 16 rows; slot_index 1..16
    'r16_winner',   -- 8 rows;  slot_index 1..8
    'qf_winner',    -- 4 rows;  slot_index 1..4
    'sf_winner',    -- 2 rows;  slot_index 1..2
    'final_winner', -- 1 row;   slot_index 1
    'champion'      -- 1 row;   slot_index 1
  )
);

-- Partial unique on the WC bracket-slot key. The legacy NBA unique
-- (bracket_id, series_id) continues to enforce uniqueness for series
-- picks via Postgres null-distinctness (multiple null series_ids
-- coexist by default).
drop index if exists picks_wc_slot_uidx;
create unique index picks_wc_slot_uidx
  on public.picks (bracket_id, slot_type, slot_index)
  where series_id is null;

create index if not exists picks_slot_type_idx
  on public.picks (bracket_id, slot_type)
  where series_id is null;

-- ===========================================================================
-- 2. brackets — add competition + season + points_cache.
-- ===========================================================================

alter table public.brackets add column if not exists competition   text;
alter table public.brackets add column if not exists points_cache  int not null default 0;
alter table public.brackets add column if not exists locked_at     timestamptz;

-- Backfill competition='NBA-Playoffs-2026' for legacy NBA brackets.
update public.brackets
  set competition = 'NBA-Playoffs-2026'
  where competition is null;

create index if not exists brackets_competition_idx on public.brackets (competition);

-- ===========================================================================
-- 3. pickem_rules — add bracket scoring config (§5.4 table generalized).
-- ===========================================================================

alter table public.pickem_rules add column if not exists bracket_pts_group_rank1 int default 5;
alter table public.pickem_rules add column if not exists bracket_pts_group_rank2 int default 3;
alter table public.pickem_rules add column if not exists bracket_pts_group_rank3 int default 2;
alter table public.pickem_rules add column if not exists bracket_pts_r32         int default 10;
alter table public.pickem_rules add column if not exists bracket_pts_r16         int default 20;
alter table public.pickem_rules add column if not exists bracket_pts_qf          int default 40;
alter table public.pickem_rules add column if not exists bracket_pts_sf          int default 80;
alter table public.pickem_rules add column if not exists bracket_pts_finalist    int default 160;
alter table public.pickem_rules add column if not exists bracket_pts_champion    int default 200;

-- ===========================================================================
-- 4. pickem_score_bracket(p_bracket_id) — the WC bracket scoring engine.
--    Walks every WC-slot pick (series_id IS NULL) on the bracket,
--    looks up the actual result, and writes awarded_points + scored_at.
--    Updates brackets.points_cache with the sum.
--
--    Result lookup for v1:
--      - KO winner picks (r32/r16/qf/sf/final/champion): compare
--        against the corresponding fixture in `fixtures` where
--        stage = the matching stage and the fixture is final.
--      - group_rank picks: compute group standings from finalised
--        group-stage fixtures (sum points by team within each
--        league + group). For v1 we DEFER computed group standings
--        (no real WC group data yet) — group_rank picks score 0
--        until a future migration ships the group-table view.
--
--    Idempotent. Returns a summary JSONB.
-- ===========================================================================

create or replace function public.pickem_score_bracket(p_bracket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  br        public.brackets%rowtype;
  rules     public.pickem_rules%rowtype;
  pick_row  public.picks%rowtype;
  pts       int;
  scored    int := 0;
  total_pts int := 0;
  result    jsonb;
begin
  -- 1. Load the bracket.
  select * into br from public.brackets where id = p_bracket_id;
  if not found then
    raise exception 'bracket % not found', p_bracket_id;
  end if;

  -- 2. Load the ruleset; fall back to defaults if no row.
  if br.competition is not null then
    select * into rules from public.pickem_rules where league = br.competition;
  end if;
  if rules.league is null then
    insert into public.pickem_rules (league)
      values (coalesce(br.competition, 'WC2026'))
      on conflict (league) do nothing;
    select * into rules from public.pickem_rules where league = coalesce(br.competition, 'WC2026');
  end if;

  -- 3. Score every WC-slot pick on this bracket.
  for pick_row in
    select * from public.picks
    where bracket_id = p_bracket_id and series_id is null
  loop
    pts := 0;
    -- v1: only KO winner picks are scorable from the fixtures table.
    -- group_rank scoring requires a group_standings view (deferred).
    if pick_row.slot_type in ('r32_winner', 'r16_winner', 'qf_winner', 'sf_winner', 'final_winner') then
      -- Map slot_type → fixtures.stage.
      declare
        stage_key text := case pick_row.slot_type
          when 'r32_winner'   then 'R32'
          when 'r16_winner'   then 'R16'
          when 'qf_winner'    then 'QF'
          when 'sf_winner'    then 'SF'
          when 'final_winner' then 'final'
        end;
        per_match_pts int := case pick_row.slot_type
          when 'r32_winner'   then rules.bracket_pts_r32
          when 'r16_winner'   then rules.bracket_pts_r16
          when 'qf_winner'    then rules.bracket_pts_qf
          when 'sf_winner'    then rules.bracket_pts_sf
          when 'final_winner' then rules.bracket_pts_finalist
        end;
      begin
        if exists (
          select 1 from public.fixtures f
          join public.teams t on t.id = case f.outcome
            when 'H' then f.home_team
            when 'A' then f.away_team
            else null
          end
          where f.league = coalesce(br.competition, 'WC2026')
            and f.stage = stage_key
            and f.status = 'final'
            and t.id is not null
            and (t.slug = lower(pick_row.picked_team_code) or upper(coalesce(t.abbr, '')) = upper(pick_row.picked_team_code))
        ) then
          pts := coalesce(per_match_pts, 0);
        end if;
      end;
    elsif pick_row.slot_type = 'champion' then
      if exists (
        select 1 from public.fixtures f
        join public.teams t on t.id = case f.outcome when 'H' then f.home_team when 'A' then f.away_team else null end
        where f.league = coalesce(br.competition, 'WC2026')
          and f.stage = 'final'
          and f.status = 'final'
          and t.id is not null
          and (t.slug = lower(pick_row.picked_team_code) or upper(coalesce(t.abbr, '')) = upper(pick_row.picked_team_code))
      ) then
        pts := coalesce(rules.bracket_pts_champion, 0);
      end if;
    end if;
    -- group_rank: deferred (needs group_standings view)

    update public.picks set
      awarded_points = pts,
      scored_at = now()
    where id = pick_row.id;

    scored := scored + 1;
    total_pts := total_pts + pts;
  end loop;

  -- 4. Refresh brackets.points_cache.
  update public.brackets set points_cache = total_pts where id = p_bracket_id;

  result := jsonb_build_object(
    'ok',         true,
    'bracket_id', p_bracket_id,
    'scored',     scored,
    'total_pts',  total_pts
  );
  return result;
end;
$$;

comment on function public.pickem_score_bracket(uuid) is
  'WC bracket scoring engine (Pickem-Gamification-Spec §5.4 + §10.4). Idempotent. group_rank picks deferred to a later migration.';

commit;
