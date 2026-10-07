# Changelog

Ship notes from v0.86.0 onward. Older notes (v0.1.0 – v0.85.0) live as comments in `src/lib/version.js`; that file is frozen as history and only `APP_VERSION` changes there now.

## v0.89.17 — 2026-10-07 — Gugur board names

- The Gugur board listed every member as an 8-character id prefix: `survivor-board` asked `profiles` for a `username` column that does not exist, so the whole name query failed. It reads `nickname` only and falls back to "Pemain xxxx" like the grup page. `verify-gugur.mjs` now checks the board shows the nickname.

## v0.89.16 — 2026-10-07 — funnel events back

- The 4a rebuild dropped the call sites of half the documented Pick'em funnel (`src/lib/pickemEvents.js`). Grup create and join now fire `pickem_grup_create` (template, competition) and `pickem_grup_join` (pending) from the api.js seam, replacing the parameterless `pickem_group_created` / `pickem_group_joined`. The upgrade sheet fires `pickem_upgrade_view` on open and `pickem_upgrade_start` on the order CTA. The WhatsApp "ingatkan" nudge counts as `pickem_share` (card `nudge`, via `wa`), next to the share cards. `pickem_upgrade_success` waits for billing (S4); `pickem_rollover_accept` has no screen yet.

## v0.89.15 — 2026-10-07 — two-grup Gugur

- A Gugur pick is one shared row per matchday, but each grup keeps its own used-team list. A pick made from grup B left grup A's list on the old team, so A wrongly refused switching back and would later have allowed a real reuse. `upsert-survivor-pick` now plans the pick with `survivor-core.js` and writes it to every alive life the user holds in that competition; a team used in any alive grup is refused.
- The Gugur sheet no longer strands a member whose matchday pick was made in another grup: it explains the shared pick and offers "Ikut Gugur di grup ini juga" to start this grup's life with it.
- `scripts/verify-gugur.mjs` is the doc 17 S1 two-grup exit check against prod (failed 5 of 13 before this release). `scripts/rls-attack.mjs` now also probes the three leaderboard views (closed by `0024_leaderboard_views_close.sql`, awaiting apply).

## v0.89.14 — 2026-10-02 — soccer scoreboards per day

- ESPN now answers HTTP 400 to date-range soccer scoreboards (`dates=YYYYMMDD-YYYYMMDD`), which emptied the EPL hub's fixture strip and the Liga 1 rows on `/beranda`. `src/lib/espnScoreboard.js` fetches each day in parallel through the edge proxy and merges events; one failed day no longer blanks the strip.

## v0.89.13 — 2026-10-02 — dead code removed

- 19 modules nothing reaches any more are deleted: the navy Pick'em kit (`primitives.jsx`, `FixtureCard`, `PickemHome`, bracket stages and state, recap cards, invite sheet, rollover banner, right rail, flags), the legacy bracket editor and share buttons, and a few orphaned components and hooks. Found by an import-graph walk from `src/main.jsx`, `api/`, `scripts/` and the tests; the `src/lib/sports` adapters stay because the prerender loads them dynamically. The audit's "two primitive kits / three bracket stacks" is down to one of each.

## v0.89.12 — 2026-10-02 — glossary guard

- The vocabulary guard enforces the doc 17 §2.4 glossary: Pick'em copy (`tx()` arguments and JSX text under `src/pickem/`) says "grup", never "league"/"liga"; competition names and template variables are exempt.

## v0.89.11 — 2026-10-02 — EPL SEO copy

- The hub's SEO block (EN + ID) describes 2026-27: season dates from the fixture list, the promoted clubs, and a broadcast answer that no longer asserts this season's rights holder.

## v0.89.10 — 2026-10-02 — EPL hub on 2026-27

- The Premier League hub showed last season: standings requested `season=2025` and the club list was 2025-26. Standings now read `season=2026` (ESPN serves the 2026-27 table), and the 20 clubs are this season's: Coventry, Hull and Ipswich in, with bios and share cards.
- Burnley, West Ham and Wolves move to `FORMER_CLUBS`: their indexed pages still resolve and prerender, labelled 2025-26. URLs stay on the canonical `/premier-league-2025-26` slug (doc 17).
- `generate-entity-og.mjs` reads the season from the club module and accepts `OG_ONLY=slug,slug`.

## v0.89.9 — 2026-10-02 — audit security + ops entry

- **Proxy:** GET/HEAD only; the paid API-Football key is relayed only for the read paths the app uses (fixtures, lineups, statistics, squads, top scorers/assists, teams, standings, status); the dead football-data provider is gone.
- **Derby:** the state response carries the caller's own votes, so it is `private, no-store` instead of edge-cached for everyone.
- **Voter hash:** no literal fallback secret; a per-instance random one if no env secret exists.
- **Guest merge:** one batch upsert instead of up to 100 sequential calls.
- **Invite landing:** between matchdays the CTA goes to the grup home (the code stays in the URL); a signed-in member sees "Kamu sudah gabung — buka grup".
- **Skor:** link to the sport hubs (`/beranda`).
- **`enter-result`** admin action (doc 17 §2.3): ops entry of fixtures for feedless competitions and of results through the same finalise-and-score path as `score-fixture`.

## v0.89.8 — 2026-10-02 — claim on any sign-in

- One shared claim routine (`src/pickem/claim.js`) used by `/auth/callback` and by a root-level `ClaimOnSignIn` that runs only when the device holds guest picks or an invite. A magic link that falls back to the site root (redirect not on the Supabase allowlist) now still claims the picks and joins the grup.
- `onSession()` in the API seam; tests for the claim routine (129 total).
- State doc: launch-readiness table (RLS apply, auth email cap of 2/hour with custom SMTP off, redirect allowlist, invoice).

## v0.89.7 — 2026-10-01 — install prompt

- Profile offers the PWA install prompt when the browser allows it (`promptInstall` was never called anywhere).

## v0.89.6 — 2026-10-01 — audit polish

- Desktop: the 232 px left-rail offset applies only to shells with a tab bar, so the pick sheet and sign-in are centred at ≥ 900 px.
- Edisi Malam: the five direct `--g4-ink` uses now use `--g4-text` / `--g4-ink-block`.
- One avatar palette (`src/pickem/avatar.js`) instead of five copies.
- Seam guard (`scripts/check-seam.mjs`) in the build: only `api.js` may import Supabase.
- Unused dependencies removed: tailwindcss, postcss, autoprefixer, @sentry/vite-plugin.
- Tests for the registry, share URLs and avatar palette (125 total); the adding-a-sport checklist lives in `docs/02-PLATFORM-CONTRACT.md`.

## v0.89.5 — 2026-10-01 — legacy screens deleted

- The 20 unmounted navy Pick'em and legacy NBA bracket screens are gone (their routes already redirected since v0.88.0).

## v0.89.4 — 2026-10-01 — register fix

- The Derby share card and page said "Prediksi gue" (audit stale-copy item); now "Prediksiku". v0.89.3 failed the register guard on Vercel once the guard covered `api/`.

## v0.89.3 — 2026-10-01 — doc 17 leftovers

- `api/billing.js` (9/12 Node): Midtrans Snap create-order, signature-checked webhook that upserts `entitlements` idempotently on `(provider, provider_ref)` and lifts the owner's grup tier, order status. Answers 503 `billing_not_configured` until `MIDTRANS_SERVER_KEY` is set (KYB).
- `score-fixture` accepts `advancer` for a knockout tie decided on penalties (score stays a draw for tiers; the bracket reads the advancer).
- `leagues.formats` retired from the API; migration `0023_drop_formats.sql` written (apply after this version is live).
- Vocabulary guard now scans `api/` as well.
- Seven dead feature flags deleted from `src/lib/flags.js`.
- `content-cron.yml` shellcheck findings fixed.

## v0.89.2 — 2026-10-01 — Kabar reads the real index

- The content index is `{ articles }` with an `approved` flag (60 of 175 approved); Kabar listed nothing because it expected an array and filtered on the review flag.

## v0.89.1 — 2026-10-01 — S3 hotfix

- v0.89.0 never deployed: the vocabulary guard rejected the rules page ("tanpa taruhan" / "no betting" are banned words even when negated). Reworded to "yang dipertaruhkan cuma gengsi".
- `pickem_share` analytics event (card, channel) for the share-card CTR read in PostHog.
- State doc: manual grant runbook and the post-S3 open items.

## v0.89.0 — 2026-10-01 — S3 Retention

- **Papan Nasional:** `leaderboard-national` action (points board from the Spec v1 view, streak board from `streaks(kind='correct')`, your own row pinned when signed in) and the `/papan` page, linked from Main.
- **Klasemen:** Nyaris column (from the 0021 view) on GrupHome and the national board.
- **Rules:** `/aturan` — the ladder, jagoan, underdog, templates, Gugur, tiebreaks, and "kenapa gratis"; linked from the pick sheet ⓘ, GrupHome and Papan.
- **Share:** "Bagikan klasemen" (g4-juara) on GrupHome and "Bagikan pick-ku" (g4-matchday) after a pick, through the Web Share API with the PNG as a file when the browser allows, else link, else clipboard.
- **PWA:** a tap-to-reload toast on service-worker `controllerchange`; SW cache version bumped and the precache list moved to the shell routes; manifest shortcuts (Pick, Grup, Skor), description and theme colours on the 4a paper (light and dark).
- **Kabar:** a static digest of the published content index at `/kabar`; the tab is live.
- **Hubs:** `/premier-league-2026-27` and `/super-league-2026-27` redirect to the canonical 2025-26 slugs; `/beranda` NBA calls go through `/api/proxy`.
- **Docs:** collapsed to `00-STATE`, `01-PRODUCT`, `02-PLATFORM-CONTRACT`, `03-DESIGN` (+ doc 17/18 and audits); everything else in `docs/archive/`; `CLAUDE.md` rewritten.

## v0.88.0 — 2026-10-01 — S2 Platform

One registry, two new competitions, the shell owns create/login/profile, and the entry bundle is under 100 KB.

- **Registry:** `src/pickem/competitions.js` is the single source (doc 17 §2.1); `competitions.json` is generated (`npm run registry`) and `npm run build` fails on drift. Skins, the invite OG card, create-league validation, server defaults, both backfill scripts and the football workflow matrix read it.
- **Rows:** `LIGA1-2026-27` (ESPN `idn.1`, league shape, matchweeks created from the feed, 18 teams seeded with three-letter codes) — ESPN has no 2026/27 Liga 1 data yet, so the feed is marked pending; `NBA-2026-27` (regular season, weeks from the Oct 19 opening week, 81 fixtures seeded). NBA scanner re-enabled without the custom user agent and limited to NBA months; one green run each for scanner, NBA backfill and the registry-driven football matrix.
- **4a screens:** `/grup/baru` wizard (name, competition, Santai/Standar/Sultan template → `scoring_config.template`), `/masuk` (+ `/login` alias) and `/profil` with logout inside the chrome gate; commissioner approvals with the upgrade sheet (`src/pickem/pricing.js`, order link from `VITE_ORDER_URL`). The navy `/pickem/*` screens and the legacy NBA bracket routes now redirect.
- **PickSheet:** single-row reads, lock via one timeout, "x dari y pick MW" progress and next-pick chaining.
- **Hygiene:** `api.js` 15 s read cache with in-flight dedupe and write invalidation; Skor polling pauses while hidden; the 1 Hz tick lives in `Countdown4a`.
- **Bundle:** Sentry and PostHog load after consent, `Home.jsx` lazy, Supabase client deferred (proxy, imported on first use): entry 232 → 98 KB gzip.

## v0.87.0 — 2026-10-01 — S1 Truth

The loop is true end to end: a pick made from an invite joins the grup, a guest's picks and invite are claimed on first login, and every screen writes through the API seam.

- **Scoring:** `scoring-core.js` mirrors the Spec v1 SQL; 56 shared vectors run in JS (`npm test`) and against the SQL pure functions in prod (`node scripts/test-scoring-parity.mjs`). `src/lib/pickemScoring.js` retired.
- **Dispatcher:** new `get-fixture`, `get-prediction`, `update-profile`; `upsert-prediction` writes `matchday` and stamps `league_members.last_predicted_at` (tiebreak 4); `league-detail?id=` returns `invite_code` only to the owner or an active member (by code it is still public, as the code is the proof); admin actions compare `x-admin-token` only, with `crypto.timingSafeEqual`; `/api/auth/callback` rejects `next` values that start with `//` and defaults to `/`; `list-fixtures` accepts `status=postponed`.
- **Join and claim:** PickSheet confirm joins the invite's grup when signed in and stores the invite code for guests; AuthCallback claims guest picks, joins the stored grup, defaults `next` to `/`, and skips the favourites onboarding for Pick'em routes; GrupHome shows "Klaim pick & gabung" to guests and "Gabung grup" to signed-in non-members. The four direct Supabase writes (NicknameNudge4a, Profile, GrupJoin, PredictingHub) go through `update-profile` / `league-detail`.
- **Gugur:** survivor lives are per grup — `upsert-survivor-pick` takes `league_id`, checks membership and the grup's toggle, and releases the old team when the matchday's pick changes; `list-survivor` and `survivor-board` read by grup. Copy: "Seri = gugur".
- **Copy and provisional points:** PickSheet shows "Skor tepat 5 · hasil + selisih 3 · hasil 2 · nyaris 1 · ★ ×2"; Skor live tiles and the GrupHome points tile show "+N sementara" from `useProvisionalPoints`.
- **Not done:** the "share4a.js streak card" copy change — no such card exists in the repo (share cards are `api/og-recap.js?type=g4-*`, none of them a streak card). The S3 Streak board will carry "pick tepat beruntun".

## Unreleased — S1 step 2: migration 0022 RLS close (written, not yet applied)

- **Migration:** `supabase/migrations/0022_rls_close.sql` — no client inserts or updates on `league_members` (join/approve/grant stay server-side), prediction writes limited to pick columns on the user's own row before lock (`awarded_points`, `base_points`, `tier` and the other audit columns are server-only), `leagues` writes server-only, scoring/badge/streak functions executable by `service_role` only, anon loses the roster and prediction grants. Tested on a local PG16 with `supabase/tests/0022_rls_close.test.sql`.
- **Tooling:** `scripts/rls-attack.mjs` signs in as a throwaway user and tries every hole with a real JWT; exit 1 while any succeeds. Against prod before 0022 it found 15 holes, including creating a league directly and anon executing `pickem_score_fixture`.

## v0.86.1 — 2026-10-01 — S1 step 1: migration 0021 (applied 2026-10-01, EPL re-scored)

- **Migration:** `supabase/migrations/0021_scoring_v1.sql` — Scoring Spec v1 (doc 17 §1): ladder 5/3/2/1 with `predictions.tier`, jagoan ×2 flat with penalty off by default, consensus underdog ×1.5 under 30 %, stack cap 4×, `streaks.kind`, survivor per grup (draw = out, no pick = out, revived on correction), `league_members.base_points`, `fixtures.status = 'postponed'`, lock follows kickoff, M8 badges, bracket group_rank scoring with Spec v1 points, per-grup template config (Santai/Standar/Sultan) honoured in grup caches. Tested on a local PG16 with `supabase/tests/0021_scoring_v1.test.sql`.
- **Phase A (this deploy):** `predict.js`, `list-profile.js`, `fixtures.js` no longer select `grup_bonus_points` / `p_*`, so 0021 can be applied without breaking picks or fixture lists. Apply 0021 only after this version is live.

## v0.86.0 — 2026-10-01 — S0 Rescue

EPL had never scored. ESPN renamed the eng.1 `season.slug` and the football backfill skipped every event for 40 days while the cron exited green and the health alarm sat red with no reader.

- **Fix:** `scripts/backfill-fixtures-football.mjs` accepts any `season.slug` for league-shape competitions; draws on league fixtures are a result, not a "KO draw without shootout" skip.
- **Fix:** matched fixtures take ESPN's kickoff time and move `lock_at` with it (MD6 was seeded at 14:00Z for all ten games; ESPN has 11:30Z, 14:00Z and 16:30Z).
- **Fix:** rolling ESPN window reaches back to the earliest past non-final fixture (cap 120 days), so a run after an outage catches up by itself.
- **Hardening:** ESPN non-200 is a job failure (one retry), fixture reads paginate past 1000 rows, every run writes a JSON summary.
- **CI:** `football-backfill.yml` gains a verify step that fails when past non-final fixtures exist but zero source events matched. New `health-watch.yml` every 30 min fails on `scoring.ok == false` or any red competition.
- **Chrome:** bare `/grup` is a 4a route (no legacy masthead or bottom nav); `SportFooter` gated off 4a routes; TabBar Main goes to `/`; EN lock countdown reads `1d 2h` (ID keeps `1h 2j`).
- **Housekeeping:** README describes the Pick'em platform; `package.json` version matches `APP_VERSION`; CLAUDE.md function budget is 8/12 Node, edge exempt; docs 17/18 and the 2026-10-01 audit added; `docs/00-STATE.md` created from HANDOVER; this file created.
- **Not changed:** `vercel.json` Cache-Control. Verified in prod that function-set `Cache-Control` headers are honoured (health returns its own `s-maxage`, list-fixtures is an edge HIT). The audit measured with `curl -I`; the dispatcher answers HEAD with 405.
