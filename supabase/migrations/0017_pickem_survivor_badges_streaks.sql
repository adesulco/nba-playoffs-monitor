-- 0017_pickem_survivor_badges_streaks.sql
-- Pick'em P5.5 server-side surface for Survivor + badges + streaks.
--
-- Three additions on top of migration 0015:
--
-- 1. Survivor: predictions gains a dedicated `survivor_pick` boolean so
--    Survivor and Jagoan can coexist on the same matchday. The
--    pickem_score_fixture RPC's survivor-advance branch (introduced in
--    0015 as an is_jagoan-based placeholder) switches to reading
--    survivor_pick instead.
--
-- 2. Badge auto-award: a SECURITY DEFINER helper pickem_award_badges
--    walks the user's scored history and inserts user_badges rows when
--    a badge's criteria are met. Called from pickem_score_fixture for
--    every user whose prediction was scored.
--
-- 3. Streak update: pickem_update_streak bumps current_streak when the
--    user submitted on consecutive matchdays, resets when the chain
--    breaks. Idempotent — calling multiple times for the same matchday
--    only counts once.
--
-- Apply via Supabase SQL Editor:
--   https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new
--
-- Ship target: v0.73.0 (Pick'em P5.5) · 2026-05-23

begin;

-- ===========================================================================
-- 1. predictions.survivor_pick — boolean, default false.
-- ===========================================================================

alter table public.predictions
  add column if not exists survivor_pick boolean not null default false;

create index if not exists predictions_survivor_idx
  on public.predictions (user_id, league)
  where survivor_pick;

-- One survivor pick per (user, league, matchday) — enforced via a
-- partial unique on the join with fixtures.matchday. The cleanest
-- physical model would be a separate survivor_picks table, but we keep
-- it on predictions per the 0015 comment ("infer via is_jagoan to keep
-- the schema lean") — survivor_pick is now the explicit column.
--
-- Hard uniqueness is enforced server-side in api/_lib/pickem/
-- upsert-survivor-pick.js (clears any other survivor_pick=true on the
-- same matchday before setting the new one).

-- ===========================================================================
-- 2. pickem_update_streak(user_id, competition, matchday)
--    Bumps current_streak when the matchday extends the chain, resets
--    when there's a gap. Idempotent for the same (user, comp, matchday).
-- ===========================================================================

create or replace function public.pickem_update_streak(
  p_user_id      uuid,
  p_competition  text,
  p_matchday     int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.streaks%rowtype;
  next_current int;
  next_longest int;
begin
  select * into existing
  from public.streaks
  where user_id = p_user_id and competition = p_competition;

  if not found then
    insert into public.streaks (user_id, competition, current_streak, longest_streak, last_matchday)
      values (p_user_id, p_competition, 1, 1, p_matchday);
    return;
  end if;

  -- Idempotent: same matchday → no-op.
  if existing.last_matchday = p_matchday then
    return;
  end if;

  if existing.last_matchday is null then
    next_current := 1;
  elsif p_matchday = existing.last_matchday + 1 then
    next_current := existing.current_streak + 1;
  else
    -- Gap (or out-of-order) → reset to 1.
    next_current := 1;
  end if;

  next_longest := greatest(coalesce(existing.longest_streak, 0), next_current);

  update public.streaks set
    current_streak = next_current,
    longest_streak = next_longest,
    last_matchday  = p_matchday,
    updated_at     = now()
  where user_id = p_user_id and competition = p_competition;
end;
$$;

comment on function public.pickem_update_streak(uuid, text, int) is
  'Bump the consecutive-matchday streak for one user. Idempotent.';

-- ===========================================================================
-- 3. pickem_award_badges(user_id, competition, matchday)
--    Inserts user_badges rows for newly-met criteria. Idempotent — the
--    user_badges primary key (user_id, badge_code, competition, matchday)
--    naturally dedupes via on-conflict-do-nothing.
--
--    v1 implements: nostradamus (3 exact-score in a row), berani (an
--    upset hit at p ≤ 0.20), konsisten (streak ≥ 10).
--    raja_grup + survivor_top auto-award deferred — they need
--    per-grup matchday rank evaluation (raja_grup) and the survivor
--    final-day evaluation (survivor_top).
-- ===========================================================================

create or replace function public.pickem_award_badges(
  p_user_id      uuid,
  p_competition  text,
  p_matchday     int default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  awarded int := 0;
  is_nostradamus boolean := false;
  is_berani boolean := false;
  is_konsisten boolean := false;
  cur_streak int;
begin
  -- Nostradamus: three consecutive scored predictions with base_points = 8.
  -- "Consecutive" = by scored_at ordering, no result with base_points < 8 in between.
  with last_three as (
    select base_points
    from public.predictions
    where user_id = p_user_id and league = p_competition and scored_at is not null
    order by scored_at desc
    limit 3
  )
  select count(*) = 3 and bool_and(base_points = 8) into is_nostradamus from last_three;

  if is_nostradamus then
    insert into public.user_badges (user_id, badge_code, competition, matchday)
      values (p_user_id, 'nostradamus', p_competition, coalesce(p_matchday, 0))
      on conflict do nothing;
    if found then awarded := awarded + 1; end if;
  end if;

  -- Berani: at least one scored prediction with upset_mult_applied >= 2.2
  -- (corresponds to the p ≤ 0.20 threshold in the spec §7.2 curve).
  select exists (
    select 1 from public.predictions
    where user_id = p_user_id and league = p_competition
      and scored_at is not null
      and base_points > 0
      and coalesce(upset_mult_applied, 1.0) >= 2.2
  ) into is_berani;

  if is_berani then
    insert into public.user_badges (user_id, badge_code, competition)
      values (p_user_id, 'berani', p_competition)
      on conflict do nothing;
    if found then awarded := awarded + 1; end if;
  end if;

  -- Konsisten: streak ≥ 10.
  select current_streak into cur_streak
  from public.streaks
  where user_id = p_user_id and competition = p_competition;
  is_konsisten := coalesce(cur_streak, 0) >= 10;

  if is_konsisten then
    insert into public.user_badges (user_id, badge_code, competition)
      values (p_user_id, 'konsisten', p_competition)
      on conflict do nothing;
    if found then awarded := awarded + 1; end if;
  end if;

  return awarded;
end;
$$;

comment on function public.pickem_award_badges(uuid, text, int) is
  'Evaluate per-user badge criteria and insert user_badges rows. Idempotent.';

-- ===========================================================================
-- 4. Refresh pickem_score_fixture() — switch Survivor branch from
--    is_jagoan to survivor_pick, then call streak + badge helpers at end.
-- ===========================================================================

create or replace function public.pickem_score_fixture(p_fixture_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fx              public.fixtures%rowtype;
  rules           public.pickem_rules%rowtype;
  is_ko           boolean;
  prediction      public.predictions%rowtype;
  base_pts        int;
  jmult           numeric;
  umult           numeric;
  awarded         int;
  picked_called_p numeric;
  scored_count    int := 0;
  total_awarded   int := 0;
  affected_users  uuid[] := '{}';
  uid             uuid;
  result          jsonb;
begin
  select * into fx from public.fixtures where id = p_fixture_id;
  if not found then
    raise exception 'fixture % not found', p_fixture_id;
  end if;
  if fx.status <> 'final' or fx.outcome is null then
    return jsonb_build_object('ok', false, 'reason', 'not_final', 'fixture_id', p_fixture_id);
  end if;

  select * into rules from public.pickem_rules where league = fx.league;
  if not found then
    insert into public.pickem_rules (league) values (fx.league)
      on conflict (league) do nothing
      returning * into rules;
    if rules.league is null then
      select * into rules from public.pickem_rules where league = fx.league;
    end if;
  end if;

  is_ko := fx.stage = any (coalesce(rules.ko_stages, array['R32','R16','QF','SF','final']));

  -- Score predictions.
  for prediction in select * from public.predictions where fixture_id = p_fixture_id loop
    if prediction.picked_outcome = fx.outcome then
      if prediction.picked_home is not null and prediction.picked_away is not null
         and prediction.picked_home = fx.home_score
         and prediction.picked_away = fx.away_score then
        base_pts := rules.pts_exact;
      elsif prediction.picked_home is not null and prediction.picked_away is not null
            and (prediction.picked_home - prediction.picked_away)
              = (fx.home_score - fx.away_score) then
        base_pts := rules.pts_goaldiff;
      else
        base_pts := rules.pts_outcome;
      end if;
    else
      base_pts := 0;
    end if;

    jmult := case
      when prediction.is_jagoan and is_ko then rules.jagoan_mult_ko
      when prediction.is_jagoan          then rules.jagoan_mult_group
      else 1.0
    end;

    umult := 1.0;
    if rules.enable_upset_bonus and base_pts > 0 and fx.p_home is not null then
      picked_called_p := case prediction.picked_outcome
        when 'H' then fx.p_home
        when 'D' then fx.p_draw
        when 'A' then fx.p_away
      end;
      umult := public.pickem_upset_mult(
        picked_called_p, rules.upset_curve, rules.upset_floor, rules.upset_cap
      );
    end if;

    awarded := floor(base_pts * jmult * umult)::int;

    update public.predictions set
      base_points          = base_pts,
      jagoan_mult_applied  = jmult,
      upset_mult_applied   = umult,
      awarded_points       = awarded,
      scored_at            = now()
    where id = prediction.id;

    if not (prediction.user_id = any (affected_users)) then
      affected_users := array_append(affected_users, prediction.user_id);
    end if;

    scored_count  := scored_count + 1;
    total_awarded := total_awarded + awarded;
  end loop;

  -- Refresh league_members caches.
  update public.league_members lm set
    points_cache      = sub.pts,
    exact_count_cache = sub.exact_count
  from (
    select
      p.user_id,
      coalesce(sum(p.awarded_points), 0)              as pts,
      count(*) filter (where p.base_points = 8)       as exact_count
    from public.predictions p
    join public.fixtures f on f.id = p.fixture_id
    where f.league = fx.league
      and p.scored_at is not null
    group by p.user_id
  ) sub
  join public.leagues l on l.competition = fx.league
  where lm.user_id = sub.user_id and lm.league_id = l.id;

  -- Grup-relative bonuses on this fixture.
  if coalesce(rules.grup_bonus_points, 0) > 0 then
    with grup_predictions as (
      select
        l.id        as league_id,
        lm.user_id,
        p.id        as prediction_id,
        abs( (p.picked_home - p.picked_away) - (fx.home_score - fx.away_score) ) as gd_err,
        abs(coalesce(p.picked_home,0) - fx.home_score)
          + abs(coalesce(p.picked_away,0) - fx.away_score) as score_err
      from public.leagues l
      join public.league_members lm on lm.league_id = l.id
      join public.predictions p on p.user_id = lm.user_id and p.fixture_id = p_fixture_id
      where l.competition = fx.league
        and p.picked_home is not null and p.picked_away is not null
    ),
    ranked as (
      select league_id, user_id, prediction_id, gd_err, score_err,
        rank() over (partition by league_id order by gd_err asc, score_err asc) as rk,
        count(*) over (partition by league_id) as n,
        count(*) over (partition by league_id, gd_err, score_err) as ties_at_top
      from grup_predictions
    )
    update public.predictions p set
      grup_bonus_points = coalesce(p.grup_bonus_points, 0)
        + floor( rules.grup_bonus_points::numeric / r.ties_at_top )::int
    from ranked r
    where r.rk = 1 and r.n > 1 and r.prediction_id = p.id;
  end if;

  -- Survivor: eliminate users whose survivor_pick lost this fixture.
  -- Switches from the 0015 is_jagoan placeholder to the dedicated
  -- survivor_pick column added in this migration.
  if coalesce(rules.enable_survivor, false) then
    update public.survivor_entries se set
      status              = 'out',
      eliminated_matchday = fx.matchday,
      updated_at          = now()
    where se.competition = fx.league
      and se.status = 'alive'
      and exists (
        select 1 from public.predictions p
        where p.user_id = se.user_id
          and p.fixture_id = p_fixture_id
          and p.survivor_pick
          and p.picked_outcome <> fx.outcome
      );
  end if;

  -- Streak + badge auto-award per user touched by this scoring pass.
  foreach uid in array affected_users loop
    perform public.pickem_update_streak(uid, fx.league, fx.matchday);
    perform public.pickem_award_badges(uid, fx.league, fx.matchday);
  end loop;

  result := jsonb_build_object(
    'ok',             true,
    'fixture_id',     p_fixture_id,
    'league',         fx.league,
    'matchday',       fx.matchday,
    'is_ko',          is_ko,
    'scored_count',   scored_count,
    'total_awarded',  total_awarded,
    'users_affected', cardinality(affected_users)
  );
  return result;
end;
$$;

commit;
