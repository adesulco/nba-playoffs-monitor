import React from 'react';
import { TEAM_META, BRACKET_R1, COLORS } from '../lib/constants.js';

function TeamRow({ name, seed, odds, highlight }) {
  const meta = TEAM_META[name] || { abbr: name.slice(0, 3).toUpperCase(), color: '#333' };
  const isTBD = name.startsWith('TBD');
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '18px 20px 1fr auto',
        alignItems: 'center',
        gap: 6,
        padding: '5px 7px',
        background: highlight ? 'rgba(255,179,71,0.08)' : '#0a1728',
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
          background: isTBD ? '#333' : meta.color,
          fontSize: 7.5,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        {isTBD ? '?' : meta.abbr}
      </div>
      <span style={{ color: isTBD ? COLORS.muted : COLORS.text }}>
        {isTBD ? 'Play-In TBD' : name.split(' ').slice(-1)[0]}
      </span>
      {odds && !isTBD && (
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
        background: '#091524',
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      {label}
    </div>
  );
}

function Series({ series, oddsMap, seriesMap }) {
  const [a, b] = series.teams;
  const oA = oddsMap[a];
  const oB = oddsMap[b];
  const favorite = (oA || 0) >= (oB || 0) ? a : b;
  const aAbbr = TEAM_META[a]?.abbr;
  const bAbbr = TEAM_META[b]?.abbr;

  return (
    <div
      style={{
        border: `1px solid ${COLORS.lineSoft}`,
        background: '#08111f',
        marginBottom: 6,
      }}
    >
      <TeamRow name={a} seed={series.seeds[0]} odds={oA} highlight={favorite === a} />
      <div style={{ height: 1, background: COLORS.lineSoft }} />
      <TeamRow name={b} seed={series.seeds[1]} odds={oB} highlight={favorite === b} />
      <SeriesWatermark a={a} b={b} aAbbr={aAbbr} bAbbr={bAbbr} seriesMap={seriesMap} />
    </div>
  );
}

export default function Bracket({ championOdds, seriesMap }) {
  const oddsMap = Object.fromEntries(championOdds.map((o) => [o.name, o.pct]));

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
        <Series key={`e-${i}`} series={s} oddsMap={oddsMap} seriesMap={seriesMap} />
      ))}
      <div style={{ height: 10 }} />
      <ConfHeader label="WESTERN CONFERENCE" />
      {BRACKET_R1.west.map((s, i) => (
        <Series key={`w-${i}`} series={s} oddsMap={oddsMap} seriesMap={seriesMap} />
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
