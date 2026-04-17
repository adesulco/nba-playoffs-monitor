import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import { useApp } from '../lib/AppContext.jsx';

const DASHBOARDS = [
  {
    id: 'nba',
    href: '/nba-playoff-2026',
    status: 'live',
    tag: 'LIVE',
    title: 'NBA Playoffs 2026',
    titleId: 'NBA Playoff 2026',
    league: 'NBA · POSTSEASON',
    blurb: 'Round 1 tips Apr 18 · OKC 44% title favorite · Polymarket odds + ESPN live scoring, play-by-play, box scores, injury report, watchlist, team path to title.',
    blurbId: 'Babak 1 mulai 18 April · OKC unggulan juara 44% · peluang Polymarket + live score ESPN, play-by-play, statistik, laporan cedera, watchlist, jalan menuju juara.',
    accent: '#e8502e',
    launchDate: null,
    glyph: '🏀',
    cta: 'Enter →',
    ctaId: 'Masuk →',
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
  const title = lang === 'id' ? d.titleId : d.title;
  const blurb = lang === 'id' ? d.blurbId : d.blurb;
  const cta = lang === 'id' ? d.ctaId : d.cta;

  const content = (
    <div style={{
      padding: '22px 24px',
      background: C.panelRow,
      border: `1px solid ${isLive ? d.accent : C.line}`,
      borderLeft: `4px solid ${d.accent}`,
      borderRadius: 4,
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: 20,
      alignItems: 'center',
      transition: 'all 0.2s',
      cursor: isLive ? 'pointer' : 'default',
      opacity: isLive ? 1 : 0.85,
    }}
    className={isLive ? 'home-card-live' : 'home-card-soon'}
    >
      <div style={{
        fontSize: 36, lineHeight: 1,
        width: 56, height: 56, borderRadius: 4,
        background: `${d.accent}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {d.glyph}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 9, letterSpacing: 1.2, fontWeight: 700,
            padding: '2px 7px',
            background: isLive ? d.accent : 'transparent',
            color: isLive ? '#fff' : d.accent,
            border: isLive ? 'none' : `1px solid ${d.accent}`,
            borderRadius: 2,
          }}>
            {isLive && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#fff', marginRight: 4, verticalAlign: 'middle' }} />}
            {d.tag}
          </span>
          <span style={{ fontSize: 9.5, color: C.dim, letterSpacing: 1, fontWeight: 500 }}>{d.league}</span>
          {d.launchDate && <span style={{ fontSize: 9.5, color: C.muted }}>· {d.launchDate}</span>}
        </div>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 22, fontWeight: 600, color: C.text,
          letterSpacing: -0.3,
        }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, maxWidth: 640 }}>
          {blurb}
        </div>
      </div>

      <div style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 13, fontWeight: 600,
        padding: '8px 14px',
        background: isLive ? d.accent : 'transparent',
        color: isLive ? '#fff' : d.accent,
        border: isLive ? 'none' : `1px solid ${d.accent}`,
        borderRadius: 3,
        whiteSpace: 'nowrap',
        letterSpacing: 0.3,
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
        <TopBar />

        {/* Hero */}
        <div style={{
          padding: '48px 24px 32px',
          borderBottom: `1px solid ${C.line}`,
          background: C.heroBg,
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 68, lineHeight: 1, letterSpacing: -1,
            color: C.text, marginBottom: 8,
          }}>
            {lang === 'id' ? heroTitleId : heroTitle}
          </div>
          <div style={{
            fontSize: 13, color: C.dim, letterSpacing: 1, maxWidth: 560,
            margin: '0 auto', lineHeight: 1.5,
          }}>
            {lang === 'id' ? heroSubId : heroSub}
          </div>
          <div style={{
            marginTop: 16, fontSize: 10, color: C.muted, letterSpacing: 1.5,
          }}>
            NBA · IBL · FIFA — {lang === 'id' ? 'ONE HUB, LIVE DATA' : 'ONE HUB, LIVE DATA'}
          </div>
        </div>

        {/* Dashboard cards */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          padding: '28px 24px',
        }}>
          {DASHBOARDS.map((d) => (
            <DashboardCard key={d.id} d={d} lang={lang} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
        }}>
          <div>
            gibol.co · {lang === 'id' ? 'dibuat untuk para pecinta bola di Indonesia' : 'built for sports fans in Indonesia and worldwide'}
          </div>
          <div>
            Polymarket · ESPN · FIFA.com
          </div>
        </div>
      </div>
    </div>
  );
}
