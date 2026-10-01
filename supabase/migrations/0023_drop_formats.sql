-- ============================================================================
-- 0023 — drop leagues.formats  (doc 17 §2.2 + §4 decision 5)
-- ============================================================================
-- `enabled_modes` (0015) is the one mode system. `formats` (0019) was a second
-- copy that nothing scored on; create-league / update-league-settings /
-- league-detail stopped reading or writing it in v0.90.0. Apply AFTER that
-- version is live (a column still selected by live code breaks the API).
-- The description guard in league-config.js is unaffected.
-- ============================================================================
begin;
alter table public.leagues drop column if exists formats;
commit;
-- VERIFICATION
-- select 'formats gone' as item, count(*) = 0 as ok from information_schema.columns where table_name = 'leagues' and column_name = 'formats';
