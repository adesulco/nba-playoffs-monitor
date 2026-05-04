import { useEffect, useState } from 'react';
import { CLUBS, CLUBS_BY_SLUG } from '../lib/sports/epl/clubs.js';

/**
 * EPL club squad via API-Football v3.
 *
 * v0.14.4 — powers the new "Squad" section on EPLClub.jsx. ESPN's
 * roster endpoint is shallow (no detailed player meta); API-Football
 * returns position, age, height, nationality, photo for every
 * registered player.
 *
 * Two-step resolution (no api-football team id stored locally):
 *   1. /teams?league=39&season={yr}     → list of 20 EPL teams with
 *                                          api-football id + name. Cached
 *                                          1 hour at edge (teams don't
 *                                          change mid-season).
 *   2. /players/squads?team={id}        → 25-30 players per club.
 *                                          Cached 1 hour.
 *
 * Returns:
 *   { players: [{ id, number, name, position, age, height, photo }],
 *     loading, error }
 *
 * Position values from API-Football: Goalkeeper, Defender, Midfielder,
 * Attacker. Group/sort upstream of UI for consistency.
 */
export function useEPLClubSquad(slug, { season = 2025 } = {}) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    const club = CLUBS_BY_SLUG[slug];
    if (!club) {
      setLoading(false);
      setError('club_not_found');
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Step 1 — resolve api-football team id by name.
        const teamsRes = await fetch(
          `/api/proxy/api-football/teams?league=39&season=${season}`,
        );
        if (teamsRes.status === 401 || teamsRes.status === 403) {
          throw new Error('unauthorized');
        }
        if (!teamsRes.ok) throw new Error(`teams ${teamsRes.status}`);
        const teamsJson = await teamsRes.json();
        const list = Array.isArray(teamsJson?.response) ? teamsJson.response : [];
        const needle = String(club.name).toLowerCase();
        const found = list.find((t) => {
          const n = String(t?.team?.name || '').toLowerCase();
          return n.includes(needle) || needle.includes(n);
        });
        const teamId = found?.team?.id;
        if (!teamId) {
          if (!cancelled) {
            setPlayers([]);
            setError('team_id_not_found');
            setLoading(false);
          }
          return;
        }

        // Step 2 — squad list.
        const squadRes = await fetch(
          `/api/proxy/api-football/players/squads?team=${teamId}`,
        );
        if (!squadRes.ok) throw new Error(`squads ${squadRes.status}`);
        const squadJson = await squadRes.json();
        const squad = Array.isArray(squadJson?.response) ? squadJson.response : [];
        const raw = squad?.[0]?.players || [];

        const normalized = raw.map((p) => ({
          id: p.id,
          number: p.number ?? null,
          name: p.name || '',
          position: p.position || 'Unknown',
          age: p.age ?? null,
          height: p.height || null,
          photo: p.photo || null,
        }));

        // Sort: GK → DEF → MID → ATT, then by jersey number.
        const POS_ORDER = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Attacker: 3 };
        normalized.sort((a, b) => {
          const pa = POS_ORDER[a.position] ?? 9;
          const pb = POS_ORDER[b.position] ?? 9;
          if (pa !== pb) return pa - pb;
          const na = a.number ?? 999;
          const nb = b.number ?? 999;
          return na - nb;
        });

        if (!cancelled) {
          setPlayers(normalized);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [slug, season]);

  return { players, loading, error };
}
