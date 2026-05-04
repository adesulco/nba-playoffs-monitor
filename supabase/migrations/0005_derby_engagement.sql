-- 0005_derby_engagement.sql
-- v0.15.0 — Engagement primitives for the derby/landing pages.
--
-- Anonymous-by-default. The "voter_hash" is a sha256 of (IP + UA + day-bucket)
-- computed in the API layer; it deliberately rotates daily so we don't keep a
-- stable identifier across days but still get same-session dedup.
--
-- Pages this serves today: /derby/persija-persib (El Clasico Indonesia).
-- Designed sport-generic so any future big-match landing page (Persib derby,
-- Lakers-Celtics, El Clasico Spanyol) can reuse the same tables by changing
-- page_slug + poll_id.

create table if not exists derby_polls (
  id           text primary key,                       -- e.g. 'derby-persija-persib-winner-2026-05-10'
  page_slug    text not null,                          -- e.g. 'persija-persib'
  question     text not null,
  options      jsonb not null,                         -- [{id, label}]
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists derby_polls_page_slug_idx on derby_polls (page_slug);

create table if not exists derby_poll_votes (
  id           uuid primary key default gen_random_uuid(),
  poll_id      text not null references derby_polls(id) on delete cascade,
  option_id    text not null,
  voter_hash   text not null,
  created_at   timestamptz not null default now(),
  unique (poll_id, voter_hash)
);
create index if not exists derby_poll_votes_poll_idx on derby_poll_votes (poll_id);

create table if not exists derby_reactions (
  id           uuid primary key default gen_random_uuid(),
  page_slug    text not null,
  emoji        text not null,                          -- 'fire'|'heart'|'broken'|'cry'|'clap'|'trophy'
  voter_hash   text not null,
  created_at   timestamptz not null default now(),
  unique (page_slug, emoji, voter_hash)
);
create index if not exists derby_reactions_page_idx on derby_reactions (page_slug);

create table if not exists derby_oneliners (
  id           uuid primary key default gen_random_uuid(),
  page_slug    text not null,
  side         text not null check (side in ('persija','persib','neutral')),
  text         text not null check (length(text) <= 80),
  voter_hash   text not null,
  status       text not null default 'visible' check (status in ('visible','flagged','hidden')),
  flag_count   integer not null default 0,
  upvotes      integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists derby_oneliners_page_idx on derby_oneliners (page_slug, status, created_at desc);

-- Aggregated views — read-only public surfaces used by the GET endpoints.
create or replace view v_derby_poll_results as
  select
    p.id           as poll_id,
    p.page_slug,
    opt.option_id,
    coalesce(c.cnt, 0) as votes
  from derby_polls p
  cross join lateral jsonb_array_elements(p.options) as o
  cross join lateral (select o->>'id' as option_id) opt
  left join lateral (
    select count(*)::int as cnt
    from derby_poll_votes v
    where v.poll_id = p.id and v.option_id = opt.option_id
  ) c on true;

create or replace view v_derby_reaction_counts as
  select page_slug, emoji, count(*)::int as cnt
  from derby_reactions
  group by page_slug, emoji;

-- RLS — keep all writes server-only via service-role; reads stay open
-- so future client-side optimistic UI can read counts without going
-- through the API. (Today the API does the read too, so this is just
-- defence-in-depth.)
alter table derby_polls           enable row level security;
alter table derby_poll_votes      enable row level security;
alter table derby_reactions       enable row level security;
alter table derby_oneliners       enable row level security;

drop policy if exists derby_polls_read on derby_polls;
create policy derby_polls_read on derby_polls
  for select using (true);

drop policy if exists derby_poll_votes_read on derby_poll_votes;
create policy derby_poll_votes_read on derby_poll_votes
  for select using (true);

drop policy if exists derby_reactions_read on derby_reactions;
create policy derby_reactions_read on derby_reactions
  for select using (true);

-- Oneliners: only "visible" rows are public.
drop policy if exists derby_oneliners_read_visible on derby_oneliners;
create policy derby_oneliners_read_visible on derby_oneliners
  for select using (status = 'visible');

-- No INSERT/UPDATE/DELETE policies — service role bypasses RLS, and
-- anon/auth keys can't write.

-- Seed the four launch polls for /derby/persija-persib. Idempotent
-- (ON CONFLICT DO NOTHING) so the migration can be re-run safely.
insert into derby_polls (id, page_slug, question, options, expires_at) values
  (
    'derby-persija-persib-winner-2026-05-10',
    'persija-persib',
    'Siapa menang di JIS, 10 Mei 2026?',
    '[{"id":"persija","label":"Persija menang"},{"id":"persib","label":"Persib menang"},{"id":"draw","label":"Imbang"}]'::jsonb,
    '2026-05-10T08:30:00.000Z'
  ),
  (
    'derby-persija-persib-score-2026-05-10',
    'persija-persib',
    'Skor akhirnya berapa?',
    '[{"id":"1-0","label":"Persija 1-0 Persib"},{"id":"2-1","label":"Persija 2-1 Persib"},{"id":"0-1","label":"Persija 0-1 Persib"},{"id":"1-2","label":"Persija 1-2 Persib"},{"id":"1-1","label":"Imbang 1-1"},{"id":"2-2","label":"Imbang 2-2"},{"id":"other","label":"Skor lainnya"}]'::jsonb,
    '2026-05-10T08:30:00.000Z'
  ),
  (
    'derby-persija-persib-first-scorer-2026',
    'persija-persib',
    'Cetak gol pertama?',
    '[{"id":"persija-fwd","label":"Striker Persija"},{"id":"persija-mid","label":"Gelandang Persija"},{"id":"persib-fwd","label":"Striker Persib"},{"id":"persib-mid","label":"Gelandang Persib"},{"id":"no-goal","label":"Ga ada gol"}]'::jsonb,
    '2026-05-10T08:30:00.000Z'
  ),
  (
    'derby-persija-persib-goat',
    'persija-persib',
    'GOAT El Clasico Indonesia sepanjang masa?',
    '[{"id":"bepe","label":"Bambang Pamungkas (Persija)"},{"id":"simic","label":"Marko Simic (Persija)"},{"id":"atep","label":"Atep (Persib)"},{"id":"kekez","label":"Cristian Gonzales (Persib)"},{"id":"david","label":"David da Silva (Persib)"},{"id":"gajos","label":"Maciej Gajos (Persija)"}]'::jsonb,
    null
  )
on conflict (id) do nothing;
