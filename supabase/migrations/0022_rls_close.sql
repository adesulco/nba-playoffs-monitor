-- ============================================================================
-- 0022 — RLS close  (doc 17 S1, audit 2026-10-01 "four Supabase RLS holes")
-- ============================================================================
-- The four holes, verified with a user JWT by scripts/rls-attack.mjs:
--   H1  league_members_insert (0018) let any signed-in user join any grup
--       without the invite code.
--   H2  league_members_update (0018) let a member rewrite points_cache,
--       exact_count_cache and status on their own row.
--   H3  predictions_owner_insert (0015) had no lock check, and the row could
--       carry awarded_points / base_points / tier.
--   H4  pickem_score_fixture, pickem_score_bracket, pickem_update_streak,
--       pickem_award_badges (and the 0021 writers) were EXECUTE-able by
--       anon and authenticated — PostgREST exposes every public function.
--
-- Principle: the API (service role) is the only writer of grup membership,
-- scores and standings. The client keeps exactly what the 4a screens use:
--   - read its own membership rows and co-member rows (0018 select policy)
--   - leave a grup (delete own row)
--   - insert / update / delete its OWN pick, pick columns only, before lock
--   - read everything public (fixtures, badges, streaks, leaderboards)
-- Direct profile writes (nickname) are untouched here; S1 step 5 routes
-- them through the update-profile action and 0023 closes that.
--
-- Column privileges in Postgres only bite when the table-level privilege is
-- absent, so each table is REVOKEd first and re-GRANTed column by column.
--
-- Idempotent. Tested on a local PG16 against 0015–0021 with
-- supabase/tests/0022_rls_close.test.sql. Apply via the SQL editor (confirm
-- the "Potential issue detected" dialog — REVOKE counts as destructive):
--   https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new
-- ============================================================================

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- H1 + H2 · league_members: no client inserts, no client updates.
--     join-league / approve-member / grant-entitlement run with the service
--     role and verify the invite code there. Leaving a grup (delete own row)
--     stays.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists league_members_insert on public.league_members;
drop policy if exists league_members_update on public.league_members;
revoke insert, update on public.league_members from anon, authenticated;
-- anon has no business reading rosters at all (the select policy is
-- `to authenticated`, but the grant was still there).
revoke all on public.league_members from anon;

-- ───────────────────────────────────────────────────────────────────────────
-- H3 · predictions: own row, pick columns only, before lock.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists predictions_owner_insert on public.predictions;
create policy predictions_owner_insert on public.predictions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.fixtures f
      where f.id = predictions.fixture_id
        and f.lock_at > now()
        and f.status <> 'final'
    )
  );

-- update: USING must also hold before the edit (0015 only checked the new
-- row), so a locked pick can't be touched at all.
drop policy if exists predictions_owner_update on public.predictions;
create policy predictions_owner_update on public.predictions
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.fixtures f where f.id = predictions.fixture_id and f.lock_at > now())
  )
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.fixtures f where f.id = predictions.fixture_id and f.lock_at > now())
  );

revoke all on public.predictions from anon;
revoke insert, update on public.predictions from authenticated;
grant insert (user_id, fixture_id, league, matchday, picked_outcome, picked_home, picked_away, is_jagoan, survivor_pick)
  on public.predictions to authenticated;
grant update (picked_outcome, picked_home, picked_away, is_jagoan, survivor_pick, matchday)
  on public.predictions to authenticated;
-- awarded_points, base_points, tier, penalty_points, streak_bonus,
-- consensus_at_lock, jagoan_mult_applied, upset_mult_applied, scored_at:
-- server-only by omission above.

-- ───────────────────────────────────────────────────────────────────────────
-- Survivor entries: the API writes them (service role); a client insert, if
-- any ever returns, must at least be for a grup the user belongs to.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists survivor_owner_insert on public.survivor_entries;
create policy survivor_owner_insert on public.survivor_entries
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_league_member(league_id, (select auth.uid()))
  );
revoke all on public.survivor_entries from anon;
revoke update, delete on public.survivor_entries from authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Leagues: created / edited only through the API.
-- ───────────────────────────────────────────────────────────────────────────
revoke insert, update, delete on public.leagues from anon, authenticated;

-- Server-written tables with select-only policies: close the grants too, so
-- a future permissive policy can't reopen writes by accident.
revoke insert, update, delete on public.streaks, public.user_badges, public.entitlements from anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- H4 · scoring / badge / streak writers: service role only.
--     Matched by name across every overload, so the legacy NBA
--     pickem_score_series and the 0021 helpers are covered without
--     guessing signatures.
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'pickem_score_fixture', 'pickem_score_bracket', 'pickem_score_series',
        'pickem_update_streak', 'pickem_award_badges',
        'pickem_recompute_correct_streak', 'pickem_refresh_league_caches'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- Pure helpers stay callable (the client's provisional-points engine may
-- cross-check against them): pickem_resolve_config, pickem_tier,
-- pickem_points_for, pickem_template_config, pickem_member_points (stable,
-- runs as the caller, RLS applies), is_league_member.

commit;

-- ============================================================================
-- VERIFICATION (run after apply; every row should say t)
-- ============================================================================
-- select 'no member insert policy' as item, count(*) = 0 as ok from pg_policies where tablename='league_members' and policyname='league_members_insert'
-- union all select 'no member update policy', count(*) = 0 from pg_policies where tablename='league_members' and policyname='league_members_update'
-- union all select 'authenticated cannot insert members', not has_table_privilege('authenticated','public.league_members','insert')
-- union all select 'authenticated cannot update members', not has_table_privilege('authenticated','public.league_members','update')
-- union all select 'authenticated cannot write awarded_points', not has_column_privilege('authenticated','public.predictions','awarded_points','insert')
-- union all select 'authenticated cannot write tier', not has_column_privilege('authenticated','public.predictions','tier','update')
-- union all select 'authenticated can write picked_home', has_column_privilege('authenticated','public.predictions','picked_home','insert')
-- union all select 'insert policy checks lock', pg_get_expr(polwithcheck, polrelid) like '%lock_at > now()%' from pg_policy where polname='predictions_owner_insert'
-- union all select 'anon cannot run score_fixture', not has_function_privilege('anon','public.pickem_score_fixture(uuid)','execute')
-- union all select 'authenticated cannot run award_badges', not has_function_privilege('authenticated','public.pickem_award_badges(uuid,text,int)','execute')
-- union all select 'service_role can run score_fixture', has_function_privilege('service_role','public.pickem_score_fixture(uuid)','execute')
-- union all select 'authenticated cannot insert leagues', not has_table_privilege('authenticated','public.leagues','insert');
-- ============================================================================
