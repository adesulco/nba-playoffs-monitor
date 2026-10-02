import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = { invite: null, cleared: 0 };
vi.mock('./guestStore.js', () => ({
  claimGuestPredictions: vi.fn(async () => ({ ok: true, claimed: 2, skipped: 0, failed: 0 })),
  getGuestInvite: () => state.invite,
  clearGuestInvite: () => { state.cleared += 1; state.invite = null; },
}));
vi.mock('./api.js', () => ({
  upsertPrediction: vi.fn(),
  leagueDetail: vi.fn(async ({ code }) => (code === 'Gone' ? { ok: false, error: 'League not found' } : { ok: true, league: { id: 'L1' } })),
  joinGrup: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../lib/analytics.js', () => ({ trackEvent: vi.fn() }));

import { claimGuestAndJoin } from './claim.js';
import { joinGrup } from './api.js';

describe('claimGuestAndJoin', () => {
  beforeEach(() => { state.invite = null; state.cleared = 0; joinGrup.mockClear(); });

  it('claims picks and joins the stored invite, then clears it', async () => {
    state.invite = 'FgdGibol';
    const r = await claimGuestAndJoin('test');
    expect(r.claim.claimed).toBe(2);
    expect(r.joined).toBe(true);
    expect(joinGrup).toHaveBeenCalledWith({ leagueId: 'L1', inviteCode: 'FgdGibol' });
    expect(state.cleared).toBe(1);
  });

  it('concurrent callers share one run', async () => {
    state.invite = 'FgdGibol';
    const [a, b] = await Promise.all([claimGuestAndJoin('a'), claimGuestAndJoin('b')]);
    expect(a).toBe(b);
    expect(joinGrup).toHaveBeenCalledTimes(1);
  });

  it('drops an invite whose grup no longer exists, without joining', async () => {
    state.invite = 'Gone';
    const r = await claimGuestAndJoin('test');
    expect(r.joined).toBe(null);
    expect(joinGrup).not.toHaveBeenCalled();
    expect(state.cleared).toBe(1);
  });

  it('no invite: claims only', async () => {
    const r = await claimGuestAndJoin('test');
    expect(r.claim.claimed).toBe(2);
    expect(joinGrup).not.toHaveBeenCalled();
  });
});
