# CLAUDE.md — Gibol repo

Shared context for Claude Code, Cowork, and any other agent working here. Rewritten 2026-10-01 (S3, doc 17 §2.6). Four docs are the truth; everything else is history in `docs/archive/`.

> **Read in this order.** `docs/00-STATE.md` (where prod is right now, what is open, what needs Ade) → `docs/pickem-flagship/17-PLATFORM-RESET-2026-10-01.md` (plan of record, sprints S0–S4) → `docs/02-PLATFORM-CONTRACT.md` (Scoring Spec v1 + platform contract) → `docs/01-PRODUCT.md` (what we build and refuse) → `docs/03-DESIGN.md` (Sistem 4a). Where anything here conflicts with doc 17, doc 17 wins.

## What this repo is

The Gibol web app at `www.gibol.co`: an Indonesian multi-sport Pick'em (Vite + React 18 SPA, Vercel functions under `api/`, Supabase Postgres, GitHub Actions crons). The sport hubs stay at their URLs as SEO assets. `packages/content-engine/` (Python, Kabar articles) is paused pending an Anthropic key rotation; its status is `packages/content-engine/STATUS.md`.

## Stack

- **Frontend:** Vite + React 18, inline styles + `src/styles/tokens-4a.css` / `desktop-4a.css`. Not Next.js.
- **Deploy:** Vercel project `nba-playoffs-monitor` (team `adesulcos-projects`), git integration deploys every push to `main` (`deploy.yml` only runs tests). Propagation takes 2–4 min; verify with `curl`, never with build success.
- **Functions:** `api/` — budget **8/12 Node, edge functions exempt**. Prefer `?_action=` cases on `api/pickem.js`; a new Node file needs a reason (`api/billing.js` is the earmarked one).
- **Data:** Supabase project `egzacjfbmgbcwhtvqixc` (Postgres 17). Migrations in `supabase/migrations/`, applied by Ade in the SQL editor (confirm the "Potential issue detected" dialog or nothing runs). After an apply, probe PostgREST for a new column before trusting it. Local PG16 (Homebrew) + `supabase/tests/*.test.sql` is how migrations are tested first.
- **Feeds:** ESPN public scoreboard (football + NBA) through the scripts and `/api/proxy`. No odds feeds, ever.
- **Jobs:** `football-backfill.yml` (every 2 h, matrix from the registry, scores via `pickem_score_fixture`), `nba-fixtures-backfill.yml` (every 6 h), `push-scanner.yml` (NBA months), `health-watch.yml` (every 30 min, fails on red scoring). `actionlint` before pushing any workflow change.

## Non-negotiables

1. **Copy:** kamu/-mu register, EN key + ID key, named mechanics keep their names (Tebak Skor, jagoan, colek, Nyaris, Gugur). Never betting or money vocabulary. `npm run build` runs the vocab guard.
2. **One scoring truth:** `0021_scoring_v1.sql` writes points; `api/_lib/pickem/scoring-core.js` must match it on `scoring-vectors.json` (`npm test` + `node scripts/test-scoring-parity.mjs`).
3. **One registry:** `src/pickem/competitions.js`; `npm run registry` regenerates the JSON; the build fails on drift. Adding a sport = one row (+ a feed adapter if the provider is new).
4. **Seam:** screens call only `src/pickem/api.js`. No Supabase calls from screens (auth included: `sendMagicLink`, `signOut` live in the seam).
5. **Security posture:** `0022_rls_close.sql` + `0024_leaderboard_views_close.sql` (leaderboard views are server-only); `node scripts/rls-attack.mjs` must exit 0 against prod. Admin actions take `x-admin-token` only.
6. **Fonts:** self-hosted Bricolage Grotesque + Instrument Sans, static weights; run `scripts/test-satori-fonts.mjs` after any font change.
7. **Invite codes are case-sensitive.**
8. **Desktop is CSS-only**; verify every shell change at 390 px and 1440 px.
9. **Edge functions return 200 with an empty body on a throw** — check `%{size_download}`.
10. **Versioning:** bump `APP_VERSION` in `src/lib/version.js` and `package.json` together; ship notes go to `CHANGELOG.md` (`version.js` is frozen history).
11. **Prod verification after every loop change:** `node scripts/verify-loop.mjs` (throwaway user, cleans up after itself).

## Commands

```bash
npm install
DEV_API_PROXY=https://www.gibol.co npm run dev    # Vite does not run api/; proxy to prod (read-only in practice)
npm test                                           # Vitest (scoring vectors, primitives, provisional points)
npm run build                                      # tests + registry gate + vocab guard + vite + prerender
node scripts/test-scoring-parity.mjs               # SQL = JS on the shared vectors (prod, read-only)
node scripts/rls-attack.mjs                        # must print "RLS posture holds"
node scripts/verify-loop.mjs                       # the loop in prod, end to end
node scripts/verify-gugur.mjs                      # two-grup Gugur in prod (shared pick, per-grup lives)
node scripts/check-api-columns.mjs                 # every API select vs the prod schema; run after each migration
node scripts/kpi-weekly.mjs                        # WPP / WAP / picks / sign-ups, last 7 days vs previous
node scripts/backfill-fixtures-football.mjs --competition EPL-2026-27 --dry-run
```

## Working with Ade

Owner, technically sharp; direct and concise; Bahasa–English code-switching is normal. Prose for analysis, bullets for actions. Disagree once with reasoning. Confirm in chat before destructive operations (migrations, deletions, prod deploys outside the normal push). Report with curl output, not build logs. Update `docs/00-STATE.md` at the end of every sprint: version live, what the checks returned, what is open, what needs a decision.

## Definition of done

Merged with green tests, verified in prod with `curl` (and a 390 px screenshot for shell changes), ship note in `CHANGELOG.md`, `docs/00-STATE.md` current.
