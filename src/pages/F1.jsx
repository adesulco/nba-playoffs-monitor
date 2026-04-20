import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { useF1Schedule } from '../hooks/useF1Schedule.js';
import { useF1Standings } from '../hooks/useF1Standings.js';
import { CALENDAR_2026, TEAMS_BY_ID, nextGP, formatGPDate, SEASON } from '../lib/sports/f1/constants.js';

const F1_RED = '#E10600';

const CHAMPIONSHIP_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: '2026 FIA Formula One World Championship',
  description: 'The 2026 Formula 1 World Championship — 23+ Grand Prix across four continents, new chassis + power unit regulations, Audi and Cadillac entering as constructors.',
  startDate: '2026-03-06',
  endDate: '2026-12-06',
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Formula 1',
  location: { '@type': 'Place', name: 'Worldwide' },
  organizer: { '@type': 'SportsOrganization', name: "Fédération Internationale de l'Automobile (FIA)", url: 'https://www.fia.com' },
  url: 'https://www.gibol.co/formula-1-2026',
};

// ─── Next-race hero ─────────────────────────────────────────────────────────
function NextRaceHero({ races, lang }) {
  const gp = useMemo(() => nextGP(), []);
  if (!gp) return null;

  const countryLabel = lang === 'id' ? (gp.countryId || gp.country) : gp.country;

  // Days until race (date-only, not time-zone precise — UX, not countdown timer).
  const today = new Date();
  const raceDate = new Date(gp.dateISO + 'T00:00:00Z');
  const daysUntil = Math.ceil((raceDate - today) / (1000 * 60 * 60 * 24));
  const countdown = daysUntil <= 0
    ? (lang === 'id' ? 'Akhir pekan ini' : 'This weekend')
    : (lang === 'id' ? `${daysUntil} hari lagi` : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`);

  return (
    <div style={{
      padding: '24px 20px',
      background: `linear-gradient(135deg, ${F1_RED}22 0%, ${C.panelRow} 80%)`,
      border: `1px solid ${F1_RED}`,
      borderLeft: `4px solid ${F1_RED}`,
      borderRadius: 4,
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: 18,
      alignItems: 'center',
    }}>
      <div style={{
        fontFamily: '"Bebas Neue", sans-serif',
        fontSize: 44, color: F1_RED, letterSpacing: -0.5,
        padding: '0 14px',
        borderRight: `1px solid ${C.lineSoft}`,
        lineHeight: 1,
      }}>
        R{String(gp.round).padStart(2, '0')}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, letterSpacing: 1.5, color: F1_RED, fontWeight: 700, marginBottom: 4 }}>
          {lang === 'id' ? 'BALAPAN BERIKUTNYA' : 'NEXT RACE'}
          {gp.sprint && <span style={{ marginLeft: 8, padding: '1px 5px', background: F1_RED, color: '#fff', borderRadius: 2, fontSize: 8 }}>SPRINT</span>}
        </div>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 22, fontWeight: 600, color: C.text, letterSpacing: -0.2,
          lineHeight: 1.1, marginBottom: 6,
        }}>
          {gp.name} 2026
        </div>
        <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
          {gp.circuit} · {countryLabel}
        </div>
        <div style={{ fontSize: 11, color: C.text, marginTop: 4, fontWeight: 500 }}>
          {formatGPDate(gp.dateISO, lang)} · {gp.wibTime} WIB · <span style={{ color: F1_RED }}>{countdown}</span>
        </div>
      </div>

      <Link to={`/formula-1-2026/race/${gp.slug}`} style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 11, fontWeight: 700,
        padding: '8px 14px',
        background: F1_RED, color: '#fff',
        borderRadius: 3,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        letterSpacing: 0.3,
      }}>
        {lang === 'id' ? 'Detail →' : 'Details →'}
      </Link>
    </div>
  );
}

// ─── Driver standings table ─────────────────────────────────────────────────
function DriverStandings({ drivers, loading, error, lang }) {
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${F1_RED}`,
      borderRadius: 3,
      padding: '14px 14px 8px',
    }}>
      <h2 style={{
        fontFamily: '"Space Grotesk", sans-serif', fontSize: 15, fontWeight: 600,
        margin: '0 0 10px', color: C.text, letterSpacing: -0.2,
      }}>
        {lang === 'id' ? 'Klasemen Pembalap' : 'Drivers Standings'}
        <span style={{ marginLeft: 8, fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 500 }}>
          {SEASON}
        </span>
      </h2>

      {error && (
        <div style={{ fontSize: 11, color: C.muted, padding: '8px 0' }}>
          {lang === 'id' ? 'Data dari Jolpica-F1 lagi lambat. Muncul lagi kalau sudah nyambung.' : 'Data from Jolpica-F1 is slow. Will refresh when available.'}
        </div>
      )}

      {loading && drivers.length === 0 && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Memuat klasemen…' : 'Loading standings…'}
        </div>
      )}

      {drivers.length === 0 && !loading && !error && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Belum ada balapan. Klasemen akan muncul setelah Australian GP.' : 'No races yet. Standings appear after the Australian GP.'}
        </div>
      )}

      {drivers.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: C.muted, fontSize: 9, letterSpacing: 1, fontWeight: 600 }}>
              <th style={{ textAlign: 'left', padding: '4px 0', width: 28 }}>#</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>{lang === 'id' ? 'PEMBALAP' : 'DRIVER'}</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>{lang === 'id' ? 'TIM' : 'TEAM'}</th>
              <th style={{ textAlign: 'right', padding: '4px 6px', width: 40 }}>W</th>
              <th style={{ textAlign: 'right', padding: '4px 0', width: 48 }}>{lang === 'id' ? 'POIN' : 'PTS'}</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d, i) => {
              const teamMeta = d.teamId ? TEAMS_BY_ID[d.teamId] : null;
              const accent = teamMeta?.accent || C.muted;
              return (
                <tr key={d.code || i} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                  <td style={{ padding: '6px 0', color: i === 0 ? F1_RED : C.dim, fontWeight: i === 0 ? 700 : 500 }}>
                    {d.position ?? i + 1}
                  </td>
                  <td style={{ padding: '6px 0', color: C.text, fontWeight: 500 }}>
                    <span style={{
                      display: 'inline-block', width: 3, height: 14,
                      background: accent, verticalAlign: 'middle', marginRight: 8,
                    }} />
                    {d.name}
                    {d.code && <span style={{ marginLeft: 6, color: C.muted, fontSize: 9.5, letterSpacing: 0.5 }}>{d.code}</span>}
                  </td>
                  <td style={{ padding: '6px 0', color: C.dim }}>{teamMeta?.short || d.teamName || '—'}</td>
                  <td style={{ padding: '6px 6px', color: C.dim, textAlign: 'right' }}>{d.wins || 0}</td>
                  <td style={{ padding: '6px 0', color: C.text, textAlign: 'right', fontWeight: 600 }}>{d.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ fontSize: 9, color: C.muted, padding: '8px 0 2px', letterSpacing: 0.3 }}>
        {lang === 'id' ? 'Data: Jolpica-F1 · refresh tiap 5 menit' : 'Data: Jolpica-F1 · refreshed every 5 min'}
      </div>
    </section>
  );
}

// ─── Constructor standings table ────────────────────────────────────────────
function ConstructorStandings({ teams, loading, error, lang }) {
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${F1_RED}`,
      borderRadius: 3,
      padding: '14px 14px 8px',
    }}>
      <h2 style={{
        fontFamily: '"Space Grotesk", sans-serif', fontSize: 15, fontWeight: 600,
        margin: '0 0 10px', color: C.text, letterSpacing: -0.2,
      }}>
        {lang === 'id' ? 'Klasemen Konstruktor' : 'Constructors Standings'}
      </h2>

      {error && (
        <div style={{ fontSize: 11, color: C.muted, padding: '8px 0' }}>
          {lang === 'id' ? 'Data lagi lambat.' : 'Data is slow.'}
        </div>
      )}

      {loading && teams.length === 0 && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Memuat…' : 'Loading…'}
        </div>
      )}

      {teams.length === 0 && !loading && !error && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Belum ada poin. Mulai 8 Mar.' : 'No points yet. Season starts Mar 8.'}
        </div>
      )}

      {teams.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: C.muted, fontSize: 9, letterSpacing: 1, fontWeight: 600 }}>
              <th style={{ textAlign: 'left', padding: '4px 0', width: 28 }}>#</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>{lang === 'id' ? 'KONSTRUKTOR' : 'CONSTRUCTOR'}</th>
              <th style={{ textAlign: 'right', padding: '4px 6px', width: 40 }}>W</th>
              <th style={{ textAlign: 'right', padding: '4px 0', width: 48 }}>{lang === 'id' ? 'POIN' : 'PTS'}</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t, i) => (
              <tr key={t.id || i} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                <td style={{ padding: '6px 0', color: i === 0 ? F1_RED : C.dim, fontWeight: i === 0 ? 700 : 500 }}>
                  {t.position ?? i + 1}
                </td>
                <td style={{ padding: '6px 0', color: C.text, fontWeight: 500 }}>
                  <span style={{
                    display: 'inline-block', width: 3, height: 14,
                    background: t.accent, verticalAlign: 'middle', marginRight: 8,
                  }} />
                  {t.short || t.name}
                </td>
                <td style={{ padding: '6px 6px', color: C.dim, textAlign: 'right' }}>{t.wins || 0}</td>
                <td style={{ padding: '6px 0', color: C.text, textAlign: 'right', fontWeight: 600 }}>{t.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ─── Race calendar (full 23 GPs, WIB, next-race highlighted) ────────────────
function RaceCalendar({ races, source, lang }) {
  const nextRound = useMemo(() => nextGP()?.round, []);

  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${F1_RED}`,
      borderRadius: 3,
      padding: '14px 14px 10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h2 style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 15, fontWeight: 600,
          margin: 0, color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Kalender 2026 · WIB' : '2026 Calendar · WIB'}
        </h2>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>
          {races.length} {lang === 'id' ? 'BALAPAN' : 'ROUNDS'}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
        gap: 8,
      }}>
        {races.map((gp) => {
          const isNext = gp.round === nextRound;
          const countryLabel = lang === 'id' ? (gp.countryId || gp.country) : gp.country;
          return (
            <Link
              key={gp.round}
              to={gp.slug ? `/formula-1-2026/race/${gp.slug}` : '#'}
              style={{
                textDecoration: 'none',
                padding: '9px 11px',
                background: isNext ? `${F1_RED}18` : C.panelRow,
                border: `1px solid ${isNext ? F1_RED : C.lineSoft}`,
                borderLeft: `3px solid ${F1_RED}`,
                borderRadius: 3,
                display: 'block',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 3,
              }}>
                <span style={{ color: F1_RED, fontWeight: 700, fontSize: 9.5, letterSpacing: 1 }}>
                  R{String(gp.round).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 9, color: C.muted, letterSpacing: 0.5 }}>
                  {gp.sprint ? 'SPRINT · ' : ''}{gp.wibTime} WIB
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: C.text, fontWeight: 600, lineHeight: 1.2 }}>
                {gp.name}
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                {countryLabel} · {formatGPDate(gp.dateISO, lang)}
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ fontSize: 9, color: C.muted, padding: '10px 0 2px', letterSpacing: 0.3 }}>
        {lang === 'id'
          ? `Data: ${source === 'jolpica' ? 'Jolpica-F1 (live)' : 'snapshot lokal'} · waktu race ditampilkan dalam WIB`
          : `Data: ${source === 'jolpica' ? 'Jolpica-F1 (live)' : 'local snapshot'} · race times shown in WIB`}
      </div>
    </section>
  );
}

// ─── Disclaimer footer ──────────────────────────────────────────────────────
function Disclaimer({ lang }) {
  return (
    <div style={{
      padding: '10px 14px',
      fontSize: 10, color: C.muted, lineHeight: 1.5,
      borderTop: `1px solid ${C.lineSoft}`,
    }}>
      {lang === 'id'
        ? 'Gibol adalah media olahraga independen Indonesia. Tidak berafiliasi dengan FIA, Formula 1, atau tim/pembalap manapun. Data: Jolpica-F1 · OpenF1.'
        : 'Gibol is an independent Indonesian sports media site. Not affiliated with FIA, Formula 1, or any team/driver. Data: Jolpica-F1 · OpenF1.'}
    </div>
  );
}

// ─── Page shell ─────────────────────────────────────────────────────────────
export default function F1() {
  const location = useLocation();
  const { lang } = useApp();
  const { races, source } = useF1Schedule();
  const { drivers, teams, loading, error } = useF1Standings();

  const title = lang === 'id'
    ? 'Formula 1 2026 · Klasemen Pembalap, Jadwal 23 GP (WIB), Hasil Live | gibol.co'
    : 'Formula 1 2026 · Driver Standings, 23 GP Calendar (WIB), Live Results | gibol.co';
  const description = lang === 'id'
    ? `Dashboard live F1 ${SEASON} dalam Bahasa Indonesia — klasemen pembalap + konstruktor, kalender 23 Grand Prix dengan jam start WIB, hasil balapan terbaru, podium, dan tracking juara.`
    : `Live F1 ${SEASON} dashboard in Bahasa Indonesia — driver + constructor standings, 23-GP calendar with WIB start times, latest race results, podium, and championship tracking.`;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={title}
        description={description}
        path={location.pathname}
        lang={lang}
        keywords="formula 1 2026, f1 2026, klasemen f1, jadwal f1 2026, hasil grand prix, peluang juara f1, max verstappen, lando norris, lewis hamilton, charles leclerc, oscar piastri, f1 bahasa indonesia"
        jsonLd={CHAMPIONSHIP_JSONLD}
      />
      <div className="dashboard-wrap">
        <TopBar showBackLink accent={F1_RED} />

        <div style={{ padding: '16px 20px 8px' }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: F1_RED, fontWeight: 700, marginBottom: 4 }}>
            FORMULA 1 · SEASON {SEASON}
          </div>
          <div style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 44, lineHeight: 1, letterSpacing: -0.5, color: C.text, marginBottom: 4,
          }}>
            {lang === 'id' ? 'F1 2026 · LIVE' : 'F1 2026 · LIVE'}
          </div>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, maxWidth: 700 }}>
            {lang === 'id'
              ? 'Klasemen pembalap + konstruktor, kalender 23 Grand Prix dalam WIB, dan link ke recap tiap race. Regulasi chassis + power unit baru, Audi & Cadillac gabung — musim paling seru dalam dekade.'
              : 'Driver + constructor standings, 23-GP calendar in WIB, and links to each race recap. New chassis + power unit rules, Audi & Cadillac join — most compelling F1 season in a decade.'}
          </div>
        </div>

        <div style={{ padding: '8px 20px 20px', display: 'grid', gap: 14 }}>
          <NextRaceHero races={races} lang={lang} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 14,
          }}>
            <DriverStandings drivers={drivers} loading={loading} error={error} lang={lang} />
            <ConstructorStandings teams={teams} loading={loading} error={error} lang={lang} />
          </div>

          <RaceCalendar races={races} source={source} lang={lang} />
        </div>

        <Disclaimer lang={lang} />

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · F1 Indonesia</div>
          <ContactBar lang={lang} variant="inline" />
          <div>← <a href="/" style={{ color: C.dim, textDecoration: 'none' }}>{lang === 'id' ? 'semua dashboard' : 'all dashboards'}</a></div>
        </div>
      </div>
    </div>
  );
}
