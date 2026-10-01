import { describe, it, expect } from 'vitest';
import { COMPETITIONS, COMPETITION_ORDER, ACTIVE_FEED_KEYS, pickDefault, registryRows } from './competitions.js';
import { cardUrl } from './share.js';
import { avatarColor, AVATAR_COLORS } from './avatar.js';

describe('competition registry', () => {
  it('every row has the contract fields and a legacy shadow', () => {
    for (const row of registryRows()) {
      for (const k of ['key', 'sport', 'season', 'label', 'labelShort', 'structure', 'rounds', 'features', 'window', 'lock', 'feed', 'teamsLeagueKey', 'scoringTemplate']) {
        expect(row, `${row.key}.${k}`).toHaveProperty(k);
      }
      const c = COMPETITIONS[row.key];
      expect(typeof c.label).toBe('string');
      expect(['football', 'nba', 'fifa_wc', 'motogp', 'volleyball']).toContain(c.sport);
      expect(c.openAt).toBe(row.window.opensAt);
    }
  });
  it('order covers every row exactly once', () => {
    expect([...COMPETITION_ORDER].sort()).toEqual(Object.keys(COMPETITIONS).sort());
  });
  it('active feeds exclude finished competitions', () => {
    expect(ACTIVE_FEED_KEYS).toContain('EPL-2026-27');
    expect(ACTIVE_FEED_KEYS).not.toContain('WC2026');
  });
  it('pickDefault: live window wins, else most recently opened, else first', () => {
    expect(pickDefault(COMPETITIONS, COMPETITION_ORDER, new Date('2026-10-01T00:00:00Z'))).toBe('EPL-2026-27');
    expect(pickDefault(COMPETITIONS, COMPETITION_ORDER, new Date('2026-07-01T00:00:00Z'))).toBe('WC2026');
    expect(pickDefault(COMPETITIONS, COMPETITION_ORDER, new Date('2020-01-01T00:00:00Z'))).toBe(COMPETITION_ORDER[0]);
  });
  it('Liga 1 tricodes are three letters and unique', () => {
    const codes = Object.values(COMPETITIONS['LIGA1-2026-27'].feed.clubs);
    expect(codes.every((c) => /^[A-Z]{3}$/.test(c))).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('share.cardUrl', () => {
  it('builds a g4 card URL and drops empty params', () => {
    const u = new URL(cardUrl('juara', { name: 'Ade', points: 12, code: '', grup: 'Kantor' }));
    expect(u.pathname).toBe('/api/og-recap');
    expect(u.searchParams.get('type')).toBe('g4-juara');
    expect(u.searchParams.get('points')).toBe('12');
    expect(u.searchParams.has('code')).toBe(false);
  });
});

describe('avatarColor', () => {
  it('is deterministic and stays inside the palette', () => {
    expect(avatarColor('abc')).toBe(avatarColor('abc'));
    expect(AVATAR_COLORS).toContain(avatarColor('any-user-id'));
    expect(AVATAR_COLORS).toContain(avatarColor(null));
  });
});
