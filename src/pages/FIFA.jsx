import React from 'react';
import ComingSoon from './ComingSoon.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { COLORS as C } from '../lib/constants.js';

const features = [
  { title: 'Live match center', desc: 'Minute-by-minute scoring, xG, possession, shots — all 104 matches across the tournament.' },
  { title: 'Group tables', desc: '12 groups, live standings, qualification scenarios updated in real time.' },
  { title: 'Knockout bracket', desc: 'Round of 32 through Final — path visualization with country flags and predictions.' },
  { title: 'Player tracking', desc: 'Star-player watchlist: goals, assists, cards, and minutes across the tournament.' },
  { title: 'Prediction markets', desc: 'Polymarket + Kalshi for winner odds, top scorer, Golden Boot, and every match line.' },
  { title: 'Host city guides', desc: 'Venue info, broadcast schedule per region, and travel tips for all 16 host cities.' },
];

const featuresId = [
  { title: 'Pusat laga live', desc: 'Skor menit-per-menit, xG, possession, tembakan — 104 laga sepanjang turnamen.' },
  { title: 'Tabel grup', desc: '12 grup, klasemen live, skenario kualifikasi update real-time.' },
  { title: 'Bagan gugur', desc: 'Ronde 32 sampai Final — visualisasi jalan dengan bendera negara dan prediksi.' },
  { title: 'Tracking pemain', desc: 'Watchlist pemain bintang: gol, assist, kartu, dan menit main sepanjang turnamen.' },
  { title: 'Pasar prediksi', desc: 'Polymarket + Kalshi untuk peluang juara, top skor, Sepatu Emas, dan setiap line laga.' },
  { title: 'Panduan kota tuan rumah', desc: 'Info venue, jadwal siaran per region, dan tips travel untuk 16 kota tuan rumah.' },
];

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
            ? 'Piala Dunia di Asia Tenggara selalu prime-time mendadak jadi tengah malam — laga AS kickoff sekitar jam 03:00 WIB. Dashboard FIFA 2026 dari gibol.co akan menampilkan jadwal dalam waktu WIB, xG live, tabel grup interaktif, dan prediksi Polymarket dalam Bahasa Indonesia. Supaya fan Indonesia nggak ketinggalan momen apapun.'
            : 'World Cup matches in SEA timezones swing wildly — US games kick off around 3 AM WIB. Our dashboard shows schedules in WIB, live xG, interactive group tables, and Polymarket predictions — all in Bahasa Indonesia. So Indonesian fans never miss a moment.'}
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

export default function FIFA() {
  return (
    <ComingSoon
      league="FIFA WORLD CUP 2026 · USA · MEXICO · CANADA"
      title="World Cup 2026 Dashboard"
      titleId="Dashboard Piala Dunia 2026"
      blurb="48 teams. 104 matches. 16 host cities across three countries. Live scores, group tables, knockout brackets, player tracking, and prediction markets — from opening match in Mexico City to the final at MetLife Stadium."
      blurbId="48 tim. 104 pertandingan. 16 kota tuan rumah di tiga negara. Skor live, tabel grup, bagan gugur, tracking pemain, dan pasar prediksi — dari laga pembuka di Mexico City hingga final di MetLife Stadium."
      accent="#2c8ad6"
      launchDate="Jun 11, 2026 · kickoff"
      icon="wc"
      features={features}
      featuresId={featuresId}
      seoKeywords="fifa world cup 2026, piala dunia 2026, jadwal piala dunia 2026, skor piala dunia, grup piala dunia 2026, kickoff piala dunia 11 juni 2026, USA Mexico Canada world cup, FIFA 2026, world cup indonesia"
      jsonLd={FIFA_JSONLD}
    >
      <FIFAPreviewBlock />
    </ComingSoon>
  );
}
