import React from 'react';
import ComingSoon from './ComingSoon.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { COLORS as C } from '../lib/constants.js';

const features = [
  { title: 'Live skor + play-by-play', desc: 'Real-time scoring for every IBL game, pulled direct from the league feed.' },
  { title: 'Klasemen + playoff picture', desc: 'Live standings and projected playoff seeding based on current form.' },
  { title: 'Top performers', desc: 'Season leaderboards for points, rebounds, assists, and advanced stats.' },
  { title: 'Broadcast schedule', desc: 'Know exactly where to watch: Vidio, Indosiar, MOJI, and YouTube streams.' },
  { title: 'Team deep dives', desc: 'Roster, schedule, form, and head-to-head history for all 16 IBL clubs.' },
  { title: 'Bahasa first', desc: 'Full Bahasa Indonesia coverage, built for the Indonesian fan.' },
];

const featuresId = [
  { title: 'Live skor + play-by-play', desc: 'Skor real-time untuk setiap laga IBL, langsung dari feed resmi liga.' },
  { title: 'Klasemen + gambaran playoff', desc: 'Klasemen live dan proyeksi seeding playoff berdasarkan form saat ini.' },
  { title: 'Pemain terbaik', desc: 'Leaderboard poin, rebound, assist, dan stat lanjutan sepanjang musim.' },
  { title: 'Jadwal siaran', desc: 'Tahu persis dimana nonton: Vidio, Indosiar, MOJI, dan streaming YouTube.' },
  { title: 'Analisis tim', desc: 'Roster, jadwal, form, dan head-to-head untuk 16 klub IBL.' },
  { title: 'Bahasa first', desc: 'Coverage penuh Bahasa Indonesia, dibuat untuk pecinta bola lokal.' },
];

// F05 — Real IBL preview content so /ibl is not a thin placeholder page.
// Data current as of 2025-26 IBL season. Update before each new season.
const IBL_TEAMS = [
  { name: 'Pelita Jaya Bakrie Jakarta', city: 'Jakarta', notes: 'Reigning champion · most titles in league history' },
  { name: 'Prawira Harum Bandung', city: 'Bandung', notes: '2023–24 runner-up · strong import duo' },
  { name: 'Satria Muda Pertamina', city: 'Jakarta', notes: 'Historic power · NBA scouting pipeline' },
  { name: 'RANS Simba Bogor', city: 'Bogor', notes: 'Raffi Ahmad ownership · media-first brand' },
  { name: 'Dewa United Banten', city: 'Tangerang', notes: 'Young roster · rising force' },
  { name: 'Tangerang Hawks Basketball', city: 'Tangerang', notes: 'Relocated franchise · rebuild mode' },
  { name: 'Bima Perkasa Jogja', city: 'Yogyakarta', notes: 'Student-city fan base · loyal crowd' },
  { name: 'Pacific Caesar Surabaya', city: 'Surabaya', notes: 'East Java rivalry anchor' },
  { name: 'Bali United Basketball', city: 'Denpasar', notes: 'Newest expansion · tourist-market play' },
  { name: 'Amartha Hangtuah Jakarta', city: 'Jakarta', notes: 'Military-backed club · disciplined system' },
  { name: 'Kesatria Bengawan Solo', city: 'Solo', notes: 'Classic Central Java identity' },
  { name: 'West Bandits Solo', city: 'Solo', notes: 'Two Solo teams = instant derby' },
  { name: 'NSH Mountain Gold Timika', city: 'Timika', notes: 'Papua representative · unique altitude advantage' },
  { name: 'Evos Thunder Bogor', city: 'Bogor', notes: 'Esports crossover brand · young audience' },
  { name: 'Prawira Tampa Indah Bandung', city: 'Bandung', notes: 'Developmental roster · Bandung derby' },
  { name: 'Elang Pacific Caesar', city: 'Surabaya', notes: 'Alternate Surabaya identity' },
];

const KEY_DATES = [
  { label: 'Season tip-off (typical)', value: 'October' },
  { label: 'All-Star Weekend', value: 'February' },
  { label: 'Regular season end', value: 'April' },
  { label: 'Playoffs', value: 'April – May' },
  { label: 'IBL Finals', value: 'May' },
];

function IBLPreviewBlock() {
  const { lang } = useApp();
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Teams section */}
      <section>
        <h2 style={{
          fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600,
          margin: '16px 0 12px', color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? '16 klub IBL musim 2025–26' : '16 IBL clubs in the 2025–26 season'}
        </h2>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 14, lineHeight: 1.6, maxWidth: 720 }}>
          {lang === 'id'
            ? 'Berikut daftar 16 klub yang berkompetisi di Indonesia Basketball League (IBL) musim 2025–26. Dashboard live IBL dari gibol.co akan melacak setiap klub dengan statistik lengkap, play-by-play, klasemen, dan peluang playoff.'
            : 'The 16 clubs competing in the 2025–26 IBL season. Our live dashboard will track each club with full stats, play-by-play, standings, and playoff odds.'}
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8,
        }}>
          {IBL_TEAMS.map((t, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              background: C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderRadius: 3,
              fontSize: 11.5,
            }}>
              <div style={{ color: C.text, fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
              <div style={{ color: C.dim, fontSize: 10.5 }}>{t.city} · {t.notes}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Key dates */}
      <section>
        <h2 style={{
          fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600,
          margin: '8px 0 12px', color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Jadwal musim IBL' : 'Season schedule'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {KEY_DATES.map((k, i) => (
            <div key={i} style={{
              padding: '10px 14px', background: C.panelSoft, border: `1px solid ${C.lineSoft}`,
              borderRadius: 3,
            }}>
              <div style={{ fontSize: 9.5, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{k.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Format explainer */}
      <section style={{
        padding: 16, background: C.panelSoft, border: `1px solid ${C.lineSoft}`, borderRadius: 3,
        fontSize: 12, lineHeight: 1.7, color: C.text,
      }}>
        <h3 style={{ fontSize: 14, margin: '0 0 8px', color: C.text }}>
          {lang === 'id' ? 'Format kompetisi IBL' : 'IBL competition format'}
        </h3>
        {lang === 'id' ? (
          <p style={{ margin: 0, color: C.dim }}>
            Musim reguler IBL berlangsung sekitar 7 bulan (Oktober – April) dengan setiap klub memainkan 30 pertandingan. 8 klub teratas lolos ke playoff yang dimulai April/Mei. Format playoff: best-of-3 di Quarterfinal, best-of-5 di Semifinal dan Final. Juara IBL mewakili Indonesia di ASEAN Basketball League dan FIBA Asia Champions Cup. Kami akan melacak semua ini di dashboard.
          </p>
        ) : (
          <p style={{ margin: 0, color: C.dim }}>
            The IBL regular season runs roughly 7 months (October – April) with each club playing 30 games. Top 8 clubs advance to the playoffs starting April/May. Format: best-of-3 Quarterfinals, best-of-5 Semifinals and Finals. The IBL champion represents Indonesia at the ASEAN Basketball League and FIBA Asia Champions Cup. We'll track all of it.
          </p>
        )}
      </section>

      {/* Why we're building this */}
      <section style={{
        padding: 16, background: C.panel, border: `1px solid ${C.line}`, borderLeft: `3px solid #d2191f`,
        borderRadius: 3, fontSize: 12, lineHeight: 1.7,
      }}>
        <h3 style={{ fontSize: 14, margin: '0 0 8px', color: C.text }}>
          {lang === 'id' ? 'Kenapa IBL butuh dashboard seperti ini' : 'Why IBL deserves this'}
        </h3>
        <p style={{ margin: 0, color: C.dim }}>
          {lang === 'id'
            ? 'Basket Indonesia punya fan base yang loyal, tapi pengalaman nonton digitalnya masih tertinggal. Skor sulit dicari, stat pemain tidak terpusat, dan klasemen live jarang update real-time. Dashboard IBL dari gibol.co akan menutup gap itu — pengalaman nonton setara NBA, tapi khusus untuk liga sendiri. Sedang dibangun sekarang.'
            : "Indonesian basketball has a loyal fan base, but the digital viewing experience lags. Scores are hard to find, player stats are scattered, and live standings rarely update in real-time. Our IBL dashboard closes that gap — an NBA-grade viewing experience for our own league. Being built now."}
        </p>
      </section>
    </div>
  );
}

const IBL_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: 'Indonesia Basketball League 2026-27',
  description: 'The Indonesia Basketball League (IBL) 2026-27 season — Indonesia\'s top-tier professional basketball league featuring Pelita Jaya Bakrie Jakarta, Prawira Harum Bandung, Satria Muda Pertamina, RANS Simba Bogor, and 12+ other clubs.',
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Basketball',
  location: { '@type': 'Country', name: 'Indonesia' },
  organizer: { '@type': 'SportsOrganization', name: 'PT Bola Basket Indonesia (IBL)', url: 'https://iblindonesia.com' },
  url: 'https://www.gibol.co/ibl',
};

export default function IBL() {
  return (
    <ComingSoon
      league="INDONESIA BASKETBALL LEAGUE · SEASON 2025–26"
      title="IBL Live Dashboard"
      titleId="Dashboard Live IBL"
      blurb="The definitive live companion for Indonesia's top professional basketball league. Pelita Jaya, Prawira Bandung, Rans Simba, Satria Muda — all live, all in one place."
      blurbId="Companion live definitif untuk liga basket profesional teratas Indonesia. Pelita Jaya, Prawira Bandung, Rans Simba, Satria Muda — semuanya live, di satu tempat."
      accent="#d2191f"
      launchDate="Oct 2026"
      icon="id"
      features={features}
      featuresId={featuresId}
      seoKeywords="IBL, liga basket indonesia, skor IBL, jadwal IBL, klasemen IBL, pelita jaya, prawira bandung, satria muda, rans simba, pro basket indonesia, IBL season 2025-26, liga basket indonesia 2026"
      jsonLd={IBL_JSONLD}
    >
      <IBLPreviewBlock />
    </ComingSoon>
  );
}
