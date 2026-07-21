# Handoff: Gibol Pick'em — Flagship (Paper)

Hi-fi design pass for **the Pick'em flagship inversion**: gibol.co's root becomes Pick'em-first. This bundle implements the 6-step build plan in `pickem-flagship/04-claude-code-design-prompt.md`, with mechanics from `03-game-mechanics.md`. It **supersedes the screen designs** in `design_handoff_pickem/` (Stadium Night) for all flagship surfaces; the Stadium Night bundle remains the reference for the dark theme, bracket builder, recap cards, and the component anatomy docs.

---

## ⚠ Rule change #1 — Language: English first, Indonesian second

All copy is now **English-first**. Indonesian appears second — as flavor, named mechanics, or secondary microcopy — never as the primary string. This reverses the Bahasa-first rule in the original build prompt (§ "Hard constraints" and § "Copy register").

- Named mechanics keep their Indonesian names where they ARE the feature: **Tebak Skor** (the exact-score format), the WA **colek** nudge concept (surface copy says "Nudge on WA").
- Every string still gets both i18n keys (`src/lib/i18n.js`); **EN is now the default locale**, ID is the toggle.
- Keep the casual register in EN ("your crew", "1 slot left"); ID secondary strings keep gue/lo.
- Currency (Rp) and timezone (WIB) stay Indonesian — market unchanged.

## ⚠ Rule change #2 — Lighter paper

The flagship lightens the Brand v1.0 paper stack. Port `flagship-overrides.css` and load it **after** `tokens.css` + `pickem-tokens.css`:

| Token | Brand v1.0 | Flagship |
|---|---|---|
| `--bg-deep` | `#DDE3EA` | `#E9EDF1` |
| `--bg-base` | `#EEF1F5` | `#F7F9FB` |
| `--bg-raised` | `#F8FAFC` | `#FFFFFF` |
| `--bg-elev` / `--bg-paper` | `#FFFFFF` | `#FFFFFF` |

Everything else (ink, lines, `--pickem-orange` family, state colors, type, motion durations) is unchanged and reads from the existing token sheets. The dark "Stadium" theme is untouched.

---

## What's in the bundle

Open `index.html` in a browser. Pan/zoom; click any artboard to focus. Section 04 is a working prototype — click inside the phone.

```
design_handoff_flagship/
├─ README.md                      ← you are here
├─ index.html                     ← canvas entry point
├─ tokens.css                     ← Brand v1.0 base tokens (unchanged)
├─ pickem-tokens.css              ← Pick'em extensions (unchanged)
├─ flagship-overrides.css         ← NEW: lighter paper + flagship motion — port verbatim
├─ design-canvas.jsx              ← canvas shell (presentation only)
├─ ios-frame.jsx                  ← iOS bezel (presentation only)
├─ js/
│  ├─ primitives.jsx              ← TEAMS, Flag, sample data (pass 1)
│  └─ legacy-components.jsx       ← pass-1 icons + dark components (icon source only here)
└─ flagship/                      ← THE DESIGNS — port these
   ├─ components.jsx              ← paper component set (F-prefixed)
   ├─ screens-acquisition.jsx     ← root home (mobile+desktop), wizard ×3, invite landing
   ├─ screens-play.jsx            ← Tonight, Tebak Skor, Bracket Lock, live standings
   ├─ screens-grup.jsx            ← group home, upgrade sheet, pricing
   ├─ wa-card.jsx                 ← WA matchday standings card (4:5 PNG artifact)
   ├─ teach.jsx                   ← the 90-second teach, interactive
   └─ main.jsx                    ← canvas assembler (presentation only)
```

These are **design references written in HTML + JSX**, not production code. Recreate them in the existing `src/pickem/` module (Vite + React 18 SPA, `react-router-dom`, lazy routes, CSS-in-JS + token sheets — all hard constraints from the build prompt still apply).

Flags in mocks are unicode emoji — use the production flag pipeline.

---

## Screen → build-step map

| Build step | Designed surface | File · component | Key behaviors |
|---|---|---|---|
| **1** First touch | "Tonight" tab (default for every member) | `screens-play.jsx` · `ScreenMalamIni` | Vertical stack of `FixtureTapCard`; one tap on a team row = one pick (44px+ targets, `aria-pressed`); slim Draw row; sticky `Lock Picks (N)` CTA in thumb zone; consensus bar reveals **after** pick (free) — pre-pick is locked behind a Gibol+ line. Bracket and group ranking are tabs, never first touch. |
| **2** Onboarding | `/buat-grup` wizard 1–3 + `/g/:code` invite landing | `screens-acquisition.jsx` | Step 1 name+competition; **step 2 opens with the game-type choice** (see below) then scoring template + `scoring_config` toggles; step 3 WA share + manual-entry upsell. Invite landing: public standings as social proof, "Start Picking Now", explicit no-login promise. |
| **3** Scoring (server) | Wizard step 2 surfaces every `scoring_config` field | `ScreenWizard2` | Underdog ×1.5 (`consensus_at_lock < 0.30`), streak +3, late-join median — all visible as commissioner toggles. Numbers below. |
| **4** Tebak Skor + live | Tebak Skor variant + live standings | `ScreenTebakSkor`, `ScreenLiveBoard` | Score steppers (0–9, default from pick) appear **after** the winner tap, never before. Live board: amber provisional chips (`--p-live` + pulsing dot) + "+10 if it stays like this" strip; provisional is client-side only, **never written to the DB**; 30s poll cadence. |
| **5** Group + commissioner | Group home, upgrade sheet, WA card | `screens-grup.jsx`, `wa-card.jsx` | Warm cap meter (9/10 · 1 slot left — never an error); "no pick yet · nudge on WA →" inline on the member row; commissioner panel with Pass-gated rows; **pending-member sheet**: member #11 held, "Rina wants to join 🎉 / She's waiting at the door", ghost option keeps her pending. WA standings card: 4:5 (1080×1350), top-5 + me-row + auto recap line + group link. |
| **6** Root swap | New `/` mobile + desktop ≥1024 | `ScreenRootHome`, `DesktopRootHome` | Hero sells to commissioners; live competition strip; proof bar; desktop fills the right rail with a live group-board preview. Pricing page (`ScreenHarga`): 4 tiers, 2 personas, legal note always attached to payment moments. |
| **Teach** | Interactive acceptance test | `teach.jsx` · `TeachProto` | Invite → Start Picking (tap 1) → tap a team (tap 2 = first confirmed pick, toast + consensus reveal) → Lock → magic-link sheet → merged + median start. The rail counts taps. **Acceptance: first confirmed pick ≤3 taps from landing, no login wall.** |

## The two game types (new since the wireframes)

Commissioner picks in wizard step 2; a group can run **both side by side**.

1. **Match by match** (default) — picks open per fixture, tonight-first, lock at kickoff. The daily-habit engine; everything in Step 1/4 above.
2. **Bracket Lock** (PlayoffPickems-style) — `screens-play.jsx` · `ScreenBracketLock`: lock each group's standings 1–4 **before the stage starts** (tap arrows to reorder; top-2 highlighted green; group switcher pills with ✓ for locked, "2/12 locked" counter); the knockout bracket derives from these standings. Sticky CTA "Lock Group C (4 pts)", perfect group = +8. Knockout preview card shows the escalation 10→30.

## Scoring spec (encode in `scoring_config` templates)

- Tebak Skor: exact **5** · result+margin **3** · result **2** · miss 0
- Bracket Lock: group position **4**/team · perfect group **+8** · R32 **10** · R16 **12** · QF **15** · SF **20** · Final **30** (≥55% of points alive post-groups)
- Underdog bonus: correct pick with `consensus_at_lock < 0.30` → **×1.5** (store consensus on the prediction row at lock)
- Streak: 3 correct in a row = **+3** flat, clean reset, never compounds
- Late join: pool **median** for missed rounds (commissioner toggle median/zero)
- Lock **per match at kickoff**; edits allowed until lock; edit history visible to commissioner

## Component inventory (flagship/components.jsx → src/pickem)

`FBtn` (primary orange/ink/secondary/WA-green/ghost, 12px radius) · `FPill` (6 tones) · `FBottomNav` (5 items: Picks · My Groups · Standings · Cards · Profile, orange active) · `FShell` + `FStickyCTA` (gradient fade, thumb zone) · `FixtureTapCard` + `TeamPickRow`/`DrawPickRow` (the pick verb) · `ConsensusBar` (`role="meter"`, locked + revealed states) · `FStepper` (0–9) · `FBoardRow` (me-row wash + left rule, provisional chip) · `FCapMeter` (warm amber at n≥cap−1) · `FSheet` (bottom sheet) · `FSteps`/`FField`/`FOptionCard` (wizard) · `StandingsRow` (bracket lock) · `FLegalNote` · `WAStandingsCard`.

Pick'em-orange on paper is `#9A3412` with **white** text (the Stadium Night set used dark-navy text on amber — do not reuse that pairing on paper).

## Motion (in flagship-overrides.css)

- Pick confirm: 280ms, scale 0.97→1 + `--p-up-wash` flash (`.f-confirm`)
- Post-pick reveal: 200ms fade-up 4px (`.f-reveal`) — consensus bar, steppers, toast
- Sheet: 240ms slide-up (`.f-sheet-up`)
- All `cubic-bezier(0.2,0.7,0.3,1)`, all disabled under `prefers-reduced-motion`

## Copy deck (EN primary · ID secondary)

| Surface | EN (primary) | ID (secondary key) |
|---|---|---|
| Hero | Your WA group's pick'em pool. | Pool pick'em buat grup WA lo. |
| CTA | Create a Group — Free | Bikin Grup — Gratis |
| CTA | Start Picking Now | Mulai Nebak Sekarang |
| CTA | Lock Picks (N) | Kunci Tebakan (N) |
| Consensus | 68% of your group picked Japan | 68% grup lo milih Jepang |
| Premium line | Consensus unlocks after you pick · Gibol+ sees it first | Konsensus kebuka abis lo nebak · Gibol+ liat duluan |
| Live | +10 if it stays like this | +10 kalau gini terus |
| Nudge | no pick yet · nudge on WA → | belum nebak · colek di WA → |
| Cap | 9/10 · 1 slot left | 9/10 · 1 slot lagi |
| Paywall | She's waiting at the door — your free slots are full. | Dia nunggu di pintu — slot gratis lo penuh. |
| Late join | Joining late? You can still win. | Telat gabung? Tetep bisa menang. |
| Recap line | Budi just overtook you — thanks, Morocco 😂 | Budi nyalip lo gara-gara Maroko 😂 |
| Banned | betting/odds language ("pasang", "taruhan", "odds"), formal Anda | — |

## Accessibility

- Every pick row is a `<button aria-pressed>`; selection shows border + wash + ✓ glyph (never color alone)
- `ConsensusBar` = `role="meter"` with label; provisional chips pair amber with the pulsing-dot glyph
- Tap targets ≥44×44 (52px team rows), ≥8px gaps via flex/grid `gap`
- Steppers have explicit aria-labels; focus ring via `--focus-ring`, never decorated

## Acceptance criteria (verify, don't trust)

1. Invite link → first confirmed pick in **≤3 taps**, no login wall (TeachProto demonstrates the exact sequence)
2. Consensus is **never** visible pre-pick on free; reveals within 200ms of confirm
3. Provisional points render from the live feed and are never persisted
4. Cap approach reads warm at 9/10; member #11 lands in pending, never an error
5. Legal note present on every payment surface
6. All original DoD items from `04-claude-code-design-prompt.md` §5 still apply (build, chunks, Lighthouse ≥85/95)

---

## Pending — known gaps NOT designed in this pass

Build these by extending the patterns above; ask before inventing new ones.

1. **Fixture card locked / live / scored states on paper** — only the open state is designed here. Port the state logic from `design_handoff_pickem/js/components.jsx` `FixtureCard` bodies onto `FixtureTapCard`, restyled with paper tokens.
2. **Bracket Lock knockout step** — only the standings step is designed. The knockout picker should reuse the Stadium Night stage-by-stage bracket pattern (`bracket.jsx`) on paper tokens.
3. **Cards tab** — the bottom-nav "Cards" destination (gallery of WA standings/recap cards + share sheet). `WAStandingsCard` is the first citizen; recap variants exist in the Stadium bundle.
4. **Magic-link-sent confirmation screen** (paper) — exists in the Stadium bundle; restyle.
5. **Offline / skeleton states** — "offline — saved on your phone" chip + skeleton rows for board/fixtures (use `.g-skel`).
6. **Public pool join flow** — root home links to it; not designed.
7. **Desktop reflows beyond root home** — use the established side-nav + 480px column + right-rail pattern when needed.
8. **Payments checkout** — out of scope by design (entitlements table only); upgrade sheet hands off to QRIS/GoPay.
9. **i18n keys** — every string in this bundle needs EN (default) + ID keys; the copy deck above seeds the table.
10. **Survivor on paper** — tab exists; screen remains Stadium-only for now.
