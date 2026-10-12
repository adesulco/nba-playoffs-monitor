# Teardown Deltas — updates for Claude Code from the logged-in PlayoffPickems review

**Date:** 2026-06-11 · Source: `07-side-by-side-playoffpickems.md` §5. Seven tweaks, ranked by urgency. D1–D2 amend migration 0019 (Track A ticket A1) — apply before the migration is written, not after.

## D1 · Future-proof `leagues.tier` + `entitlements.product` for the Sponsor Pool tier — amend A1/0019

The teardown found brands already running sponsored community pools on PlayoffPickems (Whatnot: gated entry, $900 voucher prizes) with zero sponsor features. We parked "Sponsor Pool" as an R6 candidate — but the 0019 check constraints would need a constraint migration to add it later. Cheap now:

```sql
-- 0019 amendments (replaces the spec in 05 §2)
... tier text not null default 'free'
  check (tier in ('free','season','lifetime','sponsor'));
... product text not null
  check (product in ('season_pass','lifetime','gibol_plus','sponsor_pool'));
```

No sponsor features get built now — this only keeps the door open without a future DDL change.

## D2 · `leagues.description` — amend A1/0019

Their pool has a rules/prizes rich-text box ("FREE TO ENTER!… PRIZES: 1st $500 voucher…") and it's load-bearing: it's where the commissioner sets expectations and where a sponsor lives today. We have no equivalent. Add `leagues.description text` (plain text + line breaks, 2000 chars, render with "Read more" collapse per their pattern). Surfaces: wizard step 1 (optional field), grup home, invite landing. **Legal guard:** server-side reject of banned betting vocabulary (pasang/taruhan/odds + "uang" prize phrasing) with a friendly error — commissioner-written prize text is where judi-adjacent copy will try to enter the product.

## D3 · Default football template = both formats on (product default, Track A: `create-league` template)

Their group stage is a one-shot: all 12 groups lock at first kickoff, knockout padlocked → 16 days of member silence. Our Bracket Lock mode alone would reproduce that dead air. Default template for football competitions: `formats = {match, bracket}` — Bracket Lock for the stake-in-the-ground feeling, match-by-match for the daily loop. Commissioner can switch either off in wizard step 2. (Mechanics docs already allow side-by-side; this delta just sets the *default*.)

## D4 · "Who hasn't picked" is confirmed P0, not polish (no ticket change — priority note)

Their commissioner's only tool is a CSV export. Our member-row "no pick yet · nudge on WA →" (design, grup home) is a direct counter — when implementing R1-1 `league-detail`, include per-member `picked_current_matchday boolean` so the design's nudge row costs zero extra queries.

## D5 · Entries CSV export — new small ticket, R2 (commissioner parity, sponsor prerequisite)

Client-side CSV from `league-detail` data (entry · per-format ✓ · total) on the commissioner panel. Their commissioners demonstrably use this. No new endpoint.

## D6 · Max-points denominators — Track B UI note

Their per-group "0/16 pts" and total "/512 pts" denominators are a clarity pattern worth copying: show max available points on group cards, matchday header, and leaderboard header ("Day 3 · 60 pts available"). Pure display, computed from `scoring_config`.

## D7 · Free-tier baseline data chip — Track B UI note

Their only team context is a static FIFA ranking (#15) — and it's free. Match the free baseline: show FIFA rank/seed chip on team rows for everyone; keep form/H2H/win-prob/pre-pick-consensus as the Gibol+ layer. Free users should never see *less* static context than PlayoffPickems shows.

## Explicitly NOT changed

- Multi-season pools (their 2026 season dropdown): our rollover-to-sibling-league + `league_seasons` trophy case (R4) is the stronger pattern; no change.
- Activity/audit log: already R2-5 — table stakes confirmed.
- Upgrade UX: design's bottom-sheet over the working surface already mirrors their in-context modal; no change.
