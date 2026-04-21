import { useEffect, useState } from 'react';

/**
 * Per-club roster + per-player season stats via ESPN's roster endpoint.
 *
 * Endpoint:
 *   GET /api/proxy/espn/soccer/eng.1/teams/{espnId}/roster
 *
 * ESPN returns an `athletes[]` array (typically ~36 players). Each entry
 * has a `statistics.splits.categories[]` nested shape with General /
 * Offensive / Goal Keeping category buckets. We flatten to a client-
 * friendly per-player record so the UI can rank by any stat without
 * re-walking the tree.
 *
 * Designed to be called from EPLClub per-club pages. 5-minute poll —
 * roster + season stats don't change mid-matchday, and the proxy already
 * caches 20s on top of the upstream layer.
 *
 * Normalized shape per player:
 *   { id, name, shortName, jersey, position, age, headshot,
 *     appearances, goals, assists, shotsOnTarget, totalShots,
 *     yellowCards, redCards,
 *     // goalkeepers only:
 *     saves, shotsFaced, goalsConceded,
 *     // injury status (ESPN sometimes populates even for soccer):
 *     injuryStatus, injuryDescription }
 *
 * Derived rankings:
 *   topScorers:   players.filter(goals > 0), sorted by goals desc
 *   topAssisters: players.filter(assists > 0), sorted by assists desc
 *   injured:      players.filter(injuryStatus) — usually empty
 */

function statByName(category, name) {
  if (!category) return null;
  const entry = (category.stats || []).find((s) => s.name === name);
  return entry?.value ?? null;
}

function flattenAthlete(a) {
  const cats = (a.statistics?.splits?.categories || []);
  const general = cats.find((c) => c.name === 'general');
  const offensive = cats.find((c) => c.name === 'offensive');
  const goalKeeping = cats.find((c) => c.name === 'goalKeeping');
  const pos = (a.position?.abbreviation) || '';

  const inj = (a.injuries || [])[0];

  return {
    id: a.id,
    name: a.fullName || a.displayName || '',
    shortName: a.shortName || a.displayName || '',
    jersey: a.jersey,
    position: pos,
    age: a.age,
    headshot: a.headshot?.href || null,
    appearances: statByName(general, 'appearances') || 0,
    goals: statByName(offensive, 'totalGoals') || 0,
    assists: statByName(offensive, 'goalAssists') || 0,
    shotsOnTarget: statByName(offensive, 'shotsOnTarget') || 0,
    totalShots: statByName(offensive, 'totalShots') || 0,
    yellowCards: statByName(general, 'yellowCards') || 0,
    redCards: statByName(general, 'redCards') || 0,
    // Goalkeeper-only
    saves: statByName(goalKeeping, 'saves') || 0,
    shotsFaced: statByName(goalKeeping, 'shotsFaced') || 0,
    goalsConceded: pos === 'G' ? (statByName(goalKeeping, 'goalsConceded') || 0) : null,
    // Injury (when ESPN populates it)
    injuryStatus: inj?.status || inj?.type?.description || null,
    injuryDescription: inj?.details?.reason || inj?.longComment || inj?.shortComment || null,
  };
}

export function useEPLTeamRoster(espnId, { refreshMs = 300000 } = {}) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!espnId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/proxy/espn/soccer/eng.1/teams/${espnId}/roster`);
        if (!res.ok) throw new Error(`roster ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const athletes = json?.athletes || [];
        const flat = athletes.map(flattenAthlete);
        setPlayers(flat);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [espnId, refreshMs]);

  // Derived rankings — computed at call site so the hook stays cheap.
  const topScorers = [...players]
    .filter((p) => p.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  const topAssisters = [...players]
    .filter((p) => p.assists > 0)
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 5);

  const injured = players.filter((p) => p.injuryStatus);

  return { players, topScorers, topAssisters, injured, loading, error };
}
