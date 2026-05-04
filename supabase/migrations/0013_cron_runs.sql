-- v0.59.2 — content-engine cron audit table.
--
-- Records every scheduled / workflow_dispatch / on-demand run of the
-- content-engine. Two purposes:
--
--   1. Pre-flight cost cap. Before any cron run spends a single Anthropic
--      token, the workflow queries SUM(cost_usd) for runs WHERE run_at >=
--      today_utc and refuses to start if it exceeds DAILY_BUDGET_USD
--      (default $2). Hard stop, no degrade-to-Haiku silent fallback.
--      Per CLAUDE.md rule #11: "Cost cap is enforced. If exceeded, halt
--      and alert — don't silently degrade or downgrade models."
--
--   2. Reverse-chronological audit log. Future /editor dashboard tab can
--      read this table to show "last 24h cron activity, cost spent, mode
--      breakdown, articles generated."
--
-- Service-role writes only (workflows use SUPABASE_SERVICE_ROLE_KEY which
-- bypasses RLS). RLS enabled with no policies = deny all to anon + authed,
-- by design — this is an admin table.

create table if not exists public.ce_cron_runs (
  id bigserial primary key,
  run_at timestamptz not null default now(),
  mode text not null,                                -- 'nba-recaps' | 'football-previews' | etc.
  trigger text not null check (trigger in (
    'schedule', 'workflow_dispatch', 'on_demand', 'manual'
  )),
  articles_count int not null default 0,
  cost_usd numeric(10,4) not null default 0,
  budget_skipped boolean not null default false,     -- true = run aborted by daily budget cap
  github_run_id text,
  github_run_url text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ce_cron_runs_run_at
  on public.ce_cron_runs (run_at desc);
create index if not exists idx_ce_cron_runs_mode_run_at
  on public.ce_cron_runs (mode, run_at desc);
create index if not exists idx_ce_cron_runs_today
  on public.ce_cron_runs (run_at)
  where budget_skipped = false;

alter table public.ce_cron_runs enable row level security;
-- No policies on purpose — service_role only.

comment on table public.ce_cron_runs is
  'Audit log for content-engine cron + workflow_dispatch runs. Drives cost-cap pre-check + future audit dashboard.';
