-- 0025_playoff_topologies.sql
-- Playoff Pick'em v3 (2026-11-28, Decision D4):
--   1. Adds `public.league_seasons` — the persistent Grup Trophy Case so one
--      WhatsApp grup (and its invite_code!) rolls over seamlessly from M8 KO ->
--      Indonesia Masters -> UCL Knockouts -> NBA Playoffs -> Asian Cup while
--      archiving each tournament's champion & runner-up.
--   2. Adds optional metadata columns on `public.brackets` (`entry_phase`,
--      `multiplier`) for Babak Baru (Second Chance 0.75x) analytics. Note: the
--      API seam already encodes Babak Baru phases in `brackets.season` (`2027#sf`)
--      and series detail in `picks.picked_team_code` (`BTR:3-1`), so live prod
--      works before and after this migration is applied.
--
-- Apply via Supabase SQL Editor (idempotent):
--   https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new

begin;

alter table public.brackets
  add column if not exists entry_phase text not null default 'full',
  add column if not exists phase_multiplier numeric(4,2) not null default 1.00;

create table if not exists public.league_seasons (
  id                uuid primary key default gen_random_uuid(),
  league_id         uuid not null references public.leagues(id) on delete cascade,
  competition       text not null,
  season            text not null,
  champion_user_id  uuid references auth.users(id) on delete set null,
  champion_name     text,
  champion_points   int not null default 0,
  runner_up_user_id uuid references auth.users(id) on delete set null,
  runner_up_name    text,
  runner_up_points  int not null default 0,
  member_count      int not null default 0,
  finalized_at      timestamptz,
  created_at        timestamptz not null default now(),
  unique (league_id, competition, season)
);

create index if not exists league_seasons_league_idx
  on public.league_seasons (league_id, created_at desc);

alter table public.league_seasons enable row level security;

drop policy if exists league_seasons_member_read on public.league_seasons;
create policy league_seasons_member_read on public.league_seasons
  for select to authenticated
  using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = league_seasons.league_id
        and lm.user_id = auth.uid()
        and lm.status = 'active'
    )
  );

revoke insert, update, delete on public.league_seasons from anon, authenticated;

commit;
