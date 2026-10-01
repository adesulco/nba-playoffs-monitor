-- ============================================================================
-- Scenario tests for 0021_scoring_v1.sql — doc 17 §1 edge cases.
-- Run on a scratch DB that has migrations 0015–0021 applied (never prod):
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/0021_scoring_v1.test.sql
-- Every block raises on a mismatch; a clean run prints "ALL 0021 SCENARIOS OK".
-- ============================================================================
begin;

create or replace function pg_temp.expect(label text, got anyelement, want anyelement) returns void
language plpgsql as $$
begin
  if got is distinct from want then
    raise exception '[FAIL] %: got % want %', label, got, want;
  end if;
  raise notice '[ok] % = %', label, got;
end $$;

-- ── fixtures: users, teams, rules, grups ────────────────────────────────────
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'), ('00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005'), ('00000000-0000-0000-0000-000000000006');
insert into public.profiles (id, nickname) values
  ('00000000-0000-0000-0000-000000000001','u1'), ('00000000-0000-0000-0000-000000000002','u2'),
  ('00000000-0000-0000-0000-000000000003','u3'), ('00000000-0000-0000-0000-000000000004','u4'),
  ('00000000-0000-0000-0000-000000000005','u5'), ('00000000-0000-0000-0000-000000000006','u6');
insert into public.teams (tricode, name, league) values
  ('AAA','A','TST'),('BBB','B','TST'),('CCC','C','TST'),('DDD','D','TST'),('EEE','E','TST'),('FFF','F','TST');
insert into public.pickem_rules (league) values ('TST');   -- Spec v1 defaults (Standar)

insert into public.leagues (id, name, invite_code, owner_id, competition, enabled_modes, scoring_config) values
  ('10000000-0000-0000-0000-000000000001','Standar grup','L1code','00000000-0000-0000-0000-000000000001','TST',
   '{"match":true,"jagoan":true,"survivor":true}', null),
  ('10000000-0000-0000-0000-000000000002','Sultan grup','L2code','00000000-0000-0000-0000-000000000004','TST',
   '{"match":true,"jagoan":true,"survivor":true}', '{"template":"sultan"}');
insert into public.league_members (league_id, user_id, base_points) values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',0),
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',0),
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',4),  -- late-join par
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005',0),
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006',0),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',0),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004',0);

-- md1: f1 AAA v BBB, f2 CCC v DDD, f3 EEE v FFF · md2: f4 AAA v CCC, f5 BBB v DDD, f6 EEE v AAA
insert into public.fixtures (id, league, season, stage, matchday, home_team, away_team, kickoff_at, lock_at) values
  ('f0000000-0000-0000-0000-000000000001','TST','2026','regular',1,'AAA','BBB', now() - interval '3 day', now() - interval '3 day'),
  ('f0000000-0000-0000-0000-000000000002','TST','2026','regular',1,'CCC','DDD', now() - interval '3 day', now() - interval '3 day'),
  ('f0000000-0000-0000-0000-000000000003','TST','2026','regular',1,'EEE','FFF', now() - interval '3 day', now() - interval '3 day'),
  ('f0000000-0000-0000-0000-000000000004','TST','2026','regular',2,'AAA','CCC', now() - interval '1 day', now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000005','TST','2026','regular',2,'BBB','DDD', now() - interval '1 day', now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000006','TST','2026','regular',2,'EEE','AAA', now() - interval '1 day', now() - interval '1 day');

-- survivor entries (created before md1)
insert into public.survivor_entries (user_id, league_id, competition, created_at) values
  ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','TST', now() - interval '10 day'),
  ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','TST', now() - interval '10 day'),
  ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','TST', now() - interval '10 day'),
  ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','TST', now() - interval '10 day');

-- picks md1 (f1 result 2-1 H; f2 result 0-1 A; f3 void)
insert into public.predictions (user_id, fixture_id, league, matchday, picked_outcome, picked_home, picked_away, is_jagoan, survivor_pick) values
  -- f1
  ('00000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001','TST',1,'H',2,1,true, true),   -- exact, jagoan, survivor AAA
  ('00000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000001','TST',1,'H',3,2,false,false),  -- margin
  ('00000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000001','TST',1,'H',3,1,false,false),  -- result
  ('00000000-0000-0000-0000-000000000004','f0000000-0000-0000-0000-000000000001','TST',1,'D',1,1,false,false),  -- nyaris (2 vs 3 goals)
  ('00000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000001','TST',1,'H',2,1,false,false),  -- exact (tie pair)
  ('00000000-0000-0000-0000-000000000006','f0000000-0000-0000-0000-000000000001','TST',1,'H',2,1,false,false),  -- exact (tie pair)
  -- f2 (consensus: H ×3, A ×1 → A share 0.25 < 0.30 → underdog)
  ('00000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000002','TST',1,'H',2,0,false,false),  -- miss (2 vs 1 goals → nyaris? 2 vs 1 = within 1 → nyaris)
  ('00000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000002','TST',1,'H',1,0,false,true),   -- survivor CCC → out
  ('00000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000002','TST',1,'H',4,0,false,false),  -- miss (4 vs 1)
  ('00000000-0000-0000-0000-000000000004','f0000000-0000-0000-0000-000000000002','TST',1,'A',0,2,true, false),  -- result + underdog ×1.5 + jagoan ×2 = 6
  -- f3 (void)
  ('00000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000003','TST',1,'H',1,0,false,false),
  ('00000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000003','TST',1,'A',0,1,true, false);  -- jagoan on a void match → no penalty

-- ── score f1 ────────────────────────────────────────────────────────────────
update public.fixtures set status = 'final', home_score = 2, away_score = 1 where id = 'f0000000-0000-0000-0000-000000000001';
select pickem_score_fixture('f0000000-0000-0000-0000-000000000001') \gset r1_
select pg_temp.expect('f1 scored_count', (:'r1_pickem_score_fixture'::jsonb->>'scored_count')::int, 6);

select pg_temp.expect('u1 f1 exact ×2 jagoan', awarded_points, 10) from predictions where user_id = '00000000-0000-0000-0000-000000000001' and fixture_id = 'f0000000-0000-0000-0000-000000000001';
select pg_temp.expect('u1 f1 tier', tier, 'exact') from predictions where user_id = '00000000-0000-0000-0000-000000000001' and fixture_id = 'f0000000-0000-0000-0000-000000000001';
select pg_temp.expect('u2 f1 margin', awarded_points, 3) from predictions where user_id = '00000000-0000-0000-0000-000000000002' and fixture_id = 'f0000000-0000-0000-0000-000000000001';
select pg_temp.expect('u3 f1 result', awarded_points, 2) from predictions where user_id = '00000000-0000-0000-0000-000000000003' and fixture_id = 'f0000000-0000-0000-0000-000000000001';
select pg_temp.expect('u4 f1 nyaris', tier, 'nyaris') from predictions where user_id = '00000000-0000-0000-0000-000000000004' and fixture_id = 'f0000000-0000-0000-0000-000000000001';
select pg_temp.expect('u4 f1 nyaris pts', awarded_points, 1) from predictions where user_id = '00000000-0000-0000-0000-000000000004' and fixture_id = 'f0000000-0000-0000-0000-000000000001';
select pg_temp.expect('f1 consensus H', consensus_at_lock, 0.8333::numeric) from predictions where user_id = '00000000-0000-0000-0000-000000000001' and fixture_id = 'f0000000-0000-0000-0000-000000000001';

-- idempotent re-run: same numbers
select pickem_score_fixture('f0000000-0000-0000-0000-000000000001');
select pg_temp.expect('u1 f1 re-run unchanged', awarded_points, 10) from predictions where user_id = '00000000-0000-0000-0000-000000000001' and fixture_id = 'f0000000-0000-0000-0000-000000000001';

-- ── score f2 (underdog + jagoan stack; survivor out) ────────────────────────
update public.fixtures set status = 'final', home_score = 0, away_score = 1 where id = 'f0000000-0000-0000-0000-000000000002';
select pickem_score_fixture('f0000000-0000-0000-0000-000000000002');
select pg_temp.expect('u4 f2 consensus A', consensus_at_lock, 0.25::numeric) from predictions where user_id = '00000000-0000-0000-0000-000000000004' and fixture_id = 'f0000000-0000-0000-0000-000000000002';
select pg_temp.expect('u4 f2 result×1.5×2', awarded_points, 6) from predictions where user_id = '00000000-0000-0000-0000-000000000004' and fixture_id = 'f0000000-0000-0000-0000-000000000002';
select pg_temp.expect('u1 f2 nyaris (2-0 vs 0-1)', tier, 'nyaris') from predictions where user_id = '00000000-0000-0000-0000-000000000001' and fixture_id = 'f0000000-0000-0000-0000-000000000002';
select pg_temp.expect('u3 f2 miss', tier, 'miss') from predictions where user_id = '00000000-0000-0000-0000-000000000003' and fixture_id = 'f0000000-0000-0000-0000-000000000002';
select pg_temp.expect('u2 survivor out on f2', status, 'out') from survivor_entries where user_id = '00000000-0000-0000-0000-000000000002' and league_id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect('u1 survivor alive (L1)', status, 'alive') from survivor_entries where user_id = '00000000-0000-0000-0000-000000000001' and league_id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect('u3 still alive (md1 not complete, f3 open)', status, 'alive') from survivor_entries where user_id = '00000000-0000-0000-0000-000000000003';

-- score correction: f2 flips to 1-0 H → u2 revived; then back → out again
update public.fixtures set home_score = 1, away_score = 0, outcome = null where id = 'f0000000-0000-0000-0000-000000000002';
select pickem_score_fixture('f0000000-0000-0000-0000-000000000002');
select pg_temp.expect('u2 revived after correction', status, 'alive') from survivor_entries where user_id = '00000000-0000-0000-0000-000000000002';
select pg_temp.expect('u4 f2 now nyaris (0-2 vs 1-0)', awarded_points, 1) from predictions where user_id = '00000000-0000-0000-0000-000000000004' and fixture_id = 'f0000000-0000-0000-0000-000000000002';
update public.fixtures set home_score = 0, away_score = 1, outcome = null where id = 'f0000000-0000-0000-0000-000000000002';
select pickem_score_fixture('f0000000-0000-0000-0000-000000000002');
select pg_temp.expect('u2 out again', status, 'out') from survivor_entries where user_id = '00000000-0000-0000-0000-000000000002';
select pg_temp.expect('u4 f2 back to 6', awarded_points, 6) from predictions where user_id = '00000000-0000-0000-0000-000000000004' and fixture_id = 'f0000000-0000-0000-0000-000000000002';

-- ── f3 void (final, no score) → md1 complete → no-pick elimination ──────────
update public.fixtures set status = 'final' where id = 'f0000000-0000-0000-0000-000000000003';
select pickem_score_fixture('f0000000-0000-0000-0000-000000000003') \gset r3_
select pg_temp.expect('f3 void flag', (:'r3_pickem_score_fixture'::jsonb->>'void')::boolean, true);
select pg_temp.expect('u3 f3 void tier', tier, 'void') from predictions where user_id = '00000000-0000-0000-0000-000000000003' and fixture_id = 'f0000000-0000-0000-0000-000000000003';
select pg_temp.expect('u3 f3 jagoan on void: no penalty', penalty_points, 0) from predictions where user_id = '00000000-0000-0000-0000-000000000003' and fixture_id = 'f0000000-0000-0000-0000-000000000003';
select pg_temp.expect('u3 no survivor pick → out at md1 end', status, 'out') from survivor_entries where user_id = '00000000-0000-0000-0000-000000000003';
select pg_temp.expect('u3 eliminated md', eliminated_matchday, 1) from survivor_entries where user_id = '00000000-0000-0000-0000-000000000003';

-- ── grup caches after md1 ───────────────────────────────────────────────────
-- L1 (Standar): u1 = 10 + 1 = 11; u2 = 3 + 0 = 3; u3 = 2 + 0 + 4 par = 6; u5 = u6 = 5
select pg_temp.expect('L1 u1 cache', points_cache, 11) from league_members where league_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000001';
select pg_temp.expect('L1 u3 cache incl. par', points_cache, 6) from league_members where league_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000003';
select pg_temp.expect('L1 u1 exact_count', exact_count_cache, 1) from league_members where league_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000001';
-- L2 (Sultan): u4 = 1 + 6 = 7 (no misses with jagoan yet)
select pg_temp.expect('L2 u4 cache', points_cache, 7) from league_members where league_id = '10000000-0000-0000-0000-000000000002' and user_id = '00000000-0000-0000-0000-000000000004';
-- shared rank: u5 and u6 identical
select pg_temp.expect('u5/u6 shared rank', (select count(distinct rank) from leaderboard_league where league_id = '10000000-0000-0000-0000-000000000001' and user_id in ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006')), 1::bigint);
select pg_temp.expect('competition board u1 top', (select user_id from leaderboard_competition where competition = 'TST' and rank = 1 limit 1), '00000000-0000-0000-0000-000000000001'::uuid);
select pg_temp.expect('nyaris column', (select nyaris_count from leaderboard_league where league_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000001'), 1::bigint);

-- ── md2: Sultan penalty + floor, streak, draw = out, postponed, lock drift ──
insert into public.predictions (user_id, fixture_id, league, matchday, picked_outcome, picked_home, picked_away, is_jagoan, survivor_pick) values
  ('00000000-0000-0000-0000-000000000004','f0000000-0000-0000-0000-000000000004','TST',2,'A',0,3,true, false),  -- jagoan miss (4 goals off)
  ('00000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000004','TST',2,'H',1,0,false,false),  -- result (actual 2-0)
  ('00000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000005','TST',2,'H',2,1,false,true),   -- survivor BBB; actual 1-1 D → out, pick nyaris
  ('00000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000006','TST',2,'A',0,1,false,false);  -- result (actual 0-2)

update public.fixtures set status = 'final', home_score = 2, away_score = 0 where id = 'f0000000-0000-0000-0000-000000000004';
select pickem_score_fixture('f0000000-0000-0000-0000-000000000004');
select pg_temp.expect('u4 f4 competition penalty 0 (penalty off at comp level)', penalty_points, 0) from predictions where user_id = '00000000-0000-0000-0000-000000000004' and fixture_id = 'f0000000-0000-0000-0000-000000000004';
-- L2 Sultan: md2 = 0 − round(0.25×2)=1 → floor 0 ; total still 7
select pg_temp.expect('L2 u4 floor at 0 after jagoan miss', points_cache, 7) from league_members where league_id = '10000000-0000-0000-0000-000000000002' and user_id = '00000000-0000-0000-0000-000000000004';

update public.fixtures set status = 'final', home_score = 1, away_score = 1 where id = 'f0000000-0000-0000-0000-000000000005';
select pickem_score_fixture('f0000000-0000-0000-0000-000000000005');
select pg_temp.expect('u1 survivor out on draw (L1)', status, 'out') from survivor_entries where user_id = '00000000-0000-0000-0000-000000000001' and league_id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect('u1 survivor out on draw (L2, same pick)', status, 'out') from survivor_entries where user_id = '00000000-0000-0000-0000-000000000001' and league_id = '10000000-0000-0000-0000-000000000002';

-- postponed is a valid status; lock follows a rescheduled kickoff
update public.fixtures set status = 'postponed' where id = 'f0000000-0000-0000-0000-000000000006';
update public.fixtures set kickoff_at = kickoff_at + interval '2 hours' where id = 'f0000000-0000-0000-0000-000000000006';
select pg_temp.expect('lock follows kickoff', lock_at = kickoff_at, true) from fixtures where id = 'f0000000-0000-0000-0000-000000000006';
select pg_temp.expect('postponed fixture not scored', (pickem_score_fixture('f0000000-0000-0000-0000-000000000006')->>'reason'), 'not_final');

-- correct streak: u1 chain in kickoff order = f1 exact, f2 nyaris(x), f3 void(skip), f4 result, f5 nyaris(x), f6 result → no run of 3 yet
update public.fixtures set status = 'final', home_score = 0, away_score = 2 where id = 'f0000000-0000-0000-0000-000000000006';
select pickem_score_fixture('f0000000-0000-0000-0000-000000000006');
select pg_temp.expect('u1 correct streak current', current_streak, 1) from streaks where user_id = '00000000-0000-0000-0000-000000000001' and competition = 'TST' and kind = 'correct';
select pg_temp.expect('u1 submission streak', current_streak, 2) from streaks where user_id = '00000000-0000-0000-0000-000000000001' and competition = 'TST' and kind = 'submission';

-- make u1's f2 and f5 picks correct to complete a run of 3 (f1,f2,f4 → bonus on f4), check Sultan grup pays and Standar doesn't
update public.predictions set picked_outcome = 'A', picked_home = 0, picked_away = 1 where user_id = '00000000-0000-0000-0000-000000000001' and fixture_id = 'f0000000-0000-0000-0000-000000000002';
select pickem_score_fixture('f0000000-0000-0000-0000-000000000002');
-- u1 chain: f1 ok, f2 ok(exact), f4 ok → run 3 → bonus at f4 (comp streak_bonus 0 → predictions.streak_bonus stays 0), then f5 x, f6 ok → current 1
select pg_temp.expect('u1 longest correct run', longest_streak, 3) from streaks where user_id = '00000000-0000-0000-0000-000000000001' and competition = 'TST' and kind = 'correct';
select pg_temp.expect('competition streak bonus off', sum(streak_bonus), 0::bigint) from predictions where user_id = '00000000-0000-0000-0000-000000000001';
-- u1 points: f1 10, f2 exact 5 (its consensus snapshot stays the pre-edit H share 0.75 — picks can't
-- change after lock in prod, so a snapshot is never re-taken), f4 2, f5 nyaris 1, f6 2 → 20 ; L1 = 20 ; L2 (Sultan) = 20 + 3 streak = 23
select pg_temp.expect('u1 f2 exact (snapshot kept)', awarded_points, 5) from predictions where user_id = '00000000-0000-0000-0000-000000000001' and fixture_id = 'f0000000-0000-0000-0000-000000000002';
select pg_temp.expect('L1 u1 total (Standar)', points_cache, 20) from league_members where league_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000001';
select pg_temp.expect('L2 u1 total (Sultan +3 streak)', points_cache, 23) from league_members where league_id = '10000000-0000-0000-0000-000000000002' and user_id = '00000000-0000-0000-0000-000000000001';

-- re-run every fixture: nothing changes (idempotent)
select pickem_score_fixture(id) from fixtures where league = 'TST' and status = 'final';
select pg_temp.expect('L2 u1 after full re-run', points_cache, 23) from league_members where league_id = '10000000-0000-0000-0000-000000000002' and user_id = '00000000-0000-0000-0000-000000000001';
select pg_temp.expect('L1 u3 after full re-run', points_cache, 6) from league_members where league_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000003';

-- ── 1–1 KO decided on pens: D 1–1 is exact; outcome stores the advancer ────
insert into public.fixtures (id, league, season, stage, matchday, home_team, away_team, kickoff_at, lock_at, status, home_score, away_score, outcome) values
  ('f0000000-0000-0000-0000-000000000009','TST','2026','QF',3,'AAA','DDD', now() - interval '1 hour', now() - interval '1 hour','final',1,1,'H');
insert into public.predictions (user_id, fixture_id, league, matchday, picked_outcome, picked_home, picked_away) values
  ('00000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000009','TST',3,'D',1,1);
select pickem_score_fixture('f0000000-0000-0000-0000-000000000009');
select pg_temp.expect('KO 1-1 on pens: D 1-1 exact', tier, 'exact') from predictions where user_id = '00000000-0000-0000-0000-000000000002' and fixture_id = 'f0000000-0000-0000-0000-000000000009';

-- ── badges: streak_5 and perfect_md ─────────────────────────────────────────
select pg_temp.expect('no streak_5 yet', (select count(*) from user_badges where badge_code = 'streak_5'), 0::bigint);
-- u5: exact on f1 only; give u5 picks on f2,f4,f5,f6 all correct → longest 5 → streak_5
insert into public.predictions (user_id, fixture_id, league, matchday, picked_outcome, picked_home, picked_away) values
  ('00000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000002','TST',1,'A',0,1),
  ('00000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000004','TST',2,'H',2,0),
  ('00000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000005','TST',2,'D',1,1),
  ('00000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000006','TST',2,'A',0,2);
select pickem_score_fixture(id) from fixtures where id in ('f0000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000004','f0000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000006');
select pg_temp.expect('u5 streak_5 badge', (select count(*) from user_badges where badge_code = 'streak_5' and user_id = '00000000-0000-0000-0000-000000000005'), 1::bigint);
select pg_temp.expect('u5 perfect md2 badge', (select count(*) from user_badges where badge_code = 'perfect_md' and user_id = '00000000-0000-0000-0000-000000000005' and matchday = 2), 1::bigint);
select pg_temp.expect('pendiri for L1 owner (5 members)', (select count(*) from user_badges where badge_code = 'pendiri' and user_id = '00000000-0000-0000-0000-000000000001'), 1::bigint);

-- ── bracket group_rank (Spec v1: 4 per slot, +8 perfect group) ──────────────
insert into public.teams (tricode, name, league, conference) values
  ('GA1','ga1','TRN','A'),('GA2','ga2','TRN','A'),('GA3','ga3','TRN','A'),
  ('GB1','gb1','TRN','B'),('GB2','gb2','TRN','B'),('GB3','gb3','TRN','B');
insert into public.pickem_rules (league) values ('TRN');
insert into public.fixtures (league, season, stage, matchday, home_team, away_team, kickoff_at, lock_at, status, home_score, away_score, outcome) values
  ('TRN','2026','group',1,'GA1','GA2', now(), now(), 'final', 2, 0, 'H'),
  ('TRN','2026','group',2,'GA1','GA3', now(), now(), 'final', 1, 0, 'H'),
  ('TRN','2026','group',3,'GA2','GA3', now(), now(), 'final', 1, 0, 'H'),   -- A: GA1 6, GA2 3, GA3 0
  ('TRN','2026','group',1,'GB1','GB2', now(), now(), 'final', 0, 0, 'D'),
  ('TRN','2026','group',2,'GB1','GB3', now(), now(), 'scheduled', null, null, null);  -- B unfinished → no points
insert into public.brackets (id, user_id, competition) values ('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','TRN');
insert into public.picks (bracket_id, series_id, slot_type, slot_index, picked_team_code) values
  ('b0000000-0000-0000-0000-000000000001', null, 'group_rank', 1, 'GA1'),
  ('b0000000-0000-0000-0000-000000000001', null, 'group_rank', 2, 'GA2'),
  ('b0000000-0000-0000-0000-000000000001', null, 'group_rank', 3, 'GA3'),
  ('b0000000-0000-0000-0000-000000000001', null, 'group_rank', 4, 'GB1');
select pickem_score_bracket('b0000000-0000-0000-0000-000000000001') \gset b_
select pg_temp.expect('bracket: 3 slots ×4 + perfect 8', (:'b_pickem_score_bracket'::jsonb->>'total_pts')::int, 20);

-- ── resolve_config precedence ───────────────────────────────────────────────
select pg_temp.expect('template sultan penalty', (pickem_resolve_config('TST', '{"template":"sultan"}')->>'jagoan_penalty')::numeric, 0.25::numeric);
select pg_temp.expect('override beats template', (pickem_resolve_config('TST', '{"template":"sultan","jagoan_penalty":0.5}')->>'jagoan_penalty')::numeric, 0.5::numeric);
select pg_temp.expect('rules row beats defaults', (pickem_resolve_config('WC2026')->>'score_exact')::int, 8);
select pg_temp.expect('unknown league → defaults', (pickem_resolve_config('NOPE')->>'score_exact')::int, 5);

select 'ALL 0021 SCENARIOS OK' as result;
rollback;
