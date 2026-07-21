# Design Research — Gibol as Indonesia's Sports Platform · Brief for the Claude design session

**Date:** 2026-07-18 (v2 — supersedes the EPL-only draft, now in `archive/`) · Owner: Ade · Consumer: the Claude design pass ("claude design")
**The correction this version encodes:** the goal is not an EPL product. The goal is **Gibol as THE play-layer for Indonesian sports fans — football (EPL, Liga 1, Timnas/AFF/WC), basketball (NBA, IBL), F1, badminton, and sports we haven't picked yet.** EPL (Aug 15) is only the *first instance* of the system. Therefore the design deliverable is **not screens for a sport — it is a sport-generic pattern grammar plus a per-sport skin config**, proven by rendering three very different sports without new layouts.
**Output expected back:** `design_handoff_flagship_v2/` — pattern library + per-sport config table + copy deck + README build authority for Track B (engineering calendar: `09-HANDOVER-EPL-RECOVERY.md`).
**Companion docs:** `audits/2026-07-18-distance-to-launch-audit-and-plan.md` · `07-side-by-side-playoffpickems.md` + `08-teardown-deltas.md` · repo `docs/06-adding-a-sport.md` + `docs/07-multi-sport-flexibility.md` + `docs/sports-ibl-brief.md` · v1 bundle `design_handoff_flagship/` (evolve, don't restart).

---

## 1 · The platform thesis the design must serve

Gibol is where Indonesian fans **play** their sports — the WhatsApp group's argument, scored. One loop across every sport: **pick → event night → scored & ranked → brag card into WA → friend joins pool → pick.** North star = WPP (weekly picking players in pools), summed across sports — a user who picks EPL on Saturday and NBA on Monday is the retention model working. The multi-sport spread is not a feature list; it's the **calendar hedge**: when one sport rests, another is live, and the platform never has a dead week. That only works if switching sports costs the user nothing — same grammar, same muscle memory, different accent color. Legally and reputationally, everything must look like a game between friends: no odds chips, no green felt, no coin imagery, no gambling grammar in either locale (server-side banned-vocab guard already enforces copy).

**The design-system test that replaces "does the EPL screen look good":** put an EPL matchweek, an NBA nightly slate, and an F1 race weekend through the SAME pick-sheet pattern — if any of the three needs a new layout (not just a new skin), the system has failed.

## 2 · The competition grammar (design to the schema, not the sport)

Engineering is already schema-driven (`competitions.js` registry, generic `fixtures`/`predictions`, format-agnostic scoring config, `docs/06-adding-a-sport.md`). The design system must mirror it. Every sport decomposes into:

| Layer | Values the system must render |
|---|---|
| **Cadence** | weekly matchweek (EPL, Liga 1) · nightly slate (NBA, IBL) · event weekend (F1 GP) · tournament burst (WC, AFF, BWF badminton, NBA playoffs) |
| **Event shape** | team-vs-team (football, basketball, badminton H2H) · ranked field (F1 podium) · bracket node (playoffs, cups, BWF draws) |
| **Pick controls** | outcome 1/X/2 or 1/2 (no draw) · exact score (Tebak Skor) · ordered podium (P1/P2/P3) · bracket advance · survivor pick · jagoan star (one per period, any sport) |
| **Period unit** | matchday / "malam ini" (tonight) / GP / round — the unit the completion ring, lock countdown, and standings reset around |
| **Standings flavor** | points table · streaks · bracket tree · season leaderboard — all already in schema |

**Deliverable implication:** design ~6 primitives, not 30 screens — `EventCard` (3 shapes above), `PickControl` (5 variants), `PeriodHeader` (cadence-aware: "Minggu Ini · MW3" / "Malam Ini · 5 games" / "GP Hongaria" / "Perempat Final"), `CompletionRing`, `StandingsRow`, `LockChip`. Every surface in §4 is a composition of these. A new sport = a config row + an accent + copy strings, **zero new components** — that's the practicality bar for a solo-dev platform on a 12-function budget.

## 3 · Platform navigation & brand architecture

- **gibol.co = the play layer** (Phase A root swap): home is "what can I pick *tonight/this week*, across all my sports" — a cross-sport period feed, not a sport site. Sport hubs (live scores/stats) are the support layer, moving to skor.gibol.co in Phase B; every hub surface carries "your pick state" back-links into the play layer.
- **Sport switching is wayfinding, not navigation:** one accent token per sport (`--sport-accent`, applied over the same paper surfaces — the existing per-sport accent idea, tokenized), sport glyph set (one style, filled, 20px grid), competition switcher as a persistent pill row. The user never "goes to the NBA app" — they stay in Gibol and the accent shifts.
- **Grups can be multi-sport.** This is the platform's social unlock: one tongkrongan grup runs EPL season-long AND jumps into NBA playoffs AND the AFF bracket without re-inviting anyone. Design the grup home for N active competitions (tabs or stacked period cards — the pass decides), and the invite landing for "this grup plays: ⚽🏀🏎️".
- **Brand register per surface (unchanged):** tongkrongan gaul on brags/invites/nudges; sober + timestamped on anything scoring. One brand, two registers, every sport.

## 4 · The five loop surfaces — now sport-generic

Same ranking as before (loop position = design hours), but every acceptance test now runs across three sports:

1. **Invite/guest landing `/g/:code`** — pool preview, no login wall, guest pick via `guestStore`+`merge-guest`. Must render a football grup, a multi-sport grup, and a tournament-burst grup from one template. **Bar: link-tap → confirmed pick ≤3 taps, ≤60s, 390×844 — verified on an EPL matchweek AND an NBA nightly slate.**
2. **The period pick sheet** — "Minggu Ini" (weekly) and "Malam Ini" (nightly) are the SAME pattern with a cadence-aware header; F1 GP and bracket rounds are the other two states. Jagoan star, lock chips, completion ring are cross-sport constants. States: untouched / partial / complete / partially-locked (played events collapse to result rows) / fully-locked (provisional points).
3. **Grup home + commissioner panel** — standings with movement + `picked_current_matchday` nudge row ("belum pick · colek di WA"), per-competition tabs/cards for multi-sport grups, pending-member-#11 sheet (the paywall's face — velvet rope, not error), CSV export. Post-lock reveal is the screenshot moment; design it.
4. **Share cards** — 3 templates (grup invite · period brag · "gue menang" H2H) × 3 crops (og 1200×630, story 1080×1920, square 1080×1080), **sport-parameterized**: accent + glyph + event payload slot in; layout identical. Dark-native (WA threads), center-safe for thumbnail crops, type legible at 25% zoom, <300KB, via the existing satori/resvg static pipeline. One template file per format, not per sport — this is where flexibility pays forever.
5. **Root home (gibol.co)** — logged-out: the platform pitch in 5 seconds ("main bareng grup lo — bola, basket, F1") + public demo pool; returning: cross-sport "your pending picks" period feed, grups strip, live "your pick state" ticker. States for 0/1/4 grups and 1-sport vs 3-sport users.

## 5 · The sport rollout matrix (design for the calendar, not the roadmap)

The design pass should sanity-check every pattern against this real calendar — it is why cadence-flexibility is not optional:

| Sport | Competition | Cadence | Pick types | Data | Window |
|---|---|---|---|---|---|
| Football | **EPL 2026/27** | weekly | 1X2 + Tebak Skor + jagoan | API-Football (live, paid) | **Aug 15 — the first instance** |
| Football | **Liga 1 / Super League** | weekly | same | API-Football | Sep 4 — the home-market moment |
| Football | **AFF 2026** (Timnas) | tournament burst | match + bracket | API-Football | Dec — first sponsored pool |
| Basketball | **NBA 2026-27** | nightly slate | winner picks (no draw) + jagoan; playoffs bracket ×1/2/4/8 | ESPN (live, already integrated) | Oct — proves nightly cadence |
| Basketball | **IBL 2027** | nightly/weekend slate | same grammar as NBA | API-Sports basketball or ops-entry pilot (season just ended Jul 2026 — next season ~Jan 2027; brief: `docs/sports-ibl-brief.md`) | Jan 2027 — local-pride basketball, shares 100% of NBA patterns |
| Motorsport | **F1 2027** (or late-2026 GPs) | event weekend | podium-in-order 5/3/2 + pole | Jolpica/OpenF1 (already integrated in hub) | opportunistic — proves ranked-field shape |
| Badminton | **BWF** (Finals Dec / Indonesia Open Jun) | tournament burst | round winners + seed-upset bonus | ops-entry pilot → Sportradar later | Dec pilot — the emotionally-owned vertical |

The matrix is also the **practicality control**: nothing ships a new sport unless it's a config row (per §2), the data path is autonomous (per the audit's cron rule), and the calendar says it's live within ~6 weeks. Design must never assume a sport's presence — every surface handles "one competition live" and "five live" gracefully.

## 6 · What already exists — extend, don't replace (unchanged, still binding)

Paper surface stack (`--bg-deep #E9EDF1` → `--bg-paper #FFFFFF`), semantic colors `--p-live/up/down/info/jagoan` + washes, `--pickem-orange` accent (becomes the *football* accent; the pass proposes the sibling accents per sport), type ramp `p-display` 44 → `p-body` 15 (no new steps), `--font-display`/`--font-ui-pickem`/`--font-mono`, motion utilities `.f-confirm` 280ms / `.f-reveal` 200ms / `.f-sheet-up` 240ms (reduced-motion-disabled), `--focus-ring`. EN default locale + native-ID second key (named mechanics keep ID names: Tebak Skor, jagoan, colek, grup). Vite + React 18, no Tailwind, no new deps or fonts, WCAG 2.2 AA.

**Decisions D1–D3 carry over** from the archived EPL draft with one platform amendment: **D1 (paper vs dark)** — paper stays the app base this window; share cards + live-night surfaces are dark-native. Note the platform pressure: NBA/IBL are *nightly* products, so the "Malam Ini" dark treatment matters more than it did for EPL alone — the pass should design the dark match-night surface as a token-complete sibling (not a one-off), even if full dark mode ships post-launch. **D3 (club colors)** generalizes: neutral identity chips for all leagues' teams at launch; licensed/branded skins are a partnership decision per sport, never a launch dependency.

## 7 · Context & constraints research

- **Device reality:** 390×844 design frame, test 360×800; ≥44px targets; route JS <200KB; AVIF; hemat-data stance. Nightly-slate sports double the visit frequency on metered data — weight discipline compounds.
- **WhatsApp is the distribution surface:** OG card + first `og:description` line do the acquisition work. Every shareable route (grup, period result, H2H) gets designed OG meta. Card sizes per current OG guidance ([Rediate](https://www.getrediate.com/blog/og-image-size-guide), [ogrilla](https://www.ogrilla.com/blog/whatsapp-link-preview-guide), [OGImagen](https://ogimagen.com/blog/whatsapp-link-preview-image)).
- **Competitor patterns:** PlayoffPickems (07/08 docs) — proven commissioner loop, and its gaps: single-sport, 16-day dead air, no live layer, EN-only. Superbru — 20-year pick'em conventions, multi-sport but Western. Sofascore/FlashScore — multi-sport *score* density done credibly, zero play layer, cold register (they are the terminal; we are the tongkrongan — study their sport-switching IA, reject their warmth level). FPL — deadline-pressure UI for the literate minority. **Nobody combines multi-sport + pools + Bahasa + WA-native. The design system is where that combination becomes visible.**
- **Audience:** FPL-literate (~180k ID) know the grammar; tebak-skor masses know it from Vidio's WC runs; NBA Indonesia's fanbase skews younger/urban and lives on nightly highlights — the "Malam Ini" surface is their front door. No tutorials; teach through the first pick.
- **Trust surface is a design surface:** scoring-rules page, "scored 21:47 WIB · rule v1.2" per-pick line, "why it's free / no betting" page — typographically sober, boring on purpose, identical across sports. Visible distance from *judol* is brand equity in this market.

## 8 · Measurement plan (per surface, cross-sport)

Instrumentation exists (`pickemEvents.js`, GA4 GAP-6 schema). Targets, tracked **per sport and blended**:

| Surface | Metric | Target |
|---|---|---|
| Invite landing | `invite_open` → first `pick_submitted` same-session | ≥60% |
| Invite landing | time-to-first-pick p75 | ≤60s |
| Pick sheet | period completion (all events picked) | ≥70% of pool members |
| Share cards | `share_card_generated` / WPP / week | ≥0.5 |
| Grup home | post-lock reveal visits / member / period | ≥1.5 |
| Platform | % of WPP active in ≥2 sports (the hedge working) | measure from NBA launch; target ≥20% by Dec |
| Root home | logged-out visit → join/create grup | baseline, then iterate |

## 9 · Deliverables checklist

1. **Pattern library** — the 6 primitives (§2) as self-contained HTML with production tokens, each shown in ≥3 sport skins (EPL, NBA slate, F1 podium; bracket via AFF).
2. **8 composed screens** — invite landing (football grup + multi-sport grup), period sheet ("Minggu Ini" + "Malam Ini" + one locked state), grup home (single + multi-sport), commissioner panel, root home.
3. **Per-sport skin config table** — accent hex (contrast-checked), glyph, period nouns EN/ID, pick-control mapping — one row each for EPL, Liga 1, AFF, NBA, IBL, F1, badminton. Adding a sport = adding a row; the README must say exactly that.
4. **Copy deck** — EN + native-ID, register-zoned, for all surfaces × all states (empty/locked/pending/error), period vocabulary per cadence ("Minggu Ini/Malam Ini/Race Weekend/Babak"), banned-vocab-safe.
5. **3 share-card templates × 3 crops**, sport-parameterized, dark-native, with a 25%-zoom contact sheet across 3 sports.
6. **README = build authority** — screen→build-step map in Track B order, acceptance criteria per screen (including the §1 three-sports-one-pattern test), token additions as one diff block, D1–D3 resolutions recorded.
7. **Accessibility annex** — contrast table for every accent × surface pairing, focus order, reduced-motion behavior.

## 10 · PASTE-READY PROMPT for the design session

```
Read pickem-flagship/10-DESIGN-RESEARCH-PLATFORM.md (this brief), then 09-HANDOVER-EPL-RECOVERY.md §4 (the Track B build order), the v1 bundle design_handoff_flagship/ (evolve, don't restart), the competitor teardown 07 + 08, and the repo's docs/06-adding-a-sport.md + docs/07-multi-sport-flexibility.md + docs/sports-ibl-brief.md.

You are the senior product designer for Gibol — Indonesia's multi-sport play layer (football, NBA, IBL, F1, badminton), where WhatsApp groups' arguments get scored. EPL on Aug 15 is only the first instance: you are designing the sport-generic pattern grammar of §2 plus the per-sport skin config of §9.3, not EPL screens. The governing test: an EPL matchweek, an NBA nightly slate, and an F1 race weekend must all render from the SAME patterns with only a config-row change — if any needs a new layout, redesign the pattern, not the sport.

Produce the §9 deliverables in order: the 6 primitives in 3 sport skins, then the 8 composed screens, the skin config table, the register-zoned EN/ID copy deck, the 3 sport-parameterized share-card templates in 3 crops with a 25%-zoom contact sheet, the README build authority, and the accessibility annex. Work inside the shipped token system (§6): paper surfaces, p-* semantics, the existing type ramp with no new steps, the .f-* motion utilities; no Tailwind, no new fonts or dependencies. Resolve D1–D3 as amended in §6 and record the resolutions — pay special attention to the dark "Malam Ini" sibling surface, because NBA and IBL make Gibol a nightly product.

The bar: invite link → confirmed pick in ≤3 taps and ≤60 seconds at 390×844 with no login wall, verified for both a weekly matchweek and a nightly slate; every share card legible as a thumbnail on WhatsApp's dark background; every empty, locked, pending and error state designed; every accent × surface pairing passes WCAG 2.2 AA; scoring surfaces sober and timestamped; brags and invites in native tongkrongan Bahasa gaul with EN as the locale twin; nothing anywhere reads as gambling — no odds chips, no coins, no green felt, no banned vocabulary in either locale.

Deliver as design_handoff_flagship_v2/.
```
