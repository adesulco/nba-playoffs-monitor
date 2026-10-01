# Tennis on Gibol — Brief & Phase Plan

*Status: Planning, not yet in development. Authored 2026-04-20. Repo baseline v0.4.0 (EPL Phase 1A shipped same day). Tennis Phase 1 ships as v0.5.0.*

## Why we're doing this

Tennis is the highest-leverage sport Gibol can add next after F1. Three reasons:

1. **Four Grand Slams + Masters = ~24 live weeks per year of fan attention.** More than NBA (post-season only) and F1 (23 weekends) combined. A tennis hub is a year-round traffic driver, not a seasonal one.
2. **Bahasa-first SEO is wide open.** English giants (ATPTour.com, Tennis.com, ESPN) dominate English search. No Indonesian competitor has built deep tennis coverage in Bahasa. Every per-player page, per-tournament hub, and live match URL is a moat we plant while the land is cheap.
3. **Data is free and high-quality.** ESPN's undocumented tennis API returns live scoreboards, full rankings with points, and news — same class of data we already consume for NBA via the existing `/api/proxy` edge cache. Zero new licensing, zero new infra.

## Scope

### Tier 1 — Grand Slams (4 per year)
- Australian Open (Jan), Roland Garros (May-Jun), Wimbledon (Jun-Jul), US Open (Aug-Sep)
- **Treatment:** full dashboard per tournament — draw (ATP + WTA + doubles), daily schedule, live scoreboard, per-player SEO pages, Catatan Match share cards, bilingual news column, bracket viewer

### Tier 2 — Masters 1000 / WTA 1000 + Year-End Finals (~20 per year)
- ATP Masters 1000: Indian Wells, Miami, Monte Carlo, Madrid, Rome, Canada, Cincinnati, Shanghai, Paris
- WTA 1000: Dubai/Doha, Indian Wells, Miami, Madrid, Rome, Canada, Cincinnati, Beijing, Wuhan
- Year-end: ATP Finals (Turin), WTA Finals (Riyadh)
- **Treatment:** light dashboard — schedule, draw, live scoreboard, final summary. **No per-player pages generated per Masters** (those live on the Slams path to keep prerender count sane).

### Explicitly out of scope for v1
- ATP/WTA 500 and 250 tournaments (too many, low Bahasa search volume)
- Davis Cup, Billie Jean King Cup, United Cup (team tennis — revisit later)
- Live point-by-point during matches (see phase 3)
- Paid API integrations (SportRadar, Goalserve)

## Fan features — what a tennis fan actually wants

Ranked by value, grouped by ship phase.

### Phase 1 essentials (match the ESPN data we have)
- Live scoreboard across all currently-live matches (set-by-set, tiebreak values)
- Full draw viewer per tournament (singles + doubles, ATP + WTA)
- Daily schedule with WIB times and court assignments
- ATP + WTA singles rankings (top 100+) with points, previous rank, trend
- Per-player profile pages — career high rank, current rank, nationality, recent results
- Per-tournament hub with past champions
- Indonesian-player spotlight (Aldila Sutjiadi, Priska Madelyn Nugroho, Christopher Rungkat, etc.)
- Countdown to next Grand Slam
- Bahasa tournament glossary (draw = undian, set = set, tiebreak = tiebreak, walkover = walkover, bye = bye, seed = unggulan)

### Phase 2 depth (by RG 2026 — May 24)
- Head-to-head records (compute from ESPN historical scoreboard)
- Recent form (last 10 matches) per player
- Surface win% (clay / grass / hard / indoor) per player
- "Catatan Match" share cards — bracket progression + score line per completed match, WhatsApp/IG/X variants (og/story/square)
- Bilingual news column — ID sources (detikSport, Kompas, Antara) + EN (ATPTour, Tennis.com, BBC Sport, Reuters)
- Player watchlist ("Follow" like F1 constructor picker) — localStorage, tints UI, highlights rows
- Draw path preview ("Sinner's route to the final")

### Phase 3 enrichment (stretch, slam window only)
- Live point-by-point scraped from Grand Slam official sites (2-3 show courts only, per project rule #6 "lawful scraping only" — respect robots.txt, rate-limit, cache aggressively)
- Service stats per match (ace count, 1st serve %, break point conversion)
- Polymarket tennis odds during slams
- Weather for outdoor sessions (Open-Meteo)
- Broadcast info — which Indonesian TV channel has the rights

## Ship windows (actual calendar)

| Date | Tournament | Gibol phase |
|------|------------|-------------|
| Now → May 10 | Mutua Madrid Open (M1000) + WTA Madrid | Foundation build + coming-soon stubs |
| May 10 | **Target: Tennis hub stub live with AO 2026 archive + RG countdown** | **Phase 1 ship cutoff** |
| May 10 → May 23 | Italian Open Rome (M1000) + WTA Rome | Fill in Masters 1000 dashboard live |
| **May 24 → Jun 7** | **Roland Garros 2026** | **Phase 2 ship — full slam dashboard** |
| Jun 29 → Jul 12 | Wimbledon 2026 | Phase 3 — point-by-point scrape trial |
| Aug 24 → Sep 7 | US Open 2026 | Polish, Catatan Match v2, Indonesian editorial |
| Nov | ATP Finals + WTA Finals | Season wrap, 2026 champions hub |

The Roland Garros window is the real launch. Everything before May 24 is foundation. Everything after is iteration.

## Success criteria (post-Roland Garros retro)

- [ ] All 4 Grand Slam URLs + 20 Masters/Finals URLs live and indexed in Google Search Console
- [ ] Top 100 ATP + top 100 WTA player URLs live (200 total) with clean Bahasa content + JSON-LD Person schema
- [ ] Daily active users during RG fortnight > 1.5× NBA playoff daily active users from April 2026 baseline (or: tennis sessions >40% of total)
- [ ] At least 3 Indonesian tennis bloggers / media outlets link to us organically during RG
- [ ] Zero downtime during any RG men's final point

## Non-goals for v1

- Don't build a pick'em for tennis — the Pick'em schema exists but tennis bracket pick'em is a big separate feature. Add after US Open at earliest.
- Don't compete on livestream — we're a companion, not a stream. Links to wherever it's legally available (Vidio, BeIN, whatever).
- Don't attempt real-time point-by-point on every match. Scrape is 2-3 show courts per slam max.
- Don't translate English news articles. Per `feedback_news_bilingual` — native sources per language, no MT.

## Brand voice for tennis content

Same as F1 and NBA — casual, Bahasa-first, gue/lo acceptable in editorial headlines, formal in data tables.

Examples:
- Good: "Sinner melaju ke final, Alcaraz tersingkir"
- Good: "Bracket kamu: siapa juara RG 2026?"
- Bad: "Jannik Sinner advances to the final in a straight-sets victory" (too English-like)
- Bad: "Bapak Jannik Sinner berhasil mengalahkan..." (too formal)

Tennis-specific terminology uses the Bahasa glossary in `src/lib/sports/tennis/glossary.js` (to be created Phase 1).
