-- ============================================================================
-- 0018 — Fix infinite-recursion RLS on league_members  (audit F-001, CRITICAL)
-- ============================================================================
-- Symptom: every read of public.league_members AND public.brackets returns
--   HTTP 500  {"code":"42P17","message":"infinite recursion detected in
--   policy for relation \"league_members\""}
--   Reproduced 2026-06-03 with the anon key:
--     GET /rest/v1/brackets?select=id,name,status,score,updated_at      → 500
--     GET /rest/v1/league_members?select=...                            → 500
--   This breaks the NBA bracket/league summary (useUserBracketSummary.js) and
--   any surface reading those tables.
--
-- Cause: the league_members SELECT policy checks "is the caller a member of
--   this league?" with a sub-SELECT on league_members itself. That sub-SELECT
--   re-triggers the same policy → infinite recursion (Postgres 42P17). brackets
--   500s too because its policy references league_members.
--
-- Fix (canonical Supabase pattern): move the membership check into a
--   SECURITY DEFINER function. It runs as the function owner, so RLS is NOT
--   re-applied when it reads league_members → the cycle is broken. Then drop
--   the recursive policies and recreate a correct, non-recursive set.
--
-- Scope: touches ONLY league_members policies (+ one helper function). brackets
--   policies are left untouched — fixing league_members resolves the brackets
--   500 automatically (brackets only failed because it referenced the broken
--   league_members policy).
--
-- Idempotent: safe to re-run. Drops policies by introspection (names were
--   created out-of-band via the dashboard, not a repo migration).
-- ============================================================================

-- Wrapped in a single transaction so the policy drop + recreate is atomic —
-- if any statement fails, nothing applies (league_members never ends up with
-- RLS enabled but zero policies = deny-all).
begin;

-- 1) Membership-check helper. SECURITY DEFINER → bypasses RLS internally, so
--    calling it from a league_members policy does not recurse.
create or replace function public.is_league_member(_league_id uuid, _user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = _league_id
      and lm.user_id   = _user_id
  );
$$;

revoke all on function public.is_league_member(uuid, uuid) from public;
grant execute on function public.is_league_member(uuid, uuid)
  to anon, authenticated, service_role;

-- 2) Drop every existing policy on league_members (names unknown).
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'league_members'
  loop
    execute format('drop policy if exists %I on public.league_members', p.policyname);
  end loop;
end $$;

alter table public.league_members enable row level security;

-- 3) Recreate a correct, NON-recursive policy set.

-- SELECT: read your own membership rows, plus the rows of any league you
-- belong to (powers the co-member leaderboard). Membership is checked via the
-- SECURITY DEFINER helper, so there is no recursion. anon (auth.uid() = null)
-- matches neither branch → reads nothing, which is the intended privacy
-- posture (group rosters are not public; public leaderboards read the
-- leaderboard_* views, not this table directly).
create policy league_members_select on public.league_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_league_member(league_id, (select auth.uid()))
  );

-- INSERT/UPDATE/DELETE: you manage only your own membership row. (The scoring
-- RPC + admin paths use the service-role key, which bypasses RLS.)
create policy league_members_insert on public.league_members
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy league_members_update on public.league_members
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy league_members_delete on public.league_members
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

commit;

-- ============================================================================
-- POST-APPLY VERIFICATION (run from a shell; expect HTTP 200, empty array []
-- for anon since rosters aren't public — NOT 500):
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--     "https://egzacjfbmgbcwhtvqixc.supabase.co/rest/v1/league_members?select=user_id&limit=1"
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--     "https://egzacjfbmgbcwhtvqixc.supabase.co/rest/v1/brackets?select=id&limit=1"
-- ============================================================================
