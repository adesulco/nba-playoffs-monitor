import React from 'react';
import { Link } from 'react-router-dom';
import SectionRule from './SectionRule.jsx';
import { aggregateMatches } from '../../lib/matchAggregate.js';
import { usePlayoffData } from '../../hooks/usePlayoffData.js';
import { useYesterday } from '../../hooks/useYesterday.js';
import { useEPLFixtures } from '../../hooks/useEPLFixtures.js';
import { useSuperLeagueFixtures } from '../../hooks/useSuperLeagueFixtures.js';
import { useF1Schedule } from '../../hooks/useF1Schedule.js';
import { useF1Results } from '../../hooks/useF1Results.js';

/**
 * v0.59.0 — MatchStrip.
 *
 * Two flavors:
 *   • mode="upcoming" — "Hari ini & besok" — kickoffs in next ~36h
 *   • mode="results"  — "Skor terakhir" — finished games in last ~36h
 *
 * Pulls data from existing per-sport hooks (no new Vercel function),
 * aggregates into a unified item list, renders a horizontal scroll
 * strip of compact cards. Mobile + desktop responsive — strip
 * scrolls horizontally on overflow with snap.
 */

const SPORT_DOT = {
  nba: '#F97316',
  epl: '#22C55E',
  'liga-1-id': '#EF4444',
  f1: '#E10600',
  tennis: '#D4A13A',
};

const SPORT_LABEL = {
  nba: 'NBA',
  epl: 'EPL',
  'liga-1-id': 'LIGA 1',
  f1: 'F1',
  tennis: 'TENNIS',
};

function ScoreCell({ label, score, faded, accent }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        opacity: faded ? 0.55 : 1,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: accent || 'var(--ink)',
          textTransform: 'uppercase',
          maxWidth: 110,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 16,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: accent || 'var(--ink)',
        }}
      >
        {score == null ? '—' : score}
      </span>
    </div>
  );
}

function MatchCard({ item }) {
  const dot = SPORT_DOT[item.sport] || 'var(--ink-3)';
  const sportLabel = SPORT_LABEL[item.sport] || item.sport.toUpperCase();
  const isPost = item.statusState === 'post';
  const isLive = item.statusState === 'in';

  // Determine winner highlighting on results
  const aIsWinner =
    isPost && item.a.score != null && item.b.score != null && item.a.score > item.b.score;
  const bIsWinner =
    isPost && item.a.score != null && item.b.score != null && item.b.score > item.a.score;

  return (
    <Link
      to={item.href}
      style={{
        flex: '0 0 auto',
        width: 220,
        minHeight: 110,
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--bg-2)',
        border: '1px solid var(--line-soft)',
        borderRadius: 8,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        scrollSnapAlign: 'start',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)' }}>
          <span
            aria-hidden="true"
            style={{ width: 6, height: 6, borderRadius: 50, background: dot }}
          />
          {sportLabel}
        </span>
        <span
          style={{
            color: isLive ? 'var(--live)' : isPost ? 'var(--ink-3)' : 'var(--amber)',
            fontWeight: 800,
          }}
        >
          {isLive && (
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: 50,
                background: 'var(--live)',
                marginRight: 5,
                animation: 'live-band-pulse 1.4s ease-in-out infinite',
              }}
            />
          )}
          {item.statusLabel}
        </span>
      </div>

      {item.subtitle && (
        <div
          style={{
            fontFamily: 'Newsreader, "Inter Tight", Georgia, serif',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1.2,
            marginTop: -2,
          }}
        >
          {item.subtitle}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
        <ScoreCell
          label={item.a.label}
          score={item.a.score}
          faded={bIsWinner}
          accent={aIsWinner ? 'var(--ink)' : null}
        />
        <ScoreCell
          label={item.b.label}
          score={item.b.score}
          faded={aIsWinner}
          accent={bIsWinner ? 'var(--ink)' : null}
        />
      </div>
    </Link>
  );
}

export default function MatchStrip({ mode = 'upcoming', label, moreHref, className = '' }) {
  const nba = usePlayoffData(60000);
  const yesterday = useYesterday();
  const epl = useEPLFixtures({ daysBack: 2, daysFwd: 2 });
  const ligaId = useSuperLeagueFixtures({ daysBack: 2, daysFwd: 2 });
  const f1Schedule = useF1Schedule();
  const f1Results = useF1Results();

  const items = aggregateMatches({
    nba: { games: nba.games, yesterday: yesterday.games },
    epl: { upcoming: epl.upcoming, recent: epl.recent },
    ligaId: { upcoming: ligaId.upcoming, recent: ligaId.recent },
    f1: { races: f1Schedule.races, resultsByRound: f1Results.resultsByRound },
    mode,
  });

  // Cap at 12 to keep strip light
  const visible = items.slice(0, 12);

  // Empty state — only show the section if there's content. Loading
  // is implicit (any of the hooks may still be loading; if there's
  // ANY data we render).
  if (visible.length === 0) {
    return null;
  }

  const action = moreHref ? { to: moreHref, label: 'Lihat semua' } : null;
  const sectionLabel =
    label || (mode === 'results' ? 'SKOR TERAKHIR' : 'HARI INI & BESOK');

  return (
    <section className={`v2 match-strip ${className}`.trim()} style={{ marginTop: 24 }}>
      <SectionRule action={action}>{sectionLabel}</SectionRule>
      <div
        className="match-strip-scroll"
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 6,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {visible.map((item) => (
          <MatchCard key={item.id} item={item} />
        ))}
      </div>
      <style>{`
        .match-strip-scroll::-webkit-scrollbar { display: none; }
        @keyframes live-band-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </section>
  );
}
