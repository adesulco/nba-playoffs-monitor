# Changelog

Ship notes from v0.86.0 onward. Older notes (v0.1.0 – v0.85.0) live as comments in `src/lib/version.js`; that file is frozen as history and only `APP_VERSION` changes there now.

## v0.86.0 — 2026-10-01 — S0 Rescue

EPL had never scored. ESPN renamed the eng.1 `season.slug` and the football backfill skipped every event for 40 days while the cron exited green and the health alarm sat red with no reader.

- **Fix:** `scripts/backfill-fixtures-football.mjs` accepts any `season.slug` for league-shape competitions; draws on league fixtures are a result, not a "KO draw without shootout" skip.
- **Fix:** matched fixtures take ESPN's kickoff time and move `lock_at` with it (MD6 was seeded at 14:00Z for all ten games; ESPN has 11:30Z, 14:00Z and 16:30Z).
- **Fix:** rolling ESPN window reaches back to the earliest past non-final fixture (cap 120 days), so a run after an outage catches up by itself.
- **Hardening:** ESPN non-200 is a job failure (one retry), fixture reads paginate past 1000 rows, every run writes a JSON summary.
- **CI:** `football-backfill.yml` gains a verify step that fails when past non-final fixtures exist but zero source events matched. New `health-watch.yml` every 30 min fails on `scoring.ok == false` or any red competition.
- **Chrome:** bare `/grup` is a 4a route (no legacy masthead or bottom nav); `SportFooter` gated off 4a routes; TabBar Main goes to `/`; EN lock countdown reads `1d 2h` (ID keeps `1h 2j`).
- **Housekeeping:** README describes the Pick'em platform; `package.json` version matches `APP_VERSION`; CLAUDE.md function budget is 8/12 Node, edge exempt; docs 17/18 and the 2026-10-01 audit added; this file created.
- **Not changed:** `vercel.json` Cache-Control. Verified in prod that function-set `Cache-Control` headers are honoured (health returns its own `s-maxage`, list-fixtures is an edge HIT). The audit measured with `curl -I`; the dispatcher answers HEAD with 405.
