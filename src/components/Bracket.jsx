import React, { useMemo } from 'react';
import { TEAM_META, BRACKET_R1, PLAYIN_POOL, COLORS } from '../lib/constants.js';

// Given today's (and recent days') ESPN games, figure out which play-in team
// is actually sitting at each conference's 8-seed. Rule: whichever team from
// the play-in pool is currently matched up against the 1-seed in a R1 game
// is the advanced team. Falls back to null if we can't tell yet.
function resolvePlayInWinner(games, oneSeedAbbr, poolNames) {
  if (!Array.isArray(games) || games.length === 0) return null;
  const poolAbbrs = new Set(poolNames.map((n) => TEAM_META[n]?.abbr).filter(Boolean));
  for (const g of games) {
    const a = g.away?.abbr;
    const h = g.home?.abbr;
    if (!a || !h) continue;
    const pair = [a, h];
    if (!pair.includes(oneSeedAbbr)) continue;
    const other = pair.find((x) => x !== oneSeedAbbr);
    if (poolAbbrs.has(other)) {
      return poolNames.find((n) => TEAM_META[n]?.abbr === other) || null;
    }
  }
  return null;
}

function TeamRow({ name, seed, odds, highlight, playInWinner }) {
  // If the raw bracket entry is a TBD placeholder and we've detected a winner,
  // swap it out for the real team. Keeps the visual "just won the play-in"
  // sense by flagging the row with a subtle chip.
  const isTBD = typeof name === 'string' && name.startsWith('TBD');
  const fromPlayIn = isTBD && playInWinner;
  const resolvedName = fromPlayIn ? playInWinner : name;
  const meta = TEAM_META[resolvedName] || { abbr: (resolvedName || '').slice(0, 3).toUpperCase(), color: '#333' };
  const stillTBD = isTBD && !playInWinner;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '18px 20px 1fr auto',
        alignItems: 'center',
        gap: 6,
        padding: '5px 7px',
        background: highlight ? 'rgba(255,179,71,0.08)' : COLORS.panelRow,
        borderLeft: highlight ? `2px solid ${COLORS.amber}` : '2px solid transparent',
        fontSize: 10,
      }}
    >
      <span style={{ color: COLORS.muted, fontSize: 9 }}>{seed}</span>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 3,
          background: stillTBD ? '#333' : meta.color,
          fontSize: 7.5,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        {stillTBD ? '?' : meta.abbr}
      </div>
      <span style={{ color: stillTBD ? COLORS.muted : COLORS.text, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {stillTBD ? 'Play-In TBD' : (resolvedName || '').split(' ').slice(-1)[0]}
        {fromPlayIn && (
          <span
            title="Won play-in"
            style={{
              fontSize: 7.5,
              letterSpacing: 0.5,
              padding: '0 4px',
              borderRadius: 2,
              background: 'rgba(255,179,71,0.18)',
              color: COLORS.amber,
              fontWeight: 600,
              lineHeight: '11px',
            }}
          >
            PLAY-IN
          </span>
        )}
      </span>
      {odds && !stillTBD && (
        <span style={{ color: COLORS.amberBright, fontSize: 9.5, fontWeight: 600 }}>{odds}%</span>
      )}
    </div>
  );
}

function SeriesWatermark({ a, b, aAbbr, bAbbr, seriesMap }) {
  if (!aAbbr || !bAbbr || !seriesMap) return null;
  const key = [aAbbr, bAbbr].sort().join('|');
  const rec = seriesMap[key];
  if (!rec) return null;
  const aW = rec[aAbbr] || 0;
  const bW = rec[bAbbr] || 0;
  if (aW + bW === 0) return null;

  let label;
  if (aW + bW >= 4 && (aW === 4 || bW === 4)) {
    label = `${aW > bW ? aAbbr : bAbbr} WINS ${Math.max(aW, bW)}-${Math.min(aW, bW)}`;
  } else if (aW === bW) {
    label = `TIED ${aW}-${bW}`;
  } else {
    label = `${aW > bW ? aAbbr : bAbbr} LEADS ${Math.max(aW, bW)}-${Math.min(aW, bW)}`;
  }

  return (
    <div
      style={{
        fontSize: 8.5,
        letterSpacing: 0.5,
        color: COLORS.amber,
        padding: '2px 7px',
        borderTop: `1px solid ${COLORS.lineSoft}`,
        background: COLORS.panelSoft,
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      {label}
    </div>
  );
}

function Series({ series, oddsMap, seriesMap, playInWinner }) {
  const [a, b] = series.teams;
  // For watermark + favorite-highlight purposes, use the resolved names.
  const resolvedA = a && a.startsWith('TBD') && playInWinner ? playInWinner : a;
  const resolvedB = b && b.startsWith('TBD') && playInWinner ? playInWinner : b;
  const oA = oddsMap[resolvedA];
  const oB = oddsMap[resolvedB];
  const favorite = (oA || 0) >= (oB || 0) ? resolvedA : resolvedB;
  const aAbbr = TEAM_META[resolvedA]?.abbr;
  const bAbbr = TEAM_META[resolvedB]?.abbr;

  return (
    <div
      style={{
        border: `1px solid ${COLORS.lineSoft}`,
        background: COLORS.bg,
        marginBottom: 6,
      }}
    >
      <TeamRow name={a} seed={series.seeds[0]} odds={oA} highlight={favorite === resolvedA} playInWinner={playInWinner} />
      <div style={{ height: 1, background: COLORS.lineSoft }} />
      <TeamRow name={b} seed={series.seeds[1]} odds={oB} highlight={favorite === resolvedB} playInWinner={playInWinner} />
      <SeriesWatermark a={resolvedA} b={resolvedB} aAbbr={aAbbr} bAbbr={bAbbr} seriesMap={seriesMap} />
    </div>
  );
}

export default function Bracket({ championOdds, seriesMap, games }) {
  const oddsMap = Object.fromEntries((championOdds || []).map((o) => [o.name, o.pct]));

  // Auto-resolve the two 8-seeds from live ESPN matchups, once R1 starts.
  const playInWinners = useMemo(() => ({
    east: resolvePlayInWinner(games, 'DET', PLAYIN_POOL.east),
    west: resolvePlayInWinner(games, 'OKC', PLAYIN_POOL.west),
  }), [games]);

  const ConfHeader = ({ label }) => (
    <div
      style={{
        fontSize: 9,
        letterSpacing: 1.2,
        color: COLORS.dim,
        marginBottom: 6,
        borderBottom: `1px solid ${COLORS.lineSoft}`,
        paddingBottom: 3,
      }}
    >
      {label}
    </div>
  );

  return (
    <div style={{ padding: '10px 12px' }}>
      <ConfHeader label="EASTERN CONFERENCE" />
      {BRACKET_R1.east.map((s, i) => (
        <Series
          key={`e-${i}`}
          series={s}
          oddsMap={oddsMap}
          seriesMap={seriesMap}
          playInWinner={s.seeds.includes(8) ? playInWinners.east : null}
        />
      ))}
      <div style={{ height: 10 }} />
      <ConfHeader label="WESTERN CONFERENCE" />
      {BRACKET_R1.west.map((s, i) => (
        <Series
          key={`w-${i}`}
          series={s}
          oddsMap={oddsMap}
          seriesMap={seriesMap}
          playInWinner={s.seeds.includes(8) ? playInWinners.west : null}
        />
      ))}
      <div
        style={{
          marginTop: 10,
          fontSize: 9,
          color: COLORS.muted,
          textAlign: 'center',
          letterSpacing: 0.5,
        }}
      >
        Highlighted = title favorite per Polymarket
      </div>
    </div>
  );
}
