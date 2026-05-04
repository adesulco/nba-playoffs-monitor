-- v0.59.3 — content-engine generation failures audit. Already
-- applied via Supabase MCP (apply_migration "generation_failures").
-- This file documents the schema for future replays.

create table if not exists public.ce_generation_failures (
  id bigserial primary key,
  attempted_at timestamptz not null default now(),
  command text not null,
  agent text,
  reason_type text not null,
  reason_summary text,
  cost_usd numeric(10,4) default 0,
  github_run_id text,
  github_run_url text,
  details jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ce_generation_failures_attempted_at
  on public.ce_generation_failures (attempted_at desc);
create index if not exists idx_ce_generation_failures_unresolved
  on public.ce_generation_failures (attempted_at desc)
  where resolved = false;
create index if not exists idx_ce_generation_failures_reason
  on public.ce_generation_failures (reason_type, attempted_at desc);

alter table public.ce_generation_failures enable row level security;

comment on table public.ce_generation_failures is
  'Audit log for content-engine articles generated but blocked by a quality gate. Drives the /editor "Failed" tab.';
