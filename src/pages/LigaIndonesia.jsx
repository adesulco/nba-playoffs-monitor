import React from 'react';
import ComingSoon from './ComingSoon.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { COLORS as C } from '../lib/constants.js';

const features = [
  { title: 'Klasemen BRI Liga 1', desc: 'Standings 18 klub live, form 5 laga terakhir, selisih gol, jarak poin ke juara + zona degradasi.' },
  { title: 'Skor live match-day', desc: 'Setiap laga, update dalam 15 detik via API-Football. Lineup 60 menit sebelum kick-off.' },
  { title: 'Top skor', desc: 'Leaderboard pencetak gol terbanyak Liga 1 — update tiap laga, warna klub, pathway ke Timnas.' },
  { title: 'Derby Persija vs Persib', desc: 'El Clasico Indonesia dapat halaman sendiri — countdown, H2H, catatan historis, momen ikonik.' },
  { title: 'Ras degradasi + AFC', desc: 'Tracker bottom-3 degradasi + top-3 kualifikasi AFC Champions League Elite, update tiap match-day.' },
  { title: 'Bahasa-casual', desc: 'Catatan Liga 1 tiap match-day — voice yang match sama fan, bukan press release PSSI.' },
];

const featuresId = features; // identical — copy is already Bahasa-first

const KEY_CLUBS = [
  { name: 'Persija Jakarta', city: 'Jakarta', narrative: 'Tim ibu kota · fanbase Jakmania' },
  { name: 'Persib Bandung', city: 'Bandung', narrative: 'Klub paling bersejarah · fanbase Viking + Bobotoh' },
  { name: 'Arema FC', city: 'Malang', narrative: 'Singo Edan · fanbase Aremania' },
  { name: 'Persebaya Surabaya', city: 'Surabaya', narrative: 'Bonek FC · derby Jawa Timur' },
  { name: 'PSS Sleman', city: 'Sleman', narrative: 'Super Elang Jawa · BCS' },
  { name: 'Madura United', city: 'Pamekasan', narrative: 'Pulau Madura representation' },
];

const KEY_DATES = [
  { label: 'Musim reguler', value: 'Aug 2025 – May 2026' },
  { label: 'Championship Series', value: 'Mei 2026' },
  { label: 'El Clasico Indonesia', value: 'Persija vs Persib — 2x musim' },
  { label: 'AFC CL Elite slot', value: 'Juara + runner-up' },
];

function LigaPreviewBlock() {
  const { lang } = useApp();
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section>
        <h2 style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 600,
          margin: '10px 0 10px', color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'BRI Liga 1 — Super League Indonesia' : 'BRI Liga 1 — Super League Indonesia'}
        </h2>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 12, lineHeight: 1.6, maxWidth: 720 }}>
          {lang === 'id'
            ? 'Liga sepakbola kasta tertinggi Indonesia — 18 klub, 306 laga per musim, fanbase terbesar se-Asia Tenggara. Dashboard Liga 1 gibol.co menutup gap data yang situs resmi gak pernah kasih: klasemen real-time, top skor update tiap laga, tracker degradasi, plus halaman derby Persija-Persib sebagai SEO magnet untuk "el classico indonesia".'
            : "Indonesia's top-tier football league — 18 clubs, 306 matches per season, the largest fanbase in Southeast Asia. Our Liga 1 dashboard closes the data gap official sites never bridge: real-time standings, per-match top scorers, relegation tracker, plus a dedicated Persija–Persib derby page as our SEO magnet for 'el classico indonesia'."}
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8,
        }}>
          {KEY_CLUBS.map((club, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              background: C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderLeft: '3px solid #0057A8',
              borderRadius: 3,
              fontSize: 11.5,
            }}>
              <div style={{ color: C.text, fontWeight: 600, marginBottom: 2 }}>{club.name}</div>
              <div style={{ color: C.dim, fontSize: 10.5 }}>{club.city} · {club.narrative}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 600,
          margin: '8px 0 10px', color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Jadwal musim' : 'Season calendar'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {KEY_DATES.map((k, i) => (
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
    </div>
  );
}

const LIGA1_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: 'BRI Liga 1 · Super League Indonesia 2025-26',
  description: 'The 2025-26 season of BRI Liga 1, Indonesia\'s top-flight football league — 18 clubs including Persija Jakarta, Persib Bandung, Arema FC, and Persebaya Surabaya. Season runs August 2025 through May 2026.',
  startDate: '2025-08-08',
  endDate: '2026-05-31',
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Soccer',
  location: { '@type': 'Country', name: 'Indonesia' },
  organizer: { '@type': 'SportsOrganization', name: 'PT Liga Indonesia Baru', url: 'https://ligaindonesiabaru.com' },
  url: 'https://www.gibol.co/liga-1-2026',
};

export default function LigaIndonesia() {
  return (
    <ComingSoon
      league="BRI LIGA 1 · SUPER LEAGUE INDONESIA 2025–26"
      title="Super League Indonesia Live Dashboard"
      titleId="Dashboard Live Liga 1 Indonesia"
      blurb="The Bahasa-casual BRI Liga 1 companion — live scores via API-Football, 18-club table with form guide, Golden Boot race, Persija-Persib derby tracker, relegation + AFC qualification watch. Launching 2026."
      blurbId="Companion Bahasa-casual untuk BRI Liga 1 — skor live via API-Football, klasemen 18 klub plus form, ras top skor, tracker derby Persija-Persib, plus pantauan degradasi + kualifikasi AFC. Rilis 2026."
      accent="#0057A8"
      launchDate="Late 2026"
      glyph="🇮🇩"
      features={features}
      featuresId={featuresId}
      seoKeywords="liga 1 indonesia, super league indonesia, bri liga 1, klasemen liga 1, jadwal liga 1, top skor liga 1, persija persib, el clasico indonesia, liga 1 2025-26, sepakbola indonesia"
      jsonLd={LIGA1_JSONLD}
    >
      <LigaPreviewBlock />
    </ComingSoon>
  );
}
