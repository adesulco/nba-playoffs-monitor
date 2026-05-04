import { useEffect, useState } from 'react';
import { CLUBS_BY_SLUG } from '../lib/sports/liga-1-id/clubs.js';

/**
 * Super League club squad via API-Football v3.
 *
 * v0.14.5 — Mirror of useEPLClubSquad retargeted to league=274.
 * Two-step resolution: /teams?league=274&season={yr} → match by
 * name → /players/squads?team={id}.
 *
 * Returns:
 *   { players: [{ id, number, name, position, age, height, photo }],
 *     loading, error }
 *
 * Coverage caveat: Indonesian Super League squad data on API-Football
 * may be partial — some clubs return only first-team starters, no
 * youth/reserve players. The hook returns whatever the API gives; UI
 * renders the empty state when no players resolve.
 */
export function useSuperLeagueClubSquad(slug, { season = 2025 } = {}) {
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
        const teamsRes = await fetch(
          `/api/proxy/api-football/teams?league=274&season=${season}`,
        );
        if (teamsRes.status === 401 || teamsRes.status === 403) {
          throw new Error('unauthorized');
        }
        if (!teamsRes.ok) throw new Error(`teams ${teamsRes.status}`);
        const teamsJson = await teamsRes.json();
        const list = Array.isArray(teamsJson?.response) ? teamsJson.response : [];
        // Build a list of name tokens from CLUBS to match against
        // API-Football's longer names (e.g. "PSM Makassar" vs "PSM").
        const tokens = [club.name, club.nameId, club.slug.replace(/-/g, ' ')]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        const found = list.find((t) => {
          const n = String(t?.team?.name || '').toLowerCase();
          return tokens.some((tok) => n.includes(tok) || tok.includes(n));
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
