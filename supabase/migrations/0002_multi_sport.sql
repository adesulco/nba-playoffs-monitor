-- 0002_multi_sport.sql
-- Generalize the Pick'em schema beyond NBA playoffs so IBL, football (F1/MotoGP too)
-- can reuse the same `teams`, `series`, `pickem_rules` structures.
--
-- Safe to re-run. All ALTERs guarded by IF EXISTS / IF NOT EXISTS where possible.
-- Apply via Supabase SQL Editor → project egzacjfbmgbcwhtvqixc →
--   https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new
--
-- Ship target: v0.1.2 · 2026-04-20
-- v2: column is `series.round` not `playoff_round`; enum type discovered
--     dynamically; function rewrite deferred to the IBL ship.

begin;

-- ---------------------------------------------------------------------------
-- 1. Add `league` column to core tables (default 'NBA', backfills existing rows)
-- ---------------------------------------------------------------------------

alter table public.teams        add column if not exists league text not null default 'NBA';
alter table public.series       add column if not exists league text not null default 'NBA';
alter table public.pickem_rules add column if not exists league text not null default 'NBA';

create index if not exists teams_league_idx  on public.teams (league);
create index if not exists series_league_idx on public.series (league);

-- ---------------------------------------------------------------------------
-- 2. Drop NBA-only check on `teams.conference`; allow null for non-NBA
-- ---------------------------------------------------------------------------

alter table public.teams drop constraint if exists teams_conference_check;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='teams'
      and column_name='conference' and is_nullable='NO'
  ) then
    alter table public.teams alter column conference drop not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Convert `series.round` from enum to text (free-form round labels)
--    Discovers the enum type name dynamically — not assumed.
-- ---------------------------------------------------------------------------

do $$
declare
  col_type  text;
  enum_type text;
begin
  select data_type, udt_name into col_type, enum_type
  from information_schema.columns
  where table_schema='public' and table_name='series' and column_name='round';

  if col_type = 'USER-DEFINED' then
    alter table public.series alter column round type text using round::text;
    if enum_type is not null then
      execute format('drop type if exists public.%I cascade', enum_type);
    end if;
  end if;
end $$;

alter table public.series drop constraint if exists series_round_label_nonempty;
alter table public.series add  constraint series_round_label_nonempty
  check (round is null or length(btrim(round)) > 0);

-- ---------------------------------------------------------------------------
-- 4. Relax winner_games / loser_games constraints
--    Best-of-3 / -5 / -7 all valid. winner_games >= loser_games; both ∈ [0,4].
-- ---------------------------------------------------------------------------

alter table public.series drop constraint if exists series_winner_games_check;
alter table public.series drop constraint if exists series_loser_games_check;
alter table public.series drop constraint if exists series_games_valid;

alter table public.series add constraint series_games_valid check (
  winner_games is null or (
    winner_games between 0 and 4
    and coalesce(loser_games, 0) between 0 and 4
    and winner_games >= coalesce(loser_games, 0)
  )
);

-- ---------------------------------------------------------------------------
-- 5. Make `pickem_rules` per-league (PK on league instead of singleton)
-- ---------------------------------------------------------------------------

update public.pickem_rules set league = 'NBA' where league is null;

do $$
declare pk_name text;
begin
  select conname into pk_name from pg_constraint
  where conrelid='public.pickem_rules'::regclass and contype='p';
  if pk_name is not null then
    execute format('alter table public.pickem_rules drop constraint %I', pk_name);
  end if;
end $$;

alter table public.pickem_rules add constraint pickem_rules_pkey primary key (league);

-- ---------------------------------------------------------------------------
-- 6. (Deferred) Function rewrite for league-aware scoring
-- ---------------------------------------------------------------------------
-- pickem_score_series() currently works for NBA. League-awareness will be
-- added in the IBL ship once we know IBL's exact pickem_rules column shape.

commit;

-- ---------------------------------------------------------------------------
-- Verification (non-destructive)
-- ---------------------------------------------------------------------------

select 'teams' as t, count(*) rows, count(*) filter (where league='NBA') nba from public.teams
union all select 'series',       count(*), count(*) filter (where league='NBA') from public.series
union all select 'pickem_rules', count(*), count(*) filter (where league='NBA') from public.pickem_rules;

select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='series' and column_name='round';

select conname, pg_get_constraintdef(oid) def from pg_constraint
where conrelid='public.pickem_rules'::regclass and contype='p';
