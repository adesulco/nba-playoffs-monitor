import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import Card from '../components/Card.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { VERSION_LABEL } from '../lib/version.js';
import { VISIBLE } from '../lib/flags.js';

// Multi-sport build plan §1 — five-card layout. NBA is the featured live
// dashboard; F1, EPL, FIFA WC, Liga 1 (Super League Indonesia) are coming-soon
// cards that link to stub pages. IBL is deliberately NOT on Home in v0.2.0 —
// parked until a data source materializes. The /ibl route still exists for
// direct access.
//
// Every sport here should stay in sync with src/lib/sports/index.js. The card
// metadata here is layout-specific (blurb copy, cta, icon). The adapter
// registry owns routes, accents, and SEO.
const DASHBOARDS = [
  {
    id: 'nba',
    href: '/nba-playoff-2026',
    status: 'live',
    featured: true, // renders as larger hero card
    tag: 'LIVE',
    title: 'NBA Playoffs 2026',
    titleId: 'NBA Playoff 2026',
    league: 'NBA · POSTSEASON',
    blurb: 'Round 1 live · OKC 44% title favorite · live scores, play-by-play, bracket, odds.',
    blurbId: 'Ronde 1 live · OKC favorit juara 44% · skor live, play-by-play, bracket, peluang juara.',
    accent: '#e8502e',
    launchDate: null,
    icon: 'nba',
    cta: 'Enter →',
    ctaId: 'Masuk →',
  },
  {
    id: 'f1',
    href: '/formula-1-2026',
    status: 'live',
    tag: 'LIVE',
    title: 'Formula 1 2026',
    titleId: 'Formula 1 2026',
    league: 'F1 · MAR – DES 2026',
    blurb: 'Driver + constructor standings, 23-GP calendar in WIB, per-race SEO pages. Live race mode ships next.',
    blurbId: 'Klasemen pembalap + konstruktor, kalender 23 GP dengan jam WIB, halaman SEO per-race. Mode live balapan menyusul.',
    accent: '#E10600',
    launchDate: null,
    icon: 'f1',
    cta: 'Enter →',
    ctaId: 'Masuk →',
  },
  {
    id: 'epl',
    href: '/premier-league-2025-26',
    status: 'soon',
    tag: 'COMING SOON',
    title: 'Premier League 2025-26',
    titleId: 'Liga Inggris 2025-26',
    league: 'EPL · AGU 2025 – MEI 2026',
    blurb: '20-club table, match-day scores, Golden Boot race, title + relegation odds from Polymarket.',
    blurbId: 'Klasemen 20 klub, skor match-day, ras top skor Golden Boot, peluang juara + degradasi Polymarket.',
    accent: '#37003C',
    launchDate: 'Mid 2026',
    icon: 'pl',
    cta: 'Coming Soon',
    ctaId: 'Segera Hadir',
  },
  {
    id: 'fifa_wc',
    href: '/fifa-world-cup-2026',
    status: 'soon',
    tag: 'COMING SOON',
    title: 'FIFA World Cup 2026',
    titleId: 'Piala Dunia 2026',
    league: 'FIFA WC · 11 JUN – 19 JUL',
    blurb: '48 teams · 104 matches · 16 host cities. Group stage, knockout bracket, outright odds in Bahasa.',
    blurbId: '48 tim · 104 laga · 16 kota tuan rumah. Tabel grup, bagan gugur, peluang juara dalam Bahasa.',
    accent: '#326295',
    launchDate: 'Jun 11, 2026',
    icon: 'wc',
    cta: 'Coming Soon',
    ctaId: 'Segera Hadir',
  },
  {
    id: 'liga_1_id',
    href: '/liga-1-2026',
    status: 'soon',
    tag: 'COMING SOON',
    title: 'Super League Indonesia',
    titleId: 'Super League Indonesia',
    league: 'BRI LIGA 1 · 2025–26',
    blurb: '18 clubs, Persija vs Persib tracker, Golden Boot race, relegation + AFC qualification watch.',
    blurbId: '18 klub, tracker derby Persija vs Persib, ras top skor, pantauan degradasi + kualifikasi AFC.',
    accent: '#0057A8',
    launchDate: 'Late 2026',
    icon: 'id',
    cta: 'Coming Soon',
    ctaId: 'Segera Hadir',
  },
];

export default function Home() {
  const { lang } = useApp();

  // Flag-filter before render so we can kill a misbehaving card in prod
  // without a redeploy. Routes themselves still work via direct URL.
  const visibleDashboards = DASHBOARDS.filter((d) => VISIBLE[d.id] !== false);
  const featured = visibleDashboards.find((d) => d.featured);
  const secondaries = visibleDashboards.filter((d) => !d.featured);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title="gibol.co — gila bola · skor live NBA, F1, Liga Inggris, Piala Dunia 2026"
        description="Dashboard live untuk NBA Playoffs 2026, Formula 1, Liga Inggris, Piala Dunia FIFA 2026, dan Super League Indonesia (Liga 1). Skor live, peluang juara Polymarket, klasemen, bracket, dan statistik — semua dalam Bahasa Indonesia."
        path="/"
        lang={lang}
        keywords="gibol, gila bola, skor nba, skor basket, skor playoff, live skor nba, peluang juara nba 2026, bracket nba, formula 1 2026, f1 bahasa indonesia, liga inggris, premier league, epl, FIFA world cup 2026, piala dunia 2026, liga 1 indonesia, bri liga 1"
      />
      <div className="dashboard-wrap">
        {/* TopBar carries the brand. No separate hero — saves ~80px so all
            5 dashboards fit above the fold on ≥1024px. */}
        <TopBar
          subtitle={lang === 'id' ? 'gila bola · dashboard live olahraga' : 'gila bola · live sports dashboards'}
        />

        {/* Dashboard grid — NBA featured spans full width; 4 secondaries share
            the row below on desktop (2×2 on narrower screens, 1-col mobile). */}
        <div className="home-dashboard-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          padding: '16px 20px 20px',
        }}>
          {featured && (
            <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
              <Card d={featured} lang={lang} variant="featured" />
            </div>
          )}
          {secondaries.map((d) => (
            <div key={d.id} style={{ minWidth: 0 }}>
              <Card d={d} lang={lang} variant="secondary" />
            </div>
          ))}
        </div>

        {/* Secondary quick-link row: Recap is an NBA *feature* not a sport, so
            it lives here (not in the card grid). Keeps the card grid sport-pure. */}
        <div style={{
          padding: '0 20px 16px',
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          fontSize: 10.5, color: C.dim, letterSpacing: 0.3,
        }}>
          <span>{lang === 'id' ? 'Lebih lanjut:' : 'More:'}</span>
          <Link to="/recap" style={{ color: C.text, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {lang === 'id' ? 'Catatan Playoff NBA (recap harian)' : 'NBA Playoff Notes (daily recap)'}
          </Link>
          <span style={{ color: C.muted }}>·</span>
          <Link to="/glossary" style={{ color: C.dim, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {lang === 'id' ? 'Glosarium istilah' : 'Glossary'}
          </Link>
          <span style={{ color: C.muted }}>·</span>
          <Link to="/about" style={{ color: C.dim, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {lang === 'id' ? 'Tentang gibol' : 'About gibol'}
          </Link>
        </div>

        {/* Footer — compact, with inline contact link */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 20px', flexWrap: 'wrap', gap: 8,
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
        }}>
          <div>
            gibol.co · {lang === 'id' ? 'dari fan, untuk fan Indonesia' : 'from fans, for fans'}
          </div>
          <ContactBar lang={lang} variant="inline" />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              title="App version"
              style={{
                padding: '1px 6px',
                border: `1px solid var(--line-soft)`,
                borderRadius: 3,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 9,
                letterSpacing: 0.3,
              }}
            >
              {VERSION_LABEL}
            </span>
            ESPN · Polymarket · OpenF1 · football-data.org · FIFA.com
          </div>
        </div>
      </div>
    </div>
  );
}
