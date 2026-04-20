import React from 'react';
import { useParams, Link, useLocation, Navigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import ShareButton from '../components/ShareButton.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { CALENDAR_BY_SLUG, CALENDAR_2026, formatGPDate, nextGP } from '../lib/sports/f1/constants.js';
import { useF1Results } from '../hooks/useF1Results.js';

const F1_RED = '#E10600';

/**
 * F1 per-race page — v0.2.2 SEO-first stub with race context. Live results
 * + per-lap timing + telemetry land in v0.2.3 with OpenF1 integration. For
 * now this serves as the indexable landing page for "Japanese GP 2026"
 * search intent and as a share-anchor for social.
 */
export default function F1Race() {
  const { slug } = useParams();
  const location = useLocation();
  const { lang } = useApp();

  const gp = CALENDAR_BY_SLUG[slug];

  // Unknown slug → bounce to main F1 dashboard.
  if (!gp) return <Navigate to="/formula-1-2026" replace />;

  const countryLabel = lang === 'id' ? (gp.countryId || gp.country) : gp.country;
  const isNext = gp.round === nextGP()?.round;

  // If the race has already happened, pull the podium so the share text
  // reads like a real recap. Missing results = upcoming race, share the
  // schedule instead.
  const { resultsByRound } = useF1Results();
  const podium = resultsByRound?.[gp.round]?.podium || [];
  const hasPodium = podium.length >= 3;

  const shareText = hasPodium
    ? (lang === 'id'
        ? `Hasil ${gp.name} 2026 · R${String(gp.round).padStart(2, '0')} di ${gp.circuit} — P1 ${podium[0].code}, P2 ${podium[1].code}, P3 ${podium[2].code}`
        : `${gp.name} 2026 · R${String(gp.round).padStart(2, '0')} at ${gp.circuit} — P1 ${podium[0].code}, P2 ${podium[1].code}, P3 ${podium[2].code}`)
    : (lang === 'id'
        ? `${gp.name} 2026 · R${String(gp.round).padStart(2, '0')} di ${gp.circuit} — Minggu ${formatGPDate(gp.dateISO, 'id')} ${gp.wibTime} WIB${gp.sprint ? ' (weekend sprint)' : ''}`
        : `${gp.name} 2026 · R${String(gp.round).padStart(2, '0')} at ${gp.circuit} — Sunday ${formatGPDate(gp.dateISO, 'en')} at ${gp.wibTime} WIB${gp.sprint ? ' (sprint weekend)' : ''}`);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${gp.name} 2026 · Round ${gp.round}`,
    description: `The 2026 ${gp.name} — Round ${gp.round} of the FIA Formula One World Championship, held at ${gp.circuit}, ${gp.country}. Race date ${gp.dateISO}, main race ${gp.wibTime} WIB.`,
    startDate: gp.dateISO,
    endDate: gp.dateISO,
    eventStatus: 'https://schema.org/EventScheduled',
    sport: 'Formula 1',
    location: {
      '@type': 'Place',
      name: gp.circuit,
      address: { '@type': 'PostalAddress', addressCountry: gp.country },
    },
    organizer: { '@type': 'SportsOrganization', name: "Fédération Internationale de l'Automobile (FIA)", url: 'https://www.fia.com' },
    url: `https://www.gibol.co/formula-1-2026/race/${gp.slug}`,
  };

  const prevGP = CALENDAR_2026[gp.round - 2] || null;
  const nextRound = CALENDAR_2026[gp.round] || null;

  const title = lang === 'id'
    ? `${gp.name} 2026 · Jadwal WIB, Hasil, Klasemen (R${String(gp.round).padStart(2, '0')}) | gibol.co`
    : `${gp.name} 2026 · WIB Schedule, Results, Standings (R${String(gp.round).padStart(2, '0')}) | gibol.co`;
  const description = lang === 'id'
    ? `${gp.name} 2026 — Round ${gp.round} F1 di ${gp.circuit}, ${gp.country}. Race Minggu ${formatGPDate(gp.dateISO, 'id')} pukul ${gp.wibTime} WIB${gp.sprint ? ' (weekend sprint)' : ''}. Klasemen sementara, prediksi juara, recap Bahasa.`
    : `${gp.name} 2026 — Round ${gp.round} of the F1 championship at ${gp.circuit}, ${gp.country}. Main race Sunday ${formatGPDate(gp.dateISO, 'en')} at ${gp.wibTime} WIB${gp.sprint ? ' (sprint weekend)' : ''}.`;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={title}
        description={description}
        path={location.pathname}
        lang={lang}
        keywords={`${gp.name.toLowerCase()} 2026, ${gp.slug.replace(/-/g, ' ')} 2026, jadwal ${gp.name.toLowerCase()}, hasil ${gp.name.toLowerCase()} 2026, f1 round ${gp.round}, ${gp.circuit.toLowerCase()}, WIB f1`}
        jsonLd={schema}
      />
      <div className="dashboard-wrap">
        <TopBar showBackLink accent={F1_RED} />

        <div style={{
          padding: '24px 20px 18px',
          background: `linear-gradient(135deg, ${F1_RED}1a 0%, ${C.bg} 80%)`,
          borderBottom: `1px solid ${C.line}`,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            gap: 12, marginBottom: 4,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: F1_RED, fontWeight: 700 }}>
              F1 2026 · ROUND {String(gp.round).padStart(2, '0')} {isNext ? `· ${lang === 'id' ? 'BERIKUTNYA' : 'NEXT'}` : ''}
              {gp.sprint && <span style={{ marginLeft: 8, padding: '1px 5px', background: F1_RED, color: '#fff', borderRadius: 2, fontSize: 8 }}>SPRINT</span>}
            </div>
            <ShareButton
              url={`/formula-1-2026/race/${gp.slug}`}
              title={`${gp.name} 2026 · gibol.co`}
              text={shareText}
              accent={F1_RED}
              analyticsEvent="f1_race_share"
              size="sm"
              label={lang === 'id' ? 'BAGIKAN' : 'SHARE'}
            />
          </div>
          <div style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 52, lineHeight: 1, letterSpacing: -0.5, color: C.text, marginBottom: 6,
          }}>
            {gp.name} 2026
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginBottom: 2 }}>
            {gp.circuit} · {countryLabel}
          </div>
          <div style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>
            {lang === 'id' ? 'Race' : 'Race'}: {formatGPDate(gp.dateISO, lang)} · {gp.wibTime} WIB
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'grid', gap: 14 }}>
          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${F1_RED}`, borderRadius: 3, fontSize: 12, lineHeight: 1.7,
          }}>
            <h2 style={{ fontSize: 14, margin: '0 0 6px', color: C.text, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
              {lang === 'id' ? 'Tentang balapan ini' : 'About this race'}
            </h2>
            <p style={{ margin: 0, color: C.dim }}>
              {lang === 'id'
                ? `Round ${gp.round} dari 23 balapan musim F1 2026. Lomba utama dijadwalkan hari Minggu ${formatGPDate(gp.dateISO, 'id')} mulai ${gp.wibTime} WIB di sirkuit ${gp.circuit}, ${countryLabel}. ${gp.sprint ? 'Weekend ini termasuk format sprint — ada sprint race hari Sabtu sebelum balapan utama hari Minggu.' : 'Format weekend standar: FP1/FP2 hari Jumat, FP3 + Kualifikasi hari Sabtu, balapan hari Minggu.'}`
                : `Round ${gp.round} of 23 in the F1 2026 season. Main race Sunday ${formatGPDate(gp.dateISO, 'en')} at ${gp.wibTime} WIB from ${gp.circuit}, ${countryLabel}. ${gp.sprint ? 'This weekend uses the sprint format — a sprint race on Saturday precedes the main Grand Prix on Sunday.' : 'Standard weekend: FP1/FP2 Friday, FP3 + Qualifying Saturday, race Sunday.'}`}
            </p>
          </section>

          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${F1_RED}`, borderRadius: 3, fontSize: 12, lineHeight: 1.6,
          }}>
            <h2 style={{ fontSize: 14, margin: '0 0 6px', color: C.text, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
              {lang === 'id' ? 'Hasil + telemetri live' : 'Live results + telemetry'}
            </h2>
            <p style={{ margin: 0, color: C.dim }}>
              {lang === 'id'
                ? 'Mode balapan live (posisi, interval, pit stop, tyre stint, grafik telemetri) hadir di update berikutnya. Pantau klasemen lengkap di halaman utama F1.'
                : 'Live race mode (positions, intervals, pit stops, tyre stints, telemetry charts) ships in the next update. Full standings on the main F1 page.'}
            </p>
            <div style={{ marginTop: 10 }}>
              <Link to="/formula-1-2026" style={{
                display: 'inline-block',
                fontSize: 11, fontWeight: 700,
                padding: '7px 12px',
                background: F1_RED, color: '#fff',
                borderRadius: 3, textDecoration: 'none', letterSpacing: 0.3,
              }}>
                {lang === 'id' ? 'Lihat klasemen →' : 'View standings →'}
              </Link>
            </div>
          </section>

          {/* Nav to adjacent rounds */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11 }}>
            {prevGP ? (
              <Link to={`/formula-1-2026/race/${prevGP.slug}`} style={{
                flex: 1, padding: '10px 12px',
                background: C.panelRow, border: `1px solid ${C.lineSoft}`,
                borderLeft: `3px solid ${F1_RED}`, borderRadius: 3,
                color: C.text, textDecoration: 'none',
              }}>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 2 }}>
                  ← R{String(prevGP.round).padStart(2, '0')}
                </div>
                <div style={{ fontWeight: 600 }}>{prevGP.name}</div>
              </Link>
            ) : <div style={{ flex: 1 }} />}

            {nextRound ? (
              <Link to={`/formula-1-2026/race/${nextRound.slug}`} style={{
                flex: 1, padding: '10px 12px',
                background: C.panelRow, border: `1px solid ${C.lineSoft}`,
                borderLeft: `3px solid ${F1_RED}`, borderRadius: 3,
                color: C.text, textDecoration: 'none', textAlign: 'right',
              }}>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 2 }}>
                  R{String(nextRound.round).padStart(2, '0')} →
                </div>
                <div style={{ fontWeight: 600 }}>{nextRound.name}</div>
              </Link>
            ) : <div style={{ flex: 1 }} />}
          </div>
        </div>

        <div style={{
          padding: '10px 20px',
          fontSize: 10, color: C.muted, lineHeight: 1.5,
          borderTop: `1px solid ${C.lineSoft}`,
        }}>
          {lang === 'id'
            ? 'Gibol adalah media olahraga independen Indonesia. Tidak berafiliasi dengan FIA atau Formula 1. Data: Jolpica-F1 · OpenF1.'
            : 'Gibol is an independent Indonesian sports media site. Not affiliated with FIA or Formula 1. Data: Jolpica-F1 · OpenF1.'}
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
          <div>← <a href="/formula-1-2026" style={{ color: C.dim, textDecoration: 'none' }}>{lang === 'id' ? 'kalender F1' : 'F1 calendar'}</a></div>
        </div>
      </div>
    </div>
  );
}
