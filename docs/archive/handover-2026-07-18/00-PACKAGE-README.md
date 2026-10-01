# GIBOL HANDOVER PACKAGE · 2026-07-18 · v1.0 (frozen)

**This folder is the complete, reviewed, self-contained handover to Claude Code.** Canonical working copies live in `pickem-flagship/` and `nba-playoffs-monitor/design_handoff_gibol_redesign/`; this folder is the frozen snapshot of record for the kickoff. If this folder and `pickem-flagship/` ever diverge, the newer file in `pickem-flagship/` wins.

## Contents & read order

| # | File | Role |
|---|---|---|
| 1 | `14-HANDOVER-CLAUDE-CODE.md` | **Front door** — situation, authority chain, hard constraints, execution order |
| 2 | `design_handoff_gibol_redesign/` (README + `Gibol Redesign Concepts.dc.html`) | **UI/tokens/copy truth** — locked spec = `#t4` `#t5` `#t6`; turns 1–3 superseded. Also committed inside the repo at `nba-playoffs-monitor/design_handoff_gibol_redesign/` |
| 3 | `13-DEVELOPMENT-PLAN.md` | **Plan of record** — releases R0–R6, tickets, exit gates, risks |
| 4 | `11-PLATFORM-STRATEGY.md` | Strategy & calendar (multi-sport platform; AFF = Jul 24–Aug 26) |
| 5 | `09-HANDOVER-EPL-RECOVERY.md` | R0 recovery ticket specs ONLY (T0, S0-1…S0-7, S0-3b) — its §4/§9 are retired per its scope note |
| 6 | `2026-07-18-distance-to-launch-audit-and-plan.md` | Evidence base — state of build & prod, incident analysis |
| 7 | `10-DESIGN-RESEARCH-PLATFORM.md` · `12-REDESIGN-PROPOSAL.md` | Background (pre-4a; token/voice examples inside are superseded by the design bundle) |

## Final review log (what was checked, what was fixed)

- **Authority chain** coherent and acyclic: design bundle → 13 → 11 → 09(R0 only) → 06-gamification (mechanics math). Fixed: 09 now carries a scope note retiring its §4 Track B and §9 prompt.
- **Calendar** consistent across 11/13/14 and re-verified against sources: WC final Jul 19 · AFF Jul 24–Aug 26 · EPL MW1 + root flip Aug 15 · Liga 1 Sep 4 · Mandalika Oct 11 · NBA + billing Oct · badminton/Melayu Dec · IBL/Proliga config-row test Jan 2027.
- **Ticket continuity:** 09's S0-1…S0-7 map 1:1 into 13's R0-1…R0-7 (+S0-3b = R0-3b). No orphaned tickets.
- **Mechanics frozen:** ★ ×2 = existing jagoan everywhere (schema/scoring-core/tests untouched); prop picks (pencetak gol, pole, DNF…) parked to R6 in both 13 §0.6 and 14 §3.6.
- **Prod facts** verified live today: v0.80.3 = repo HEAD `4060d2e`; WC2026 72 fixtures unscored, zero KO fixtures; 12 function files counted (dashboard verify = R0-5); Polymarket strip clean in code.
- **Voice reconciliation (decided):** app/UI copy = the design's kamu/-mu register, no lo/gue, EN default locale + native-ID keys. **Kabar article bodies** remain governed by the content engine's own Bahasa-first voice rules (`packages/content-engine/prompts/voice-rules.md`) — two registers, one brand; UI chrome around articles follows the design.
- **⚠ Known stale file the builder must fix, not obey:** the repo's `CLAUDE.md` (May 28) still says "Bahasa-first UI, gue/lo OK", "11/12 functions", and lists Polymarket as a data feed. **T0 now includes updating it** (see kickoff prompt) so future sessions don't inherit contradictions.
- Open items owned by Ade (unchanged): Midtrans KYB status; confirm Vercel function count on the dashboard; the Jul-2 WIP decision lands in T0's report.

## Hard-constraint summary (full text in 14 §3)

Dispatcher-only endpoints until function budget verified · no Tailwind / new runtime deps / icon libs (inline SVG) · fonts self-hosted subsets only (Bricolage + Instrument, ≤80KB) · aliased token migration; hubs/cron/auth/scoring never share a commit with visual work · additive idempotent migrations, Ade applies · kamu-voice, never lo/gue, never betting vocabulary, in any locale · star = jagoan, schema frozen · curl-verify `APP_VERSION` after every push · version from v0.81.0.

---

## PASTE-READY KICKOFF PROMPT (the only one to use — supersedes 09 §7/§9 and 14 §5)

Copy everything below into Claude Code from `nba-playoffs-monitor/`:

```
Read ../handover-2026-07-18/00-PACKAGE-README.md — the frozen handover package — then its contents in the listed order: 14-HANDOVER-CLAUDE-CODE.md (front door), design_handoff_gibol_redesign/README.md plus locked sections #t4/#t5/#t6 of "Gibol Redesign Concepts.dc.html" (UI/tokens/copy truth; the HTML is a reference to recreate in our Vite+React codebase, not production code; turns 1–3 are superseded), 13-DEVELOPMENT-PLAN.md (plan of record, R0–R6), 11-PLATFORM-STRATEGY.md §2 (AFF runs Jul 24–Aug 26, not December), and 09-HANDOVER-EPL-RECOVERY.md §3 only (R0 recovery ticket specs; its §4 and §9 are retired). The design bundle is also committed in-repo at design_handoff_gibol_redesign/. If any read fails with "Resource deadlock avoided", files are iCloud-dataless: force-materialize (brctl download . or cat the tree to /dev/null) and retry.

Context in one line: prod is stalled at v0.80.3, the WC2026 Pick'em was never scored (final is Jul 19 — score it TODAY), AFF kicks off Jul 24, EPL + the root flip launch Aug 15, and the locked Sistem 4a redesign restyles the whole product on the unchanged engine (Vite/React/Supabase/dispatcher/feeds/satori).

Execute in order:

T0 — repo rescue: (a) git status + diff; the working copy has Jul-2 modifications (api/_lib/pickem/league-settings.js, league-detail.js, league-config.js) newer than origin/main — report in one paragraph what that WIP is, then commit or consciously discard; (b) commit ../pickem-flagship/, ../handover-2026-07-18/, and design_handoff_gibol_redesign/ into the repo; (c) UPDATE CLAUDE.md — it is stale and contradicts this package: fix "Bahasa-first / gue-lo" to the new voice rule (UI = kamu/-mu register EN-default+ID, no lo/gue; Kabar article bodies keep the content engine's Bahasa voice rules), fix the function count to the verified number, remove Polymarket from the data-feeds list, add the fonts amendment (self-hosted Bricolage/Instrument), and point "read this first" at ../handover-2026-07-18/00-PACKAGE-README.md.

R0 — recovery (per 09 §3): S0-1 WC backfill + score + insert the Jul-19 final via a workflow_dispatch action TODAY; S0-2 generic football backfill+score cron (NBA v0.79.11 pattern) — green 2 days gates R2; S0-3 EPL 2026/27 seed; S0-3b AFF 2026 seed re-pointing the WC tournament template (verify API-Football's AFF league id and two-legged SF/F handling on day 1; fallback = ops entry, only 26 matches); S0-4 wire the 105-test Vitest suite into deploy.yml; S0-5 verify the Vercel function count and consolidate og/recap if at 12/12 (frees the billing.js slot); S0-6 functional AFF→EPL rollover action + plain banner; S0-7 days-since-last-scored-fixture liveness alarm.

R1 — Sistem 4a foundation (parallel with R0): self-hosted Bricolage Grotesque + Instrument Sans subsets ≤80KB with share-card base64 copies; tokens-4a.css implementing the design README's color/type/shape tables with legacy-token aliases; the CSS GI/BOL logo block + tagline strings; the 6 primitives (MatchCard, PickChip with its 5 exact states, LeaderboardRow, LiveTile, KabarCard, LockBadge) on a flagged /dev/primitives QA route rendered in 3 sport skins × light and Edisi Malam; sportSkins.js per the README skin table; inline-SVG icon set (Phosphor-bold style — no icon dependency); auto dark theme 19:00–06:00 WIB with manual override; kamu-register copy migration with a lo/gue lint added to check-vocab.mjs.

R2 — the five surfaces, pixel-faithful to #t4, consuming only src/pickem/api.js, live-beta'd on AFF traffic: invite landing /g/:code (public, guest pick, join→auth→first pick) → pick sheet (progress bar, question cards, star card, sticky "Kunci pick" footer) → grup home (ink header + stat tiles, klasemen with kamu-row and belum-pick badges, WA nudge banner, dashed invite card) → Main root shell behind VITE_FLAG_PICKEM_HOME (tab bar Main/Grup/Skor/Kabar, utang-pick hero, Malam Ini section) → Skor tab v1 (live tiles with personal pick status) → share cards v2 (4 moments, 1080×1080 always-dark + og crop, satori). Exit test per screen: invite link → first confirmed pick in ≤3 taps, ≤60 seconds, no login wall, at 390×844.

R3 — EPL launch: freeze Aug 13, flag default-on Aug 15 (gibol.co root = Main), AFF→EPL rollover live during the AFF semis. R4–R6 (Liga 1 Sep 4, skor.gibol.co Phase B, Kabar v1, desktop #t6, billing + NBA + Mandalika, platform proof) per 13 §2.

Hard constraints (14 §3): dispatcher-only endpoints; no Tailwind, no new runtime deps, no icon libraries; fonts self-hosted only; aliased token migration — hubs/cron/auth/scoring never share a commit with visual work; additive idempotent migrations Ade applies manually via SQL Editor, RLS in the same migration; kamu/-mu voice, never lo/gue, never betting vocabulary in any locale; star = the existing jagoan mechanic — schema and scoring math untouched; prop picks parked to R6; never break the live hubs, cron, or auth; curl-verify APP_VERSION after every push, force-redeploy if stale.

Cadence: ticket by ticket — implement → test → push → curl-verify → one-paragraph report (shipped / verified / next). Blocked >30 minutes on anything external: one sentence, move to the next unblocked ticket. R0's exit gate blocks R2 but not R1. Version the first ship v0.81.0; ship notes in src/lib/version.js as always.
```
