import { describe, it, expect } from 'vitest';
import { planSurvivorPick } from './survivor-core.js';

const A = 'grup-a';
const B = 'grup-b';

describe('planSurvivorPick (two-grup Gugur)', () => {
  it('first pick in a grup creates its life', () => {
    const plan = planSurvivorPick({ entries: [], leagueId: A, pickedTeam: 'ARS' });
    expect(plan).toEqual({ create: { league_id: A, used_team_ids: ['ARS'] }, updates: [] });
  });

  it('a pick from grup B is written to grup A too (the shared pick)', () => {
    const entries = [{ id: 1, league_id: A, status: 'alive', used_team_ids: ['LIV', 'ARS'] }];
    // MD current pick was ARS (made from A); the user switches to CHE from B.
    const plan = planSurvivorPick({ entries, leagueId: B, pickedTeam: 'CHE', releasedTeams: ['ARS'] });
    expect(plan.create).toEqual({ league_id: B, used_team_ids: ['CHE'] });
    expect(plan.updates).toEqual([{ id: 1, league_id: A, used_team_ids: ['LIV', 'CHE'] }]);
  });

  it('a team used in another alive grup is refused', () => {
    const entries = [
      { id: 1, league_id: A, status: 'alive', used_team_ids: ['LIV'] },
      { id: 2, league_id: B, status: 'alive', used_team_ids: [] },
    ];
    expect(planSurvivorPick({ entries, leagueId: B, pickedTeam: 'LIV' })).toEqual({ error: 'team_already_used', league_id: A });
  });

  it('changing the matchday pick releases the old team in every grup', () => {
    const entries = [
      { id: 1, league_id: A, status: 'alive', used_team_ids: ['LIV', 'ARS'] },
      { id: 2, league_id: B, status: 'alive', used_team_ids: ['ARS'] },
    ];
    const plan = planSurvivorPick({ entries, leagueId: A, pickedTeam: 'ARS', releasedTeams: ['ARS'] });
    expect(plan.updates).toEqual([
      { id: 1, league_id: A, used_team_ids: ['LIV', 'ARS'] },
      { id: 2, league_id: B, used_team_ids: ['ARS'] },
    ]);
  });

  it('an eliminated life is neither checked nor updated', () => {
    const entries = [
      { id: 1, league_id: A, status: 'out', used_team_ids: ['LIV'] },
      { id: 2, league_id: B, status: 'alive', used_team_ids: [] },
    ];
    const plan = planSurvivorPick({ entries, leagueId: B, pickedTeam: 'LIV' });
    expect(plan).toEqual({ create: null, updates: [{ id: 2, league_id: B, used_team_ids: ['LIV'] }] });
  });

  it('picking from an eliminated grup is refused', () => {
    const entries = [{ id: 1, league_id: A, status: 'out', used_team_ids: ['LIV'] }];
    expect(planSurvivorPick({ entries, leagueId: A, pickedTeam: 'ARS' })).toEqual({ error: 'survivor_eliminated', league_id: A });
  });
});
