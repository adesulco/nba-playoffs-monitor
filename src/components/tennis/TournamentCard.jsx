import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../../lib/constants.js';
import { useApp } from '../../lib/AppContext.jsx';
import {
  formatTennisDateRange,
  daysUntil,
  humanRelativeDays,
} from '../../lib/sports/tennis/constants.js';
import { SEASON_YEAR, tournamentPath } from '../../lib/sports/tennis/tournaments.js';
import SurfaceChip from './SurfaceChip.jsx';
import TierChip from './TierChip.jsx';

/**
 * TournamentCard — grid cell card used on the /tennis hub and on Home's live
 * tennis slot. Renders name, city/venue, date range, tier + surface chips,
 * and a status strip (days-until / running / completed).
 */
export default function TournamentCard({ tournament, year = SEASON_YEAR }) {
  const { lang } = useApp();
  if (!tournament) return null;
  const t = tournament;
  const path = tournamentPath(t, year);

  const today = new Date().toISOString().slice(0, 10);
  const phase =
    today > t.endDate ? 'completed'
    : today >= t.startDate ? 'live'
    : 'upcoming';

  const daysLeft = daysUntil(t.startDate);
  const phaseChip =
    phase === 'live' ? { text: lang === 'id' ? 'Sedang berjalan' : 'Live', color: C.tennisLive }
    : phase === 'upcoming' ? {
        text: lang === 'id' ? humanRelativeDays(daysLeft, 'id') : humanRelativeDays(daysLeft, 'en'),
        color: C.tennisSlamGold,
      }
    : { text: lang === 'id' ? 'Selesai' : 'Completed', color: C.muted };

  const accent = t.accent || C.tennisSlamGold;

  return (
    <Link
      to={path}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 16px',
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 3,
        textDecoration: 'none',
        color: 'inherit',
        minHeight: 128,
      }}
    >
      {/* Top row: chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <TierChip tier={t.tier} size="sm" />
        <SurfaceChip surface={t.surface} size="sm" />
      </div>

      {/* Name */}
      <div style={{ marginTop: 2 }}>
        {/* v0.11.12 — was h3 at 16px which rendered larger than the
            parent Tennis active-tournaments h2. Demoted to h4 + 14px
            so the hierarchy reads h1 (page) → h2 (ribbon) → h4 (card)
            without inversion. Visuals stay compact. */}
        <h4
          style={{
            margin: 0,
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: C.text,
            letterSpacing: -0.2,
            lineHeight: 1.25,
          }}
        >
          {lang === 'id' ? t.nameId : t.name} {year}
        </h4>
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            marginTop: 2,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {t.venue} · {t.city}
        </div>
      </div>

      {/* Bottom row: date range + phase */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: C.dim,
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: 0.3,
          }}
        >
          {formatTennisDateRange(t.startDate, t.endDate, lang)}
        </span>
        <span
          style={{
            fontSize: 9.5,
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            letterSpacing: 0.5,
            color: phaseChip.color,
            textTransform: 'uppercase',
          }}
        >
          {phaseChip.text}
        </span>
      </div>
    </Link>
  );
}
