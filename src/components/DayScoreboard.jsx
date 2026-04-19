import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '../lib/AppContext.jsx';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import { formatKickoff, getUserTzLabel } from '../lib/timezone.js';

// ---- date helpers (locale-aware via Intl) -----------------------------------

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function buildWindow(pastDays = 3, futureDays = 3, anchor = new Date()) {
  const dates = [];
  const a = new Date(anchor);
  a.setHours(0, 0, 0, 0);
  for (let i = -pastDays; i <= futureDays; i++) {
    const d = new Date(a);
    d.setDate(a.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function diffDays(a, b) {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((aa - bb) / 86400000);
}

// Locale-aware short weekday + date, using Intl. No hardcoded Indonesian.
function intlShort(date, lang) {
  const loc = lang === 'id' ? 'id-ID' : 'en-US';
  const wd = new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(date);
  const md = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' }).format(date);
  return { wd: wd.toUpperCase().replace('.', ''), md };
}

// ---- game card --------------------------------------------------------------

function GameCard({ g, lang }) {
  const awayMeta = TEAM_META[Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === g.away?.abbr)] || { color: '#2a3a52' };
  const homeMeta = TEAM_META[Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === g.home?.abbr)] || { color: '#2a3a52' };
  const isLive = g.statusState === 'in';
  const isFinal = g.statusState === 'post';
  const awayScore = g.away?.score;
  const homeScore = g.home?.score;
  const hasScore = awayScore !== null && awayScore !== undefined && awayScore !== '';
  const awayWon = hasScore && parseInt(awayScore) > parseInt(homeScore);
  const homeWon = hasScore && parseInt(homeScore) > parseInt(awayScore);
  const tip = !isFinal && g.date ? formatKickoff(g.date, lang) : null;

  return (
    <div
      style={{
        padding: '10px 14px',
        borderRight: `1px solid ${C.lineSoft}`,
        borderBottom: `1px solid ${C.lineSoft}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
        background: C.panelRow,
      }}
    >
      {/* Away */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 22, height: 22, borderRadius: 3,
              background: awayMeta.color, color: '#fff',
              fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {g.away?.abbr || '—'}
          </div>
          <span style={{ fontSize: 12, color: awayWon ? C.text : hasScore && !awayWon ? C.muted : C.text, fontWeight: awayWon ? 600 : 400 }}>
            {g.away?.abbr || '—'}
          </span>
        </div>
        {hasScore && (
          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 600, color: awayWon ? C.amberBright : C.text, letterSpacing: -0.3 }}>
            {awayScore}
          </span>
        )}
      </div>
      {/* Home */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 22, height: 22, borderRadius: 3,
              background: homeMeta.color, color: '#fff',
              fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {g.home?.abbr || '—'}
          </div>
          <span style={{ fontSize: 12, color: homeWon ? C.text : hasScore && !homeWon ? C.muted : C.text, fontWeight: homeWon ? 600 : 400 }}>
            {g.home?.abbr || '—'}
          </span>
        </div>
        {hasScore && (
          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 600, color: homeWon ? C.amberBright : C.text, letterSpacing: -0.3 }}>
            {homeScore}
          </span>
        )}
      </div>
      {/* Status */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
          fontSize: 10, paddingTop: 2,
          borderTop: `1px solid ${C.lineSoft}`, marginTop: 2,
          color: isLive ? C.green : isFinal ? C.dim : C.amber,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, letterSpacing: 0.3 }}>
          {isLive && <span className="live-dot" style={{ background: C.red }} />}
          {g.status || (isLive ? 'LIVE' : isFinal ? 'FINAL' : 'UPCOMING')}
        </span>
        {tip && (
          <span style={{ color: C.dim, fontSize: 9.5, letterSpacing: 0.3 }}>{tip}</span>
        )}
      </div>
    </div>
  );
}

// ---- main component ---------------------------------------------------------

export default function DayScoreboard({ gamesByDay, fallbackGames, errors }) {
  const { lang, t } = useApp();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const dates = useMemo(() => buildWindow(3, 3, today), [today]);
  const todayKey = toKey(today);
  const [activeKey, setActiveKey] = useState(todayKey);

  const trackRef = useRef(null);
  const panelRefs = useRef({});
  const tabRefs = useRef({});

  // Scroll to today on mount.
  useEffect(() => {
    const el = panelRefs.current[todayKey];
    if (el && trackRef.current) {
      trackRef.current.scrollLeft = el.offsetLeft;
    }
  }, [todayKey]);

  // Detect which panel is most visible when user swipes.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const handler = () => {
      let best = { key: activeKey, dist: Infinity };
      for (const [key, el] of Object.entries(panelRefs.current)) {
        if (!el) continue;
        const d = Math.abs(el.offsetLeft - track.scrollLeft);
        if (d < best.dist) best = { key, dist: d };
      }
      if (best.key !== activeKey) setActiveKey(best.key);
    };
    track.addEventListener('scroll', handler, { passive: true });
    return () => track.removeEventListener('scroll', handler);
  }, [activeKey]);

  useEffect(() => {
    const el = tabRefs.current[activeKey];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeKey]);

  const goToKey = useCallback((key) => {
    const el = panelRefs.current[key];
    if (el && trackRef.current) {
      trackRef.current.scrollTo({ left: el.offsetLeft, behavior: 'smooth' });
    }
  }, []);

  const dayLabel = (date) => {
    const diff = diffDays(date, today);
    const { wd, md } = intlShort(date, lang);
    if (diff === -1) return { top: t('yesterday').toUpperCase(), bottom: `${wd} · ${md}` };
    if (diff === 0) return { top: t('today').toUpperCase(), bottom: `${wd} · ${md}` };
    if (diff === 1) return { top: t('tomorrow').toUpperCase(), bottom: `${wd} · ${md}` };
    return { top: wd, bottom: md };
  };

  const gamesForKey = (key) =>
    (key === todayKey && (!gamesByDay || !gamesByDay[key]?.length))
      ? (fallbackGames || [])
      : (gamesByDay?.[key] || []);

  const activeCount = gamesForKey(activeKey).length;

  return (
    <div className="scoreboard-hero" style={{ borderBottom: `1px solid ${C.line}`, background: C.heroBg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid ${C.lineSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 }}>{t('scoresSchedule')}</span>
          <span style={{ fontSize: 9.5, color: C.dim }}>
            {activeCount > 0 ? `${activeCount} ${t('games')}` : t('offDay')}
          </span>
        </div>
        <div style={{ fontSize: 9.5, color: C.dim, letterSpacing: 0.5 }}>
          {errors?.scores
            ? <span style={{ color: C.red }}>● {t('espnOff')}</span>
            : <span style={{ color: C.green }}>● {t('espnLive')} · {t('swipeHint')}</span>}
        </div>
      </div>

      {/* Day tabs */}
      <div
        className="day-tabs"
        style={{
          display: 'flex',
          overflowX: 'auto',
          borderBottom: `1px solid ${C.lineSoft}`,
          background: C.panelSoft,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {dates.map((d) => {
          const key = toKey(d);
          const { top, bottom } = dayLabel(d);
          const active = key === activeKey;
          const dayGames = gamesForKey(key);
          return (
            <button
              ref={(el) => { tabRefs.current[key] = el; }}
              key={key}
              type="button"
              onClick={() => goToKey(key)}
              style={{
                flex: '0 0 auto',
                minWidth: 92,
                padding: '8px 14px',
                background: active ? C.heroBg : 'transparent',
                borderTop: 'none',
                borderBottom: active ? `2px solid ${C.amber}` : '2px solid transparent',
                borderLeft: 'none',
                borderRight: `1px solid ${C.lineSoft}`,
                color: active ? C.text : C.dim,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: 0.5,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <div style={{ fontSize: 9.5, color: active ? C.amber : C.muted, letterSpacing: 1, fontWeight: 600 }}>{top}</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>{bottom}</div>
              <div style={{ fontSize: 8.5, marginTop: 3, color: dayGames.length ? C.green : C.muted, letterSpacing: 0.3 }}>
                {dayGames.length ? `● ${dayGames.length} ${t('games').toLowerCase()}` : '—'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Swipe track */}
      <div
        ref={trackRef}
        className="day-track"
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {dates.map((d) => {
          const key = toKey(d);
          const dayGames = gamesForKey(key);
          return (
            <div
              key={key}
              ref={(el) => { panelRefs.current[key] = el; }}
              style={{
                flex: '0 0 100%',
                minWidth: '100%',
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
              }}
            >
              {dayGames.length === 0 ? (
                <div
                  style={{
                    padding: '32px 14px',
                    textAlign: 'center',
                    color: C.muted,
                    fontSize: 11,
                    letterSpacing: 0.3,
                    borderBottom: `1px solid ${C.lineSoft}`,
                  }}
                >
                  {t('noGamesDay')} · {getUserTzLabel()}
                </div>
              ) : (
                <div className="game-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0 }}>
                  {dayGames.map((g, i) => (
                    <GameCard key={g.id || `${key}-${i}`} g={g} lang={lang} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
