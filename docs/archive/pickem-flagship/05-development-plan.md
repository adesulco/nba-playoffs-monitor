# Pick'em Flagship — Development Plan (paste-ready for Claude Code)

**Date:** 2026-06-11 · Companions: `01-strategy.md` (business), `03-game-mechanics.md` (mechanics spec), `04-claude-code-design-prompt.md` (design pass, runs first/in parallel), **`06-gamification-audit.md` (gamification deltas — its §4 amends the tickets below and wins on conflict: adds R1-6/R1-7 lock-countdown + instrumentation, R2-7/R2-8 jagoan + completion ring, R2-9 Musuh Bersama by Jun 28, R4-5 trophy case; deletes confidence mode).**
**Calendar anchor — WC2026:** group stage Jun 11–27 · R32 starts ~Jun 28 · Final Jul 19. Everything in R1–R2 must land while the group stage is hot.

---

## 0. Context for Claude Code

You are executing the engineering side of the Pick'em inversion: gibol.co root = Pick'em product, live-score hubs = addon (move to `skor.gibol.co` only in R5, post-final). The design pass (`04-…`) covers screens/flows; this plan covers schema, API, scoring, billing, funnel, and migration. Where the two overlap, the design prompt owns UI decisions and this plan owns data/server decisions.

**Read first:** `docs/01-architecture.md`, `docs/00-current-state.md`, `src/lib/version.js` ship notes (recent), `pickem-flagship/03-game-mechanics.md`.

### Hard platform constraints (verified in repo)

1. **Vercel Hobby 12-function limit — currently 11/12.** Every new endpoint goes into the `api/pickem.js` dispatcher as a new `?_action=` case + handler in `api/_lib/pickem/`. Billing webhooks are the exception and will consume function slot #12 (`api/billing.js`, its own dispatcher for Stripe + Midtrans). **No other new top-level functions. If you think you need one, stop and ask.**
2. **DDL via Supabase SQL Editor only** (no Management API token in this env). Write migrations as files in `supabase/migrations/`; Ade applies them manually. Each migration must be idempotent (`if not exists` / `on conflict`) and ship with a verification query block in comments.
3. **Scoring cron = GitHub Actions** (`nba-fixtures-backfill.yml`, 6h cadence). Extend, don't replace. Live provisional points are client-side only — never persisted, never cron-dependent.
4. **Cowork sandbox can't commit** (`.git/index.lock`). All commits from Claude Code on the Mac. After each push: curl-verify the live bundle (`grep APP_VERSION`); stale alias → `npx vercel --prod --yes --force`.
5. RLS is on everywhere; `SUPABASE_SERVICE_ROLE_KEY` (server handlers) bypasses for data ops. Any new table ships with RLS policies in the same migration — learn from 0018 (recursion bug): policies on `league_members`-joined tables must not self-reference.

---

## 1. Workstreams → Releases map

| Release | Window | Theme | Workstreams |
|---|---|---|---|
| **R1** | Jun 11–17 (group stage, week 1) | Pool-first core | W1 onboarding · W2 scoring engine |
| **R2** | Jun 18–27 (group stage, week 2) | The moat mechanics | W2 (tebak skor, underdog, live provisional) · W3 entitlement gates (no payments yet) |
| **R3** | Jun 28–Jul 10 (R32→QF) | Money + funnel | W3 payments · W4 tools/SEO |
| **R4** | Jul 11–19 (SF→Final) | Retention & rollover | W4 WA artifacts · EPL pre-seed |
| **R5** | Jul 20–Aug (dead window) | Inversion Phase B | W5 skor.gibol.co migration |

Versioning: R1 = v0.80.0 (minor bump — new major surface), patches per ship within each release.

---

## 2. R1 — Pool-first core (Jun 11–17)

### Migration `0019_pool_scoring_and_entitlements.sql`

```sql
-- leagues: per-pool config (a grup IS a league)
alter table leagues add column if not exists scoring_config jsonb;
alter table leagues add column if not exists max_members int not null default 10;
alter table leagues add column if not exists tier text not null default 'free'
  check (tier in ('free','season','lifetime','sponsor'));  -- 'sponsor' future-proofs the R6 Sponsor Pool tier (08-teardown-deltas D1)
alter table leagues add column if not exists description text
  check (char_length(description) <= 2000);  -- rules/prizes box (08 D2; server-side banned-vocab guard in handlers)
alter table leagues add column if not exists late_join_policy text not null default 'median'
  check (late_join_policy in ('median','zero'));
alter table leagues add column if not exists formats text[] not null default '{match}';
  -- subset of {match, score, bracket, survivor}

-- predictions: tebak skor + consensus audit
alter table predictions add column if not exists predicted_home_score int
  check (predicted_home_score between 0 and 99);
alter table predictions add column if not exists predicted_away_score int
  check (predicted_away_score between 0 and 99);
alter table predictions add column if not exists consensus_at_lock numeric;
alter table predictions add column if not exists is_jagoan boolean not null default false;
  -- jagoan (captain ×2 / −25% on miss): one per user per league per matchday,
  -- enforced in predict.js + partial unique index; see 06-gamification-audit GAP-1

-- league_members: pending state for the cap paywall + manual entries
alter table league_members add column if not exists status text not null default 'active'
  check (status in ('active','pending','removed'));
alter table league_members add column if not exists managed_by uuid references auth.users(id);
  -- non-null = manual entry operated by the commissioner

-- entitlements (billing lands R3; table now so gates can be coded once)
create table if not exists entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  product text not null check (product in ('season_pass','lifetime','gibol_plus','sponsor_pool')),
  competition text,            -- null = all (lifetime)
  provider text,               -- stripe | midtrans | comp (manual grant)
  provider_ref text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,      -- null = perpetual
  created_at timestamptz not null default now()
);
-- RLS: owner-read; writes only via service role (no recursive policies)
```

`scoring_config` shape (document in the migration header, validate in handlers):

```json
{
  "group_position_pts": 4, "perfect_group_bonus": 8,
  "knockout_pts": {"r32":10,"r16":12,"qf":15,"sf":20,"final":30},
  "score_exact": 5, "score_result_margin": 3, "score_result": 2,
  "underdog_threshold": 0.30, "underdog_multiplier": 1.5,
  "streak_len": 3, "streak_bonus": 3
}
```

### Tickets

**R1-1 · Dispatcher actions for pool config** — `_action=update-league-settings` (commissioner-only: scoring_config, formats, late_join_policy; reject if any fixture in the competition is already locked for this league's formats), `_action=league-detail` (public read: leaderboard + members + config; powers `/g/:code` and `/grup/:id`). Extend `create-league.js` to accept `scoring_config` template at creation.
**R1-2 · Guest → member merge hardening** — invite landing flow per design Step 2. `guestStore.js` picks merge on first login: dedupe rule = server wins if fixture locked, guest wins if open. Add `_action=merge-guest` (batch upsert with lock validation server-side).
**R1-3 · Scoring engine reads `scoring_config`** — refactor `score-fixture.js` + `score-bracket.js`: resolve effective config = `league.scoring_config ?? pickem_rules` (per league, computed once per scoring run). Pure-function the point math into `api/_lib/pickem/scoring-core.js` with unit tests (Vitest, `npm test`): correct/incorrect, draw, walkover, boundary consensus = 0.30 exactly (no bonus — strict `<`).
**R1-4 · Consensus snapshot at lock** — in the cron path that locks fixtures, compute consensus per fixture per league (% of active members picking each side) and write `consensus_at_lock` on each prediction row. One UPDATE per fixture-league, not per row (SQL, not JS loop).
**R1-5 · Pending-member cap** — `join-league.js`: count active members ≥ `max_members` → insert as `status='pending'`, return `{pending:true}`; UI shows the upgrade sheet (design Step 5). `_action=approve-member` flips pending→active, only if under cap or tier ≠ free.

**R1 exit criteria:** create grup with template scoring → invite → guest picks → login merge → cron scores it with the custom config — all on prod, verified with a real test grup. Unit tests green in CI (add a `test` job to `deploy.yml`).

---

## 3. R2 — Moat mechanics (Jun 18–27)

**R2-1 · Tebak Skor** — `predict.js` accepts `predicted_home_score/away_score` when league formats include `score`; validation: both 0–99, fixture open. `scoring-core.js` adds the 5/3/2 ladder (exact / result+margin / result). UI per design Step 4 (steppers variant of FixtureCard).
**R2-2 · Underdog bonus** — already in scoring-core (R1-3); this ticket is the *surfacing*: leaderboard rows show `🎯 +5 underdog` chips on scored picks; pick screen shows "tebakan berani" framing post-pick. No pre-pick consensus for free users (anti-anchoring rule, `03` §B).
**R2-3 · Live provisional points** — client-only hook `useProvisionalPoints(leagueId)`: joins live fixture feed (existing 30s poll) × my predictions × effective scoring config → provisional delta per member. Renders on Leaderboard in live mode (amber, pulse, "sementara" label). Hard rule: zero new polling loops, zero DB writes, computation memoized per tick.
**R2-4 · Par-score late join** — on first pick by a member who joined after matchday 1 (and policy = median): one-time `base_points` = median of active members' total at join time, stored on `league_members.base_points` (add column in `0020`), shown as "+62 par" tooltip on the leaderboard. Cron-side, in `score.js` aggregation.
**R2-5 · Edit-history audit** — append-only `prediction_events` table (`0020`): `{prediction_id, actor, old_pick, new_pick, at}`; written in `predict.js` on update. Commissioner-only read via `league-detail`. Settles the "gue udah pilih Maroko" disputes.
**R2-6 · Entitlement gates (logic only, no checkout)** — `api/_lib/pickem/entitlements.js` helper: `hasEntitlement(userId, product, competition)`. Gate: >1 grup hosted, member #11 approval, multi-entry (cap 3 — `0020` adds `entry_no` to predictions/brackets unique keys), manual entries, pre-pick consensus (Gibol+). Manual grant path for testing: `_action=grant-entitlement` guarded by `PICKEM_ADMIN_TOKEN`.

**R2 exit criteria:** a grup playing tebak-skor + underdog + live provisional through a real WC matchday; gates enforced (verified by attempting member #11 + second grup on a free account). Knockout backfill re-run (`scripts/backfill-wc2026.mjs`) as groups resolve — owned by Ade, scheduled Jun 28.

---

## 4. R3 — Money + funnel (Jun 28–Jul 10)

**R3-1 · `api/billing.js`** (function #12 — the last slot): actions `create-checkout` (provider per currency: Stripe USD / Midtrans Snap IDR), `webhook-stripe`, `webhook-midtrans` (signature-verified; idempotent on `provider_ref`), `my-entitlements`. Webhooks write `entitlements` rows + flip `leagues.tier` for the purchased competition. Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MIDTRANS_SERVER_KEY` (Vercel only). **Dependency: Midtrans KYB (Ade — apply now; Stripe ships first if KYB lags.)**
**R3-2 · `/harga` + upgrade sheets** — design wireframe 7; checkout opens provider-hosted page (Stripe Checkout / Midtrans Snap) — we never touch card/QRIS data. Success → poll `my-entitlements` → unlock in place (the pending member auto-approves).
**R3-3 · Free tools** — `/tools/wc-predictor` (no-login bracket predictor; reuse `BracketTreeView` read-write local) + shareable static PNG via the recap-PNG pattern. Prerendered (add to `scripts/prerender.mjs` + sitemap), ID + EN copy. This is the PlayoffPickems funnel clone — each tool page CTA = "Bikin pool-nya beneran → /buat-grup".
**R3-4 · EN locale pass** — all new Pick'em strings double-keyed in `i18n.js`; `/en/` landing variant of the new home (prerendered) for the international market.

**R3 exit criteria:** real Rp/USD purchase end-to-end on prod (test mode then live); tools pages indexed (sitemap ping + IndexNow); refund/void path documented in `ops/billing-runbook.md` (write it).

---

## 5. R4 — Retention & rollover (Jul 11–19)

**R4-1 · WA artifacts** — matchday standings card PNG (`_action=standings-card` returning cached static PNG per league+matchday, generated in the cron after scoring); colek deep-links; auto recap line ("Budi nyalip lo…") on grup home.
**R4-2 · Push** — OneSignal (already wired): two notifications only — "picks lock in 2h & lo belum nebak" and "matchday scored, posisi lo berubah". Per-grup mute. No marketing pushes.
**R4-3 · Badges/streaks surfacing** — read-only render of 0017 tables on Profile + leaderboard chips. No new mechanics.
**R4-4 · EPL 2026–27 pre-seed** — seed EPL teams + fixtures (API-Football), register in `competitions.js` with `opens` = Aug window. The rollover prompt on WC final day: "Grup lo lanjut ke EPL? Satu tap." (creates sibling league, same members, pending re-confirm). **This is the WAP compounding moment — do not slip it.**

**R4 exit criteria:** WC final scored; ≥1 real grup rolled over to EPL; standings cards flowing in WA.

---

## 6. R5 — Inversion Phase B (Jul 20+, dead window)

1. Add `skor.gibol.co` to the Vercel project; host-based branch in the SPA shell (same bundle: if `host==skor.*` → hub router + hub home; else → Pick'em router). No second repo/deploy.
2. 301s on www for all hub paths (`vercel.json` redirects, path-preserving) — **only after** the host-based serving is verified on skor.
3. Split sitemaps (www = pick'em + tools; skor = hubs), update canonicals, OG URLs, `llms.txt`, GA4 host dimension, resubmit in Search Console (add skor property first).
4. Hub pages gain the "Tebak di Pick'em →" backlink CTA (one shared component).
5. Watch Search Console for 4 weeks; rollback plan = drop the 301s (serving stays dual-host).

---

## 7. Testing & verification protocol (every release)

1. **Unit:** `scoring-core.js` is the only money-math — exhaustive cases (see R1-3, R2-1); run in CI on every push.
2. **Integration (manual, scripted in `ops/pickem-smoke.md` — write it in R1):** create grup → invite → guest pick → merge → lock → score → leaderboard, against prod with a `TEST-` prefixed grup; clean up after.
3. **Live verify after every push:** version bump via curl; lazy chunks present in `dist/assets/`; `--force` fallback per known hazard.
4. **Perf:** Lighthouse mobile ≥85 perf / ≥95 a11y on `/`, `/g/:code`, `/main/:competition` (lighthouse.yml exists — add these routes).
5. **Data safety:** migrations are additive only (no drops/renames during the window); every migration has the verification query block; `entitlements` writes are idempotent.

## 8. Risk register

| Risk | Mitigation |
|---|---|
| Function limit hit (12/12 after billing) | Everything else into existing dispatchers; revisit Vercel Pro only if webhooks need isolation |
| Midtrans KYB slips past Jun 28 | Stripe-only R3 launch; IDR via "transfer + manual grant" stopgap (admin token path from R2-6) |
| WC knockout fixtures TBD-teams break predictions | Fixtures with TBD teams stay `visible=false` until backfill resolves them (existing pattern from group seeding) |
| Live provisional points diverge from cron truth | Label "sementara" everywhere; provisional is presentation-only; cron remains the only writer |
| RLS recursion regression (0018 déjà vu) | New policies reviewed against the 0018 pattern; integration smoke includes an anon-key read of `league-detail` |
| Scope creep into design pass | UI decisions belong to `04-…`; if a ticket here conflicts with a design decision, the design prompt wins and this doc gets a delta note |

## 9. Operating cadence for Claude Code

Work release by release, ticket by ticket, in order. Per ticket: implement → unit test → push → curl-verify → one-paragraph report (shipped / verified / next). Update `src/lib/version.js` ship notes per ship and `docs/00-current-state.md` per release. Never mark a release done while its exit criteria are unmet. If blocked > 30 minutes on anything (env, KYB, fixture data), say so in one sentence and move to the next unblocked ticket.
