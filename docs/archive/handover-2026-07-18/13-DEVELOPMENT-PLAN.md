# Gibol Development Plan v2 — Recovery × "Sistem 4a" Redesign × Platform Calendar

**Date:** 2026-07-18 · Owner: Ade · Status: approved plan of record — merges the recovery audit (`audits/2026-07-18-…`), the platform strategy (`11-PLATFORM-STRATEGY.md`), the redesign proposal (`12`), and the **locked design bundle `design_handoff_gibol_redesign/`** ("Sistem 4a": scarlet/ink/cobalt on paper `#FAF7F1`, Bricolage Grotesque + Instrument Sans, Main·Grup·Skor·Kabar shell, 6 primitives, per-sport skin config, dark "Edisi Malam", 1080×1080 dark share cards).
**Engine unchanged:** Vite + React 18 + Supabase + the 12-function dispatcher + API-Football/ESPN/Jolpica + satori/resvg. This plan restyles and re-shells; it never rewrites.

---

## 0 · Constraint updates the design forces (decided, not open)

1. **Fonts:** Bricolage Grotesque (800, +400 if needed) and Instrument Sans (400–700) are IN — **self-hosted woff2 subsets** (Latin subset, target ≤80KB total, `font-display: swap`, no Google Fonts runtime request; base64 copies into `scripts/fonts/` for share cards). This supersedes the old "no new fonts" rule.
2. **Icons:** no icon dependency — recreate the needed glyphs as **inline SVG components** in Phosphor-bold style (rounded language). Unicode placeholders in mocks are not shipping.
3. **Voice:** the design's copy rules are law — **"kamu/-mu" register, NO "lo/gue"**, no Gas-level slang; prestige framing ("Semua demi gengsi."); no betting/money language ever (server guard already enforces; client copy follows). This supersedes the "tongkrongan lo/gue" examples in docs 10–12. The HTML canvas is the copy deck.
4. **Token migration, not addition:** the Sistem 4a palette **replaces** the v0.80 paper/pickem-orange tokens. Migration is aliased (old var names point at new values where semantics match; e.g. `--pickem-orange` → scarlet `#D92D1C`, `--p-jagoan` → star tokens) so unmigrated surfaces stay coherent during the route-by-route port.
5. **Mechanics naming:** design "★ star ×2, budget 1/pekan" **is** the existing jagoan mechanic — schema, scoring-core math, and the partial-unique index are untouched; only presentation and copy change.
6. **Scope guard:** design shows prop picks (pencetak gol / top scorer / pole / fastest lap / DNF). These need player-level data + new scoring rules → **parked in R6-scope**; launches use existing mechanics only (outcome + skor akhir + star). The pick-sheet layout ships with the question-card pattern so props slot in later without redesign.

## 1 · Calendar spine (immovable)

**Jul 19** WC final · **Jul 24** AFF kickoff (–Aug 26) · **Aug 15** EPL MW1 + root flip · **Sep 4** Liga 1 · **Oct 11** Mandalika · **Oct** NBA opening + billing · **Dec** badminton/Melayu window · **Jan 2027** IBL/Proliga config-row test.

## 2 · Releases

### R0 — Recovery & data spine · Jul 19–24 · v0.81.x  *(= 09's Sprint 0, unchanged + AFF)*
| # | Ticket | Note |
|---|---|---|
| T0 | Repo rescue: `git status`/diff the Jul-2 WIP (3 pickem lib files), commit or discard; commit `pickem-flagship/` + design bundles into the repo | first, on the Mac |
| R0-1 | **WC backfill + score + insert the Jul-19 final** via `wc-backfill.yml` workflow_dispatch | the 24-hour item |
| R0-2 | Generic **football backfill+score cron** (`football-backfill.yml`, param by league; NBA v0.79.11 pattern) — green 2 days before anything visual ships | structural fix |
| R0-3 | **EPL 2026/27 seed** (league 39, 380 fixtures) + registry row | `preseed-epl-2026-27.mjs` TODOs |
| R0-3b | **AFF 2026 seed** + re-point WC tournament template (groups of 5 + two-legged SF/F — verify API-Football league id & two-leg handling day 1) | live Jul 24 |
| R0-4 | Vitest suite (105) gating `deploy.yml` | |
| R0-5 | Function-budget verify in Vercel dashboard; consolidate og/recap if 12/12 (frees the `billing.js` slot) | |
| R0-6 | Functional AFF→EPL rollover action + plain banner (reskinned in R2) | |
| R0-7 | `days_since_last_scored_fixture` liveness alarm in `health/data-sources` | never again |

**Exit:** WC scored, AFF pickable at kickoff, EPL fixtures live, cron green, CI red on broken scoring test.

### R1 — Sistem 4a foundation · Jul 20–27 (parallel with R0) · v0.82
| # | Ticket |
|---|---|
| R1-1 | Fonts: subset + self-host Bricolage/Instrument, `@font-face`, share-card base64 copies |
| R1-2 | `tokens-4a.css`: full palette + dark Edisi Malam set + radii/spacing/rule scales from the README tables; legacy aliases; type ramp remap (hero 28–32 → meta 9–11; desktop score 44) |
| R1-3 | Logo block component (GI/BOL stacked, pure CSS) + tagline strings; favicon/OG logo regen (`regen-icons.mjs`) |
| R1-4 | The **6 primitives** as components with exact states: MatchCard · PickChip (default/selected/locked/correct/missed) · LeaderboardRow (kamu-tint + belum-pick badge) · LiveTile (4px sport border + personal pick status) · KabarCard (3px top border + pick-hook CTA) · LockBadge (countdown→terkunci). Storybook-less: one `/dev/primitives` route behind a flag for visual QA |
| R1-5 | Skin config module (`sportSkins.js`): Bola scarlet / Basket `#E07B00` / MotoGP cobalt / Voli `#7A2E8E` + event-unit nouns + lock verbs per README table |
| R1-6 | Inline-SVG icon set (tab glyphs, star, lock, share, WA) |
| R1-7 | Theme engine: auto Edisi Malam 19:00–06:00 WIB + manual override (localStorage), `prefers-reduced-motion` respected |
| R1-8 | Copy migration pass: all pickem strings → kamu-register EN/ID double keys (canvas = copy deck); `check-vocab.mjs` extended with lo/gue lint |

**Exit:** `/dev/primitives` renders all primitives in 3 skins × light/dark, AA-checked; fonts ≤80KB; no legacy surface visually broken (aliases hold).

### R2 — The five surfaces, live on AFF traffic · Jul 27–Aug 12 · v0.83–0.85
Build order = loop order; every screen pixel-faithful to `#t4`, consuming only `src/pickem/api.js` (seam rule):
1. **Invite landing `/g/:code`** (public, no auth; join → auth → first pick prompted). Exit: link-tap → confirmed pick ≤3 taps/≤60s @390×844.
2. **Pick sheet** (banner card, progress bar, question cards, star card, sticky "Kunci pick" footer; live countdowns; locked-state collapse).
3. **Grup home** (ink header + stat tiles, klasemen with kamu-row/belum-pick, scarlet nudge banner → WA, dashed invite card + "Salin link").
4. **Main root shell** behind `VITE_FLAG_PICKEM_HOME`: bottom tab bar (Main▲ Grup● Skor▶ Kabar■), utang-pick hero, Malam Ini section, grup summary, Kabar teaser.
5. **Skor tab v1**: live tiles with personal pick status over existing feeds (full hub migration is R4).
6. **Share cards v2**: 4 moments (Juara grup · Streak · Matchday challenge w/ consensus split · Invite) at 1080×1080 dark + og 1200×630 crop, satori pipeline, OG meta on `/g/:code`.

AFF group stage (Jul 24–Aug 11) is the live beta: seed 5–10 real grups, watch `pickemEvents` funnel. **Exit:** completion ≥70% in beta grups; invite→pick ≥50% same-session (target 60% by launch).

### R3 — EPL launch · Aug 13–15 · v0.90
Freeze Aug 13 · flag default-on: **gibol.co root = Main** · AFF→EPL rollover banner during AFF semis · launch push (share cards do the work). Rollback: flag off.

### R4 — Liga 1 + platform split · Aug 17–Sep 4 · v0.91–0.93
Liga 1 seed + Bola skin at **Sep 4 kickoff** · **Phase B:** hubs 301 → `skor.gibol.co` in the Aug 25–Sep 1 quiet week; Skor tab becomes the in-app live surface · **Kabar v1**: existing `api/news` + content engine re-rendered as KabarCards with pick-hook CTAs (multi-sport digest, no newsroom) · desktop ≥1024 pass per `#t6` (top nav + 3-col Beranda; split-view detail panes may trail one release) · trust pages (scoring rules, "kenapa gratis") in the sober register.

### R5 — Money + nightly · Sep–Oct · v0.94+
`api/billing.js` (slot freed in R0-5) + Midtrans QRIS: commissioner tiers + Gibol+ — **gated on KYB (Ade); stopgap = manual grants, already live** · NBA 2026-27 nightly slate (Basket skin; Edisi Malam is its prime surface) · **Mandalika Oct 11** MotoGP event mode (podium 1-2-3 picks; grid live tile) — first sponsored-pool pitch with AFF+EPL+Liga 1 numbers · pending-member-#11 upgrade sheet gets its 4a design.

### R6 — Platform proof · Nov–Jan · v1.0 candidate
Badminton BWF Finals pilot (ops-scored) · Bahasa Melayu locale + MY leaderboards · **IBL + Proliga as pure config rows (≤2 weeks each — the acceptance test of the whole grammar)** · prop-pick mechanics (pencetak gol etc.) if player-data path is proven · Liga 1 Fantasy beta scoping.

## 3 · Risks & watch-items

| Risk | Mitigation |
|---|---|
| AFF in API-Football: id/coverage/two-leg semantics unverified | R0-3b day-1 verify; fallback = ops-entry (≤26 matches total, trivial) |
| Palette migration breaks legacy hubs mid-window | aliases + route-by-route flags; hubs never share a commit with visual migration |
| Font weight vs <200KB route budget | subsets ≤80KB, swap, system-stack fallback |
| 12-function cap | R0-5 first; dispatcher-only rule stands |
| Midtrans KYB slips again | grant-entitlement stopgap; R5 revenue is the only dependent |
| Solo bandwidth: R0+R1 run in the same week | R0 is small tickets; R1-1/2/3 are mechanical; R2 starts only after R0 exit gate |
| WIP in the 3 evicted pickem lib files conflicts with R1/R2 work | T0 resolves before any edit to those files |

## 4 · Measurement (unchanged targets, now per release)
R2 exit: invite→pick ≥50%, completion ≥70% (beta) · R3+4wk: ≥8k registered, W4 pool ≥30%, K ≥0.3 · Dec: 60k reg / 15k WPP / ≥20% multi-sport / 1 sponsor. Kill/pivot rules per `11` §7.
