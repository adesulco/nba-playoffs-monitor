import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TEAM_META } from '../lib/constants.js';
import { WC_LIVE_STATES } from '../hooks/useWCLive.js';

// ============================================================================
// v0.81.0 — LiveResultsStrip.
//
// Home was only ever surfacing ONE live event (LiveHero). Per Ade: "update
// home page to show all hot live results (such as World Cup is not showing)."
// This strip collects every live AND recently-finished match across all the
// sports Home already fetches — World Cup, NBA, Premier League, Tennis — and
// lays them out as a horizontal scroll of compact result chips. World Cup is
// first because it's the tentpole event this window.
//
// Pure presentation: it normalizes the same data the dashboards already poll,
// so it adds no new network calls. Renders null when nothing is live/recent.
// ============================================================================

const SPORTS = {
  fifa_wc: { label: 'PIALA DUNIA', accent: '#326295', href: '/fifa-world-cup-2026' },
  nba:     { label: 'NBA',         accent: '#e8502e', href: '/nba-playoff-2026' },
  epl:     { label: 'EPL',         accent: '#37003C', href: '/premier-league-2025-26' },
  tennis:  { label: 'TENIS',       accent: '#D4A13A', href: '/tennis' },
};

function abbr3(name) {
  return (name || '—').replace(/[^A-Za-z ]/g, '').trim().slice(0, 3).toUpperCase();
}

// ── per-sport normalizers → { sport, away:{abbr,score}, home:{abbr,score},
//    live, status, sort } ────────────────────────────────────────────────────
function fromWc(f) {
  const live = WC_LIVE_STATES.has(f.statusShort);
  const done = f.statusShort === 'FT' || f.statusShort === 'AET' || f.statusShort === 'PEN';
  if (!live && !done) return null;
  return {
    sport: 'fifa_wc',
    away: { abbr: abbr3(f.away?.name), score: Number(f.away?.goals ?? 0) },
    home: { abbr: abbr3(f.home?.name), score: Number(f.home?.goals ?? 0) },
    live,
    status: live ? (f.elapsed ? `${f.elapsed}'` : (f.statusShort === 'HT' ? 'HT' : 'LIVE')) : 'FT',
    sort: live ? 0 : 1,
  };
}

function fromNba(g) {
  const live = g.statusState === 'in';
  const done = g.statusState === 'post';
  if (!live && !done) return null;
  const awayFull = Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === g.away?.abbr);
  const homeFull = Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === g.home?.abbr);
  return {
    sport: 'nba',
    away: { abbr: TEAM_META[awayFull]?.abbr || g.away?.abbr || '—', score: Number(g.away?.score ?? 0) },
    home: { abbr: TEAM_META[homeFull]?.abbr || g.home?.abbr || '—', score: Number(g.home?.score ?? 0) },
    live,
    status: live ? ((g.status || 'LIVE').toUpperCase()) : 'FINAL',
    sort: live ? 0 : 1,
  };
}

function fromEpl(m) {
  const live = m.statusState === 'in';
  const done = m.statusState === 'post';
  if (!live && !done) return null;
  return {
    sport: 'epl',
    away: { abbr: abbr3(m.away?.shortName || m.away?.name), score: Number(m.away?.score ?? 0) },
    home: { abbr: abbr3(m.home?.shortName || m.home?.name), score: Number(m.home?.score ?? 0) },
    live,
    status: live ? (m.statusDetail || 'LIVE') : 'FT',
    sort: live ? 0 : 1,
  };
}

function fromTennis(m) {
  if (m.status !== 'live') return null;
  const [p1, p2] = m.players || [];
  if (!p1 || !p2) return null;
  const sets = m.sets || [];
  const p1Won = sets.filter((s) => s.p1 != null && s.p2 != null && s.p1 > s.p2).length;
  const p2Won = sets.filter((s) => s.p1 != null && s.p2 != null && s.p2 > s.p1).length;
  const last = (p) => abbr3((p.shortName || p.name || '').split(/\s+/).pop());
  return {
    sport: 'tennis',
    away: { abbr: last(p1), score: p1Won },
    home: { abbr: last(p2), score: p2Won },
    live: true,
    status: 'LIVE',
    sort: 0,
  };
}

export default function LiveResultsStrip({ games, eplFixtures, tennisMatches, wcFixtures, lang = 'en' }) {
  const items = useMemo(() => {
    const all = [
      ...(wcFixtures || []).map(fromWc),
      ...(games || []).map(fromNba),
      ...(eplFixtures || []).map(fromEpl),
      ...(tennisMatches || []).map(fromTennis),
    ].filter(Boolean);
    // Live first, then recent finals. Cap so the strip stays a strip.
    const sportOrder = ['fifa_wc', 'nba', 'epl', 'tennis'];
    all.sort((a, b) => (a.sort - b.sort) || (sportOrder.indexOf(a.sport) - sportOrder.indexOf(b.sport)));
    return all.slice(0, 14);
  }, [games, eplFixtures, tennisMatches, wcFixtures]);

  if (items.length === 0) return null;

  const liveCount = items.filter((i) => i.live).length;

  return (
    <section
      aria-label={lang === 'id' ? 'Hasil live & terbaru' : 'Live & recent results'}
      style={{ padding: '12px 20px 4px', borderBottom: '1px solid var(--line)' }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
        color: 'var(--ink-3)', textTransform: 'uppercase',
      }}>
        {liveCount > 0 && (
          <span className="live-dot" aria-hidden="true" style={{ width: 6, height: 6, margin: 0, background: 'var(--live, #EF4444)' }} />
        )}
        {lang === 'id' ? 'Hasil live & terbaru' : 'Live & recent'}
        {liveCount > 0 && <span style={{ color: 'var(--live, #EF4444)' }}>· {liveCount} LIVE</span>}
      </div>
      <div
        style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8,
          scrollbarWidth: 'thin',
        }}
      >
        {items.map((it, i) => {
          const s = SPORTS[it.sport];
          const awayLeads = it.away.score > it.home.score;
          const homeLeads = it.home.score > it.away.score;
          return (
            <Link
              key={`${it.sport}-${i}`}
              to={s.href}
              aria-label={`${s.label}: ${it.away.abbr} ${it.away.score} – ${it.home.score} ${it.home.abbr} (${it.status})`}
              style={{
                flexShrink: 0,
                minWidth: 132,
                textDecoration: 'none',
                background: `linear-gradient(135deg, ${s.accent}12 0%, transparent 70%), var(--bg-2, var(--panel))`,
                border: '1px solid var(--line)',
                borderLeft: `2px solid ${s.accent}`,
                borderRadius: 8,
                padding: '8px 10px',
                color: 'var(--ink)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 8.5, fontWeight: 700, letterSpacing: 0.6, marginBottom: 6,
                color: 'var(--ink-3)',
              }}>
                <span style={{ color: s.accent }}>{s.label}</span>
                <span style={{
                  color: it.live ? 'var(--live, #EF4444)' : 'var(--ink-3)',
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  {it.live && <span className="live-dot" aria-hidden="true" style={{ width: 5, height: 5, margin: 0 }} />}
                  {it.status}
                </span>
              </div>
              <ScoreLine abbr={it.away.abbr} score={it.away.score} lead={awayLeads} />
              <ScoreLine abbr={it.home.abbr} score={it.home.score} lead={homeLeads} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ScoreLine({ abbr, score, lead }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10,
      padding: '1px 0',
    }}>
      <span style={{
        fontSize: 12.5, fontWeight: lead ? 700 : 500,
        color: lead ? 'var(--ink)' : 'var(--ink-2)', letterSpacing: 0.3,
      }}>{abbr}</span>
      <span style={{
        fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: lead ? 'var(--amber-2, #FBBF24)' : 'var(--ink-3)',
      }}>{score}</span>
    </div>
  );
}
