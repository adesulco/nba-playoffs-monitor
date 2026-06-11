// A9 — provisional points: pure-function tests against recorded feed shapes.
import { describe, it, expect } from 'vitest';
import { computeProvisional } from './useProvisionalPoints.js';

// Recorded live-feed fixtures (API-Football short codes + ESPN state).
const LIVE_2H  = { id: 'fx1', stage: 'group', status_short: '2H', home_score: 2, away_score: 1 };
const LIVE_ESPN = { id: 'fx2', stage: 'group', statusState: 'in', home_score: 0, away_score: 1 };
const FINAL    = { id: 'fx3', stage: 'group', status_short: 'FT', home_score: 3, away_score: 0 };
const SCHEDULED = { id: 'fx4', stage: 'group', status_short: 'NS', home_score: null, away_score: null };

const pick = (over = {}) => ({
  fixture_id: 'fx1', picked_outcome: 'H', picked_home: 2, picked_away: 1,
  is_jagoan: false, consensus_at_lock: null, scored_at: null, ...over,
});

describe('computeProvisional', () => {
  it('exact live scoreline → ladder exact (new config default 5)', () => {
    const r = computeProvisional([LIVE_2H], [pick()], {}, null);
    expect(r.total).toBe(5);
    expect(r.perFixture[0]).toMatchObject({ fixture_id: 'fx1', base: 5 });
  });
  it('handles both feed shapes (API-Football short codes + ESPN statusState)', () => {
    const r = computeProvisional(
      [LIVE_ESPN],
      [pick({ fixture_id: 'fx2', picked_outcome: 'A', picked_home: 0, picked_away: 1 })],
      {}, null,
    );
    expect(r.total).toBe(5);
  });
  it('FINAL fixtures never count (cron owns them)', () => {
    const r = computeProvisional([FINAL], [pick({ fixture_id: 'fx3', picked_outcome: 'H' })], {}, null);
    expect(r.total).toBe(0);
    expect(r.perFixture).toHaveLength(0);
  });
  it('already-scored predictions never count (no double-count)', () => {
    const r = computeProvisional([LIVE_2H], [pick({ scored_at: '2026-06-12T00:00:00Z' })], {}, null);
    expect(r.total).toBe(0);
  });
  it('scheduled fixtures (no score yet) never count', () => {
    const r = computeProvisional([SCHEDULED], [pick({ fixture_id: 'fx4' })], {}, null);
    expect(r.total).toBe(0);
  });
  it('jagoan + underdog stack live, matchday floor holds at 0', () => {
    const winning = computeProvisional(
      [LIVE_2H],
      [pick({ is_jagoan: true, consensus_at_lock: 0.2 })],
      {}, null,
    );
    expect(winning.total).toBe(15); // 5 × 1.5 × 2

    const losing = computeProvisional(
      [LIVE_2H],
      [pick({ picked_outcome: 'A', picked_home: 0, picked_away: 1, is_jagoan: true })],
      {}, null,
    );
    expect(losing.total).toBe(0); // 0 awarded − 1 penalty → floored at 0
  });
  it('legacy rules fallback pays the 8/5/3 ladder', () => {
    const r = computeProvisional([LIVE_2H], [pick()], null, { pts_exact: 8 });
    expect(r.total).toBe(8);
  });
  it('empty inputs → zero, no throw', () => {
    expect(computeProvisional([], [], null, null)).toEqual({ total: 0, perFixture: [] });
    expect(computeProvisional(null, null, null, null)).toEqual({ total: 0, perFixture: [] });
  });
});
