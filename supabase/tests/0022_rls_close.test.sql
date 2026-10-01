-- ============================================================================
-- Scenario tests for 0022_rls_close.sql. Run on a scratch DB with 0015–0022
-- applied, AFTER granting Supabase-like defaults (see the runner). Each
-- attack must fail with 42501; the legitimate pick path must still work.
-- ============================================================================
begin;

create or replace function pg_temp.must_fail(label text, stmt text) returns void
language plpgsql as $$
begin
  execute stmt;
  raise exception '[FAIL] % — statement succeeded: %', label, stmt;
exception
  when insufficient_privilege then raise notice '[ok] % → 42501', label;
  when raise_exception then raise;
end $$;

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000aa01'), ('00000000-0000-0000-0000-00000000aa02');
insert into public.teams (tricode, name, league) values ('RLA','a','RLS'), ('RLB','b','RLS') on conflict do nothing;
insert into public.leagues (id, name, invite_code, owner_id, competition) values
  ('20000000-0000-0000-0000-000000000001', 'victim grup', 'VictimCode', '00000000-0000-0000-0000-00000000aa02', 'RLS');
insert into public.league_members (league_id, user_id) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000aa02');
insert into public.fixtures (id, league, season, stage, matchday, home_team, away_team, kickoff_at, lock_at) values
  ('f0000000-0000-0000-0000-00000000aa01','RLS','2026','regular',1,'RLA','RLB', now() - interval '1 hour', now() - interval '1 hour'),  -- locked
  ('f0000000-0000-0000-0000-00000000aa02','RLS','2026','regular',2,'RLB','RLA', now() + interval '1 day',  now() + interval '1 day');   -- open

-- become user aa01 (signed in, not a member of the victim grup)
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);

select pg_temp.must_fail('H1 join grup without invite',
  $q$insert into public.league_members (league_id, user_id) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000aa01')$q$);
select pg_temp.must_fail('H2 forge points_cache',
  $q$update public.league_members set points_cache = 999 where user_id = '00000000-0000-0000-0000-00000000aa01'$q$);
select pg_temp.must_fail('H3 insert pick with awarded_points',
  $q$insert into public.predictions (user_id, fixture_id, league, matchday, picked_outcome, awarded_points) values ('00000000-0000-0000-0000-00000000aa01','f0000000-0000-0000-0000-00000000aa02','RLS',2,'H',50)$q$);
select pg_temp.must_fail('H3 insert pick with tier',
  $q$insert into public.predictions (user_id, fixture_id, league, matchday, picked_outcome, tier) values ('00000000-0000-0000-0000-00000000aa01','f0000000-0000-0000-0000-00000000aa02','RLS',2,'H','exact')$q$);
select pg_temp.must_fail('H4 run pickem_score_fixture',
  $q$select public.pickem_score_fixture('f0000000-0000-0000-0000-00000000aa01')$q$);
select pg_temp.must_fail('H4 run pickem_award_badges',
  $q$select public.pickem_award_badges('00000000-0000-0000-0000-00000000aa01','RLS',1)$q$);
select pg_temp.must_fail('H4 run pickem_update_streak',
  $q$select public.pickem_update_streak('00000000-0000-0000-0000-00000000aa01','RLS',1)$q$);
select pg_temp.must_fail('H4 run pickem_refresh_league_caches',
  $q$select public.pickem_refresh_league_caches('RLS')$q$);
select pg_temp.must_fail('create league directly',
  $q$insert into public.leagues (name, invite_code, owner_id, competition) values ('evil','EvilCode','00000000-0000-0000-0000-00000000aa01','RLS')$q$);
select pg_temp.must_fail('forge a badge',
  $q$insert into public.user_badges (user_id, badge_code, competition) values ('00000000-0000-0000-0000-00000000aa01','juara_grup','RLS')$q$);

-- H3 lock check is RLS (42501 "new row violates row-level security policy")
select pg_temp.must_fail('H3 insert pick on a LOCKED fixture',
  $q$insert into public.predictions (user_id, fixture_id, league, matchday, picked_outcome, picked_home, picked_away) values ('00000000-0000-0000-0000-00000000aa01','f0000000-0000-0000-0000-00000000aa01','RLS',1,'H',1,0)$q$);

-- Legitimate path still works: pick on an open fixture, edit it, delete it.
insert into public.predictions (user_id, fixture_id, league, matchday, picked_outcome, picked_home, picked_away)
  values ('00000000-0000-0000-0000-00000000aa01','f0000000-0000-0000-0000-00000000aa02','RLS',2,'H',2,1);
update public.predictions set picked_home = 3 where user_id = '00000000-0000-0000-0000-00000000aa01' and fixture_id = 'f0000000-0000-0000-0000-00000000aa02';
do $$ begin
  if (select picked_home from public.predictions where user_id = '00000000-0000-0000-0000-00000000aa01' and fixture_id = 'f0000000-0000-0000-0000-00000000aa02') <> 3
  then raise exception '[FAIL] legit pick edit did not apply'; end if;
  raise notice '[ok] legit pick insert + edit on an open fixture';
end $$;
select pg_temp.must_fail('edit a pick to set awarded_points',
  $q$update public.predictions set awarded_points = 99 where user_id = '00000000-0000-0000-0000-00000000aa01'$q$);
delete from public.predictions where user_id = '00000000-0000-0000-0000-00000000aa01' and fixture_id = 'f0000000-0000-0000-0000-00000000aa02';

-- pure helpers stay callable
do $$ begin
  if public.pickem_tier('H', 2, 1, 2, 1) <> 'exact' then raise exception '[FAIL] pickem_tier not callable'; end if;
  raise notice '[ok] pure helpers callable by authenticated';
end $$;

-- anon: nothing
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.must_fail('anon run pickem_score_fixture',
  $q$select public.pickem_score_fixture('f0000000-0000-0000-0000-00000000aa01')$q$);
select pg_temp.must_fail('anon read league_members',
  $q$select count(*) from public.league_members$q$);
select pg_temp.must_fail('anon insert prediction',
  $q$insert into public.predictions (user_id, fixture_id, league, matchday, picked_outcome) values ('00000000-0000-0000-0000-00000000aa01','f0000000-0000-0000-0000-00000000aa02','RLS',2,'H')$q$);

reset role;
-- service role still scores
do $$ begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform public.pickem_score_fixture('f0000000-0000-0000-0000-00000000aa02');  -- not final → ok:false, but callable
  raise notice '[ok] owner/service path still executes the engine';
end $$;

select 'ALL 0022 SCENARIOS OK' as result;
rollback;
