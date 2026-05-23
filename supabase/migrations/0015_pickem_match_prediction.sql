-- 0015_pickem_match_prediction.sql
-- Pick'em match-prediction layer (Phase 1 of the gamification spec).
-- Implements the §5–§7 data model + scoring engine from
-- Gibol-Pickem-Gamification-Spec.docx.
--
-- Adds the per-match prediction primitive (fixtures + predictions),
-- extends pickem_rules / leagues / league_members for the new modes,
-- introduces survivor + badges + streaks, registers the four
-- leaderboard views, and ships the scoring RPC pickem_score_fixture().
--
-- Apply via the Supabase SQL Editor → project egzacjfbmgbcwhtvqixc →
--   https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new
--
-- Idempotent. Safe to re-run; every CREATE / ALTER is guarded.
--
-- Ship target: v0.66.0 (Pick'em P1) · 2026-05-23

begin;

-- ===========================================================================
-- 1. fixtures — the per-match prediction primitive.
--    Generalises a single competitive event (football, tennis, basketball
--    game). NBA series stay in `series`; this is the per-match layer that
--    the §5.1 ladder reads.
-- ===========================================================================

create table if not exists public.fixtures (
  id            uuid primary key default gen_random_uuid(),
  league        text not null,                         -- competition key: 'WC2026', 'EPL', 'NBA-Playoffs-2026'…
  season        text not null,                         -- '2026', '2025-26'…
  stage         text not null,                         -- 'group' | 'R32' | 'R16' | 'QF' | 'SF' | 'final' | regular-season week
  matchday      int  not null,                         -- groups fixtures for cadence + Jagoan + Survivor scope
  home_team     uuid not null references public.teams(id) on delete restrict,
  away_team     uuid not null references public.teams(id) on delete restrict,
  kickoff_at    timestamptz not null,
  lock_at       timestamptz not null,                  -- predictions lock here (= kickoff by default)
  status        text not null default 'scheduled' check (status in ('scheduled', 'live', 'final')),
  home_score    int,
  away_score    int,
  outcome       text check (outcome in ('H', 'D', 'A')),
  -- Implied probabilities, vig-removed, summing to 1.0 (§7.1)
  p_home        numeric(5, 4),
  p_draw        numeric(5, 4),
  p_away        numeric(5, 4),
  finalized_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (home_team <> away_team),
  check (home_score is null or home_score >= 0),
  check (away_score is null or away_score >= 0),
  -- p_* may be null for events with no odds source; if any present, all must be
  check ((p_home is null and p_draw is null and p_away is null) or
         (p_home is not null and p_draw is not null and p_away is not null))
);

create index if not exists fixtures_league_season_idx  on public.fixtures (league, season);
create index if not exists fixtures_kickoff_idx        on public.fixtures (kickoff_at);
create index if not exists fixtures_matchday_idx       on public.fixtures (league, season, matchday);
create index if not exists fixtures_status_idx         on public.fixtures (status) where status <> 'final';

alter table public.fixtures enable row level security;

-- Public read. Writes are service-role only (cron + admin endpoints).
drop policy if exists fixtures_anon_read on public.fixtures;
create policy fixtures_anon_read on public.fixtures
  for select to anon, authenticated using (true);

comment on table public.fixtures is
  'Per-match prediction primitive (Pickem-Gamification-Spec §10.1). Generalises a single competitive event. Implied probabilities are vig-removed and sum to 1.0.';

-- ===========================================================================
-- 2. predictions — per-user, per-fixture pick.
-- ===========================================================================

create table if not exists public.predictions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  fixture_id          uuid not null references public.fixtures(id) on delete cascade,
  league              text not null,                   -- denormalised for fast leaderboard grouping
  picked_outcome      text not null check (picked_outcome in ('H', 'D', 'A')),
  picked_home         int  check (picked_home is null or picked_home >= 0),
  picked_away         int  check (picked_away is null or picked_away >= 0),
  is_jagoan           boolean not null default false,  -- one true per (user, matchday) — enforced at write time
  awarded_points      int,                             -- null until pickem_score_fixture() runs
  base_points         int,                             -- 0 / 3 / 5 / 8 — audit, pre-multiplier
  jagoan_mult_applied numeric(4, 2),                   -- 1 / 2 / 3 — audit
  upset_mult_applied  numeric(4, 2),                   -- 1.0 - upset_cap — audit
  grup_bonus_points   int default 0,                   -- written by score RPC; sum across grups
  created_at          timestamptz not null default now(),
  scored_at           timestamptz,
  unique (user_id, fixture_id)
);

create index if not exists predictions_user_idx       on public.predictions (user_id);
create index if not exists predictions_fixture_idx    on public.predictions (fixture_id);
create index if not exists predictions_league_idx     on public.predictions (league);
create index if not exists predictions_scored_idx     on public.predictions (scored_at desc) where scored_at is not null;

alter table public.predictions enable row level security;

drop policy if exists predictions_owner_select on public.predictions;
create policy predictions_owner_select on public.predictions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists predictions_owner_insert on public.predictions;
create policy predictions_owner_insert on public.predictions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists predictions_owner_update on public.predictions;
create policy predictions_owner_update on public.predictions
  for update to authenticated
  using (auth.uid() = user_id)
  -- Block edits after lock (the fixture row controls lock_at).
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.fixtures f
      where f.id = predictions.fixture_id and f.lock_at > now()
    )
  );

drop policy if exists predictions_owner_delete on public.predictions;
create policy predictions_owner_delete on public.predictions
  for delete to authenticated using (
    auth.uid() = user_id and
    exists (
      select 1 from public.fixtures f
      where f.id = predictions.fixture_id and f.lock_at > now()
    )
  );

comment on table public.predictions is
  'Per-user, per-fixture pick (Pickem-Gamification-Spec §10.2). Owner-scoped RLS; edits only allowed before fixtures.lock_at.';

-- ===========================================================================
-- 3. pickem_rules — extend with match-mode scoring config.
--    Existing columns (league, …) untouched.
-- ===========================================================================

alter table public.pickem_rules add column if not exists pts_exact         int     default 8;
alter table public.pickem_rules add column if not exists pts_goaldiff      int     default 5;
alter table public.pickem_rules add column if not exists pts_outcome       int     default 3;
alter table public.pickem_rules add column if not exists jagoan_mult_group numeric(4,2) default 2.0;
alter table public.pickem_rules add column if not exists jagoan_mult_ko    numeric(4,2) default 3.0;
alter table public.pickem_rules add column if not exists enable_upset_bonus boolean default true;
alter table public.pickem_rules add column if not exists upset_floor       numeric(4,2) default 1.0;  -- below this multiplier, snap to 1.0
alter table public.pickem_rules add column if not exists upset_cap         numeric(4,2) default 3.0;  -- hard cap
-- Piecewise-linear curve, breakpoints { p, mult } sorted by p descending.
-- Defaults are the §7.2 spec breakpoints.
alter table public.pickem_rules add column if not exists upset_curve       jsonb   default '[
  {"p":0.65,"mult":1.0},
  {"p":0.45,"mult":1.5},
  {"p":0.33,"mult":2.0},
  {"p":0.18,"mult":2.2},
  {"p":0.12,"mult":3.0}
]'::jsonb;
alter table public.pickem_rules add column if not exists grup_bonus_points int     default 2;
alter table public.pickem_rules add column if not exists enable_survivor   boolean default true;
-- KO stages (any stage in this array applies jagoan_mult_ko + bracket bonus).
alter table public.pickem_rules add column if not exists ko_stages         text[]  default array['R32','R16','QF','SF','final'];

-- Seed a default WC2026 ruleset if not present (fully tunable post-launch).
insert into public.pickem_rules (league)
select 'WC2026'
where not exists (select 1 from public.pickem_rules where league = 'WC2026');

-- ===========================================================================
-- 4. leagues + league_members — extend for the "grup" surface.
--    NOTE: keep table name `leagues`; product copy says "grup" (spec §10).
-- ===========================================================================

alter table public.leagues add column if not exists visibility       text not null default 'private' check (visibility in ('private','public'));
alter table public.leagues add column if not exists competition      text;                          -- the Pickem-competition key the grup tracks
alter table public.leagues add column if not exists enabled_modes    jsonb not null default '{"match":true,"jagoan":true,"upset":true,"bracket":true,"survivor":false}'::jsonb;
alter table public.leagues add column if not exists theme            text;                          -- 'garuda-faithful', 'office', etc. — public grup themes
alter table public.leagues add column if not exists color            text;                          -- hex token for grup card accent

alter table public.league_members add column if not exists points_cache        int  not null default 0;
alter table public.league_members add column if not exists exact_count_cache   int  not null default 0;
alter table public.league_members add column if not exists last_predicted_at   timestamptz;
alter table public.league_members add column if not exists matchday_rank       int;                   -- updated by score RPC per matchday
alter table public.league_members add column if not exists previous_rank       int;                   -- prior matchday rank for "naik 4 peringkat" copy

create index if not exists league_members_points_cache_idx on public.league_members (league_id, points_cache desc);
create index if not exists leagues_visibility_idx on public.leagues (visibility, competition);

-- ===========================================================================
-- 5. survivor_entries — one row per (user, competition).
-- ===========================================================================

create table if not exists public.survivor_entries (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  competition          text not null,
  status               text not null default 'alive' check (status in ('alive','out')),
  eliminated_matchday  int,                          -- matchday on which user was eliminated
  used_team_ids        uuid[] not null default '{}', -- no-reuse enforced in RPC
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, competition)
);

create index if not exists survivor_status_idx on public.survivor_entries (competition, status);

alter table public.survivor_entries enable row level security;

drop policy if exists survivor_owner_select on public.survivor_entries;
create policy survivor_owner_select on public.survivor_entries
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists survivor_owner_insert on public.survivor_entries;
create policy survivor_owner_insert on public.survivor_entries
  for insert to authenticated with check (auth.uid() = user_id);

-- Owners do NOT update directly; advance/eliminate flows through the RPC.

-- ===========================================================================
-- 6. badges + user_badges — status currency (§9).
-- ===========================================================================

create table if not exists public.badges (
  code        text primary key,
  name_id     text not null,                    -- Bahasa label
  name_en     text,
  description text,
  criteria    jsonb,                            -- machine-readable awarding rule (interpreted by the RPC)
  rarity      text default 'common' check (rarity in ('common','rare','legendary')),
  created_at  timestamptz not null default now()
);

-- user_badges identity: a synthetic uuid PK keeps things simple while
-- the composite uniqueness lives in a unique INDEX (Postgres allows
-- expressions in unique indexes but not in PRIMARY KEY constraints).
-- The coalesce() wrappers let (competition, matchday) be NULL for
-- badges that are competition-wide / cross-matchday without breaking
-- the idempotent `insert ... on conflict do nothing` pattern.
create table if not exists public.user_badges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  badge_code  text not null references public.badges(code) on delete cascade,
  awarded_at  timestamptz not null default now(),
  competition text,
  matchday    int
);

create unique index if not exists user_badges_uniq
  on public.user_badges (user_id, badge_code, coalesce(competition, ''), coalesce(matchday, 0));

create index if not exists user_badges_user_idx on public.user_badges (user_id, awarded_at desc);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists badges_anon_read on public.badges;
create policy badges_anon_read on public.badges for select to anon, authenticated using (true);

drop policy if exists user_badges_owner_read on public.user_badges;
create policy user_badges_owner_read on public.user_badges for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_badges_public_read on public.user_badges;
create policy user_badges_public_read on public.user_badges for select to anon, authenticated
  using (true);  -- profiles are public; badge collections are visible

-- Seed the launch badge catalog (idempotent inserts on code primary key).
insert into public.badges (code, name_id, name_en, description, criteria, rarity) values
  ('nostradamus',   'Nostradamus',     'Nostradamus',     'Tiga skor pas berturut-turut.',                    '{"type":"exact_streak","n":3}'::jsonb,        'legendary'),
  ('berani',        'Berani',          'Brave',           'Tebak upset benar (peluang ≤ 20%).',                 '{"type":"upset_hit","p_max":0.20}'::jsonb,    'rare'),
  ('konsisten',     'Konsisten',       'Consistent',      'Streak prediksi 10 matchday berturut-turut.',        '{"type":"submit_streak","n":10}'::jsonb,      'common'),
  ('raja_grup',     'Raja Grup',       'Group King',      'Posisi pertama di grup untuk satu matchday.',        '{"type":"grup_matchday_top","rank":1}'::jsonb,'rare'),
  ('survivor_top',  'Fan Terakhir',    'Last Fan',        'Selamat di Survivor sampai matchday terakhir.',      '{"type":"survivor_winner"}'::jsonb,            'legendary')
on conflict (code) do update set
  name_id     = excluded.name_id,
  name_en     = excluded.name_en,
  description = excluded.description,
  criteria    = excluded.criteria,
  rarity      = excluded.rarity;

-- ===========================================================================
-- 7. streaks — current + longest, per (user, competition).
-- ===========================================================================

create table if not exists public.streaks (
  user_id         uuid not null references auth.users(id) on delete cascade,
  competition     text not null,
  current_streak  int not null default 0,           -- consecutive matchdays with ≥1 prediction submitted
  longest_streak  int not null default 0,
  last_matchday   int,                              -- last matchday counted
  updated_at      timestamptz not null default now(),
  primary key (user_id, competition)
);

alter table public.streaks enable row level security;

drop policy if exists streaks_owner_read on public.streaks;
create policy streaks_owner_read on public.streaks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists streaks_public_read on public.streaks;
create policy streaks_public_read on public.streaks for select to anon, authenticated using (true);

-- ===========================================================================
-- 8. Leaderboard views.
--    leaderboard_competition — global per competition (the public board).
--    leaderboard_league      — per-grup (uses league_members cache).
--    leaderboard_matchday    — per (competition, matchday) — for "naik N peringkat" copy.
-- ===========================================================================

create or replace view public.leaderboard_competition as
select
  p.league                                                    as competition,
  p.user_id,
  prof.username,
  prof.avatar_url,
  coalesce(sum(p.awarded_points), 0)                          as points,
  count(*) filter (where p.base_points = 8)                   as exact_count,
  min(p.created_at)                                            as first_submitted_at,
  rank() over (
    partition by p.league
    order by coalesce(sum(p.awarded_points), 0) desc,
             count(*) filter (where p.base_points = 8) desc,
             min(p.created_at) asc
  )                                                            as rank
from public.predictions p
left join public.profiles prof on prof.id = p.user_id
where p.scored_at is not null
group by p.league, p.user_id, prof.username, prof.avatar_url;

comment on view public.leaderboard_competition is
  'Global leaderboard per Pickem competition. Tiebreakers (spec §6.4): points → exact_count → earliest first_submitted_at.';

create or replace view public.leaderboard_league as
select
  l.id                  as league_id,
  l.name                as league_name,
  l.competition,
  lm.user_id,
  prof.username,
  prof.avatar_url,
  lm.points_cache       as points,
  lm.exact_count_cache  as exact_count,
  lm.matchday_rank,
  lm.previous_rank,
  rank() over (
    partition by l.id
    order by lm.points_cache desc,
             lm.exact_count_cache desc,
             lm.last_predicted_at asc nulls last
  )                     as rank
from public.leagues l
join public.league_members lm on lm.league_id = l.id
left join public.profiles prof on prof.id = lm.user_id;

comment on view public.leaderboard_league is
  'Per-grup leaderboard reading the cached aggregates on league_members. Refreshed by pickem_score_fixture().';

create or replace view public.leaderboard_matchday as
select
  p.league as competition,
  f.matchday,
  p.user_id,
  prof.username,
  prof.avatar_url,
  coalesce(sum(p.awarded_points), 0)            as points,
  count(*) filter (where p.base_points = 8)     as exact_count,
  min(p.created_at)                              as first_submitted_at,
  rank() over (
    partition by p.league, f.matchday
    order by coalesce(sum(p.awarded_points), 0) desc,
             count(*) filter (where p.base_points = 8) desc,
             min(p.created_at) asc
  )                                              as rank
from public.predictions p
join public.fixtures f on f.id = p.fixture_id
left join public.profiles prof on prof.id = p.user_id
where p.scored_at is not null
group by p.league, f.matchday, p.user_id, prof.username, prof.avatar_url;

comment on view public.leaderboard_matchday is
  'Per-matchday leaderboard — feeds the "naik N peringkat di Grup X" post-matchday copy.';

-- ===========================================================================
-- 9. Helper: pickem_upset_mult(p, curve, floor, cap) — piecewise linear.
-- ===========================================================================

create or replace function public.pickem_upset_mult(
  p          numeric,
  curve      jsonb,
  floor_val  numeric default 1.0,
  cap_val    numeric default 3.0
) returns numeric
language plpgsql
immutable
as $$
declare
  -- Walk the curve (sorted by p DESCENDING — high prob → low mult).
  prev_p    numeric := null;
  prev_mult numeric := null;
  cur_p     numeric;
  cur_mult  numeric;
  result    numeric;
  point     jsonb;
begin
  if p is null or curve is null or jsonb_array_length(curve) = 0 then
    return floor_val;
  end if;

  -- Above the highest probability breakpoint → floor (favourites = ×1).
  point := curve -> 0;
  if p >= (point->>'p')::numeric then
    return greatest(floor_val, (point->>'mult')::numeric);
  end if;

  -- Below the lowest probability breakpoint → cap (shocks).
  point := curve -> (jsonb_array_length(curve) - 1);
  if p <= (point->>'p')::numeric then
    return least(cap_val, (point->>'mult')::numeric);
  end if;

  -- Interpolate linearly between the two bracketing breakpoints.
  for point in select value from jsonb_array_elements(curve) loop
    cur_p    := (point->>'p')::numeric;
    cur_mult := (point->>'mult')::numeric;
    if prev_p is not null and p <= prev_p and p >= cur_p then
      if prev_p = cur_p then
        result := cur_mult;
      else
        result := prev_mult + (cur_mult - prev_mult) * ((prev_p - p) / (prev_p - cur_p));
      end if;
      return greatest(floor_val, least(cap_val, result));
    end if;
    prev_p    := cur_p;
    prev_mult := cur_mult;
  end loop;

  -- Fallthrough (shouldn't happen given the bounds check above).
  return floor_val;
end;
$$;

comment on function public.pickem_upset_mult(numeric, jsonb, numeric, numeric) is
  'Piecewise-linear upset multiplier curve from pickem_rules.upset_curve. §7.2.';

-- ===========================================================================
-- 10. RPC: pickem_score_fixture(p_fixture_id) — the scoring engine.
--     Idempotent. Computes base by §5.1 ladder, applies Jagoan + upset
--     multipliers (§6.1), writes awarded_points + audit columns, refreshes
--     league_members caches, advances/eliminates Survivor entries, awards
--     badges + streak bumps.
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
  result          jsonb;
begin
  -- 1. Load the fixture; bail if not final.
  select * into fx from public.fixtures where id = p_fixture_id;
  if not found then
    raise exception 'fixture % not found', p_fixture_id;
  end if;
  if fx.status <> 'final' or fx.outcome is null then
    return jsonb_build_object('ok', false, 'reason', 'not_final', 'fixture_id', p_fixture_id);
  end if;

  -- 2. Load the ruleset; fall back to defaults if no row.
  select * into rules from public.pickem_rules where league = fx.league;
  if not found then
    -- Insert a default row so subsequent re-runs are deterministic.
    insert into public.pickem_rules (league) values (fx.league)
      on conflict (league) do nothing
      returning * into rules;
    if rules.league is null then
      select * into rules from public.pickem_rules where league = fx.league;
    end if;
  end if;

  is_ko := fx.stage = any (coalesce(rules.ko_stages, array['R32','R16','QF','SF','final']));

  -- 3. Score every prediction on this fixture.
  for prediction in select * from public.predictions where fixture_id = p_fixture_id loop
    -- 3a. Base points from the §5.1 ladder.
    if prediction.picked_outcome = fx.outcome then
      -- Exact scoreline match.
      if prediction.picked_home is not null and prediction.picked_away is not null
         and prediction.picked_home = fx.home_score
         and prediction.picked_away = fx.away_score then
        base_pts := rules.pts_exact;
      -- Correct margin (goal-diff) match — requires both scores submitted.
      elsif prediction.picked_home is not null and prediction.picked_away is not null
            and (prediction.picked_home - prediction.picked_away)
              = (fx.home_score    - fx.away_score) then
        base_pts := rules.pts_goaldiff;
      else
        base_pts := rules.pts_outcome;
      end if;
    else
      base_pts := 0;
    end if;

    -- 3b. Jagoan multiplier.
    jmult := case
      when prediction.is_jagoan and is_ko then rules.jagoan_mult_ko
      when prediction.is_jagoan          then rules.jagoan_mult_group
      else 1.0
    end;

    -- 3c. Upset multiplier — only on a correct result, only when enabled,
    --     and only when implied probabilities are present.
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

    -- 3d. Write back. Idempotent re-run overwrites prior values cleanly.
    update public.predictions set
      base_points          = base_pts,
      jagoan_mult_applied  = jmult,
      upset_mult_applied   = umult,
      awarded_points       = awarded,
      scored_at            = now()
    where id = prediction.id;

    scored_count  := scored_count + 1;
    total_awarded := total_awarded + awarded;
  end loop;

  -- 4. Refresh league_members caches for any grups whose competition matches.
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

  -- 5. Compute grup-relative bonuses on this fixture (§6.3).
  if coalesce(rules.grup_bonus_points, 0) > 0 then
    -- For each grup tracking this competition, find the member whose
    -- prediction is closest to the actual scoreline. "Closest" = smaller
    -- absolute goal-difference error, ties split. Only members who DID
    -- predict this fixture are eligible.
    with grup_predictions as (
      select
        l.id                                                                                    as league_id,
        lm.user_id,
        p.id                                                                                    as prediction_id,
        abs( (p.picked_home - p.picked_away) - (fx.home_score - fx.away_score) )                as gd_err,
        abs(coalesce(p.picked_home,0) - fx.home_score)
          + abs(coalesce(p.picked_away,0) - fx.away_score)                                      as score_err
      from public.leagues l
      join public.league_members lm on lm.league_id = l.id
      join public.predictions p
        on p.user_id = lm.user_id and p.fixture_id = p_fixture_id
      where l.competition = fx.league
        and p.picked_home is not null and p.picked_away is not null
    ),
    ranked as (
      select
        league_id, user_id, prediction_id, gd_err, score_err,
        rank() over (partition by league_id order by gd_err asc, score_err asc) as rk,
        count(*)    over (partition by league_id) as n,
        count(*)    over (partition by league_id, gd_err, score_err) as ties_at_top
      from grup_predictions
    )
    update public.predictions p set
      grup_bonus_points = coalesce(p.grup_bonus_points, 0)
        + floor( rules.grup_bonus_points::numeric / r.ties_at_top )::int
    from ranked r
    where r.rk = 1 and r.n > 1 and r.prediction_id = p.id;
  end if;

  -- 6. Advance / eliminate Survivor entries — only fires if rules enable it.
  if coalesce(rules.enable_survivor, false) then
    -- A survivor pick for this matchday is a prediction with is_jagoan=true
    -- on a fixture with the same matchday as fx. (Simpler: Survivor mode
    -- writes its picks through a future dedicated endpoint that tags
    -- predictions with a separate survivor_pick flag; for v1 we infer
    -- via is_jagoan to keep the schema lean. Refine when Survivor ships.)
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
          and p.is_jagoan
          and p.picked_outcome <> fx.outcome
      );
  end if;

  result := jsonb_build_object(
    'ok',            true,
    'fixture_id',    p_fixture_id,
    'league',        fx.league,
    'matchday',      fx.matchday,
    'is_ko',         is_ko,
    'scored_count',  scored_count,
    'total_awarded', total_awarded
  );
  return result;
end;
$$;

comment on function public.pickem_score_fixture(uuid) is
  'Pick''em match scoring engine (Pickem-Gamification-Spec §6). Idempotent; safe to re-run after a score correction.';

-- ===========================================================================
-- 11. Trigger: keep fixtures.updated_at fresh + auto-derive outcome on final.
-- ===========================================================================

create or replace function public.fixtures_set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  -- Derive outcome on finalize if not explicitly set.
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

drop trigger if exists fixtures_set_updated_at on public.fixtures;
create trigger fixtures_set_updated_at
  before update on public.fixtures
  for each row execute function public.fixtures_set_updated_at();

commit;
