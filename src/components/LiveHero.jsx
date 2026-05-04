import React from 'react';
import { Link } from 'react-router-dom';
import { TEAM_META } from '../lib/constants.js';

/**
 * LiveHero — v0.11.11 Sprint 5, extended v0.11.13 for cross-sport.
 *
 * Surfaces the single most-watched live event at the top of Home with
 * oversized editorial typography (audit §05 stretch spec).
 *
 * Priority order for picking the hero event:
 *   1. NBA (if any game statusState === 'in')
 *   2. EPL (first live fixture)
 *   3. (Tennis / F1 added later when feasible)
 * If none: render null — off-day Home keeps its existing gateway shape.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ● LIVE · Q3 4:12                              NBA PLAYOFF 26│
 *   │                                                              │
 *   │   OKC  98                                                    │
 *   │   LAL  94                                                    │
 *   │                                                              │
 *   │ [Live score · open dashboard →]                              │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Score numerals are 72–120 px (responsive) tabular Inter Tight 900.
 * Winner gets --amber-2; loser gets --ink-3.
 *
 * Click target wraps the entire card; native semantics via <Link>.
 */

function normalizeNbaEvent(g) {
  if (!g || g.statusState !== 'in') return null;
  const awayFull = Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === g.away?.abbr);
  const homeFull = Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === g.home?.abbr);
  const awayMeta = TEAM_META[awayFull] || { color: '#2a3a52', abbr: g.away?.abbr || '—' };
  const homeMeta = TEAM_META[homeFull] || { color: '#2a3a52', abbr: g.home?.abbr || '—' };
  return {
    sport: 'nba',
    sportLabel: 'NBA PLAYOFF 2026',
    href: '/nba-playoff-2026',
    clock: (g.status || '').replace(/^([A-Z])/, (s) => s.toUpperCase()),
    away: { abbr: awayMeta.abbr, color: awayMeta.color, score: Number(g.away?.score ?? 0) },
    home: { abbr: homeMeta.abbr, color: homeMeta.color, score: Number(g.home?.score ?? 0) },
  };
}

function normalizeEplFixture(m) {
  if (!m || m.statusState !== 'in') return null;
  return {
    sport: 'epl',
    sportLabel: 'PREMIER LEAGUE · 2025-26',
    href: '/premier-league-2025-26',
    clock: m.statusDetail || 'LIVE',
    away: {
      abbr: (m.away?.shortName || m.away?.name || '—').slice(0, 3).toUpperCase(),
      color: m.away?.accent || '#2a3a52',
      score: m.away?.score ?? 0,
    },
    home: {
      abbr: (m.home?.shortName || m.home?.name || '—').slice(0, 3).toUpperCase(),
      color: m.home?.accent || '#2a3a52',
      score: m.home?.score ?? 0,
    },
  };
}

// v0.11.18 — Tennis live-match fallback. Tennis has no single numeric
// score line like basketball/football; it's set-based. We represent it
// as "sets won" per player so the 120-px hero still reads as a number.
// Last-name abbr (3 letters) matches the visual rhythm of the other
// sports; seed is promoted to subtitle in future ships if the design
// review asks for it.
function normalizeTennisMatch(m) {
  if (!m || m.status !== 'live') return null;
  const [p1, p2] = m.players || [];
  if (!p1 || !p2) return null;
  const sets = m.sets || [];
  const p1Won = sets.filter((s) => s.p1 != null && s.p2 != null && s.p1 > s.p2).length;
  const p2Won = sets.filter((s) => s.p1 != null && s.p2 != null && s.p2 > s.p1).length;
  const lastName = (p) => {
    const parts = (p.shortName || p.name || '').trim().split(/\s+/);
    const last = parts[parts.length - 1] || '';
    return last.slice(0, 3).toUpperCase();
  };
  // Tournament slug for deep-link; fallback to hub.
  const href = m.tournamentId
    ? `/tennis/${String(m.tournamentName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
    : '/tennis';
  // Current-set status for the clock slot. Tennis sends the current
  // set number when live; we also surface the tournament + round.
  const setIdx = (sets.length || 0);
  const roundLabel = m.round ? m.round.toUpperCase() : '';
  const clock = setIdx > 0
    ? `SET ${setIdx}${roundLabel ? ` · ${roundLabel}` : ''}`
    : (roundLabel || 'LIVE');
  const tennisAccent = '#D4A13A'; // matches --sport-tennis
  return {
    sport: 'tennis',
    sportLabel: (m.tournamentName || 'TENIS 2026').toUpperCase(),
    href,
    clock,
    away: { abbr: lastName(p1), color: tennisAccent, score: p1Won },
    home: { abbr: lastName(p2), color: tennisAccent, score: p2Won },
  };
}

/**
 * Props:
 *   games         — NBA games array (from usePlayoffData)
 *   eplFixtures   — optional EPL upcoming fixtures array (from useEPLFixtures)
 *                   Pass `upcoming` (which includes statusState 'pre' and 'in').
 *   tennisMatches — optional Tennis match array (from useTennisScoreboard).
 *                   Pass ATP + WTA merged, or either tour alone.
 *
 * Priority: NBA > EPL > Tennis. F1 skipped — live race windows are
 * ~2h × 23 weekends/year; too narrow to justify an always-on fetch
 * on Home. When F1 live-race detection lands, add a branch here.
 */
export default function LiveHero({ games, eplFixtures, tennisMatches }) {
  const nbaLive = (games || []).map(normalizeNbaEvent).find(Boolean);
  const eplLive = !nbaLive ? (eplFixtures || []).map(normalizeEplFixture).find(Boolean) : null;
  const tennisLive = !nbaLive && !eplLive
    ? (tennisMatches || []).map(normalizeTennisMatch).find(Boolean)
    : null;
  const hero = nbaLive || eplLive || tennisLive;
  if (!hero) return null;

  const awayLeads = hero.away.score > hero.home.score;
  const homeLeads = hero.home.score > hero.away.score;

  return (
    <Link
      to={hero.href}
      aria-label={`Live: ${hero.away.abbr} ${hero.away.score} – ${hero.home.score} ${hero.home.abbr} (${hero.sportLabel})`}
      className="live-hero"
      style={{
        display: 'block',
        padding: '20px 24px',
        background: `linear-gradient(135deg, ${hero.away.color}14 0%, ${hero.home.color}14 100%), var(--bg-2, var(--panel))`,
        borderBottom: '1px solid var(--line)',
        textDecoration: 'none',
        color: 'var(--ink)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Signature live tick — gradient strip across the top edge. */}
      <div
        aria-hidden="true"
        className="live-hero-tick"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 3,
          width: '100%',
          background: 'linear-gradient(90deg, var(--live, #EF4444) 0%, var(--amber, #F59E0B) 50%, transparent 100%)',
          opacity: 0.75,
        }}
      />

      {/* Top row — live chip + sport stamp */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: 1.5,
        fontWeight: 700,
        marginBottom: 12,
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px',
          borderRadius: 999,
          background: 'rgba(239,68,68,.14)',
          color: 'var(--live, #EF4444)',
        }}>
          <span className="live-dot" aria-hidden="true" style={{ width: 6, height: 6, margin: 0 }} />
          LIVE · {hero.clock || '—'}
        </span>
        <span style={{ color: 'var(--ink-3)' }}>{hero.sportLabel}</span>
      </div>

      {/* Teams + scores — tabular, oversized */}
      <div className="live-hero-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        gap: 4,
      }}>
        <TeamLine side={hero.away} isWinner={awayLeads} />
        <ScoreNumber value={hero.away.score} isWinner={awayLeads} />
        <TeamLine side={hero.home} isWinner={homeLeads} />
        <ScoreNumber value={hero.home.score} isWinner={homeLeads} />
      </div>

      {/* CTA */}
      <div style={{
        marginTop: 14,
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        letterSpacing: 1,
        color: 'var(--ink-3)',
        textTransform: 'uppercase',
      }}>
        <span style={{ color: 'var(--amber)', fontWeight: 700 }}>●</span>{' '}
        Skor live · buka dashboard →
      </div>
    </Link>
  );
}

function TeamLine({ side, isWinner }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
    }}>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 4,
          background: side.color,
          color: '#fff',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          flexShrink: 0,
        }}
      >
        {side.abbr}
      </span>
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 18,
        fontWeight: isWinner ? 700 : 500,
        letterSpacing: -0.2,
        color: isWinner ? 'var(--ink)' : 'var(--ink-2)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {side.abbr}
      </span>
    </div>
  );
}

function ScoreNumber({ value, isWinner }) {
  return (
    <span
      className="live-hero-score mono"
      style={{
        fontFamily: 'var(--font-sans)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 800,
        letterSpacing: -2,
        lineHeight: 1,
        color: isWinner ? 'var(--amber-2, #FBBF24)' : 'var(--ink-3)',
        minWidth: '1.6em',
        textAlign: 'right',
      }}
    >
      {value}
    </span>
  );
}
