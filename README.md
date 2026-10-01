# Gibol — Pick'em untuk nongkrong bola

**[gibol.co](https://www.gibol.co)** is an Indonesian multi-sport Pick'em platform: invite your grup, pick the score (Tebak Skor), star one jagoan per matchweek, climb the klasemen. Free, no money vocabulary, no betting — gengsi only.

Live competitions: Premier League 2026-27. Next rows: Liga 1 2026-27, NBA 2026-27 (see `docs/pickem-flagship/17-PLATFORM-RESET-2026-10-01.md` §3).

## How it works

1. A commissioner creates a grup and shares `gibol.co/g/<code>` (case-sensitive invite code).
2. Anyone opens the link and locks a pick in three taps, no login wall. Guest picks live in `guestStore` and are claimed on first login.
3. Fixtures lock at kickoff. A GitHub Actions cron pulls results from ESPN every two hours and scores them in Postgres (`pickem_score_fixture`).
4. Klasemen, streaks, Gugur (survivor) and share cards update from the same tables.

Scoring Spec v1 (doc 17 §1): exact score 5 · result + goal difference 3 · result 2 · Nyaris 1 · jagoan ★ ×2 · underdog ×1.5 when fewer than 30 % of pickers took that side at lock.

## Stack

| Layer | What |
|---|---|
| Frontend | Vite + React 18 SPA. 4a design system (`src/pickem/`, `src/styles/desktop-4a.css`), self-hosted Bricolage Grotesque + Instrument Sans. Mobile-first, desktop is CSS-only. |
| API | Vercel functions under `api/`. One Node dispatcher `api/pickem.js?_action=…` plus edge functions for share cards and crawler OG. Budget 8/12 Node, edge exempt. |
| Data | Supabase Postgres (`supabase/migrations/`, applied by hand in the SQL editor). RLS on every user table. |
| Feeds | ESPN public scoreboard (football + NBA). No odds feeds, ever. |
| Jobs | GitHub Actions: `football-backfill.yml` (every 2 h, scores), `health-watch.yml` (every 30 min, fails on red scoring), `deploy.yml` (tests + vocab guard). |
| Observability | `/api/health/data-sources` (feeds + scoring liveness), Sentry, PostHog (after consent). |

Screens consume only `src/pickem/api.js`. No direct Supabase calls from screens.

## Local development

```bash
npm install
DEV_API_PROXY=https://www.gibol.co npm run dev   # Vite does not run api/; proxy to prod (read-only in practice)
npm test                                          # Vitest
npm run build                                     # tests + vocab guard + vite build + prerender
```

Verify production with `curl`, never with build success. Edge functions return 200 with an empty body on throw — check `%{size_download}`.

```bash
curl -s https://www.gibol.co/api/health/data-sources | jq .scoring
curl -s 'https://www.gibol.co/api/pickem?_action=list-fixtures&league=EPL-2026-27&limit=500' | jq '[.fixtures[] | select(.status=="final")] | length'
```

## Repo map

- `src/pickem/` — the 4a Pick'em screens, primitives, skins, `api.js` seam
- `src/` (rest) — sport hubs (SEO assets at their canonical URLs), `/beranda` scores home
- `api/` — Vercel functions; `api/_lib/pickem/` holds the dispatcher actions and `scoring-core.js`
- `scripts/` — backfill + seed scripts, vocab guard, prerender, Satori font test
- `supabase/migrations/` — schema; `0021_scoring_v1.sql` brings Spec v1 (S1)
- `docs/` — `00-STATE.md` (where prod is), `pickem-flagship/17-…` (plan of record), `audits/`, `HANDOVER.md` (history)
- `packages/content-engine/` — Kabar content pipeline (Python, paused pending key rotation)

## Rules that bite

Copy is kamu/-mu register with EN and ID keys; named mechanics keep their names (Tebak Skor, jagoan, colek, Nyaris). `npm run build` runs the vocab guard. Run `actionlint` before pushing any workflow change. Run `scripts/test-satori-fonts.mjs` after any font change. Bump `APP_VERSION` in `src/lib/version.js` and `package.json` together and add a line to `CHANGELOG.md`.

See `CLAUDE.md` for the full operating rules.
