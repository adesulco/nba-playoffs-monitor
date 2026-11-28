import { describe, it, expect } from 'vitest';
import {
  COMPETITIONS,
  COMPETITION_ORDER,
  PLAYOFF_COMPETITION_ORDER,
  BRACKET_COMPETITION_ORDER,
  ACTIVE_FEED_KEYS,
  defaultPlayoffCompetitionKey,
  pickDefault,
  registryRows,
} from './competitions.js';
import { cardUrl } from './share.js';
import { avatarColor, AVATAR_COLORS } from './avatar.js';
import { skinForCompetition } from './sportSkins.js';

describe('competition registry', () => {
  it('every row has the contract fields and a legacy shadow', () => {
    for (const row of registryRows()) {
      for (const k of ['key', 'sport', 'season', 'label', 'labelShort', 'structure', 'rounds', 'features', 'window', 'lock', 'feed', 'teamsLeagueKey', 'scoringTemplate']) {
        expect(row, `${row.key}.${k}`).toHaveProperty(k);
      }
      const c = COMPETITIONS[row.key];
      expect(typeof c.label).toBe('string');
      expect(['football', 'nba', 'fifa_wc', 'motogp', 'volleyball', 'esports', 'badminton']).toContain(c.sport);
      expect(c.openAt).toBe(row.window.opensAt);
    }
  });
  it('order covers every row exactly once', () => {
    expect([...COMPETITION_ORDER].sort()).toEqual(Object.keys(COMPETITIONS).sort());
  });
  it('active feeds exclude finished and future unseeded competitions', () => {
    expect(ACTIVE_FEED_KEYS).toContain('EPL-2026-27');
    expect(ACTIVE_FEED_KEYS).not.toContain('WC2026');
    expect(ACTIVE_FEED_KEYS).not.toContain('M8-KO-2027');
  });
  it('playoff portfolio enforces survivor=false and maps MLBB + Badminton skins', () => {
    expect(PLAYOFF_COMPETITION_ORDER.length).toBeGreaterThanOrEqual(8);
    expect(BRACKET_COMPETITION_ORDER).toContain('M8-KO-2027');
    expect(BRACKET_COMPETITION_ORDER).toContain('UCL-KO-2026-27');
    expect(BRACKET_COMPETITION_ORDER).toContain('ID-Masters-2027');
    expect(BRACKET_COMPETITION_ORDER).toContain('NBA-Playoffs-2027');
    for (const key of PLAYOFF_COMPETITION_ORDER) {
      expect(COMPETITIONS[key].features.survivor, `${key}.survivor`).toBe(false);
    }
    expect(skinForCompetition('M8-KO-2027', COMPETITIONS['M8-KO-2027']).key).toBe('mlbb');
    expect(skinForCompetition('ID-Masters-2027', COMPETITIONS['ID-Masters-2027']).key).toBe('badminton');
  });
  it('pickDefault & defaultPlayoffCompetitionKey select active or soonest playoff window', () => {
    expect(pickDefault(COMPETITIONS, COMPETITION_ORDER, new Date('2027-01-16T00:00:00Z'))).toBe('M8-KO-2027');
    expect(pickDefault(COMPETITIONS, COMPETITION_ORDER, new Date('2027-02-18T00:00:00Z'))).toBe('UCL-KO-2026-27');
    expect(pickDefault(COMPETITIONS, COMPETITION_ORDER, new Date('2026-10-01T00:00:00Z'))).toBe('EPL-2026-27');
    expect(pickDefault(COMPETITIONS, COMPETITION_ORDER, new Date('2026-07-01T00:00:00Z'))).toBe('WC2026');
    expect(pickDefault(COMPETITIONS, COMPETITION_ORDER, new Date('2020-01-01T00:00:00Z'))).toBe(COMPETITION_ORDER[0]);
    expect(defaultPlayoffCompetitionKey(new Date('2026-11-28T00:00:00Z'))).toBe('M8-KO-2027');
    expect(defaultPlayoffCompetitionKey(new Date('2027-02-01T00:00:00Z'))).toBe('ID-Masters-2027');
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
