import React, { useEffect, useState } from 'react';
import { BottomNav, SideNav } from './Nav.jsx';
import { usePickemCompetition } from './useCompetition.jsx';
import { COMPETITIONS, COMPETITION_ORDER } from './competitions.js';

// ============================================================================
// v0.65.0 — <PickemRoot /> · the Pick'em surface container.
//
// Wraps every Pick'em route in a `.pickem-root` div with
// data-theme="dark" forced by default (handover line 41: "Pick'em forces
// Stadium dark"). User-toggleable to "light" via localStorage —
// independent of the global gibol:theme so the rest of the app stays
// dark by default while Pick'em can run light or vice versa.
//
// Layout: desktop shows <SideNav /> + content; mobile shows content +
// <BottomNav />. Driven by a `(max-width: 1023px)` media query (matches
// the design's mobile/desktop threshold).
// ============================================================================

const PICKEM_THEME_KEY = 'gibol:pickem:theme';

function readSavedTheme() {
  if (typeof localStorage === 'undefined') return 'dark';
  try {
    const v = localStorage.getItem(PICKEM_THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'dark';
  } catch {
    return 'dark';
  }
}

function useMobile() {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(max-width: 1023px)').matches ?? false;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia?.('(max-width: 1023px)');
    if (!mq) return undefined;
    const onChange = (e) => setMobile(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return mobile;
}

/**
 * Competition switcher pill — a tiny segmented control mounted above the
 * Pick'em main content area. Shown only when more than one competition is
 * currently in-window. Per v0.79.1, that's NBA Playoffs (active now) plus
 * WC2026 (open 2026-06-11+). Until WC2026 opens, the pill renders nothing
 * because there's only one selectable target.
 */
function CompetitionSwitcher() {
  const { competition, setCompetition } = usePickemCompetition();
  const now = Date.now();
  const options = COMPETITION_ORDER
    .map((k) => COMPETITIONS[k])
    .filter((c) => {
      // Show a competition if its window is open now OR if the user has
      // already selected it (so they can switch back). WC2026 stays hidden
      // until June 11; NBA stays visible through the playoff finale.
      const opens = new Date(c.openAt).getTime();
      const closes = new Date(c.closeAt).getTime();
      return (now >= opens && now <= closes) || c.key === competition.key;
    });
  if (options.length < 2) return null;
  return (
    <div
      role="tablist"
      aria-label="Pick'em competition"
      style={{
        display: 'flex',
        gap: 6,
        padding: '10px 14px 6px',
        borderBottom: '1px solid var(--line-soft, rgba(255,255,255,0.08))',
      }}
    >
      {options.map((o) => {
        const active = o.key === competition.key;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setCompetition(o.key)}
            style={{
              fontFamily: 'var(--font-ui-pickem, "Space Grotesk", system-ui)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.3,
              padding: '6px 10px',
              borderRadius: 999,
              border: `1px solid ${active ? o.sportAccent : 'var(--line-soft, rgba(255,255,255,0.14))'}`,
              background: active ? `${o.sportAccent}22` : 'transparent',
              color: active ? 'var(--ink-1)' : 'var(--ink-2, #9aa1ab)',
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * <PickemRoot active="predict" onNavigate={fn}>...</PickemRoot>
 *
 * Props:
 *   active     paper-mode nav key — 'predict' | 'board' | 'grup' |
 *              'bracket' | 'survivor' | 'profile'
 *   onNavigate (key) => void — called when a nav item is tapped
 *   theme      'dark' | 'light' — defaults to localStorage / 'dark'
 *   children   the route's content
 *
 * Wraps children in <PickemCompetitionProvider> so every nested screen can
 * call usePickemCompetition() to read the active league/sport/shape config.
 */
export default function PickemRoot({ active = 'predict', onNavigate, theme, children }) {
  const mobile = useMobile();
  const [effective, setEffective] = useState(() => theme || readSavedTheme());

  // Sync the prop into local state when it changes.
  useEffect(() => {
    if (theme && theme !== effective) setEffective(theme);
  }, [theme, effective]);

  // Persist theme choice (independent of the app-wide gibol:theme).
  useEffect(() => {
    try {
      localStorage.setItem(PICKEM_THEME_KEY, effective);
    } catch {}
  }, [effective]);

  // v0.79.17 — PickemCompetitionProvider was here, but the screen
  // components that render <PickemRoot> call usePickemCompetition()
  // ABOVE it, so they read the fallback default instead of the selected
  // competition. The provider is now mounted once at the app root
  // (src/App.jsx) so PickemRoot's chrome + every screen share one
  // instance. PickemRoot just consumes it.
  return (
    <div
      className="pickem-root"
      data-theme={effective}
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : '220px 1fr',
        gridTemplateRows: mobile ? '1fr auto' : '1fr',
        background: 'var(--bg-base)',
        color: 'var(--ink-1)',
      }}
    >
      {!mobile && <SideNav active={active} onChange={onNavigate} />}

      <main
        style={{
          minWidth: 0,
          overflow: 'auto',
          paddingBottom: mobile ? 12 : 0,
        }}
      >
        <CompetitionSwitcher />
        {children}
      </main>

      {mobile && <BottomNav active={active} onChange={onNavigate} />}
    </div>
  );
}
