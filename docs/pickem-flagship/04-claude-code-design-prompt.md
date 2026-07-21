# Paste-ready prompt for Claude Code — Pick'em Flagship, Mobile-First Design

Copy everything below the line into Claude Code from `nba-playoffs-monitor/`. Companion docs: `pickem-flagship/01-strategy.md`, `02-wireframes.html`, `03-game-mechanics.md` (read order: 03 → 02 → this).

---

You are redesigning Gibol Pick'em into the flagship product at the root of gibol.co. This is **Phase A of the inversion** (see `../pickem-flagship/01-strategy.md` §4): the root home becomes Pick'em-first, all existing hub routes stay untouched at their current URLs. Mobile-first is non-negotiable — design at 390×844 first, desktop is the adaptation.

## 0. Read before any code

1. `docs/01-architecture.md` — stack source of truth
2. `pickem-flagship/03-game-mechanics.md` — the mechanics being built (core loop, scoring, formats)
3. `pickem-flagship/02-wireframes.html` — open in a browser; these are the 8 target screens
4. `design-handoff-pickem/pickem-tokens.css` — the Pick'em token sheet (Newsreader display serif + Inter Tight UI sans, paper + dark "Stadium" themes, `--pickem-orange` accent family, `--p-live`/`--p-up`/`--p-down` state colors, `--p-jagoan` multiplier tokens). **Use these tokens. Do not invent new colors or fonts.**
5. `src/pickem/` — the existing module: `PickemRoot.jsx`, `competitions.js` registry, `useCompetition.jsx`, `guestStore.js`, `api.js`, screens (`PredictingHub`, `Grup*`, `Leaderboard`, `Bracket`, `Survivor`, `Profile`). You are evolving this module, not rewriting it.

## 1. Hard constraints (violating any of these = stop and ask)

- **Stack:** Vite + React 18 SPA, `react-router-dom`, CSS-in-JS via the `COLORS` constant + `pickem.css`/token sheet. **No Tailwind, no new UI libraries, no 'use client', no Next.js idioms.**
- **Do not touch:** hub routes/components (`/nba-playoff-2026`, `/premier-league-*`, `/super-league-*`, `/formula-1-*`, `/tennis`, `/derby/*`, `/recap/*`), the scoring cron, `api/_lib/pickem/score-*.js`, Supabase auth flow, the service worker.
- **Lazy routes:** every new screen is `React.lazy()` — Pick'em code must live in its own chunks, never in `index-*.js`. (Verification gotcha: grep the screen's own chunk in `dist/assets/`, not the entry bundle.)
- **Bahasa-first, casual:** default copy ID (gue/lo register OK in nudges, neutral in tables), EN via the existing i18n dict (`src/lib/i18n.js`) — every new string gets both keys.
- **No secrets in code.** Billing keys etc. are Vercel env vars only.
- **Bundle budget:** Home chunk ≤ 90KB gz; any new screen chunk ≤ 60KB gz. No new runtime deps without asking.

## 2. Mobile-first design rules (apply to every screen)

- **Thumb zone:** primary action always within the bottom 40% of the viewport. Sticky bottom CTA bar (`position:fixed; bottom:0; padding-bottom:env(safe-area-inset-bottom)`) on pick screens.
- **Tap targets ≥ 44×44px**, ≥8px gaps between adjacent targets. The pick interaction is **one tap on the team row** — no drag, no long-press, no swipe-to-pick.
- **One column.** No side-by-side panels under 768px. The bracket tree view is the only horizontal-scroll surface, and it gets a scroll-snap per round + round tabs.
- **Bottom nav** (5 items, per wireframe screen 5/6): Tebak · Grup Gue · Klasemen · Kartu · Profil. Active state uses `--pickem-orange`. Hide on scroll-down, reveal on scroll-up.
- **Type:** Newsreader for display headlines (`--font-display`), Inter Tight for UI (`--font-ui-pickem`). Min body 14px, min hit-label 12px. Numbers in leaderboards get `font-variant-numeric: tabular-nums`.
- **Motion:** 150–200ms ease-out only. Pick confirm = scale 0.97→1 + `--p-up-wash` flash. Leaderboard rank change = single translateY slide. Respect `prefers-reduced-motion`.
- **Skeletons, not spinners**, for leaderboard + fixture lists. Offline (PWA): show cached picks with an "offline — tersimpan di HP" chip.
- **A11y:** every pick row is a `<button aria-pressed>`; consensus bars get `role="meter"` + label; color is never the only state signal (✓/✗ glyphs beside `--p-up`/`--p-down`).
- Test at 390×844 AND 360×800 (Android small). Desktop ≥1024px: center a 480px column, fill margins with the right-rail component (`HubRightRail.jsx` pattern).

## 3. Build order — 6 steps, ship-verify each before the next

### Step 1 — First-touch flow: today's match, not the bracket
Rework `PredictingHub` so the default landing for any member is **"Malam Ini"**: a vertical stack of today's fixture cards (reuse `FixtureCard.jsx`), one-tap pick, sticky "Kunci Tebakan (N)" bottom bar. Group-ranking and bracket move behind tabs (Fase Grup · Knockout · Survivor). After a pick is saved, reveal the consensus bar (free = post-pick only; premium chip placeholder for pre-pick). 90-second-teach acceptance test: a new guest from an invite link reaches a confirmed first pick in ≤3 taps from landing.

### Step 2 — Pool-first onboarding
New routes (lazy): `/buat-grup` (3-step wizard per wireframe screens 2–3: nama → aturan skor (template select + custom point fields + knockout-mode toggle) → WA share). `/g/:inviteCode` invite landing (wireframe 4): public leaderboard preview, "Mulai Nebak Sekarang" → guest picks via `guestStore.js`, magic-link login requested only at lock. Guest picks merge into the account on login (extend the existing guest merge path).

### Step 3 — Scoring config + new mechanics (server)
Migration `0019_pool_scoring_and_entitlements.sql`: `leagues.scoring_config jsonb`, `leagues.max_members int default 10`, `leagues.tier text default 'free'`; `predictions.predicted_home_score int`, `predicted_away_score int`, `consensus_at_lock numeric`; `entitlements` table (`user_id, product, provider, expires_at`). Teach `score-fixture.js` to read per-league `scoring_config` with fallback to `pickem_rules`; implement **underdog bonus** (correct pick with `consensus_at_lock < 0.30` → ×1.5) and **tebak-skor scoring** (exact 5 / result+margin 3 / result 2) exactly as specced in `03-game-mechanics.md` §B. Unit-test the scoring functions (happy + boundary: consensus exactly 0.30, draw results, walkover).

### Step 4 — Tebak Skor UI + live provisional points
Fixture card gains an optional score-entry variant (two steppers, 0–9, default 0-0, still thumb-only) when the grup's format includes tebak skor. Leaderboard gains **live mode**: during in-progress fixtures, show provisional points (`+10 kalau gini terus`) computed client-side from the live score feed, visually distinct (`--p-live` amber, pulsing dot), never written to the DB. Reuse the existing 30s live-poll cadence — no new polling loops.

### Step 5 — Grup home + commissioner panel
`/grup/:id` per wireframe 6: leaderboard with me-row highlight, member status ("belum nebak" + WA colek deep-link `https://api.whatsapp.com/send?text=…`), commissioner panel (edit scoring before first lock, manual entry, member cap meter "9/10"). **Pending-member upgrade sheet:** member #11 joins → held as pending, commissioner sees the upgrade sheet (social-pressure paywall, per `03` §C). Matchday standings card = static PNG share (reuse the recap-PNG pattern, `recapCards.jsx`).

### Step 6 — Root home swap (Phase A flag)
New `/` per wireframe 1 behind `VITE_FLAG_PICKEM_HOME=1`: pool hero, live competition strip from `competitions.js`, create-grup CTA, "Skor & Berita ↗" nav to the existing hubs, pricing teaser. Old Home stays the fallback when the flag is off. OG meta + JSON-LD (WebSite + SoftwareApplication) for the new home.

**Out of scope for this pass (do NOT build):** payments/checkout (entitlements table only), confidence mode, EN landing pages, skor.gibol.co migration, badges surfacing, in-app chat (never).

## 4. Copy register (examples to match)

- CTA: "Bikin Grup — Gratis" · "Kunci Tebakan" · "Mulai Nebak Sekarang"
- Nudge: "Joko belum nebak — colek di WA 👉" · "1 slot lagi, grup lo makin rame"
- States: "Telat gabung? Tetep bisa menang." · "offline — tersimpan di HP"
- Never: betting/odds language ("pasang", "taruhan", "odds"), formal Anda in the play surfaces.

## 5. Definition of done (verify, don't trust the build)

1. `npm run build` clean; new screens in their own chunks (check `dist/assets/`).
2. Push to `origin/main`, then **curl-verify live**: `curl -s https://www.gibol.co/assets/index-*.js | grep APP_VERSION` bumped; if stale, `npx vercel --prod --yes --force` (known alias-lag hazard).
3. Walk the 90-second teach on a real phone viewport (DevTools 390×844): invite link → first confirmed pick in ≤3 taps, no login wall.
4. Run the scoring unit tests; manually score one fixture against a grup with custom `scoring_config` and one with the `pickem_rules` fallback.
5. Lighthouse mobile on `/` and `/g/:code`: Performance ≥ 85, a11y ≥ 95.
6. Update `src/lib/version.js` ship notes + `docs/00-current-state.md`.

Work step by step. After each step, report what shipped, what's verified, and what's next — one paragraph, no ceremony.
