import React, { useState, useEffect, useMemo } from 'react';
import { usePlayoffData } from './hooks/usePlayoffData.js';
import { usePolymarketWS } from './hooks/usePolymarketWS.js';
import { TEAM_META, COLORS as C } from './lib/constants.js';
import Sparkline from './components/Sparkline.jsx';
import Bracket from './components/Bracket.jsx';
import TeamPicker from './components/TeamPicker.jsx';
import LiveGameFocus from './components/LiveGameFocus.jsx';
import { useSeriesState } from './hooks/useSeriesState.js';

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

function GameCard({ g, favTeam, isActive, onClick }) {
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

  const Row = ({ abbr, nickname, meta, score, won, record }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 3, background: meta.color, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {abbr || '—'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 12, color: won ? C.text : hasScore && !won ? C.muted : C.text, fontWeight: won ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nickname}</span>
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
      onMouseEnter={(e) => { if (onClick && !isActive) e.currentTarget.style.background = '#0d1d34'; }}
      onMouseLeave={(e) => { if (onClick && !isActive) e.currentTarget.style.background = favInGame ? `${favColor}14` : 'transparent'; }}
    >
      {isActive && (
        <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 8, letterSpacing: 0.5, color: C.amber, fontWeight: 600 }}>● FOLLOWING</div>
      )}
      <Row abbr={g.away?.abbr} nickname={awayNickname} meta={awayMeta} score={awayScore} won={awayWon} record={g.away?.record} />
      <Row abbr={g.home?.abbr} nickname={homeNickname} meta={homeMeta} score={homeScore} won={homeWon} record={g.home?.record} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 10, paddingTop: 6, borderTop: `1px solid ${C.lineSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isLive ? C.green : isFinal ? C.dim : '#ffb347' }}>
          {isLive && <span className="live-dot" style={{ background: C.red }} />}
          <span style={{ letterSpacing: 0.3 }}>{g.status || (isLive ? 'LIVE' : isFinal ? 'FINAL' : 'UPCOMING')}</span>
        </div>
        {favInGame && (
          <span style={{ fontSize: 9, letterSpacing: 0.5, color: favColor, fontWeight: 600 }}>★ YOUR TEAM</span>
        )}
      </div>
    </div>
  );
}

export default function App() {
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
  }

  // Active match to follow (live game focus)
  const [activeMatchId, setActiveMatchId] = useState(null);
  // Auto-select the first live game, falling back to the first upcoming game
  useEffect(() => {
    if (activeMatchId) return;
    const live = games.find((g) => g.statusState === 'in');
    if (live) { setActiveMatchId(live.id); return; }
    // Else: if user's team is playing today, pick that
    if (favMeta) {
      const favAbbr = favMeta.abbr;
      const favGame = games.find((g) => g.away?.abbr === favAbbr || g.home?.abbr === favAbbr);
      if (favGame) setActiveMatchId(favGame.id);
    }
  }, [games, activeMatchId, favMeta]);

  // Series standings for bracket watermark
  const { seriesMap } = useSeriesState('2026-04-18', '2026-05-03');

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
  const topMvp = mvp[0] || { name: 'Shai Gilgeous-Alexander', pct: 95 };
  const secondMvp = mvp[1] || { name: 'Victor Wembanyama', pct: 3 };
  const fmtVol = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(0)}K`);

  const panelBox = { borderBottom: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column' };
  const panelHeader = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: '#0a1728',
  };
  const panelTitle = { fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 };
  const panelMeta = { fontSize: 9.5, color: C.dim, letterSpacing: 0.5 };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', overflowX: 'auto', fontFamily: '"JetBrains Mono", monospace', color: C.text, fontSize: 11.5, lineHeight: 1.4 }}>
      <div className="dashboard-wrap">

        {/* ================== TOP BAR ================== */}
        <div className="topbar" style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: 18, alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.line}`, background: 'linear-gradient(180deg, #0d1c33 0%, #0a1628 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #e8502e 0%, #8c1a1a 100%)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.4)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(0,0,0,0.4)' }} />
            </div>
            <div>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 14 }}>Monitoring the Playoffs</div>
              <div style={{ fontSize: 10.5, color: C.dim, letterSpacing: 0.5 }}>NBA <strong style={{ color: accent }}>•</strong> 2025–26 POSTSEASON <strong style={{ color: accent }}>•</strong> LIVE</div>
            </div>
          </div>
          <TeamPicker selectedTeam={favTeam} onSelect={setFav} />
          <div className="topbar-meta" style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', fontSize: 10.5, color: C.dim, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="live-dot" style={{ background: statusColor }} /> {statusLabel}</span>
            <span style={{ color: accentBright, fontWeight: 600, fontSize: 13, fontFamily: '"Space Grotesk", sans-serif' }}>
              {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })} ET
            </span>
            <span>{now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
          <div style={{ fontSize: 10, color: C.dim, textAlign: 'right' }}>
            {lastUpdate ? `refresh ${Math.round((now - lastUpdate) / 1000)}s ago` : 'connecting...'}
          </div>
        </div>

        {/* ================== LIVE SCOREBOARD HERO ================== */}
        <div className="scoreboard-hero" style={{ borderBottom: `1px solid ${C.line}`, background: 'linear-gradient(180deg, #0b1a30 0%, #0a1525 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid ${C.lineSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 }}>LIVE SCOREBOARD</span>
              <span style={{ fontSize: 9.5, color: C.dim }}>{games.length > 0 ? `${games.length} GAMES` : 'TODAY'}</span>
            </div>
            <div style={{ fontSize: 9.5, color: C.dim, letterSpacing: 0.5 }}>
              {errors.scores ? <span style={{ color: C.red }}>● ESPN OFF · SHOWING SCHEDULE</span> : <span style={{ color: C.green }}>● ESPN LIVE</span>}
            </div>
          </div>
          <div className="game-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0 }}>
            {games.length === 0 && [
              { id: 'sched-1', name: 'ORL @ CHA', away: { abbr: 'ORL', score: null }, home: { abbr: 'CHA', score: null }, status: 'FRI 7:30 PM ET', statusState: 'pre' },
              { id: 'sched-2', name: 'PHX @ GSW', away: { abbr: 'PHX', score: null }, home: { abbr: 'GSW', score: null }, status: 'FRI 10:00 PM ET', statusState: 'pre' },
            ].map((g) => <GameCard key={g.id} g={g} favTeam={favTeam} isActive={activeMatchId === g.id} onClick={() => setActiveMatchId(g.id)} />)}
            {games.slice(0, 6).map((g, i) => (
              <GameCard
                key={g.id || i}
                g={g}
                favTeam={favTeam}
                isActive={activeMatchId === g.id}
                onClick={() => setActiveMatchId(g.id)}
              />
            ))}
          </div>
        </div>

        {/* ================== LIVE GAME FOCUS ================== */}
        <LiveGameFocus
          eventId={activeMatchId && !String(activeMatchId).startsWith('sched-') ? activeMatchId : null}
          favTeam={favTeam}
          accent={accent}
          onClose={() => setActiveMatchId(null)}
        />

        {/* ================== CONTEXT STRIP (odds demoted) ================== */}
        <div className="stat-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${C.line}`, background: '#091422' }}>
          {[
            { label: 'MVP LOCK', value: `${topMvp.name.split(' ').map((x) => x[0]).join('')} ${topMvp.pct}%`, sub: topMvp.name.split(' ').slice(-1)[0] },
            { label: 'TITLE FAVORITE', value: `${TEAM_META[topChamp.name]?.abbr || 'OKC'} ${topChamp.pct}%`, sub: topChamp.name.split(' ').slice(-1)[0] },
            { label: 'FINALS TIP-OFF', value: 'JUN 3', sub: 'ABC · Best-of-7' },
            { label: 'NEXT TIP', value: games[0]?.status || '7:30 ET', sub: games[0] ? `${games[0].away.abbr} @ ${games[0].home.abbr}` : 'ORL @ CHA' },
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
                <div style={panelTitle}>ROUND 1 BRACKET</div>
                <div style={panelMeta}>APR 18 – MAY 3</div>
              </div>
              <div className="bracket-viz">
                <Bracket championOdds={liveOdds} seriesMap={seriesMap} />
              </div>
            </div>

            <div style={{ ...panelBox, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: '#091524', fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 }}>
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
                <div style={panelTitle}>TITLE ODDS</div>
                <div style={panelMeta}>
                  {errors.champion ? <span style={{ color: C.red }}>● CACHED</span> : <span style={{ color: C.green }}>● POLYMARKET</span>}
                  {wsStatus === 'live' && <span style={{ color: C.green, marginLeft: 6 }}>· WS TICK</span>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 70px 52px 36px', gap: 4, padding: '5px 12px', fontSize: 9, color: C.dim, letterSpacing: 1, borderBottom: `1px solid ${C.lineSoft}`, background: '#091524' }}>
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
                <div style={panelTitle}>FEATURED SERIES</div>
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
          </div>

          {/* COL 3: MVP */}
          <div style={{ borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column' }}>
            <div style={panelBox}>
              <div style={panelHeader}>
                <div style={panelTitle}>MVP RACE</div>
                <div style={panelMeta}>{errors.mvp ? <span style={{ color: C.red }}>● CACHED</span> : <span style={{ color: C.green }}>● LIVE</span>}</div>
              </div>
              <div>
                {mvp.slice(0, 5).map((p, i) => {
                  const isFavStar = favMeta && p.name === favMeta.star;
                  return (
                    <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: isFavStar ? `${favMeta.color}22` : 'transparent', borderLeft: isFavStar ? `2px solid ${favMeta.color}` : '2px solid transparent', fontSize: 11 }}>
                      <div style={{ color: C.dim }}>{i + 1}</div>
                      <div>{p.name}{isFavStar && <span style={{ color: accentBright, marginLeft: 6, fontSize: 9 }}>★ YOUR TEAM</span>}</div>
                      <div style={{ color: isFavStar ? accentBright : C.amberBright, fontWeight: 600 }}>{p.pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: 16, background: favMeta ? `linear-gradient(180deg, ${favMeta.color}40 0%, ${favMeta.color}15 100%)` : 'linear-gradient(180deg, #10243c 0%, #0a1a30 100%)', borderTop: `1px solid ${accent}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: C.dim, letterSpacing: 1, marginBottom: 8 }}>
                <span style={{ color: accentBright }}>{favMeta ? `${favMeta.abbr} · KEY MAN` : 'MVP FRONTRUNNER'}</span>
                <span style={{ color: C.text, fontWeight: 600 }}>LOCKED</span>
              </div>
              <div style={{ display: 'inline-block', padding: '3px 10px', background: accent, color: favMeta ? '#fff' : '#000', fontSize: 9.5, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
                {favMeta ? `${favMeta.abbr} STAR` : `${topMvp.pct}% POLYMARKET`}
              </div>
              <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 32, lineHeight: 1, color: C.text, marginTop: 6, marginBottom: 4 }}>{favMeta ? favMeta.star : topMvp.name}</div>
              <div style={{ color: C.dim, fontSize: 10.5 }}>
                {favMeta ? `Leading the ${favTeam.split(' ').slice(-1)[0]} into the ${favMeta.conf === 'E' ? 'East' : 'West'} playoffs` : 'Back-to-back MVP frontrunner · Resolves Jun 10'}
              </div>
            </div>
          </div>

          {/* COL 4: Tonight + Stories + Status */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.line}`, background: favMeta ? `linear-gradient(180deg, ${favMeta.color}30 0%, #0a1729 100%)` : 'linear-gradient(180deg, #0d1f36 0%, #0a1729 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>TONIGHT · PLAY-IN FINALE</div>
                  <div style={{ fontSize: 9.5, color: C.dim }}>Prime Video · Winners take 8-seed</div>
                </div>
                <div style={{ fontSize: 9.5, color: C.dim, textAlign: 'right' }}>CONFERENCE<br />FINALE</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 20, marginTop: 10 }}>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 52, lineHeight: 1, color: C.text, letterSpacing: -1 }}>2<span style={{ fontSize: 24, color: accent, verticalAlign: 'top' }}>GMS</span></div>
                <div style={{ textAlign: 'right', fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>7:30 <span style={{ color: accent }}>ET</span></div>
                  <div>ORL vs CHA (E)</div>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginTop: 6 }}>10:00 <span style={{ color: accent }}>ET</span></div>
                  <div>PHX vs GSW (W)</div>
                </div>
              </div>
              <div style={{ fontSize: 9.5, color: C.dim, marginTop: 8, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 8 }}>
                Winners face <strong style={{ color: C.text }}>Pistons</strong> (E1) and <strong style={{ color: C.text }}>Thunder</strong> (W1) Sunday.
              </div>
            </div>

            <div style={panelBox}>
              <div style={panelHeader}>
                <div style={panelTitle}>PLAYOFF STORIES</div>
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
                  <div style={{ aspectRatio: '1.4', background: '#0a1a2e', border: `1px solid ${C.lineSoft}`, position: 'relative' }}>
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
                <span>MVP · <span style={{ color: errors.mvp ? C.red : C.green }}>{errors.mvp ? 'cached' : 'Polymarket'}</span></span>
                <span>Odds · <span style={{ color: errors.champion ? C.red : C.green }}>{errors.champion ? 'cached' : 'Polymarket'}</span></span>
              </div>
              <div>Poll 30s · WS {wsStatus} · last {lastUpdate?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '—'}</div>
            </div>
          </div>
        </div>

        {/* ================== TICKER ================== */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', borderTop: `1px solid ${C.line}`, background: '#091524' }}>
          <div style={{ background: C.nbaRed, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>NEWS</div>
          <div style={{ overflow: 'hidden', padding: '9px 0' }}>
            <div className="ticker-inner">
              {[
                `Thunder ${topChamp.pct}% title favorite · Polymarket ${fmtVol(champion.volume)} volume`,
                `${topMvp.name} MVP ${topMvp.pct}% · ${secondMvp.name} ${secondMvp.pct}%`,
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

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderTop: `1px solid ${C.line}`, fontSize: 9.5, color: C.muted }}>
          <div>Polymarket Gamma + CLOB WS · ESPN Scoreboard · 30s poll + live ticks</div>
          <div style={{ color: C.dim }}>ESPN · Polymarket · Built by Claude</div>
        </div>
      </div>
    </div>
  );
}
