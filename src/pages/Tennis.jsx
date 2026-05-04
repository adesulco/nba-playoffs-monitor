import React, { useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { setTopbarSubrow } from '../lib/topbarSubrow.js';
// v0.53.1 — Phase C redesign: 3-up Newsroom Slice. Gated UI.v2.
import NewsroomSlice from '../components/v2/NewsroomSlice.jsx';
import { UI } from '../lib/flags.js';
// v0.17.0 Phase 2 Sprint B — shared chrome row.
import HubStatusStrip from '../components/v2/HubStatusStrip.jsx';
import HubActionRow from '../components/v2/HubActionRow.jsx';
import HubPicker from '../components/v2/HubPicker.jsx';
import { useQueryParamSync } from '../hooks/useQueryParamSync.js';
// v0.18.0 — TennisPlayerPicker is now lazy-loaded via <HubPicker
// kind="tennis" />, so the direct import is gone from this file.
import {
  TENNIS_STARS_BY_SLUG,
  INDONESIAN_PLAYERS_BY_SLUG,
} from '../lib/sports/tennis/constants.js';
import SEO from '../components/SEO.jsx';
import SEOContent from '../components/SEOContent.jsx';
import CopyLinkButton from '../components/CopyLinkButton.jsx';
import { readableOnDark } from '../lib/contrast.js';
import ContactBar from '../components/ContactBar.jsx';
import Chip from '../components/Chip.jsx';
import TournamentCard from '../components/tennis/TournamentCard.jsx';
import LiveMatchCard from '../components/tennis/LiveMatchCard.jsx';
import CountdownToSlam from '../components/tennis/CountdownToSlam.jsx';
import RankingsTable from '../components/tennis/RankingsTable.jsx';
import { useTennisScoreboard } from '../hooks/useTennisScoreboard.js';
import { useTennisRankings } from '../hooks/useTennisRankings.js';
import { useTennisNews } from '../hooks/useTennisNews.js';
import { useTennisSlamOdds } from '../hooks/useTennisSlamOdds.js';
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
// v0.11.26 NEW-4 — Tennis sponsor brown is 2.34:1 on white, ~3.8:1 on
// dark navy. readableOnDark mixes toward white for the dark-mode hub.
// Decorative chrome (left-borders, accent bars) keeps the original.
const TENNIS_ACCENT_TEXT = readableOnDark(TENNIS_ACCENT);

// Tier color keys — used by the tournament toggle ribbon to give each
// concurrent tournament a visual identity at a glance.
const TIER_COLORS = {
  slam: '#D4A13A',          // gold
  combined1000: '#A855F7',  // purple
  masters: '#C23C3C',       // red (ATP masters)
  wta1000: '#DB2777',       // pink (WTA 1000)
  finals: '#F59E0B',        // amber
};

// ─── Active Tournaments Ribbon ──────────────────────────────────────────────
// Shows tournaments that are currently in progress OR start within the
// next 14 days. Multiple tournaments often run concurrently (ATP 500 +
// WTA 1000 + Challenger), so this ribbon lets users jump between the
// ones they care about. Clicking opens the tournament page directly
// (/tennis/{slug}-{year}) where the full draw + fact sheet live.
function ActiveTournamentsRibbon({ lang }) {
  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 86400000);

  const active = useMemo(() => {
    const rows = [];
    for (const t of TOURNAMENTS_2026) {
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      const isLive = now >= start && now <= end;
      const isUpcomingSoon = start > now && start <= in14;
      if (isLive || isUpcomingSoon) {
        rows.push({
          ...t,
          status: isLive ? 'live' : 'upcoming',
          sort: start.getTime(),
        });
      }
    }
    rows.sort((a, b) => {
      // Live first, then upcoming by start date ascending
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      return a.sort - b.sort;
    });
    return rows;
  }, []);

  if (active.length === 0) return null;

  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${TENNIS_ACCENT}`,
      borderRadius: 3,
      padding: '12px 14px',
      // v0.11.28 — viewport-fit: ribbon contains horizontally-scrollable
      // tournament cards. minWidth:0 + overflow:hidden lets it shrink
      // to grid track instead of pushing its parent past dashboard-wrap.
      minWidth: 0,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
        {/* v0.11.12 — was 14px which rendered smaller than the h3
            TournamentCard titles (16px) → broken heading hierarchy.
            Bumped to 15px to match EPL/F1 panel-h2 baseline.
            .tick-live applied when any tournament is currently in
            progress so the amber signature device matches NBA + EPL
            live headers. */}
        <h2
          className={`panel-title-mono${active.some((t) => t.status === 'live') ? ' tick-live' : ''}`}
          style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, margin: 0, color: C.text, letterSpacing: -0.2 }}
        >
          {lang === 'id' ? 'Turnamen aktif & minggu depan' : 'Active & upcoming tournaments'}
        </h2>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>
          {active.filter((t) => t.status === 'live').length > 0 && (
            <span style={{ color: C.red, marginRight: 10 }}>
              ● {active.filter((t) => t.status === 'live').length} LIVE
            </span>
          )}
          {lang === 'id' ? 'KLIK UNTUK BUKA DRAW' : 'TAP TO OPEN DRAW'}
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollSnapType: 'x mandatory',
      }} className="sponsor-items">
        {active.map((t) => {
          const color = TIER_COLORS[t.tier] || TENNIS_ACCENT;
          const isLive = t.status === 'live';
          const label = lang === 'id' ? (t.nameId || t.name) : t.name;
          const toursLabel = (t.tours || []).map((x) => x.toUpperCase()).join(' · ');
          const dateLabel = `${t.startDate.slice(5)} – ${t.endDate.slice(5)}`;
          return (
            <Link
              key={t.id || t.slug}
              to={`/tennis/${t.slug}-${SEASON_YEAR}`}
              style={{
                scrollSnapAlign: 'start',
                flex: '0 0 auto',
                minWidth: 200,
                padding: '10px 12px',
                background: isLive ? `${color}1f` : C.panelRow,
                border: `1px solid ${isLive ? color : C.lineSoft}`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 4,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 9, letterSpacing: 1, color, fontWeight: 700 }}>
                  {toursLabel}
                </span>
                {isLive ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, letterSpacing: 0.8, color: C.red, fontWeight: 700 }}>
                    <span className="live-dot" aria-hidden="true" style={{ width: 6, height: 6, margin: 0 }} />
                    LIVE
                  </span>
                ) : (
                  <span style={{ fontSize: 9, letterSpacing: 0.8, color: C.dim, fontWeight: 700 }}>
                    {lang === 'id' ? 'MINGGU INI' : 'SOON'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: C.muted, letterSpacing: 0.3 }}>
                {t.city || ''} · {dateLabel}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

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
    <section className="stat-strip-2col" style={{
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

// ─── Tennis title odds (next Grand Slam ATP + WTA) ──────────────────────────
// Renders two side-by-side top-5 bar charts — men's + women's draws of the
// nextSlam() result. Each row is a player name + accent bar + % + delta.
// Slam-slug map covers the four 2026 slams; add other slugs as Polymarket
// publishes them.
const SLAM_POLYMARKET_SLUGS = {
  'australian-open': {
    atp: '2026-mens-australian-open-winner',
    wta: '2026-womens-australian-open-winner',
  },
  'roland-garros': {
    atp: '2026-mens-french-open-winner',
    wta: '2026-womens-french-open-winner',
  },
  wimbledon: {
    atp: '2026-mens-wimbledon-winner',
    wta: '2026-womens-wimbledon-winner',
  },
  'us-open': {
    atp: '2026-mens-us-open-winner',
    wta: '2026-womens-us-open-winner',
  },
};

function TennisPeluangJuara({ slam, accentColor, lang }) {
  // Lookup the polymarket slugs for the current upcoming slam. If none
  // exists (the slam identifier isn't mapped yet), render nothing so the
  // section disappears cleanly instead of flashing a broken panel.
  const slugs = slam?.id ? SLAM_POLYMARKET_SLUGS[slam.id] : null;
  const atpResult = useTennisSlamOdds(slugs?.atp);
  const wtaResult = useTennisSlamOdds(slugs?.wta);

  // Bail if neither tour has markets yet (e.g. markets close 48h before
  // the final or the slug isn't live).
  if (!slugs) return null;
  if ((atpResult.odds?.length || 0) + (wtaResult.odds?.length || 0) === 0) return null;

  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 3,
      padding: '14px 14px 10px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 10,
      }}>
        <h2 className="panel-title-mono" style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
          margin: 0, color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? `Peluang juara · ${slam.name}` : `Title odds · ${slam.name}`}
        </h2>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>
          POLYMARKET · LIVE
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 12,
      }}>
        <TennisSlamColumn
          title={lang === 'id' ? 'PUTRA · ATP' : 'MEN · ATP'}
          accent="#C23C3C"
          odds={atpResult.odds}
          lang={lang}
        />
        <TennisSlamColumn
          title={lang === 'id' ? 'PUTRI · WTA' : 'WOMEN · WTA'}
          accent="#DB2777"
          odds={wtaResult.odds}
          lang={lang}
        />
      </div>

      <div style={{
        fontSize: 9, color: C.muted, letterSpacing: 0.3,
        marginTop: 8, lineHeight: 1.4,
      }}>
        {lang === 'id'
          ? 'Probabilitas pasar prediksi Polymarket. Update tiap 60 detik. Hanya pemain dengan peluang >0% yang muncul.'
          : 'Polymarket prediction-market probabilities. Refreshes every 60s. Only players with >0% odds shown.'}
      </div>
    </section>
  );
}

function TennisSlamColumn({ title, accent, odds, lang }) {
  if (!odds || odds.length === 0) {
    return (
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.2, color: accent, fontWeight: 700, marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          {lang === 'id' ? 'Pasar belum tersedia' : 'Market not yet available'}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.2, color: accent, fontWeight: 700, marginBottom: 8, padding: '0 2px' }}>
        {title}
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        {odds.slice(0, 5).map((o) => {
          const displayName = o.name;
          const playerAccent = o.player?.accent || accent;
          const pct = Math.max(1, Math.min(100, o.pct));
          const changeColor = o.change > 0 ? C.green : o.change < 0 ? C.red : C.muted;
          const changeSign = o.change > 0 ? '+' : '';
          const href = o.slug ? `#${o.slug}` : null;
          return (
            <div
              key={o.name}
              className="tennis-odds-row"
              style={{
                display: 'grid',
                // v0.11.16 — mobile fix. Was minmax(84, 1.4fr) 1fr 40 30 which
                // squeezed "Alexander Zverev"-length names to near-ellipsis
                // at 375 px. Bumped name ratio to 2fr + floor to 110 px,
                // bar column's floor raised to 48 px. The .tennis-odds-row
                // class + media query at ≤480 hides the progress bar entirely
                // so the name + pct + delta share the whole width without
                // squeezing.
                gridTemplateColumns: 'minmax(110px, 2fr) minmax(48px, 1fr) 40px 30px',
                gap: 8,
                alignItems: 'center',
                padding: '6px 8px',
                background: C.panelRow,
                border: `1px solid ${C.lineSoft}`,
                borderLeft: `2px solid ${playerAccent}`,
                borderRadius: 3,
                fontSize: 11,
              }}
            >
              <div style={{ color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {href ? (
                  <a href={href} style={{ color: C.text, textDecoration: 'none' }}>{displayName}</a>
                ) : displayName}
                {o.player?.ccode && (
                  <span style={{ marginLeft: 5, color: C.muted, fontSize: 9, letterSpacing: 0.4 }}>
                    {o.player.ccode}
                  </span>
                )}
              </div>
              <div className="tennis-odds-bar" style={{ height: 7, background: C.panel2, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: playerAccent,
                  transition: 'width 400ms var(--ease-standard, ease-out)',
                }} />
              </div>
              <div style={{
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
                fontSize: 12, fontWeight: 700, color: C.text,
              }}>
                {o.pct}%
              </div>
              <div style={{
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5, fontWeight: 600, color: changeColor,
              }}>
                {o.change !== 0 ? `${changeSign}${o.change}` : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
            color: TENNIS_ACCENT_TEXT,
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
  const { lang, selectedTennisPlayer, setSelectedTennisPlayer, t } = useApp();
  // v0.11.8 — URL ↔ player sync. ?player=alcaraz restores the pick.
  useQueryParamSync('player', selectedTennisPlayer, setSelectedTennisPlayer);
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

  // v0.17.0 Phase 2 Sprint B — push <HubStatusStrip> into the V2TopBar
  // subrow. Replaces both the previous picker-only subrow AND the
  // inline 200px hero (eyebrow + 36px h1 + LIVE chip + CopyLinkButton).
  // SEO h1 rides as `.sr-only` inside the strip.
  useEffect(() => {
    setTopbarSubrow(
      <HubStatusStrip
        srOnlyTitle={favPlayer
          ? (lang === 'id'
              ? `${favPlayer.name || favPlayer.displayName} · Tenis ${SEASON}`
              : `${favPlayer.name || favPlayer.displayName} · Tennis ${SEASON}`)
          : (lang === 'id' ? `Tenis ${SEASON}` : `Tennis ${SEASON}`)}
        accent={favPlayer ? accentColor : undefined}
        picker={
          <HubPicker
            kind="tennis"
            selectedKey={selectedTennisPlayer}
            onSelect={setSelectedTennisPlayer}
            lang={lang}
          />
        }
        live={
          <span style={{ textTransform: 'uppercase' }}>
            ATP · WTA TOUR · {t('season')} {SEASON}
          </span>
        }
        actions={
          <HubActionRow
            url={favPlayer ? `/tennis?player=${selectedTennisPlayer}` : '/tennis'}
            shareText={favPlayer
              ? (lang === 'id'
                  ? `${favPlayer.name || favPlayer.displayName} di hub Tenis ${SEASON} · gibol.co 🎾`
                  : `${favPlayer.name || favPlayer.displayName} on the Tennis ${SEASON} hub · gibol.co 🎾`)
              : (lang === 'id' ? `Tenis ${SEASON} di gibol.co — Grand Slam, Masters, Finals 🎾` : `Tennis ${SEASON} on gibol.co — Grand Slams, Masters, Finals 🎾`)}
            accent={TENNIS_ACCENT}
            analyticsEvent="tennis_share_hub"
          />
        }
      />
    );
    return () => setTopbarSubrow(null);
  }, [selectedTennisPlayer, setSelectedTennisPlayer, lang, favPlayer, accentColor, t]);

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        color: C.text,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      {/* v0.11.23 GIB-018 — when a player is picked, lead the title (and
          og:title) with that name so a deep-link share unfurls topical.
          og:url + canonical also reflect the ?player= slug so the share
          URL matches what the user is actually viewing on /tennis. */}
      <SEO
        title={favPlayer
          ? (lang === 'id'
              ? `${favPlayer.name || favPlayer.displayName} · Tenis ${SEASON} | gibol.co`
              : `${favPlayer.name || favPlayer.displayName} · Tennis ${SEASON} | gibol.co`)
          : meta.title}
        description={favPlayer
          ? (lang === 'id'
              ? `Halaman ${favPlayer.name || favPlayer.displayName} di hub Tenis ${SEASON} — Grand Slam, Masters 1000, race ke ATP/WTA Finals. ${meta.description || ''}`
              : `${favPlayer.name || favPlayer.displayName} view on the Tennis ${SEASON} hub — Grand Slams, Masters 1000s, the race to the ATP/WTA Finals. ${meta.description || ''}`)
          : meta.description}
        path={favPlayer ? `${location.pathname}?player=${selectedTennisPlayer}` : location.pathname}
        image="https://www.gibol.co/og/hub-tennis.png"
        lang={lang}
        keywords={meta.keywords}
        jsonLd={meta.jsonLd}
      />
      <div className="dashboard-wrap">
        {/* v0.17.0 Phase 2 Sprint B — visible 200px hero stripped.
            Eyebrow + 36px h1 + LIVE chip + CopyLinkButton all moved
            into <HubStatusStrip> in the V2TopBar subrow above. SEO h1
            rides as `.sr-only`. The active-tournaments ribbon below
            now sits ~140px closer to the top of the viewport. */}

        <div style={{ padding: '8px 24px 20px', display: 'grid', gap: 16, minWidth: 0 }}>
          {/* v0.11.25 layout — Active tournaments ribbon (live + next-14-day
              tournaments) is the Tennis hero, followed by the live
              ticker. Context strip + champion odds demoted below. */}

          {/* ── Row 1 — Active tournaments ribbon (the hero). ── */}
          <ActiveTournamentsRibbon lang={lang} />

          {/* ── Row 2 — Live ticker (in-flight matches across active
              tournaments). ── */}
          <LiveTicker lang={lang} />

          {/* ── Row 3 — Context strip: 4 dashboard stats. Demoted from
              above the ribbon. ── */}
          <TennisContextStrip accentColor={accentColor} favPlayer={favPlayer} lang={lang} />

          {/* ── Row 4 — Peluang juara, top 5 ATP + WTA. ── */}
          <TennisPeluangJuara slam={nextSlam()} accentColor={accentColor} lang={lang} />

          {/* ── Row 5 — Countdown to next Grand Slam (LiveTicker
              already promoted to Row 2). ── */}
          <CountdownToSlam variant="full" />

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

        {/* v0.53.1 — Phase C redesign: NewsroomSlice. UI.v2-gated. */}
        {UI.v2 && (
          <div style={{ padding: '0 16px 24px' }}>
            <NewsroomSlice
              sport="tennis"
              newsroomLabel="TENNIS NEWSROOM"
              moreHref="/tennis#newsroom"
            />
          </div>
        )}

        {/* v0.11.25 — Tennis SEO/FAQ block at the bottom (NBA pattern). */}
        <SEOContent lang={lang} sport="tennis" />

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

        {/* Footer — v0.11.20 GIB-014 wraps in <footer> landmark */}
        <footer
          role="contentinfo"
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
        </footer>
      </div>
    </div>
  );
}
