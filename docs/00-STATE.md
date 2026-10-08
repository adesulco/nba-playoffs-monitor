# Gibol — where prod is right now

**Living document. Update it at the end of every sprint.** Plan of record: `docs/pickem-flagship/17-PLATFORM-RESET-2026-10-01.md`. Contract: `02-PLATFORM-CONTRACT.md`. History: `docs/archive/HANDOVER-2026-08-18.md`.

Last updated: **2026-10-08** · live version **v0.89.18** · branch `main` (clean, pushed, tags to v0.89.18) · S0–S3 shipped; launch blocked on three dashboard actions (§0)

## 0 · Status and next (2026-10-08, clean stop)

**Where it stands.** gibol.co runs the Pick'em loop in prod on Scoring Spec v1. Checked at the stop: `verify-loop` 19/19, `verify-gugur` 14/14, `check-api-columns` 70/70, scoring parity 56/56, health `scoring.ok: true`, 135 unit tests, every workflow green. Prod has 1 real account and 2 grups, so nothing has been measured yet. EPL MD6 (10 fixtures) locks **Sat Oct 10, 18:30 WIB**; MD7 is seeded.

**Blocking the public push (all Ade, dashboard only):**

| # | Action | Why | Done when |
|---|---|---|---|
| 1 | Paste `supabase/migrations/0024_leaderboard_views_close.sql` into the SQL editor, Run, confirm the "Potential issue detected" dialog | anon can read every grup's roster and points through the three leaderboard views (Supabase Advisor: 3 critical) | `node scripts/rls-attack.mjs` prints "RLS posture holds" (6 holes today) |
| 2 | Resend SMTP per §2c (account, 3 GoDaddy DNS records, API key into Supabase SMTP, raise the email limit) | auth email is capped at 2/hour for the whole site | a magic link from `/masuk` arrives from `masuk@gibol.co`; `dig +short MX send.gibol.co` answers |
| 3 | Clear the Supabase "Outstanding invoices" banner | service-disruption warning; one banner still showed on 2026-10-07 after Ade paid | banner gone |
| 4 | Phone run: `gibol.co/g/FgdGibol` signed out → pick → "Klaim pick & gabung" → magic link → grup | the only loop step no script can drive (needs an inbox) | pick claimed, klasemen row present |

**Next for development, in order:**

1. **After 0024 lands:** run `rls-attack`, `verify-loop`, `verify-gugur`, `check-api-columns`; confirm the Advisor shows 0 issues.
2. **After Resend:** send a real magic link, then the phone run; record both here.
3. **MD6 (Oct 10–11):** doc 17 S1 exit "MD6 scored by Spec v1 within 2 h of the final whistle". Watch the `Football fixtures backfill + score` runs and `/api/health/data-sources`; spot-check a grup's klasemen.
4. **Monday Oct 13, 08:00 WIB:** first scheduled `KPI weekly` run (Actions summary) — the WPP baseline for the push.
5. **FGD on MD7–8 (Oct 17–18):** first measured read; `scripts/kpi-weekly.mjs --days 14` plus the PostHog funnel (`pickem_invite_open → pickem_first_pick → pickem_grup_join`, `pickem_share`).
6. **Liga 1:** appears automatically once ESPN `idn.1` publishes 2026/27 (still on 2025-26 as of Oct 7). If ESPN is still empty by Oct 15, decide on another source or move `window.opensAt` in `src/pickem/competitions.js`.
7. **S4 billing:** when Midtrans KYB closes, set `MIDTRANS_SERVER_KEY` (+ `MIDTRANS_ENV=production`) in Vercel and point the notification URL at `https://www.gibol.co/api/billing/webhook`; then wire `pickem_upgrade_success`. Until then: §3b grant runbook.
8. **Not built, needs a product call:** Mandalika/MotoGP podium pick (go/no-go was due Oct 7; no-go means Sepang Oct 25 is first), rollover between competitions (`pickem_rollover_accept` has no screen).

**Unverified by design:** the "Ikut Gugur di grup ini juga" button (v0.89.15) only appears for a signed-in player whose matchday pick came from another grup; the server path behind it is covered by `verify-gugur`, the screen state was not reproduced.

**Session gotchas learned 2026-10-07:** the version string now lives in a lazy `assets/version-*.js` chunk, not the index bundle (grep the chunk named in the index). A select naming a missing column makes handlers return empty data with no error; run `check-api-columns` after every migration.

## 1 · Read this before you touch anything

| # | Thing that bites | What to do |
|---|---|---|
| 1 | `~/Documents/Claude.nosync/` is iCloud-evicted; git hangs there. | Work only in `~/gibol-workspace/nba-playoffs-monitor`. |
| 2 | Vite dev does not run `api/`. | `DEV_API_PROXY=https://www.gibol.co npm run dev` (read-only in practice). |
| 3 | Function budget 8/12 Node, edge exempt. | Prefer `?_action=` on `api/pickem.js`; a new Node file is allowed with a reason. |
| 4 | Edge functions return 200 with an empty body on throw. | Verify with `curl`, check `%{size_download}`. |
| 5 | Invite codes are case-sensitive. | Never upper-case them. |
| 6 | Desktop is CSS-only (`src/styles/desktop-4a.css`). | Verify shell changes at 390 px and 1440 px. |
| 7 | `actionlint` before pushing any workflow change. | Installed via Homebrew on the Mac (1.7.12). |
| 8 | A push deploys once, via the Vercel git integration (`deploy.yml` only runs tests: its `VERCEL_TOKEN` secret is empty, so the deploy step is skipped). Propagation takes 2–4 min, and for a short window an edge can serve HTML that references a bundle it has not got yet; a browser that hits that window keeps the 404 until a hard reload. | Wait 3 min after a push, then grep the `assets/version-*.js` chunk the index bundle names for the version string (it is no longer in the index bundle itself); reload twice for the SW handoff. |
| 9 | `npx vercel` token on this Mac is expired. | `vercel login` before `vercel inspect`; curl the bundle for the version meanwhile. |

## 2 · What S0 verified in prod (2026-10-01)

| Check | Result |
|---|---|
| `list-fixtures&league=EPL-2026-27` finals | **50** (was 0) — MW1–MW5 scored by `pickem_score_fixture` in the catch-up run |
| `/api/health/data-sources` `.scoring` | `ok: true`, EPL `state: "ok"`, `staleFixtures: 0` (was red for 40 days) |
| MD6 kickoffs | follow ESPN: ARS v LEE 11:30Z, TOT v MAN 16:30Z, CRY/HUL/LIV on Oct 11; `lock_at` moved with them (7 drifts in all) |
| Catch-up run | 59 matched, 0 skipped, 0 unknown team; verify step passed |
| `health-watch.yml` | on the 30-min schedule; first scheduled run due within 30 min of the push |
| Cache-Control | **no change needed**: function headers are honoured (`list-fixtures` is an edge HIT, health returns its own `s-maxage`). The audit measured with `curl -I`; the dispatcher answers HEAD with 405. |
| Live bundle | contains `0.86.0`; `/`, `/skor` verified at 390 px: no legacy masthead, lock reads `9d 5h`, finals with draws render |
| `/grup` | verified at 390 px and 1440 px after the SW handoff: 4a header + TabBar only, no legacy masthead, no `SportFooter`, left rail on desktop |

**Scored predictions: 0.** The RPC scored 50 fixtures but no user has a server-side prediction on EPL yet — the FGD grup has one member (Bang Ade, 0 pts) because the 4a loop never claimed guest picks or joined anyone (audit finding 2). The doc 17 S0 exit check "FgdGibol klasemen non-zero" therefore cannot be met by S0; it is met the moment S1 ships join-on-confirm and claim-on-login and MD6 is scored.

## 2b · Launch readiness (detail; current summary in §0)

gibol.co serves the loop in prod today. It is **not ready for a public push** until these are closed — all are dashboard actions, about an hour in total:

| # | Blocker | Evidence | Fix |
|---|---|---|---|
| 1 | RLS holes | 0022 + 0023 **applied 2026-10-07** (12/12 + formats-gone checks true, `rls-attack` held, `verify-loop` 19/19, parity 56/56). Same day the Supabase Advisor flagged the three leaderboard views as SECURITY DEFINER: anon could read every grup's roster and points. `rls-attack` now checks them (6 holes) | Apply `0024_leaderboard_views_close.sql`, then `node scripts/rls-attack.mjs` must print "RLS posture holds" |
| 2 | Auth email capped at **2 per hour** for the whole project | Auth → Rate Limits: `RATE_LIMIT_EMAIL_SENT = 2`, locked; Auth → Emails: custom SMTP off | Resend runbook in §2c, then raise the email limit |
| 3 | ~~Redirect allowlist lists exact URLs only~~ **closed 2026-10-02** | Auth → URL Configuration now has `https://www.gibol.co/auth/callback**` (6 URLs). Apex and http both 308 to `https://www.gibol.co`, so every magic link's `next=` is covered | — |
| 4 | Outstanding Supabase invoice | Ade paid on 2026-10-07; at 12:00 WIB the dashboard still showed both "Outstanding invoices" banners (this org and another org) | Confirm the banner clears; if not, check Org → Billing → Invoices for a second unpaid one |

Then one real-phone run: open `gibol.co/g/FgdGibol` signed out → pick → "Klaim pick & gabung" → magic link from the inbox → land on the grup with the pick claimed and a klasemen row. Ten minutes.

**Not blocking launch:** Liga 1 (ESPN has not published 2026/27), billing (free grups cover up to 10 members), API-Football (lapsed; nothing scores on it — it is the only red provider in `/api/health/data-sources`), content engine, Mandalika.

**Calendar:** the Oct 7 target slipped; close 1, 2, 4 + the phone run before the MD6 lock (Sat Oct 10, 18:30 WIB) to push on MD6, else push on MD7 → FGD on MD7–8 (Oct 17–18) as the first measured read.

**Re-checked 2026-10-08:** 0022 + 0023 applied (2026-10-07); 0024 not applied (6 holes); no Resend DNS records; loop, Gugur, schema sweep and health all green.

## 2c · Custom SMTP runbook (Resend, chosen 2026-10-02)

DNS for gibol.co is at GoDaddy (`ns09/ns10.domaincontrol.com`). The root MX and SPF belong to Zoho Mail and stay untouched: Resend sends from the `send.gibol.co` subdomain for bounces/SPF and signs DKIM as `gibol.co`, which passes the existing `_dmarc` policy (`p=quarantine`, relaxed alignment).

1. **Resend:** sign up at resend.com → Domains → Add domain `gibol.co`, region **Tokyo (ap-northeast-1)** (closest to Indonesia).
2. **GoDaddy → DNS → gibol.co → Add record**, copying the exact values Resend shows (the DKIM key is unique per account):

   | Type | Name (GoDaddy "Host") | Value | Priority |
   |---|---|---|---|
   | TXT | `resend._domainkey` | `p=MIGfMA0…` (from Resend) | — |
   | MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` | 10 |
   | TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |

   Do **not** add a second `_dmarc` record or touch the root `@` MX/TXT rows.
3. Resend → Verify DNS records (GoDaddy usually propagates in 5–30 min). Check from a terminal: `dig +short TXT resend._domainkey.gibol.co` and `dig +short MX send.gibol.co`.
4. **Resend → API Keys → Create**, permission **Sending access**, domain `gibol.co`. Copy it once; it is the SMTP password.
5. **Supabase → Auth → Emails → SMTP Settings → Enable custom SMTP:**

   | Field | Value |
   |---|---|
   | Sender email | `masuk@gibol.co` |
   | Sender name | `Gibol` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | the Resend API key |
   | Minimum interval per user | 60 s (default) |

6. **Supabase → Auth → Rate Limits →** emails sent per hour: **100** (the field unlocks once SMTP is on; Resend's free tier is 100/day, 3,000/month, so move to Pro before a big push).
7. **Templates:** already done. "Magic link or OTP" carries a branded Indonesian template (subject "Link masuk ke Gibol 🏀"); leave it. `supabase/templates/magic_link.html` is a spare if "Confirm signup" needs one.
8. **Verify:** request a link at `https://www.gibol.co/masuk` to a real inbox. It must arrive from `masuk@gibol.co` within a minute, not in spam, and Resend → Emails must show it delivered. Then run the phone test below.

## 3 · Sprint log (2026-10-01)

| Sprint | Version | Verified by |
|---|---|---|
| S0 Rescue | v0.86.0 | 50 EPL finals scored, health ok, 390/1440 screenshots |
| S1 Truth | v0.87.0 | 0021 applied + EPL re-scored, 56 vectors SQL = JS, `verify-loop` 19/19, browser guest pick + invite stored |
| S2 Platform | v0.88.0 | registry gate, Liga 1 teams + NBA 81 fixtures seeded, scanner/NBA/football runs green, entry 98 KB gzip, 4a login/create/profile in prod |
| S3 Retention | v0.89.14 | `/papan`, `/aturan`, `/kabar` live; `leaderboard-national`; share cards; SW toast; manifest; hub aliases (v0.89.0 failed the vocab guard on Vercel, fixed in .1) |
| S1 exit gap closed | v0.89.15–17 (2026-10-07) | two-grup Gugur: shared pick now syncs every grup life, "Ikut Gugur di grup ini juga" CTA, board nicknames; `scripts/verify-gugur.mjs` 14/14 in prod (5 failed on v0.89.14). Funnel events restored: `pickem_grup_create/join`, `pickem_upgrade_view/start`, WA nudge as `pickem_share` |

## 3 · History notes

- `0021_scoring_v1.sql` applied 2026-10-01; EPL MW1–5 re-scored on Spec v1 (ladder hand-checked: exact 5 / margin 3 / result 2 / nyaris 1 / miss 0). `0022_rls_close.sql` + `0023_drop_formats.sql` applied 2026-10-07. The SQL editor's "Potential issue detected" dialog must be confirmed or nothing runs — that swallowed two earlier "applied" reports, so always probe after an apply.
- `Content Engine - Cron` fixed 2026-10-02 (budget guard passed `TODAY` as an argument); the Anthropic key is valid and NBA recaps commit on schedule.
- The backfill matrix is the registry `activeFeeds` (EPL, Liga 1, NBA).

## 3b · Manual grant runbook (until billing lands, doc 17 S4)

A Season Pass or Lifetime order arrives through the `VITE_ORDER_URL` link. To grant it by hand:

```bash
curl -s -X POST 'https://www.gibol.co/api/pickem?_action=grant-entitlement' \
  -H "x-admin-token: $PICKEM_ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"user_id":"<auth user uuid>","product":"season_pass","competition":"EPL-2026-27","provider":"comp","provider_ref":"<order ref>"}'
```

Then the commissioner taps "Setujui" on the pending member in GrupHome. `product` is one of `season_pass`, `lifetime`, `gibol_plus`, `sponsor_pool`; `provider_ref` keeps re-grants idempotent.

## 3c · Still open after S3

- `api/billing.js` is live but key-gated (see §0 next step 7).
- Liga 1 fixtures appear automatically once ESPN publishes `idn.1` 2026/27 (see §0 next step 6).
- Share-card CTR: `pickem_share` (cards, WA nudge) flows to PostHog; the DB half of the weekly read is `KPI weekly`.

## 4 · Decisions needed from Ade

1. Doc 17 §4 decisions 1–7 stand unless overridden.
2. `deploy.yml` has a dead Vercel deploy step (no token). Delete it, or set the token for CI-gated deploys.
3. Mandalika/MotoGP: go or no-go (was due Oct 7).
4. Liga 1 source if ESPN has not published 2026/27 by Oct 15 (API-Football renewal is the paid option).
