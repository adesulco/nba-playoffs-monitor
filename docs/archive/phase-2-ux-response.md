# Re: Phase 2 UX Directive — please revise before Sprint A

**Date:** 2026-04-26  •  **From:** Ade (Gibol)  •  **In response to:** `phase-2-ux-directive.md` (2026-04-26)

Layout math, three-shell framework, journey-led lens, and component consolidation are all directionally right. Before Sprint A kicks off, four things need to be addressed.

---

## 1. Re-anchor the directive against v0.15.1

The packet cites **v0.2.13** as the anchor. We're on **v0.15.1**. That's a 13-minor-version gap covering all of Phase 1B + Phase 1C, specifically:

- **v0.4.x** — EPL hub + 20 club pages
- **v0.5.x – v0.6.x** — Tennis hub + tournaments + ATP/WTA rankings, bilingual news, full Bahasa AppContext
- **v0.10.x – v0.13.x** — multi-sport adapters, Sentry, Mobile Bottom Nav, dashboard-hero polish (GIB-001 through GIB-010), 18 Indonesian Super League club pages
- **v0.14.x** — API-Football integration, EPL match-detail stats + lineups, Super League per-club squad pages
- **v0.15.0** — Derby landing page (`/derby/persija-persib`) with countdown, polling, reactions, oneliners, Supabase engagement schema
- **v0.15.1** — Header IA fix: split single "Football" into `Liga 1` + `Liga Inggris` (Indonesia-first)

Several Sprint A and Sprint F items materially overlap with shipped work:

- **Sprint A "7 missing i18n keys"** — `navTennis`, `navWorldCup` already exist in `src/lib/i18n.js` (verified). v0.15.1 also added `navLiga1` and `navEPL`. Sprint A scope needs an actual diff: which keys are genuinely missing vs. already present.
- **Sprint A "`/nba-playoffs-2026` 308 redirect to singular"** — confirmed missing in `vercel.json`. Real bug, keep in scope.
- **Sprint F leaf-page list (TeamPage / EPLClub / SuperLeagueClub / F1Race / F1Team / F1Driver / TennisTournament / TennisRankings)** — all shipped at Phase 1A. Sprint F is *restructuring* these onto `<HubStatusStrip>`, not *building* them. Scope language needs to be precise so we don't accidentally re-do hooks / data plumbing.

**Action:** before we green-light Sprint A, re-anchor the directive against v0.15.1 and emit a per-sprint scope diff distinguishing "already done" from "still needed." Without this, every sprint's first day is going to be a state-reconciliation exercise.

---

## 2. Bahasa stays the default — kill §0.4 and Sprint G

The directive proposes flipping default surface language to English, with Bahasa as a toggle. **Reject.** Bahasa-first stays, per `CLAUDE.md` core principle #3. Three reasons it's load-bearing:

- **Audience anchor.** Indonesian fans are who Gibol exists for; English-by-default sends an immediate "this isn't for me" signal to the exact audience we're trying to win.
- **Organic SEO compound.** Every Bahasa page indexed today is moat against NBA.com, ESPN, Sofascore, Bola.com. Flipping default would trigger a re-crawl and bleed equity.
- **gibol → fangir funnel.** The shoppable destination is Indonesian commerce. The top-of-funnel Bahasa surface aligns with where the user actually buys.

**Action:**

- Strike "English default" from §0.4 (deviation #4)
- Drop Sprint G entirely from the sequencing block
- Existing language toggle (`id ↔ en` in `AppContext`) stays as-is — user-driven, not default-driven
- Brand-locked Bahasa nouns (Liga 1, Catatan Playoff, El Clasico Indonesia, Persija, Bonek, Bobotoh, Jakmania) remain authoritative

---

## 3. Note: derby page already shipped 2026-04-26

`/derby/persija-persib` was shipped at v0.15.0 (a few hours before this directive landed). Current state:

- Countdown is *inside* the hero, *below* eyebrow + h1
- h1 uses `clamp(28px, 6vw, 48px)` (mobile ≈28 / tablet ≈38 / desktop 48)
- Side-picker chips (Macan / Maung / Netral) are inside the hero block, not below the H2H strip

The Sprint E reshape (countdown above eyebrow, 32/48/56 h1 spec, side-picker below H2H strip on mobile) is fine. Note in Sprint E's task list that this is a **reshape**, not a new build — the Supabase schema, polling endpoint, reaction wall, oneliner composer, and JSON-LD are all already live. Don't touch the engagement layer; only the visual hero composition changes.

---

## 4. Growth track runs in parallel, owned outside this directive

Phase 2 is UX polish only. A separate **growth track** runs in parallel during the same window, scoped explicitly outside this directive:

- **Derby share-card OG image generator** — Persija-Persib derby is 14 days away (10 May at JIS). Per-prediction shareable OG cards are the single biggest virality multiplier we can ship before kick-off; deferring them to "after Phase 2" forfeits the WhatsApp-share moment that compounds Bobotoh + Jakmania organic traffic for the next several seasons.
- **FIFA WC pre-launch teaser** — kickoff 11 June. Six weeks of SEO compound runway. The ComingSoon page wants real content + waitlist capture before Phase 2 polishes it.
- **Push notifications** — PWA service worker, manifest, install prompt, offline cache all shipped. Notification permission flow + per-favorite-team subscriptions are the highest-leverage retention lever we haven't pulled.

These three are not in scope for Phase 2 UX and won't be paused for it. **Constraint on Phase 2:** components must not regress the surfaces growth-track work touches:

1. `/derby/persija-persib`
2. `/fifa-world-cup-2026`
3. PWA install prompt
4. Favorites store

---

## What we need back before Sprint A

1. **Re-anchored directive** against v0.15.1, with a per-sprint scope diff (already-done vs. still-needed).
2. **§0.4 + Sprint G removed**; Bahasa-first reaffirmed.
3. **Sprint E task list updated**: derby is a reshape, not a new build.
4. **Explicit ack** that growth-track runs in parallel without blocking, with the four protected surfaces noted.

Once those four land, send the Sprint A paste-ready Mac terminal block and we go.
