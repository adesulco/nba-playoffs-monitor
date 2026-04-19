import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { VERSION_LABEL } from '../lib/version.js';

// NBA first — it's the live product right now (playoff tip-off). Featured prominently in the hero area.
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
    blurb: 'Round 1 tips tonight · OKC 44% favorite · live scores, play-by-play, bracket, odds.',
    blurbId: 'Ronde 1 malam ini · OKC favorit juara 44% · skor live, play-by-play, bracket, peluang juara.',
    accent: '#e8502e',
    launchDate: null,
    glyph: '🏀',
    cta: 'Enter →',
    ctaId: 'Masuk →',
  },
  {
    id: 'recap',
    href: '/recap',
    status: 'live',
    tag: 'BARU',
    title: 'Playoff Notes',
    titleId: 'Catatan Playoff',
    league: 'NBA · DAILY',
    blurb: 'Yesterday\'s playoff results — final scores, top scorers, biggest moments. Shareable.',
    blurbId: 'Hasil playoff kemarin — skor akhir, top scorer, momen terbesar. Share-ready.',
    // Deeper amber (#d97706) — #ffb347 was too pale against the cream light-theme
    // background, making the border + CTA text nearly invisible. Works on both themes.
    accent: '#d97706',
    launchDate: null,
    glyph: '📖',
    cta: 'Read →',
    ctaId: 'Baca →',
  },
  {
    id: 'ibl',
    href: '/ibl',
    status: 'soon',
    tag: 'COMING SOON',
    title: 'IBL — Indonesia Basketball League',
    titleId: 'IBL — Liga Basket Indonesia',
    league: 'IBL · SEASON 2025–26',
    blurb: 'Live scores, standings, and player watchlist for Indonesia\'s top professional basketball league. Full Bahasa coverage, local broadcast schedule, team deep dives.',
    blurbId: 'Skor live, klasemen, dan watchlist pemain untuk liga basket profesional teratas Indonesia. Coverage Bahasa penuh, jadwal siaran lokal, analisis tim.',
    accent: '#d2191f',
    launchDate: null,
    glyph: '🇮🇩',
    cta: 'Coming Soon',
    ctaId: 'Segera Hadir',
  },
  {
    id: 'fifa',
    href: '/fifa-world-cup-2026',
    status: 'soon',
    tag: 'COMING SOON',
    title: 'FIFA World Cup 2026',
    titleId: 'Piala Dunia FIFA 2026',
    league: 'FIFA · JUN 11 – JUL 19',
    blurb: '48 teams · 104 matches · 16 host cities across USA, Mexico, and Canada. Live scores, group tables, knockout bracket, player tracking, and prediction markets.',
    blurbId: '48 tim · 104 pertandingan · 16 kota tuan rumah di AS, Meksiko, dan Kanada. Skor live, tabel grup, bagan gugur, tracking pemain, dan pasar prediksi.',
    accent: '#2c8ad6',
    launchDate: 'Jun 11, 2026',
    glyph: '⚽',
    cta: 'Coming Soon',
    ctaId: 'Segera Hadir',
  },
];

function DashboardCard({ d, lang }) {
  const isLive = d.status === 'live';
  const isFeatured = d.featured;
  const title = lang === 'id' ? d.titleId : d.title;
  const blurb = lang === 'id' ? d.blurbId : d.blurb;
  const cta = lang === 'id' ? d.ctaId : d.cta;

  // Featured NBA card stays horizontal; secondary cards stack vertically (icon on top)
  // so they read well in a 3-column row at desktop and a 1-column stack on mobile.
  const content = isFeatured ? (
    <div
      className="home-card-live home-featured"
      style={{
        padding: '12px 16px',
        background: `linear-gradient(135deg, ${d.accent}28 0%, ${C.panelRow} 70%)`,
        border: `1px solid ${d.accent}`,
        borderLeft: `4px solid ${d.accent}`,
        borderRadius: 4,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 14,
        alignItems: 'center',
        transition: 'all 0.2s',
        cursor: 'pointer',
        boxShadow: `0 4px 18px -12px ${d.accent}`,
      }}
    >
      <div style={{
        fontSize: 30, lineHeight: 1,
        width: 52, height: 52, borderRadius: 4,
        background: `${d.accent}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{d.glyph}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 8.5, letterSpacing: 1.2, fontWeight: 700,
            padding: '2px 6px',
            background: d.accent, color: '#fff',
            borderRadius: 2,
          }}>
            <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#fff', marginRight: 3, verticalAlign: 'middle' }} />
            {d.tag}
          </span>
          <span style={{ fontSize: 9, color: C.dim, letterSpacing: 1, fontWeight: 500 }}>{d.league}</span>
        </div>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 19, fontWeight: 600, color: C.text, letterSpacing: -0.2,
          lineHeight: 1.2,
        }}>
          {title}
        </div>
        <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.4, maxWidth: 680 }}>
          {blurb}
        </div>
      </div>

      <div className="home-featured-cta" style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 12, fontWeight: 700,
        padding: '8px 14px',
        background: d.accent, color: '#fff',
        borderRadius: 3,
        whiteSpace: 'nowrap',
        letterSpacing: 0.3,
      }}>
        {cta}
      </div>
    </div>
  ) : (
    // Secondary card — compact, icon+title stacked, no separate CTA button.
    // Whole card is clickable (wrapped in Link below).
    <div
      className={isLive ? 'home-card-live home-secondary' : 'home-card-soon home-secondary'}
      style={{
        padding: '12px 14px',
        background: C.panelRow,
        border: `1px solid ${isLive ? d.accent : C.line}`,
        borderLeft: `3px solid ${d.accent}`,
        borderRadius: 4,
        display: 'flex', flexDirection: 'column', gap: 6,
        minHeight: 120, height: '100%',
        transition: 'all 0.2s',
        cursor: isLive ? 'pointer' : 'default',
        opacity: isLive ? 1 : 0.82,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          fontSize: 18, lineHeight: 1,
          width: 30, height: 30, borderRadius: 3,
          background: `${d.accent}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{d.glyph}</div>
        <span style={{
          fontSize: 8, letterSpacing: 1.2, fontWeight: 700,
          padding: '2px 5px',
          background: isLive ? d.accent : 'transparent',
          color: isLive ? '#fff' : d.accent,
          border: isLive ? 'none' : `1px solid ${d.accent}`,
          borderRadius: 2,
        }}>
          {isLive && <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#fff', marginRight: 3, verticalAlign: 'middle' }} />}
          {d.tag}
        </span>
      </div>
      <div style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: -0.2,
        lineHeight: 1.2,
      }}>
        {title}
      </div>
      <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.4, flex: 1 }}>
        {blurb}
      </div>
      <div style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 10.5, fontWeight: 700,
        color: isLive ? d.accent : C.muted,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginTop: 'auto',
      }}>
        {cta}
      </div>
    </div>
  );

  if (isLive) {
    return <Link to={d.href} style={{ textDecoration: 'none' }}>{content}</Link>;
  }
  return <div style={{ textDecoration: 'none' }}>{content}</div>;
}

export default function Home() {
  const { lang, t } = useApp();

  const heroTitleId = 'GILA BOLA.';
  const heroSubId = 'Dashboard live untuk olahraga yang kamu cintai.';
  // F08 — founder-adjacent hook line. Short, Bahasa-first, fan-to-fan voice.
  const heroHookId = 'Dari fan, untuk fan Indonesia. Dibangun di Jakarta, dirilis ke dunia.';
  const heroHookEn = 'From fans, for fans. Built in Jakarta, shipped to the world.';
  const heroTitle = 'GILA BOLA.';
  const heroSub = 'Live dashboards for the sports you love.';

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title="gibol.co — gila bola · skor live NBA, IBL, Piala Dunia 2026"
        description="Dashboard live untuk NBA Playoffs 2026, IBL (Liga Basket Indonesia), dan Piala Dunia FIFA 2026. Skor live, peluang juara Polymarket, bracket, play-by-play, dan statistik pemain dalam satu halaman."
        path="/"
        lang={lang}
        keywords="gibol, gila bola, skor nba, skor basket, skor playoff, live skor nba, peluang juara nba 2026, bracket nba, IBL, liga basket indonesia, FIFA world cup 2026, piala dunia 2026"
      />
      <div className="dashboard-wrap">
        {/* TopBar (gibol logo + lang/theme toggles) carries the brand.
            No separate hero block — saves ~80px so all dashboards fit above the fold. */}
        <TopBar
          subtitle={lang === 'id' ? 'gila bola · dashboard live olahraga' : 'gila bola · live sports dashboards'}
        />

        {/* Dashboard grid — NBA featured card spans full width, 3 secondary cards
            share a row below on desktop, collapse to 1 column on mobile. Designed
            so all 4 options are visible without scrolling on ≥768px viewports. */}
        <div className="home-dashboard-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateAreas: `
            "featured featured featured"
            "a b c"
          `,
          gap: 10,
          padding: '16px 20px 20px',
        }}>
          {DASHBOARDS.map((d, i) => (
            <div
              key={d.id}
              style={{
                gridArea: d.featured ? 'featured' : ['a', 'b', 'c'][i - 1] || 'a',
                minWidth: 0,
              }}
            >
              <DashboardCard d={d} lang={lang} />
            </div>
          ))}
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
            ESPN · Polymarket · FIFA.com
          </div>
        </div>
      </div>
    </div>
  );
}
