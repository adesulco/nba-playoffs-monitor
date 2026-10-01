# Gibol Deep Sweep Audit — 2026-10-01

Audit of gibol.co (prod) and github.com/adesulco/nba-playoffs-monitor (HEAD v0.85.0 `68d684b`, 2026-08-18; no commits since). Full version with tables lives in the Claude doc "Gibol Deep Sweep Audit 2026-10-01". Every claim below was verified against prod or code on 2026-10-01.

## Bottom line

1. **EPL scoring is broken at the source.** 50 EPL fixtures past kickoff (MW1–MW5), zero scored, every klasemen all-zeros, health endpoint red for ~40 days, football-backfill cron green every 2 h the whole time.
   Root cause: `scripts/backfill-fixtures-football.mjs:315` does `comp.espnRounds[event.season.slug]`; EPL registry (`:158`) only knows `'regular-season'`, ESPN eng.1 emits `'2026-27-english-premier-league'`. Every event skipped, exit 0. Side effect: kickoff times still the July seed (all MD6 at 21:00 WIB; ESPN has ARS v LEE 18:30 WIB, TOT v MAN 23:30 WIB) so locks are wrong by up to 2.5 h.
   Fix (S, today): accept any season.slug for league-shape comps; `workflow_dispatch` catch-up without `--skip-if-idle`; verify step that fails the job on 0 mapped events; `health-watch.yml` every 30 min failing on `scoring.ok=false`; paginate the idle check past `limit=1000`; EN lock label `d`/`h` (currently `9h 9j`).
2. **The 4a invite loop never enrols anyone.** `/g/:code → /pick → confirm` never calls `joinGrup`; no 4a screen calls `mergeGuest`/`claimGuestPredictions` (callers only in legacy `GrupJoin.jsx` and unrouted `PredictingHub.jsx`). Guests are never claimed, logged-in users never joined. The grup graph cannot grow.
3. **Six weeks of no commits; calendar moved on.** Liga 1 (since Sep 4), NBA 2026-27 (Oct 20), Mandalika (Oct 11) all unseeded; R4 and R5 not started; GitHub auto-disables scheduled workflows ~Oct 17 (60 days without a push).

Secondary: four Supabase RLS holes (join any league, forge `points_cache`, insert prediction after lock, call scoring/badge RPCs directly); `vercel.json` global `Cache-Control: public, max-age=0, must-revalidate` overrides every API `s-maxage` (verified: `x-vercel-cache: MISS`); entry bundle 230 KB gzip (Sentry, PostHog, Supabase, legacy Home eager); legacy masthead renders on `/grup` (regex `^\/grup\/` misses bare path, `App.jsx:271`); `SportFooter` renders under every 4a screen.

## Plan vs shipped (as of Oct 1)

| Release | Shipped | Missing | Slip |
|---|---|---|---|
| R0 recovery | crons, health, CI gate | alert sink; EPL path broken | exit criterion false |
| R1 4a foundation | tokens, primitives, skins, guard | — | on time |
| R2 six surfaces | all routes + edge OG | exit gate never measured | 49 days |
| R3 EPL launch | root flip Aug 15 | launch push; scoring broken; never v0.90 | non-functional |
| R4 Liga 1 + split | desktop only | Liga 1 seed, skor.gibol.co, Kabar v1, trust pages | 27 days |
| R5 money + nightly | nothing | billing, sponsor pool, NBA nightly, Mandalika | 23 days |
| M1 Gugur | shipped Aug 18 | exit gate blocked by scoring | — |
| M2 Papan Nasional, M3 Tantang 1v1, M4 Streak | nothing | all | 27 days |
| D-1 Nyaris, D-3 Babak Baru, D-4 Komandan, D-5 Streak Nasional, D-6 Tebak 6 | nothing | all | — |

## Journey / UX / IA
- 3 taps to a locked pick with no login wall works. But: no join on confirm, no claim on login, no next-fixture chaining (~40 taps per matchweek), no "already member" state, invite code dropped on no-fixture fallback (`InviteLanding.jsx:122-127`).
- Commissioner: create-grup is the legacy navy form at `/pickem/grup/new`; no rules UI, no member management, no pending-approval UI (server side exists), paywall moment shows "Berhasil masuk".
- Auth: magic link only; `next` defaults to `/bracket`; every first login detours to favourites picker; no logout on Pick'em surfaces; `NicknameNudge4a.jsx:70` writes Supabase directly.
- IA: 4 surfaces linked from the shell live outside it (`/login`, `/onboarding/teams`, `/pickem/grup/new`, `/pickem/profile`); TabBar Main → `/main` not `/`; Kabar disabled with no explanation; `SportFooter` is the only path to hubs.
- Skor: correct concept (pick status on live tiles) but reads only the Pick'em fixtures table.
- Desktop: PickSheet gets a 232 px rail offset with no rail; GrupHome/GrupList lack `g4-has-rail`. PWA: legacy manifest shortcuts, navy theme_color, SW skipWaiting with no reload toast, `promptInstall` never called.
- Visual: hand-rolled cards on Main/GrupHome/SkorTab; `--g4-ink` used directly in 4 places (invisible in Edisi Malam); `AVATAR_COLORS` copied 4×.
- Trust: no scoring-rules page, no "kenapa gratis"; anti-judi text only in `Terms.jsx`, reachable only via the leaked footer.

## Code efficiency
Entry 746 KB / 230 KB gzip: `observability.js:22-23` static Sentry+PostHog; `lib/supabase.js:46` module-eval client via TopBar; `Home.jsx` eager (`App.jsx:23`). PickSheet loads 4×500 fixtures to find one (`PickSheet.jsx:93-103`); SkorTab polls 500×N every 60 s with no visibility pause; `pickem/api.js` has no cache/dedupe; 1 Hz `setNow` at shell level. 29/46 hooks own a `setInterval`, none pause. Seam rule broken in 4 screens. Duplicates: 3 bracket stacks, 2 leaderboards, 2 primitive kits, 20 date helpers, `tx()` ×12. Tests: 5 files, scoring core only, zero UI tests, eslint not installed. Unused deps: tailwind, postcss, autoprefixer, sentry-vite-plugin. `version.js` 8,452 lines of comments. `<html lang="id">` with EN default.

## API / data / security
Functions: 8 Node (`approve, auth/callback, cron/nba-close-game-scan, derby, health/data-sources, news, pickem, proxy`) + 5 edge. Four slots free → `api/billing.js` can ship as a file. Dispatcher is solid; gaps: `league-detail?id=` leaks `invite_code`; admin token compare not timing-safe; no rate limit; `merge-guest` 100 sequential service-role upserts.
RLS: `league_members_insert` (0018:91) no invite check; `league_members_update` (0018:96) no column restriction; `predictions_owner_insert` (0015:109) no lock check; `pickem_score_*`, `pickem_update_streak`, `pickem_award_badges` executable by anon/authenticated. `voterHash` UA-rotatable with insecure fallback; `derby.js` GET cached publicly with per-voter data; `proxy.js` forwards paid keys for any path/method; `auth/callback` allows `//` redirect. Migrations 0001 and 0012 missing from repo.
Pipeline: ESPN non-200 → warn+continue, exit 0; `nba-fixtures-backfill` postseason-only; scanner disabled (custom UA → ESPN 403; football script sends none); content-cron needs rotated Anthropic key. Missing indexes: `fixtures(league,kickoff_at)`, `fixtures(league,lock_at)`, `predictions(league,matchday)`, `predictions(fixture_id,picked_outcome)`. No server-side Sentry; nothing polls health.

## Calendar / risks
Liga 1 running, unseeded. Mandalika Oct 11: skin only. NBA Oct 20: postseason script, scanner off. Actions 60-day disable ~Oct 17. AFF finals never seeded.

## Plan
**To Oct 15:** (1) slug fix + catch-up; (2) verify step + health-watch; (3) join-on-confirm + claim-on-login + guest CTA; (4) RLS migration 0021 + invite_code strip + timingSafeEqual; (5) scope Cache-Control to HTML + 4 indexes; (6) seed Liga 1 (ESPN idn.1); (7) chrome fixes (`^\/grup$`, footer gate, Main→`/`, EN lock label); (8) commit this week (resets Actions clock) + README/package.json/CLAUDE.md; (9) Mandalika go/no-go Oct 7 (ops-entry pilot or Sepang Oct 25); (10) FGD on MD7–8 Oct 17–18.
**To mid-Nov:** (11) NBA nightly + scanner UA fix; (12) 4a create-grup/settings/approvals + 4a login/profile/logout; (13) PickSheet chaining + get-fixture action + SWR cache + visibility pause; (14) M2 Papan Nasional + M4 Streak + D-1 Nyaris; (15) rules + "kenapa gratis" page + share buttons; (16) entry bundle diet + Countdown leaf + seam lint; (17) hubs to 2026-27 + /beranda ESPN via proxy; (18) Anthropic key + Kabar digest or hide tab; (19) desktop/PWA fixes; (20) HANDOVER rewrite + archive clutter + CHANGELOG.
**To end Jan:** (21) billing.js when KYB closes, manual rail productised now; (22) M5 sponsor pool + Gibol Cup demo + D-9 one-pager; (23) M3 + M7; (24) server Sentry + cron_runs + baseline schema + `supabase db push`; (25) IBL/Proliga config rows if the grammar proved out; (26) delete legacy Pick'em + navy screens, one styling model; (27) defer skor subdomain, Melayu, BWF.

## Stale docs
CLAUDE.md 12/12 → 8/12 Node; HANDOVER/FGD-RUNBOOK "scoring autonomous" / "root still scores site"; README is still the Polymarket dashboard; package.json 0.5.7; project CLAUDE.md says content engine blocked on dry-run (passed Jun 2; real blocker is key); `nba-close-game-scan.js` "vercel.json crons"; hub SEASON consts 2025-26; `Derby.jsx:612` "Prediksi gue".

## Open with Ade
Midtrans KYB; API-Football renewal; FGD measurement; Anthropic key rotation; distribution push; confirm `~/gibol-workspace` has no unpushed commits newer than Aug 18.

## Evidence
`/api/health/data-sources`; `/api/pickem?_action=list-fixtures&league=EPL-2026-27&limit=500`; `curl -I` same URL; ESPN `eng.1/scoreboard?dates=20260822` and `20261010`; GitHub Actions page (runs #819/#512/#775 success); local `npm ci && npm run build` (115 tests, 131 chunks); headless screenshots 390/1440 of `/`, `/grup`, `/skor`, `/g/FgdGibol`, `/beranda`, `/premier-league-2025-26`, `/login`.
