import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePlayoffData } from '../hooks/usePlayoffData.js';
import { usePolymarketWS } from '../hooks/usePolymarketWS.js';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import Sparkline from '../components/Sparkline.jsx';
import Bracket from '../components/Bracket.jsx';
import TeamPicker from '../components/TeamPicker.jsx';
import LiveGameFocus from '../components/LiveGameFocus.jsx';
import { useSeriesState } from '../hooks/useSeriesState.js';
import { useInjuries } from '../hooks/useInjuries.js';
import { useTeamLeaders } from '../hooks/useTeamLeaders.js';
import YesterdayRecap from '../components/YesterdayRecap.jsx';
import TitlePath from '../components/TitlePath.jsx';
import WatchlistPanel from '../components/WatchlistPanel.jsx';
import AlertToasts from '../components/AlertToasts.jsx';
import PlayerHead from '../components/PlayerHead.jsx';
import WatchStar from '../components/WatchStar.jsx';
import { useWatchlist } from '../hooks/useWatchlist.js';
import { useWatchlistAlerts } from '../hooks/useWatchlistAlerts.js';
import { useTeamSchedule, computeStreak, computeH2H } from '../hooks/useTeamSchedule.js';
import { useGameDetails } from '../hooks/useGameDetails.js';
import { useApp } from '../lib/AppContext.jsx';
import FangirBanner from '../components/FangirBanner.jsx';
import ClutchLeaderboard from '../components/ClutchLeaderboard.jsx';
import SEO from '../components/SEO.jsx';
import SEOContent from '../components/SEOContent.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { localizeGameStatus, formatKickoff, getUserTzLabel } from '../lib/timezone.js';

const FAV_STORAGE_KEY = 'gibol:favTeam';

// Mix a hex color toward white by `mix` (0..1). Produces a readable accent on dark bg
// regardless of how dark the source team color is.
function brighten(hex, mix = 0.5) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const f = (v) => Math.round(v + (255 - v) * mix);
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function InjuryBadge({ awayAbbr, homeAbbr, injuries }) {
  const gather = (abbr) => (injuries?.[abbr] || []).filter((i) => {
    const s = (i.shortStatus || '').toUpperCase();
    return s.startsWith('OUT') || s.startsWith('QUE') || s.startsWith('DAY');
  });
  const away = gather(awayAbbr);
  const home = gather(homeAbbr);
  const total = away.length + home.length;
  if (total === 0) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 6px',
      background: 'rgba(255, 92, 92, 0.12)',
      border: '1px solid rgba(255, 92, 92, 0.3)',
      color: 'var(--red)',
      fontSize: 9, letterSpacing: 0.3, fontWeight: 600,
      borderRadius: 3,
    }}>
      ⚠ {total} INJ
    </span>
  );
}

function StreakChip({ streak, color }) {
  if (!streak) return null;
  const isWin = streak.startsWith('W');
  const bg = isWin ? color : '#5a2020';
  return (
    <span style={{
      padding: '1px 5px',
      background: bg,
      color: '#fff',
      fontSize: 8.5,
      letterSpacing: 0.5,
      fontWeight: 700,
      borderRadius: 2,
      display: 'inline-flex', alignItems: 'center',
    }}>
      {streak}
    </span>
  );
}

function GameCard({ g, favTeam, isActive, onClick, injuries, streaks, lang }) {
  const findByAbbr = (abbr) => Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === abbr);
  const awayFullName = findByAbbr(g.away?.abbr);
  const homeFullName = findByAbbr(g.home?.abbr);
  const awayMeta = awayFullName ? TEAM_META[awayFullName] : { color: '#2a3a52' };
  const homeMeta = homeFullName ? TEAM_META[homeFullName] : { color: '#2a3a52' };
  const favInGame = favTeam && (awayFullName === favTeam || homeFullName === favTeam);
  const favColor = favInGame ? TEAM_META[favTeam].color : null;
  const awayNickname = awayFullName ? awayFullName.split(' ').slice(-1)[0] : g.away?.abbr || '—';
  const homeNickname = homeFullName ? homeFullName.split(' ').slice(-1)[0] : g.home?.abbr || '—';
  const isLive = g.statusState === 'in';
  const isFinal = g.statusState === 'post';
  const awayScore = g.away?.score;
  const homeScore = g.home?.score;
  const hasScore = awayScore !== null && awayScore !== undefined && awayScore !== '' && !(Number(awayScore) === 0 && Number(homeScore) === 0 && !isLive);
  const awayWon = hasScore && parseInt(awayScore) > parseInt(homeScore);
  const homeWon = hasScore && parseInt(homeScore) > parseInt(awayScore);

  const Row = ({ abbr, nickname, meta, score, won, record, streak }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 3, background: meta.color, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {abbr || '—'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12, color: won ? C.text : hasScore && !won ? C.muted : C.text, fontWeight: won ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nickname}</span>
            <StreakChip streak={streak} color={meta.color} />
          </div>
          {record && <span style={{ fontSize: 9, color: C.muted }}>{record}</span>}
        </div>
      </div>
      {hasScore && (
        <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 600, color: won ? C.amberBright : C.text, letterSpacing: -0.3, lineHeight: 1 }}>{score}</span>
      )}
    </div>
  );

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px',
        borderRight: `1px solid ${C.lineSoft}`,
        borderBottom: `1px solid ${C.lineSoft}`,
        borderLeft: favInGame ? `3px solid ${favColor}` : isActive ? `3px solid ${C.amber}` : '3px solid transparent',
        background: isActive ? '#10243c' : favInGame ? `${favColor}14` : 'transparent',
        display: 'flex', flexDirection: 'column', gap: 8,
        minWidth: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => { if (onClick && !isActive) e.currentTarget.style.background = 'var(--hover)'; }}
      onMouseLeave={(e) => { if (onClick && !isActive) e.currentTarget.style.background = favInGame ? `${favColor}14` : 'transparent'; }}
    >
      {/* Moved to bottom-left status row so it no longer overlaps the big score text */}
      <Row abbr={g.away?.abbr} nickname={awayNickname} meta={awayMeta} score={awayScore} won={awayWon} record={g.away?.record} streak={streaks?.[g.away?.abbr]} />
      <Row abbr={g.home?.abbr} nickname={homeNickname} meta={homeMeta} score={homeScore} won={homeWon} record={g.home?.record} streak={streaks?.[g.home?.abbr]} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 10, paddingTop: 6, borderTop: `1px solid ${C.lineSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isLive ? C.green : isFinal ? C.dim : '#ffb347' }}>
          {isLive && <span className="live-dot" style={{ background: C.red }} />}
          <span style={{ letterSpacing: 0.3 }}>{localizeGameStatus(g.status, g.date, g.statusState, lang) || (isLive ? 'LIVE' : isFinal ? 'FINAL' : 'UPCOMING')}</span>
          {isActive && (
            <span style={{ fontSize: 8, letterSpacing: 0.5, color: C.amber, fontWeight: 600, marginLeft: 4 }}>
              ● FOLLOWING
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <InjuryBadge awayAbbr={g.away?.abbr} homeAbbr={g.home?.abbr} injuries={injuries} />
          {favInGame && (
            <span style={{ fontSize: 9, letterSpacing: 0.5, color: favColor, fontWeight: 600 }}>★ YOUR TEAM</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NBADashboard() {
  const { theme, toggleTheme, lang, toggleLang, t } = useApp();
  const { champion, mvp, games, sparklines, lastUpdate, status, errors } = usePlayoffData(30000);
  const [now, setNow] = useState(new Date());
  const [favTeam, setFavTeam] = useState(() => {
    try { return localStorage.getItem(FAV_STORAGE_KEY) || null; } catch { return null; }
  });

  const favMeta = favTeam ? TEAM_META[favTeam] : null;
  // Theme: selected team's color overrides amber accents
  const accent = favMeta ? favMeta.color : C.amber;
  const accentBright = favMeta ? brighten(favMeta.color, 0.55) : C.amberBright;

  function setFav(name) {
    setFavTeam(name);
    try {
      if (name) localStorage.setItem(FAV_STORAGE_KEY, name);
      else localStorage.removeItem(FAV_STORAGE_KEY);
    } catch {}
    // F35 — tracking favorite team selection to measure team-picker engagement
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name ? 'team_pick' : 'team_clear', { team_name: name || 'none' });
    }
  }

  // Active match to follow (live game focus).
  // `userDismissed` flips to true when the user clicks CLOSE FOCUS — this prevents
  // the auto-select effect from immediately re-opening the panel with a live game.
  // Clicking any GameCard afterwards resets it (handleGameCardClick below).
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [userDismissed, setUserDismissed] = useState(false);
  // Auto-select the first live game, falling back to the first upcoming game.
  // Skipped once the user has explicitly dismissed the focus for this session.
  useEffect(() => {
    if (activeMatchId || userDismissed) return;
    const live = games.find((g) => g.statusState === 'in');
    if (live) { setActiveMatchId(live.id); return; }
    // Else: if user's team is playing today, pick that
    if (favMeta) {
      const favAbbr = favMeta.abbr;
      const favGame = games.find((g) => g.away?.abbr === favAbbr || g.home?.abbr === favAbbr);
      if (favGame) setActiveMatchId(favGame.id);
    }
  }, [games, activeMatchId, favMeta, userDismissed]);

  // Clicking a GameCard always wins: re-engage focus even if user had dismissed.
  const handleGameCardClick = (id) => {
    setUserDismissed(false);
    setActiveMatchId(id);
  };

  // Series standings for bracket watermark
  const { seriesMap } = useSeriesState('2026-04-18', '2026-05-03');
  // Injury report
  const { byTeam: injuriesByTeam } = useInjuries();
  // Team player leaders (for the selected team — falls back to top title-favorite if no pick)
  const topChampName = champion?.odds?.[0]?.name;
  const leaderTeamAbbr = favMeta?.abbr || (topChampName ? TEAM_META[topChampName]?.abbr : null);
  const { leaders: teamLeaders } = useTeamLeaders(leaderTeamAbbr);

  // Watchlist + live alerts
  const watchlist = useWatchlist();
  // Lift LiveGameFocus summary up so the watchlist alerts can read it
  const focusEventId = activeMatchId && !String(activeMatchId).startsWith('sched-') ? activeMatchId : null;
  const { summary: focusSummary, winProb: focusWinProb, lastUpdate: focusLastUpdate } = useGameDetails(focusEventId);
  const { toasts: alertToasts, dismissToast } = useWatchlistAlerts(watchlist.list, focusSummary, focusEventId);

  function requestNotifications() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }

  // Team schedules for streak + H2H — fetch both teams of the active match
  const awayAbbr = (() => {
    const g = games.find((gm) => gm.id === activeMatchId);
    return g?.away?.abbr;
  })();
  const homeAbbr = (() => {
    const g = games.find((gm) => gm.id === activeMatchId);
    return g?.home?.abbr;
  })();
  const { schedule: awaySchedule } = useTeamSchedule(awayAbbr);
  const { schedule: homeSchedule } = useTeamSchedule(homeAbbr);

  // Streak map for teams visible in today's scoreboard
  const streaks = useMemo(() => {
    const map = {};
    if (awaySchedule && awayAbbr) map[awayAbbr] = computeStreak(awaySchedule, awayAbbr);
    if (homeSchedule && homeAbbr) map[homeAbbr] = computeStreak(homeSchedule, homeAbbr);
    return map;
  }, [awaySchedule, homeSchedule, awayAbbr, homeAbbr]);

  // Top 3 teams get WebSocket ticks
  const topTokenIds = useMemo(
    () => champion.odds.slice(0, 3).map((o) => o.yesTokenId).filter(Boolean),
    [champion.odds]
  );
  const { prices: wsPrices, status: wsStatus } = usePolymarketWS(topTokenIds);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Overlay live WS prices on top of the 30s polled prices
  const liveOdds = useMemo(() => {
    return champion.odds.map((o) => {
      if (o.yesTokenId && wsPrices[o.yesTokenId]?.price !== undefined) {
        const livePct = Math.round(wsPrices[o.yesTokenId].price * 100);
        return { ...o, pct: livePct, isLive: true };
      }
      return { ...o, isLive: false };
    }).sort((a, b) => b.pct - a.pct);
  }, [champion.odds, wsPrices]);

  const statusColor = { live: C.green, stale: C.amber, error: C.red, connecting: C.dim }[status];
  const statusLabel = { live: 'LIVE', stale: 'PARTIAL', error: 'OFFLINE', connecting: 'CONNECTING' }[status];
  const topChamp = liveOdds[0] || { name: 'Oklahoma City Thunder', pct: 44 };
  const fmtVol = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(0)}K`);

  const panelBox = { borderBottom: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column' };
  const panelHeader = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: C.panelRow,
  };
  const panelTitle = { fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 };
  const panelMeta = { fontSize: 9.5, color: C.dim, letterSpacing: 0.5 };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', overflowX: 'auto', fontFamily: '"JetBrains Mono", monospace', color: C.text, fontSize: 11.5, lineHeight: 1.4 }}>
      <SEO
        title="Skor NBA Playoff 2026 Live · Bracket, Peluang Juara, Play-by-Play | gibol.co"
        description="Dashboard live NBA Playoff 2026: skor real-time, bracket Ronde 1, peluang juara Polymarket (OKC 44%), win probability, play-by-play, shot chart, statistik pemain, laporan cedera, dan watchlist. Update setiap 10–30 detik."
        path="/nba-playoff-2026"
        lang={lang}
        keywords={`skor nba, skor basket, skor playoff nba, skor nba live, skor nba hari ini, peluang juara nba 2026, bracket nba playoff 2026, jadwal nba playoff, ${favMeta ? `skor ${favMeta.abbr.toLowerCase()}, skor ${favTeam}` : 'skor lakers, skor celtics, skor okc, skor thunder, skor pistons'}, live nba indonesia`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          "name": "2026 NBA Playoffs",
          "description": "Postseason NBA 2025–26. Ronde 1 mulai 18 April 2026. Finals tip-off 3 Juni 2026 di ABC.",
          "startDate": "2026-04-17",
          "endDate": "2026-06-20",
          "eventStatus": "https://schema.org/EventScheduled",
          "sport": "Basketball",
          "organizer": {
            "@type": "SportsOrganization",
            "name": "National Basketball Association",
            "url": "https://www.nba.com"
          },
          "url": "https://www.gibol.co/nba-playoff-2026",
          "inLanguage": ["id-ID", "en-US"]
        }}
      />
      <AlertToasts toasts={alertToasts} dismissToast={dismissToast} />
      <div className="dashboard-wrap">

        {/* ================== TOP BAR ================== */}
        <div className="topbar" style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: 18, alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.line}`, background: C.topbarBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/favicon-64.png"
              alt="gibol.co"
              width={26}
              height={26}
              style={{ display: 'block', borderRadius: 4, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 14 }}>Monitoring the Playoffs</div>
              <div style={{ fontSize: 10.5, color: C.dim, letterSpacing: 0.5 }}>NBA <strong style={{ color: accent }}>•</strong> {t('tagline')} <strong style={{ color: accent }}>•</strong> {t('liveLabel')}</div>
            </div>
            <Link
              to="/"
              style={{
                fontSize: 9.5, color: C.dim, textDecoration: 'none', letterSpacing: 0.5,
                padding: '4px 8px', border: `1px solid ${C.lineSoft}`, borderRadius: 3,
                marginLeft: 8, transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.dim; e.currentTarget.style.borderColor = C.lineSoft; }}
            >
              ← gibol.co
            </Link>
            <Link
              to="/recap"
              style={{
                fontSize: 9.5, color: accent, textDecoration: 'none', letterSpacing: 0.5,
                padding: '4px 8px', border: `1px solid ${accent}`, borderRadius: 3,
                marginLeft: 6, transition: 'all 0.15s', fontWeight: 600,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${accent}20`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              📖 CATATAN PLAYOFF
            </Link>
          </div>
          <TeamPicker selectedTeam={favTeam} onSelect={setFav} />
          <div className="topbar-meta" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', fontSize: 10.5, color: C.dim, alignItems: 'center' }}>
            <button
              onClick={toggleLang}
              title={lang === 'en' ? 'Beralih ke Bahasa Indonesia' : 'Switch to English'}
              aria-label={lang === 'en' ? 'Beralih ke Bahasa Indonesia' : 'Switch to English'}
              style={{
                background: 'transparent',
                border: `1px solid ${C.lineSoft}`,
                color: C.dim,
                height: 26,
                padding: '0 8px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 10,
                letterSpacing: 1,
                fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.color = C.amber; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.lineSoft; e.currentTarget.style.color = C.dim; }}
            >
              {lang === 'en' ? 'EN' : 'ID'}
            </button>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
              aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
              style={{
                background: 'transparent',
                border: `1px solid ${C.lineSoft}`,
                color: C.dim,
                width: 26, height: 26,
                borderRadius: 4,
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
                padding: 0,
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.color = C.amber; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.lineSoft; e.currentTarget.style.color = C.dim; }}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="live-dot" style={{ background: statusColor }} /> {t(statusLabel.toLowerCase()) || statusLabel}</span>
            <span style={{ color: accentBright, fontWeight: 600, fontSize: 13, fontFamily: '"Space Grotesk", sans-serif' }}>
              {new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: lang !== 'id' }).format(now)} {getUserTzLabel()}
            </span>
            <span>{new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(now)}</span>
          </div>
          <div style={{ fontSize: 10, color: C.dim, textAlign: 'right' }}>
            {lastUpdate ? `refresh ${Math.round((now - lastUpdate) / 1000)}s ago` : 'connecting...'}
          </div>
        </div>

        {/* ================== YESTERDAY RECAP (collapsible) ================== */}
        <YesterdayRecap favTeam={favTeam} t={t} />

        {/* ================== LIVE SCOREBOARD HERO ================== */}
        <div className="scoreboard-hero" style={{ borderBottom: `1px solid ${C.line}`, background: C.heroBg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid ${C.lineSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 }}>{t('liveScoreboard')}</span>
              <span style={{ fontSize: 9.5, color: C.dim }}>{games.length > 0 ? `${games.length} ${t('games')}` : t('today')}</span>
            </div>
            <div style={{ fontSize: 9.5, color: C.dim, letterSpacing: 0.5 }}>
              {errors.scores ? <span style={{ color: C.red }}>● {t('espnOff')}</span> : <span style={{ color: C.green }}>● {t('espnLive')}</span>}
            </div>
          </div>
          <div className="game-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0 }}>
            {games.length === 0 && [
              { id: 'sched-1', name: 'ORL @ CHA', away: { abbr: 'ORL', score: null }, home: { abbr: 'CHA', score: null }, date: '2026-04-17T23:30:00Z', status: 'FRI 7:30 PM ET', statusState: 'pre' },
              { id: 'sched-2', name: 'PHX @ GSW', away: { abbr: 'PHX', score: null }, home: { abbr: 'GSW', score: null }, date: '2026-04-18T02:00:00Z', status: 'FRI 10:00 PM ET', statusState: 'pre' },
            ].map((g) => <GameCard key={g.id} g={g} favTeam={favTeam} isActive={activeMatchId === g.id} onClick={() => handleGameCardClick(g.id)} injuries={injuriesByTeam} streaks={streaks} lang={lang} />)}
            {games.slice(0, 6).map((g, i) => (
              <GameCard
                key={g.id || i}
                g={g}
                favTeam={favTeam}
                isActive={activeMatchId === g.id}
                onClick={() => handleGameCardClick(g.id)}
                injuries={injuriesByTeam}
                streaks={streaks}
                lang={lang}
              />
            ))}
          </div>
        </div>

        {/* ================== LIVE GAME FOCUS ================== */}
        <LiveGameFocus
          eventId={focusEventId}
          favTeam={favTeam}
          accent={accent}
          injuries={injuriesByTeam}
          onClose={() => { setActiveMatchId(null); setUserDismissed(true); }}
          summary={focusSummary}
          winProb={focusWinProb}
          lastUpdate={focusLastUpdate}
          watchlist={watchlist}
          h2h={awaySchedule && homeSchedule ? computeH2H([...(awaySchedule || []), ...(homeSchedule || [])], awayAbbr, homeAbbr, 3) : []}
        />

        {/* ================== CONTEXT STRIP (odds demoted) ================== */}
        <div className="stat-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${C.line}`, background: C.panelSoft }}>
          {[
            { label: t('titleFavorite'), value: `${TEAM_META[topChamp.name]?.abbr || 'OKC'} ${topChamp.pct}%`, sub: topChamp.name.split(' ').slice(-1)[0] },
            { label: t('round1Tips'), value: 'APR 18', sub: `${games.length || 2} ${t('gamesFriday')}` },
            { label: t('finalsTipoff'), value: 'JUN 3', sub: 'ABC · Best-of-7' },
            { label: t('nextTip'), value: games[0]?.date ? formatKickoff(games[0].date, lang) : (localizeGameStatus(games[0]?.status, games[0]?.date, games[0]?.statusState, lang) || `6:30 ${getUserTzLabel()}`), sub: games[0] ? `${games[0].away.abbr} @ ${games[0].home.abbr}` : 'ORL @ CHA' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '8px 14px', borderRight: i < 3 ? `1px solid ${C.lineSoft}` : 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: 0.8, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 15, fontWeight: 600, color: accentBright, letterSpacing: -0.2 }}>{s.value}</div>
              <div style={{ fontSize: 9.5, color: C.dim }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ================== MAIN GRID ================== */}
        <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '240px 340px 340px 1fr', minHeight: 720 }}>

          {/* COL 1: Bracket + Key Accounts */}
          <div style={{ borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column' }}>
            <div style={panelBox}>
              <div style={panelHeader}>
                <div style={panelTitle}>{t('round1Bracket')}</div>
                <div style={panelMeta}>APR 18 – MAY 3</div>
              </div>
              <div className="bracket-viz">
                <Bracket championOdds={liveOdds} seriesMap={seriesMap} />
              </div>
            </div>

            <div style={{ ...panelBox, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: C.panelSoft, fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 }}>
                <span>⚡ {favMeta ? `${favMeta.abbr} FEED` : 'KEY ACCOUNTS'}</span>
                <span style={{ color: accent, letterSpacing: 0.5, fontSize: 9.5, fontWeight: 500 }}>
                  {favMeta ? `#${favMeta.abbr}${favTeam.split(' ').slice(-1)[0]}` : '#NBAPLAYOFFS'}
                </span>
              </div>
              {(favMeta ? [
                { handle: `@${favMeta.handle}`, url: `https://x.com/${favMeta.handle}`, age: '30m', text: `Playoff run starts this week. #${favMeta.abbr}${favTeam.split(' ').slice(-1)[0]}` },
                { handle: '@NBA', url: `https://x.com/search?q=${favMeta.abbr}&src=typed_query&f=live`, age: '1h', text: `Latest updates on ${favTeam} — live search on X.` },
                { handle: '@espn', url: `https://www.espn.com/nba/team/_/name/${favMeta.abbr.toLowerCase()}`, age: '2h', text: `ESPN hub — schedule, roster, injury report for ${favTeam.split(' ').slice(-1)[0]}.` },
                { handle: '@BleacherReport', url: `https://bleacherreport.com/${favTeam.toLowerCase().replace(/ /g, '-')}`, age: '3h', text: `Bleacher Report coverage on the ${favTeam.split(' ').slice(-1)[0]}.` },
              ] : [
                { handle: '@NBA', url: 'https://x.com/NBA', age: '1h', text: 'Play-In Finale tonight on Prime — 8-seeds on the line in both conferences.' },
                { handle: '@espn', url: 'https://x.com/espn', age: '2h', text: 'Pistons earn No. 1 seed in the East — first time since 2007–08.' },
                { handle: '@BleacherReport', url: 'https://x.com/BleacherReport', age: '3h', text: 'LeBron vs KD in the playoffs for the first time since 2018 Finals.' },
                { handle: '@PolymarketSport', url: 'https://x.com/Polymarket', age: '5h', text: `${TEAM_META[topChamp.name]?.abbr || 'OKC'} champ odds at ${topChamp.pct}%, volume tops ${fmtVol(champion.volume)}.` },
              ]).map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-row"
                  style={{ display: 'block', padding: '8px 12px', borderBottom: `1px solid ${C.lineSoft}`, fontSize: 10.5, textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.text, display: 'flex', gap: 6, alignItems: 'center' }}>{a.handle} <span style={{ color: accent }}>✓</span></span>
                    <span style={{ color: C.dim, fontSize: 9.5 }}>{a.age} ↗</span>
                  </div>
                  <div style={{ color: C.dim, marginTop: 3, lineHeight: 1.35 }}>{a.text}</div>
                </a>
              ))}
            </div>
          </div>

          {/* COL 2: Title Odds with sparklines + WS ticker */}
          <div style={{ borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column' }}>
            <div style={panelBox}>
              <div style={panelHeader}>
                <div style={panelTitle}>{t('titleOdds')}</div>
                <div style={panelMeta}>
                  {errors.champion ? <span style={{ color: C.red }}>● CACHED</span> : <span style={{ color: C.green }}>● POLYMARKET</span>}
                  {wsStatus === 'live' && <span style={{ color: C.green, marginLeft: 6 }}>· WS TICK</span>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 70px 52px 36px', gap: 4, padding: '5px 12px', fontSize: 9, color: C.dim, letterSpacing: 1, borderBottom: `1px solid ${C.lineSoft}`, background: C.panelSoft }}>
                <div>#</div><div>TEAM</div><div style={{ textAlign: 'center' }}>7D</div><div style={{ textAlign: 'right' }}>ODDS</div><div style={{ textAlign: 'right' }}>Δ</div>
              </div>
              <div>
                {liveOdds.slice(0, 11).map((team, i) => {
                  const meta = TEAM_META[team.name] || { abbr: '?', color: '#666' };
                  const changeColor = team.change > 0 ? C.green : team.change < 0 ? C.red : C.muted;
                  const changeIcon = team.change > 0 ? '▲' : team.change < 0 ? '▼' : '—';
                  const spark = sparklines[team.name];
                  return (
                    <div key={team.name} className="lb-row" style={{ display: 'grid', gridTemplateColumns: '22px 1fr 70px 52px 36px', gap: 4, padding: '5px 12px', fontSize: 11, alignItems: 'center', borderBottom: `1px solid ${C.lineSoft}`, background: team.name === favTeam ? `${favMeta.color}22` : 'transparent', borderLeft: team.name === favTeam ? `2px solid ${favMeta.color}` : '2px solid transparent', transition: 'background 0.15s' }}>
                      <div style={{ color: C.dim }}>{i + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, background: meta.color, fontSize: 8.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{meta.abbr}</div>
                        <span>{team.name.split(' ').slice(-1)[0]}</span>
                        {team.isLive && <span style={{ fontSize: 7, color: C.green }}>●</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Sparkline data={spark} />
                      </div>
                      <div style={{ textAlign: 'right', color: team.name === favTeam ? accentBright : C.amberBright, fontWeight: 600 }}>{team.pct}%</div>
                      <div style={{ textAlign: 'right', color: changeColor, fontSize: 10 }}>{changeIcon}{team.change !== 0 && Math.abs(team.change)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={panelBox}>
              <div style={panelHeader}>
                <div style={panelTitle}>{t('featuredSeries')}</div>
                <div style={panelMeta}>ROUND 1</div>
              </div>
              <div>
                {[
                  ['HEADLINE', 'Lakers–Rockets: LeBron vs KD, first playoff meeting since 2018'],
                  ['REVENGE', 'Nuggets–Timberwolves: 3rd postseason meeting in 4 years'],
                  ['RESURGENCE', "Pistons' first No. 1 East seed since 2007–08"],
                  ['DEBUT', 'Wembanyama opens first career playoff series vs Portland'],
                ].map(([label, text], i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 6, padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, fontSize: 10.5 }}>
                    <div style={{ color: C.dim, fontSize: 9.5, letterSpacing: 0.5 }}>{label}</div>
                    <div>{text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clutch leaderboard — aggregates across all completed playoff games */}
            <ClutchLeaderboard watchlist={watchlist} accent={accent} lang={lang} />
          </div>

          {/* COL 3: Title Path + Watchlist + Team Player Stats */}
          <div style={{ borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column' }}>
            {favMeta && <TitlePath favTeam={favTeam} championOdds={liveOdds} t={t} />}

            <WatchlistPanel
              watchlist={watchlist}
              summary={focusSummary}
              onRequestNotifications={requestNotifications}
              t={t}
            />

            <div style={panelBox}>
              <div style={panelHeader}>
                <div style={panelTitle}>
                  {leaderTeamAbbr ? `${leaderTeamAbbr} · PLAYER STATS` : 'PLAYER STATS'}
                </div>
                <div style={panelMeta}>
                  {favMeta ? (
                    <span style={{ color: C.green }}>● {favMeta.abbr} FOCUSED</span>
                  ) : (
                    <span style={{ color: C.dim }}>PICK A TEAM ↗</span>
                  )}
                </div>
              </div>
              <div>
                {teamLeaders.length === 0 && (
                  <div style={{ padding: 20, fontSize: 10.5, color: C.dim, textAlign: 'center', lineHeight: 1.5 }}>
                    {leaderTeamAbbr ? (
                      <>Loading {leaderTeamAbbr} leaders…<br /><span style={{ fontSize: 9.5 }}>ESPN · updates every 15 min</span></>
                    ) : (
                      <>Pick a team in the top bar to see their player stats.</>
                    )}
                  </div>
                )}
                {teamLeaders.slice(0, 5).map((cat) => {
                  const top = cat.athletes?.[0];
                  if (!top) return null;
                  const href = top.id ? `https://www.espn.com/nba/player/_/id/${top.id}` : null;
                  const player = { id: top.id, name: top.name, position: top.position, teamAbbr: leaderTeamAbbr };
                  return (
                    <div
                      key={cat.category}
                      className="link-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '64px 28px 1fr 14px auto',
                        gap: 8,
                        padding: '7px 12px',
                        borderBottom: `1px solid ${C.lineSoft}`,
                        fontSize: 11,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ color: C.dim, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {cat.displayName || cat.category}
                      </div>
                      <PlayerHead id={top.id} name={top.name} color={favMeta?.color || '#2a3a52'} size={26} />
                      <a
                        href={href || '#'}
                        target={href ? '_blank' : undefined}
                        rel={href ? 'noopener noreferrer' : undefined}
                        style={{
                          textDecoration: 'none', color: 'inherit',
                          display: 'flex', flexDirection: 'column', minWidth: 0,
                        }}
                      >
                        <span style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {top.name}
                          {href && <span style={{ color: C.muted, marginLeft: 6, fontSize: 9 }}>↗</span>}
                        </span>
                        {top.position && <span style={{ fontSize: 9, color: C.muted }}>{top.position}{top.jersey ? ` · #${top.jersey}` : ''}</span>}
                      </a>
                      <WatchStar player={player} watchlist={watchlist} size={12} />
                      <div style={{ color: accentBright, fontFamily: '"Space Grotesk", sans-serif', fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
                        {top.displayValue || (top.value != null ? top.value.toFixed(1) : '—')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {favMeta && (
              <div style={{ padding: '12px 16px', background: `linear-gradient(180deg, ${favMeta.color}40 0%, ${favMeta.color}12 100%)`, borderTop: `1px solid ${accent}` }}>
                <div style={{ fontSize: 9.5, color: C.dim, letterSpacing: 1, marginBottom: 4 }}>FULL ROSTER</div>
                <a
                  href={`https://www.espn.com/nba/team/roster/_/name/${favMeta.abbr.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.text, fontSize: 11, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  espn.com/{favMeta.abbr.toLowerCase()}/roster <span style={{ color: C.muted }}>↗</span>
                </a>
                <div style={{ fontSize: 9.5, color: C.dim, marginTop: 6 }}>
                  Stats update as the {favTeam.split(' ').slice(-1)[0]} advance through the playoffs.
                </div>
              </div>
            )}
          </div>

          {/* COL 4: Tonight + Stories + Status */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.line}`, background: favMeta ? `linear-gradient(180deg, ${favMeta.color}30 0%, ${C.panel} 100%)` : `linear-gradient(180deg, ${C.panel2} 0%, ${C.panel} 100%)` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{t('tonightPlayIn')}</div>
                  <div style={{ fontSize: 9.5, color: C.dim }}>{lang === 'id' ? 'Prime Video · Pemenang dapat seed 8' : 'Prime Video · Winners take 8-seed'}</div>
                </div>
                <div style={{ fontSize: 9.5, color: C.dim, textAlign: 'right' }}>CONFERENCE<br />FINALE</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 20, marginTop: 10 }}>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 52, lineHeight: 1, color: C.text, letterSpacing: -1 }}>2<span style={{ fontSize: 24, color: accent, verticalAlign: 'top' }}>GMS</span></div>
                <div style={{ textAlign: 'right', fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>
                    {formatKickoff('2026-04-17T23:30:00Z', lang).replace(/\s/, ' ').split(' ').slice(0, -1).join(' ')}{' '}
                    <span style={{ color: accent }}>{getUserTzLabel()}</span>
                  </div>
                  <div>ORL vs CHA (E)</div>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginTop: 6 }}>
                    {formatKickoff('2026-04-18T02:00:00Z', lang).replace(/\s/, ' ').split(' ').slice(0, -1).join(' ')}{' '}
                    <span style={{ color: accent }}>{getUserTzLabel()}</span>
                  </div>
                  <div>PHX vs GSW (W)</div>
                </div>
              </div>
              <div style={{ fontSize: 9.5, color: C.dim, marginTop: 8, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 8 }}>
                {lang === 'id'
                  ? <>Pemenang hadapi <strong style={{ color: C.text }}>Pistons</strong> (E1) dan <strong style={{ color: C.text }}>Thunder</strong> (W1) hari Minggu.</>
                  : <>Winners face <strong style={{ color: C.text }}>Pistons</strong> (E1) and <strong style={{ color: C.text }}>Thunder</strong> (W1) Sunday.</>}
              </div>
            </div>

            <div style={panelBox}>
              <div style={panelHeader}>
                <div style={panelTitle}>{t('playoffStories')}</div>
                <div style={panelMeta}>PREVIEW · ANALYSIS</div>
              </div>
              {(favMeta ? [
                { title: `${favTeam} playoff preview: schedule, storylines, X-factors`, src: 'ESPN', age: '1h', url: `https://www.espn.com/nba/team/_/name/${favMeta.abbr.toLowerCase()}` },
                { title: `${favMeta.star} carries ${favTeam.split(' ').slice(-1)[0]} into the postseason`, src: 'The Athletic', age: '3h', url: `https://www.nytimes.com/athletic/nba/team/${favTeam.toLowerCase().split(' ').slice(-1)[0]}/` },
                { title: `${favMeta.abbr} injury report, depth chart, and rotation outlook`, src: 'CBS Sports', age: '5h', url: `https://www.cbssports.com/nba/teams/${favMeta.abbr}/` },
                { title: `${favTeam.split(' ').slice(-1)[0]} playoff odds: championship path and series forecasts`, src: 'NBA.com', age: '6h', url: `https://www.nba.com/team/${favMeta.abbr.toLowerCase()}` },
              ] : [
                { title: 'Thunder enter playoffs as consensus favorite after 64–18 season', src: 'ESPN', age: '2h', url: 'https://www.espn.com/nba/team/_/name/okc/oklahoma-city-thunder' },
                { title: 'Pistons clinch East No. 1 seed in historic resurgence', src: 'The Athletic', age: '4h', url: 'https://www.nytimes.com/athletic/nba/team/pistons/' },
                { title: 'LeBron-KD renewed: first playoff clash since 2018 Finals', src: 'CBS Sports', age: '5h', url: 'https://www.cbssports.com/nba/' },
                { title: "Wembanyama's first playoff test vs Portland", src: 'NBA.com', age: '6h', url: 'https://www.nba.com/news' },
              ]).map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-row"
                  style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, padding: '10px 12px', borderBottom: `1px solid ${C.lineSoft}`, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ aspectRatio: '1.4', background: C.panel, border: `1px solid ${C.lineSoft}`, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 55%, #d4601e 0%, #8c3a10 70%)' }} />
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.4)' }} />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(0,0,0,0.4)' }} />
                  </div>
                  <div style={{ fontSize: 10.5, lineHeight: 1.35 }}>
                    <div>{s.title}</div>
                    <div style={{ color: C.dim, fontSize: 9.5, marginTop: 3 }}><span style={{ color: accent }}>{s.src}</span> · {s.age} <span style={{ color: C.muted }}>↗</span></div>
                  </div>
                </a>
              ))}
            </div>

            <div style={{ padding: '10px 16px', fontSize: 9.5, color: C.muted, letterSpacing: 0.3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>Scores · <span style={{ color: errors.scores ? C.red : C.green }}>{errors.scores ? 'cached' : 'ESPN live'}</span></span>
                {leaderTeamAbbr && <span>Players · <span style={{ color: C.green }}>ESPN {leaderTeamAbbr}</span></span>}
                <span>Odds · <span style={{ color: errors.champion ? C.red : C.green }}>{errors.champion ? 'cached' : 'Polymarket'}</span></span>
              </div>
              <div>Poll 30s · WS {wsStatus} · last {lastUpdate?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '—'}</div>
            </div>
          </div>
        </div>

        {/* ================== TICKER ================== */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', borderTop: `1px solid ${C.line}`, background: C.panelSoft }}>
          <div style={{ background: C.nbaRed, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>NEWS</div>
          <div style={{ overflow: 'hidden', padding: '9px 0' }}>
            <div className="ticker-inner">
              {[
                `Thunder ${topChamp.pct}% title favorite · Polymarket ${fmtVol(champion.volume)} volume`,
                `Round 1 tips Apr 18 · 8 best-of-7 series to start the bracket`,
                'Play-In finale tonight: ORL-CHA and PHX-GSW on Prime',
                'Pistons earn East No. 1 seed for first time since 2007–08',
                'LeBron-Durant headline Lakers-Rockets, first since 2018 Finals',
                'NBA Finals tip off June 3 on ABC',
              ].map((text, i) => (
                <span key={i} style={{ display: 'inline-block', padding: '0 28px', fontSize: 11, color: C.text }}>
                  <span style={{ color: accent, marginRight: 6 }}>●</span>{text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ================== FANGIR PARTNER BANNER ================== */}
        <FangirBanner />

        {/* ================== SEO CONTENT (crawlable Bahasa + EN prose + FAQ) ================== */}
        <SEOContent lang={lang} />

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderTop: `1px solid ${C.line}`, fontSize: 9.5, color: C.muted, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>Polymarket Gamma + CLOB WS · ESPN Scoreboard · 30s poll + live ticks</div>
          <ContactBar lang={lang} variant="inline" />
          <div style={{ color: C.dim }}>ESPN · Polymarket · Built by Claude</div>
        </div>
      </div>
    </div>
  );
}
