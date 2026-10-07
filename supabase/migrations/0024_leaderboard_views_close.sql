-- ============================================================================
-- 0024 — close the leaderboard views to clients  (found 2026-10-07)
-- ============================================================================
-- Supabase Advisor flagged leaderboard_competition / leaderboard_league /
-- leaderboard_matchday (0021) as SECURITY DEFINER views: they run as their
-- owner, so RLS on league_members / predictions does not apply. With the
-- default grants, anon could read every grup's name, member ids, usernames
-- and points — private grups included — even after 0022 closed the tables.
--
-- Every reader is the API with the service role (leaderboard, leaderboard-
-- national, list-profile, list-grups, league-detail), so:
--   1. security_invoker = on  → the caller's RLS applies (clears the Advisor)
--   2. revoke select from anon, authenticated → clients cannot read them at all
-- service_role bypasses RLS, so the API is unaffected.
-- Idempotent. Verified after apply by scripts/rls-attack.mjs.
-- ============================================================================
begin;
alter view public.leaderboard_competition set (security_invoker = on);
alter view public.leaderboard_league      set (security_invoker = on);
alter view public.leaderboard_matchday    set (security_invoker = on);
revoke all on public.leaderboard_competition, public.leaderboard_league, public.leaderboard_matchday from anon, authenticated;
grant select on public.leaderboard_competition, public.leaderboard_league, public.leaderboard_matchday to service_role;
commit;

-- VERIFICATION (every ok should be true)
-- select 'anon cannot read leaderboard_league' as item, not has_table_privilege('anon','public.leaderboard_league','select') as ok
-- union all select 'authenticated cannot read leaderboard_competition', not has_table_privilege('authenticated','public.leaderboard_competition','select')
-- union all select 'service_role can read leaderboard_matchday', has_table_privilege('service_role','public.leaderboard_matchday','select')
-- union all select 'views are security_invoker', bool_and(coalesce(reloptions::text like '%security_invoker=on%', false)) from pg_class where relname in ('leaderboard_competition','leaderboard_league','leaderboard_matchday');
