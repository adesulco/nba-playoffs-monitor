import React from 'react';
import SectionRule from './SectionRule.jsx';
import ScoreTile from './ScoreTile.jsx';
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

// v0.60.1 — Inline MatchCard + ScoreCell + SPORT_DOT/SPORT_LABEL maps
// extracted into ./ScoreTile.jsx, the brand-§09 canonical component.
// MatchStrip now just maps items through <ScoreTile />.

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
          <ScoreTile key={item.id} item={item} />
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
