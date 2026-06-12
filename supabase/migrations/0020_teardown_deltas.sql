-- ============================================================================
-- 0020 — Teardown deltas D1+D2  (pickem-flagship/08-teardown-deltas.md)
-- ============================================================================
-- 08's D1–D2 were written as amendments to 0019, but 0019 was applied on
-- 2026-06-11 before 08 landed — so they ship as this additive follow-up.
--
--   D1: widen tier/product check constraints for the future Sponsor Pool
--       tier (no sponsor features built now; just avoids a DDL change at R6).
--   D2: leagues.description — commissioner rules/prizes text (their
--       load-bearing pattern). 2000 chars. The BANNED-VOCAB legal guard is
--       SERVER-SIDE in create-league/update-league-settings (a CHECK can't
--       reasonably regex Indonesian betting vocabulary; the API is the
--       only write path since RLS blocks client writes to leagues).
--
-- Idempotent. Apply via the Supabase SQL editor. Verification at bottom.
-- ============================================================================

begin;

-- D1a · leagues.tier: + 'sponsor'
alter table public.leagues drop constraint if exists leagues_tier_chk;
alter table public.leagues add constraint leagues_tier_chk
  check (tier in ('free','season','lifetime','sponsor'));

-- D1b · entitlements.product: + 'sponsor_pool'
alter table public.entitlements drop constraint if exists entitlements_product_chk;
alter table public.entitlements add constraint entitlements_product_chk
  check (product in ('season_pass','lifetime','gibol_plus','sponsor_pool'));

-- D2 · leagues.description (plain text + line breaks; render w/ Read-more)
alter table public.leagues add column if not exists description text;

do $$ begin
  alter table public.leagues add constraint leagues_description_len_chk
    check (description is null or char_length(description) <= 2000);
exception when duplicate_object then null; end $$;

commit;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- select 'tier allows sponsor' as item,
--        pg_get_constraintdef(oid) like '%sponsor%' as ok
--   from pg_constraint where conname = 'leagues_tier_chk'
-- union all
-- select 'product allows sponsor_pool',
--        pg_get_constraintdef(oid) like '%sponsor_pool%'
--   from pg_constraint where conname = 'entitlements_product_chk'
-- union all
-- select 'leagues.description', count(*) = 1
--   from information_schema.columns
--  where table_name = 'leagues' and column_name = 'description'
-- union all
-- select 'description length check', count(*) = 1
--   from pg_constraint where conname = 'leagues_description_len_chk';
-- ============================================================================
