# Changelog

Ship notes from v0.86.0 onward. Older notes (v0.1.0 – v0.85.0) live as comments in `src/lib/version.js`; that file is frozen as history and only `APP_VERSION` changes there now.

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
