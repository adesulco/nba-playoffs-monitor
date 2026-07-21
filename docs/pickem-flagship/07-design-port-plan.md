# 07 — Design-Port Plan (zero design-support model)

**Date:** 2026-06-11 · Source bundle: `Projects/Gibol/design_handoff_flagship/` (from `Gibol.co (2).zip`) · Owner of execution: Claude Code · Amends `00-HANDOVER.md` §3 Track B with concrete tickets.

## 0. The operating principle Ade asked for: "we don't have to support the design"

The bundle is **absorbed once and then dead**. Production owns everything:

1. **Tokens + motion** port into `src/index.css` under the existing `[data-brand="paper"]` block (NOT a parallel stylesheet to keep in sync). ✅ Done in D0.
2. **Components** port once into `src/pickem/components/flagship.jsx` (the F-prefixed set), built on the production token sheets and the existing primitives where they overlap. After the port, design changes happen in production code — the bundle is never edited or re-imported.
3. **Screens** are rebuilt (not copied) in `src/pickem/` consuming Track A's API seam (`src/pickem/api.js` JSDoc'd functions only).
4. The bundle stays at `Projects/Gibol/design_handoff_flagship/` as a **read-only reference**, outside the repo. Open `index.html` to compare; never import from it.
5. Gaps the pass didn't design (README "Pending" list: locked/live/scored card states on paper, KO bracket step, Cards tab, magic-link confirm, skeletons, public-pool join, desktop reflows, checkout, Survivor-on-paper) are built **by extending production patterns** — no new design round-trip required. That's the "no support" guarantee: the system is tokens + primitives + established patterns, and every gap is expressible in them.

## 1. Rule changes accepted (with one flag)

- **EN-first copy:** the i18n default is ALREADY `en` in prod (AppContext). The rule's real content: new strings get EN as the primary key, ID secondary; named mechanics keep ID names (Tebak Skor, colek). **Flag (said once):** prerendered SEO copy on hub/team/player pages stays Bahasa — that's the 216-URL moat; this rule governs product UI copy, not SEO surfaces.
- **Lighter paper site-wide:** `[data-brand="paper"]` bg tokens now carry the flagship values; `VITE_FLAG_BRAND` default flipped to 1; brand storage key versioned `:v2` so returning visitors actually get the flip. Rollback: env `VITE_FLAG_BRAND=0` (instant, no deploy needed beyond redeploy) or `?brand=default` per-session.
- Pick'em-orange on paper = `#9A3412` with **white** text (never the Stadium amber/navy pairing).

## 2. Ticket map (D-series = design port; interleaves with Track A)

| # | Ticket | Depends on | Window |
|---|---|---|---|
| **D0** ✅ | Token flip: flagship paper values + motion classes + brand default 1 + storage key v2 | — | shipped v0.80.0 |
| **D1** | `flagship.jsx` component set: FBtn, FPill, FShell+FStickyCTA, FBottomNav, FixtureTapCard (+TeamPickRow/DrawPickRow), ConsensusBar, FStepper, FBoardRow, FCapMeter, FSheet, FSteps/FField/FOptionCard, StandingsRow, FLegalNote. Each built on tokens; states (locked/live/scored) extended from the Stadium FixtureCard logic | D0 | now |
| **A3** | Dispatcher actions (server seam for D3/D5) | 0019 ✅ | now (parallel) |
| **D2** | "Tonight" tab = the new default member surface: FixtureTapCard stack, tap-to-pick, post-pick consensus reveal (free) / pre-pick Gibol+ line, slim Draw row, sticky Lock CTA, lock countdown chips (R1-6) | D1 | Jun 12–14 |
| **D3** | `/buat-grup` wizard ×3 + `/g/:code` invite landing (guest picks, no login wall, ≤3-tap acceptance) | D1+A3 | Jun 13–16 |
| **D4** | Tebak Skor steppers post-winner-tap + live standings board with provisional chips (A9 hook) | D1+A9 | Jun 15–17 |
| **D5** | Group home + commissioner panel + warm cap meter + pending-member sheet + `/harga` pricing (entitlement gates A5; checkout stub until R3) | D1+A3+A5 | Jun 16–20 |
| **D6** | Root home swap (`/` = ScreenRootHome/DesktopRootHome) behind `VITE_FLAG_PICKEM_HOME`, WA standings card (4:5 PNG), TeachProto acceptance run | D2+D3 | Jun 18–22 |
| **D7** | Gap fills from README "Pending": paper card states (with D1), KO bracket step on paper, Cards tab, magic-link confirm, skeletons | rolling | with each surface |

Acceptance criteria are the bundle's six (≤3-tap first pick; consensus never pre-pick on free; provisional never persisted; warm cap; legal note on payment surfaces; Lighthouse ≥85/95) — verified per ship, not at the end.

## 3. What this changes for Track A

Nothing structural. A3 (dispatcher actions) is now the critical path for D3/D5 and runs next. A9's `useProvisionalPoints` feeds D4 directly. The seam rule holds: screens call `src/pickem/api.js` functions only.

## 4. Risks

1. **Site-wide paper flip mid-window** — hubs were QA'd on paper at v0.63.0 but much shipped since; verify NBA/WC/home visually after deploy; env rollback ready.
2. **Pick'em forced-dark vs paper flagship** — PickemRoot defaults Stadium dark; flagship screens are paper. Resolution: new flagship screens render paper inside their own shell (FShell), existing Pick'em screens keep Stadium until each is rebuilt — no big-bang restyle.
3. **EN-first on hubs** — UI chrome only; SEO surfaces remain Bahasa (see §1).
