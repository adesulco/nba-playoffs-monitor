-- ============================================================================
-- 0021 — Scoring Spec v1  (docs/pickem-flagship/17-PLATFORM-RESET-2026-10-01.md §1)
-- ============================================================================
-- Replaces every earlier scoring statement. One ladder, one jagoan rule, one
-- underdog rule, one config resolution order for every writer and reader:
--
--     leagues.scoring_config  ??  template (santai/standar/sultan)
--                             ??  pickem_rules row  ??  Spec v1 defaults
--
-- pickem_score_fixture() stays the ONLY writer of predictions.awarded_points
-- (competition config). Per-grup config is honoured where grup points live:
-- league_members.points_cache is recomputed per grup from the prediction's
-- TIER + flags under that grup's resolved config, so a Sultan grup can run
-- the jagoan penalty and streak bonus while Papan Nasional reads the plain
-- competition numbers from the same rows.
--
-- What changes (and why), in order:
--   1. pickem_rules → Spec v1 defaults (5/3/2/1, jagoan ×2 flat, penalty off,
--      underdog 30 % / ×1.5, stack cap 4×). The probability curve, the grup
--      bonus and enable_survivor are dropped: the curve never fired (p_* was
--      always NULL), the grup bonus double-counted on re-score and was never
--      shown, survivor is gated by leagues.enabled_modes.
--   2. predictions.tier replaces every `base_points = 8` hardcode; the row
--      keeps the audit columns; grup_bonus_points is dropped.
--   3. fixtures: `postponed` status; p_* dropped; lock_at follows kickoff on
--      reschedule; the two indexes the audit asked for.
--   4. streaks.kind — 'submission' (old semantics) and 'correct' (pays).
--   5. survivor_entries keyed by grup (league_id); draw = out, no pick = out,
--      life per grup, revived on a score correction.
--   6. league_members.base_points — late-join par, written at first pick.
--   7. Badges re-seeded to the doc 16 M8 set.
--   8. Functions: resolve_config, tier, points_for, member_points,
--      correct-streak recompute, award_badges, score_fixture, score_bracket
--      (Spec v1 points + group_rank implemented).
--   9. Views: tier-based exact/nyaris counts, shared ranks, nyaris tiebreak.
--
-- Transition (doc 17 §1 Transition + §4 decision 1): WC2026, AFF2026 and
-- NBA-Playoffs-2026 pickem_rules rows KEEP their stored 8/5/3 values — only
-- the column defaults change. EPL-2026-27 is re-pointed to Spec v1 here and
-- re-scored once via the admin `score` action after apply.
--
-- APPLY ORDER: after the v0.86.1 code push that stops selecting
-- predictions.grup_bonus_points and fixtures.p_* (predict.js, list-profile.js,
-- fixtures.js). Applying first breaks upsert-prediction and list-fixtures with
-- "column does not exist".
--
-- Idempotent where Postgres allows it (every add/drop guarded). Tested on a
-- local PG16 against migrations 0015–0020 with the scenario file
-- supabase/tests/0021_scoring_v1.test.sql. Apply via the SQL editor:
--   https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new
-- ============================================================================

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. pickem_rules → Spec v1
-- ───────────────────────────────────────────────────────────────────────────
alter table public.pickem_rules alter column pts_exact    set default 5;
alter table public.pickem_rules alter column pts_goaldiff set default 3;
alter table public.pickem_rules alter column pts_outcome  set default 2;
alter table public.pickem_rules add column if not exists pts_nyaris int not null default 1;

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='pickem_rules' and column_name='jagoan_mult_group') then
    alter table public.pickem_rules rename column jagoan_mult_group to jagoan_mult;
  end if;
end $$;
alter table public.pickem_rules add column if not exists jagoan_mult numeric(4,2) not null default 2.0;
alter table public.pickem_rules alter column jagoan_mult set default 2.0;
alter table public.pickem_rules drop column if exists jagoan_mult_ko;

alter table public.pickem_rules add column if not exists jagoan_penalty     numeric(4,2) not null default 0;     -- fraction of the stake, 0 = off
alter table public.pickem_rules add column if not exists underdog_threshold numeric(4,2) not null default 0.30;  -- strict <
alter table public.pickem_rules add column if not exists underdog_mult      numeric(4,2) not null default 1.5;
alter table public.pickem_rules add column if not exists stack_cap          numeric(4,2) not null default 4;     -- awarded ≤ stack_cap × base
alter table public.pickem_rules add column if not exists streak_len         int          not null default 3;
alter table public.pickem_rules add column if not exists streak_bonus       int          not null default 0;     -- 0 = off (Standar); Sultan sets 3
alter table public.pickem_rules add column if not exists scoring_template   text         not null default 'standar';
do $$ begin
  alter table public.pickem_rules add constraint pickem_rules_template_chk
    check (scoring_template in ('santai','standar','sultan'));
exception when duplicate_object then null; end $$;

alter table public.pickem_rules drop column if exists enable_upset_bonus;
alter table public.pickem_rules drop column if exists upset_floor;
alter table public.pickem_rules drop column if exists upset_cap;
alter table public.pickem_rules drop column if exists upset_curve;
alter table public.pickem_rules drop column if exists grup_bonus_points;
alter table public.pickem_rules drop column if exists enable_survivor;

-- Bracket points (doc 17 §1 Bracket): group 4 per correct slot, perfect
-- group +8; KO R32 10 / R16 12 / QF 15 / SF 20 / Final 30; the champion IS
-- the final winner, so the separate champion slot pays nothing extra.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='pickem_rules' and column_name='bracket_pts_group_rank1') then
    alter table public.pickem_rules rename column bracket_pts_group_rank1 to bracket_pts_group_slot;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='pickem_rules' and column_name='bracket_pts_finalist') then
    alter table public.pickem_rules rename column bracket_pts_finalist to bracket_pts_final;
  end if;
end $$;
alter table public.pickem_rules add column if not exists bracket_pts_group_slot    int default 4;
alter table public.pickem_rules add column if not exists bracket_pts_perfect_group int default 8;
alter table public.pickem_rules add column if not exists bracket_pts_final         int default 30;
alter table public.pickem_rules drop column if exists bracket_pts_group_rank2;
alter table public.pickem_rules drop column if exists bracket_pts_group_rank3;
alter table public.pickem_rules alter column bracket_pts_group_slot set default 4;
alter table public.pickem_rules alter column bracket_pts_r32      set default 10;
alter table public.pickem_rules alter column bracket_pts_r16      set default 12;
alter table public.pickem_rules alter column bracket_pts_qf       set default 15;
alter table public.pickem_rules alter column bracket_pts_sf       set default 20;
alter table public.pickem_rules alter column bracket_pts_final    set default 30;
alter table public.pickem_rules alter column bracket_pts_champion set default 0;

-- EPL-2026-27 goes straight onto Spec v1 (nothing scored was ever shown).
-- Competitions already scored under 8/5/3 keep their stored values.
update public.pickem_rules set
  pts_exact = 5, pts_goaldiff = 3, pts_outcome = 2, pts_nyaris = 1,
  jagoan_mult = 2.0, jagoan_penalty = 0, underdog_threshold = 0.30, underdog_mult = 1.5,
  stack_cap = 4, streak_len = 3, streak_bonus = 0, scoring_template = 'standar',
  bracket_pts_group_slot = 4, bracket_pts_perfect_group = 8,
  bracket_pts_r32 = 10, bracket_pts_r16 = 12, bracket_pts_qf = 15, bracket_pts_sf = 20,
  bracket_pts_final = 30, bracket_pts_champion = 0
where league = 'EPL-2026-27';

insert into public.pickem_rules (league) select 'EPL-2026-27'
where not exists (select 1 from public.pickem_rules where league = 'EPL-2026-27');

-- ───────────────────────────────────────────────────────────────────────────
-- 2. predictions — tier, penalty + streak audit columns; grup bonus dropped
-- ───────────────────────────────────────────────────────────────────────────
alter table public.predictions add column if not exists tier           text;
alter table public.predictions add column if not exists penalty_points int not null default 0;  -- jagoan miss penalty under COMPETITION config
alter table public.predictions add column if not exists streak_bonus   int not null default 0;  -- paid on the pick that completes a run (competition config)
do $$ begin
  alter table public.predictions add constraint predictions_tier_chk
    check (tier is null or tier in ('exact','margin','result','nyaris','miss','void'));
exception when duplicate_object then null; end $$;

-- Backfill tier for rows scored under 8/5/3 (history stays history).
update public.predictions set tier = case base_points
    when 8 then 'exact' when 5 then 'margin' when 3 then 'result' else 'miss' end
where scored_at is not null and tier is null;

alter table public.predictions drop column if exists grup_bonus_points;

create index if not exists predictions_league_matchday_idx on public.predictions (league, matchday);
create index if not exists predictions_fixture_outcome_idx on public.predictions (fixture_id, picked_outcome);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. fixtures — postponed, p_* dropped, lock follows kickoff, indexes
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare c record;
begin
  -- the p_* all-or-nothing CHECK and the status CHECK were created inline
  -- (auto-named); find them by definition rather than guessing the name.
  for c in
    select conname from pg_constraint
    where conrelid = 'public.fixtures'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) like '%p_home%' or pg_get_constraintdef(oid) like '%status%')
  loop
    execute format('alter table public.fixtures drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.fixtures drop column if exists p_home;
alter table public.fixtures drop column if exists p_draw;
alter table public.fixtures drop column if exists p_away;
alter table public.fixtures add constraint fixtures_status_check
  check (status in ('scheduled','live','final','postponed'));

create index if not exists fixtures_league_kickoff_idx on public.fixtures (league, kickoff_at);
create index if not exists fixtures_league_lock_idx    on public.fixtures (league, lock_at);

-- lock_at follows kickoff_at on reschedule (doc 17 §1 Lock) unless the
-- writer moved lock_at itself in the same statement. Keeps the 0015
-- outcome/finalized_at derivation.
create or replace function public.fixtures_set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.kickoff_at is distinct from old.kickoff_at and new.lock_at is not distinct from old.lock_at then
    new.lock_at := new.kickoff_at + (old.lock_at - old.kickoff_at);
  end if;
  if new.status = 'final' and new.home_score is not null and new.away_score is not null and new.outcome is null then
    new.outcome := case
      when new.home_score > new.away_score then 'H'
      when new.home_score < new.away_score then 'A'
      else 'D'
    end;
    if new.finalized_at is null then
      new.finalized_at := now();
    end if;
  end if;
  return new;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. streaks.kind
-- ───────────────────────────────────────────────────────────────────────────
alter table public.streaks add column if not exists kind text not null default 'submission';
do $$ begin
  alter table public.streaks add constraint streaks_kind_chk check (kind in ('submission','correct'));
exception when duplicate_object then null; end $$;
do $$
declare pk text;
begin
  select conname into pk from pg_constraint where conrelid = 'public.streaks'::regclass and contype = 'p';
  if pk is not null and not exists (
    select 1 from pg_constraint where conrelid = 'public.streaks'::regclass and contype = 'p'
      and pg_get_constraintdef(oid) like '%kind%'
  ) then
    execute format('alter table public.streaks drop constraint %I', pk);
    alter table public.streaks add constraint streaks_pkey primary key (user_id, competition, kind);
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. survivor_entries — per grup
-- ───────────────────────────────────────────────────────────────────────────
alter table public.survivor_entries add column if not exists league_id uuid references public.leagues(id) on delete cascade;
alter table public.survivor_entries add column if not exists eliminated_fixture_id uuid references public.fixtures(id) on delete set null;

-- Any pre-existing row (none in prod on 2026-10-01) is attached to the
-- user's first grup for that competition; rows that cannot be attached are
-- removed — a survivor life without a grup has no board to live on.
update public.survivor_entries se set league_id = sub.league_id
from (
  select distinct on (lm.user_id, l.competition) lm.user_id, l.competition, l.id as league_id
  from public.league_members lm join public.leagues l on l.id = lm.league_id
  order by lm.user_id, l.competition, lm.joined_at
) sub
where se.league_id is null and se.user_id = sub.user_id and se.competition = sub.competition;
delete from public.survivor_entries where league_id is null;
alter table public.survivor_entries alter column league_id set not null;

do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.survivor_entries'::regclass and contype = 'u'
             and pg_get_constraintdef(oid) like '%(user_id, competition)%'
  loop execute format('alter table public.survivor_entries drop constraint %I', c.conname); end loop;
end $$;
do $$ begin
  alter table public.survivor_entries add constraint survivor_entries_user_league_key unique (user_id, league_id);
exception when duplicate_object or duplicate_table then null; end $$;
create index if not exists survivor_league_status_idx on public.survivor_entries (league_id, status);

-- Grup-mates can read each other's survivor state (the board); owner keeps
-- the insert path (the API uses the service role anyway).
drop policy if exists survivor_owner_select on public.survivor_entries;
create policy survivor_owner_select on public.survivor_entries
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_league_member(league_id, (select auth.uid())));

-- ───────────────────────────────────────────────────────────────────────────
-- 6. league_members.base_points — late-join par
-- ───────────────────────────────────────────────────────────────────────────
alter table public.league_members add column if not exists base_points int not null default 0;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Badges → doc 16 M8 set
-- ───────────────────────────────────────────────────────────────────────────
delete from public.user_badges where badge_code in ('nostradamus','berani','konsisten','raja_grup','survivor_top');
delete from public.badges      where code       in ('nostradamus','berani','konsisten','raja_grup','survivor_top');
insert into public.badges (code, name_id, name_en, description, criteria, rarity) values
  ('juara_grup',  'Juara Grup',       'Grup Champion',    'Peringkat 1 di grup saat kompetisi selesai.',                '{"type":"grup_champion"}'::jsonb,               'legendary'),
  ('streak_5',    'Streak 5+',        'Streak 5+',        'Lima pick tepat beruntun.',                                   '{"type":"correct_streak","n":5}'::jsonb,        'rare'),
  ('perfect_md',  'Matchday Sempurna','Perfect Matchday', 'Semua pick di satu matchday tepat (minimal 3 pick).',         '{"type":"perfect_matchday","min_picks":3}'::jsonb,'rare'),
  ('pendiri',     'Pendiri Grup',     'Grup Founder',     'Bikin grup dan ngajak minimal 2 teman.',                      '{"type":"founder","min_members":3}'::jsonb,     'common'),
  ('hadir_semua', 'Hadir Semua',      'Never Missed',     'Pick di setiap matchday sepanjang kompetisi.',                '{"type":"all_matchdays"}'::jsonb,               'rare')
on conflict (code) do update set
  name_id = excluded.name_id, name_en = excluded.name_en, description = excluded.description,
  criteria = excluded.criteria, rarity = excluded.rarity;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. Functions
-- ───────────────────────────────────────────────────────────────────────────
drop function if exists public.pickem_upset_mult(numeric, jsonb, numeric, numeric);

-- 8a. Templates (doc 17 §1 Templates). Keys are the leagues.scoring_config
--     shape from 0019 so a commissioner override and a template merge cleanly.
create or replace function public.pickem_template_config(p_template text)
returns jsonb
language sql immutable as $$
  select case lower(coalesce(p_template, 'standar'))
    when 'santai' then '{"jagoan_multiplier":1,"jagoan_penalty":0,"underdog_multiplier":1,"streak_bonus":0}'::jsonb
    when 'sultan' then '{"jagoan_multiplier":2,"jagoan_penalty":0.25,"underdog_threshold":0.30,"underdog_multiplier":1.5,"stack_cap":4,"streak_len":3,"streak_bonus":3}'::jsonb
    else               '{"jagoan_multiplier":2,"jagoan_penalty":0,"underdog_threshold":0.30,"underdog_multiplier":1.5,"stack_cap":4,"streak_len":3,"streak_bonus":0}'::jsonb
  end
$$;

-- 8b. Config resolution — the one order every writer and reader uses.
--     Spec v1 defaults ← pickem_rules(league) ← scoring_config.template
--     ← scoring_config overrides. Output keys: score_exact,
--     score_result_margin, score_result, score_nyaris, jagoan_multiplier,
--     jagoan_penalty, underdog_threshold, underdog_multiplier, stack_cap,
--     streak_len, streak_bonus, group_position_pts, perfect_group_bonus,
--     knockout_pts{r32,r16,qf,sf,final}, ko_stages.
create or replace function public.pickem_resolve_config(p_league text, p_scoring_config jsonb default null)
returns jsonb
language plpgsql stable
set search_path = public as $$
declare
  r   public.pickem_rules%rowtype;
  cfg jsonb := '{
    "score_exact":5,"score_result_margin":3,"score_result":2,"score_nyaris":1,
    "jagoan_multiplier":2,"jagoan_penalty":0,"underdog_threshold":0.30,"underdog_multiplier":1.5,
    "stack_cap":4,"streak_len":3,"streak_bonus":0,
    "group_position_pts":4,"perfect_group_bonus":8,
    "knockout_pts":{"r32":10,"r16":12,"qf":15,"sf":20,"final":30},
    "ko_stages":["R32","R16","QF","SF","final"]
  }'::jsonb;
begin
  select * into r from public.pickem_rules where league = p_league;
  if found then
    cfg := cfg || jsonb_strip_nulls(jsonb_build_object(
      'score_exact',         r.pts_exact,
      'score_result_margin', r.pts_goaldiff,
      'score_result',        r.pts_outcome,
      'score_nyaris',        r.pts_nyaris,
      'jagoan_multiplier',   r.jagoan_mult,
      'jagoan_penalty',      r.jagoan_penalty,
      'underdog_threshold',  r.underdog_threshold,
      'underdog_multiplier', r.underdog_mult,
      'stack_cap',           r.stack_cap,
      'streak_len',          r.streak_len,
      'streak_bonus',        r.streak_bonus,
      'group_position_pts',  r.bracket_pts_group_slot,
      'perfect_group_bonus', r.bracket_pts_perfect_group,
      'knockout_pts', jsonb_build_object(
        'r32', r.bracket_pts_r32, 'r16', r.bracket_pts_r16, 'qf', r.bracket_pts_qf,
        'sf', r.bracket_pts_sf, 'final', r.bracket_pts_final),
      'ko_stages', to_jsonb(r.ko_stages)
    ));
  end if;
  if p_scoring_config is not null and jsonb_typeof(p_scoring_config) = 'object' then
    if p_scoring_config ? 'template' then
      cfg := cfg || public.pickem_template_config(p_scoring_config->>'template');
    end if;
    cfg := cfg || (p_scoring_config - 'template');
  end if;
  return cfg;
end;
$$;

-- 8c. Tier of one prediction against a result (doc 17 §1 ladder).
--     Judged on the SCORE at end of play, never on fixtures.outcome: a KO
--     tie stores the shootout advancer as outcome, but a 1–1 pick on a 1–1
--     game is exact (pens never enter the score). Draw is a result.
--     Nyaris = wrong result but total goals within 1. void = no score.
create or replace function public.pickem_tier(
  p_picked_outcome text, p_picked_home int, p_picked_away int,
  p_home_score int, p_away_score int
) returns text
language sql immutable as $$
  select case
    when p_home_score is null or p_away_score is null then 'void'
    when p_picked_outcome = (case when p_home_score > p_away_score then 'H' when p_home_score < p_away_score then 'A' else 'D' end) then
      case
        when p_picked_home is not null and p_picked_away is not null
         and p_picked_home = p_home_score and p_picked_away = p_away_score then 'exact'
        when p_picked_home is not null and p_picked_away is not null
         and (p_picked_home - p_picked_away) = (p_home_score - p_away_score) then 'margin'
        else 'result'
      end
    when p_picked_home is not null and p_picked_away is not null
     and abs((p_picked_home + p_picked_away) - (p_home_score + p_away_score)) <= 1 then 'nyaris'
    else 'miss'
  end
$$;

-- 8d. Points for one pick under a resolved config. Order: base × underdog ×
--     jagoan, floor(), then cap at stack_cap × base (06 §3.1). Nyaris pays
--     the ladder value but takes no multipliers (it is not a correct pick).
create or replace function public.pickem_points_for(
  p_tier text, p_is_jagoan boolean, p_consensus numeric, p_cfg jsonb
) returns int
language plpgsql immutable as $$
declare
  base    int;
  pts     numeric;
  cap     numeric;
  correct boolean := p_tier in ('exact','margin','result');
begin
  base := case p_tier
    when 'exact'  then (p_cfg->>'score_exact')::int
    when 'margin' then (p_cfg->>'score_result_margin')::int
    when 'result' then (p_cfg->>'score_result')::int
    when 'nyaris' then (p_cfg->>'score_nyaris')::int
    else 0 end;
  if base <= 0 then return 0; end if;
  if not correct then return base; end if;
  pts := base;
  if p_consensus is not null and p_consensus < (p_cfg->>'underdog_threshold')::numeric then
    pts := pts * (p_cfg->>'underdog_multiplier')::numeric;
  end if;
  if p_is_jagoan then
    pts := pts * (p_cfg->>'jagoan_multiplier')::numeric;
  end if;
  pts := floor(pts);
  cap := floor(base * coalesce((p_cfg->>'stack_cap')::numeric, 4));
  if pts > cap then pts := cap; end if;
  return pts::int;
end;
$$;

-- 8e. One member's points inside one grup, under that grup's config.
--     Per matchday: Σ pick points − jagoan miss penalties, floored at 0.
--     Plus streak bonus on completed runs of `streak_len` CORRECT picks
--     (ordered by kickoff), plus the late-join par (base_points).
--     Returns (points, exact_count, nyaris_count). Pure read; deterministic.
create or replace function public.pickem_member_points(p_user_id uuid, p_league_id uuid)
returns table (points int, exact_count int, nyaris_count int)
language plpgsql stable
set search_path = public as $$
declare
  l       public.leagues%rowtype;
  cfg     jsonb;
  rec     record;
  cur_md  int := null;
  md_sum  int := 0;
  total   int := 0;
  run     int := 0;
  s_len   int;
  s_bonus int;
  pen     numeric;
  stake   int;
  n_exact  int := 0;
  n_nyaris int := 0;
begin
  select * into l from public.leagues where id = p_league_id;
  if not found then return; end if;
  cfg     := public.pickem_resolve_config(l.competition, l.scoring_config);
  s_len   := coalesce((cfg->>'streak_len')::int, 0);
  s_bonus := coalesce((cfg->>'streak_bonus')::int, 0);
  pen     := coalesce((cfg->>'jagoan_penalty')::numeric, 0);
  stake   := coalesce((cfg->>'score_result')::int, 0);

  for rec in
    select p.tier, p.is_jagoan, p.consensus_at_lock, f.matchday
    from public.predictions p
    join public.fixtures f on f.id = p.fixture_id
    where p.user_id = p_user_id and p.league = l.competition and p.scored_at is not null
      and p.tier is not null and p.tier <> 'void'
    order by f.matchday, f.kickoff_at, f.id
  loop
    if cur_md is distinct from rec.matchday then
      total  := total + greatest(md_sum, 0);
      md_sum := 0;
      cur_md := rec.matchday;
    end if;
    md_sum := md_sum + public.pickem_points_for(rec.tier, rec.is_jagoan, rec.consensus_at_lock, cfg);
    if rec.is_jagoan and rec.tier not in ('exact','margin','result') and pen > 0 then
      md_sum := md_sum - round(pen * stake)::int;
    end if;
    if rec.tier = 'exact'  then n_exact  := n_exact  + 1; end if;
    if rec.tier = 'nyaris' then n_nyaris := n_nyaris + 1; end if;
    if rec.tier in ('exact','margin','result') then
      run := run + 1;
      if s_len > 0 and s_bonus > 0 and run = s_len then
        md_sum := md_sum + s_bonus;
        run := 0;
      end if;
    else
      run := 0;
    end if;
  end loop;
  total := total + greatest(md_sum, 0);

  select coalesce(lm.base_points, 0) + total into total
  from public.league_members lm where lm.league_id = p_league_id and lm.user_id = p_user_id;

  points := coalesce(total, 0); exact_count := n_exact; nyaris_count := n_nyaris;
  return next;
end;
$$;

-- 8f. Submission streak (0017 semantics, now kind = 'submission').
create or replace function public.pickem_update_streak(
  p_user_id uuid, p_competition text, p_matchday int
) returns void
language plpgsql security definer
set search_path = public as $$
declare
  existing public.streaks%rowtype;
  next_current int;
begin
  select * into existing from public.streaks
  where user_id = p_user_id and competition = p_competition and kind = 'submission';
  if not found then
    insert into public.streaks (user_id, competition, kind, current_streak, longest_streak, last_matchday)
      values (p_user_id, p_competition, 'submission', 1, 1, p_matchday);
    return;
  end if;
  if existing.last_matchday = p_matchday then return; end if;
  next_current := case
    when existing.last_matchday is null then 1
    when p_matchday = existing.last_matchday + 1 then existing.current_streak + 1
    else 1 end;
  update public.streaks set
    current_streak = next_current,
    longest_streak = greatest(coalesce(longest_streak, 0), next_current),
    last_matchday  = p_matchday,
    updated_at     = now()
  where user_id = p_user_id and competition = p_competition and kind = 'submission';
end;
$$;

-- 8g. Correct-pick streak under the COMPETITION config. Walks the user's
--     scored picks in kickoff order, writes predictions.streak_bonus on the
--     pick that completes each run (0 elsewhere) and upserts
--     streaks(kind='correct'). Recomputed from scratch each call, so a
--     re-score or a correction never double-pays.
create or replace function public.pickem_recompute_correct_streak(p_user_id uuid, p_competition text)
returns int
language plpgsql security definer
set search_path = public as $$
declare
  cfg     jsonb := public.pickem_resolve_config(p_competition, null);
  s_len   int   := coalesce((cfg->>'streak_len')::int, 0);
  s_bonus int   := coalesce((cfg->>'streak_bonus')::int, 0);
  rec     record;
  run     int := 0;
  longest int := 0;
  last_md int := null;
  bonus   int;
  paid    int := 0;
begin
  for rec in
    select p.id, p.tier, p.streak_bonus, f.matchday
    from public.predictions p join public.fixtures f on f.id = p.fixture_id
    where p.user_id = p_user_id and p.league = p_competition and p.scored_at is not null
      and p.tier is not null and p.tier <> 'void'
    order by f.matchday, f.kickoff_at, f.id
  loop
    bonus := 0;
    if rec.tier in ('exact','margin','result') then
      run := run + 1;
      longest := greatest(longest, run);
      if s_len > 0 and s_bonus > 0 and run = s_len then
        bonus := s_bonus;
        run := 0;
      end if;
    else
      run := 0;
    end if;
    if rec.streak_bonus is distinct from bonus then
      update public.predictions set streak_bonus = bonus where id = rec.id;
    end if;
    paid := paid + bonus;
    last_md := rec.matchday;
  end loop;

  insert into public.streaks (user_id, competition, kind, current_streak, longest_streak, last_matchday, updated_at)
    values (p_user_id, p_competition, 'correct', run, longest, last_md, now())
  on conflict (user_id, competition, kind) do update set
    current_streak = excluded.current_streak,
    longest_streak = greatest(public.streaks.longest_streak, excluded.longest_streak),
    last_matchday  = excluded.last_matchday,
    updated_at     = now();
  return paid;
end;
$$;

-- 8h. Badges — doc 16 M8 set. Idempotent (unique index + on conflict).
--     juara_grup / hadir_semua are evaluated only once every fixture of the
--     competition is final; perfect_md once a matchday is complete.
create or replace function public.pickem_award_badges(
  p_user_id uuid, p_competition text, p_matchday int default null
) returns int
language plpgsql security definer
set search_path = public as $$
declare
  awarded int := 0;
  md_total int; md_picked int; md_correct int;
  comp_done boolean;
  md_done boolean;
  n_md int; n_md_picked int;
  lg record;
begin
  -- streak_5: five correct picks in a row (longest correct streak ≥ 5).
  if exists (select 1 from public.streaks
             where user_id = p_user_id and competition = p_competition and kind = 'correct' and longest_streak >= 5) then
    insert into public.user_badges (user_id, badge_code, competition) values (p_user_id, 'streak_5', p_competition)
      on conflict do nothing;
    if found then awarded := awarded + 1; end if;
  end if;

  -- perfect_md: matchday complete, user picked every fixture, every pick correct, ≥ 3 picks.
  if p_matchday is not null then
    select count(*) filter (where status in ('scheduled','live')) = 0, count(*)
      into md_done, md_total
      from public.fixtures where league = p_competition and matchday = p_matchday;
    if md_done and md_total >= 3 then
      select count(*), count(*) filter (where p.tier in ('exact','margin','result'))
        into md_picked, md_correct
        from public.predictions p join public.fixtures f on f.id = p.fixture_id
        where p.user_id = p_user_id and p.league = p_competition and f.matchday = p_matchday
          and p.scored_at is not null and p.tier <> 'void';
      if md_picked = md_total and md_correct = md_total then
        insert into public.user_badges (user_id, badge_code, competition, matchday)
          values (p_user_id, 'perfect_md', p_competition, p_matchday) on conflict do nothing;
        if found then awarded := awarded + 1; end if;
      end if;
    end if;
  end if;

  -- pendiri: owns a grup on this competition with ≥ 3 active members.
  for lg in
    select l.id from public.leagues l
    where l.owner_id = p_user_id and l.competition = p_competition
      and (select count(*) from public.league_members lm where lm.league_id = l.id and coalesce(lm.status,'active') = 'active') >= 3
  loop
    insert into public.user_badges (user_id, badge_code, competition) values (p_user_id, 'pendiri', p_competition)
      on conflict do nothing;
    if found then awarded := awarded + 1; end if;
    exit;
  end loop;

  -- Competition-end badges.
  select count(*) filter (where status in ('scheduled','live')) = 0 into comp_done
    from public.fixtures where league = p_competition;
  if comp_done then
    -- hadir_semua: a pick on every matchday of the competition.
    select count(distinct matchday) into n_md from public.fixtures where league = p_competition and status = 'final';
    select count(distinct f.matchday) into n_md_picked
      from public.predictions p join public.fixtures f on f.id = p.fixture_id
      where p.user_id = p_user_id and p.league = p_competition;
    if n_md > 0 and n_md_picked = n_md then
      insert into public.user_badges (user_id, badge_code, competition) values (p_user_id, 'hadir_semua', p_competition)
        on conflict do nothing;
      if found then awarded := awarded + 1; end if;
    end if;
    -- juara_grup: rank 1 (shared ranks count) in any grup on this competition.
    if exists (
      select 1 from public.leaderboard_league v
      where v.user_id = p_user_id and v.competition = p_competition and v.rank = 1
    ) then
      insert into public.user_badges (user_id, badge_code, competition) values (p_user_id, 'juara_grup', p_competition)
        on conflict do nothing;
      if found then awarded := awarded + 1; end if;
    end if;
  end if;
  return awarded;
end;
$$;

-- 8i. Grup cache refresh for every grup on a competition (or one grup).
create or replace function public.pickem_refresh_league_caches(p_competition text, p_league_id uuid default null)
returns int
language plpgsql security definer
set search_path = public as $$
declare
  m record; n int := 0;
begin
  for m in
    select lm.league_id, lm.user_id
    from public.league_members lm join public.leagues l on l.id = lm.league_id
    where l.competition = p_competition and (p_league_id is null or l.id = p_league_id)
  loop
    update public.league_members lm set
      points_cache      = mp.points,
      exact_count_cache = mp.exact_count
    from public.pickem_member_points(m.user_id, m.league_id) mp
    where lm.league_id = m.league_id and lm.user_id = m.user_id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- 8j. THE scoring engine.
create or replace function public.pickem_score_fixture(p_fixture_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public as $$
declare
  fx             public.fixtures%rowtype;
  cfg            jsonb;
  p              public.predictions%rowtype;
  t              text;
  base           int;
  pts            int;
  pen            int;
  jmult          numeric;
  umult          numeric;
  n_total        int;
  scored_count   int := 0;
  total_awarded  int := 0;
  affected       uuid[] := '{}';
  uid            uuid;
  md_complete    boolean;
  md_first_kick  timestamptz;
  surv_out       int := 0;
  surv_revived   int := 0;
begin
  select * into fx from public.fixtures where id = p_fixture_id;
  if not found then raise exception 'fixture % not found', p_fixture_id; end if;
  if fx.status <> 'final' then
    return jsonb_build_object('ok', false, 'reason', 'not_final', 'fixture_id', p_fixture_id, 'status', fx.status);
  end if;
  -- A final fixture with no score is void (walkover / abandoned): every
  -- pick is tier 'void', nothing scores, nothing is penalised.
  if fx.outcome is null and (fx.home_score is null or fx.away_score is null) then
    null;
  elsif fx.outcome is null then
    return jsonb_build_object('ok', false, 'reason', 'no_outcome', 'fixture_id', p_fixture_id);
  end if;

  cfg := public.pickem_resolve_config(fx.league, null);

  -- Consensus snapshot (doc 17 §1 Underdog): global per fixture, share of
  -- pickers on each side, filled only where null. Edits are blocked after
  -- lock, so the rows present at scoring time ARE the pre-lock rows.
  select count(*) into n_total from public.predictions where fixture_id = p_fixture_id;
  if n_total > 0 then
    update public.predictions pr set consensus_at_lock = s.share
    from (
      select picked_outcome, round(count(*)::numeric / n_total, 4) as share
      from public.predictions where fixture_id = p_fixture_id group by picked_outcome
    ) s
    where pr.fixture_id = p_fixture_id and pr.picked_outcome = s.picked_outcome and pr.consensus_at_lock is null;
  end if;

  for p in select * from public.predictions where fixture_id = p_fixture_id loop
    t := public.pickem_tier(p.picked_outcome, p.picked_home, p.picked_away, fx.home_score, fx.away_score);
    base := case t
      when 'exact'  then (cfg->>'score_exact')::int
      when 'margin' then (cfg->>'score_result_margin')::int
      when 'result' then (cfg->>'score_result')::int
      when 'nyaris' then (cfg->>'score_nyaris')::int
      else 0 end;
    pts := public.pickem_points_for(t, p.is_jagoan, p.consensus_at_lock, cfg);
    jmult := case when p.is_jagoan and t in ('exact','margin','result') then (cfg->>'jagoan_multiplier')::numeric else 1.0 end;
    umult := case when t in ('exact','margin','result') and p.consensus_at_lock is not null
                   and p.consensus_at_lock < (cfg->>'underdog_threshold')::numeric
                  then (cfg->>'underdog_multiplier')::numeric else 1.0 end;
    pen := case when p.is_jagoan and t in ('nyaris','miss')
                then round(coalesce((cfg->>'jagoan_penalty')::numeric, 0) * (cfg->>'score_result')::int)::int
                else 0 end;

    update public.predictions set
      tier                = t,
      base_points         = base,
      jagoan_mult_applied = jmult,
      upset_mult_applied  = umult,
      awarded_points      = pts,
      penalty_points      = pen,
      scored_at           = now()
    where id = p.id;

    if not (p.user_id = any (affected)) then affected := array_append(affected, p.user_id); end if;
    scored_count  := scored_count + 1;
    total_awarded := total_awarded + pts;
  end loop;

  -- Survivor (doc 17 §1 Gugur): per grup with the mode on; draw = out;
  -- a correction that flips the result revives who it eliminated here.
  update public.survivor_entries se set
    status = 'alive', eliminated_matchday = null, eliminated_fixture_id = null, updated_at = now()
  where se.eliminated_fixture_id = p_fixture_id
    and exists (select 1 from public.predictions pr
                where pr.user_id = se.user_id and pr.fixture_id = p_fixture_id
                  and pr.survivor_pick and pr.picked_outcome = fx.outcome);
  get diagnostics surv_revived = row_count;

  update public.survivor_entries se set
    status = 'out', eliminated_matchday = fx.matchday, eliminated_fixture_id = p_fixture_id, updated_at = now()
  from public.leagues l
  where l.id = se.league_id and l.competition = fx.league
    and coalesce(l.enabled_modes->>'survivor', 'false') = 'true'
    and se.status = 'alive'
    and fx.outcome is not null
    and exists (select 1 from public.predictions pr
                where pr.user_id = se.user_id and pr.fixture_id = p_fixture_id
                  and pr.survivor_pick and pr.picked_outcome <> fx.outcome);
  get diagnostics surv_out = row_count;

  -- No pick = out, once the matchday is complete (postponed games don't hold
  -- it open). Only entries that existed before the matchday kicked off.
  select count(*) filter (where status in ('scheduled','live')) = 0, min(kickoff_at)
    into md_complete, md_first_kick
    from public.fixtures where league = fx.league and matchday = fx.matchday;
  if md_complete then
    update public.survivor_entries se set
      status = 'out', eliminated_matchday = fx.matchday, eliminated_fixture_id = null, updated_at = now()
    from public.leagues l
    where l.id = se.league_id and l.competition = fx.league
      and coalesce(l.enabled_modes->>'survivor', 'false') = 'true'
      and se.status = 'alive'
      and se.created_at < md_first_kick
      and not exists (select 1 from public.predictions pr join public.fixtures f2 on f2.id = pr.fixture_id
                      where pr.user_id = se.user_id and pr.survivor_pick
                        and f2.league = fx.league and f2.matchday = fx.matchday);
  end if;

  -- Streaks, grup caches, badges.
  foreach uid in array affected loop
    perform public.pickem_update_streak(uid, fx.league, fx.matchday);
    perform public.pickem_recompute_correct_streak(uid, fx.league);
  end loop;
  perform public.pickem_refresh_league_caches(fx.league);
  foreach uid in array affected loop
    perform public.pickem_award_badges(uid, fx.league, fx.matchday);
  end loop;

  return jsonb_build_object(
    'ok', true, 'fixture_id', p_fixture_id, 'league', fx.league, 'matchday', fx.matchday,
    'void', fx.outcome is null,
    'scored_count', scored_count, 'total_awarded', total_awarded,
    'users_affected', cardinality(affected),
    'survivor_out', surv_out, 'survivor_revived', surv_revived
  );
end;
$$;

comment on function public.pickem_score_fixture(uuid) is
  'Scoring Spec v1 engine (doc 17 §1). Idempotent; the only writer of predictions.awarded_points.';

-- 8k. Bracket scoring — Spec v1 points, group_rank implemented.
--     Group standings from final group-stage fixtures; the group letter is
--     teams.conference (seed-wc2026-groups.mjs); groups are indexed A=0…
--     in letter order; slot_index = group_idx*3 + rank (upsert-bracket.js).
create or replace function public.pickem_score_bracket(p_bracket_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public as $$
declare
  br        public.brackets%rowtype;
  comp      text;
  cfg       jsonb;
  pick_row  public.picks%rowtype;
  pts       int;
  scored    int := 0;
  total_pts int := 0;
  stage_key text;
  g_idx     int;
  g_rank    int;
  g_letter  text;
  g_team    text;
  grp       record;
  all_exact boolean;
begin
  select * into br from public.brackets where id = p_bracket_id;
  if not found then raise exception 'bracket % not found', p_bracket_id; end if;
  comp := coalesce(br.competition, 'WC2026');
  cfg  := public.pickem_resolve_config(comp, null);

  -- Group standings for every group that has finished (all its group
  -- fixtures final): pts 3/1/0, then GD, then GF, then tricode.
  create temp table if not exists _grp_standings (
    letter text, pos int, tricode text
  ) on commit drop;
  truncate _grp_standings;
  insert into _grp_standings
  select letter, row_number() over (partition by letter order by g_pts desc, g_gd desc, g_gf desc, tricode) as pos, tricode
  from (
    select t.conference as letter, t.tricode,
      sum(case when (f.home_team = t.tricode and f.outcome = 'H') or (f.away_team = t.tricode and f.outcome = 'A') then 3
               when f.outcome = 'D' then 1 else 0 end) as g_pts,
      sum(case when f.home_team = t.tricode then f.home_score - f.away_score else f.away_score - f.home_score end) as g_gd,
      sum(case when f.home_team = t.tricode then f.home_score else f.away_score end) as g_gf
    from public.teams t
    join public.fixtures f on f.league = comp and f.stage = 'group' and f.status = 'final'
                          and (f.home_team = t.tricode or f.away_team = t.tricode)
    where t.league = comp and t.conference is not null
    group by t.conference, t.tricode
  ) s
  where not exists (select 1 from public.fixtures f3 join public.teams t3 on t3.tricode in (f3.home_team, f3.away_team)
                    where f3.league = comp and f3.stage = 'group' and f3.status <> 'final' and t3.conference = s.letter);

  for pick_row in select * from public.picks where bracket_id = p_bracket_id and series_id is null loop
    pts := 0;
    if pick_row.slot_type = 'group_rank' then
      g_idx  := (pick_row.slot_index - 1) / 3;
      g_rank := ((pick_row.slot_index - 1) % 3) + 1;
      select letter into g_letter from (select distinct letter from _grp_standings order by letter) x offset g_idx limit 1;
      if g_letter is not null and exists (
        select 1 from _grp_standings gs where gs.letter = g_letter and gs.pos = g_rank
          and upper(gs.tricode) = upper(pick_row.picked_team_code)) then
        pts := (cfg->>'group_position_pts')::int;
      end if;
    elsif pick_row.slot_type in ('r32_winner','r16_winner','qf_winner','sf_winner','final_winner') then
      stage_key := case pick_row.slot_type
        when 'r32_winner' then 'R32' when 'r16_winner' then 'R16' when 'qf_winner' then 'QF'
        when 'sf_winner' then 'SF' else 'final' end;
      if exists (
        select 1 from public.fixtures f
        where f.league = comp and f.stage = stage_key and f.status = 'final'
          and upper(case f.outcome when 'H' then f.home_team when 'A' then f.away_team end) = upper(pick_row.picked_team_code)
      ) then
        pts := coalesce((cfg->'knockout_pts'->>lower(replace(stage_key, 'final', 'final')))::int, 0);
      end if;
    elsif pick_row.slot_type = 'champion' then
      if exists (
        select 1 from public.fixtures f
        where f.league = comp and f.stage = 'final' and f.status = 'final'
          and upper(case f.outcome when 'H' then f.home_team when 'A' then f.away_team end) = upper(pick_row.picked_team_code)
      ) then
        pts := coalesce((select bracket_pts_champion from public.pickem_rules where league = comp), 0);
      end if;
    end if;
    update public.picks set awarded_points = pts, scored_at = now() where id = pick_row.id;
    scored := scored + 1;
    total_pts := total_pts + pts;
  end loop;

  -- Perfect group bonus: every group_rank slot of a finished group correct.
  for grp in select distinct letter from _grp_standings order by letter loop
    g_idx := (select count(*) from (select distinct letter from _grp_standings) x where x.letter < grp.letter);
    select bool_and(coalesce(pk.awarded_points, 0) > 0) and count(*) = 3 into all_exact
      from public.picks pk
      where pk.bracket_id = p_bracket_id and pk.slot_type = 'group_rank'
        and (pk.slot_index - 1) / 3 = g_idx;
    if coalesce(all_exact, false) then
      total_pts := total_pts + (cfg->>'perfect_group_bonus')::int;
    end if;
  end loop;

  update public.brackets set points_cache = total_pts where id = p_bracket_id;
  return jsonb_build_object('ok', true, 'bracket_id', p_bracket_id, 'scored', scored, 'total_pts', total_pts);
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. Views — tier-based, shared ranks, nyaris tiebreak
-- ───────────────────────────────────────────────────────────────────────────
drop view if exists public.leaderboard_competition cascade;
drop view if exists public.leaderboard_league cascade;
drop view if exists public.leaderboard_matchday cascade;

-- Competition-wide (Papan Nasional): competition config; the per-matchday
-- penalty floor only matters when jagoan_penalty > 0 at competition level
-- (it is 0 by default), so a plain sum is exact for Spec v1 defaults.
create view public.leaderboard_competition as
select
  p.league as competition, p.user_id, prof.nickname as username, prof.avatar_url,
  coalesce(sum(p.awarded_points + p.streak_bonus - p.penalty_points), 0) as points,
  count(*) filter (where p.tier = 'exact')  as exact_count,
  count(*) filter (where p.tier = 'nyaris') as nyaris_count,
  max(p.created_at) as last_pick_at,
  rank() over (partition by p.league order by
    coalesce(sum(p.awarded_points + p.streak_bonus - p.penalty_points), 0) desc,
    count(*) filter (where p.tier = 'exact') desc,
    count(*) filter (where p.tier = 'nyaris') desc,
    max(p.created_at) asc) as rank
from public.predictions p
left join public.profiles prof on prof.id = p.user_id
where p.scored_at is not null
group by p.league, p.user_id, prof.nickname, prof.avatar_url;

create view public.leaderboard_league as
select
  l.id as league_id, l.name as league_name, l.competition, lm.user_id,
  prof.nickname as username, prof.avatar_url,
  lm.points_cache as points, lm.exact_count_cache as exact_count,
  coalesce((select count(*) from public.predictions p where p.user_id = lm.user_id and p.league = l.competition and p.tier = 'nyaris'), 0) as nyaris_count,
  lm.matchday_rank, lm.previous_rank, lm.status,
  rank() over (partition by l.id order by
    lm.points_cache desc, lm.exact_count_cache desc,
    (select count(*) from public.predictions p where p.user_id = lm.user_id and p.league = l.competition and p.tier = 'nyaris') desc,
    lm.last_predicted_at asc nulls last) as rank
from public.leagues l
join public.league_members lm on lm.league_id = l.id and coalesce(lm.status, 'active') = 'active'
left join public.profiles prof on prof.id = lm.user_id;

create view public.leaderboard_matchday as
select
  p.league as competition, f.matchday, p.user_id, prof.nickname as username, prof.avatar_url,
  coalesce(sum(p.awarded_points + p.streak_bonus - p.penalty_points), 0) as points,
  count(*) filter (where p.tier = 'exact')  as exact_count,
  count(*) filter (where p.tier = 'nyaris') as nyaris_count,
  max(p.created_at) as last_pick_at,
  rank() over (partition by p.league, f.matchday order by
    coalesce(sum(p.awarded_points + p.streak_bonus - p.penalty_points), 0) desc,
    count(*) filter (where p.tier = 'exact') desc,
    count(*) filter (where p.tier = 'nyaris') desc,
    max(p.created_at) asc) as rank
from public.predictions p
join public.fixtures f on f.id = p.fixture_id
left join public.profiles prof on prof.id = p.user_id
where p.scored_at is not null
group by p.league, f.matchday, p.user_id, prof.nickname, prof.avatar_url;

grant select on public.leaderboard_competition, public.leaderboard_league, public.leaderboard_matchday to anon, authenticated;

commit;

-- ============================================================================
-- VERIFICATION (run after apply; every row should say t)
-- ============================================================================
-- select 'rules.pts_nyaris'      as item, count(*) = 1 as ok from information_schema.columns where table_name='pickem_rules' and column_name='pts_nyaris'
-- union all select 'rules.jagoan_mult_ko gone', count(*) = 0 from information_schema.columns where table_name='pickem_rules' and column_name='jagoan_mult_ko'
-- union all select 'EPL on Spec v1', pts_exact = 5 and pts_goaldiff = 3 and pts_outcome = 2 from pickem_rules where league = 'EPL-2026-27'
-- union all select 'predictions.tier', count(*) = 1 from information_schema.columns where table_name='predictions' and column_name='tier'
-- union all select 'grup_bonus gone', count(*) = 0 from information_schema.columns where table_name='predictions' and column_name='grup_bonus_points'
-- union all select 'fixtures.p_home gone', count(*) = 0 from information_schema.columns where table_name='fixtures' and column_name='p_home'
-- union all select 'postponed allowed', pg_get_constraintdef(oid) like '%postponed%' from pg_constraint where conname = 'fixtures_status_check'
-- union all select 'streaks.kind', count(*) = 1 from information_schema.columns where table_name='streaks' and column_name='kind'
-- union all select 'survivor.league_id', count(*) = 1 from information_schema.columns where table_name='survivor_entries' and column_name='league_id'
-- union all select 'members.base_points', count(*) = 1 from information_schema.columns where table_name='league_members' and column_name='base_points'
-- union all select 'badges M8', count(*) = 5 from badges where code in ('juara_grup','streak_5','perfect_md','pendiri','hadir_semua')
-- union all select 'resolve_config', (pickem_resolve_config('EPL-2026-27')->>'score_exact') = '5'
-- union all select 'tier fn', pickem_tier('H', 2, 1, 1, 1) = 'nyaris' and pickem_tier('D', 1, 1, 1, 1) = 'exact';
-- ============================================================================
