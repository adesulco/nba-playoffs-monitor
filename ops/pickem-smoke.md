# Pick'em flagship smoke run (A7 · run per release against PROD)

Create a `TEST-`-prefixed grup, walk the full loop, clean up after.
~10 minutes. Needs: a magic-link login + `PICKEM_ADMIN_TOKEN`.

## The loop

1. **Create grup** — `/pickem/grup` → Bikin grup, name `TEST-smoke-<date>`,
   competition = active one. Verify response carries `invite_code` and the
   creator appears as owner in `?_action=league-detail&id=<id>`.
2. **Custom scoring** — `updateLeagueSettings({ league_id, scoring_config:
   { score_exact: 7 } })` → expect ok. After ANY fixture in the competition
   locks, the same call must return **409** (rules freeze).
3. **Invite + guest pick** — open `/g/<invite_code>` in a private window.
   Standings visible with NO login (social proof). Pick tonight's match as
   guest (localStorage only). Count taps: **first confirmed pick must be
   ≤3 taps from landing.**
4. **Login + merge** — magic-link login in that window → `mergeGuest`
   fires; verify `{ merged: ≥1 }` and the pick shows in `list-predictions`.
5. **Cap paywall** — set the test grup `max_members=2` (SQL editor), join
   with a 3rd account → expect `{ pending: true }`, never an error.
   `approveMember` as commissioner → **402 + needs_upgrade**. Grant
   `season_pass` via `grant-entitlement` (admin token) → flip
   `leagues.tier='season'` → approve again → **ok**.
6. **Score** — `score-fixture` (admin token) on the picked fixture →
   verify `consensus_at_lock` filled on prediction rows, awarded points
   match a hand-computed scoring-core result, leaderboard moves.
7. **Instrumentation** — GA4 DebugView shows pickem_invite_open /
   first_pick / pick / grup_create / grup_join for the run.

## Cleanup

```sql
delete from league_members where league_id in (select id from leagues where name like 'TEST-smoke-%');
delete from leagues where name like 'TEST-smoke-%';
delete from entitlements where provider_ref like 'manual-%smoke%';
```

## Live-verify ritual (every push — known hazards)

- `curl` the live bundle → `grep APP_VERSION`; stale → `npx vercel --prod --yes --force`.
- Lazy-route code lives in `assets/<Screen>-*.js` chunks, NOT `index-*.js`.
- Anon-key read of `league-detail` must stay 200 (RLS-recursion canary, 0018 lesson).
