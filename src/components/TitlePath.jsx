import React from 'react';
import { TEAM_META, BRACKET_R1, COLORS as C } from '../lib/constants.js';

/**
 * Given the favorite team and all title odds, walk the bracket to project
 * the 4-series path and compound odds at each step.
 *
 * Approach:
 *   - Find the R1 matchup containing favTeam
 *   - R2 opponent = likely winner of adjacent matchup (higher-odds team from 4/5 vs 3/6 etc pairings)
 *   - Conf Finals opponent = likely winner of the other half of the conference
 *   - Finals opponent = the other conference's top title contender
 *
 * Display: 4 stepped pills with probabilities. The championship % at the end
 * is the team's raw title odds (from Polymarket) — independent confirmation.
 */
export default function TitlePath({ favTeam, championOdds, t }) {
  const favMeta = favTeam ? TEAM_META[favTeam] : null;
  if (!favMeta || !championOdds || championOdds.length === 0) return null;

  const oddsByName = Object.fromEntries(championOdds.map((o) => [o.name, o.pct]));
  const conf = favMeta.conf === 'E' ? BRACKET_R1.east : BRACKET_R1.west;
  const otherConf = favMeta.conf === 'E' ? BRACKET_R1.west : BRACKET_R1.east;

  // Find R1 matchup that includes favTeam
  const myR1Idx = conf.findIndex((s) => s.teams.includes(favTeam));
  if (myR1Idx === -1) {
    return (
      <div style={{ padding: 14, fontSize: 10.5, color: C.dim, textAlign: 'center' }}>
        {favMeta.abbr} is not in the Round 1 bracket yet.
      </div>
    );
  }

  const r1Opp = conf[myR1Idx].teams.find((tm) => tm !== favTeam);

  // R2 opponent = likely winner of adjacent R1 matchup
  // Bracket is structured so 1/8 meets 4/5, and 2/7 meets 3/6 in R2
  const r2PairIdxByR1 = { 0: 1, 1: 0, 2: 3, 3: 2 };
  const r2MatchupIdx = r2PairIdxByR1[myR1Idx];
  const r2Matchup = r2MatchupIdx != null ? conf[r2MatchupIdx] : null;
  const r2LikelyOpp = r2Matchup
    ? r2Matchup.teams.reduce((best, tm) => (oddsByName[tm] || 0) > (oddsByName[best] || 0) ? tm : best, r2Matchup.teams[0])
    : null;

  // CF opponent = highest-odds team in the other half of the conference
  const myHalfIdxs = myR1Idx < 2 ? [0, 1] : [2, 3];
  const otherHalfIdxs = myR1Idx < 2 ? [2, 3] : [0, 1];
  const otherHalfTeams = otherHalfIdxs.flatMap((i) => conf[i].teams);
  const cfLikelyOpp = otherHalfTeams.reduce((best, tm) => (oddsByName[tm] || 0) > (oddsByName[best] || 0) ? tm : best, otherHalfTeams[0]);

  // Finals opponent = highest-odds team from other conference
  const otherConfTeams = otherConf.flatMap((s) => s.teams);
  const finalsLikelyOpp = otherConfTeams.reduce((best, tm) => (oddsByName[tm] || 0) > (oddsByName[best] || 0) ? tm : best, otherConfTeams[0]);

  // Probabilities: use championship odds for the full-path probability,
  // and pair-level odds for each round (favTeam odds / sum of pair odds).
  const favChamp = oddsByName[favTeam] || 0;
  const roundProb = (oppName) => {
    const a = oddsByName[favTeam] || 0;
    const b = oddsByName[oppName] || 0;
    if (a + b === 0) return null;
    return Math.round((a / (a + b)) * 100);
  };

  const steps = [
    { label: 'R1', opp: r1Opp, prob: roundProb(r1Opp) },
    { label: 'R2', opp: r2LikelyOpp, prob: roundProb(r2LikelyOpp) },
    { label: favMeta.conf === 'E' ? 'ECF' : 'WCF', opp: cfLikelyOpp, prob: roundProb(cfLikelyOpp) },
    { label: 'FIN', opp: finalsLikelyOpp, prob: roundProb(finalsLikelyOpp) },
  ];

  const color = favMeta.color;

  return (
    <div style={{ borderBottom: `1px solid ${C.line}` }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: C.panelSoft,
      }}>
        <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 }}>
          {favMeta.abbr} · PATH TO TITLE
        </span>
        <span style={{ fontSize: 11, color, fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif', letterSpacing: -0.3 }}>
          {favChamp}%
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
        {steps.map((s, i) => {
          const oppMeta = s.opp ? TEAM_META[s.opp] : null;
          const oppAbbr = oppMeta?.abbr || '—';
          const oppColor = oppMeta?.color || C.lineSoft;
          return (
            <div
              key={i}
              style={{
                padding: '8px 8px',
                borderRight: i < 3 ? `1px solid ${C.lineSoft}` : 'none',
                display: 'flex', flexDirection: 'column', gap: 3,
                position: 'relative',
              }}
            >
              <div style={{ fontSize: 9, letterSpacing: 0.8, color: C.dim, fontWeight: 600 }}>{s.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.text }}>
                <span style={{ color: C.muted }}>vs</span>
                <span style={{
                  padding: '1px 4px', borderRadius: 2,
                  background: oppColor, color: '#fff', fontSize: 8.5, fontWeight: 700,
                }}>
                  {oppAbbr}
                </span>
              </div>
              {s.prob != null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                  <div style={{ height: 4, background: C.lineSoft, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${s.prob}%`, height: '100%', background: color }} />
                  </div>
                  <div style={{ fontSize: 9, color: s.prob >= 50 ? C.amberBright : C.muted, fontWeight: 600 }}>
                    {s.prob}%
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '6px 12px', fontSize: 9, color: C.muted, background: C.panelRow, borderTop: `1px solid ${C.lineSoft}` }}>
        Projected opponents per Polymarket title odds. Updates in real time.
      </div>
    </div>
  );
}
