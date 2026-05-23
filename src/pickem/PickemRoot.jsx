import React, { useEffect, useState } from 'react';
import { BottomNav, SideNav } from './Nav.jsx';

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
 * <PickemRoot active="predict" onNavigate={fn}>...</PickemRoot>
 *
 * Props:
 *   active     paper-mode nav key — 'predict' | 'board' | 'grup' |
 *              'bracket' | 'survivor' | 'profile'
 *   onNavigate (key) => void — called when a nav item is tapped
 *   theme      'dark' | 'light' — defaults to localStorage / 'dark'
 *   children   the route's content
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
        {children}
      </main>

      {mobile && <BottomNav active={active} onChange={onNavigate} />}
    </div>
  );
}
