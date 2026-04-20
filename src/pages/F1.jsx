import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { useF1Schedule } from '../hooks/useF1Schedule.js';
import { useF1Standings } from '../hooks/useF1Standings.js';
import { useF1Results } from '../hooks/useF1Results.js';
import { TEAMS_BY_ID, nextGP, formatGPDate, SEASON } from '../lib/sports/f1/constants.js';

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

// ─── Round strip (horizontal scroll, NBA day-scroller pattern) ──────────────
function RoundStrip({ races, activeRound, onSelect, resultsByRound, lang }) {
  const tabRefs = useRef({});
  const trackRef = useRef(null);

  // Center the active round whenever it changes (including on mount).
  useEffect(() => {
    const el = tabRefs.current[activeRound];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeRound]);

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div
      ref={trackRef}
      style={{
        display: 'flex',
        overflowX: 'auto',
        background: C.panelSoft,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${F1_RED}`,
        borderRadius: 3,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {races.map((gp) => {
        const isActive = gp.round === activeRound;
        const hasResult = !!(resultsByRound && resultsByRound[gp.round]?.podium?.length);
        const isPast = hasResult || gp.dateISO < todayISO;
        const winner = hasResult ? resultsByRound[gp.round].podium[0] : null;
        return (
          <button
            key={gp.round}
            ref={(el) => { tabRefs.current[gp.round] = el; }}
            type="button"
            onClick={() => onSelect(gp.round)}
            style={{
              flex: '0 0 auto',
              minWidth: 112,
              padding: '10px 14px',
              background: isActive ? C.heroBg : 'transparent',
              border: 'none',
              borderRight: `1px solid ${C.lineSoft}`,
              borderBottom: isActive ? `3px solid ${F1_RED}` : '3px solid transparent',
              color: isActive ? C.text : C.dim,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: '"JetBrains Mono", monospace',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <div style={{
              fontSize: 9.5, letterSpacing: 1, fontWeight: 700,
              color: isActive ? F1_RED : C.muted,
            }}>
              R{String(gp.round).padStart(2, '0')}
              {gp.sprint && <span style={{ marginLeft: 6, fontSize: 8, opacity: 0.8 }}>· S</span>}
            </div>
            <div style={{ fontSize: 11, marginTop: 3, fontWeight: 600, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
              {gp.name.replace(' GP', '')}
            </div>
            <div style={{ fontSize: 9.5, marginTop: 2, color: C.muted, letterSpacing: 0.3 }}>
              {formatGPDate(gp.dateISO, lang).replace(`, ${SEASON}`, '').replace(` ${SEASON}`, '')}
            </div>
            <div style={{ fontSize: 8.5, marginTop: 4, letterSpacing: 0.4 }}>
              {isPast && winner ? (
                <span style={{ color: F1_RED, fontWeight: 700 }}>● {winner.code || winner.name.split(' ').pop()}</span>
              ) : isPast ? (
                <span style={{ color: C.muted }}>● {lang === 'id' ? 'selesai' : 'done'}</span>
              ) : (
                <span style={{ color: C.green }}>● {gp.wibTime} WIB</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Detail panel for the selected round ────────────────────────────────────
function RoundDetail({ gp, result, lang }) {
  if (!gp) return null;

  const countryLabel = lang === 'id' ? (gp.countryId || gp.country) : gp.country;
  const todayISO = new Date().toISOString().slice(0, 10);
  const hasPodium = !!(result?.podium?.length);
  const isPast = hasPodium || gp.dateISO < todayISO;

  // Days until race (positive = future, 0 = today, negative = past).
  const raceDate = new Date(gp.dateISO + 'T00:00:00Z');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((raceDate - today) / (1000 * 60 * 60 * 24));

  let countdown;
  if (daysUntil === 0) countdown = lang === 'id' ? 'Hari ini' : 'Today';
  else if (daysUntil === 1) countdown = lang === 'id' ? 'Besok' : 'Tomorrow';
  else if (daysUntil > 1 && daysUntil <= 7) countdown = lang === 'id' ? `${daysUntil} hari lagi` : `in ${daysUntil} days`;
  else if (daysUntil < 0) countdown = lang === 'id' ? 'Selesai' : 'Completed';
  else countdown = lang === 'id' ? `${daysUntil} hari lagi` : `in ${daysUntil} days`;

  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${F1_RED}`,
      borderRadius: 3,
      padding: '16px 18px 14px',
    }}>
      {/* Header: round, name, circuit, date/time */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 16,
        alignItems: 'center',
        paddingBottom: 12,
        borderBottom: `1px solid ${C.lineSoft}`,
        marginBottom: 12,
      }}>
        <div style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: 48, color: F1_RED, letterSpacing: -0.5,
          padding: '0 12px 0 0',
          borderRight: `1px solid ${C.lineSoft}`,
          lineHeight: 1,
        }}>
          R{String(gp.round).padStart(2, '0')}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: F1_RED, fontWeight: 700, marginBottom: 4 }}>
            {isPast
              ? (lang === 'id' ? 'HASIL BALAPAN' : 'RACE RESULT')
              : daysUntil <= 0
                ? (lang === 'id' ? 'BALAPAN HARI INI' : 'RACING TODAY')
                : (lang === 'id' ? 'BALAPAN BERIKUTNYA' : 'UPCOMING RACE')}
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
            {formatGPDate(gp.dateISO, lang)} · {gp.wibTime} WIB
            {!isPast && <> · <span style={{ color: F1_RED }}>{countdown}</span></>}
          </div>
        </div>
        {gp.slug && (
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
        )}
      </div>

      {/* Body: podium if past with results, otherwise race info */}
      {hasPodium ? (
        <Podium podium={result.podium} lang={lang} />
      ) : isPast ? (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id'
            ? 'Hasil balapan belum masuk dari Jolpica-F1. Coba refresh beberapa menit lagi.'
            : 'Race results not yet available from Jolpica-F1. Try refreshing in a few minutes.'}
        </div>
      ) : (
        <UpcomingInfo gp={gp} lang={lang} />
      )}
    </section>
  );
}

// ─── Podium (top-3 finishers for past races) ────────────────────────────────
function Podium({ podium, lang }) {
  const labels = ['🥇', '🥈', '🥉'];
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
        {lang === 'id' ? 'PODIUM' : 'PODIUM'}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {podium.map((p, i) => {
          const teamKey = Object.keys(TEAMS_BY_ID).find((k) => {
            const t = TEAMS_BY_ID[k];
            return t.name === p.teamName || t.short === p.teamName || p.teamName?.toLowerCase().includes(t.short.toLowerCase());
          });
          const accent = teamKey ? TEAMS_BY_ID[teamKey].accent : C.muted;
          return (
            <div key={p.code || i} style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto auto',
              gap: 12,
              alignItems: 'center',
              padding: '8px 10px',
              background: i === 0 ? `${F1_RED}10` : C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderLeft: `3px solid ${accent}`,
              borderRadius: 3,
            }}>
              <span style={{ fontSize: 18 }}>{labels[i]}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: C.text, fontWeight: 600, lineHeight: 1.1 }}>
                  {p.name}
                  {p.code && <span style={{ marginLeft: 6, color: C.muted, fontSize: 10, letterSpacing: 0.5 }}>{p.code}</span>}
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                  {p.teamName}
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: '"JetBrains Mono", monospace', textAlign: 'right' }}>
                {p.time || '—'}
              </div>
              <div style={{
                fontSize: 11, color: C.text, fontWeight: 700, textAlign: 'right',
                minWidth: 36,
              }}>
                {p.points} pt
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Upcoming race info (schedule + circuit) ────────────────────────────────
function UpcomingInfo({ gp, lang }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
        {lang === 'id' ? 'JADWAL BALAPAN · WIB' : 'RACE SCHEDULE · WIB'}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8,
      }}>
        <InfoBlock label={lang === 'id' ? 'LOMBA' : 'RACE'} value={`${gp.wibTime} WIB`} accent />
        <InfoBlock label={lang === 'id' ? 'TANGGAL' : 'DATE'} value={formatGPDate(gp.dateISO, lang)} />
        <InfoBlock label={lang === 'id' ? 'SIRKUIT' : 'CIRCUIT'} value={gp.circuit} />
        <InfoBlock
          label={lang === 'id' ? 'FORMAT' : 'FORMAT'}
          value={gp.sprint ? (lang === 'id' ? 'Sprint Weekend' : 'Sprint Weekend') : (lang === 'id' ? 'Standard' : 'Standard')}
        />
      </div>

      <div style={{ fontSize: 10, color: C.muted, marginTop: 10, letterSpacing: 0.3, lineHeight: 1.5 }}>
        {lang === 'id'
          ? 'Jadwal sesi FP, Kualifikasi, dan Sprint lengkap dalam WIB muncul di halaman detail race.'
          : 'Full FP, qualifying, and sprint session WIB times on the race detail page.'}
      </div>
    </div>
  );
}

function InfoBlock({ label, value, accent }) {
  return (
    <div style={{
      padding: '8px 10px',
      background: C.panelRow,
      border: `1px solid ${C.lineSoft}`,
      borderRadius: 3,
    }}>
      <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: C.muted, fontWeight: 700 }}>{label}</div>
      <div style={{
        fontSize: 12, marginTop: 4,
        color: accent ? F1_RED : C.text, fontWeight: accent ? 700 : 500,
        lineHeight: 1.25,
      }}>
        {value}
      </div>
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
  const { resultsByRound } = useF1Results();

  // Default active round = next upcoming GP. Recomputed once races load.
  const initialRound = useMemo(() => nextGP()?.round || 1, []);
  const [activeRound, setActiveRound] = useState(initialRound);

  const activeGP = useMemo(
    () => races.find((gp) => gp.round === activeRound) || null,
    [races, activeRound]
  );
  const activeResult = resultsByRound?.[activeRound] || null;

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
              ? 'Klasemen pembalap + konstruktor, kalender 23 Grand Prix dalam WIB, dan hasil tiap race. Regulasi chassis + power unit baru, Audi & Cadillac gabung — musim paling seru dalam dekade.'
              : 'Driver + constructor standings, 23-GP calendar in WIB, and per-race results. New chassis + power unit rules, Audi & Cadillac join — most compelling F1 season in a decade.'}
          </div>
        </div>

        <div style={{ padding: '8px 20px 20px', display: 'grid', gap: 14 }}>
          {/* Round-by-round scroller + detail panel (NBA day-scroller pattern) */}
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{
                fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 600,
                color: C.text, letterSpacing: -0.2,
              }}>
                {lang === 'id' ? 'Kalender 2026 · geser kiri-kanan' : '2026 Calendar · swipe'}
              </div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>
                {races.length} {lang === 'id' ? 'BALAPAN' : 'ROUNDS'} ·{' '}
                {source === 'jolpica'
                  ? (lang === 'id' ? 'Jolpica-F1 live' : 'Jolpica-F1 live')
                  : (lang === 'id' ? 'snapshot lokal' : 'local snapshot')}
              </div>
            </div>
            <RoundStrip
              races={races}
              activeRound={activeRound}
              onSelect={setActiveRound}
              resultsByRound={resultsByRound}
              lang={lang}
            />
            <RoundDetail gp={activeGP} result={activeResult} lang={lang} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 14,
          }}>
            <DriverStandings drivers={drivers} loading={loading} error={error} lang={lang} />
            <ConstructorStandings teams={teams} loading={loading} error={error} lang={lang} />
          </div>
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
