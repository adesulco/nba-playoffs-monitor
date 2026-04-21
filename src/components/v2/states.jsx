import React from 'react';
import Icon from './Icon.jsx';
import V2Button from './Button.jsx';

// v2 B2 — per-surface states. Generic Skeleton / Empty / Error components
// per design handoff §4.9. Surfaces that need custom compositions
// (Fixtures empty, Bracket locked, etc.) import these primitives and
// assemble locally — design reference at gaps_states_legal.jsx.

/**
 * <SkeletonLine w="60%" h={10} />
 *
 * Single animated placeholder line. Pulses opacity 0.55 ↔ 0.9 at 1.4s.
 * Relies on the `sk` keyframe defined in index.css (injected below if
 * missing — idempotent).
 */
export function SkeletonLine({ w = '100%', h = 10, style, ...rest }) {
  ensureSkKeyframe();
  return (
    <div
      aria-hidden="true"
      style={{
        width: w,
        height: h,
        background: 'var(--bg-3)',
        borderRadius: 3,
        animation: 'v2sk 1.4s ease-in-out infinite',
        ...style,
      }}
      {...rest}
    />
  );
}

/**
 * <Skeleton lines={3} />
 *
 * Default skeleton block — three lines with descending widths. For custom
 * compositions (live game skeleton with crests, stats grid, etc.) use
 * SkeletonLine directly.
 */
export function Skeleton({ lines = 3, gap = 8, style, ...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }} {...rest}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} w={i === lines - 1 ? '55%' : i === 0 ? '80%' : '100%'} />
      ))}
    </div>
  );
}

/**
 * <EmptyState icon="Bookmark" title="No live games right now" hint="Check back at 20:00 WIB" cta={{ label: 'Browse fixtures →', onClick: ... }} />
 *
 * Default empty-state block — centered icon, title, one-line hint, optional
 * CTA. Copy is caller-owned so BI/EN text comes from the i18n layer, not
 * hardcoded here.
 */
export function EmptyState({ icon = 'Bookmark', title, hint, cta, style, ...rest }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '20px 12px',
        background: 'var(--bg-3)',
        borderRadius: 6,
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          display: 'inline-flex',
          padding: 10,
          borderRadius: '50%',
          background: 'var(--bg-2)',
          color: 'var(--ink-3)',
          marginBottom: 10,
        }}
      >
        <Icon name={icon} size={18} />
      </div>
      {title && (
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      )}
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: cta ? 10 : 0 }}>
          {hint}
        </div>
      )}
      {cta && (
        <V2Button onClick={cta.onClick} variant={cta.variant || 'default'}>
          {cta.label}
        </V2Button>
      )}
    </div>
  );
}

/**
 * <ErrorState message="Feed disconnected" detail="Last tick 42s ago" onRetry={() => ...} />
 *
 * Default error block — 3px LIVE red left border, plain-language message,
 * optional detail, Retry link-button. Pass `onRetry={null}` to suppress the
 * retry affordance for unrecoverable errors.
 */
export function ErrorState({ message, detail, onRetry, retryLabel = 'Retry', style, ...rest }) {
  return (
    <div
      role="alert"
      style={{
        borderLeft: '3px solid var(--live)',
        paddingLeft: 10,
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--live)',
          }}
        />
        <div style={{ fontSize: 12, fontWeight: 600 }}>{message}</div>
      </div>
      {detail && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: onRetry ? 8 : 0 }}>
          {detail}
        </div>
      )}
      {onRetry && (
        <V2Button onClick={onRetry} size="sm">
          ↻ {retryLabel}
        </V2Button>
      )}
    </div>
  );
}

// ── internals ──

let skInjected = false;
function ensureSkKeyframe() {
  if (skInjected) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById('v2-sk-keyframes')) {
    skInjected = true;
    return;
  }
  const el = document.createElement('style');
  el.id = 'v2-sk-keyframes';
  el.textContent = '@keyframes v2sk{0%,100%{opacity:.55}50%{opacity:.9}}';
  document.head.appendChild(el);
  skInjected = true;
}
