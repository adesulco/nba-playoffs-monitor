#!/usr/bin/env node
/**
 * EPL 2026–27 Pick'em pre-seed — SKELETON (A8 · R4-4).
 *
 * THE WAP COMPOUNDING MOMENT: on WC-final day (Jul 19) every grup gets the
 * rollover prompt ("Grup lo lanjut ke EPL? Satu tap."). This script must
 * run BEFORE that day so the EPL competition has teams + fixtures.
 *
 * Pattern: identical to backfill-wc2026.mjs (deterministic UUIDs,
 * idempotent upserts, --dry-run). API-Football league id 39, season 2026.
 *
 * TODO before first real run (R4 window, ~Jul 11–18):
 *   1. Confirm API-Football serves the 2026–27 fixture list (usually
 *      published mid-June): /fixtures?league=39&season=2026
 *   2. Map the 20 clubs → tricodes. PREFIX guard: teams.tricode is a
 *      GLOBAL text PK shared across sports — EPL codes like 'MUN', 'LIV'
 *      are free today but check collisions before seeding (the WC lesson:
 *      Portugal→PRT because NBA owned POR).
 *   3. Register the competition in src/pickem/competitions.js with
 *      openAt ≈ 2026-08-08 (first matchday) and shape 'league-season'
 *      (38 matchdays, match + score formats; no bracket).
 *   4. Rollover prompt ships separately (R4-4 UI ticket).
 *
 * Usage (once filled in):
 *   node scripts/preseed-epl-2026-27.mjs --dry-run
 */

const AF_LEAGUE = 39;       // API-Football: Premier League
const SEASON = '2026';      // 2026–27 season key
const COMPETITION = 'EPL-2026-27';

console.error(
  `[preseed-epl] SKELETON — not yet runnable. Fill in the club tricode map
 + competition registry entry first (see header TODOs). Target window:
 Jul 11–18, before the WC-final rollover prompt. league=${AF_LEAGUE}
 season=${SEASON} competition=${COMPETITION}`,
);
process.exit(1);
