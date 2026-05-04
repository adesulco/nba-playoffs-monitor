-- 0006_content_engine.sql
-- v0.21.1 — Content engine schema (Phase 0 prep). NOT YET APPLIED.
--
-- Apply this migration on 2026-06-01 (Phase 0 kickoff per
-- docs/content-engine-response.md § 3) — paste into the Supabase
-- SQL editor at:
--   https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new
--
-- This migration sets up the storage layer for the agent-driven
-- content pipeline defined in spec-content-agent.md. It adds:
--
--   1. Source-data tables — fixtures, events, stats — populated by
--      the ingestion job that polls API-Football, ESPN, jolpica-f1.
--   2. F1-specific tables for sessions + results.
--   3. NBA-specific tables for games + play-by-play.
--   4. Generated-content tables — articles + per-run metadata.
--   5. pgvector extension for retrieval-augmented generation
--      (historical context, "last 5 meetings between these teams").
--
-- Naming follows the spec § 4.3 with minor adaptations:
--   - All tables prefixed `ce_` (content_engine) so they don't
--     collide with the existing app namespace (teams, series,
--     brackets, picks, derby_*). The existing `teams` table is the
--     web app's per-sport normalized roster; `ce_teams` is the
--     content-engine ingestion layer's source-of-truth. They will
--     reconcile via a join key in Phase 1.
--   - Slugs are Bahasa-friendly (kebab-case) per voice rules.
--
-- RLS: enabled on `ce_articles` so the public can read published
-- articles via PostgREST (powering the SPA pages); all other
-- tables are server-only via service-role.
--
-- Idempotent: uses CREATE TABLE IF NOT EXISTS / CREATE EXTENSION
-- IF NOT EXISTS / DROP POLICY IF EXISTS so re-running is safe.

-- pgvector for embeddings (used by the retrieval layer for
-- historical context — past articles, H2H summaries).
create extension if not exists vector;

-- ── Source-data tables ──────────────────────────────────────────────

create table if not exists ce_leagues (
  id           text primary key,                       -- 'epl', 'liga-1-id', 'nba-playoffs-2026', 'f1-2026', 'fifa-wc-2026'
  sport        text not null,                          -- 'football', 'basketball', 'f1'
  name_id      text not null,                          -- 'Liga Inggris 2025-26'
  name_en      text not null,                          -- 'Premier League 2025-26'
  season       text not null,                          -- '2025-26'
  start_date   date,
  end_date     date,
  source_feed  text not null,                          -- 'api-football', 'espn', 'jolpica'
  source_id    text,                                   -- foreign id from upstream feed
  created_at   timestamptz not null default now()
);

create table if not exists ce_teams (
  id            text primary key,                      -- '{league}-{slug}', e.g. 'epl-arsenal'
  league_id     text not null references ce_leagues(id) on delete cascade,
  slug          text not null,                         -- 'arsenal', 'persib', 'lakers'
  name          text not null,                         -- canonical name from feed
  name_id       text,                                  -- Bahasa alt ('Maung Bandung')
  short         text,                                  -- 'ARS', 'PSB', 'LAL'
  founded       integer,
  venue         text,
  city          text,
  logo_url      text,
  source_id     text,                                  -- upstream feed's team id
  source_feed   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (league_id, slug)
);

create table if not exists ce_players (
  id            text primary key,                      -- '{league}-{slug}'
  team_id       text references ce_teams(id) on delete set null,
  league_id     text not null references ce_leagues(id) on delete cascade,
  slug          text not null,                         -- 'mohamed-salah', 'lebron-james'
  name          text not null,
  position      text,                                  -- 'striker', 'pg', 'driver'
  number        integer,
  nationality   text,
  date_of_birth date,
  bio_id        text,                                  -- Bahasa bio paragraph (curated)
  bio_en        text,                                  -- English bio paragraph (optional)
  source_id     text,
  source_feed   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (league_id, slug)
);

create table if not exists ce_fixtures (
  id              text primary key,                    -- '{league}-{home}-vs-{away}-{yyyy-mm-dd}'
  league_id       text not null references ce_leagues(id) on delete cascade,
  home_team_id    text references ce_teams(id) on delete set null,
  away_team_id    text references ce_teams(id) on delete set null,
  kickoff_utc     timestamptz not null,
  venue           text,
  city            text,
  status          text not null default 'scheduled',   -- scheduled | live | final | postponed
  home_score      integer,
  away_score      integer,
  season          text,
  gameweek        integer,
  source_id       text,
  source_feed     text,
  source_payload  jsonb,                               -- raw feed snapshot (debugging)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ce_fixtures_league_kickoff_idx on ce_fixtures (league_id, kickoff_utc desc);
create index if not exists ce_fixtures_status_idx on ce_fixtures (status);

create table if not exists ce_events (
  id          uuid primary key default gen_random_uuid(),
  fixture_id  text not null references ce_fixtures(id) on delete cascade,
  minute      integer,                                  -- 0-120 + injury time as 90+1, 90+2 in `detail`
  type        text not null,                            -- 'goal', 'yellow', 'red', 'sub_in', 'sub_out', 'var'
  team_id     text references ce_teams(id) on delete set null,
  player_id   text references ce_players(id) on delete set null,
  detail      jsonb,                                    -- assist, related player, var-decision, injury-time minute
  created_at  timestamptz not null default now()
);
create index if not exists ce_events_fixture_idx on ce_events (fixture_id, minute);

create table if not exists ce_stats (
  fixture_id     text not null references ce_fixtures(id) on delete cascade,
  team_id        text not null references ce_teams(id) on delete cascade,
  possession     numeric(5,2),
  shots          integer,
  shots_on_target integer,
  xg             numeric(6,3),
  corners        integer,
  fouls          integer,
  yellow_cards   integer,
  red_cards      integer,
  passes         integer,
  pass_accuracy  numeric(5,2),
  raw            jsonb,
  primary key (fixture_id, team_id)
);

-- F1-specific source tables ──────────────────────────────────────────

create table if not exists ce_f1_sessions (
  id          text primary key,                         -- 'f1-2026-r06-monaco-race'
  race_id     text not null,                            -- 'f1-2026-r06-monaco'
  type        text not null,                            -- 'fp1', 'fp2', 'fp3', 'qualifying', 'sprint', 'race'
  round       integer not null,
  circuit     text not null,
  starts_utc  timestamptz,
  ends_utc    timestamptz,
  status      text not null default 'scheduled',
  source_id   text,
  source_feed text,
  created_at  timestamptz not null default now()
);

create table if not exists ce_f1_results (
  session_id   text not null references ce_f1_sessions(id) on delete cascade,
  driver_id    text not null,                           -- ce_players(id)
  position     integer,
  time_str     text,                                    -- '+0.123' or '1:23.456' or 'DNF'
  fastest_lap  boolean default false,
  points       numeric(5,2),
  laps         integer,
  status       text,                                    -- 'finished', 'dnf', 'dsq'
  raw          jsonb,
  primary key (session_id, driver_id)
);

-- NBA-specific source tables ─────────────────────────────────────────

create table if not exists ce_nba_games (
  id              text primary key,                     -- 'nba-2026-{home}-vs-{away}-{date}'
  series_id       text,                                 -- bracket series, optional
  home_team_id    text references ce_teams(id),
  away_team_id    text references ce_teams(id),
  tipoff_utc      timestamptz not null,
  status          text not null default 'scheduled',
  home_score      integer,
  away_score      integer,
  quarter_scores  jsonb,                                -- [{q:1, home:24, away:22}, ...]
  raw             jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists ce_nba_play_by_play (
  id            uuid primary key default gen_random_uuid(),
  game_id       text not null references ce_nba_games(id) on delete cascade,
  period        integer not null,
  game_clock    text not null,                          -- '11:34', '0:23.4'
  event_type    text not null,                          -- 'made_3pt', 'rebound', 'assist', 'turnover'
  player_id     text references ce_players(id),
  description   text,
  home_score    integer,
  away_score    integer,
  raw           jsonb
);
create index if not exists ce_nba_pbp_game_period_idx on ce_nba_play_by_play (game_id, period, game_clock);

-- ── Generated-content tables ────────────────────────────────────────

create table if not exists ce_articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,                   -- 'arsenal-vs-liverpool-2026-04-27'
  type          text not null,                          -- 'preview', 'recap', 'standings', 'race', 'profile', 'h2h', 'glossary'
  sport         text not null,                          -- 'football', 'basketball', 'f1'
  league_id     text references ce_leagues(id) on delete set null,
  fixture_id    text references ce_fixtures(id) on delete set null,
  team_id       text references ce_teams(id) on delete set null,
  player_id     text references ce_players(id) on delete set null,
  -- Content
  title         text not null,
  description   text not null,                          -- meta description (<=160 chars)
  body_md       text not null,                          -- markdown body
  schema_json   jsonb not null,                         -- JSON-LD blob
  frontmatter   jsonb not null,                         -- canonical url, og image, etc.
  -- Status
  status        text not null default 'draft',          -- draft | review | published | rejected | archived
  reviewed_by   text,                                   -- editor email or 'auto'
  rejection     text,                                   -- reason if status=rejected
  -- Lifecycle
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  published_at  timestamptz,
  version       integer not null default 1,
  -- For dedup + plagiarism checks
  body_hash     text,                                   -- sha256(body_md)
  body_simhash  text,                                   -- 7-gram simhash for sim search
  -- Vector for retrieval (Phase 4 evergreen profiles)
  embedding     vector(1536)
);
create index if not exists ce_articles_status_idx on ce_articles (status, type, created_at desc);
create index if not exists ce_articles_fixture_idx on ce_articles (fixture_id);
create index if not exists ce_articles_league_type_idx on ce_articles (league_id, type, published_at desc);

create table if not exists ce_article_runs (
  id              uuid primary key default gen_random_uuid(),
  article_id      uuid not null references ce_articles(id) on delete cascade,
  run_seq         integer not null,                     -- 1, 2, 3 for regenerations
  agent           text not null,                        -- 'preview-writer', 'recap-writer', etc.
  model           text not null,                        -- 'claude-sonnet-4-6', 'claude-haiku-4-5'
  input_tokens    integer not null,
  output_tokens   integer not null,
  cached_tokens   integer not null default 0,           -- prompt cache hits
  cost_usd        numeric(12,6),
  quality_flags   jsonb,                                -- { fact_pass: true, voice_score: 4.2, ... }
  duration_ms     integer,
  created_at      timestamptz not null default now()
);
create index if not exists ce_article_runs_article_idx on ce_article_runs (article_id, run_seq);

-- For external plagiarism check (per docs/content-engine-response.md § 6).
-- We periodically scrape top Indonesian sport sites + retain 30 days of
-- 7-gram fingerprints; per-article check compares against this corpus.
create table if not exists ce_external_corpus (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,                           -- 'detik', 'bola.net', 'kompas-bola', 'tempo-sport'
  source_url   text not null unique,
  title        text,
  fetched_at   timestamptz not null default now(),
  body_simhash text not null,                           -- 7-gram simhash
  body_excerpt text,                                    -- short excerpt for debug; we don't republish
  expires_at   timestamptz not null default (now() + interval '30 days')
);
create index if not exists ce_external_corpus_simhash_idx on ce_external_corpus (body_simhash);
create index if not exists ce_external_corpus_expires_idx on ce_external_corpus (expires_at);

-- ── Row-level security ──────────────────────────────────────────────

-- Public can read PUBLISHED articles (the SPA fetches them by slug).
-- Drafts + rejected are server-only.
alter table ce_articles enable row level security;
drop policy if exists ce_articles_read_published on ce_articles;
create policy ce_articles_read_published on ce_articles
  for select using (status = 'published');

-- Other tables — server-only (service role bypasses RLS).
alter table ce_leagues       enable row level security;
alter table ce_teams         enable row level security;
alter table ce_players       enable row level security;
alter table ce_fixtures      enable row level security;
alter table ce_events        enable row level security;
alter table ce_stats         enable row level security;
alter table ce_f1_sessions   enable row level security;
alter table ce_f1_results    enable row level security;
alter table ce_nba_games     enable row level security;
alter table ce_nba_play_by_play enable row level security;
alter table ce_article_runs  enable row level security;
alter table ce_external_corpus enable row level security;

-- Public read on the dimension tables (teams, players, leagues,
-- fixtures) is useful for the SPA's existing dashboards too. Open
-- it up for select; no public writes.
drop policy if exists ce_leagues_read on ce_leagues;
create policy ce_leagues_read on ce_leagues for select using (true);

drop policy if exists ce_teams_read on ce_teams;
create policy ce_teams_read on ce_teams for select using (true);

drop policy if exists ce_players_read on ce_players;
create policy ce_players_read on ce_players for select using (true);

drop policy if exists ce_fixtures_read on ce_fixtures;
create policy ce_fixtures_read on ce_fixtures for select using (true);

drop policy if exists ce_events_read on ce_events;
create policy ce_events_read on ce_events for select using (true);

drop policy if exists ce_stats_read on ce_stats;
create policy ce_stats_read on ce_stats for select using (true);

-- F1 + NBA source tables — read-only public.
drop policy if exists ce_f1_sessions_read on ce_f1_sessions;
create policy ce_f1_sessions_read on ce_f1_sessions for select using (true);

drop policy if exists ce_f1_results_read on ce_f1_results;
create policy ce_f1_results_read on ce_f1_results for select using (true);

drop policy if exists ce_nba_games_read on ce_nba_games;
create policy ce_nba_games_read on ce_nba_games for select using (true);

drop policy if exists ce_nba_play_by_play_read on ce_nba_play_by_play;
create policy ce_nba_play_by_play_read on ce_nba_play_by_play for select using (true);

-- article_runs + external_corpus stay server-only — no SELECT policy.

-- ── Seed: register the leagues we already cover ─────────────────────
-- Idempotent (ON CONFLICT DO NOTHING) so re-running the migration is safe.
insert into ce_leagues (id, sport, name_id, name_en, season, start_date, end_date, source_feed) values
  ('epl', 'football', 'Liga Inggris 2025-26', 'Premier League 2025-26', '2025-26', '2025-08-15', '2026-05-24', 'api-football'),
  ('liga-1-id', 'football', 'Super League Indonesia 2025-26', 'Indonesian Super League 2025-26', '2025-26', '2025-08-08', '2026-05-31', 'api-football'),
  ('nba-playoffs-2026', 'basketball', 'NBA Playoffs 2026', 'NBA Playoffs 2026', '2025-26', '2026-04-18', '2026-06-22', 'espn'),
  ('f1-2026', 'f1', 'Formula 1 2026', 'Formula 1 2026', '2026', '2026-03-08', '2026-12-06', 'jolpica-f1'),
  ('fifa-wc-2026', 'football', 'Piala Dunia FIFA 2026', 'FIFA World Cup 2026', '2026', '2026-06-11', '2026-07-19', 'api-football')
on conflict (id) do nothing;

-- ── End of migration ────────────────────────────────────────────────
