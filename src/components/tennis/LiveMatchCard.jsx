import React from 'react';
import { COLORS as C } from '../../lib/constants.js';
import { useApp } from '../../lib/AppContext.jsx';
import ScoreLine from './ScoreLine.jsx';
import PlayerChip from './PlayerChip.jsx';

const STATUS_LABEL = {
  live:      { id: 'LIVE',        en: 'LIVE' },
  pre:       { id: 'MENDATANG',   en: 'UPCOMING' },
  post:      { id: 'SELESAI',     en: 'FINAL' },
  walkover:  { id: 'WALKOVER',    en: 'WALKOVER' },
  retired:   { id: 'MUNDUR',      en: 'RETIRED' },
  cancelled: { id: 'DIBATALKAN',  en: 'CANCELLED' },
};

const INDONESIAN_SLUGS = new Set([
  'aldila-sutjiadi',
  'priska-madelyn-nugroho',
  'christopher-rungkat',
]);

function formatTimeWIB(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Convert to WIB (UTC+7) — Vercel edges are UTC so we add manually.
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const hh = String(wib.getUTCHours()).padStart(2, '0');
  const mm = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} WIB`;
}

/**
 * LiveMatchCard — one match row (terminal-dense) used in the home live ticker
 * and on per-tournament pages. Prefers two compact player lines stacked; the
 * top-line player is whoever ESPN puts at index 0 (usually higher seed).
 */
export default function LiveMatchCard({ match }) {
  const { lang } = useApp();
  if (!match) return null;
  const { status, startUTC, round, tournamentName, players = [], sets = [], server, winner } = match;

  const statusMeta = STATUS_LABEL[status] || { id: status, en: status };
  const isLive = status === 'live';

  const badgeColor = isLive
    ? C.tennisLive
    : status === 'post'
    ? C.muted
    : C.dim;

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: `1px solid ${C.lineSoft}`,
        background: C.panel,
      }}
    >
      {/* Status + time/round column */}
      <div style={{ minWidth: 72 }}>
        <div
          style={{
            display: 'inline-block',
            padding: '2px 6px',
            fontSize: 9.5,
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            letterSpacing: 0.5,
            color: '#fff',
            background: badgeColor,
            borderRadius: 2,
          }}
        >
          {isLive && (
            <span
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: 999,
                background: '#fff',
                marginRight: 5,
                animation: 'pulse 1.2s ease-in-out infinite',
              }}
            />
          )}
          {statusMeta[lang === 'en' ? 'en' : 'id']}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: C.muted,
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: 0.3,
          }}
        >
          {round || formatTimeWIB(startUTC)}
        </div>
      </div>

      {/* Players + scores column */}
      <div>
        {[0, 1].map((idx) => {
          const p = players[idx] || {};
          const isWinner = winner === idx;
          const isServing = isLive && server === idx;
          const isIndo = p.slug && INDONESIAN_SLUGS.has(p.slug);
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 14,
                padding: '4px 0',
              }}
            >
              <PlayerChip
                name={p.name}
                shortName={p.shortName}
                seed={p.seed}
                country={p.country}
                countryCode={p.countryCode}
                isWinner={isWinner}
                indonesian={isIndo}
              />
              <ScoreLine
                sets={sets}
                playerIdx={idx}
                isWinner={isWinner}
                isServing={isServing}
              />
            </div>
          );
        })}
      </div>

      {/* Tournament tag column */}
      <div
        style={{
          fontSize: 9.5,
          color: C.muted,
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: 0.4,
          textAlign: 'right',
          maxWidth: 140,
          lineHeight: 1.3,
        }}
      >
        {tournamentName}
      </div>
    </article>
  );
}
