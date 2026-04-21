import React, { useEffect, useRef } from 'react';
import { useApp } from '../../lib/AppContext.jsx';

/**
 * Theme popover — C4 spec (Part 4.1).
 *
 * Chrome:
 *   184px wide, 10px padding, 8px radius.
 *   Background: var(--bg-2).
 *   Border:     1px solid var(--line).
 *   Shadow:     0 10px 32px rgba(0,0,0,.4).
 *   Caret:      8px triangle, top-right aligned with anchor icon center.
 *
 * Anchor: the sun/moon icon in the top bar (NOT the EN/BI chip).
 * Anchored position: top = anchor.bottom + 6, right = 16 (matches top-bar
 * right padding).
 *
 * State pills: AUTO / DARK / LIGHT. Active pill = amber bg on ink-0 text.
 * Clicking a pill calls AppContext.setTheme, which resolves 'auto' via
 * prefers-color-scheme and live-updates the matchMedia listener (already
 * in AppContext.jsx from v0.5.2).
 *
 * Close: click-outside (handled via mousedown on window), ⎋, or click the
 * same toggle again (owner toggles via state in V2TopBar).
 */

const PILLS = [
  { key: 'auto',  labelEn: 'AUTO',  labelId: 'AUTO',  subEn: 'follows OS', subId: 'ikut sistem' },
  { key: 'dark',  labelEn: 'DARK',  labelId: 'GELAP' },
  { key: 'light', labelEn: 'LIGHT', labelId: 'TERANG' },
];

export default function ThemePopover({ anchorRef, onClose }) {
  const { theme, setTheme, lang } = useApp();
  const popRef = useRef(null);

  // Click-outside + esc to close. Ignore clicks on the anchor button (owner
  // handles its own toggle via state).
  useEffect(() => {
    function onDown(e) {
      if (!popRef.current) return;
      if (popRef.current.contains(e.target)) return;
      if (anchorRef?.current && anchorRef.current.contains(e.target)) return;
      onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorRef, onClose]);

  // Position: top-right under the anchor. Calculated once on mount.
  const rect = anchorRef?.current?.getBoundingClientRect?.();
  const top = rect ? rect.bottom + 6 : 52;
  const right = rect ? window.innerWidth - rect.right : 16;

  return (
    <div
      ref={popRef}
      role="menu"
      aria-label={lang === 'id' ? 'Pilih tema' : 'Theme'}
      style={{
        position: 'fixed',
        top,
        right,
        width: 184,
        padding: 10,
        background: 'var(--bg-2)',
        border: '1px solid var(--line)',
        borderRadius: 8,
        boxShadow: '0 10px 32px rgba(0,0,0,0.4)',
        zIndex: 50,
      }}
    >
      {/* Caret — 8px triangle, aligned with anchor center */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -5,
          right: 14,
          width: 9,
          height: 9,
          background: 'var(--bg-2)',
          borderTop: '1px solid var(--line)',
          borderLeft: '1px solid var(--line)',
          transform: 'rotate(45deg)',
        }}
      />

      <div
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--ink-3)',
          padding: '2px 4px 8px',
        }}
      >
        {lang === 'id' ? 'TEMA' : 'THEME'}
      </div>

      {PILLS.map((p) => {
        const active = theme === p.key;
        const label = lang === 'id' ? p.labelId : p.labelEn;
        const sub = lang === 'id' ? p.subId : p.subEn;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setTheme(p.key);
              // Don't auto-close — let user see the change, close on next esc/click-out.
            }}
            role="menuitemradio"
            aria-checked={active}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              marginBottom: 4,
              borderRadius: 5,
              background: active ? 'var(--amber)' : 'var(--bg-3)',
              color: active ? '#0A1628' : 'var(--ink-2)',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: active ? '1px solid #0A1628' : '1px solid var(--ink-3)',
                background: active ? '#0A1628' : 'transparent',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                font: '700 11px "Inter Tight", sans-serif',
                letterSpacing: '0.04em',
                flex: 1,
              }}
            >
              {label}
              {sub && (
                <span
                  style={{
                    fontWeight: 400,
                    fontSize: 10,
                    marginLeft: 6,
                    color: active ? 'rgba(10,22,40,.7)' : 'var(--ink-3)',
                    letterSpacing: 0,
                  }}
                >
                  · {sub}
                </span>
              )}
            </span>
            {active && (
              <span
                aria-hidden="true"
                style={{ fontSize: 10, fontWeight: 800 }}
              >
                ✓
              </span>
            )}
          </button>
        );
      })}

      <div
        style={{
          borderTop: '1px solid var(--line-soft)',
          margin: '6px -4px 0',
          padding: '8px 4px 0',
          fontSize: 10,
          color: 'var(--ink-3)',
          lineHeight: 1.4,
        }}
      >
        {lang === 'id' ? (
          <>Preferensi tersimpan per perangkat. Tekan <Kbd>esc</Kbd> untuk tutup.</>
        ) : (
          <>Your pick is saved per device. Press <Kbd>esc</Kbd> to close.</>
        )}
      </div>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <span
      className="mono"
      style={{
        padding: '0 4px',
        border: '1px solid var(--line)',
        borderRadius: 2,
        color: 'var(--ink-2)',
      }}
    >
      {children}
    </span>
  );
}
