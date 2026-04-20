import React, { useMemo } from 'react';
import { useParams, useLocation, Link, Navigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { useF1Standings } from '../hooks/useF1Standings.js';
import { useF1Results } from '../hooks/useF1Results.js';
import { DRIVERS_BY_SLUG, TEAMS_BY_ID } from '../lib/sports/f1/constants.js';

/**
 * F1 per-driver page — v0.2.5.
 *
 * /formula-1-2026/driver/:slug
 *
 * Indexable Bahasa-first page per driver. Shows team + number, standings
 * (position, points, wins), season podium tally, and a list of their
 * per-race finishes. Person JSON-LD is emitted by the prerender.
 */
export default function F1Driver() {
  const { slug } = useParams();
  const location = useLocation();
  const { lang, setSelectedConstructor } = useApp();

  const driver = DRIVERS_BY_SLUG[slug];
  if (!driver) return <Navigate to="/formula-1-2026" replace />;

  const team = TEAMS_BY_ID[driver.teamId];
  const accent = team?.accent || '#E10600';

  const { drivers: allDrivers, loading, error } = useF1Standings();
  const { resultsByRound } = useF1Results();

  const standing = allDrivers.find((d) => d.code === driver.code);

  // Per-race finishes for THIS driver across the season.
  const perRaceFinishes = useMemo(() => {
    const rounds = Object.values(resultsByRound || {})
      .sort((a, b) => Number(b.round) - Number(a.round));
    const out = [];
    for (const r of rounds) {
      const hit = (r.podium || []).find((p) => p.code === driver.code);
      // Jolpica results.json returns full result set; we clipped to top 3 in
      // useF1Results. For deeper than P3 this hook would need expanding. For
      // now we show podium hits + "no podium" rows for the other races.
      out.push({ round: r.round, raceName: r.raceName, date: r.date, hit });
    }
    return out;
  }, [resultsByRound, driver.code]);

  const podiums = perRaceFinishes.filter((r) => r.hit).length;
  const wins = perRaceFinishes.filter((r) => r.hit?.position === 1).length;

  const schema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: driver.name,
    jobTitle: 'Formula 1 Driver',
    url: `https://www.gibol.co/formula-1-2026/driver/${driver.slug}`,
    identifier: driver.code,
    memberOf: team
      ? {
          '@type': 'SportsTeam',
          name: team.name,
          url: `https://www.gibol.co/formula-1-2026/team/${team.slug}`,
        }
      : undefined,
  }), [driver, team]);

  const title = lang === 'id'
    ? `${driver.name} F1 2026 · Poin, Podium, Stats Pembalap ${team?.short || ''} | gibol.co`
    : `${driver.name} F1 2026 · Points, Podiums, ${team?.short || 'Driver'} Stats | gibol.co`;
  const description = lang === 'id'
    ? `${driver.name} (#${driver.number}, ${driver.code}) membalap untuk ${team?.name || 'F1 2026'} musim 2026. Poin klasemen, jumlah podium, jumlah menang, dan peluang juara pembalap.`
    : `${driver.name} (#${driver.number}, ${driver.code}) races for ${team?.name || 'F1 2026'} in 2026. Championship points, podium count, wins, and championship odds.`;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={title}
        description={description}
        path={location.pathname}
        lang={lang}
        keywords={`${driver.name.toLowerCase()}, ${driver.slug}, ${driver.code.toLowerCase()} f1, f1 2026 ${driver.slug}, pembalap ${team?.short?.toLowerCase() || 'f1'}, klasemen pembalap, podium ${driver.name.toLowerCase()}`}
        jsonLd={schema}
      />
      <div className="dashboard-wrap">
        <TopBar showBackLink accent={accent} />

        {/* Driver hero tinted with team accent */}
        <div style={{
          padding: '28px 20px 22px',
          background: `linear-gradient(135deg, ${accent}14 0%, ${C.bg} 85%)`,
          borderBottom: `1px solid ${C.line}`,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: accent, fontWeight: 700, marginBottom: 4 }}>
            F1 2026 · {lang === 'id' ? 'PEMBALAP' : 'DRIVER'}
          </div>
          <h1 style={{
            display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap',
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 36, fontWeight: 700, lineHeight: 1.05, margin: 0,
            letterSpacing: '-0.025em', textWrap: 'balance',
          }}>
            <span style={{ color: accent }}>#{driver.number}</span>
            <span style={{ color: C.text }}>{driver.name}</span>
          </h1>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
            <span>{driver.code}</span>
            {team && (
              <>
                <span>·</span>
                <Link
                  to={`/formula-1-2026/team/${team.slug}`}
                  style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}
                  onClick={() => setSelectedConstructor(team.id)}
                >
                  {team.name} →
                </Link>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 20px 20px', display: 'grid', gap: 14 }}>
          {/* Season stats */}
          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${accent}`, borderRadius: 3,
          }}>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
              {lang === 'id' ? 'STATS MUSIM 2026' : '2026 SEASON STATS'}
            </div>
            {error && (
              <div style={{ fontSize: 11, color: C.muted }}>
                {lang === 'id' ? 'Data Jolpica lagi lambat.' : 'Jolpica data slow.'}
              </div>
            )}
            {!error && loading && !standing && (
              <div style={{ fontSize: 11, color: C.dim }}>{lang === 'id' ? 'Memuat…' : 'Loading…'}</div>
            )}
            {!error && !loading && !standing && (
              <div style={{ fontSize: 11, color: C.dim }}>
                {lang === 'id' ? 'Belum ada balapan musim ini. Mulai 8 Mar 2026.' : 'No races yet. Season starts Mar 8 2026.'}
              </div>
            )}
            {standing && (
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'POSISI' : 'POSITION'}</div>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 38, lineHeight: 1, color: accent }}>
                    P{standing.position}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'POIN' : 'POINTS'}</div>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 38, lineHeight: 1, color: C.text }}>
                    {standing.points}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'MENANG' : 'WINS'}</div>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 38, lineHeight: 1, color: C.text }}>
                    {standing.wins || wins}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'PODIUM' : 'PODIUMS'}</div>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 38, lineHeight: 1, color: C.text }}>
                    {podiums}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Per-race podium finishes */}
          {perRaceFinishes.length > 0 && (
            <section style={{
              padding: 14, background: C.panel, border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${accent}`, borderRadius: 3,
            }}>
              <div style={{ fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
                {lang === 'id' ? 'HASIL PER BALAPAN (PODIUM SAJA)' : 'PER-RACE PODIUM FINISHES'}
              </div>
              <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
                {perRaceFinishes.slice(0, 10).map((r) => (
                  <div key={r.round} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 8px', background: C.panelRow, borderRadius: 3,
                  }}>
                    <span style={{ color: C.dim }}>R{String(r.round).padStart(2, '0')} · {r.raceName}</span>
                    <span style={{ color: r.hit ? accent : C.muted, fontWeight: 600 }}>
                      {r.hit
                        ? `P${r.hit.position} · ${r.hit.points} pts`
                        : (lang === 'id' ? '—' : '—')}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 10 }}>
                {lang === 'id'
                  ? 'Finish di luar P3 tidak muncul di sini di rilis ini; hasil lengkap ada di halaman tiap GP.'
                  : 'Finishes outside P3 are not listed in this release; full results on each GP page.'}
              </div>
            </section>
          )}
        </div>

        <div style={{
          padding: '10px 20px',
          fontSize: 10, color: C.muted, lineHeight: 1.5,
          borderTop: `1px solid ${C.lineSoft}`,
        }}>
          {lang === 'id'
            ? `Gibol bukan afiliasi resmi ${driver.name} atau ${team?.short || 'tim F1 manapun'}. Data: Jolpica-F1.`
            : `Gibol is not officially affiliated with ${driver.name} or ${team?.short || 'any F1 team'}. Data: Jolpica-F1.`}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · F1 Indonesia</div>
          <ContactBar lang={lang} variant="inline" />
          <div>← <a href="/formula-1-2026" style={{ color: C.dim, textDecoration: 'none' }}>{lang === 'id' ? 'dashboard F1' : 'F1 dashboard'}</a></div>
        </div>
      </div>
    </div>
  );
}
