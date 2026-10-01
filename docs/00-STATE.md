# Gibol — where prod is right now

**Living document. Update it at the end of every sprint.** Plan of record: `docs/pickem-flagship/17-PLATFORM-RESET-2026-10-01.md`. History: `docs/HANDOVER.md` (frozen 2026-08-18).

Last updated: **2026-10-01** · live version **v0.86.0** · branch `main` · **S0 Rescue shipped**

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
| 8 | Every push creates **two** prod deployments (Vercel git integration + `deploy.yml`). Bundle hashes differ per build, so the alias flips twice and for ~1 min an edge can serve HTML that references a bundle it has not got yet. A browser that hits that window keeps the 404 until a hard reload. | Wait 2 min after a push before verifying; reload twice. Consider deleting the deploy step in `deploy.yml` (keep tests). |
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

## 3 · Open

- **S1 step 1 done, waiting on apply:** `supabase/migrations/0021_scoring_v1.sql` is written, tested on a local PG16 against 0015–0020 (`supabase/tests/0021_scoring_v1.test.sql`, 60+ assertions), and safe to apply once v0.86.1 is live (it removes the API selects of the columns 0021 drops). After apply: run the verification block at the bottom of the file, then re-score EPL via the admin `score` action and check three fixtures by hand.

- **S1 Truth (Oct 4–10, before MD6 on Oct 10 18:30 WIB):** migrations `0021_scoring_v1.sql` and `0022_rls_close.sql` (Ade applies in the SQL editor), scoring parity vectors, `predict.js` writes `matchday` + `last_predicted_at`, join-on-confirm + claim-on-login + guest CTA, copy changes, `useProvisionalPoints` rendered. EPL MW1–5 were scored under the old 8/5/3 rules; S1 re-scores EPL once via the admin `score` action (allowed: no user has seen EPL points).
- `Content Engine - Cron` fails on every scheduled run (Anthropic key rotation pending). Noise in the Actions tab; disable it or rotate the key.
- `WC2026` and `AFF2026` are still in the backfill matrix; they idle-exit on schedule, so harmless, but drop them when Liga 1 is added in S2.

## 4 · Decisions needed from Ade

1. Doc 17 §4 decisions 1–7 stand unless overridden (S1 builds on them).
2. Keep or remove the CLI deploy step in `deploy.yml` (see §1 #8).
3. Content-engine cron: disable now, or rotate the key this week.
