import React, { useMemo } from 'react';
import { useParams, useLocation, Link, Navigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { useF1Standings } from '../hooks/useF1Standings.js';
import { useF1Results } from '../hooks/useF1Results.js';
import { TEAMS_BY_SLUG, DRIVERS_BY_TEAM } from '../lib/sports/f1/constants.js';

/**
 * F1 per-constructor page — v0.2.5.
 *
 * /formula-1-2026/team/:slug
 *
 * Indexable Bahasa-first page per constructor. Shows driver line-up,
 * constructor standings position, aggregate points, and a grid of per-race
 * results for the team's drivers. SportsTeam JSON-LD is also emitted by
 * the prerender (see adapter.teamSchema), so scrapers see structured data.
 */
export default function F1Team() {
  const { slug } = useParams();
  const location = useLocation();
  const { lang, selectedConstructor, setSelectedConstructor } = useApp();

  const team = TEAMS_BY_SLUG[slug];
  if (!team) return <Navigate to="/formula-1-2026" replace />;

  const { drivers: allDrivers, teams: allTeams, loading, error } = useF1Standings();
  const { resultsByRound } = useF1Results();

  const teamDrivers = DRIVERS_BY_TEAM[team.id] || [];
  const teamStanding = allTeams.find((t) => t.id === team.id);
  const driverStandings = allDrivers.filter((d) => d.teamId === team.id);

  const schema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    alternateName: team.short,
    sport: 'Formula 1',
    url: `https://www.gibol.co/formula-1-2026/team/${team.slug}`,
    foundingDate: String(team.founded),
    location: { '@type': 'Place', name: team.base },
    memberOf: {
      '@type': 'SportsOrganization',
      name: '2026 FIA Formula One World Championship',
      url: 'https://www.gibol.co/formula-1-2026',
    },
    athlete: teamDrivers.map((d) => ({
      '@type': 'Person',
      name: d.name,
      jobTitle: 'Formula 1 Driver',
      url: `https://www.gibol.co/formula-1-2026/driver/${d.slug}`,
    })),
  }), [team, teamDrivers]);

  const title = lang === 'id'
    ? `${team.name} F1 2026 · Line-up Pembalap & Klasemen Konstruktor | gibol.co`
    : `${team.name} F1 2026 · Driver Line-up & Constructor Standings | gibol.co`;
  const driverNames = teamDrivers.map((d) => d.name).join(' · ');
  const description = lang === 'id'
    ? `${team.name} di musim F1 2026 — line-up ${driverNames}, basis tim ${team.base}, power unit ${team.power}. Poin, klasemen konstruktor, hasil balapan dan peluang juara.`
    : `${team.name} in F1 2026 — driver line-up ${driverNames}, based in ${team.base}, powered by ${team.power}. Points, constructor standings, race results, championship odds.`;

  const isSelected = selectedConstructor === team.id;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={title}
        description={description}
        path={location.pathname}
        lang={lang}
        keywords={`${team.name.toLowerCase()} f1 2026, ${team.short.toLowerCase()} 2026, ${team.slug.replace(/-/g, ' ')} f1, pembalap ${team.short.toLowerCase()}, klasemen konstruktor 2026, ${teamDrivers.map((d) => d.name.toLowerCase()).join(', ')}`}
        jsonLd={schema}
      />
      <div className="dashboard-wrap">
        <TopBar showBackLink accent={team.accent} />

        {/* Team hero — tinted with constructor accent */}
        <div style={{
          padding: '28px 20px 22px',
          background: `linear-gradient(135deg, ${team.accent}26 0%, ${C.bg} 85%)`,
          borderBottom: `1px solid ${C.line}`,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: team.accent, fontWeight: 700, marginBottom: 4 }}>
            F1 2026 · {lang === 'id' ? 'KONSTRUKTOR' : 'CONSTRUCTOR'}
          </div>
          <div style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 52, lineHeight: 1, letterSpacing: -0.5, color: C.text, marginBottom: 8,
          }}>
            {team.name}
          </div>
          <div style={{ fontSize: 11, color: C.dim, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
            <span>{lang === 'id' ? 'Basis' : 'Base'}: {team.base}</span>
            <span>·</span>
            <span>{lang === 'id' ? 'Power unit' : 'Power'}: {team.power}</span>
            <span>·</span>
            <span>{lang === 'id' ? 'Didirikan' : 'Founded'}: {team.founded}</span>
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => setSelectedConstructor(isSelected ? null : team.id)}
              style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                padding: '8px 14px',
                background: isSelected ? 'rgba(255,255,255,0.15)' : team.accent,
                color: '#fff',
                border: `1px solid ${isSelected ? team.accent : 'transparent'}`,
                borderRadius: 3, cursor: 'pointer',
              }}
            >
              {isSelected
                ? (lang === 'id' ? `✓ ${team.short} tim kamu` : `✓ ${team.short} is your team`)
                : (lang === 'id' ? `★ Jadikan ${team.short} tim kamu` : `★ Follow ${team.short}`)}
            </button>
            <Link
              to="/formula-1-2026"
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
                padding: '8px 14px',
                background: 'transparent',
                color: C.dim,
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 3, textDecoration: 'none',
              }}
            >
              ← {lang === 'id' ? 'Kalender F1' : 'F1 calendar'}
            </Link>
          </div>
        </div>

        <div style={{ padding: '16px 20px 20px', display: 'grid', gap: 14 }}>
          {/* Constructor standing summary */}
          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${team.accent}`, borderRadius: 3,
          }}>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700, marginBottom: 8 }}>
              {lang === 'id' ? 'KLASEMEN KONSTRUKTOR' : 'CONSTRUCTOR STANDING'}
            </div>
            {error && (
              <div style={{ fontSize: 11, color: C.muted }}>
                {lang === 'id' ? 'Data Jolpica lagi lambat. Muncul lagi begitu nyambung.' : 'Jolpica data slow — will refresh.'}
              </div>
            )}
            {!error && loading && !teamStanding && (
              <div style={{ fontSize: 11, color: C.dim }}>{lang === 'id' ? 'Memuat…' : 'Loading…'}</div>
            )}
            {!error && !loading && !teamStanding && (
              <div style={{ fontSize: 11, color: C.dim }}>
                {lang === 'id' ? 'Belum ada poin musim ini. Mulai 8 Mar 2026 (Australian GP).' : 'No points yet. Season starts Mar 8 2026.'}
              </div>
            )}
            {teamStanding && (
              <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'POSISI' : 'POSITION'}</div>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 36, lineHeight: 1, color: team.accent }}>
                    P{teamStanding.position}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'POIN' : 'POINTS'}</div>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 36, lineHeight: 1, color: C.text }}>
                    {teamStanding.points}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'MENANG' : 'WINS'}</div>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 36, lineHeight: 1, color: C.text }}>
                    {teamStanding.wins}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Driver line-up cards */}
          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${team.accent}`, borderRadius: 3,
          }}>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
              {lang === 'id' ? 'LINE-UP PEMBALAP 2026' : 'DRIVER LINE-UP 2026'}
            </div>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {teamDrivers.map((d) => {
                const ds = driverStandings.find((s) => s.code === d.code);
                return (
                  <Link
                    key={d.code}
                    to={`/formula-1-2026/driver/${d.slug}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: 12, textDecoration: 'none', color: C.text,
                      background: C.panelRow,
                      border: `1px solid ${C.lineSoft}`,
                      borderLeft: `3px solid ${team.accent}`,
                      borderRadius: 3, transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = C.panelRow)}
                  >
                    <div style={{
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: 32, lineHeight: 1, color: team.accent, minWidth: 48, textAlign: 'right',
                    }}>
                      #{d.number}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 0.3 }}>
                        {d.code}
                        {ds ? ` · P${ds.position} · ${ds.points} ${lang === 'id' ? 'poin' : 'pts'}` : ''}
                      </div>
                    </div>
                    <span style={{ color: C.dim, fontSize: 11 }}>→</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Latest race results for team */}
          {resultsByRound && Object.keys(resultsByRound).length > 0 && (
            <section style={{
              padding: 14, background: C.panel, border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${team.accent}`, borderRadius: 3,
            }}>
              <div style={{ fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
                {lang === 'id' ? 'HASIL BALAPAN TERAKHIR' : 'RECENT RACE RESULTS'}
              </div>
              <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
                {Object.entries(resultsByRound)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .slice(0, 5)
                  .map(([round, r]) => {
                    const teamFinishes = (r?.podium || []).filter(
                      (p) => teamDrivers.some((td) => td.code === p.code)
                    );
                    return (
                      <div key={round} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '6px 8px', background: C.panelRow, borderRadius: 3,
                      }}>
                        <span style={{ color: C.dim }}>R{String(round).padStart(2, '0')} · {r?.raceName || '—'}</span>
                        <span style={{ color: teamFinishes.length ? team.accent : C.muted, fontWeight: 600 }}>
                          {teamFinishes.length
                            ? teamFinishes.map((p) => `P${p.position} ${p.code || p.name?.split(' ').pop()}`).join(' · ')
                            : (lang === 'id' ? 'tidak finish podium' : 'no podium')}
                        </span>
                      </div>
                    );
                  })}
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
            ? `Gibol bukan afiliasi resmi ${team.short}. Warna tim & lambang hanya sebagai identitas visual editorial. Data: Jolpica-F1.`
            : `Gibol is not officially affiliated with ${team.short}. Team colors used for editorial visual identity only. Data: Jolpica-F1.`}
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
