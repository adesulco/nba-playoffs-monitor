-- 0004_profile_favorites.sql
-- v0.12.5 — multi-sport favorite teams on the user profile.
--
-- Adds a `favorite_teams` JSONB column to public.profiles so the
-- onboarding flow + Home FOLLOWING card can persist user picks across
-- sessions without a separate table. Array shape:
--   [
--     { sport: 'nba',    id: 'Los Angeles Lakers', short: 'LAL', color: '#552583' },
--     { sport: 'epl',    id: 'arsenal',            short: 'ARS', color: '#EF0107', name: 'Arsenal' },
--     { sport: 'f1',     id: 'mclaren',            short: 'MCL', color: '#FF8000', name: 'McLaren' },
--     { sport: 'tennis', id: 'carlos-alcaraz',     short: 'ESP', color: '#D4A13A', name: 'Carlos Alcaraz' }
--   ]
--
-- The `id` field is sport-specific:
--   nba    — full team name (matches TEAM_META key in src/lib/constants.js)
--   epl    — club slug (matches CLUBS slug in src/lib/sports/epl/clubs.js)
--   f1     — constructor id (matches TEAMS_BY_ID key in src/lib/sports/f1/constants.js)
--   tennis — player slug (matches TENNIS_STARS_BY_SLUG key)
--
-- Safe to re-run. ALTER guarded by IF NOT EXISTS.
-- Apply via Supabase SQL Editor → project egzacjfbmgbcwhtvqixc.

begin;

alter table public.profiles
  add column if not exists favorite_teams jsonb default '[]'::jsonb;

-- Index for the rare case we want to query users by favorite team.
-- Cheap to maintain; lets us later show "X people follow Arsenal"
-- without a full table scan.
create index if not exists profiles_favorite_teams_gin_idx
  on public.profiles using gin (favorite_teams);

-- RLS: users can read + write their own favorites (mirrors existing
-- self-row policies on public.profiles). If the policy already exists
-- this is a no-op on re-run.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_self_update_favorites'
  ) then
    create policy profiles_self_update_favorites
      on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

commit;
