import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import TopBar from '../components/TopBar.jsx';
import TennisPlayerPicker from '../components/TennisPlayerPicker.jsx';
import {
  TENNIS_STARS_BY_SLUG,
  INDONESIAN_PLAYERS_BY_SLUG,
} from '../lib/sports/tennis/constants.js';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import Chip from '../components/Chip.jsx';
import TournamentCard from '../components/tennis/TournamentCard.jsx';
import LiveMatchCard from '../components/tennis/LiveMatchCard.jsx';
import CountdownToSlam from '../components/tennis/CountdownToSlam.jsx';
import RankingsTable from '../components/tennis/RankingsTable.jsx';
import { useTennisScoreboard } from '../hooks/useTennisScoreboard.js';
import { useTennisRankings } from '../hooks/useTennisRankings.js';
import { useTennisNews } from '../hooks/useTennisNews.js';
import {
  SEASON,
  INDONESIAN_PLAYERS,
} from '../lib/sports/tennis/constants.js';
import {
  TOURNAMENTS_2026,
  SEASON_YEAR,
  nextSlam,
} from '../lib/sports/tennis/tournaments.js';
import adapter from '../lib/sports/tennis/adapter.js';

const TENNIS_ACCENT = '#D4A13A';

// ─── Tennis ContextStrip ─────────────────────────────────────────────────────
// Mirrors NBA/EPL ContextStrip. 4 dashboard-level stats for tennis:
//   · NEXT SLAM   — countdown via CountdownToSlam data
//   · TOP-RANKED  — world #1 (ATP singles, from useTennisRankings)
//   · SLAM LEADER — player with most slam wins in 2026 (editorial default
//     until we wire useTennisChampionOdds). Placeholder currently.
//   · IDN PLAYER  — top Indonesian player by ranking or editorial pick.
function TennisContextStrip({ accentColor, favPlayer, lang }) {
  const { singles } = useTennisRankings('atp');
  const { singles: wtaSingles } = useTennisRankings('wta');
  const top = singles?.[0];
  const topW = wtaSingles?.[0];
  const next = nextSlam(); // returns { name, startDate, venue, city, countryCode } or null

  const daysTo = useMemo(() => {
    if (!next?.startDate) return null;
    const now = new Date();
    const start = new Date(next.startDate);
    return Math.max(0, Math.round((start - now) / 86400000));
  }, [next]);

  const cell = (label, valueNode, accent, sub) => (
    <div style={{ padding: '12px 14px', borderRight: `1px solid ${C.lineSoft}`, minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, color: accent, fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {valueNode}
      </div>
      {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: C.muted, letterSpacing: 0.3, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 3,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    }}>
      {cell(
        lang === 'id' ? 'SLAM BERIKUT' : 'NEXT SLAM',
        next ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 16, background: '#A855F7' }} />
            {next.name}
            {typeof daysTo === 'number' && (
              <span style={{ color: '#A855F7', fontFamily: 'var(--font-mono)', fontSize: 16 }}>
                {daysTo === 0 ? (lang === 'id' ? 'live' : 'live') : `${daysTo}d`}
              </span>
            )}
          </span>
        ) : '—',
        '#A855F7',
        next ? `${next.venue || ''} · ${next.city || ''}` : ''
      )}
      {cell(
        'ATP #1',
        top ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 16, background: '#C23C3C' }} />
            {top.name}
            <span style={{ color: '#C23C3C', fontFamily: 'var(--font-mono)', fontSize: 16 }}>
              {top.points?.toLocaleString?.() || top.points || ''}
            </span>
          </span>
        ) : '—',
        '#C23C3C',
        top?.country || 'ATP singles · ESPN'
      )}
      {cell(
        'WTA #1',
        topW ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 16, background: '#DB2777' }} />
            {topW.name}
            <span style={{ color: '#DB2777', fontFamily: 'var(--font-mono)', fontSize: 16 }}>
              {topW.points?.toLocaleString?.() || topW.points || ''}
            </span>
          </span>
        ) : '—',
        '#DB2777',
        topW?.country || 'WTA singles · ESPN'
      )}
      <div style={{ padding: '12px 14px', minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, color: '#F59E0B', fontWeight: 700, marginBottom: 4 }}>
          {lang === 'id' ? 'FAVORIT KAMU' : 'YOUR PICK'}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {favPlayer ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 3, height: 16, background: favPlayer.accent || accentColor }} />
              {favPlayer.name || favPlayer.displayName}
            </span>
          ) : (lang === 'id' ? 'Belum dipilih' : 'None picked')}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: C.muted, letterSpacing: 0.3, marginTop: 4 }}>
          {favPlayer
            ? `${(favPlayer.tour || '').toUpperCase()} · ${favPlayer.ccode || favPlayer.countryCode || ''}`
            : (lang === 'id' ? 'Pakai pemilih di kanan atas' : 'Use the picker top-right')}
        </div>
      </div>
    </section>
  );
}

// ─── Tennis Key Accounts ─────────────────────────────────────────────────────
function TennisKeyAccounts({ favPlayer, accentColor, lang }) {
  // Player social handles are not curated in constants.js; skip player row
  // unless we have one. Fall back to tour + press accounts which are
  // stable and well-known.
  const rows = [
    { handle: 'atptour',    label: 'ATP Tour' },
    { handle: 'WTA',        label: 'WTA Tour' },
    { handle: 'TennisTV',   label: 'Tennis TV (ATP live)' },
    { handle: 'ESPNFC',     label: 'ESPN FC (general sports)' },
    { handle: 'rolandgarros', label: 'Roland-Garros' },
  ];
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 3,
      padding: '14px 14px 10px',
    }}>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
        {lang === 'id' ? 'AKUN RESMI · X / TWITTER' : 'KEY ACCOUNTS · X / TWITTER'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
        {rows.map((r) => (
          <a
            key={r.handle}
            href={`https://x.com/${r.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 10, alignItems: 'center',
              padding: '8px 10px',
              background: C.panelRow,
              borderRadius: 3,
              textDecoration: 'none',
              fontSize: 11,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: C.text, fontFamily: 'var(--font-mono)' }}>@{r.handle}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 0.3 }}>{r.label}</div>
            </div>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: 0.5 }}>↗</div>
          </a>
        ))}
      </div>
      {favPlayer && (
        <div style={{ fontSize: 10, color: C.muted, marginTop: 8, letterSpacing: 0.3 }}>
          {lang === 'id'
            ? `Handle pribadi untuk ${favPlayer.name || favPlayer.displayName} tidak dikurasikan di repo — tambahkan di constants.js kalau perlu.`
            : `Personal X handle for ${favPlayer.name || favPlayer.displayName} not curated yet — add in constants.js if needed.`}
        </div>
      )}
    </section>
  );
}

// Find the matching prerender metadata for the hub.
function getHubMeta() {
  const routes = adapter.prerenderRoutes();
  return routes.find((r) => r.path === '/tennis') || {};
}

// ─── Tier sections ──────────────────────────────────────────────────────────
const TIER_ORDER = [
  { id: 'slam', titleId: 'Grand Slam', titleEn: 'Grand Slams' },
  { id: 'combined1000', titleId: 'Masters 1000 · Combined', titleEn: 'Combined 1000s' },
  { id: 'masters', titleId: 'ATP Masters 1000', titleEn: 'ATP Masters 1000' },
  { id: 'wta1000', titleId: 'WTA 1000', titleEn: 'WTA 1000' },
  { id: 'finals', titleId: 'Year-End Finals', titleEn: 'Year-End Finals' },
];

function TierSection({ tier, tournaments, lang }) {
  if (!tournaments.length) return null;
  const title = lang === 'id' ? tier.titleId : tier.titleEn;
  return (
    <section style={{ display: 'grid', gap: 10 }}>
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: 1.5,
          color: C.muted,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {title} · {tournaments.length}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 10,
        }}
      >
        {tournaments.map((t) => (
          <TournamentCard key={t.id} tournament={t} year={SEASON_YEAR} />
        ))}
      </div>
    </section>
  );
}

// ─── Live ticker (merged ATP + WTA) ─────────────────────────────────────────
function LiveTicker({ lang }) {
  const atp = useTennisScoreboard('atp');
  const wta = useTennisScoreboard('wta');
  const loading = atp.loading && wta.loading;

  const merged = useMemo(() => {
    const all = [...(atp.matches || []), ...(wta.matches || [])];
    // Priority: live > pre > post. Within each, sort by start time asc.
    const order = { live: 0, pre: 1, post: 2, walkover: 3, retired: 3, cancelled: 3 };
    return all
      .filter((m) => m && m.status)
      .sort((a, b) => {
        const oa = order[a.status] ?? 4;
        const ob = order[b.status] ?? 4;
        if (oa !== ob) return oa - ob;
        return (a.startUTC || '').localeCompare(b.startUTC || '');
      })
      .slice(0, 8);
  }, [atp.matches, wta.matches]);

  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${C.tennisLive}`,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: C.panelSoft,
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: 1.5,
            color: C.tennisLive,
            fontWeight: 700,
          }}
        >
          {lang === 'id' ? 'LIVE · ATP + WTA' : 'LIVE · ATP + WTA'}
        </div>
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            color: C.muted,
            letterSpacing: 0.5,
          }}
        >
          {loading
            ? lang === 'id' ? 'memuat…' : 'loading…'
            : merged.length === 0
            ? lang === 'id' ? 'belum ada match' : 'no matches right now'
            : `${merged.length} ${lang === 'id' ? 'match' : 'matches'}`}
        </div>
      </div>
      {merged.length === 0 && !loading && (
        <div style={{ padding: 18, fontSize: 11, color: C.dim, textAlign: 'center' }}>
          {lang === 'id'
            ? 'Tidak ada pertandingan yang berjalan. Balapan berikutnya akan muncul saat turnamen aktif.'
            : 'No matches running right now. Live matches appear when a tournament is active.'}
        </div>
      )}
      {merged.map((m) => (
        <LiveMatchCard key={m.id} match={m} />
      ))}
    </section>
  );
}

// ─── Rankings snapshot (top 5 ATP + WTA side by side) ───────────────────────
function RankingsSnapshot({ lang }) {
  const atp = useTennisRankings('atp');
  const wta = useTennisRankings('wta');
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 14,
      }}
    >
      <RankingsBlock
        tour="atp"
        ranks={atp.ranks}
        loading={atp.loading}
        lang={lang}
      />
      <RankingsBlock
        tour="wta"
        ranks={wta.ranks}
        loading={wta.loading}
        lang={lang}
      />
    </div>
  );
}

function RankingsBlock({ tour, ranks, loading, lang }) {
  const label = tour.toUpperCase();
  return (
    <section>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            color: C.text,
            letterSpacing: -0.2,
          }}
        >
          {lang === 'id' ? `Peringkat ${label} · Top 10` : `${label} Rankings · Top 10`}
        </div>
        <Link
          to={`/tennis/rankings/${tour}`}
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9.5,
            color: TENNIS_ACCENT,
            textDecoration: 'none',
            letterSpacing: 0.5,
            fontWeight: 700,
          }}
        >
          {lang === 'id' ? 'Top 500 →' : 'Top 500 →'}
        </Link>
      </div>
      {loading && (!ranks || ranks.length === 0) ? (
        <div
          style={{
            padding: 16,
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 3,
            fontSize: 11,
            color: C.dim,
          }}
        >
          {lang === 'id' ? `Memuat peringkat ${label}…` : `Loading ${label} rankings…`}
        </div>
      ) : (
        <RankingsTable ranks={ranks || []} limit={10} tour={tour} />
      )}
    </section>
  );
}

// ─── Indonesian spotlight ───────────────────────────────────────────────────
function IndonesianSpotlight({ lang }) {
  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${C.tennisSlamGold}`,
        borderRadius: 3,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: 1.5,
          color: C.tennisSlamGold,
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {lang === 'id' ? 'SOROTAN PETENIS INDONESIA' : 'INDONESIAN SPOTLIGHT'}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 10,
        }}
      >
        {INDONESIAN_PLAYERS.map((p) => (
          <div
            key={p.slug}
            style={{
              padding: 10,
              background: C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderRadius: 3,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: C.tennisSlamGold,
              }}
            >
              {p.displayName}
            </div>
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                color: C.muted,
                letterSpacing: 0.4,
                marginTop: 2,
              }}
            >
              {p.tour.toUpperCase()} · {p.focus} · {p.countryCode}
            </div>
            <div
              style={{
                fontSize: 11,
                color: C.dim,
                marginTop: 6,
                lineHeight: 1.45,
              }}
            >
              {lang === 'id' ? p.bioId : p.bioEn}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Compact news block ─────────────────────────────────────────────────────
function TennisNewsList({ lang }) {
  const { items, loading } = useTennisNews(10);
  if (loading && (!items || items.length === 0)) {
    return (
      <div style={{ fontSize: 11, color: C.dim, padding: 10 }}>
        {lang === 'id' ? 'Memuat berita…' : 'Loading news…'}
      </div>
    );
  }
  if (!items || items.length === 0) return null;
  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${C.tennisSlamGold}`,
        borderRadius: 3,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: 1.5,
          color: C.muted,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {lang === 'id' ? 'BERITA TENIS' : 'TENNIS NEWS'}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        {items.slice(0, 8).map((n, i) => (
          <li key={i}>
            <a
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                fontSize: 12,
                color: C.text,
                textDecoration: 'none',
                lineHeight: 1.4,
                padding: '4px 0',
                borderBottom: `1px solid ${C.lineSoft}`,
              }}
            >
              {n.title}
              {n.source && (
                <span
                  style={{
                    display: 'block',
                    marginTop: 2,
                    fontSize: 9.5,
                    color: C.muted,
                    fontFamily: '"JetBrains Mono", monospace',
                    letterSpacing: 0.4,
                  }}
                >
                  {n.source}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Page shell ─────────────────────────────────────────────────────────────
export default function Tennis() {
  const location = useLocation();
  const { lang, selectedTennisPlayer, setSelectedTennisPlayer } = useApp();
  const meta = getHubMeta();

  const favPlayer = selectedTennisPlayer
    ? (TENNIS_STARS_BY_SLUG[selectedTennisPlayer]
        || INDONESIAN_PLAYERS_BY_SLUG[selectedTennisPlayer])
    : null;
  const accentColor = favPlayer?.accent || TENNIS_ACCENT;

  const tournamentsByTier = useMemo(() => {
    const map = {};
    for (const t of TOURNAMENTS_2026) {
      (map[t.tier] = map[t.tier] || []).push(t);
    }
    // Sort each tier by startDate asc.
    Object.values(map).forEach((list) => list.sort((a, b) => a.startDate.localeCompare(b.startDate)));
    return map;
  }, []);

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        color: C.text,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      <SEO
        title={meta.title}
        description={meta.description}
        path={location.pathname}
        lang={lang}
        keywords={meta.keywords}
        jsonLd={meta.jsonLd}
      />
      <div className="dashboard-wrap">
        <TopBar showBackLink accent={accentColor}>
          <TennisPlayerPicker
            selectedSlug={selectedTennisPlayer}
            onSelect={setSelectedTennisPlayer}
            lang={lang}
          />
        </TopBar>

        {/* Hero */}
        <div
          style={{
            padding: '20px 20px 14px',
            background: `linear-gradient(135deg, ${accentColor}14 0%, transparent 70%)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 1.5,
                color: TENNIS_ACCENT,
                fontWeight: 700,
                paddingTop: 4,
              }}
            >
              ATP · WTA TOUR · SEASON {SEASON}
            </div>
            <Chip variant="live" sportId="tennis" accent={TENNIS_ACCENT} label="LIVE" />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: C.text,
              marginBottom: 8,
              textWrap: 'balance',
            }}
          >
            {lang === 'id' ? `Tenis ${SEASON}` : `Tennis ${SEASON}`}
          </div>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, maxWidth: 720 }}>
            {lang === 'id'
              ? '4 Grand Slam · Masters 1000 · WTA 1000 · Year-End Finals. Jadwal WIB, undian live, peringkat ATP + WTA, dan sorotan petenis Indonesia — Aldila Sutjiadi, Priska Nugroho, Christopher Rungkat.'
              : '4 Grand Slams · Masters 1000 · WTA 1000 · Year-End Finals. WIB schedule, live draws, ATP + WTA rankings, and Indonesian player spotlight — Aldila Sutjiadi, Priska Nugroho, Christopher Rungkat.'}
          </div>
        </div>

        <div style={{ padding: '8px 20px 20px', display: 'grid', gap: 16 }}>
          {/* Context strip — 4 dashboard stats */}
          <TennisContextStrip accentColor={accentColor} favPlayer={favPlayer} lang={lang} />

          {/* Countdown to next slam + live ticker */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(240px, 340px) 1fr',
              gap: 14,
            }}
          >
            <CountdownToSlam variant="full" />
            <LiveTicker lang={lang} />
          </div>

          {/* Tournaments grid, grouped by tier */}
          {TIER_ORDER.map((tier) => (
            <TierSection
              key={tier.id}
              tier={tier}
              tournaments={tournamentsByTier[tier.id] || []}
              lang={lang}
            />
          ))}

          {/* Rankings snapshot */}
          <RankingsSnapshot lang={lang} />

          {/* Indonesian spotlight + news — side by side on wide screens */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 14,
            }}
          >
            <IndonesianSpotlight lang={lang} />
            <TennisNewsList lang={lang} />
          </div>

          {/* Key Accounts — favorite player (when picked) + ATP + WTA + Tennis TV */}
          <TennisKeyAccounts favPlayer={favPlayer} accentColor={accentColor} lang={lang} />
        </div>

        {/* Disclaimer */}
        <div
          style={{
            padding: '10px 14px',
            fontSize: 10,
            color: C.muted,
            lineHeight: 1.5,
            borderTop: `1px solid ${C.lineSoft}`,
          }}
        >
          {lang === 'id'
            ? 'Gibol adalah media olahraga independen Indonesia. Tidak berafiliasi dengan ATP, WTA, ITF, atau turnamen manapun. Data peringkat + skor live via ESPN. Berita via detikSport, CNN Indonesia, Antara, BBC Sport, Reuters, Tennis.com.'
            : 'Gibol is an independent Indonesian sports media site. Not affiliated with ATP, WTA, ITF, or any tournament. Ranking + live score data via ESPN. News via detikSport, CNN Indonesia, Antara, BBC Sport, Reuters, Tennis.com.'}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: `1px solid ${C.line}`,
            fontSize: 9.5,
            color: C.muted,
            letterSpacing: 0.3,
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>gibol.co · {lang === 'id' ? 'Tenis Indonesia' : 'Tennis Indonesia'}</div>
          <ContactBar lang={lang} variant="inline" />
          <div>
            ← <a href="/" style={{ color: C.dim, textDecoration: 'none' }}>
              {lang === 'id' ? 'semua dashboard' : 'all dashboards'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
