import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { COLORS as C } from '../lib/constants.js';
import { useWCStandings, useWCFixtures, WC_LIVE_STATES, wcKickoffWIB, wcDayLabel } from '../hooks/useWCLive.js';

// ============================================================================
// v0.79.26 — WC2026 GO-LIVE (kickoff day, 2026-06-11). The ComingSoon
// waitlist wrapper is replaced by a live hub: today's fixtures (WIB, live
// scores via API-Football through the edge proxy), 12 live group tables,
// and a prominent Pick'em entry band. The evergreen preview content (host
// cities, key dates, format) stays below the live sections. Approved by
// Ade's go-live directive 2026-06-11 (protected-surface change).
// ============================================================================

// F05 — Real World Cup 2026 preview content. Data verified against FIFA.com
// announcements through April 2026. Update as the draw finalizes.
const HOST_CITIES = [
  { country: '🇺🇸 USA', cities: ['Atlanta', 'Boston', 'Dallas', 'Houston', 'Kansas City', 'Los Angeles', 'Miami', 'New York/New Jersey', 'Philadelphia', 'San Francisco Bay Area', 'Seattle'] },
  { country: '🇲🇽 Mexico', cities: ['Guadalajara', 'Mexico City', 'Monterrey'] },
  { country: '🇨🇦 Canada', cities: ['Toronto', 'Vancouver'] },
];

const KEY_FIXTURES = [
  { label: 'Opening match', value: 'Jun 11 · Mexico City' },
  { label: 'Group stage ends', value: 'Jun 27' },
  { label: 'Round of 32', value: 'Jun 28 – Jul 3' },
  { label: 'Round of 16', value: 'Jul 4 – 7' },
  { label: 'Quarterfinals', value: 'Jul 9 – 11' },
  { label: 'Semifinals', value: 'Jul 14 – 15' },
  { label: 'Third-place playoff', value: 'Jul 18 · Miami' },
  { label: 'Final', value: 'Jul 19 · MetLife Stadium, NJ' },
];

const FORMAT_POINTS = [
  { title: '48 teams', titleId: '48 tim', desc: 'Biggest World Cup ever — up from 32. Asia gets 8 slots (including hosts), Africa 9, Europe 16, CONMEBOL 6, CONCACAF 6 (plus 3 host auto-slots), OFC 1, plus 2 playoff winners.', descId: 'Piala Dunia terbesar sepanjang sejarah — naik dari 32 ke 48. Asia dapat 8 slot (termasuk tuan rumah), Afrika 9, Eropa 16, CONMEBOL 6, CONCACAF 6 (plus 3 slot otomatis tuan rumah), OFC 1, plus 2 pemenang playoff.' },
  { title: '12 groups of 4', titleId: '12 grup, 4 tim', desc: 'Top 2 from each group + 8 best third-placed teams advance to Round of 32. 104 matches total — 40 more than 2022.', descId: 'Juara & runner-up tiap grup + 8 peringkat-3 terbaik lolos ke Ronde 32. Total 104 laga — 40 lebih banyak dari 2022.' },
  { title: 'Indonesia lens', titleId: 'Lensa Indonesia', desc: "Indonesia hasn't qualified since 1938 but sits in Round 3 of AFC qualifying — their best shot in 88 years. We'll track Timnas every step.", descId: 'Indonesia tidak lolos sejak 1938 tapi sekarang berada di Ronde 3 kualifikasi AFC — peluang terbaik dalam 88 tahun. Kami akan track Timnas langkah demi langkah.' },
];

function FIFAPreviewBlock() {
  const { lang } = useApp();
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Host cities */}
      <section>
        <h2 style={{
          fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600,
          margin: '16px 0 10px', color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? '16 kota tuan rumah · 3 negara' : '16 host cities · 3 countries'}
        </h2>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 14, lineHeight: 1.6, maxWidth: 720 }}>
          {lang === 'id'
            ? 'Piala Dunia 2026 akan digelar di 16 kota yang tersebar di Amerika Serikat, Meksiko, dan Kanada — pertama kalinya turnamen besar FIFA menggunakan tiga negara tuan rumah bersamaan.'
            : 'The 2026 World Cup spans 16 cities across the USA, Mexico, and Canada — the first time FIFA hosts a major tournament across three countries simultaneously.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {HOST_CITIES.map((hc, i) => (
            <div key={i} style={{
              padding: '12px 14px', background: C.panelRow, border: `1px solid ${C.lineSoft}`,
              borderLeft: `3px solid #2c8ad6`, borderRadius: 3,
            }}>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 600, marginBottom: 8 }}>
                {hc.country} · {hc.cities.length} {lang === 'id' ? 'kota' : 'cities'}
              </div>
              <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
                {hc.cities.join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key fixtures / dates */}
      <section>
        <h2 style={{
          fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600,
          margin: '8px 0 10px', color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Jadwal kunci turnamen' : 'Key tournament dates'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {KEY_FIXTURES.map((k, i) => (
            <div key={i} style={{
              padding: '10px 14px', background: C.panelSoft, border: `1px solid ${C.lineSoft}`,
              borderRadius: 3,
            }}>
              <div style={{ fontSize: 9.5, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{k.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Format explainer cards */}
      <section>
        <h2 style={{
          fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600,
          margin: '8px 0 10px', color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Format turnamen' : 'Tournament format'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {FORMAT_POINTS.map((p, i) => (
            <div key={i} style={{
              padding: '12px 14px', background: C.panel, border: `1px solid ${C.line}`,
              borderTop: `2px solid #2c8ad6`, borderRadius: 3, fontSize: 12,
            }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 6 }}>
                {lang === 'id' ? p.titleId : p.title}
              </div>
              <div style={{ color: C.dim, lineHeight: 1.6, fontSize: 11.5 }}>
                {lang === 'id' ? p.descId : p.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Countdown note */}
      <section style={{
        padding: 16, background: C.panel, border: `1px solid ${C.line}`, borderLeft: `3px solid #2c8ad6`,
        borderRadius: 3, fontSize: 12, lineHeight: 1.7,
      }}>
        <h3 style={{ fontSize: 14, margin: '0 0 8px', color: C.text }}>
          {lang === 'id' ? 'Kenapa kami bangun ini' : 'Why we build this'}
        </h3>
        <p style={{ margin: 0, color: C.dim }}>
          {lang === 'id'
            ? 'Piala Dunia di Asia Tenggara selalu prime-time mendadak jadi tengah malam — laga AS kickoff sekitar jam 03:00 WIB. Dashboard FIFA 2026 dari gibol.co akan menampilkan jadwal dalam waktu WIB, xG live, tabel grup interaktif, dan panduan kota tuan rumah dalam Bahasa Indonesia. Supaya fan Indonesia nggak ketinggalan momen apapun.'
            : 'World Cup matches in SEA timezones swing wildly — US games kick off around 3 AM WIB. Our dashboard shows schedules in WIB, live xG, interactive group tables, and host-city guides — all in Bahasa Indonesia. So Indonesian fans never miss a moment.'}
        </p>
      </section>
    </div>
  );
}

const FIFA_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: '2026 FIFA World Cup',
  description: 'The 23rd FIFA World Cup — the first with 48 teams and the first co-hosted by three nations (USA, Mexico, Canada). 104 matches across 16 host cities, opening match June 11, final July 19 at MetLife Stadium.',
  startDate: '2026-06-11',
  endDate: '2026-07-19',
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Soccer',
  location: [
    { '@type': 'Country', name: 'United States' },
    { '@type': 'Country', name: 'Mexico' },
    { '@type': 'Country', name: 'Canada' },
  ],
  organizer: { '@type': 'SportsOrganization', name: 'FIFA', url: 'https://www.fifa.com' },
  url: 'https://www.gibol.co/fifa-world-cup-2026',
};

const ACCENT = '#2c8ad6';

function PickemBand({ lang }) {
  const btn = (primary) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 16px', borderRadius: 4, fontSize: 12.5, fontWeight: 700,
    textDecoration: 'none', letterSpacing: 0.3, minHeight: 40,
    background: primary ? ACCENT : 'transparent',
    color: primary ? '#fff' : C.text,
    border: `1px solid ${primary ? ACCENT : C.line}`,
  });
  return (
    <section style={{
      padding: '16px 18px', background: C.panel, border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${ACCENT}`, borderRadius: 3, display: 'flex',
      flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14,
    }}>
      <div style={{ minWidth: 220, flex: '1 1 280px' }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, color: ACCENT, fontWeight: 700, marginBottom: 4 }}>
          GIBOL PICK'EM
        </div>
        <div style={{ fontSize: 15, color: C.text, fontWeight: 700, marginBottom: 3 }}>
          {lang === 'id' ? 'Prediksi Piala Dunia, main bareng teman' : 'Predict the World Cup with friends'}
        </div>
        <div style={{ fontSize: 11.5, color: C.dim, lineHeight: 1.5 }}>
          {lang === 'id'
            ? 'Tebak skor tiap laga, bangun bracket sampai juara, dan adu peringkat di grup. Gratis.'
            : 'Pick every match, build your bracket to the champion, climb your group leaderboard. Free.'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to="/pickem" style={btn(true)}>{lang === 'id' ? 'Mulai prediksi →' : 'Start predicting →'}</Link>
        <Link to="/pickem/bracket" style={btn(false)}>{lang === 'id' ? 'Bangun bracket' : 'Build bracket'}</Link>
      </div>
    </section>
  );
}

function FixturesStrip({ lang }) {
  const { fixtures } = useWCFixtures();
  if (!fixtures || fixtures.length === 0) return null;
  return (
    <section>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600, margin: '4px 0 10px', color: C.text, letterSpacing: -0.2 }}>
        {lang === 'id' ? 'Laga terdekat' : 'Matches'}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
        {fixtures.slice(0, 9).map((f) => {
          const live = WC_LIVE_STATES.has(f.statusShort);
          const done = f.statusShort === 'FT' || f.statusShort === 'AET' || f.statusShort === 'PEN';
          const score = (f.home.goals != null && f.away.goals != null)
            ? `${f.home.goals} – ${f.away.goals}`
            : wcKickoffWIB(f.date);
          return (
            <div key={f.id} style={{
              padding: '10px 12px', background: C.panelRow, border: `1px solid ${live ? ACCENT : C.lineSoft}`,
              borderRadius: 3, fontSize: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 9.5, letterSpacing: 0.8, color: live ? ACCENT : C.muted, fontWeight: 700 }}>
                <span>{live ? `● LIVE ${f.elapsed != null ? `· ${f.elapsed}'` : ''}` : done ? 'FT' : wcDayLabel(f.date, lang)}</span>
                <span style={{ color: C.muted, fontWeight: 500 }}>{(f.round || '').replace('Group Stage - ', 'MD ')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                  {f.home.logo && <img src={f.home.logo} alt="" width="18" height="18" loading="lazy" />}
                  <span style={{ color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.home.name}</span>
                </div>
                <div style={{ fontWeight: 700, color: live ? ACCENT : C.text, whiteSpace: 'nowrap', fontSize: done || live ? 14 : 11.5 }}>{score}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, justifyContent: 'flex-end' }}>
                  <span style={{ color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.away.name}</span>
                  {f.away.logo && <img src={f.away.logo} alt="" width="18" height="18" loading="lazy" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GroupTables({ lang }) {
  const { groups } = useWCStandings();
  if (!groups || groups.length === 0) return null;
  const th = { textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: C.muted, fontSize: 9.5 };
  const td = { textAlign: 'right', padding: '4px 6px', color: C.dim, fontVariantNumeric: 'tabular-nums' };
  return (
    <section>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600, margin: '8px 0 10px', color: C.text, letterSpacing: -0.2 }}>
        {lang === 'id' ? 'Klasemen grup — live' : 'Group standings — live'}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {groups.map((g) => (
          <div key={g.letter} style={{ background: C.panelRow, border: `1px solid ${C.lineSoft}`, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.text }}>
              {lang === 'id' ? 'GRUP' : 'GROUP'} {g.letter}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left', paddingLeft: 12 }}>{lang === 'id' ? 'Tim' : 'Team'}</th>
                  <th style={th}>M</th><th style={th}>S</th><th style={th}>K</th><th style={th}>SG</th><th style={{ ...th, color: C.text }}>P</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.name} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                    <td style={{ ...td, textAlign: 'left', paddingLeft: 12, color: C.text }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {r.logo && <img src={r.logo} alt="" width="14" height="14" loading="lazy" />}
                        {r.name}
                      </span>
                    </td>
                    <td style={td}>{r.win}</td><td style={td}>{r.draw}</td><td style={td}>{r.lose}</td>
                    <td style={td}>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td style={{ ...td, color: C.text, fontWeight: 700 }}>{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function FIFA() {
  const { lang } = useApp();
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <SEO
        title={lang === 'id'
          ? 'Piala Dunia 2026 — Skor Live, Klasemen Grup, Jadwal WIB | gibol.co'
          : 'FIFA World Cup 2026 — Live Scores, Group Tables, Schedule | gibol.co'}
        description="Piala Dunia 2026 LIVE: skor real-time, klasemen 12 grup, jadwal dalam WIB, dan Pick'em prediksi bracket. 48 tim, 104 laga, dari Mexico City sampai final MetLife Stadium."
        path="/fifa-world-cup-2026"
        keywords="piala dunia 2026, skor piala dunia live, klasemen grup piala dunia, jadwal piala dunia WIB, fifa world cup 2026, prediksi piala dunia"
        image="https://www.gibol.co/og/hub-fifa-wc.png"
        jsonLd={FIFA_JSONLD}
      />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '22px 18px 48px', display: 'grid', gap: 22 }}>
        <header>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 6 }}>
            FIFA WORLD CUP 2026 · USA · MEXICO · CANADA ·{' '}
            <span style={{ color: ACCENT, fontWeight: 700 }}>● LIVE</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(24px, 3.4vw, 34px)', fontWeight: 700, margin: '0 0 8px', letterSpacing: -0.4 }}>
            {lang === 'id' ? 'Piala Dunia 2026' : 'World Cup 2026'}
          </h1>
          <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, maxWidth: 680, margin: 0 }}>
            {lang === 'id'
              ? '48 tim, 104 laga, 16 kota di tiga negara. Skor live, klasemen grup, dan jadwal dalam WIB — turnamen udah mulai.'
              : '48 teams, 104 matches, 16 cities across three countries. Live scores, group tables, and schedules — the tournament is on.'}
          </p>
        </header>

        <PickemBand lang={lang} />
        <FixturesStrip lang={lang} />
        <GroupTables lang={lang} />
        <FIFAPreviewBlock />
      </div>
    </div>
  );
}
