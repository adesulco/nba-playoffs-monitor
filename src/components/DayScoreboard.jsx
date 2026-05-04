import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '../lib/AppContext.jsx';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import { getUserTzLabel, localizeGameStatus } from '../lib/timezone.js';

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

// Locale-aware short weekday + DD/MM date. No hardcoded month names —
// we render the numeric day/month to keep the tab compact and consistent
// with Ade's request for dd/mm format.
function intlShort(date, lang) {
  const loc = lang === 'id' ? 'id-ID' : 'en-US';
  const wd = new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(date);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return { wd: wd.toUpperCase().replace('.', ''), md: `${dd}/${mm}` };
}

// ---- share helpers ---------------------------------------------------------

// Build a Bahasa-casual share text with English slang for a live game.
// Example: "LAL 92 – 88 DEN, Q3 07:24 · cek live-nya di gibol.co 🏀"
function buildLiveShareText(g) {
  const a = g.away?.abbr || '—';
  const h = g.home?.abbr || '—';
  const as = g.away?.score ?? '0';
  const hs = g.home?.score ?? '0';
  const clockBit = g.status ? ` · ${g.status}` : '';
  return `${a} ${as} – ${hs} ${h}${clockBit} · live-update-nya di gibol.co 🏀`;
}

function buildFinalShareText(g) {
  const a = g.away?.abbr || '—';
  const h = g.home?.abbr || '—';
  const as = g.away?.score ?? '0';
  const hs = g.home?.score ?? '0';
  return `FINAL · ${a} ${as} – ${hs} ${h} · recap + bracket di gibol.co 🏀`;
}

function GAME_SHARE_URL(g) {
  // v0.12.1 — Theme J seedling. Per-game canonical URL now exists:
  //   /nba-playoff-2026/game/:gameId (NBAGameDeepLink.jsx)
  // OG meta on that route points at the dynamic per-game card so
  // WhatsApp / X / Threads link unfurls show the right image. Live
  // games still benefit because the endpoint serves the live variant
  // until the game finishes (cache-by-state).
  if (!g.id) return 'https://www.gibol.co/nba-playoff-2026';
  return `https://www.gibol.co/nba-playoff-2026/game/${encodeURIComponent(g.id)}`;
}

// ---- game card --------------------------------------------------------------

function OddsBar({ winProb, awayAbbr, homeAbbr, awayColor, homeColor }) {
  if (!winProb || typeof winProb.homePct !== 'number') return null;
  const homePct = Math.round(winProb.homePct * 100);
  const awayPct = 100 - homePct;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, letterSpacing: 0.4, color: C.dim }}>
        <span>WIN ODDS · ESPN</span>
        <span style={{ color: awayPct >= homePct ? awayColor : homeColor, fontWeight: 600 }}>
          {awayPct >= homePct ? `${awayAbbr} ${awayPct}%` : `${homeAbbr} ${homePct}%`}
        </span>
      </div>
      <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', background: C.lineSoft }}>
        <div style={{ width: `${awayPct}%`, background: awayColor, transition: 'width 0.3s' }} />
        <div style={{ width: `${homePct}%`, background: homeColor, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function ShareBtn({ g, lang, accent }) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLive = g.statusState === 'in';
  const isFinal = g.statusState === 'post';
  if (!isLive && !isFinal) return null; // Only for live / final.
  const text = isLive ? buildLiveShareText(g) : buildFinalShareText(g);
  const url = GAME_SHARE_URL(g);
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  const waLink = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
  const xLink  = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const thLink = `https://www.threads.net/intent/post?text=${encodedText}%20${encodedUrl}`;

  async function onShare(e) {
    e.stopPropagation();
    // Prefer native Web Share on mobile — the OS sheet already offers WhatsApp,
    // X, Threads, and friends natively. On desktop or where navigator.share
    // is missing, open our own mini-menu with WA/X/Threads/copy.
    const payload = { title: 'gibol.co', text, url };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (_) { /* cancelled — fall through to menu */ }
    }
    setMenuOpen((v) => !v);
  }

  async function copyLink(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard?.writeText(`${text} ${url}`);
      setCopied(true);
      setMenuOpen(false);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  }

  const label = copied
    ? (lang === 'id' ? '✓ Tersalin' : '✓ Copied')
    : (lang === 'id' ? 'Bagikan' : 'Share');

  const chip = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 7px',
    fontSize: 9, letterSpacing: 0.4, fontWeight: 600,
    borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
    whiteSpace: 'nowrap', textDecoration: 'none',
  };

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={onShare}
        title={text}
        style={{
          ...chip,
          background: copied ? C.green : 'transparent',
          border: `1px solid ${copied ? C.green : accent || C.lineSoft}`,
          color: copied ? '#fff' : accent || C.text,
        }}
      >
        <span aria-hidden="true">↗</span>{label}
      </button>

      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 20,
            display: 'flex', gap: 4,
            padding: 4,
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          }}
        >
          <a href={waLink} target="_blank" rel="noopener noreferrer"
             onClick={() => setMenuOpen(false)}
             style={{ ...chip, background: '#25D366', color: '#fff', border: 'none' }}>
            WA
          </a>
          <a href={xLink} target="_blank" rel="noopener noreferrer"
             onClick={() => setMenuOpen(false)}
             style={{ ...chip, background: '#000', color: '#fff', border: 'none' }}>
            X
          </a>
          <a href={thLink} target="_blank" rel="noopener noreferrer"
             onClick={() => setMenuOpen(false)}
             style={{ ...chip, background: '#101010', color: '#fff', border: `1px solid #333` }}>
            Threads
          </a>
          <button
            type="button"
            onClick={copyLink}
            style={{ ...chip, background: C.panelRow, color: C.text, border: `1px solid ${C.line}` }}
          >
            {lang === 'id' ? 'Salin' : 'Copy'}
          </button>
        </div>
      )}
    </span>
  );
}

function GameCard({ g, lang, onClick, isActive, winProb, favTeam, accent }) {
  const awayFull = Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === g.away?.abbr);
  const homeFull = Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === g.home?.abbr);
  const awayMeta = TEAM_META[awayFull] || { color: '#2a3a52' };
  const homeMeta = TEAM_META[homeFull] || { color: '#2a3a52' };
  const favInGame = favTeam && (awayFull === favTeam || homeFull === favTeam);
  const favColor = favInGame ? TEAM_META[favTeam].color : null;
  const isLive = g.statusState === 'in';
  const isFinal = g.statusState === 'post';
  const awayScore = g.away?.score;
  const homeScore = g.home?.score;
  const hasScore = awayScore !== null && awayScore !== undefined && awayScore !== '';
  const awayWon = hasScore && parseInt(awayScore) > parseInt(homeScore);
  const homeWon = hasScore && parseInt(homeScore) > parseInt(awayScore);

  // v0.11.10 — score-change emotional beat. Tracks prev score per side
  // via refs; on delta during a LIVE game, flashes the score number
  // for 600ms (CSS keyframe `.score-flash`) and — if the fav team is
  // playing AND the Vibration API is available — buzzes for 40ms.
  // Mount never flashes (initial refs start equal to current scores).
  // Guarded on isLive so finals and upcoming don't animate on the
  // first usePlayoffData fetch.
  const prevAwayRef = useRef(awayScore);
  const prevHomeRef = useRef(homeScore);
  const [awayFlash, setAwayFlash] = useState(false);
  const [homeFlash, setHomeFlash] = useState(false);

  useEffect(() => {
    if (!isLive) {
      prevAwayRef.current = awayScore;
      prevHomeRef.current = homeScore;
      return;
    }
    const prevA = prevAwayRef.current;
    const prevH = prevHomeRef.current;
    const awayChanged = prevA !== undefined && prevA !== null && prevA !== awayScore;
    const homeChanged = prevH !== undefined && prevH !== null && prevH !== homeScore;

    if (awayChanged) {
      setAwayFlash(true);
      const t = setTimeout(() => setAwayFlash(false), 600);
      // Haptic buzz — only for fav-team games to avoid every score
      // buzzing a user watching the whole league. Respects the
      // browser's own reduced-motion / accessibility prefs via the
      // Vibration API's permission model.
      if (favInGame && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(40); } catch {}
      }
      prevAwayRef.current = awayScore;
      return () => clearTimeout(t);
    }
    if (homeChanged) {
      setHomeFlash(true);
      const t = setTimeout(() => setHomeFlash(false), 600);
      if (favInGame && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(40); } catch {}
      }
      prevHomeRef.current = homeScore;
      return () => clearTimeout(t);
    }
    // No change — keep refs in sync for next tick.
    prevAwayRef.current = awayScore;
    prevHomeRef.current = homeScore;
  }, [awayScore, homeScore, isLive, favInGame]);

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderRight: `1px solid ${C.lineSoft}`,
        borderBottom: `1px solid ${C.lineSoft}`,
        borderLeft: favInGame ? `3px solid ${favColor}` : isActive ? `3px solid ${accent || C.amber}` : '3px solid transparent',
        background: isActive ? '#10243c' : favInGame ? `${favColor}14` : C.panelRow,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s, border-color 0.15s',
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
          <span
            className={awayFlash ? 'score-flash' : undefined}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: awayWon ? C.amberBright : C.text, letterSpacing: -0.3 }}
          >
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
          <span
            className={homeFlash ? 'score-flash' : undefined}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: homeWon ? C.amberBright : C.text, letterSpacing: -0.3 }}
          >
            {homeScore}
          </span>
        )}
      </div>

      {/* Live odds bar — only for in-progress games */}
      {isLive && (
        <OddsBar
          winProb={winProb}
          awayAbbr={g.away?.abbr}
          homeAbbr={g.home?.abbr}
          awayColor={awayMeta.color}
          homeColor={homeMeta.color}
        />
      )}

      {/* Status + share */}
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
          {localizeGameStatus(g.status, g.date, g.statusState, lang) || (isLive ? 'LIVE' : isFinal ? 'FINAL' : 'UPCOMING')}
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {(isLive || isFinal) && <ShareBtn g={g} lang={lang} accent={isLive ? C.green : accent} />}
        </div>
      </div>
    </div>
  );
}

// ---- main component ---------------------------------------------------------

export default function DayScoreboard({
  gamesByDay,
  fallbackGames,
  errors,
  onGameClick,
  activeMatchId,
  winProbs,
  favTeam,
  accent,
}) {
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

  // v0.12.8 — pin the day-track's height to the ACTIVE panel's height.
  // Pre-fix: the flex track stretched to the tallest panel (e.g.
  // Saturday's 8-game slate = 2 card rows ≈ 280 px). On today with
  // 5 games (1 row ≈ 140 px), the track left ~140 px of empty space
  // below the cards — Ade's "dead gap above LIVE FOCUS". Now: a
  // ResizeObserver tracks the active panel and explicitly sets the
  // track's height, which preserves the horizontal swipe-snap while
  // collapsing wasted vertical space when the active day has fewer
  // games than the tallest day in the window.
  useEffect(() => {
    const track = trackRef.current;
    const panel = panelRefs.current[activeKey];
    if (!track || !panel || typeof ResizeObserver === 'undefined') return;
    const apply = () => {
      const h = panel.offsetHeight;
      if (h > 0) track.style.height = `${h}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [activeKey]);

  const goToKey = useCallback((key) => {
    // v0.49.0 hotfix — set activeKey synchronously so the tab highlight
    // and the active-panel ResizeObserver kick in immediately even if
    // the smooth-scroll stalls or aborts (some browsers drop horizontal
    // smooth scrolls when scroll-snap-type: x mandatory is set; the
    // scroll handler's "best panel" detection then never fires, leaving
    // the user looking at the previous day's games). With this, the
    // panel that's about to be shown is already marked active; the
    // scrollTo just follows along visually.
    setActiveKey(key);
    const el = panelRefs.current[key];
    if (el && trackRef.current) {
      // 'instant' overrides the track's CSS scroll-behavior: smooth.
      // Programmatic scrolls are more reliable instant; user-initiated
      // swipes still get the smooth CSS treatment.
      trackRef.current.scrollTo({ left: el.offsetLeft, behavior: 'instant' });
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
          <span
            className={activeCount > 0 ? 'tick-live' : undefined}
            style={{ fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 }}
          >
            {t('scoresSchedule')}
          </span>
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
        className="day-tabs day-strip-scroll"
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
              aria-current={active ? 'date' : undefined}
              aria-label={`${top} ${bottom} — ${dayGames.length} ${t('games').toLowerCase()}`}
              style={{
                // v0.11.4 a11y — WCAG 2.5.8 (target size min 24×24, enhanced
                // 44×44). Was ~38×~34 with 9.5/8.5 px labels → bumped to 56+
                // tall with 11/13/11 px type so thumbs + low-vision users
                // both land it first try.
                flex: '0 0 auto',
                minWidth: 96,
                minHeight: 56,
                padding: '10px 14px',
                background: active ? C.heroBg : 'transparent',
                borderTop: 'none',
                borderBottom: active ? `2px solid ${C.amber}` : '2px solid transparent',
                borderLeft: 'none',
                borderRight: `1px solid ${C.lineSoft}`,
                color: active ? C.text : C.dim,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                letterSpacing: 0.5,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <div style={{ fontSize: 11, color: active ? C.amber : C.muted, letterSpacing: 1, fontWeight: 600 }}>{top}</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{bottom}</div>
              <div style={{ fontSize: 11, marginTop: 3, color: dayGames.length ? C.green : C.muted, letterSpacing: 0.3 }}>
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
                    <GameCard
                      key={g.id || `${key}-${i}`}
                      g={g}
                      lang={lang}
                      onClick={onGameClick ? () => onGameClick(g) : undefined}
                      isActive={activeMatchId && g.id === activeMatchId}
                      winProb={winProbs?.[g.id]}
                      favTeam={favTeam}
                      accent={accent}
                    />
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
