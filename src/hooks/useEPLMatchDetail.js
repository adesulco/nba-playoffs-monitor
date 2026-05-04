import { useEffect, useState } from 'react';

/**
 * EPL match detail — fetches ESPN soccer summary for a single event ID
 * and returns goals, cards, and substitutions with scorer/player, minute,
 * and team.
 *
 * Wired to MatchCard's expand-on-click panel (v0.11.25). The card renders
 * a per-side timeline when this hook returns data; until then the panel
 * shows a small loader. Polls every 30s when the match is live (so a
 * goal/card/sub added mid-match appears without a page refresh) and
 * caches the response otherwise — finished matches don't change.
 *
 * Source: ESPN's `summary` endpoint for the soccer.eng.1 league.
 *   `/apis/site/v2/sports/soccer/eng.1/summary?event={id}`
 *
 * Events live in `header.competitions[0].details[]`. Each entry carries:
 *   clock.displayValue   "17'", "90'+5'"
 *   team.{id,abbreviation,displayName}
 *   type.{text}          "Goal", "Yellow Card", "Red Card", "Substitution"
 *   participants[].athlete.{id,displayName}
 *   scoringPlay, penaltyKick, ownGoal flags                      (goals)
 *   yellowCard, redCard flags                                    (cards)
 *   substitution flag                                            (subs)
 *
 * v0.12.7 — was: goals only. Now also returns cards + subs since
 * ESPN's /summary already carries them and the cost is one extra
 * pass over the same `details` array.
 *
 * Returns:
 *   { goals, cards, subs, events, loading, error }
 *   goals[i] = { kind: 'goal',  clock, side, teamAbbr, teamId, scorer, assists, penalty, ownGoal }
 *   cards[i] = { kind: 'card',  clock, side, teamAbbr, teamId, player, color: 'yellow'|'red' }
 *   subs[i]  = { kind: 'sub',   clock, side, teamAbbr, teamId, on, off }
 *   events   = goals + cards + subs merged + sorted by minute (handy
 *              for a single-timeline render).
 */
export function useEPLMatchDetail({ eventId, isLive = false, enabled = true } = {}) {
  const [data, setData] = useState({ goals: [], cards: [], subs: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !eventId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/proxy/espn/soccer/eng.1/summary?event=${encodeURIComponent(eventId)}`);
        if (!r.ok) throw new Error(`summary ${r.status}`);
        const j = await r.json();
        if (cancelled) return;
        const parsed = parseSummary(j);
        setData(parsed);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    let interval;
    if (isLive) {
      interval = setInterval(load, 30000);
    }
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [eventId, isLive, enabled]);

  return { ...data, loading, error };
}

function parseSummary(j) {
  const comp = j?.header?.competitions?.[0] || {};
  const details = Array.isArray(comp.details) ? comp.details : [];
  const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];

  // Map team id → 'home' / 'away' so we can render events on the correct
  // side of the expansion panel.
  const sideByTeamId = {};
  for (const c of competitors) {
    const tid = String(c?.team?.id ?? c?.id ?? '');
    if (!tid) continue;
    sideByTeamId[tid] = c?.homeAway === 'home' ? 'home' : 'away';
  }

  const goals = [];
  const cards = [];
  const subs = [];

  for (const d of details) {
    const teamId = String(d?.team?.id || '');
    const side = sideByTeamId[teamId] || (goals.length % 2 === 0 ? 'home' : 'away');
    const clock = d?.clock?.displayValue || '';
    const teamAbbr = d?.team?.abbreviation || null;
    const teamName = d?.team?.displayName || null;
    const participants = Array.isArray(d?.participants) ? d.participants : [];
    const typeText = String(d?.type?.text || '').toLowerCase();

    // ─ Goals ──────────────────────────────────────────────────────────
    if (d?.scoringPlay) {
      const scorer = participants[0]?.athlete?.displayName || null;
      // ESPN sometimes provides 2+ participants where index 1+ are assists.
      // Filter empty entries and drop the scorer to leave assists.
      const assists = participants
        .slice(1)
        .map((p) => p?.athlete?.displayName)
        .filter(Boolean);
      goals.push({
        kind: 'goal',
        clock,
        side,
        teamId,
        teamAbbr,
        teamName,
        scorer,
        assists,
        penalty: !!d?.penaltyKick,
        ownGoal: !!d?.ownGoal,
      });
      continue;
    }

    // ─ Cards ──────────────────────────────────────────────────────────
    // ESPN flags via either yellowCard/redCard booleans or type.text.
    const isYellow = !!d?.yellowCard || typeText.includes('yellow');
    const isRed = !!d?.redCard || typeText.includes('red card');
    if (isYellow || isRed) {
      cards.push({
        kind: 'card',
        clock,
        side,
        teamId,
        teamAbbr,
        teamName,
        player: participants[0]?.athlete?.displayName || null,
        color: isRed ? 'red' : 'yellow',
      });
      continue;
    }

    // ─ Substitutions ──────────────────────────────────────────────────
    // ESPN delivers subs as one event per swap with two participants
    // (player on, player off). Order varies by season — in practice
    // 2025-26 puts the player coming ON first, but we don't rely on it.
    if (d?.substitution || typeText.includes('substitution')) {
      const on = participants[0]?.athlete?.displayName || null;
      const off = participants[1]?.athlete?.displayName || null;
      subs.push({
        kind: 'sub',
        clock,
        side,
        teamId,
        teamAbbr,
        teamName,
        on,
        off,
      });
    }
  }

  // Combined timeline — sort by clock ASC. Clock format is "17'" or
  // "45'+2'" so we extract the leading minute and add stoppage
  // fractionally to keep order stable.
  const minuteOrder = (clock) => {
    if (!clock) return 0;
    const m = String(clock).match(/^(\d+)(?:'\+?(\d+))?/);
    if (!m) return 0;
    const base = parseInt(m[1], 10) || 0;
    const stoppage = m[2] ? parseInt(m[2], 10) || 0 : 0;
    return base * 100 + stoppage;
  };
  const events = [...goals, ...cards, ...subs].sort(
    (a, b) => minuteOrder(a.clock) - minuteOrder(b.clock),
  );

  return { goals, cards, subs, events };
}
