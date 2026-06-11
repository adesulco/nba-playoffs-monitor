// Gate-logic tests (A5) — pure functions, no I/O.
import { describe, it, expect } from 'vitest';
import {
  entitlementCovers,
  canHostAnotherGrup,
  canAddEntry,
  canManageManualEntry,
  canSeePrePickConsensus,
  MULTI_ENTRY_CAP,
} from './entitlements.js';

const NOW = Date.parse('2026-06-15T00:00:00Z');
const season = (competition = 'WC2026') => ({ product: 'season_pass', competition, expires_at: '2026-08-01T00:00:00Z' });
const lifetime = () => ({ product: 'lifetime', competition: null, expires_at: null });
const plus = () => ({ product: 'gibol_plus', competition: null, expires_at: '2026-07-15T00:00:00Z' });
const expired = () => ({ product: 'season_pass', competition: 'WC2026', expires_at: '2026-06-01T00:00:00Z' });

describe('entitlementCovers', () => {
  it('season pass covers its competition only', () => {
    expect(entitlementCovers([season('WC2026')], 'season_pass', 'WC2026', NOW)).toBe(true);
    expect(entitlementCovers([season('WC2026')], 'season_pass', 'EPL-2026-27', NOW)).toBe(false);
  });
  it('lifetime covers everything, forever', () => {
    expect(entitlementCovers([lifetime()], 'lifetime', 'ANY', NOW)).toBe(true);
  });
  it('expired rows never cover', () => {
    expect(entitlementCovers([expired()], 'season_pass', 'WC2026', NOW)).toBe(false);
  });
  it('empty/no rows → false', () => {
    expect(entitlementCovers([], 'season_pass', 'WC2026', NOW)).toBe(false);
    expect(entitlementCovers(null, 'gibol_plus', 'WC2026', NOW)).toBe(false);
  });
});

describe('canHostAnotherGrup', () => {
  it('first grup is always free', () =>
    expect(canHostAnotherGrup({ hostedCount: 0, rows: [], competition: 'WC2026' }, NOW).allowed).toBe(true));
  it('second grup gated without pass', () => {
    const r = canHostAnotherGrup({ hostedCount: 1, rows: [], competition: 'WC2026' }, NOW);
    expect(r).toEqual({ allowed: false, gate: 'host_limit', needs: 'season_pass' });
  });
  it('season pass unlocks (right competition)', () =>
    expect(canHostAnotherGrup({ hostedCount: 3, rows: [season('WC2026')], competition: 'WC2026' }, NOW).allowed).toBe(true));
  it('season pass does NOT unlock another competition', () =>
    expect(canHostAnotherGrup({ hostedCount: 1, rows: [season('WC2026')], competition: 'EPL-2026-27' }, NOW).allowed).toBe(false));
  it('lifetime unlocks everywhere', () =>
    expect(canHostAnotherGrup({ hostedCount: 5, rows: [lifetime()], competition: 'EPL-2026-27' }, NOW).allowed).toBe(true));
});

describe('canAddEntry', () => {
  it('first entry free', () =>
    expect(canAddEntry({ entryCount: 0, rows: [], competition: 'WC2026' }, NOW).allowed).toBe(true));
  it('second entry gated on free', () => {
    const r = canAddEntry({ entryCount: 1, rows: [], competition: 'WC2026' }, NOW);
    expect(r.allowed).toBe(false);
    expect(r.gate).toBe('multi_entry');
  });
  it('gibol_plus unlocks entries 2-3', () =>
    expect(canAddEntry({ entryCount: 2, rows: [plus()], competition: 'WC2026' }, NOW).allowed).toBe(true));
  it(`HARD cap at ${MULTI_ENTRY_CAP} even fully paid`, () => {
    const r = canAddEntry({ entryCount: MULTI_ENTRY_CAP, rows: [lifetime(), plus()], competition: 'WC2026' }, NOW);
    expect(r).toMatchObject({ allowed: false, gate: 'entry_cap', hardCap: true });
  });
});

describe('manual entries + premium consensus', () => {
  it('manual entry needs a commissioner pass', () => {
    expect(canManageManualEntry({ rows: [], competition: 'WC2026' }, NOW).allowed).toBe(false);
    expect(canManageManualEntry({ rows: [season('WC2026')], competition: 'WC2026' }, NOW).allowed).toBe(true);
  });
  it('pre-pick consensus is gibol_plus only — a season pass does NOT grant it', () => {
    expect(canSeePrePickConsensus({ rows: [season('WC2026')], competition: 'WC2026' }, NOW).allowed).toBe(false);
    expect(canSeePrePickConsensus({ rows: [plus()], competition: 'WC2026' }, NOW).allowed).toBe(true);
  });
  it('expired gibol_plus loses pre-pick consensus', () => {
    const lapsed = { product: 'gibol_plus', competition: null, expires_at: '2026-06-10T00:00:00Z' };
    expect(canSeePrePickConsensus({ rows: [lapsed], competition: 'WC2026' }, NOW).allowed).toBe(false);
  });
});
