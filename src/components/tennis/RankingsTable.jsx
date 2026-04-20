import React from 'react';
import { COLORS as C } from '../../lib/constants.js';
import { useApp } from '../../lib/AppContext.jsx';

/**
 * RankingsTable — ATP or WTA singles rankings. Columns: rank, Δ, player,
 * country, points. Indonesian players are tinted for quick scan.
 *
 * Props:
 *   ranks:   Array from useTennisRankings (normalised)
 *   limit:   how many rows to show (default 100)
 *   tour:    'atp' | 'wta' — label only, no behavior change
 */
const INDONESIAN_CCS = new Set(['IDN', 'INA', 'ID']);

function trendChip(trend) {
  if (!trend || trend === '—') {
    return { text: '—', color: '#8a8a8a' };
  }
  if (trend.startsWith('up')) {
    return { text: `▲${trend.slice(2)}`, color: '#2ea44f' };
  }
  if (trend.startsWith('down')) {
    return { text: `▼${trend.slice(4)}`, color: '#cf222e' };
  }
  return { text: trend, color: C.muted };
}

export default function RankingsTable({ ranks = [], limit = 100, tour = 'atp' }) {
  const { lang } = useApp();
  const rows = ranks.slice(0, limit);

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '48px 40px 1fr 60px 72px',
          gap: 8,
          padding: '8px 12px',
          background: C.panelSoft,
          borderBottom: `1px solid ${C.line}`,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: C.muted,
          textTransform: 'uppercase',
        }}
      >
        <span>{lang === 'id' ? 'Rank' : 'Rank'}</span>
        <span>Δ</span>
        <span>{lang === 'id' ? 'Petenis' : 'Player'}</span>
        <span style={{ textAlign: 'right' }}>{lang === 'id' ? 'Negara' : 'Country'}</span>
        <span style={{ textAlign: 'right' }}>{lang === 'id' ? 'Poin' : 'Points'}</span>
      </div>

      {/* Rows */}
      {rows.length === 0 && (
        <div style={{ padding: 16, color: C.dim, fontSize: 12 }}>
          {lang === 'id' ? `Memuat peringkat ${tour.toUpperCase()}…` : `Loading ${tour.toUpperCase()} rankings…`}
        </div>
      )}
      {rows.map((r, i) => {
        const trend = trendChip(r.trend);
        const isIndo = r.countryCode && INDONESIAN_CCS.has(r.countryCode);
        return (
          <div
            key={(r.athleteId || r.slug || r.name) + i}
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 40px 1fr 60px 72px',
              gap: 8,
              padding: '7px 12px',
              alignItems: 'baseline',
              borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${C.lineSoft}`,
              background: isIndo ? `${C.tennisSlamGold}10` : 'transparent',
            }}
          >
            <span
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 13,
                fontWeight: r.current <= 10 ? 700 : 500,
                color: r.current <= 10 ? C.text : C.dim,
              }}
            >
              {r.current ?? '—'}
            </span>
            <span
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                fontWeight: 600,
                color: trend.color,
              }}
            >
              {trend.text}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: isIndo ? C.tennisSlamGold : C.text,
                fontWeight: isIndo ? 600 : 500,
              }}
            >
              {r.name}
            </span>
            <span
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                color: C.muted,
                textAlign: 'right',
                letterSpacing: 0.4,
              }}
            >
              {r.countryCode || ''}
            </span>
            <span
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 12,
                color: C.text,
                textAlign: 'right',
                fontWeight: 500,
              }}
            >
              {r.points.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
