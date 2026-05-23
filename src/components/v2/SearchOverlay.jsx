import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resolveSportKey } from './sport.js';
import { KbdHint } from './Nav.jsx';

// ============================================================================
// v0.65.0 — Paper-mode <SearchOverlay /> (P3 chrome).
//
// Solid scrim + blur, modal panel, grouped results. Resolves audit UX-007
// ("scrim too leaky") + UX-015 (OS-adaptive ⌘K hint). Anatomy from
// design_handoff_gibol_v1/js/search-overlay.jsx.
//
//   - Scrim: rgba(15, 30, 46, 0.55) + backdrop-filter: blur(8px) saturate(140%)
//   - Mobile: full-bleed sheet from the top. Desktop: center-modal at 64px
//     from the top edge, max width 560.
//   - Input pre-focused, type-ahead controlled, ⌘K / Ctrl K hint inside the
//     input row, Esc / outside-click closes.
//   - Results grouped by entity type (matches / clubs / players / drivers).
//     Each row carries `data-sport` so the per-sport accent reads through
//     <mark> highlights.
//   - Footer kbd hints: ↩ pilih · ↑↓ navigasi · esc tutup
//
// Usage:
//   const [open, setOpen] = useState(false);
//   …
//   <SearchOverlay open={open} onClose={() => setOpen(false)}
//     onSearch={runQuery} groups={results} />
//
// Hotkey: callers wire ⌘K / Ctrl K themselves (the global listener is a
// surface-level concern — App.jsx or the TopNav owner subscribes).
// ============================================================================

export default function SearchOverlay({
  open,
  onClose,
  onSearch,
  onSelect,
  groups = [],
  initialQuery = '',
  placeholder = 'Cari pemain, klub, pertandingan…',
  mobile,
}) {
  const isMobile = useMobileDefault(mobile);
  const [q, setQ] = useState(initialQuery);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Focus on open; restore previous focus on close.
  const prevFocusRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    prevFocusRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    // Defer one frame so the scrim doesn't steal the focus ring before
    // the input has mounted.
    const tm = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      clearTimeout(tm);
      if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') {
        prevFocusRef.current.focus();
      }
    };
  }, [open]);

  // Esc + outside-click closes.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Light debounce of the onSearch callback.
  useEffect(() => {
    if (!open) return undefined;
    if (!onSearch) return undefined;
    const tm = setTimeout(() => onSearch(q), 120);
    return () => clearTimeout(tm);
  }, [open, q, onSearch]);

  if (!open) return null;

  const handleScrimClick = (e) => {
    // Click outside the panel closes; clicks inside don't bubble out.
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose?.();
    }
  };

  const allRows = useMemo(() => groups.flatMap((g) => g.items || []), [groups]);
  const hasResults = allRows.length > 0;
  const hasQuery = q.trim().length > 0;

  return (
    <div
      role="presentation"
      onMouseDown={handleScrimClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(15, 30, 46, 0.55)',
        backdropFilter: 'blur(8px) saturate(140%)',
        WebkitBackdropFilter: 'blur(8px) saturate(140%)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'flex-start',
        justifyContent: 'center',
        padding: isMobile ? 0 : '64px 24px 24px',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cari"
        style={{
          width: isMobile ? '100%' : 560,
          maxWidth: '100%',
          maxHeight: isMobile ? '100%' : '70vh',
          background: 'var(--bg-raised)',
          borderRadius: isMobile ? 0 : 'var(--r-4)',
          boxShadow: isMobile ? 'none' : 'var(--shadow-3)',
          border: '1px solid var(--line-2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            borderBottom: '1px solid var(--line-1)',
          }}
        >
          <SearchIcon size={20} />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label="Cari di Gibol"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-ui)',
              fontSize: 16,
              color: 'var(--ink-1)',
            }}
          />
          {!isMobile && <KbdHint keyName="K" />}
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            style={{
              minHeight: 32,
              width: 32,
              height: 32,
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--r-2)',
            }}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {hasResults ? (
            groups.map((g, gi) => (
              <SearchGroup key={g.head + gi} head={g.head}>
                {(g.items || []).map((row, ri) => (
                  <SearchRow
                    key={row.id || ri}
                    {...row}
                    query={q}
                    onSelect={() => onSelect?.(row)}
                    last={ri === g.items.length - 1}
                  />
                ))}
              </SearchGroup>
            ))
          ) : (
            <EmptyState query={q} hasQuery={hasQuery} />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 16px',
            borderTop: '1px solid var(--line-1)',
            background: 'var(--bg-base)',
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--ink-3)',
          }}
        >
          <KbHint label="pilih"><KbdLite>↩</KbdLite></KbHint>
          <KbHint label="navigasi"><KbdLite>↑</KbdLite><KbdLite>↓</KbdLite></KbHint>
          <KbHint label="tutup"><KbdLite>esc</KbdLite></KbHint>
          <div style={{ flex: 1 }} />
          <span className="g-mono" style={{ fontSize: 11 }}>cari Bahasa / EN</span>
        </div>
      </div>
    </div>
  );
}

// ─── Group + Row ────────────────────────────────────────────────────────────

function SearchGroup({ head, children }) {
  return (
    <div style={{ padding: '10px 0' }}>
      <div
        className="t-eyebrow"
        style={{ padding: '4px 18px 8px', color: 'var(--ink-3)' }}
      >
        {head}
      </div>
      {children}
    </div>
  );
}

function SearchRow({
  sport,
  icon,
  title,
  meta,
  chip,
  chipKind, // 'live' | undefined
  query,
  onSelect,
  last,
}) {
  return (
    <button
      type="button"
      data-sport={resolveSportKey(sport) || undefined}
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px',
        borderBottom: last ? 'none' : '1px solid var(--line-1)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        color: 'var(--ink-1)',
      }}
    >
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {typeof title === 'string' ? highlight(title, query) : title}
        </div>
        <div className="t-meta" style={{ fontSize: 12, marginTop: 2 }}>{meta}</div>
      </div>
      {chip && (
        <span
          className={'g-chip ' + (chipKind === 'live' ? 'g-chip--live' : '')}
          style={{ fontSize: 11, padding: '4px 8px', minHeight: 0 }}
        >
          {chipKind === 'live' && <span className="pulse-dot" style={{ width: 6, height: 6 }} />}
          {chip}
        </span>
      )}
    </button>
  );
}

function EmptyState({ hasQuery, query }) {
  return (
    <div
      style={{
        padding: '32px 18px',
        textAlign: 'center',
        color: 'var(--ink-2)',
        fontSize: 14,
      }}
    >
      {hasQuery ? (
        <>
          Tidak ada hasil untuk <span className="g-mono">{query}</span>.
        </>
      ) : (
        <>Mulai mengetik untuk mencari pemain, klub, atau pertandingan.</>
      )}
    </div>
  );
}

// ─── Highlight helper ───────────────────────────────────────────────────────

function highlight(text, query) {
  if (!query || !text) return text;
  const q = query.trim();
  if (!q) return text;
  const lc = text.toLowerCase();
  const idx = lc.indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark
        style={{
          background: 'var(--sport-wash)',
          color: 'var(--sport-deep)',
          borderRadius: 3,
          padding: '0 2px',
        }}
      >
        {match}
      </mark>
      {after}
    </>
  );
}

function useMobileDefault(forced) {
  return useMemo(() => {
    if (forced != null) return forced;
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(max-width: 767px)').matches ?? false;
  }, [forced]);
}

// ─── Icons + kbd footer ─────────────────────────────────────────────────────

function SearchIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function CloseIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function KbHint({ label, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-flex', gap: 2 }}>{children}</span>
      <span>{label}</span>
    </span>
  );
}
function KbdLite({ children }) {
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 4px',
        background: 'var(--bg-deep)',
        color: 'var(--ink-2)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        border: '1px solid var(--line-2)',
        borderRadius: 4,
      }}
    >
      {children}
    </kbd>
  );
}
