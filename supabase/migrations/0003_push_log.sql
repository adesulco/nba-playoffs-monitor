-- 0003_push_log.sql
-- Push dedupe ledger. One row per (channel, game_id, bucket) tuple.
-- Insert-first semantics on the cron side mean the UNIQUE constraint
-- doubles as the dedupe lock — if the row already exists we skip the
-- OneSignal call entirely.
--
-- Apply via Supabase SQL Editor → project egzacjfbmgbcwhtvqixc →
--   https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new
-- Safe to re-run — all DDL guarded by IF EXISTS / IF NOT EXISTS.

begin;

create table if not exists public.push_log (
  id          uuid primary key default gen_random_uuid(),
  channel     text not null,        -- 'nba_close', 'nba_final', 'epl_match', 'f1_qual', etc.
  game_id     text not null,        -- ESPN event id or equivalent for other sports
  bucket      text not null,        -- dedupe key scoped to the channel's semantics
  payload     jsonb,                -- snapshot of the alert data sent (debugging)
  sent_at     timestamptz not null default now(),
  unique (channel, game_id, bucket)
);

create index if not exists push_log_sent_at_idx on public.push_log (sent_at desc);
create index if not exists push_log_channel_game_idx on public.push_log (channel, game_id);

-- RLS: server-only table. Anon clients must never read or write. The cron
-- uses the service-role key so it bypasses RLS; users of the app have
-- zero business touching this table.
alter table public.push_log enable row level security;

-- Explicit "deny all" policy: no one from the anon role can do anything.
-- (Service role bypasses RLS regardless.)
drop policy if exists push_log_deny_anon on public.push_log;
create policy push_log_deny_anon on public.push_log
  for all
  to anon
  using (false)
  with check (false);

commit;
