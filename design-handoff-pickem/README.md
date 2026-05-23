# Handoff: Gibol Pick'em — Stadium Night

A focused design system + interactive prototype for **Gibol Pick'em**, a free-to-play, Bahasa-first sports prediction game launching with Piala Dunia 2026. Mobile-first, dark-themed, designed to be screenshot-and-WhatsApp shareable.

---

## Overview

This handoff covers:

- The **Stadium Night design system** (dark substrate, amber sole accent, mono numerals as heroes, Newsreader on display moments only) — chosen out of three explored directions.
- An **interactive prototype** of the full feature surface: predicting hub, fixture detail, leaderboard, grups, bracket builder, survivor, profile, recap/share, plus auth and system states.
- A **bracket builder** that actually works on a 390-wide screen — stage-by-stage paging with per-stage interaction patterns (group selector vs knockout list vs final hero vs champion).
- A **recap card** in Kartu Bola grammar (paper substrate, slim flag rail, oversized mono numerals) — built for the WhatsApp screenshot moment.
- A **desktop reflow** that uses the exact same components, never a parallel design.
- **Bahasa copy deck**, **WCAG 2.2 AA** notes, **motion spec**, and **four user-flow diagrams**.

## About the design files

The files in this bundle are **design references written in HTML + JSX**. They are interactive prototypes — not production code to copy verbatim. The task is to **recreate these designs in gibol.co's existing codebase** using its framework (React/Vue/Svelte/whatever it is), its router, its data layer, and its existing component library where one exists.

The **CSS tokens** (`tokens.css` + `pickem-tokens.css`) **should be ported verbatim** — token names, values, and structure are the contract. Components throughout the system read these tokens, never inline hex.

## Fidelity

**High-fidelity.** Final colors, type, spacing, radii, shadows, motion. Recreate pixel-perfectly using the codebase's existing libraries and patterns.

Team flags in mocks use **unicode flag emoji** — replace with the gibol.co flag pipeline (CDN SVGs or a country-flag-icons package) in production. Country emoji are fine for prototyping but render inconsistently across platforms.

---

## What's in the bundle

Open `index.html` in a browser to see the full design canvas. Pan/zoom; click any artboard to focus.

```
design_handoff_pickem/
├─ README.md              ← you are here
├─ index.html             ← canvas entry point
├─ tokens.css             ← Pulse & Field (paper) base tokens — port verbatim
├─ pickem-tokens.css      ← Pick'em extensions (dark theme, Newsreader, accents)
├─ design-canvas.jsx      ← canvas shell (presentation only, not for prod)
├─ ios-frame.jsx          ← iOS bezel (presentation only)
└─ js/
   ├─ primitives.jsx      ← sample data, Flag component, status pills
   ├─ components.jsx      ← THE DESIGN SYSTEM — port these first
   ├─ screens.jsx         ← mobile screen layouts
   ├─ bracket.jsx         ← bracket builder + state hook + lock modal
   ├─ recap.jsx           ← share card variants (Kartu Bola grammar)
   ├─ desktop.jsx         ← desktop reflows
   ├─ prototype.jsx       ← interactive flow with router
   ├─ pass2-doc.jsx       ← system anatomy / motion spec / component inventory
   ├─ pass4-doc.jsx       ← flows / copy deck / a11y
   └─ main.jsx            ← canvas assembler (presentation only)
```

---

## Design tokens

All tokens live in `tokens.css` + `pickem-tokens.css`. Port both into the codebase's token sheet.

### Dark theme (default) — Stadium Night

Set via `[data-theme="dark"]` on a subtree root (typically `<html>` or `<body>`).

| Token | Hex | Use |
|---|---|---|
| `--bg-deep` | `#06101D` | recessed (rails, behind cards) |
| `--bg-base` | `#0A1628` | page background |
| `--bg-raised` | `#0F1E36` | cards, sheets |
| `--bg-elev` | `#16273F` | tooltips, popovers, raised states |
| `--ink-1` | `#E6EEF9` | primary text (17:1) |
| `--ink-2` | `#B6C4D8` | secondary (10:1) |
| `--ink-3` | `#9FB4CC` | tertiary (7:1) |
| `--ink-4` | `#6B7B92` | placeholder / disabled (UI only, never body) |
| `--pickem-orange` | `#F59E0B` | **CTA + accent (10.4:1 on dark)** |
| `--pickem-orange-deep` | `#D97706` | pressed |
| `--p-live` | `#FBBF24` | LIVE signal — pulses, sacred |
| `--p-up` | `#34D399` | win / positive (8.9:1) |
| `--p-down` | `#F87171` | loss / negative (5.8:1) |
| `--p-info` | `#60A5FA` | neutral notice / focus ring |

### Light theme (paper) — for users who toggle

The paper stack from `tokens.css` (`--bg-base: #EEF1F5`) auto-takes over. **Critical:** on paper, swap `--pickem-orange` from `#F59E0B` to `#9A3412` — bare amber fails AA on paper (≈2:1) while orange hits 7.4:1. This swap is already wired in `pickem-tokens.css`.

### Type

```css
--font-display:   'Newsreader', Georgia, serif;
--font-ui-pickem: 'Inter Tight', system-ui, sans-serif;
--font-mono:      'JetBrains Mono', ui-monospace, monospace;
```

**Type scale:**

| Class | Family | Size / Weight | Use |
|---|---|---|---|
| `p-display` | Newsreader | 44px / 600 | hero pages |
| `p-display-sm` | Newsreader | 28px / 600 | section headers |
| `p-headline` | Newsreader | 22px / 500 | secondary headers |
| `p-headline-it` | Newsreader italic | 18px / 500 | asides, "vs" |
| `p-body` | Inter Tight | 15px / 400 | body |
| `p-bodysm` | Inter Tight | 13px / 400 | small body |
| `p-label` | Inter Tight | 13px / 600 | labels |
| `p-eyebrow` | Mono | 11px / 500 / 0.10em / uppercase | section markers |
| `p-score-xl` / `lg` / `md` / `sm` | Mono | 56 / 40 / 28 / 18 | numerals (tabular) |

**Rules:**
- **Newsreader appears only on big editorial moments** — page H1, section headers, the matchup names on RecapCard, "vs" italic. Never on UI chrome, buttons, or labels.
- **All numerals are mono with tabular-nums.** No exceptions. Scores, points, odds, countdowns, ranks, percentages.
- **Inter Tight does everything else.** Buttons, body, navigation, form fields.

### Radii & spacing

`--r-1: 4 · --r-2: 8 · --r-3: 12 · --r-4: 16 (sheets) · --r-pill: 999`. Cards 12-14, sheets 20, buttons 999.

Spacing scale on 4pt grid: 0/4/8/12/16/20/24/32/40/48/64.

Touch targets ≥ 44px on mobile. Primary CTAs 52px.

### Motion

```css
--ease-out: cubic-bezier(0.2, 0.7, 0.3, 1);
--dur-1: 120ms;  /* hover/press */
--dur-2: 200ms;  /* tab switches */
--dur-3: 320ms;  /* sheets, page changes */
```

Six named moments — durations in `js/pass2-doc.jsx#MotionSpecCard`:
- **pick-confirm** (180ms) — outcome fill + subtle scale
- **points-tally** (900ms) — count-up + chip stagger
- **rank-change** (320ms) — FLIP translateY
- **lock** (240ms) — body collapse + lock pill swap
- **recap-reveal** (600ms) — backdrop fade + slide-scale
- **live-pulse** (1.6s loop) — amber dot expanding ring

All respect `prefers-reduced-motion: reduce`.

---

## Component library (`js/components.jsx`)

The system is built around ~30 components. Port these first; everything else composes from them.

### Data display
- **StatePill** — `open / locked / live / scored / missed`. Mono uppercase pill, live has pulse dot.
- **ProbabilityChip** — mono % with optional label, used in fixture odds.
- **LockCountdown** — `🔒 hh:mm:ss` in mono, flips live-amber on urgency.
- **PointsPill** — `+N` mono, big when feature-level, with tone (up/down).
- **ScoreBreakdown** — row of additive chips: `Dasar +3 × Jagoan +2 × Upset +0`.
- **RankBadge** — `#N` mono with `▲/▼` movement arrow.
- **StreakFlame** — `🔥 N` mono in live-amber.
- **Badge** — achievement card with icon · label · sublabel · locked variant.

### Input
- **OutcomePicker (1X2)** — three-column radiogroup. Mono code (`1/X/2`) leads each option, label is the outcome name, probability shown as mono %. Selected = amber fill, ink-1 text.
- **ScoreStepper** — `− / mono N / +`. Two sizes (md / lg). Bound to numeric state.
- **JagoanToggle** — outlined orange pill when off, filled when on. Compact `×2` chip variant for confirmed picks.
- **SegmentedPicker** — 2-4 short options inline, pill-style. For tabs that aren't quite tabs (e.g. leaderboard scope).
- **Tabs** — horizontal-scroll tabs with optional count badge. Active gets a 2px amber underline.
- **Toggle** — 44×26 amber pill switch for boolean settings.

### Surfaces
- **FixtureCard** — the hero component. Four states (open/locked/live/scored/missed), compact mode for embedded use. State logic in `FixtureBodyOpen/Locked/Live/Scored`. Reads `data.state` to render the right body.
- **LeaderboardRow** — 3-column grid: rank/avatar · name · points. `you` variant: amber-washed background, 3px left rail.
- **GrupCard** — avatar tile + name + movement. Color comes from `grup.color` / `grup.colorFg` per grup.
- **EmptyState** — icon · title · body · action · tone (default/soon/error). Used everywhere an info dialog would be.
- **RecapShell + RecapBigWin / RecapUpset / RecapGrupUp** — share-card 4:5 in Kartu Bola grammar. Paper substrate, slim flag rail, mono numerals huge. See "Recap card" below.

### Chrome
- **BottomNav** (mobile) — 4 top-level destinations: **Prediksi** (today’s matches, primary action), **Papan** (leaderboards), **Grup** (your grups), **Profil** (you). 70px tall, padding-bottom 18 (home indicator clearance). Active item: amber icon + label, `aria-current="page"`.
- **SideNav** (desktop) — 220px wide. Same 4 top-level + Bracket + Survivor surfaced explicitly (they’re modal entries on mobile). Active: bg-elev + amber text + 3px left rail.
- **BackBar** — sticky 52px top bar, back button is a 44×44 hit target, title centered, action on the right.
- **PageHeader** — eyebrow (mono uppercase) + display headline.
- **Toast** — `success / info / error` tones. Top-center on mobile. Polite live region.
- **ScreenInviteSheet** — bottom sheet, 20-radius corners, drag handle on top.

### Atomic
- **PickemBtn** — `primary / secondary / ghost / inverse` × `sm / md / lg`. Pills (radius:999), Inter Tight 700, 44+ height.
- **Flag** — emoji rendered in a clipped rounded rect. Replace with real SVGs in production.
- **Icons** — `Home / Target / Users / User / Back / Share / Bell / Search / Check / Plus / WhatsApp / Lock / Star`. Inline SVG, currentColor strokes.

---

## Screens (`js/screens.jsx`, `bracket.jsx`, `recap.jsx`)

All screens are mobile-first, designed at 390×844 (iPhone 14/15 logical size).

| Screen | File | Notes |
|---|---|---|
| Predicting Hub (“Prediksi”) | screens.jsx#ScreenPredictingHub | Today's fixtures stacked. Progress strip with countdown. Primary destination from bottom nav. |
| Fixture Detail | screens.jsx#ScreenFixtureDetail | Hero scoreboard, four tabs (Prediksi/Peluang/H2H/Susunan), sticky bottom CTA. |
| Leaderboard | screens.jsx#ScreenLeaderboard | Podium for top 3, list below, sticky "you" row at bottom. SegmentedPicker for scope (Global/Grup/Pekan). |
| Grup List | screens.jsx#ScreenGrupList | Grups + Bikin/Gabung CTAs + dormant teaser. |
| Grup Home | screens.jsx#ScreenGrupHome | Hero with avatar + code + your position chip, then leaderboard. |
| Grup Empty | screens.jsx#ScreenGrupEmpty | The "1 member" state — the most important one to design well. WhatsApp CTA is the only thing on the screen. |
| Grup Create | screens.jsx#ScreenGrupCreate | Form with name + color swatches + mode toggles. |
| Invite Sheet | screens.jsx#ScreenInviteSheet | Bottom sheet with code + WhatsApp CTA. |
| Survivor (Fan Terakhir) | screens.jsx#ScreenSurvivor | Pick screen + used-teams strip + alive status. |
| Profile | screens.jsx#ScreenProfile | Avatar + 3-stat grid + badges grid + recent history. |
| Magic-link sent | screens.jsx#ScreenMagicLinkSent | Confirmation + spam hint + resend. |
| Offline | screens.jsx#ScreenOffline | EmptyState with retry; offline-saved promise. |
| First-run nudge | screens.jsx#ScreenFirstRunNudge | Auto-appears 2s after first prediction. Bottom sheet, Google login. |

## The bracket builder (`js/bracket.jsx`)

The hardest responsive problem in the product. 48 teams → 32-team knockout on a 390-wide screen.

**Solution: stage-by-stage paging with a sticky stepper.**

- `Group → R32 → R16 → QF → SF → Final → Champion` — 7 stages, one at a time.
- The **stage stepper** is sticky-top. Tap any completed stage to revisit. Locked-ahead stages are visibly disabled.
- Each stage uses **its own interaction pattern**, not a generic one:
  - **Group:** 12 groups, swipeable via letter pills with prev/next arrows. Within each group, tap `1`, `2`, or `3` on a team to assign rank. Toggle off by tapping the same rank again. Picks are exclusive per rank — assigning 1 to a new team clears the previous 1.
  - **Knockout (R32/R16/QF/SF):** vertical list of matchups. Tap a team row to advance them. Selected row gets amber wash + 3px left rail. Tap again to deselect.
  - **Final:** solo card, ceremonial. Teams rendered big (40px Newsreader names, 56px flag), trophy appears next to the selected.
  - **Champion:** trophy + flag + name in 36px Newsreader. Potential-points and potential-rank summary. Lock CTA on the persistent bottom strip.
- **Persistent mini-strip** at the bottom of every stage: total picks made (`N / 68`) + Champion preview (flag + short code) once final is set.
- **"Pilih semua favorit"** — one-tap auto-fill from odds. Demonstrably fills every stage. Toast confirms with a hint to edit.
- **Reset** clears all picks.
- **Lock confirmation** — modal with consequences in plain Bahasa, shows your locked champion in a chip. Cancel/confirm.

**State management lives in `useBracketState()`** — a custom hook with:
```
{
  groups, r32, r16, qf, sf, final, champion,
  setGroupPick(group, team, rank),  // rank: 1|2|3, null=clear
  setKnockoutPick(stage, matchId, team),
  setFinalPick(team),
  setChampion(team),
  autoFill(),
  reset(),
  counts,  // picks per stage
}
```

Port this hook directly. The exclusive-rank logic and the toggle-off-when-tapping-same behavior are non-trivial — keep the semantics.

## Recap card (`js/recap.jsx`) — Kartu Bola grammar

The share moment. Three variants:

1. **RecapBigWin** — green rail, big mono points number on a green fill, list of flags. For "you nailed 4/5 this week."
2. **RecapUpset** — amber rail, scoreboard hero with the upset score, breakdown showing the upset multiplier. For "you nailed the underdog."
3. **RecapGrupUp** — orange rail, mini grup leaderboard with your row highlighted. For "you climbed to #3 in your grup."

**Design choices that earn the variation:**
- Paper substrate (`--bg-paper: #FFFFFF`) — readable at IG/WA story aspect.
- Slim 8px flag-color or accent rail on top — variant color cue at thumbnail size.
- Newsreader for the headline + name; mono for points + scores; Inter Tight for body.
- 4:5 designed dimensions (320×400 in mocks; produce at 1080×1350 server-side for actual posts).
- Footer: amber Gibol square + `GIBOL.CO` mono mark + `PICK'EM · WC 2026` eyebrow. Recognizable without a full logo.

**`ScreenShareSheet`** wraps the recap card in a modal with a SegmentedPicker to swap variants live, then a single primary "Bagikan ke WhatsApp" CTA.

## Desktop reflow (`js/desktop.jsx`)

Same components, side-nav + content + right rail. Never a parallel design — every piece is a direct port of the mobile screen.

- **DesktopPredicting** — Predicting hub on 1280. SideNav 220 + main column with 2-col fixture grid + right rail (your position card, grups, jagoan teaser).
- **DesktopLeaderboard** — Same podium pattern, just wider; sticky-you row at the bottom of the table.
- **DesktopBracketView** — Full tree visible at once. R16 columns on each side, QF/SF/Final stacked toward center, champion in the middle. Read-only visualisation — phone is the action layer.

## Interactive prototype (`js/prototype.jsx`)

`PickemPrototype` is a fully working interactive flow — tap inside the phone to navigate:

- Land on **Predicting Hub**.
- Tap a fixture → **Fixture Detail** with the pick UI.
- After 2s the **first-run nudge** appears with "Login with Google" / "Nanti aja".
- Tap "Login" → **Magic-link sent** screen.
- Bottom nav: Hub / Prediksi / Grup / Profil.
- The **"Jump to" panel** on the right is for demo navigation — it leaps to any screen including Bracket, Survivor, Leaderboard, Offline, etc. Remove from production; it's a presenter aid.

State is local; this is a design prototype, not a production app shell. Adapt to the codebase's routing.

---

## Interactions & behavior

### Predict-first principle

The first prediction must be reachable in **≤2 taps with no login**:
1. Tap fixture card on Hub → Fixture Detail
2. Tap outcome (1/X/2) → already selected, predictions stored on device-ID

The first-run nudge appears **after** the first save, framed as upside ("Mau ikut peringkat?") not blocking. "Nanti aja" is real — predictions stay saved locally and auto-merge when the user eventually logs in (via the magic-link claim-guest flow in `screens.jsx#ScreenMagicLinkSent`).

### Lock semantics

- A fixture locks at kickoff. The transition is a **lock motion** (240ms): body collapses, status pill flips from `TERBUKA` to `TERKUNCI` with a lock icon, subtle inset shadow appears.
- The bracket locks once on user confirmation. After that, the bracket is immutable until tournament end — communicated in plain Bahasa in the lock modal. The user can still play matchday + survivor.
- Locked content surfaces a polite live-region announcement: "Prediksi dikunci."

### Live state

- Amber LIVE pill with pulsing dot is **sacred** — only for in-play. Never used for errors, loading, or LIVE-styled badges that mean something else.
- During a live match, the FixtureCard surfaces `data.minute` (e.g. `75'`) and your prediction's running status ("Skor pas masih mungkin" / "On track" / "Tinggal 1 gol lagi"). Score updates throttle to 5s for the live region.

### Sharing

- Every screenshot-worthy moment ends with a confirmation **toast**. "Link disalin · siap dibagikan."
- The share sheet (`ScreenShareSheet`) lets users swap between 3 recap variants before sharing.
- WhatsApp share uses native intent on mobile, Web Share API where available, falls back to "copy link" with toast.

### Navigation

- Back button on `BackBar` always works — even on deep-link entries it falls back to home, never a no-op.
- Bottom nav uses `aria-current="page"`. Visual style derives from that attribute — no separate "active" class.

---

## Accessibility (WCAG 2.2 AA — design-owned)

Annotated inline in `js/pass4-doc.jsx#A11yCard`. Cross-cutting rules:

- **Contrast verified.** All ink/bg pairs ≥7:1 except `ink-3` which is AA-large only (banned for body copy under 14px). Amber CTA 10.4:1 on dark, orange CTA 7.4:1 on paper. **Never use bare amber on paper** — see token swap note above.
- **Outcome & result never colour-alone.** Win = green + ▲ + "Naik". Loss = red + ▼ + "Turun". LIVE = amber + pulse + "LIVE" text.
- **Focus.** `:focus-visible` only — never `:focus`. 3px outer ring at `--info` on dark; on amber CTAs, white inner + amber outer.
- **Touch.** Min 44×44 everywhere. Primary CTAs 52. Flag chips are decorative — never the tap target on a row; the whole row is.
- **Keyboard.** Bracket builder is fully keyboard-completable. Tab → group, Arrow → team, Space → cycle 1/2/3. Knockout rows: Tab to focus, Space/Enter to pick.
- **aria-current** on active nav, sport, tab. Visual style derives from attribute, never a separate class.
- **Live regions.** Loading / partial / stale / coming-soon → polite. Errors → assertive. Toasts → polite. Live score updates → polite, throttled to 5s.
- **Reduced motion.** Pulse dot freezes. Recap-reveal cross-fades only. Points-tally shows final value instantly. Tab transitions become instant.
- **Validation.** Login form uses `aria-invalid` + `aria-describedby`; errors in Indonesian. **Disable browser-native validation tooltips** so we never see English "Please fill out this field" on an Indonesian form.

Screen-reader labels (Bahasa) are documented in `pass4-doc.jsx#A11yCard`. Every icon-only button has an `aria-label` in Indonesian.

---

## Copy deck — Bahasa Indonesia

Full strings per screen in `js/pass4-doc.jsx#CopyDeckCard`. Register rules:

- **Casual register.** "Kamu" in chrome (not "Anda"). "Gue/lo" only in editorial / playful surfaces.
- **Preferred vocabulary:** `prediksi · poin · grup · jagoan · peluang · skor pas · papan peringkat · ajak teman`.
- **BANNED (legal):** `taruhan · judi · jackpot · pasang`. Odds are always `peluang` — never framed as money or stake.
- **No gambling visual tropes** anywhere — no chips, coins, slots, jackpot flashing. Reflected in components and copy.
- **EN-toggle (v1):** ships with `(Beta)` label. Partial translations are honest; a banner reveals when partial.

---

## State management notes

For a React/Vue/Svelte port, the state you'll need:

**Page-level**
- `state` (drives `<StateView>` if you use a shared loading/empty/error envelope)
- data payload (fixtures, leaderboard rows, etc.)

**App-level**
- `user` (null when anonymous; device-ID for guest predictions)
- `locale` (`id` / `en-beta`)
- `theme` (`dark` / `paper`)
- `prefersReducedMotion` (read once at mount)

**Surface-level**
- `isLoading`, `lastUpdated`, `error`, `partialSources` — all consumed to derive states.

**Bracket-specific** — port `useBracketState()` from `js/bracket.jsx` directly. The exclusive-rank-per-group logic, the toggle-off-when-same-tapped behavior, and the autoFill semantics matter.

---

## Open questions for product

These should be resolved before code lands:

1. **First-run nudge timing** — designs use 2s delay after first save. Confirm with analytics whether it should be event-driven (after first save) or time-windowed (after N seconds idle).
2. **Bracket auto-fill source** — currently uses odds. Should it also weight recent form or H2H? Default: odds only, document the math in the EmptyState info chip when auto-fill is invoked.
3. **EN-toggle in v1** — recommendation: ship with `(Beta)` label. Honesty beats absence; SEO indexes leakage anyway.
4. **Recap aspect** — designed at 4:5 for IG/WA story. Should we also generate 1.91:1 for X cards? Recommendation: not in v1. Server-side OG image from same data.
5. **Survivor reset cadence** — restart each matchday, each tournament, or perpetual? Designs assume per-tournament.
6. **Stale-content policy** — fixtures older than the matchday should drop from prediction views but resolve their deep-links for SEO.

---

## How to view the designs

Open `index.html` in a browser. The design canvas presents every artboard by section:

1. **00 · Commit** — direction rationale
2. **01 · System** — tokens, component inventory, motion spec
3. **02 · Mobile screens** — all mobile screens with iOS frames
4. **03 · The phone bracket** — 4 artboards covering the bracket interaction
5. **04 · Recap** — 3 variants + in-app share sheet
6. **05 · Desktop reflow** — predicting + leaderboard at 1280
7. **06 · Interactive prototype** — fully interactive phone with "Jump to" panel
8. **07 · Critical flows** — 4 user journeys, step-by-step
9. **08 · Copy deck** — every string, organized by surface
10. **09 · Accessibility** — verified contrast, SR labels, cross-cutting rules

Pan/zoom inside the canvas. Click any artboard to fullscreen-focus it (Esc to return).

---

## Assets

- **Fonts:** Newsreader + Inter Tight + JetBrains Mono — loaded from Google Fonts in the mocks. Self-host in production with `font-display: swap`. Subset for Latin Extended (Bahasa Indonesia uses standard Latin).
- **Team flags:** Unicode emoji in mocks. Production should use the gibol.co flag pipeline (CDN SVG icons, e.g. `country-flag-icons`). The placeholder colors in `COUNTRY_COLORS` map (in `primitives.jsx`) are useful as fallback solid colors when an SVG fails to load.
- **Icons:** Inline SVG in `components.jsx`. Production should swap to the codebase's icon library; the SVG paths are simple and use `currentColor` strokes so they map cleanly.

---

## Definition of good (acceptance criteria from the brief)

- ✅ **The fixture card passes a 5-second test.** Score + flags + state pill read instantly.
- ✅ **First prediction in ≤2 taps with no login.** Hub → fixture → pick. Saved locally; first-run nudge afterward.
- ✅ **Identical component vocabulary** across mobile and desktop. Desktop reflows, never re-skins.
- ✅ **All four fixture states + every non-success state** designed.
- ✅ **No gambling visual tropes.** Odds shown as `peluang`, no chips / coins / jackpots.
- ✅ **Amber-on-cream AA rule** respected — orange #9A3412 used on paper, amber only on dark and as live signal.
- ✅ **Primary actions single-thumb reachable** on a phone. ≥44px targets, primary CTAs in the thumb zone (sticky bottoms).
- ✅ **The bracket works on a phone** — stage-by-stage paging with per-stage interaction patterns. Demonstrably interactive in `js/bracket.jsx`.
