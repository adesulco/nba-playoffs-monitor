# Gibol Full Redesign Proposal — Ground-Up IA, Same Engine

**Date:** 2026-07-18 · Owner: Ade · Status: the redesign direction implementing `11-PLATFORM-STRATEGY.md`
**Prime directive:** redesign from the ground up **without touching the engine** — Vite + React 18 + Supabase + the 12-function dispatcher + API-Football/ESPN/Jolpica feeds + the satori/resvg card pipeline + the shipped token system all stay. This is an information-architecture and surface redesign, executed incrementally behind flags, never a rewrite.
**Consumers:** the Claude design session (with `10-DESIGN-RESEARCH-PLATFORM.md` as its research base) and Track B engineering (`09-HANDOVER-EPL-RECOVERY.md` §4 order, amended by §5 below).

---

## 1 · What "ground-up" means here

Today's app is a **score site with a game attached** (hubs at root, Pick'em at `/pickem`). The redesign inverts it into a **game with scores and news attached**: three layers, one loop.

```
MAIN  (play)   gibol.co        grups · pick sheets · standings · brag cards      ← the product
SKOR  (live)   skor.gibol.co   hubs · match center · "your pick state" ticker    ← the heartbeat
KABAR (news)   gibol.co/kabar  multi-sport Bahasa digest, every story → a pick   ← the return visit
```

Everything a visitor sees answers one of three questions, in this priority: *what can I play right now* → *how are my picks doing live* → *what happened while I was away*. Any surface that answers none of these is cut or demoted.

## 2 · The new IA (surface map)

**Root shell — 4 destinations, bottom-tab on mobile:**

| Tab | Surface | Job |
|---|---|---|
| **Main** (home) | cross-sport period feed: "Malam Ini / Minggu Ini" cards per active competition, pending-picks debt front and center, grups strip | the habit loop's front door |
| **Grup** | my grups list → grup home (standings, nudges, reveal, commissioner panel) | the social anchor |
| **Skor** | live ticker + match center with pick state; deep links into skor.gibol.co hubs | match-night heartbeat |
| **Kabar** | multi-sport digest feed; each card ends in a play hook ("Timnas lolos — pick semifinalmu?") | retention + SEO |

**Sport is a filter, not a place.** The accent system (`--sport-accent` per sport over the same paper surfaces), glyph set, and competition switcher pills make football/basketball/MotoGP/volleyball feel like *channels of one product*, never separate apps. A new sport = a config row (grammar in `10` §2) — the IA never grows a tab.

**Full surface inventory (old → new):**

| Surface | Today | Redesign action |
|---|---|---|
| Root home | NBA-flavored hub home | **Rebuild** → cross-sport play feed (flag `VITE_FLAG_PICKEM_HOME`, exists) |
| Invite landing `/g/:code` | basic | **Rebuild** — the growth engine, ≤3 taps to first pick, guest-first (Track B #1) |
| Pick sheet | `/pickem` per-competition | **Rebuild** → period sheet, cadence-aware (Minggu Ini / Malam Ini / GP / Babak) |
| Grup home + commissioner | Grup.jsx/GrupDetail.jsx | **Rebuild** on new patterns; multi-sport grup tabs; reveal moment designed |
| Bracket / tournament mode | WC2026 bracket (shipped) | **Reskin** to generic tournament pattern — AFF is instance #2 this month |
| Leaderboards / profile / survivor | shipped | **Reskin** with new tokens; province boards elevated (juara Jawa Barat brag) |
| Sport hubs (NBA, F1, WC, EPL, Super League) | root-level pages | **Keep, re-point**: pick-state strip injected; Phase B → skor.gibol.co with 301s |
| News (`api/news`, content engine) | per-sport articles | **Reskin** → Kabar digest cards, multi-sport, play-hook footer on every card |
| Share cards | NBA/F1 recap PNGs | **Extend** — 3 sport-parameterized templates × 3 crops (per `10` §4.4), same pipeline |
| Scoring-rules / trust pages | partial | **Build once** — sober, timestamped, identical across sports |
| Auth, onboarding, settings | magic link + nickname | **Keep**; polish copy only |

## 3 · Design system evolution (extend the shipped tokens, replace nothing)

- **Keep:** paper surface stack, `--p-*` semantics + washes, type ramp (`p-display` 44 → `p-body` 15, no new steps), `--font-display/ui/mono`, `.f-*` motion utilities, `--focus-ring`, EN-default + native-ID double keys, WCAG 2.2 AA.
- **Add (the only token-level additions):**
  1. `--sport-accent` + `-wash` per sport (football keeps `--pickem-orange`; siblings for basketball/motorsport/volleyball/badminton — contrast-checked on paper AND on the dark sibling);
  2. the **"Malam Ini" dark sibling surface** — a token-complete dark set for live-night surfaces and share cards (NBA/IBL make Gibol a nightly product; this is not full dark mode, it's the match-night room);
  3. a **stat/data module set** for Skor & Kabar (stat tiles, form strips, mini-tables) with one visual grammar across sports.
- **Primitives:** the 6 from `10` §2 (`EventCard` ×3 shapes, `PickControl` ×5 variants, `PeriodHeader`, `CompletionRing`, `StandingsRow`, `LockChip`) + `KabarCard` and `StatTile` for the two support layers. The governing test stands: EPL matchweek, NBA nightly slate, F1/MotoGP podium — same patterns, config-row change only.
- **Voice:** two registers, one brand — tongkrongan gaul on brags/invites/nudges/Kabar hooks; sober + timestamped on scoring/standings/trust. Banned-vocab guard is live server-side; the copy deck honors it in both locales.

## 4 · What the design session must deliver

Exactly the `10-DESIGN-RESEARCH-PLATFORM.md` §9 checklist, **plus** (from this proposal): the 4-tab root shell at 390×844, the Kabar card + play-hook pattern, the Skor pick-state ticker/strip, the `StatTile` module in 3 sport skins, and the Malam Ini dark-sibling token sheet as a single diff block. Acceptance bars unchanged: ≤3 taps/≤60s invite-to-pick (weekly AND nightly cadence), thumbnail-legible dark-native cards, every empty/locked/pending/error state designed, AA on every accent × surface pairing.

## 5 · Migration plan — incremental, flagged, launch-aligned

No big-bang. Each step ships behind a flag and rides the existing calendar (amended for AFF Jul 24 per `11` §2):

| Step | Window | What flips |
|---|---|---|
| M0 | Jul 20–26 | Sprint 0 recovery (unchanged) + AFF seeded; **no visual change** |
| M1 | Jul 24–Aug 9 | Track B rebuilds land route-by-route on new patterns: invite landing → period sheet → grup home (AFF traffic beta-tests them live) |
| M2 | Aug 15 | `VITE_FLAG_PICKEM_HOME` default-on: **root = Main play feed** (Phase A). Hubs untouched, one click away |
| M3 | Aug 25–Sep 3 | Hubs 301 → **skor.gibol.co** (Phase B, quiet week); Kabar v1 digest cards |
| M4 | Sep–Oct | Reskin pass on leaderboards/profile/survivor; Malam Ini dark sibling ships with NBA slate; Mandalika event mode |
| M5 | Jan 2027 | IBL + Proliga as config rows — zero new layouts is the acceptance test of the whole redesign |

**Rollback discipline:** every M-step has a flag or a 301 that reverses; the hubs, cron, auth, and scoring engine are never edited in the same commit as a visual migration (the audit's protected-surface rule).

## 6 · Why this wins (the one-slide argument)

Sofascore/FlashScore have multi-sport scores, no game, no warmth. PlayoffPickems/Superbru have the game, one-or-Western sports, no live layer, no Bahasa. Vidio had the moment, no product. **Gibol's redesign makes the combination visible on every screen: local sports + pools of friends + live heartbeat + Bahasa voice — one grammar, any sport, in your grup's WhatsApp thread tonight.**
