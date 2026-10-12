import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// v0.64.0 — Toast + ToastHost (paper-grey P2 systems).
//
// One pattern for every silent action acknowledgement — Salin link, Simpan,
// Bagikan, Subscribe. Resolves audit UX-008 ("Salin link is silent"). The
// triggering button NEVER changes state; the toast is the entire ack — no
// icon swap, no inline "copied!", no spinner-to-check.
//
// Anatomy (from design_handoff_gibol_v1/js/primitives.jsx#ToastHost):
//   - Bottom-center, 24px from edge, max 3 stacked, oldest fades first
//   - Enters slide+fade 240ms ease-out; exits cross-fade 200ms
//   - 2400ms default; 3600ms if text > 28 chars; hover pauses
//   - aria-live="polite", aria-atomic="true" — announced once on mount
//   - Reduced motion: cross-fade only (no slide)
//   - Voice: past-tense Bahasa, no period — "Link tersalin", "Tersimpan ke
//     favorit", "Gagal menyalin link"
//
// Mount once at the app root:
//   <AppProvider><ToastHost />…</AppProvider>
//
// Fire from anywhere:
//   const { show } = useToast();
//   show({ text: 'Link tersalin', icon: 'link' });
// or (no context):
//   window.gibolToast?.show({ text: 'Link tersalin', icon: 'link' });
// ============================================================================

const ToastCtx = createContext({ show: () => {} });

function CheckIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5l5 5L20 6" />
    </svg>
  );
}
function LinkIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 1 0-5.6-5.6L11 7" />
      <path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 1 0 5.6 5.6L13 17" />
    </svg>
  );
}
function BellIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 6 1.5 6h-15S6 13 6 9z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
function WarnIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4l9.5 16.5h-19z" />
      <path d="M12 10v4M12 17.5v.5" />
    </svg>
  );
}

const ICONS = { check: CheckIcon, link: LinkIcon, bell: BellIcon, warn: WarnIcon };

// One-time keyframes injection — toasts ship anywhere, not just under
// [data-brand="paper"], so the animation isn't tied to that scope. The CSS
// includes a reduced-motion override that cross-fades without sliding.
let __toastKeyframesInjected = false;
function ensureToastKeyframes() {
  if (__toastKeyframesInjected) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById('gibol-toast-keyframes')) {
    __toastKeyframesInjected = true;
    return;
  }
  const el = document.createElement('style');
  el.id = 'gibol-toast-keyframes';
  el.textContent = `
@keyframes gibol-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes gibol-toast-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .gibol-toast-item { animation-name: gibol-toast-in-rm !important; }
}
@keyframes gibol-toast-in-rm {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;
  document.head.appendChild(el);
  __toastKeyframesInjected = true;
}

const DEFAULT_DURATION = 2400;
const LONG_DURATION = 3600;
const LONG_TEXT_THRESHOLD = 28;
const MAX_STACK = 3;

/**
 * <ToastHost /> — mount once at the app root. Listens to imperative
 * .show() calls and renders the toast stack. Exposes `window.gibolToast`
 * so legacy callers without context access can still fire.
 */
export function ToastHost() {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map());

  useEffect(() => {
    ensureToastKeyframes();
  }, []);

  const dismiss = useCallback((id) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const arm = useCallback(
    (id, duration) => {
      const tm = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, tm);
    },
    [dismiss],
  );

  const api = useMemo(() => {
    const show = (opts = {}) => {
      const text = opts.text || '';
      const id = ++idRef.current;
      const duration =
        opts.duration || (text.length > LONG_TEXT_THRESHOLD ? LONG_DURATION : DEFAULT_DURATION);
      setItems((xs) => {
        const next = [...xs, { id, text, icon: opts.icon, kind: opts.kind || 'success', duration }];
        // Cap stack — oldest gets dismissed first.
        if (next.length > MAX_STACK) {
          const dropped = next.slice(0, next.length - MAX_STACK);
          dropped.forEach((d) => {
            const tm = timersRef.current.get(d.id);
            if (tm) clearTimeout(tm);
            timersRef.current.delete(d.id);
          });
          return next.slice(-MAX_STACK);
        }
        return next;
      });
      arm(id, duration);
      return id;
    };
    const hide = (id) => dismiss(id);
    return { show, hide };
  }, [arm, dismiss]);

  useEffect(() => {
    if (typeof window !== 'undefined') window.gibolToast = api;
    return () => {
      if (typeof window !== 'undefined' && window.gibolToast === api) {
        delete window.gibolToast;
      }
    };
  }, [api]);

  // Pause auto-dismiss on hover; resume on leave.
  const pause = useCallback((id) => {
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);
  const resume = useCallback(
    (id, duration) => {
      // If the toast still exists in state, re-arm with the original duration.
      if (!timersRef.current.has(id)) arm(id, duration);
    },
    [arm],
  );

  return (
    <ToastCtx.Provider value={api}>
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 24,
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        {items.map((t) => (
          <ToastItem
            key={t.id}
            {...t}
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={() => resume(t.id, t.duration)}
            onDismiss={() => dismiss(t.id)}
          />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/**
 * <Toast /> — the visual primitive. Standalone-render-safe so docs / mocks
 * can use it without mounting the host. For real acknowledgements use
 * `useToast().show(...)` against a mounted <ToastHost />.
 */
export function Toast({ kind = 'success', icon, text }) {
  const Icon = typeof icon === 'string' ? ICONS[icon] : null;
  const isError = kind === 'error';
  return (
    <div
      role="status"
      style={{
        background: isError ? 'var(--error)' : 'var(--ink-1)',
        color: '#fff',
        padding: '10px 16px 10px 12px',
        borderRadius: 'var(--r-pill)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 500,
        boxShadow: 'var(--shadow-pop)',
      }}
    >
      {Icon ? <Icon /> : icon}
      <span>{text}</span>
    </div>
  );
}

function ToastItem({ kind, icon, text, duration, onMouseEnter, onMouseLeave, onDismiss }) {
  const Icon = typeof icon === 'string' ? ICONS[icon] : null;
  const isError = kind === 'error';
  return (
    <div
      role="status"
      className="gibol-toast-item"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onDismiss}
      style={{
        background: isError ? 'var(--error)' : 'var(--ink-1)',
        color: '#fff',
        padding: '10px 16px 10px 12px',
        borderRadius: 'var(--r-pill)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 500,
        boxShadow: 'var(--shadow-pop)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        animation: 'gibol-toast-in 240ms cubic-bezier(0.2, 0.7, 0.3, 1)',
      }}
    >
      {Icon ? <Icon /> : icon}
      <span>{text}</span>
    </div>
  );
}

/**
 * useToast — hook accessor. Falls back to `window.gibolToast` (set by
 * <ToastHost /> on mount) so consumers outside the React tree (event
 * handlers, async callbacks) keep working.
 */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (ctx && ctx.show !== ToastCtx._defaultShow) return ctx;
  if (typeof window !== 'undefined' && window.gibolToast) return window.gibolToast;
  return ctx;
}

export default ToastHost;
