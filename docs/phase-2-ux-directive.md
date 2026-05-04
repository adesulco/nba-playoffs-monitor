# Gibol Phase 2 — Mobile-First UX Directive (CPO + Lead Designer)

**Date:** 2026-04-26  •  **Revised:** 2026-04-26 (per `docs/phase-2-ux-response.md`)  •  **Anchor:** `src/index.css` v2 brand handoff (Apr 2026) + everything shipped through v0.15.1 — see §0.5 for the per-sprint diff.  •  **Scope:** Visual + interaction polish only — no IA, route, or backend change.  •  **Lens:** Mobile-first, journey-first, sports-companion-first.

> **Revision note (2026-04-26).** Ade rejected the English-default proposal (§0.4 + Sprint G — both removed). Anchor pulled forward from v0.2.13 → v0.15.1. Sprint E derby task reframed as reshape-not-build. Growth-track parallel acknowledged; 4 protected surfaces noted in §10.

> Gibol is a fan's companion. They pull it out at the bar, on the bus, between innings. Every screen is designed at **360 px first**. Live data is one tap away from anywhere. Anything decorative that costs them a scroll is fired.

---

## 0 · Anchor and explicit deviations

**Anchor:** the v2 brand handoff already in `src/index.css` (surfaces, ink scale, sport accents, signal colors, type scale, spacing, radii, motion, focus ring, reduced-motion, a11y tunings GIB-001 / GIB-004 / v0.11.4 / v0.11.5 / v0.11.16 / v0.11.19 / v0.11.20). Phase 2 enforces the existing tokens; it doesn't add new ones except where flagged.

**Deviations I'm proposing — flagged loudly:**

1. **Missing i18n keys added** — at local HEAD `98717d8` / `package.json` v0.4.6 the keys still missing are `navTennis`, `navWorldCup`, `navNBA`, `navF1`, `skipToContent`, `copyLink`, `share`. **Pending verification against Mac branch — Ade's memo asserts `navTennis` + `navWorldCup` already shipped at v0.15.1; if confirmed, Sprint A scope shrinks to the remaining 5 keys.** Either way, P0; anchor is silent.
2. **Strip the visible hero from every hub** — TopBar already establishes location, the picker carries season context. A 200 px eyebrow/h1/subhead block is dead weight on a 700 px mobile viewport with 132 px of fixed chrome already taken. **NBA's existing pattern is canonical.** SEO `<h1>` stays in the DOM as `.sr-only`.
3. **Cap red-family sport accents** — anchor lists 4 reds out of 6 sports (NBA / F1 / Liga 1 / IBL all red). Saturated reds reserved for full-bleed surfaces; chips/icons use lightened distinguishers per sport. Open a flag — willing to be overruled.
4. **~~English as default surface language~~** — **REJECTED 2026-04-26.** Bahasa stays the default per `CLAUDE.md` core operating principle #3 (audience anchor + SEO compound + gibol→fangir funnel alignment). The user-driven `id ↔ en` toggle in `AppContext` stays as-is. Brand-locked Bahasa nouns remain authoritative in both languages. Sprint G is dropped from the sequencing block.

---

## 0.5 · Per-sprint scope diff against v0.15.1 (re-anchor)

The first directive cited v0.2.13 as the anchor — that was a stale memory read. Re-anchoring against v0.15.1, several Sprint A and Sprint F items materially overlap with shipped work. Below is what's done vs. still needed per sprint, grounded in the verified repo state.

| Sprint | Item | State at v0.15.1 (per Ade's memo) | State at local HEAD `98717d8` (verified by me) | Net Phase-2 work |
|---|---|---|---|---|
| **A** | `navTennis`, `navWorldCup` i18n keys | already present | **still missing** | Confirm with Ade which is current; add if missing |
| **A** | `navNBA`, `navF1`, `skipToContent`, `copyLink`, `share` | not asserted | missing | Add |
| **A** | `/nba-playoffs-2026` (plural) → singular 308 | confirmed missing | confirmed missing in `vercel.json` | Add — real bug |
| **A** | Theme-aware `--sport-*` vars in `index.css` | not asserted | confirmed: same hex in dark + light | Mirror `sportColor.js` `_DARK` table into `[data-theme="dark"]` |
| **A** | Bilingual concat on skip-link | not asserted | confirmed in `App.jsx:142` | Use `t('skipToContent')` |
| **B** | `<HubStatusStrip>` | not built | not built | Build + migrate F1 / Tennis / Super League / NBA / EPL |
| **C** | `<HubPicker>` polymorphic wrapper | EPLClubPicker, ConstructorPicker, TennisPlayerPicker, TeamPicker all shipped | confirmed all shipped | **Wrap, don't rebuild.** Sprint C is a thin polymorphic adapter; underlying picker logic is untouched. |
| **D** | `<ScheduleStrip>` variants | each variant exists per-page | confirmed | Extract shared chrome; per-page strips re-mount as variants |
| **D** | `<KpiStrip>` | exists on F1 / EPL / NBA per-page | confirmed | Extract; add to Tennis (currently missing) |
| **E** | Derby reshape | **shipped at v0.15.0**: countdown inside hero below h1, h1 `clamp(28px, 6vw, 48px)`, side-picker chips inside hero | confirmed at local HEAD too | **Reshape, not build.** Engagement layer (Supabase polling, reaction wall, oneliner composer, JSON-LD) is OFF-LIMITS. Phase 2 only changes hero composition: countdown above eyebrow, side-picker below H2H strip on mobile, h1 spec to locked 32/48/56. |
| **E** | HomeV1 mobile reorder | not shipped | not shipped | CSS `order:` on grid children |
| **F** | TeamPage, EPLClub, SuperLeagueClub, F1Race/Team/Driver, TennisTournament, TennisRankings | **all shipped at Phase 1A** | confirmed all routes + pages exist | **Restructure, not build.** Sprint F migrates these onto `<HubStatusStrip>` and `.sr-only` h1; data hooks, API plumbing, and SEO meta are untouched. |
| **G** | ~~Default language flip `id` → `en`~~ | — | — | **Dropped.** |
| **H** | Sport-accent rebalance | not built | not built | Behind `VITE_FLAG_SPORT_ACCENT_V2`; optional |

**Version drift to flag:** local Cowork checkout shows `package.json` v0.4.6 and HEAD commit `v0.6.9 → v0.10.0 sprint`. Ade's memo cites v0.15.1. Either the local is behind GitHub remote (likely — per `gibol_repo_truth.md` memory) or the memo is forward-anchored. Before Sprint A push, please confirm the live HEAD; I'll re-pull from GitHub if needed.

---

## 1 · The five user journeys (the lens)

Every design decision in Phase 2 is defended against one of these. **Each must be ≤2 taps from anywhere on the site, and the answer must be visible without horizontal or significant vertical scroll on a 360 × 700 viewport.**

| # | Journey | Path | What "answered" looks like in the mobile fold |
|---|---|---|---|
| **J1** | "Is anything live right now?" | TopBar Home → / → Live grid | First match-card row visible at first paint, with live score + minute |
| **J2** | "What did my team do?" | Any page → tap my-team chip (TrendingTeams / TopBar avatar / picker) → /[sport]/[team] | Last result + next fixture both visible without scroll |
| **J3** | "How's my bracket / pick'em?" | TopBar avatar → / → Pick'em rank pill | Rank + score visible inline; tap to drill into leaderboard |
| **J4** | "What are the odds on this match?" | Tap any match card → match focus → Odds tab | Win-prob bar + Polymarket % visible without scroll |
| **J5** | "Yesterday's recap" | / → Yesterday rail → /recap/[date] | Moment-of-day h1 + 4-game grid visible; share rail one scroll away |

Phase 2 success = a stopwatch test on a real 6-inch phone covers all five in under **15 seconds total**.

---

## 2 · Mobile-first layout math (the budget)

### Fixed chrome on every page

| Layer | Mobile (≤720) | Tablet | Desktop (≥1024) |
|---|---|---|---|
| `V2TopBar` (sticky) | 48 px | 48 | 56 |
| `MobileBottomNav` (fixed) | 60 px + iOS safe-area inset | hidden | hidden |
| iOS safe-area inset | ~24 (devices with home indicator) | 0 | 0 |
| **Total reserved** | **132 px** (iOS) / 108 (Android) | **48** | **56** |

### Effective first-paint budget

Assume an iPhone 14 (390 × 844). After URL bar + reserved chrome, **first paint shows ≈ 568 px of vertical content.** That's the budget every hub page must respect.

```
Hub page (Shell A) on a 390 × 844 viewport:

┌──────────────────────────────────────┐  0
│ V2TopBar (sticky)                  48│
├──────────────────────────────────────┤  48
│ StatusStrip — picker · live · share │
│  · 44 px on mobile                   │
├──────────────────────────────────────┤  92
│ ScheduleStrip header (24)           │
│ Day pills row (60)                   │  → 84 px total
├──────────────────────────────────────┤ 176
│ Featured live match card (180)      │
├──────────────────────────────────────┤ 356
│ Live grid — 2 cards visible         │
│  (each 96 px tall)  → 192 px         │
├──────────────────────────────────────┤ 548
│ KPI strip (start of, scrollable)    │
│  20 px peeking under fold            │
├──────────────────────────────────────┤ 568   ← fold
│ ...rest of page below fold           │
└──────────────────────────────────────┘
                                     844
        └────── BottomNav 60 + safe-area ──────┘
```

**Three live match scores in the first paint** is the design contract. A 200 px hero would push us to one card or zero — that's the math behind stripping heroes.

### Mobile grid

- Page gutter: **16 px** (≤720), **24 px** (≥720)
- Touch target: **48 × 48 minimum** (Apple HIG / Google MD)
- Default vertical rhythm: **8 px between sibling rows, 16 px between sections, 24 px between content + footer**
- Safe horizontal scroll containers (day strips, calendar, tournaments, KPI strip) get a **right-edge fade-mask** (already shipped via `.day-strip-scroll`)

---

## 3 · The three shells

Every page is one of three shapes. No page invents a fourth.

### Shell A — `<HubShell>`

Covers: `/nba-playoff-2026`, `/super-league-2025-26`, `/premier-league-2025-26`, `/formula-1-2026`, `/tennis`, `/ibl` (when live), `/fifa-world-cup-2026` (when live), and all leaf pages (`/.../club/:slug`, `/.../team/:slug`, `/.../driver/:slug`, `/.../race/:slug`, `/tennis/:slug`, `/tennis/rankings/:tour`).

```
V2TopBar  →  StatusStrip(44)  →  ScheduleStrip  →  PrimaryFocus  →  KPIStrip  →  BodyGrid  →  SportFooter
```

**StatusStrip** is the *whole* chrome above content:

```
[★ Picker label ▼]        ● LIVE · 2s ago · WIB    [↗ Copy] [↗ Share]
```

Mobile collapse — StatusStrip becomes 2 rows of 32 px each (total 64) only if the viewport is ≤390. The picker takes row 1 full-width; live meta + Copy + Share share row 2.

SEO `<h1>` is the very first thing in `<main>`, with `className="sr-only"` so it's invisible to sighted users but crawlers and screen readers see it. Title is brand+sport+season, e.g. `NBA Playoffs 2026 — Live Scores, Bracket, Odds`.

### Shell B — `<EditorialShell>`

Covers: `/`, `/about`, `/glossary`, `/recap`, `/recap/:date`, `/derby/persija-persib`, `/fifa-world-cup-2026` (ComingSoon), `/ibl` (ComingSoon).

These earn a visible hero because **the content IS the hero** — Pick'em CTA on Home, longform on About, daily recap on Recap, derby moment, waitlist pitch on ComingSoon. Hero size capped per page (see §6 type table).

Mobile rule: hero compresses to **24 px h1 / 16 px subhead** by default, growing to 32/18 on tablet and 40/20 on desktop. The Derby exception goes 32→48→56.

### Shell C — `<TransactionalShell>`

Covers: `/login`, `/auth/callback`, `/onboarding/teams`, `/settings/teams`, `/bracket`, `/bracket/new`, `/bracket/:id`, `/bracket/:id/share`, `/league/new`, `/league/:id/join`, `/leaderboard`, `/leaderboard/:leagueId`.

No hero. A 20–24 px inline page title above a single 480-px-max form. The form is the page.

---

## 4 · Page-by-page directive (mobile-first, all enumerated)

Every page Ade listed plus the leaf families. **Strip = remove visible hero, keep `.sr-only` h1. Polish = chrome / spacing / token alignment only.**

| Page | Shell | Mobile change | Desktop change |
|---|---|---|---|
| `/` (HomeV1) | B-compact | **Reorder grid via `order:`** so Live Now grid is row 1, Pick'em CTA collapses to a 64 px banner on row 2, Trending Teams row 3, Live Pulse row 4, Fans Reacting row 5, Fangir Shop row 6. | Pick'em CTA stays banner-style at top (current behaviour); 3-col grid below kept. |
| `/about` | B | Compress hero to 24/16. Add `<HubActionRow>` with Copy + Share. | 32/18 hero. |
| `/glossary` | B | Add eyebrow `NBA · POSTSEASON 2026 · GLOSSARY`, compress h1 to 24. | 32 h1. Group glossary entries by category with sticky letter index. |
| `/recap` (today) | B | Reference. 28 px h1. 4-network share rail compresses to icons + label below 540. | Already correct. |
| `/recap/:date` | B | Same as `/recap`. Add ← / → date pager pinned 32 px under StatusStrip on mobile. | Already correct. |
| `/nba-playoff-2026` | A | **Reference.** Polish only: wrap subrow in `<HubStatusStrip>`; picker label on mobile reads `★ NBA · Hornets ▼` (collapses sport+team to one chip). | Same. Add Copy + Share top-right of subrow. |
| `/super-league-2025-26` | A | **Strip the hero.** Eyebrow / h1 / subhead / red SHARE all collapse into StatusStrip. Fixtures & Standings move to row 1. SEO h1 → `.sr-only`. | Same. SHARE downgrades from filled red to ghost outline (matches F1/Tennis pattern). |
| `/super-league-2025-26/club/:slug` | A leaf | Strip hero. Club-color 4 px stripe on left edge of StatusStrip. Last result + next fixture in fold. | Same. Add club news rail row 2. |
| `/premier-league-2025-26` | A | Polish only — already minimal. Dock picker top-left of subrow, Copy + Share top-right. SEO h1 `Premier League 2025-26 — Live Scores`. | Same. Existing day strip + match grid + KPI strip kept. |
| `/premier-league-2025-26/club/:slug` | A leaf | Same as Super League club leaf. | Same. |
| `/formula-1-2026` | A | **Strip the hero.** "McLaren · Formula 1 2026" h1 → `.sr-only`. Calendar swipe (23 GPs) becomes row 1 immediately under StatusStrip. KPI strip preserved. | Same. Picker stays subrow (top-right today, moves to top-left for consistency with NBA / EPL / Tennis). |
| `/formula-1-2026/race/:slug` | A leaf | Strip hero. R-badge + GP name move into StatusStrip as picker label `★ R06 · Monaco GP ▼`. Race info card row 1. | Same. |
| `/formula-1-2026/team/:slug` | A leaf | Strip hero. Team-color 4 px stripe on StatusStrip. Drivers + standings row 1. | Same. |
| `/formula-1-2026/driver/:slug` | A leaf | Strip hero **but** keep the # number tile as a 32 px chip inside StatusStrip (Bebas Neue digit, branded moment). Driver name + nationality flag = picker label. | Same. |
| `/tennis` | A | **Strip the hero.** "Tennis 2026" → `.sr-only`. Tournament cards become row 1. **Add KPI strip** (currently missing): # Live Matches · Top Active Seed · Surface of Day · Next Final. | Same. |
| `/tennis/:slug` (Tournament) | A leaf | Strip hero. Tournament name + dates + city = picker label. Draw/live matches row 1. | Same. |
| `/tennis/rankings/:tour` | A leaf | Strip hero. Tour toggle (ATP/WTA) = picker. Top-100 table row 1. | Same. Sticky table headers. |
| `/fifa-world-cup-2026` (ComingSoon) | B | **Keep hero** — content IS the hero. Compress to 24 h1 mobile / 32 desktop. Inline `<EmailCapture>` pinned under hero. 6 feature cards become 2-col grid below 540, 3-col 540–900, 5-col ≥900. | Same. |
| `/ibl` (ComingSoon) | B | Mirror FIFA WC layout exactly. Same h1 spec, same 6-card grid, same waitlist CTA. | Same. |
| `/derby/persija-persib` | B (editorial moment) | **Move countdown above eyebrow** so it's the lead. h1 32 mobile / 48 tablet / 56 desktop. Side-picker chips (Macan / Maung / Netral) become a horizontal scroll below the H2H strip on mobile. | h1 56. Keep current rich H2H strip + photo wash. |
| `/onboarding/teams` | C | 24 page title. Form. | 28. |
| `/settings/teams`, `/login`, `/auth/callback` | C | 20 page title. | 24. |
| `/bracket`, `/bracket/new`, `/bracket/:id`, `/bracket/:id/share`, `/league/new`, `/league/:id/join`, `/leaderboard`, `/leaderboard/:leagueId` | C | 20 inline title. | 24. Existing bracket viz kept. |

---

## 5 · Components (the locked set)

All components live under `src/components/v2/` and consume only existing CSS variables. Net new CSS lines: ~80 (all in `<HubStatusStrip>` and `<HubHero>` editorial variants).

| Component | Replaces / wraps | Purpose |
|---|---|---|
| **`<HubStatusStrip>`** | inline `dashboard-hero` div on every hub | Single 44 px row (mobile: collapses to 64 / 2-row). Slots: `picker`, `live`, `actions`. Carries `.sr-only` h1. |
| **`<HubHero>` (editorial-only)** | inline hero blocks on About / Glossary / Recap / Derby / ComingSoon | Slots: `eyebrow`, `title`, `subhead`, `actions`. Sizes per page from §6 table. |
| **`<HubPicker>`** | EPLClubPicker / ConstructorPicker / TennisPlayerPicker / TeamPicker | Thin polymorphic wrapper. Always docked top-left of StatusStrip (or top-right on F1 — moving to top-left in Phase 2 for parity). |
| **`<HubActionRow>`** | scattered Copy / Share | Docked top-right of StatusStrip on hubs; inline under hero on editorial pages. |
| **`<LiveStatusPill>`** | 5 different live/coming-soon/final/partial chips | One component, 5 variants: `live · coming-soon · final · partial · offline`. |
| **`<ScheduleStrip>`** | per-page day/calendar/tournament strip | Variants: `weekday | calendar | tournament | bracket | empty`. Shared header + scroll mask + swipe affordance. |
| **`<KpiStrip>`** | per-page 4-cell stat strip | Receives `[{eyebrow, value, trend?, sub?}] × 4`. Mobile = 2-col grid (already in CSS), 540+ = 4-col. |
| **`<EmailCapture>`** | bespoke FIFA / IBL waitlist | Reusable across ComingSoon pages. Hooks to fangir mailing list. |

---

## 6 · Locked type system

**Family.** Inter Tight (sans, body + headings + numerics ≥15) + JetBrains Mono (eyebrows + meta + numerics ≤13). No Bebas Neue except the two existing branded exceptions (F1 driver # tile, TeamPage abbr watermark).

**Tokens.** Mobile column is the design baseline. Every value is in `src/index.css`'s `--size-*` scale already; this table defines which size applies to which role at which breakpoint.

| Role | Mobile | Tablet | Desktop | Family / weight | Tracking | Use cases |
|---|---|---|---|---|---|---|
| **Display (editorial moment)** | 32 | 48 | 56 | Inter Tight 700 | -0.025em | Derby h1 only |
| **Display-lg (default editorial)** | 28 | 32 | 36 | Inter Tight 700 | -0.02em | Recap h1 |
| **H1 hero (Shell B)** | 24 | 28 | 32 | Inter Tight 700 | -0.02em | About / Glossary / ComingSoon |
| **H1 sr-only (Shell A)** | n/a (visually hidden) | n/a | n/a | inherits | — | NBA / EPL / F1 / Tennis / Super League hubs |
| **Page title (Shell C)** | 20 | 22 | 24 | Inter Tight 700 | -0.015em | Login / Bracket / Leaderboard inline title |
| **H2 section** | 17 | 18 | 20 | Inter Tight 700 | -0.01em | "Scores & Schedule", "Title odds" panel headers |
| **H3 sub-section** | 15 | 16 | 17 | Inter Tight 600 | 0 | Card titles, "Active & Upcoming Tournaments" |
| **Body** | 14 | 14 | 15 | Inter Tight 400 | 0 | Default reading copy |
| **Body-sm** | 12 | 13 | 13 | Inter Tight 400 | 0 | Table cells, dense rows |
| **Label / button** | 13 | 13 | 14 | Inter Tight 600 | 0 | Buttons, picker label, day pill label |
| **Eyebrow** | 10 | 11 | 11 | JetBrains Mono 700 uppercase | 0.14em | "FORMULA 1 · SEASON 2026" / Phase 1 spec |
| **Meta** | 11 | 11 | 12 | JetBrains Mono 500 | 0.04em | "refresh 2s ago", timestamps, refresh-age |
| **Caption** | 10 | 10 | 11 | JetBrains Mono 500 | 0.04em | Sparkline labels, footer fine print |
| **Score (big)** | 36 | 56 | 72 (live-hero 120) | Inter Tight 900 tabular | -0.06em | Featured match score, big-score class |
| **Score (compact)** | 22 | 24 | 26 | Inter Tight 800 tabular | -0.04em | Match cards in grid |
| **KPI value** | 18 | 20 | 22 | Inter Tight 700 tabular | -0.015em | Title Favorite "OKC 52%", Polymarket % |

**Line height rules** (apply to every role): headings = 1.1, body = 1.55, table rows = 1.4, buttons = 1.2, eyebrows + meta = 1.3.

---

## 7 · Locked color system — Dark + Light

Every token below already lives in `src/index.css`. Phase 2 doesn't add or move them — it documents which role consumes which token, and audits where today's components leak across the boundary.

### 7.1 Surfaces

| Role | Dark hex | Light hex | Where it's used |
|---|---|---|---|
| `--bg` | `#0A1628` | `#F5F1EA` | `<body>`, page bg |
| `--bg-2` (raised) | `#0F1E36` | `#FFFFFF` | Cards, panels, StatusStrip bg |
| `--bg-3` (elevated) | `#16273F` | `#FAF7F2` | Hover, popovers, picker dropdown |
| `--line` | `#223552` | `#E3DCCF` | Section dividers |
| `--line-soft` | `#1A2A44` | `#EDE7DB` | Card inner dividers |
| `--border-interactive` | `#5F7390` (3.7:1) | `#7A7060` (3.9:1) | Search pill, inactive toggle, ghost button border |

### 7.2 Foreground (ink)

| Role | Dark | Light | Min contrast | Where |
|---|---|---|---|---|
| `--ink` (primary) | `#E6EEF9` | `#0A0A0A` | 14:1 / 19:1 | Body, h1, h2 |
| `--ink-2` (secondary) | `#B6C4D8` | `#333` | 8.5:1 / 12:1 | Subheads, helper copy |
| `--ink-3` (tertiary) | `#9FB4CC` | `#5C5C5C` | 5.4:1 on bg-3 | Meta, refresh-age, inactive nav |
| `--ink-4` (disabled) | `#6C85A8` | `#6E6E6E` | 4.6:1 | SOON badge, future-state copy |

All four hit WCAG AA at the surface they're used on (post v0.11.19 lift).

### 7.3 Brand + signals

| Role | Dark | Light | Where |
|---|---|---|---|
| `--blue` (primary CTA, focus ring) | `#3B82F6` | `#1E40AF` | Sign in, Open match, focus outline |
| `--amber` (brand accent) | `#F59E0B` | `#9A3412` | Wordmark dot, secondary CTA, tick-live underline |
| `--live` (now playing) | `#F25757` | `#B91C1C` | LIVE pill, live-dot, score-flash |
| `--up` (gain) | `#10B981` | `#0E8F6A` | Bracket gain, win delta, +trend |
| `--down` (loss) | `#F25757` | `#B91C1C` | Loss delta, -trend |
| `--warn` (waitlist / soon) | `#F59E0B` | `#9A3412` | COMING SOON pill, ComingSoon hero |

### 7.4 Sport accents (theme-aware)

Saturated hex for **full-bleed surfaces** (TeamPage wash, race banner). Lightened hex for **chips, icons, dots** on dark theme so they hit 4.5:1.

| Sport | Saturated (`--sport-*`) | Lightened on-dark | Lightened on-light |
|---|---|---|---|
| NBA | `#C9082A` | `#FF8795` | `#C9082A` |
| F1 | `#E10600` | `#FF8A8A` | `#E10600` |
| Liga 1 (ID) | `#C1272D` | `#FF9EA0` | `#C1272D` |
| EPL (PL) | `#3D195B` | `#D7B5F5` | `#3D195B` |
| FIFA WC | `#326295` | `#A0C2EA` | `#326295` |
| Tennis | `#D4A13A` | `#E6C47A` | `#D4A13A` |

**Phase 2 fix (B-4):** today the CSS `--sport-*` vars hold the saturated hex in BOTH `:root` and `[data-theme="light"]`, so any component reading `var(--sport-f1)` on dark theme gets a hex that fails contrast on chips. Mirror `sportColor.js`'s `_DARK` table into `[data-theme="dark"]` so the var is theme-aware.

### 7.5 Hero / wash tints

`--hero-tint` (default 5% white over `--bg-2`) is the wash beneath editorial heroes. Sport hubs override it as `var(--sport-*) at 8% alpha` — Phase 1 step 6 already locked the ≤12% ceiling.

### 7.6 Where today's color leaks across the boundary (audit findings)

- **Live red (`#F25757`) collides with F1 red (`#E10600`)** in the F1 hero: LIVE pill sits 12 px from the R06 highlight and reads as visual noise. Fix: when sport-accent ≈ red, render LiveStatusPill on a 1 px `--bg` ring.
- **Super League SHARE button is filled red** (`#C1272D` family), every other hub uses ghost outline. Downgrade to ghost.
- **Glossary entries use a `var(--amber)` left stripe** which is fine, but the eyebrow uses `--ink-3` while the rest of the site uses Mono 11 + `--ink-3`. Tiny drift; align.

---

## 8 · Component density (the pixel contract at 360)

| Component | Mobile (360) | Tablet (720) | Desktop (1280) |
|---|---|---|---|
| `V2TopBar` height | 48 | 48 | 56 |
| `MobileBottomNav` height | 60 + safe-area | hidden | hidden |
| `HubStatusStrip` height | 44 (or 64 in 2-row collapse ≤390) | 44 | 44 |
| `<HubPicker>` chip | 36 × full-width row 1 | 36 × auto | 36 × 220–280 |
| `<LiveStatusPill>` | 24 × auto | 24 | 24 |
| `<HubActionRow>` button (Copy / Share) | 32 × 32 icon-only | 32 × auto | 32 × auto |
| ScheduleStrip header | 28 | 28 | 28 |
| Day pill (NBA / EPL / SL) | 56 × 64 | 64 × 56 | 80 × 56 |
| Calendar card (F1) | 144 × 64 | 168 × 72 | 200 × 80 |
| Tournament card (Tennis) | full-width × 96 | 240 × 88 | 280 × 96 |
| Featured match card | full-width × 180 | full-width × 220 | 720 × 240 |
| Match card (in grid) | full-width × 96 | 1/2 × 96 | 1/4 × 96 |
| KPI cell | 1/2 × 64 | 1/4 × 72 | 1/4 × 80 |
| Body gutter | 16 | 24 | 24 |

Touch target audit: every interactive element ≥ 48×48. Match card row at 96 ✓, day pill at 64 ✓, picker at 36 + 16 vertical pad = 52 ✓, Copy/Share icon-only at 32 + 16 pad = 48 ✓ (hit area, not visual size — acceptable per HIG).

---

## 9 · Mobile wireframes (the contract, in ASCII)

### Hub (Shell A) — `/nba-playoff-2026` on 390 × 844

```
┌──────────────────────────────────────┐ TopBar 48
│ ◎ gibol.   Home NBA Liga1 EPL F1 …  │
├──────────────────────────────────────┤ StatusStrip 44
│ ★ NBA · Hornets ▼   ● LIVE · 2s · ↗ │
├──────────────────────────────────────┤ Yesterday rail 36
│ YESTERDAY  Sat 25 · 4 games · recap →│
├──────────────────────────────────────┤ Day pills 64
│ THU FRI YEST [TODAY] TMRW TUE WED  ›│
├──────────────────────────────────────┤ Featured match 180
│   ORL  vs  PHX                       │
│   83  —  107                         │
│   Final · Round 1 · Game 3            │
│   ─────── win prob bar ──────        │
├──────────────────────────────────────┤ Live grid (2 cards visible) 192
│ DET  vs  OKC      121  Final         │
│ NYK  vs  ATL      114  Q4 4:32       │
├──────────────────────────────────────┤ KPI strip starts 20 peeking
│ TITLE FAV ⏐ NEXT TIP                 │
└──────────────────────────────────────┘ fold ~568
                                          (scroll for KPI / bracket / stories)
                                       BottomNav 60 + safe-area
```

### Editorial (Shell B) — `/recap/2026-04-26`

```
┌──────────────────────────────────────┐ TopBar 48
├──────────────────────────────────────┤ Eyebrow + meta 28
│ PLAYOFF JOURNAL · NBA · POSTSEASON 26│
├──────────────────────────────────────┤ H1 36
│ Sunday, April 26, 2026               │
├──────────────────────────────────────┤ Subhead 18
│ 4 games · all results below          │
├──────────────────────────────────────┤ Pager + Live CTA 32
│ ← Prev | Today          Live →       │
├──────────────────────────────────────┤ Moment of the day 220
│ MOMENT OF THE DAY      ● 42 POINTS   │
│ S. Gilgeous-Alexander                │
│ erupts for 42, OKC beat PHX 121-109  │
│ 42 PTS · 4 REB · 8 AST               │
├──────────────────────────────────────┤ Share rail 56
│ [WhatsApp][X][Threads][Telegram][Copy]│
└──────────────────────────────────────┘ fold (results grid below)
```

### ComingSoon (Shell B) — `/fifa-world-cup-2026`

```
┌──────────────────────────────────────┐ TopBar 48
├──────────────────────────────────────┤ Eyebrow 24
│ FIFA WORLD CUP 2026 · USA · MEX · CAN│
├──────────────────────────────────────┤ H1 24 mobile
│ World Cup 2026 Dashboard             │
├──────────────────────────────────────┤ Subhead 14
│ 48 teams. 104 matches. 16 host cities│
├──────────────────────────────────────┤ Waitlist 56
│ [email] [Notify me ↗]                │
├──────────────────────────────────────┤ Feature 1 96
│ 01 · Live match center               │
│ Minute-by-minute scoring, xG, …      │
├──────────────────────────────────────┤ Feature 2 96
│ 02 · Group tables                    │
└──────────────────────────────────────┘ fold (4 more cards below)
```

### Home (HomeV1) — mobile re-order

```
┌──────────────────────────────────────┐ TopBar 48
├──────────────────────────────────────┤ Compact Pick'em banner 64
│ Pick'em · Bahasa · Live  [Sign in →] │
├──────────────────────────────────────┤ Live Now grid 240
│ TENNIS Round 3 · Sinner vs Moller    │
│ 2-2 — 6                              │
│ NBA Live · ORL vs DET 113-105 Final  │
│ EPL · MAN vs ARS 2-1                 │
├──────────────────────────────────────┤ Trending teams rail 96
│ HOR · MCL · OKC · CEL ⟶              │
├──────────────────────────────────────┤ Live Pulse 80
│ ● Awaiting tip-off …                 │
└──────────────────────────────────────┘ fold (Fans Reacting + Fangir below)
```

---

## 10 · Sequencing (mobile-first, strip-don't-add)

Each step ships independently with version bump + deploy verify. Stop at any "go" gate. Every PR cites the journey it advances.

### Sprint A · Bug bandage (1 day) → v0.10.1

- Add 7 missing i18n keys (`navTennis`, `navWorldCup`, `navNBA`, `navF1`, `skipToContent`, `copyLink`, `share`).
- Add `<Route path="/nba-playoffs-2026">` 308 redirect to singular.
- Mirror `sportColor.js` dark hexes into `--sport-*` CSS vars under `[data-theme="dark"]`.
- Bilingual-concat fix on skip-to-content via `t('skipToContent')`.

### Sprint B · `<HubStatusStrip>` + strip heroes (3 days) → v0.11.0

- Build `<HubStatusStrip>` (44 px desktop, 64 px mobile 2-row collapse).
- Strip visible hero from F1, Tennis, Super League. Move SEO h1 to `.sr-only`.
- Add `<HubStatusStrip>` to NBA + EPL (these gain a picker + actions, never had one).
- Build `<HubActionRow>` (Copy + Share). Dock right side of StatusStrip on every hub.

**Gate:** stopwatch test on a real iPhone. Land on each of 5 hubs; live data in fold within 2 seconds; no horizontal scroll.

### Sprint C · `<HubPicker>` + `<LiveStatusPill>` consolidation (2 days) → v0.11.5

- One picker component, one slot location (top-left of StatusStrip), every hub.
- Replace 5 different live/coming-soon/final/partial chips with `<LiveStatusPill>` 5-variant.

### Sprint D · `<ScheduleStrip>` + `<KpiStrip>` (2 days) → v0.12.0

- Build `<ScheduleStrip>` 5 variants. Migrate NBA / EPL / SL day-strips, F1 calendar, Tennis tournaments.
- Build `<KpiStrip>` 4-cell. Migrate F1 / EPL / NBA. Add to Tennis (currently missing).

### Sprint E · Editorial polish (2 days) → v0.12.5

- HomeV1 mobile reorder via CSS `order` (live grid → row 1, Pick'em banner → row 2).
- About / Glossary: compress hero to 24/16 mobile, add Share rail.
- **Derby reshape (NOT a new build).** Derby page already shipped at v0.15.0 — countdown inside hero below h1, h1 `clamp(28px, 6vw, 48px)`, side-picker chips inside hero block, full Supabase engagement layer (polling, reactions, oneliners, JSON-LD) live. Phase 2 changes ONLY hero composition: countdown moves above eyebrow, side-picker chips relocate below H2H strip on mobile, h1 swaps clamp for the locked 32/48/56 token from §6. **Engagement layer is off-limits — do not touch hooks, schema, or composer.**
- ComingSoon FIFA + IBL: identical layout, inline `<EmailCapture>`, 6-card grid breakpoint matrix. **Inline content slots from growth-track waitlist work must remain pluggable** — Phase 2 polish accepts content; growth-track owns content.

### Sprint F · Leaf pages restructure (3 days) → v0.13.0

- TeamPage / EPLClub / SuperLeagueClub / F1Race / F1Team / F1Driver / TennisTournament / TennisRankings — **all already shipped at Phase 1A**. Sprint F **restructures** them onto Shell A leaf with `<HubStatusStrip>`, strips leaf heroes, swaps full-bleed team-color washes for 4 px stripes on mobile. **Data hooks, API plumbing, SEO meta, and route shape are untouched.** This is purely a chrome migration — if a PR in Sprint F edits a `useEffect`, a fetch, or a `<SEO>` block, it's out of scope.

### ~~Sprint G · Language flip~~ — DROPPED 2026-04-26

Bahasa stays the default per `CLAUDE.md` core principle #3. The user-driven `id ↔ en` toggle in `AppContext` is sufficient. Strike from the sequencing block.

### Sprint H · Color rebalance (optional, behind flag) → v0.13.5

- `VITE_FLAG_SPORT_ACCENT_V2`: differentiate the 4 reds (NBA / F1 / Liga 1 / IBL) with secondary distinguishers in chips + icons. Saturated reds preserved on full-bleed surfaces only.

### Growth-track work — **parallel, NOT in this directive**

Owned outside Phase 2 in the same window:

1. **Derby share-card OG image generator** — Persija-Persib derby is 14 days out (10 May 2026 at JIS). Per-prediction shareable OG cards are the single biggest virality multiplier we can ship before kick-off. Bobotoh + Jakmania WhatsApp-share moment compounds for seasons.
2. **FIFA WC pre-launch teaser** — kickoff 11 June 2026, six weeks of SEO compound runway. Real content + waitlist capture wanted before Phase 2 polishes the page.
3. **Push notifications** — PWA shell already ships (service worker, manifest, install prompt, offline cache). Permission flow + per-favorite-team subscriptions are the highest-leverage retention lever still unpulled.

**Constraint on Phase 2 — 4 protected surfaces.** Phase 2 components must not regress these:

1. `/derby/persija-persib` (engagement layer)
2. `/fifa-world-cup-2026` (waitlist content slot)
3. PWA install prompt
4. Favorites store (AppContext schema)

Any Phase 2 PR touching one of these surfaces gets explicit "I touched protected surface X for reason Y" callout in the commit message + ship notes.

---

## 11 · Success criteria (the test)

A first-time English speaker on a 390-px iPhone, no prior session, can do all of the following without horizontal scroll, without scrolling past one screen of vertical content, and with WCAG AA hit on every text role:

1. Land on `/`. See **3 live match scores** in the first paint. (J1)
2. Tap a team chip in Trending Teams → land on team page → see last result + next fixture without scroll. (J2)
3. Tap the avatar → see Pick'em rank pill / sign-in CTA. (J3)
4. Tap a live match → see win-prob bar in fold. (J4)
5. Tap Yesterday rail → see Moment of the Day h1 + 4-game grid. (J5)
6. Toggle EN ↔ BI: every label translates except brand-locked nouns; no `navTennis` / `navWorldCup` leaks.
7. Toggle Dark ↔ Light: every surface swaps; no contrast regression; sport accents visible on chips both themes.
8. Resize from 360 → 720 → 1280: same shell, no layout collapse / overflow / clipped chevron.

If any one fails, the corresponding sprint hasn't shipped yet.

---

**End of directive.** Sprint A is a 1-day fix retiring the most visibly broken things on the live site (scope subject to §0.5 verification — Ade asserts some i18n keys may already exist at v0.15.1; if so, Sprint A trims). Sprints B–F build mobile-first consistency across every page — hubs, leaf, ComingSoon, editorial, transactional — without touching data, engagement, or SEO layers. Sprint G is dropped (Bahasa stays default per `CLAUDE.md` core principle #3). Sprint H is optional and flagged. Growth-track ships in parallel with 4 protected surfaces. Tell me to start Sprint A once §0.5 verification confirms scope, and I'll send the paste-ready Mac terminal block.
