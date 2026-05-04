import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import Card from '../components/Card.jsx';
import LiveHero from '../components/LiveHero.jsx';
import MilikmuStrip from '../components/MilikmuStrip.jsx';
import PushOptInButton from '../components/PushOptInButton.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { VERSION_LABEL } from '../lib/version.js';
import { VISIBLE } from '../lib/flags.js';
import { usePlayoffData } from '../hooks/usePlayoffData.js';
import { useEPLChampionOdds } from '../hooks/useEPLChampionOdds.js';
import { useEPLFixtures } from '../hooks/useEPLFixtures.js';
import { useTennisScoreboard } from '../hooks/useTennisScoreboard.js';

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
    status: 'live',
    tag: 'LIVE',
    title: 'Premier League 2025-26',
    titleId: 'Liga Inggris 2025-26',
    league: 'EPL · AGU 2025 – MEI 2026',
    blurb: '20-club table with form guide, match-day fixtures in WIB, Golden Boot top scorers, per-club SEO pages.',
    blurbId: 'Klasemen 20 klub dengan form guide, jadwal WIB, top skor Golden Boot, halaman SEO per klub.',
    accent: '#37003C',
    launchDate: null,
    icon: 'pl',
    cta: 'Enter →',
    ctaId: 'Masuk →',
  },
  {
    id: 'tennis',
    href: '/tennis',
    status: 'live',
    tag: 'LIVE',
    title: 'Tennis 2026',
    titleId: 'Tenis 2026',
    league: 'ATP · WTA · JAN – NOV 2026',
    blurb: '4 Grand Slams · Masters 1000 · WTA 1000 · Year-End Finals. Live sets, ATP + WTA rankings, Indonesian player spotlight.',
    blurbId: '4 Grand Slam · Masters 1000 · WTA 1000 · Year-End Finals. Set live, peringkat ATP + WTA, sorotan petenis Indonesia.',
    accent: '#D4A13A',
    launchDate: null,
    icon: 'tennis',
    cta: 'Enter →',
    ctaId: 'Masuk →',
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
  // v0.13.0 — Super League Indonesia (BRI Liga 1) restored to Home as LIVE.
  // Phase 1A: hub at /super-league-2025-26 + 18 per-club SEO pages, ESPN
  // soccer/idn.1 data. Defers Golden Boot, Persija-Persib derby SEO page,
  // and Polymarket odds (no IDN markets) to v0.13.x.
  {
    id: 'liga_1_id',
    href: '/super-league-2025-26',
    status: 'live',
    tag: 'LIVE',
    title: 'Indonesian Super League 2025-26',
    titleId: 'Super League Indonesia 2025-26',
    league: 'SUPER LEAGUE · AGU 2025 – MEI 2026',
    blurb: '18-club table, weekly fixtures in WIB, latest results, Persija-Persib derby tracker. Bahasa-first.',
    blurbId: 'Klasemen 18 klub, jadwal pekan ini WIB, hasil terbaru, derby Persija-Persib. Bahasa Indonesia.',
    accent: '#E2231A',
    launchDate: null,
    icon: 'id',
    cta: 'Enter →',
    ctaId: 'Masuk →',
  },
];

export default function Home() {
  const { lang } = useApp();

  // v0.6.3 — live data teasers. Pulls the current title-odds leader +
  // live-game count into small mono chips on the NBA + EPL cards so the
  // landing page isn't just static marketing copy. Data comes from the
  // same hooks the per-sport dashboards use — no new API calls.
  const { games, champion } = usePlayoffData(30000);
  const { odds: eplChampionOdds } = useEPLChampionOdds();
  // v0.11.13 — pull EPL fixtures too so LiveHero can fall back to a
  // live EPL match when NBA is idle. 14-day window (7 back / 7 fwd)
  // is already what the EPL dashboard uses; same cache entry on the
  // proxy. Minimal perf cost on Home for the fallback.
  const { upcoming: eplFixtures } = useEPLFixtures();
  // v0.11.18 — pull both tennis tours so LiveHero can surface a live
  // match when NBA + EPL are idle. ATP + WTA = 2 fetches but they
  // share a proxy cache window and the hook polls 15s live / 5min
  // idle, so page-weight impact on Home is small.
  const { matches: atpMatches } = useTennisScoreboard('atp');
  const { matches: wtaMatches } = useTennisScoreboard('wta');
  const tennisMatches = useMemo(() => [...(atpMatches || []), ...(wtaMatches || [])], [atpMatches, wtaMatches]);

  const liveTeaserById = useMemo(() => {
    const map = {};

    // NBA: live game count + current champion favorite
    const liveNba = (games || []).filter((g) => g.statusState === 'in').length;
    const champ = champion?.odds?.[0];
    const nbaBits = [];
    if (liveNba > 0) nbaBits.push(`● ${liveNba} LIVE`);
    if (champ?.name && champ?.pct) {
      const short = (champ.name.split(' ').pop() || champ.name).toUpperCase();
      nbaBits.push(`${short} ${champ.pct}%`);
    }
    if (nbaBits.length > 0) map.nba = nbaBits.join(' · ');

    // EPL: current title-race leader from Polymarket
    const eplTop = (eplChampionOdds || [])[0];
    if (eplTop?.pct && (eplTop.canonicalName || eplTop.name)) {
      const eplShort = ((eplTop.canonicalName || eplTop.name).split(' ')[0] || '').toUpperCase();
      map.epl = `${eplShort} ${eplTop.pct}%`;
    }

    return map;
  }, [games, champion, eplChampionOdds]);

  // Flag-filter before render so we can kill a misbehaving card in prod
  // without a redeploy. Routes themselves still work via direct URL.
  const visibleDashboards = DASHBOARDS.filter((d) => VISIBLE[d.id] !== false);
  const featured = visibleDashboards.find((d) => d.featured);
  const secondaries = visibleDashboards.filter((d) => !d.featured);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={lang === 'id'
          ? 'gibol.co — gila bola · skor live NBA, F1, Liga Inggris, Tenis, Piala Dunia 2026'
          : 'gibol.co — gila bola · live scores NBA, F1, Premier League, Tennis, FIFA World Cup 2026'}
        description={lang === 'id'
          ? 'Dashboard live untuk NBA Playoffs 2026, Formula 1, Liga Inggris, Tenis ATP + WTA, Piala Dunia FIFA 2026, dan Super League Indonesia (Liga 1). Skor live, peluang juara Polymarket, klasemen, bracket, peringkat, dan statistik — semua dalam Bahasa Indonesia.'
          : 'Live dashboards for NBA Playoffs 2026, Formula 1, Premier League, ATP + WTA Tennis, FIFA World Cup 2026, and BRI Liga 1 Indonesia. Live scores, Polymarket title odds, standings, bracket, rankings, and stats — Bahasa-first.'}
        path="/"
        lang={lang}
        keywords="gibol, gila bola, skor nba, skor basket, skor playoff, live skor nba, peluang juara nba 2026, bracket nba, formula 1 2026, f1 bahasa indonesia, liga inggris, premier league, epl, tenis 2026, atp tour 2026, wta tour 2026, grand slam 2026, roland garros 2026, wimbledon 2026, peringkat atp, peringkat wta, FIFA world cup 2026, piala dunia 2026, liga 1 indonesia, bri liga 1"
      />
      <div className="dashboard-wrap">
        {/* V2TopBar is rendered globally in App.jsx now so the masthead
            persists across route changes (no re-mount seam). */}

        {/* A11y — page has a single <h1> for screen-reader rotor. Visually
            hidden on desktop (the SportNav + dashboard cards already carry
            the brand beat) but announced to assistive tech. On narrow
            mobile viewports where the copy helps orient, it lifts into
            view via the sr-only override. */}
        <h1 className="sr-only">
          {lang === 'id'
            ? 'gibol.co — dashboard olahraga live dalam Bahasa Indonesia'
            : 'gibol.co — live sports dashboards in Bahasa Indonesia'}
        </h1>

        {/* v0.11.11 Sprint 5 — hero live game (NBA priority, EPL
            fallback as of v0.11.13). Renders only when some sport has
            a live event; silent otherwise. Oversized (72–120 px
            responsive) tabular score pulls the eye the moment a user
            lands. Audit §05 stretch spec: "the single most-followed
            live match is promoted to hero — a 120px score with team
            sigils." */}
        <LiveHero games={games} eplFixtures={eplFixtures} tennisMatches={tennisMatches} />

        {/* v0.11.8 Sprint 3 — cross-sport "Milikmu" strip. Renders null
            when user has zero pins so first-time visitors see the
            gateway grid unchanged; otherwise promotes their pinned
            NBA team / EPL club / F1 constructor / Tennis player into
            a direct-link row above the grid. Audit §04 Persona A
            retention gap + Persona B power-user persistence ask. */}
        <MilikmuStrip />

        {/* Dashboard grid — NBA featured spans full width; 4 secondaries share
            the row below on desktop (2×2 on narrower screens, 1-col mobile).
            Padding uses .dashboard-hero so it aligns with the sport
            dashboard heroes (EPL/F1/Tennis) — prevents the 4–8px shift
            when users flick Home ↔ sport. */}
        <div className="home-dashboard-grid dashboard-hero" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
        }}>
          {featured && (
            <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
              <Card d={featured} lang={lang} variant="featured" liveTeaser={liveTeaserById[featured.id]} />
            </div>
          )}
          {secondaries.map((d) => (
            <div key={d.id} style={{ minWidth: 0 }}>
              <Card d={d} lang={lang} variant="secondary" liveTeaser={liveTeaserById[d.id]} />
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
          <PushOptInButton tag="nba_close" lang={lang} compact />
          <span style={{ color: C.muted }}>·</span>
          <span>{lang === 'id' ? 'Lebih lanjut:' : 'More:'}</span>
          <Link to="/bracket" style={{
            color: '#F59E0B', textDecoration: 'underline', textUnderlineOffset: 3, fontWeight: 600,
          }}>
            {lang === 'id' ? '★ Bracket kamu · Pick\u2019em NBA' : '★ Your bracket · NBA Pick\u2019em'}
          </Link>
          <span style={{ color: C.muted }}>·</span>
          <Link to="/recap" style={{ color: C.text, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {lang === 'id' ? 'Catatan Playoff NBA (recap harian)' : 'NBA Playoff Notes (daily recap)'}
          </Link>
          <span style={{ color: C.muted }}>·</span>
          <Link to="/leaderboard" style={{ color: C.dim, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {lang === 'id' ? 'Leaderboard' : 'Leaderboard'}
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

        {/* Footer — v0.11.20 GIB-014 <footer role="contentinfo"> */}
        <footer role="contentinfo" style={{
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
        </footer>
      </div>
    </div>
  );
}
