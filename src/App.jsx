import React, { useState, useEffect, useMemo } from 'react';
import { usePlayoffData } from './hooks/usePlayoffData.js';
import { usePolymarketWS } from './hooks/usePolymarketWS.js';
import { TEAM_META, COLORS as C } from './lib/constants.js';
import Sparkline from './components/Sparkline.jsx';
import Bracket from './components/Bracket.jsx';

export default function App() {
  const { champion, mvp, games, sparklines, lastUpdate, status, errors } = usePlayoffData(30000);
  const [now, setNow] = useState(new Date());

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
        <div className="topbar" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.line}`, background: 'linear-gradient(180deg, #0d1c33 0%, #0a1628 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #e8502e 0%, #8c1a1a 100%)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.4)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(0,0,0,0.4)' }} />
            </div>
            <div>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 14 }}>Monitoring the Playoffs</div>
              <div style={{ fontSize: 10.5, color: C.dim, letterSpacing: 0.5 }}>NBA <strong style={{ color: C.amber }}>•</strong> 2025–26 POSTSEASON <strong style={{ color: C.amber }}>•</strong> LIVE</div>
            </div>
          </div>
          <div className="topbar-meta" style={{ display: 'flex', gap: 20, justifyContent: 'flex-end', fontSize: 10.5, color: C.dim, alignItems: 'center' }}>
            <span><span className="live-dot" style={{ background: statusColor }} /> {statusLabel}</span>
            <span style={{ color: wsStatus === 'live' ? C.green : C.muted }}>
              WS · {wsStatus.toUpperCase()}
            </span>
            <span style={{ color: C.amber }}>▲ {(TEAM_META[topChamp.name]?.abbr || 'OKC')} {topChamp.pct}%</span>
            <span style={{ color: C.amberBright, fontWeight: 600, fontSize: 12 }}>
              {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'America/New_York' })} ET
            </span>
            <span>{now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
          <div style={{ fontSize: 10, color: C.dim }}>
            {lastUpdate ? `refresh ${Math.round((now - lastUpdate) / 1000)}s ago` : 'connecting...'}
          </div>
        </div>

        {/* ================== STAT STRIP ================== */}
        <div className="stat-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: `1px solid ${C.line}`, background: '#0a1525' }}>
          {[
            { label: 'TV RIGHTS DEAL', value: '$76.0B', sub: '11-yr Disney/NBC/Amazon' },
            { label: 'CHAMP POLY VOL', value: fmtVol(champion.volume), sub: `24H ${fmtVol(champion.volume24h)}` },
            { label: 'FAVORITE', value: `${TEAM_META[topChamp.name]?.abbr || 'OKC'} ${topChamp.pct}%`, sub: topChamp.name.split(' ').slice(-1)[0] },
            { label: 'MVP LOCK', value: `${topMvp.name.split(' ').map((x) => x[0]).join('')} ${topMvp.pct}%`, sub: topMvp.name },
            { label: 'FINALS TIP-OFF', value: 'JUN 3', sub: 'ABC · Best-of-7' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRight: `1px solid ${C.lineSoft}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 9.5, color: C.dim, letterSpacing: 0.8, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 600, color: C.amberBright, letterSpacing: -0.3 }}>{s.value}</div>
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
                <Bracket championOdds={liveOdds} />
              </div>
            </div>

            <div style={{ ...panelBox, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: '#091524', fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 }}>
                <span>⚡ KEY ACCOUNTS</span>
                <span style={{ color: C.amber, letterSpacing: 0.5, fontSize: 9.5, fontWeight: 500 }}>#NBAPLAYOFFS</span>
              </div>
              {[
                { handle: '@NBA', age: '1h', text: 'Play-In Finale tonight on Prime — 8-seeds on the line in both conferences.' },
                { handle: '@espn', age: '2h', text: 'Pistons earn No. 1 seed in the East — first time since 2007–08.' },
                { handle: '@BleacherReport', age: '3h', text: 'LeBron vs KD in the playoffs for the first time since 2018 Finals.' },
                { handle: '@PolymarketSport', age: '5h', text: `${TEAM_META[topChamp.name]?.abbr || 'OKC'} champ odds at ${topChamp.pct}%, volume tops ${fmtVol(champion.volume)}.` },
              ].map((a, i) => (
                <div key={i} style={{ padding: '8px 12px', borderBottom: `1px solid ${C.lineSoft}`, fontSize: 10.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.text, display: 'flex', gap: 6, alignItems: 'center' }}>{a.handle} <span style={{ color: C.amber }}>✓</span></span>
                    <span style={{ color: C.dim, fontSize: 9.5 }}>{a.age}</span>
                  </div>
                  <div style={{ color: C.dim, marginTop: 3, lineHeight: 1.35 }}>{a.text}</div>
                </div>
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
                    <div key={team.name} className="lb-row" style={{ display: 'grid', gridTemplateColumns: '22px 1fr 70px 52px 36px', gap: 4, padding: '5px 12px', fontSize: 11, alignItems: 'center', borderBottom: `1px solid ${C.lineSoft}`, transition: 'background 0.15s' }}>
                      <div style={{ color: C.dim }}>{i + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, background: meta.color, fontSize: 8.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{meta.abbr}</div>
                        <span>{team.name.split(' ').slice(-1)[0]}</span>
                        {team.isLive && <span style={{ fontSize: 7, color: C.green }}>●</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Sparkline data={spark} />
                      </div>
                      <div style={{ textAlign: 'right', color: C.amberBright, fontWeight: 600 }}>{team.pct}%</div>
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

          {/* COL 3: Live Games + MVP */}
          <div style={{ borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column' }}>
            <div style={panelBox}>
              <div style={panelHeader}>
                <div style={panelTitle}>TODAY'S GAMES</div>
                <div style={panelMeta}>{errors.scores ? <span style={{ color: C.red }}>● ESPN OFF</span> : <span style={{ color: C.green }}>● ESPN LIVE</span>}</div>
              </div>
              <div>
                {games.length === 0 && (
                  <div style={{ padding: 16, fontSize: 10.5, color: C.dim, textAlign: 'center' }}>
                    {errors.scores ? 'ESPN unreachable — showing schedule' : 'Loading…'}
                  </div>
                )}
                {games.length === 0 && [
                  { name: 'ORL @ CHA', status: 'Fri 7:30 PM ET' },
                  { name: 'PHX @ GSW', status: 'Fri 10:00 PM ET' },
                ].map((g, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 12px', borderBottom: `1px solid ${C.lineSoft}`, fontSize: 11 }}>
                    <div style={{ color: C.text }}>{g.name}</div>
                    <div style={{ color: C.amber, fontSize: 10 }}>{g.status}</div>
                  </div>
                ))}
                {games.slice(0, 6).map((g, i) => (
                  <div key={g.id || i} style={{ padding: '8px 12px', borderBottom: `1px solid ${C.lineSoft}`, fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>{g.away.abbr}</span>{g.away.score && <span style={{ color: C.amberBright, fontWeight: 600 }}>{g.away.score}</span>}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>{g.home.abbr}</span>{g.home.score && <span style={{ color: C.amberBright, fontWeight: 600 }}>{g.home.score}</span>}</div>
                      </div>
                      <div style={{ fontSize: 10, color: g.statusState === 'in' ? C.green : g.statusState === 'post' ? C.dim : C.amber, textAlign: 'right' }}>
                        {g.statusState === 'in' && <span className="live-dot" style={{ background: C.red }} />}
                        {g.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={panelBox}>
              <div style={panelHeader}>
                <div style={panelTitle}>MVP RACE</div>
                <div style={panelMeta}>{errors.mvp ? <span style={{ color: C.red }}>● CACHED</span> : <span style={{ color: C.green }}>● LIVE</span>}</div>
              </div>
              <div>
                {mvp.slice(0, 5).map((p, i) => (
                  <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, fontSize: 11 }}>
                    <div style={{ color: C.dim }}>{i + 1}</div>
                    <div>{p.name}</div>
                    <div style={{ color: C.amberBright, fontWeight: 600 }}>{p.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 16, background: 'linear-gradient(180deg, #10243c 0%, #0a1a30 100%)', borderTop: `1px solid ${C.amber}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: C.dim, letterSpacing: 1, marginBottom: 8 }}>
                <span style={{ color: C.amber }}>MVP FRONTRUNNER</span>
                <span style={{ color: C.text, fontWeight: 600 }}>LOCKED</span>
              </div>
              <div style={{ display: 'inline-block', padding: '3px 10px', background: C.amber, color: '#000', fontSize: 9.5, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{topMvp.pct}% POLYMARKET</div>
              <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 32, lineHeight: 1, color: C.text, marginTop: 6, marginBottom: 4 }}>{topMvp.name}</div>
              <div style={{ color: C.dim, fontSize: 10.5 }}>Back-to-back MVP frontrunner · Resolves Jun 10</div>
            </div>
          </div>

          {/* COL 4: Tonight + Stories + Status */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.line}`, background: 'linear-gradient(180deg, #0d1f36 0%, #0a1729 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>TONIGHT · PLAY-IN FINALE</div>
                  <div style={{ fontSize: 9.5, color: C.dim }}>Prime Video · Winners take 8-seed</div>
                </div>
                <div style={{ fontSize: 9.5, color: C.dim, textAlign: 'right' }}>CONFERENCE<br />FINALE</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 20, marginTop: 10 }}>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 52, lineHeight: 1, color: C.text, letterSpacing: -1 }}>2<span style={{ fontSize: 24, color: C.amber, verticalAlign: 'top' }}>GMS</span></div>
                <div style={{ textAlign: 'right', fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>7:30 <span style={{ color: C.amber }}>ET</span></div>
                  <div>ORL vs CHA (E)</div>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginTop: 6 }}>10:00 <span style={{ color: C.amber }}>ET</span></div>
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
              {[
                { title: 'Thunder enter playoffs as consensus favorite after 64–18 season', src: 'ESPN', age: '2h' },
                { title: 'Pistons clinch East No. 1 seed in historic resurgence', src: 'The Athletic', age: '4h' },
                { title: 'LeBron-KD renewed: first playoff clash since 2018 Finals', src: 'CBS Sports', age: '5h' },
                { title: "Wembanyama's first playoff test vs Portland", src: 'NBA.com', age: '6h' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, padding: '10px 12px', borderBottom: `1px solid ${C.lineSoft}`, alignItems: 'center' }}>
                  <div style={{ aspectRatio: '1.4', background: '#0a1a2e', border: `1px solid ${C.lineSoft}`, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 55%, #d4601e 0%, #8c3a10 70%)' }} />
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.4)' }} />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(0,0,0,0.4)' }} />
                  </div>
                  <div style={{ fontSize: 10.5, lineHeight: 1.35 }}>
                    <div>{s.title}</div>
                    <div style={{ color: C.dim, fontSize: 9.5, marginTop: 3 }}><span style={{ color: C.amber }}>{s.src}</span> · {s.age}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 16px', fontSize: 10, color: C.dim, lineHeight: 1.5 }}>
              <div style={{ color: C.amber, letterSpacing: 1, fontSize: 9.5, marginBottom: 6 }}>DATA STATUS</div>
              <div>Champion: {errors.champion ? <span style={{ color: C.red }}>fallback</span> : <span style={{ color: C.green }}>live poll + {wsStatus === 'live' ? 'WS ticks' : 'polling only'}</span>}</div>
              <div>MVP: {errors.mvp ? <span style={{ color: C.red }}>fallback</span> : <span style={{ color: C.green }}>live (Gamma)</span>}</div>
              <div>Scores: {errors.scores ? <span style={{ color: C.red }}>fallback</span> : <span style={{ color: C.green }}>live (ESPN)</span>}</div>
              <div style={{ marginTop: 6, color: C.muted }}>Poll: 30s · WS: {wsStatus} · Last: {lastUpdate?.toLocaleTimeString('en-US', { hour12: false }) || '—'}</div>
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
                  <span style={{ color: C.amber, marginRight: 6 }}>●</span>{text}
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
