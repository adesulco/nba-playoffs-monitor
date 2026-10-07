# Gibol — where prod is right now

**Living document. Update it at the end of every sprint.** Plan of record: `docs/pickem-flagship/17-PLATFORM-RESET-2026-10-01.md`. Contract: `02-PLATFORM-CONTRACT.md`. History: `docs/archive/HANDOVER-2026-08-18.md`.

Last updated: **2026-10-01** · live version **v0.89.14** · branch `main` · **S0–S3 shipped in one day** (0022 apply pending)

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
| 8 | A push deploys once, via the Vercel git integration (`deploy.yml` only runs tests: its `VERCEL_TOKEN` secret is empty, so the deploy step is skipped). Propagation takes 2–4 min, and for a short window an edge can serve HTML that references a bundle it has not got yet; a browser that hits that window keeps the 404 until a hard reload. | Wait 3 min after a push before verifying, then check the index bundle for the version string; reload twice for the SW handoff. |
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

## 2b · Launch readiness (checked 2026-10-02)

gibol.co serves the loop in prod today. It is **not ready for a public push** until these are closed — all are dashboard actions, about an hour in total:

| # | Blocker | Evidence | Fix |
|---|---|---|---|
| 1 | RLS holes | 0022 + 0023 **applied 2026-10-07** (12/12 + formats-gone checks true, `rls-attack` held, `verify-loop` 19/19, parity 56/56). Same day the Supabase Advisor flagged the three leaderboard views as SECURITY DEFINER: anon could read every grup's roster and points. `rls-attack` now checks them (6 holes) | Apply `0024_leaderboard_views_close.sql`, then `node scripts/rls-attack.mjs` must print "RLS posture holds" |
| 2 | Auth email capped at **2 per hour** for the whole project | Auth → Rate Limits: `RATE_LIMIT_EMAIL_SENT = 2`, locked; Auth → Emails: custom SMTP off | Resend runbook in §2c, then raise the email limit |
| 3 | ~~Redirect allowlist lists exact URLs only~~ **closed 2026-10-02** | Auth → URL Configuration now has `https://www.gibol.co/auth/callback**` (6 URLs). Apex and http both 308 to `https://www.gibol.co`, so every magic link's `next=` is covered | — |
| 4 | Outstanding Supabase invoice | Ade paid on 2026-10-07; at 12:00 WIB the dashboard still showed both "Outstanding invoices" banners (this org and another org) | Confirm the banner clears; if not, check Org → Billing → Invoices for a second unpaid one |

Then one real-phone run: open `gibol.co/g/FgdGibol` signed out → pick → "Klaim pick & gabung" → magic link from the inbox → land on the grup with the pick claimed and a klasemen row. Ten minutes.

**Not blocking launch:** Liga 1 (ESPN has not published 2026/27), billing (free grups cover up to 10 members), API-Football (lapsed; nothing scores on it — it is the only red provider in `/api/health/data-sources`), content engine, Mandalika.

**Calendar:** close 1–4 + the phone run by Oct 7 → public push for MD6 (first lock Sat Oct 10, 18:30 WIB) → FGD on MD7–8 (Oct 17–18) as the first measured read.

**Re-checked 2026-10-07:** `rls-attack` still 15 holes and `leagues.formats` still present (0022/0023 not applied); no Resend DNS records on `send.gibol.co` / `resend._domainkey` yet (SMTP not started); invoice unknown from here. `verify-loop` passes, every workflow green for days, content cron now generates and commits NBA recaps (Anthropic key confirmed valid), MD6 (10 fixtures, first lock Oct 10 11:30 UTC) and MD7 seeded. ESPN `idn.1` still on the 2025-26 calendar.

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

## 3 · Open

- **S1 step 1 shipped (2026-10-01):** `0021_scoring_v1.sql` applied in prod via the SQL editor (the editor's "Potential issue detected" dialog must be confirmed, or nothing runs — that swallowed the first attempt). Probed after apply: EPL rules 5/3/2/1, history rows 8/5/3, tiers backfilled, `p_*` and `grup_bonus_points` gone, M8 badges, `streaks.kind`. All 50 EPL finals re-scored through the admin `score-fixture` action on the new engine (0 predictions exist yet). Ladder checked by hand on ARS 3-0 COV, FUL 1-1 MAN, MNC 5-3 SUN via the prod functions: exact 5 / margin 3 / result 2 / nyaris 1 / miss 0, jagoan+underdog 15/9/6/1/0.
- **S1 shipped as v0.87.0 (2026-10-01):** scoring parity (56 vectors, SQL = JS in prod), dispatcher hardening, join-on-confirm, claim-on-login, per-grup Gugur, provisional points. Verified in prod by `node scripts/verify-loop.mjs` (19 checks with a throwaway user, all pass) and in the browser at 390 px: guest pick from `/g/FgdGibol` stores the pick + invite, GrupHome shows the claim CTA. The real magic-link login step is the only part not driven here (needs an inbox); the API half of that step is what verify-loop exercises.
- **Waiting on apply:** `supabase/migrations/0022_rls_close.sql` (confirm the editor's destructive-statement dialog). `node scripts/rls-attack.mjs` reports 15 holes against prod today and must exit 0 after apply.
- Supabase dashboard shows an **outstanding invoice** banner (service-disruption warning). Pay before MD6.

- **S1 Truth (Oct 4–10, before MD6 on Oct 10 18:30 WIB):** migrations `0021_scoring_v1.sql` and `0022_rls_close.sql` (Ade applies in the SQL editor), scoring parity vectors, `predict.js` writes `matchday` + `last_predicted_at`, join-on-confirm + claim-on-login + guest CTA, copy changes, `useProvisionalPoints` rendered. EPL MW1–5 were scored under the old 8/5/3 rules; S1 re-scores EPL once via the admin `score` action (allowed: no user has seen EPL points).
- `Content Engine - Cron` **fixed 2026-10-02**: every run died in the budget guard (`TODAY` passed as an argument, not an env var), not on the key. Dispatched `nba-recaps` run is green (spend read, 0 articles in the NBA offseason). Key confirmed valid: scheduled runs since 2026-10-03 generate and commit NBA recaps.
- ~~`WC2026` / `AFF2026` in the backfill matrix~~ done: the matrix is the registry `activeFeeds` (EPL, Liga 1, NBA).

## 3b · Manual grant runbook (until billing lands, doc 17 S4)

A Season Pass or Lifetime order arrives through the `VITE_ORDER_URL` link. To grant it by hand:

```bash
curl -s -X POST 'https://www.gibol.co/api/pickem?_action=grant-entitlement' \
  -H "x-admin-token: $PICKEM_ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"user_id":"<auth user uuid>","product":"season_pass","competition":"EPL-2026-27","provider":"comp","provider_ref":"<order ref>"}'
```

Then the commissioner taps "Setujui" on the pending member in GrupHome. `product` is one of `season_pass`, `lifetime`, `gibol_plus`, `sponsor_pool`; `provider_ref` keeps re-grants idempotent.

## 3c · Still open after S3

- **Apply `supabase/migrations/0023_drop_formats.sql`** (the API stopped reading `formats` in v0.89.3). Same editor dialog as 0022.
- `api/billing.js` is live but key-gated: set `MIDTRANS_SERVER_KEY` (+ `MIDTRANS_ENV=production`) in Vercel when KYB closes and point Midtrans' notification URL at `https://www.gibol.co/api/billing/webhook`; until then the upgrade sheet uses `VITE_ORDER_URL`.
- `content-cron.yml` fails every scheduled run (Anthropic key) and carries pre-existing shellcheck warnings; disable or rotate.
- Liga 1 fixtures appear automatically once ESPN publishes `idn.1` 2026/27; until then the row shows no fixtures (window opens Oct 15 — move `window.opensAt` if ESPN is late).
- Share-card CTR: `pickem_share` events now flow to PostHog; the WPP weekly read needs the GA4 funnel exported.

## 4 · Decisions needed from Ade

1. Doc 17 §4 decisions 1–7 stand unless overridden (S1 builds on them).
2. `deploy.yml` has a dead Vercel deploy step (no token). Delete the step, or set the token if you want CI-gated deploys instead of the git integration.
3. Content-engine cron: disable now, or rotate the key this week.
