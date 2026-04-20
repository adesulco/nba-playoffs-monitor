import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../../lib/constants.js';
import { useApp } from '../../lib/AppContext.jsx';
import {
  nextSlam,
  tournamentPath,
  SEASON_YEAR,
} from '../../lib/sports/tennis/tournaments.js';
import {
  daysUntil,
  humanRelativeDays,
  formatTennisDateRange,
} from '../../lib/sports/tennis/constants.js';
import TierChip from './TierChip.jsx';
import SurfaceChip from './SurfaceChip.jsx';

/**
 * CountdownToSlam — terminal-style ticker block that shows days remaining until
 * the next Grand Slam (or highlights a slam currently in progress). Used on
 * the Tennis hub, Home's tennis slot, and any per-tournament page when the
 * requested tournament is upcoming.
 *
 * Renders nothing once the final slam of the season is complete (nextSlam()
 * returns null) — don't want an empty card hanging around on the page.
 *
 * Props:
 *   variant: 'full' | 'compact'  — `compact` collapses venue + date row for
 *                                  tight slots (e.g. Home card tail).
 */
export default function CountdownToSlam({ variant = 'full' }) {
  const { lang } = useApp();
  const slam = nextSlam();
  if (!slam) return null;

  const days = daysUntil(slam.startDate);
  const today = new Date().toISOString().slice(0, 10);
  const inProgress = today >= slam.startDate && today <= slam.endDate;

  const headline = inProgress
    ? lang === 'id' ? 'Sedang berjalan' : 'In progress'
    : lang === 'id' ? humanRelativeDays(days, 'id') : humanRelativeDays(days, 'en');

  const subhead = lang === 'id' ? slam.nameId : slam.name;

  return (
    <Link
      to={tournamentPath(slam, SEASON_YEAR)}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${slam.accent || C.tennisSlamGold}`,
        borderRadius: 3,
        padding: variant === 'compact' ? '12px 14px' : '16px 18px',
      }}
    >
      {/* Chip row — tier + surface */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <TierChip tier={slam.tier} size="sm" />
        <SurfaceChip surface={slam.surface} size="sm" />
        {inProgress && (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 6px',
              fontSize: 9,
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: 0.5,
              color: '#fff',
              background: C.tennisLive,
              borderRadius: 2,
              textTransform: 'uppercase',
            }}
          >
            LIVE
          </span>
        )}
      </div>

      {/* Countdown number / status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: variant === 'compact' ? 6 : 10,
        }}
      >
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: variant === 'compact' ? 28 : 40,
            fontWeight: 700,
            lineHeight: 1,
            color: inProgress ? C.tennisLive : (slam.accent || C.tennisSlamGold),
            letterSpacing: -0.5,
          }}
        >
          {inProgress ? '—' : days != null ? days : '?'}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: variant === 'compact' ? 11 : 13,
            color: C.muted,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            fontWeight: 600,
          }}
        >
          {inProgress
            ? (lang === 'id' ? 'Sedang berjalan' : 'In progress')
            : (lang === 'id' ? 'Hari lagi' : `Day${days === 1 ? '' : 's'} to go`)}
        </span>
      </div>

      {/* Headline + subhead */}
      <div style={{ marginBottom: variant === 'compact' ? 0 : 8 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: variant === 'compact' ? 14 : 18,
            fontWeight: 600,
            color: C.text,
            letterSpacing: -0.2,
            lineHeight: 1.25,
          }}
        >
          {subhead} {SEASON_YEAR}
        </div>
        {variant === 'full' && (
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              color: C.dim,
              marginTop: 3,
              letterSpacing: 0.3,
            }}
          >
            {formatTennisDateRange(slam.startDate, slam.endDate, lang)} · {slam.venue}
          </div>
        )}
      </div>

      {/* Compact headline fallback */}
      {variant === 'compact' && (
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            color: C.muted,
            letterSpacing: 0.3,
          }}
        >
          {headline}
        </div>
      )}
    </Link>
  );
}
