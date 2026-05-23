import React, { useEffect, useMemo, useRef } from 'react';
import { SPORT_META, SPORT_KEYS } from './sport.js';
import { TopNav, MiniNav, KbdHint } from './Nav.jsx';

// ============================================================================
// v0.65.0 — Paper-mode <NotFound /> (P3 chrome).
//
// Full chrome, not a void. Anatomy from design_handoff_gibol_v1/js/
// not-found.jsx. Resolves audit UX-004 ("404 is a dead end").
//
//   - Same MiniNav (mobile) / TopNav (desktop) as anywhere else
//   - Brand-voice Bahasa title — "Halamannya nggak ketemu."
//   - Pre-focused inline search input
//   - Six sport-hub recovery cards (2-col mobile, 3-col desktop)
//   - "Ramai dibaca" rail — keeps crawlers happy + provides a way back in
//   - The URL that 404'd is shown in mono so users / support can see
//     exactly what was missed
//   - "Kembali ke beranda" primary + "Jadwal hari ini" ghost
//
// Lives in components/v2 alongside the legacy src/pages/NotFound.jsx. P5
// wires the route to render this variant when [data-brand="paper"] is on.
// ============================================================================

export default function NotFound({
  pathname = (typeof window !== 'undefined' && window.location?.pathname) || '/',
  trending = DEFAULT_TRENDING,
  onSportClick,
  onSearchClick,
  isMobile,
}) {
  // Mobile detection — defaults to a viewport check at mount, then stays.
  // Callers can force via `isMobile` prop (useful for SSR / prerender).
  const mobile = useMobileDefault(isMobile);
  const searchRef = useRef(null);

  useEffect(() => {
    // Pre-focus the search input on mount, but only on desktop to avoid
    // popping the iOS keyboard on a 404.
    if (!mobile && searchRef.current) searchRef.current.focus();
  }, [mobile]);

  return (
    <div
      className="g-root"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {mobile ? (
        <MiniNav title="Halaman tidak ditemukan" />
      ) : (
        <TopNav onSearchClick={onSearchClick} onSportClick={onSportClick} />
      )}

      <div style={{ flex: 1, padding: mobile ? '24px 16px 32px' : '48px 32px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Hero */}
          <div style={{ marginBottom: 24 }}>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>HTTP · 404</div>
            <h1
              className="t-display"
              style={{ fontSize: mobile ? 30 : 44, marginBottom: 10, color: 'var(--ink-1)' }}
            >
              Halamannya nggak ketemu.
            </h1>
            <p className="t-body" style={{ color: 'var(--ink-2)', maxWidth: 520 }}>
              Bisa jadi pertandingannya sudah selesai dan halamannya kami arsipkan,
              atau link-nya memang nggak pernah ada. Coba dari salah satu masuk di bawah.
            </p>
            {pathname && pathname !== '/' && (
              <div
                className="g-mono"
                style={{
                  marginTop: 10,
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 'var(--r-2)',
                  background: 'var(--bg-deep)',
                  color: 'var(--ink-2)',
                  fontSize: 12,
                  wordBreak: 'break-all',
                }}
              >
                {pathname}
              </div>
            )}
          </div>

          {/* Inline search */}
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (onSearchClick) onSearchClick(searchRef.current?.value || '');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--bg-raised)',
              border: '1px solid var(--line-2)',
              borderRadius: 'var(--r-pill)',
              padding: '10px 14px',
              marginBottom: 24,
            }}
          >
            <SearchIcon size={18} />
            <input
              ref={searchRef}
              type="search"
              placeholder="Cari pemain, klub, pertandingan…"
              aria-label="Cari di Gibol"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-ui)',
                fontSize: 15,
                color: 'var(--ink-1)',
              }}
            />
            {!mobile && <KbdHint />}
          </form>

          {/* Sport hub recovery grid */}
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Mungkin yang kamu cari</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 24,
            }}
          >
            {SPORT_KEYS.map((k) => {
              const meta = SPORT_META[k];
              return (
                <a
                  key={k}
                  href={meta.hubPath}
                  data-sport={k}
                  onClick={(e) => {
                    if (onSportClick) {
                      e.preventDefault();
                      onSportClick(k);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--line-1)',
                    borderRadius: 'var(--r-3)',
                    textDecoration: 'none',
                    color: 'var(--ink-1)',
                  }}
                >
                  <div
                    data-sport={k}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'var(--sport-wash)',
                      color: 'var(--sport-deep)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <HubGlyph sport={k} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.label}</div>
                    <div
                      className="t-meta"
                      style={{ fontSize: 11, color: 'var(--ink-3)' }}
                    >
                      {meta.tag}
                    </div>
                  </div>
                  <ChevronRight />
                </a>
              );
            })}
          </div>

          {/* Trending — only if callers pass it */}
          {trending && trending.length > 0 && (
            <>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Ramai dibaca</div>
              <div className="g-card" style={{ overflow: 'hidden', marginBottom: 28 }}>
                {trending.map((t, i) => (
                  <TrendRow
                    key={t.href || t.title}
                    rank={String(i + 1).padStart(2, '0')}
                    title={t.title}
                    meta={t.meta}
                    href={t.href}
                    last={i === trending.length - 1}
                  />
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="/" className="g-btn g-btn--primary">
              <BackIcon /> Kembali ke beranda
            </a>
            <a href="/jadwal" className="g-btn g-btn--ghost">Jadwal hari ini</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function useMobileDefault(forced) {
  return useMemo(() => {
    if (forced != null) return forced;
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(max-width: 767px)').matches ?? false;
  }, [forced]);
}

const DEFAULT_TRENDING = [
  { title: 'Hasil Game 4: Cavaliers tahan laju Thunder', meta: 'NBA Playoffs · 2 jam lalu', href: '/nba-playoff-2026' },
  { title: 'Antonelli pole di Imola, Verstappen P2', meta: 'F1 2026 · 4 jam lalu', href: '/formula-1-2026' },
  { title: 'Klasemen Liga 1 jelang pekan terakhir', meta: 'Super League · sore tadi', href: '/super-league-2025-26' },
];

function TrendRow({ rank, title, meta, href, last }) {
  return (
    <a
      href={href || '#'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderBottom: last ? 'none' : '1px solid var(--line-1)',
        textDecoration: 'none',
        color: 'var(--ink-1)',
      }}
    >
      <div className="g-mono" style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-3)', width: 24 }}>
        {rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{title}</div>
        <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>{meta}</div>
      </div>
      <ChevronRight />
    </a>
  );
}

function SearchIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function BackIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      style={{ color: 'var(--ink-3)', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M5 3l4 4-4 4" />
    </svg>
  );
}

function HubGlyph({ sport }) {
  // Tiny inline glyph — matches the Nav sport glyphs but at 18px.
  const sw = 1.6;
  const paths = {
    nba: <><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth={sw} /><path d="M3 12h18M12 3v18M5 5.5c2 2 5.5 4 7 6.5s5 6 7 6.5M19 5.5c-2 2-5.5 4-7 6.5s-5 6-7 6.5" fill="none" stroke="currentColor" strokeWidth={sw} /></>,
    epl: <><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth={sw} /><path d="M12 6.5l3.5 2.5-1.3 4.1h-4.4L8.5 9l3.5-2.5z" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" /></>,
    liga1: <><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth={sw} /><path d="M12 6.5l3.5 2.5-1.3 4.1h-4.4L8.5 9l3.5-2.5z" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" /></>,
    f1: <path d="M3 14.5c2-3 6-4 11-4h7M3 14.5h6.5l4.5 3h6.5M9.5 10.5L13 7h6" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />,
    tennis: <><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth={sw} /><path d="M3.5 9c4 0 7 1.5 8.5 3s4.5 3 8.5 3M3.5 15c4 0 7-1.5 8.5-3s4.5-3 8.5-3" fill="none" stroke="currentColor" strokeWidth={sw} /></>,
    worldcup: <><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth={sw} /><path d="M12 6l2.4 1.7-.9 2.8h-3l-.9-2.8L12 6z" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" /></>,
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      {paths[sport] || paths.liga1}
    </svg>
  );
}
