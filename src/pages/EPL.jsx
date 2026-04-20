import React from 'react';
import ComingSoon from './ComingSoon.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { COLORS as C } from '../lib/constants.js';

const features = [
  { title: '20-club league table', desc: 'Live standings with form guide (last 5), goal diff, points from Champions League + relegation zones.' },
  { title: 'Match-day strip', desc: 'Every gameweek, every match — scores update within 30s, lineups announced 60 minutes before kickoff.' },
  { title: 'Top scorers race', desc: 'Golden Boot leaderboard updated every match. Haaland vs Salah vs whoever wins this season.' },
  { title: 'Live match focus', desc: 'Goal timeline, cards, substitutions, possession, shots — pick any match, dig in.' },
  { title: 'Title + relegation odds', desc: 'Polymarket market signal for Premier League title + bottom-3 relegation risk, with Bahasa narrative.' },
  { title: 'Bahasa-first', desc: 'Recap tiap match-day Senin pagi, share-ready — dari fan Liverpool, Arsenal, United, Chelsea di Indonesia untuk semua fan Indonesia.' },
];

const featuresId = [
  { title: 'Klasemen 20 klub', desc: 'Klasemen live dengan form 5 laga terakhir, selisih gol, jarak poin ke zona Liga Champions + zona degradasi.' },
  { title: 'Strip match-day', desc: 'Setiap gameweek, setiap laga — skor update dalam 30 detik, lineup diumumkan 60 menit sebelum kick-off.' },
  { title: 'Ras top skor', desc: 'Leaderboard Golden Boot update tiap laga. Haaland vs Salah vs siapapun yang jadi juara musim ini.' },
  { title: 'Fokus laga live', desc: 'Timeline gol, kartu, pergantian, possession, tembakan — pilih laga, gali lebih dalam.' },
  { title: 'Peluang juara + degradasi', desc: 'Sinyal pasar Polymarket untuk juara EPL + risiko degradasi bottom-3, dengan narasi Bahasa.' },
  { title: 'Bahasa-first', desc: 'Recap tiap match-day Senin pagi, siap share — dari fans Liverpool, Arsenal, United, Chelsea Indonesia untuk semua fan Indonesia.' },
];

const TOP_CLUBS_HIGHLIGHT = [
  { name: 'Manchester City', city: 'Manchester', narrative: 'Four-in-a-row title streak · Guardiola era' },
  { name: 'Arsenal', city: 'London', narrative: 'Title challengers · Arteta rebuild matured' },
  { name: 'Liverpool', city: 'Liverpool', narrative: 'Post-Klopp era · Slot tactical reset' },
  { name: 'Manchester United', city: 'Manchester', narrative: 'Ten Hag era · European spots are the benchmark' },
  { name: 'Chelsea', city: 'London', narrative: 'Youngest squad in league · Boehly project' },
  { name: 'Tottenham', city: 'London', narrative: 'Postecoglou ball · high-line high-octane' },
];

function EPLPreviewBlock() {
  const { lang } = useApp();
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section>
        <h2 style={{
          fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600,
          margin: '10px 0 10px', color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Enam klub papan atas musim 2025-26' : 'Six title-picture clubs this season'}
        </h2>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 12, lineHeight: 1.6, maxWidth: 720 }}>
          {lang === 'id'
            ? 'Indonesia adalah salah satu fanbase Liga Inggris terbesar di dunia — tiap weekend malam, jutaan warganet nonton bareng. Dashboard EPL gibol.co hadir dengan waktu WIB, klasemen 20 klub, dan narasi Bahasa casual untuk setiap match-day.'
            : 'Indonesia is one of the largest EPL fanbases globally — Saturday nights, millions tune in. Our EPL dashboard ships with WIB times, full 20-club table, and casual Bahasa narrative for every match-day.'}
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8,
        }}>
          {TOP_CLUBS_HIGHLIGHT.map((club, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              background: C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderLeft: '3px solid #37003C',
              borderRadius: 3,
              fontSize: 11.5,
            }}>
              <div style={{ color: C.text, fontWeight: 600, marginBottom: 2 }}>{club.name}</div>
              <div style={{ color: C.dim, fontSize: 10.5 }}>{club.city} · {club.narrative}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const EPL_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: 'Premier League 2025-26',
  description: 'The 2025-26 English Premier League season — 20 clubs, 380 matches, August 2025 through May 2026. Title, European qualification, and relegation races tracked live.',
  startDate: '2025-08-15',
  endDate: '2026-05-24',
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Soccer',
  location: { '@type': 'Place', name: 'England & Wales' },
  organizer: { '@type': 'SportsOrganization', name: 'The Premier League', url: 'https://www.premierleague.com' },
  url: 'https://www.gibol.co/premier-league-2025-26',
};

export default function EPL() {
  return (
    <ComingSoon
      league="ENGLISH PREMIER LEAGUE · SEASON 2025–26"
      title="Premier League 2025-26 Live Dashboard"
      titleId="Dashboard Live Liga Inggris 2025-26"
      blurb="The Bahasa-first Premier League companion — live scores, 20-club table with form guide, Golden Boot race, and Polymarket title + relegation odds. Launching mid-2026."
      blurbId="Companion Bahasa-first untuk Liga Inggris — skor live, klasemen 20 klub plus form guide, ras Golden Boot, dan peluang juara + degradasi Polymarket. Rilis pertengahan 2026."
      accent="#37003C"
      launchDate="Mid 2026"
      icon="pl"
      features={features}
      featuresId={featuresId}
      seoKeywords="liga inggris, premier league, epl 2025-26, klasemen liga inggris, top skor epl, skor liga inggris, jadwal liga inggris, arsenal liverpool manchester city chelsea, epl bahasa indonesia"
      jsonLd={EPL_JSONLD}
    >
      <EPLPreviewBlock />
    </ComingSoon>
  );
}
