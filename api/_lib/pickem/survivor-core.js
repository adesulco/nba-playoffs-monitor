/**
 * Gugur (survivor) bookkeeping — pure, so it is unit-tested.
 *
 * The matchday's survivor pick lives on ONE predictions row per user (one
 * real-world opinion), and scoring decides every grup's life from that row.
 * The used-team list, though, is stored per grup life (survivor_entries).
 * So a pick made from any grup has to be written to EVERY alive life the
 * user holds in that competition — otherwise grup A keeps the old team as
 * "used" while its real pick is the new one (found 2026-10-07: a pick from
 * grup B left grup A free to reuse that team later).
 *
 * planSurvivorPick({ entries, leagueId, pickedTeam, releasedTeams })
 *   entries        the user's survivor_entries in this competition
 *                  ({ id, league_id, status, used_team_ids })
 *   leagueId       the grup the pick is made from
 *   pickedTeam     tricode being picked
 *   releasedTeams  teams of the matchday's current survivor pick (a change
 *                  of mind before lock gives them back)
 *
 * Returns { error, league_id } or
 *         { create: null | { league_id, used_team_ids },
 *           updates: [{ id, league_id, used_team_ids }] }
 */
export function planSurvivorPick({ entries = [], leagueId, pickedTeam, releasedTeams = [] }) {
  const released = new Set(releasedTeams);
  const target = entries.find((e) => e.league_id === leagueId) || null;
  if (target?.status === 'out') return { error: 'survivor_eliminated', league_id: leagueId };

  const alive = entries.filter((e) => e.status !== 'out');
  const afterRelease = (e) => (e.used_team_ids || []).filter((t) => !released.has(t));

  // Used in ANY alive life blocks it: the shared pick would make it a reuse there.
  for (const e of alive) {
    if (afterRelease(e).includes(pickedTeam)) return { error: 'team_already_used', league_id: e.league_id };
  }

  const updates = alive.map((e) => ({
    id: e.id,
    league_id: e.league_id,
    used_team_ids: [...afterRelease(e), pickedTeam],
  }));
  const create = target ? null : { league_id: leagueId, used_team_ids: [pickedTeam] };
  return { create, updates };
}
