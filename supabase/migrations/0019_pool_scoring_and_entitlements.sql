-- ============================================================================
-- 0019 — Pool scoring config + entitlements  (Pick'em Flagship R1, ticket A1)
-- ============================================================================
-- Spec: pickem-flagship/05-development-plan.md §2, amended by
-- 06-gamification-audit.md GAP-1 (jagoan index) and grounded against the
-- LIVE schema on 2026-06-11 (probed via PostgREST before writing):
--
--   • predictions ALREADY has: league, picked_home/picked_away (these are
--     the Tebak Skor columns — 05's predicted_home/away_score would be
--     duplicates and are NOT added), is_jagoan, jagoan_mult_applied,
--     upset_mult_applied (all from 0015). Missing: matchday (needed for
--     the one-jagoan-per-matchday index), consensus_at_lock.
--   • leagues ALREADY has: owner_id, invite_code, visibility, competition,
--     enabled_modes, theme, color. Missing: scoring_config, max_members,
--     tier, late_join_policy, formats.
--   • league_members missing: status, managed_by.
--   • entitlements: does not exist.
--
-- Idempotent: every statement is IF NOT EXISTS / additive. Apply via the
-- Supabase SQL editor (verification block at the bottom). Additive only —
-- nothing here drops, renames, or rewrites existing data.
--
-- scoring_config shape (validated in api handlers, NOT by the DB — handlers
-- resolve effective config = league.scoring_config ?? pickem_rules):
-- {
--   "group_position_pts": 4, "perfect_group_bonus": 8,
--   "knockout_pts": {"r32":10,"r16":12,"qf":15,"sf":20,"final":30},
--   "score_exact": 5, "score_result_margin": 3, "score_result": 2,
--   "underdog_threshold": 0.30, "underdog_multiplier": 1.5,
--   "streak_len": 3, "streak_bonus": 3,
--   "jagoan_multiplier": 2, "jagoan_penalty": 0.25, "stack_cap": 4,
--   "nemesis_bonus": 2
-- }
-- ============================================================================

begin;

-- ── 1) leagues: per-pool config (a grup IS a league) ────────────────────────
alter table public.leagues add column if not exists scoring_config jsonb;
alter table public.leagues add column if not exists max_members int not null default 10;
alter table public.leagues add column if not exists tier text not null default 'free';
alter table public.leagues add column if not exists late_join_policy text not null default 'median';
alter table public.leagues add column if not exists formats text[] not null default '{match}';

-- checks added separately so re-runs don't fail (constraint names stable)
do $$ begin
  alter table public.leagues add constraint leagues_tier_chk
    check (tier in ('free','season','lifetime'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.leagues add constraint leagues_late_join_chk
    check (late_join_policy in ('median','zero'));
exception when duplicate_object then null; end $$;

-- ── 2) predictions: matchday denorm + consensus audit + jagoan uniqueness ──
-- matchday is denormalized from fixtures at write time (predict.js already
-- receives it in the payload); backfilled here for existing rows. Needed so
-- the one-jagoan-per-matchday rule is indexable without a cross-table ref.
alter table public.predictions add column if not exists matchday int;

update public.predictions p
set matchday = f.matchday
from public.fixtures f
where p.fixture_id = f.id and p.matchday is null;

-- consensus % of the pick's side at lock time (0..1), written by the cron
-- lock path (ticket A4). Auditable basis for the underdog bonus.
alter table public.predictions add column if not exists consensus_at_lock numeric;

-- GAP-1: ONE jagoan per user per league per matchday, enforced at the DB.
-- (is_jagoan itself exists since 0015; this is the hardening.)
create unique index if not exists predictions_one_jagoan_per_matchday
  on public.predictions (user_id, league, matchday)
  where is_jagoan = true;

-- ── 3) league_members: pending state (cap paywall) + manual entries ────────
alter table public.league_members add column if not exists status text not null default 'active';
alter table public.league_members add column if not exists managed_by uuid references auth.users(id);

do $$ begin
  alter table public.league_members add constraint league_members_status_chk
    check (status in ('active','pending','removed'));
exception when duplicate_object then null; end $$;

create index if not exists league_members_status_idx
  on public.league_members (league_id, status);

-- ── 4) entitlements (billing lands R3; table now so gates code once) ───────
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  product text not null,
  competition text,            -- null = all competitions (lifetime)
  provider text,               -- 'stripe' | 'midtrans' | 'comp' (manual grant)
  provider_ref text,           -- idempotency key for webhook writes
  starts_at timestamptz not null default now(),
  expires_at timestamptz,      -- null = perpetual
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.entitlements add constraint entitlements_product_chk
    check (product in ('season_pass','lifetime','gibol_plus'));
exception when duplicate_object then null; end $$;

-- webhook idempotency: a provider event maps to exactly one row
create unique index if not exists entitlements_provider_ref_uniq
  on public.entitlements (provider, provider_ref)
  where provider_ref is not null;

create index if not exists entitlements_user_idx
  on public.entitlements (user_id, product);

-- RLS: owner can READ own rows; ALL writes go through the service role
-- (which bypasses RLS). No recursive policies — 0018 lesson: policies on
-- tables joined with league_members must never sub-select themselves.
alter table public.entitlements enable row level security;

do $$ begin
  create policy entitlements_owner_read on public.entitlements
    for select to authenticated
    using (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;

-- ── 5) pickem_kpi_daily (ticket A6 — DB-side funnel proxies) ────────────────
-- GA4 owns behavioral events; this view owns what only the DB knows:
-- daily pick volume, jagoan usage, distinct pickers, and Weekly Active
-- Pools (grups with ≥3 members making ≥1 pick in the trailing 7 days —
-- the north-star). Read via service role only (no grants to anon/authenticated).
create or replace view public.pickem_kpi_daily as
with daily as (
  select
    date_trunc('day', p.created_at)::date as day,
    count(*)                              as picks,
    count(*) filter (where p.is_jagoan)   as jagoan_picks,
    count(distinct p.user_id)             as distinct_pickers
  from public.predictions p
  group by 1
),
wap as (
  select count(*) as weekly_active_pools from (
    select lm.league_id
    from public.league_members lm
    join public.predictions p
      on p.user_id = lm.user_id
     and p.created_at > now() - interval '7 days'
    where lm.status = 'active' or lm.status is null
    group by lm.league_id
    having count(distinct lm.user_id) >= 3
  ) t
)
select d.*, (select weekly_active_pools from wap) as weekly_active_pools
from daily d
order by d.day desc;

revoke all on public.pickem_kpi_daily from anon, authenticated;

commit;

-- ============================================================================
-- VERIFICATION (run after apply; every row should say ok)
-- ============================================================================
-- select 'leagues.scoring_config'    as col, count(*) = 1 as ok from information_schema.columns where table_name='leagues' and column_name='scoring_config'
-- union all
-- select 'leagues.max_members',        count(*) = 1 from information_schema.columns where table_name='leagues' and column_name='max_members'
-- union all
-- select 'leagues.tier',               count(*) = 1 from information_schema.columns where table_name='leagues' and column_name='tier'
-- union all
-- select 'leagues.late_join_policy',   count(*) = 1 from information_schema.columns where table_name='leagues' and column_name='late_join_policy'
-- union all
-- select 'leagues.formats',            count(*) = 1 from information_schema.columns where table_name='leagues' and column_name='formats'
-- union all
-- select 'predictions.matchday',       count(*) = 1 from information_schema.columns where table_name='predictions' and column_name='matchday'
-- union all
-- select 'predictions.consensus',      count(*) = 1 from information_schema.columns where table_name='predictions' and column_name='consensus_at_lock'
-- union all
-- select 'predictions.matchday backfilled', (select count(*) from predictions where matchday is null) = 0
-- union all
-- select 'jagoan partial index',       count(*) = 1 from pg_indexes where indexname='predictions_one_jagoan_per_matchday'
-- union all
-- select 'league_members.status',      count(*) = 1 from information_schema.columns where table_name='league_members' and column_name='status'
-- union all
-- select 'entitlements table',         count(*) = 1 from information_schema.tables  where table_name='entitlements'
-- union all
-- select 'entitlements RLS on',        relrowsecurity from pg_class where relname='entitlements'
-- union all
-- select 'kpi view',                   count(*) = 1 from information_schema.views   where table_name='pickem_kpi_daily';
-- ============================================================================
