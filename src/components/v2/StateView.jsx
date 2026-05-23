import React from 'react';

// ============================================================================
// v0.63.0 — <StateView> · the A1 fix from the paper-grey design port.
//
// Every data surface (match center tabs, standings, fixtures, search results,
// club hub stats, derby surfaces…) routes through one component that takes a
// `state` prop. Six states, exhaustive — no others:
//
//   loading       Data is in-flight. Skeleton rows matching the eventual
//                 layout, aria-busy="true", visually-hidden "Memuat…".
//                 Skeleton stays ≤ 8s; if the request exceeds that, callers
//                 transition to state="error".
//   empty-yet     Truthfully empty, will eventually have data (fixtures not
//                 yet played, news for tonight's match). Hopeful copy.
//   empty-na     No data because the question doesn't apply (no bracket for
//                 a no-bracket sport, no head-to-head against a never-played
//                 opponent). Plain, structural — not announced.
//   partial      Some data loaded, some sources failed. Warn-tinted strip
//                 that ships BELOW real content — never replaces the page.
//   error        Hard failure (5xx, network, timeout). role="alert",
//                 retry CTA. After 2 silent retries, surface this view.
//   coming-soon  Feature gated / waitlist. Info-tinted, **mandatory ETA**
//                 (month minimum). "Segera hadir" without an ETA window is
//                 a content violation — dev warns in console.
//
// Replaces every bespoke "loading…" text / empty fallback / error message
// across the app as surfaces migrate in P5. Resolves audit cluster:
// FUNC-004, FUNC-007, UX-003 (and supersedes the v0.62.5 data-layer fix
// for FUNC-007 with the "never empty over real data" guarantee).
//
// Honors prefers-reduced-motion via the .g-skel / .pulse-dot classes
// defined in src/index.css.
//
// Anatomy from design_handoff_gibol_v1/js/states.jsx:
//   <StatePanel { tone, icon, eyebrow, title, body, action, mono, sport } />
//   <SkelRow pad={number} />
// ============================================================================

// ---- Inline icons (self-contained — no Icon dependency) ----

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function ClockIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function MinusIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...iconProps} aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}
function WarnIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...iconProps} aria-hidden="true">
      <path d="M12 3.5 21 19H3z" />
      <path d="M12 10v5M12 18v.5" />
    </svg>
  );
}
function AlertIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...iconProps} strokeWidth={1.7} aria-hidden="true">
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v5M12 18v.5" />
    </svg>
  );
}
function RefreshIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...iconProps} aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
function TrophyIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...iconProps} aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M5 5h3v3a3 3 0 0 1-3-3z" />
      <path d="M19 5h-3v3a3 3 0 0 0 3-3z" />
      <path d="M9 14h6l-1 3h-4z" />
      <path d="M8 20h8" />
    </svg>
  );
}

// ---- StatePanel — the panel primitive ----

const TONES = {
  default: { bg: 'var(--bg-raised)', border: 'var(--line-1)',           accent: 'var(--ink-3)'    },
  sport:   { bg: 'var(--sport-wash)', border: 'var(--sport-soft)',       accent: 'var(--sport-deep)' },
  warn:    { bg: 'var(--warn-wash)',  border: 'rgba(197,141,44,0.35)',   accent: 'var(--warn)'     },
  error:   { bg: 'var(--error-wash)', border: 'rgba(184,52,31,0.30)',    accent: 'var(--error)'    },
  info:    { bg: 'var(--info-wash)',  border: 'rgba(42,111,219,0.30)',   accent: 'var(--info)'     },
  mute:    { bg: 'var(--bg-deep)',    border: 'var(--line-1)',           accent: 'var(--ink-3)'    },
};

/**
 * <StatePanel /> — the panel anatomy used by every non-loading state.
 * Tone selects the bg/border/accent triad; everything else is content.
 *
 * Props:
 *   tone      one of 'default' | 'sport' | 'warn' | 'error' | 'info' | 'mute'
 *   icon      ReactNode (28px SVG recommended; rendered in `accent` color)
 *   eyebrow   short uppercase string (mono, in `accent`)
 *   title     primary line — Bahasa, sentence-case
 *   body      one-line explanation — Bahasa, secondary ink
 *   action    ReactNode (button), rendered last
 *   mono      monospace footer (e.g. "JADWAL · KAM 22 MEI · 19:30")
 *   sport     optional data-sport value — retints the subtree
 *   role      aria role (defaulted by StateView)
 *   ariaLive  aria-live politeness (defaulted by StateView)
 */
export function StatePanel({
  tone = 'default',
  icon,
  eyebrow,
  title,
  body,
  action,
  mono,
  sport,
  role,
  ariaLive,
}) {
  const t = TONES[tone] || TONES.default;
  return (
    <div
      data-sport={sport}
      role={role}
      aria-live={ariaLive}
      style={{
        background: t.bg,
        border: `1px dashed ${t.border}`,
        borderRadius: 'var(--r-3)',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        textAlign: 'center',
      }}
    >
      {icon != null && (
        <div
          style={{
            color: t.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 28,
          }}
        >
          {icon}
        </div>
      )}
      {eyebrow && <div className="t-eyebrow" style={{ color: t.accent }}>{eyebrow}</div>}
      {title && <div className="t-h3" style={{ color: 'var(--ink-1)' }}>{title}</div>}
      {body && (
        <div className="t-bodysm" style={{ color: 'var(--ink-2)', maxWidth: 280 }}>
          {body}
        </div>
      )}
      {mono && (
        <div className="g-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {mono}
        </div>
      )}
      {action}
    </div>
  );
}

// ---- SkelRow — the loading-state skeleton primitive ----

/**
 * <SkelRow /> — one skeleton row matching the eventual layout shape
 * (36px crest + two text lines + small trailing chunk). Surfaces with
 * a different row shape should pass a custom `skeletonRow` to
 * <StateView> instead. Reduced-motion freezes via .g-skel CSS.
 */
export function SkelRow({ pad = 14 }) {
  return (
    <div
      style={{
        padding: pad,
        borderBottom: '1px solid var(--line-1)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div className="g-skel" style={{ width: 36, height: 36, borderRadius: '50%' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="g-skel" style={{ height: 12, width: '60%' }} />
        <div className="g-skel" style={{ height: 10, width: '40%' }} />
      </div>
      <div className="g-skel" style={{ width: 28, height: 14 }} />
    </div>
  );
}

// Visually-hidden helper — used for the loading announcement.
const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

// ---- StateView — the six-state dispatcher ----

const DEFAULTS = {
  'empty-yet': {
    tone: 'default',
    Icon: ClockIcon,
    eyebrow: 'BELUM ADA',
    title: 'Belum ada data',
    body: null,
    role: 'status',
    ariaLive: 'polite',
  },
  'empty-na': {
    tone: 'mute',
    Icon: MinusIcon,
    eyebrow: null,
    title: 'Tidak berlaku',
    body: null,
    role: null,
    ariaLive: null,
  },
  partial: {
    tone: 'warn',
    Icon: WarnIcon,
    eyebrow: 'SEBAGIAN',
    title: 'Sebagian data siap',
    body: null,
    role: 'status',
    ariaLive: 'polite',
  },
  error: {
    tone: 'error',
    Icon: AlertIcon,
    eyebrow: 'GAGAL DIMUAT',
    title: 'Gagal memuat',
    body: 'Koneksi atau servernya yang ngambek. Coba lagi sebentar.',
    role: 'alert',
    ariaLive: 'assertive',
  },
  'coming-soon': {
    tone: 'info',
    Icon: TrophyIcon,
    eyebrow: null, // derived from `eta` prop
    title: 'Segera hadir',
    body: null,
    role: 'region',
    ariaLive: 'polite',
  },
};

/**
 * <StateView state={...} ... /> — the canonical state component.
 *
 * Replaces every ad-hoc loading/empty/error/partial/coming-soon
 * surface in the app. Six states (exhaustive). Skeleton + role +
 * aria-live + reduced-motion all handled per state.
 *
 * Usage examples:
 *
 *   // loading — match-shape skeleton rows
 *   <StateView state="loading" skeletonRows={5} />
 *
 *   // empty-yet — hopeful, with next-event hint
 *   <StateView
 *     state="empty-yet"
 *     title="Belum ada statistik pemain"
 *     body="Data muncul saat pertandingan dimulai jam 19.30 WIB."
 *     mono="JADWAL · KAM 22 MEI · 19:30"
 *   />
 *
 *   // partial — renders BELOW real content, never replaces it
 *   <>
 *     <RealContent />
 *     <StateView state="partial" body="Klub belum rilis line-up." onRetry={refetch} />
 *   </>
 *
 *   // error
 *   <StateView state="error" onRetry={refetch} />
 *
 *   // coming-soon — `eta` is MANDATORY (month minimum)
 *   <StateView
 *     state="coming-soon"
 *     eta="Hadir Juni 2026"
 *     title="Piala Dunia 2026 · waitlist"
 *     body="Mode pertandingan, bracket, dan jadwal nyala saat draw resmi diumumkan FIFA."
 *     action={<button className="g-btn g-btn--sport g-btn--sm">Ingatkan saya</button>}
 *     sport="worldcup"
 *   />
 */
export default function StateView({
  state,
  // loading
  skeletonRows = 3,
  skeletonRow,
  // panel content (per-state defaults + overrides)
  tone,
  icon,
  eyebrow,
  title,
  body,
  mono,
  action,
  // error / partial convenience
  onRetry,
  retryLabel = 'Coba lagi',
  // coming-soon
  eta,
  // sport tinting
  sport,
}) {
  // ---- loading: skeleton rows + aria-busy ----
  if (state === 'loading') {
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        style={{
          background: 'var(--bg-raised)',
          borderRadius: 'var(--r-3)',
          overflow: 'hidden',
          border: '1px solid var(--line-1)',
        }}
        data-sport={sport}
      >
        <span style={VISUALLY_HIDDEN}>Memuat…</span>
        {Array.from({ length: skeletonRows }).map((_, i) =>
          skeletonRow ? (
            <React.Fragment key={i}>{skeletonRow}</React.Fragment>
          ) : (
            <SkelRow key={i} />
          ),
        )}
      </div>
    );
  }

  const cfg = DEFAULTS[state];
  if (!cfg) {
    // Dev-only — keep the prop surface honest. Falls through to a plain
    // empty render so a typo doesn't crash the page.
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `[StateView] Unknown state="${state}". Expected one of: loading, empty-yet, empty-na, partial, error, coming-soon.`,
      );
    }
    return null;
  }

  // coming-soon requires an ETA window — handoff policy ("must include
  // month or date — no ETA-free Segera hadir allowed"). Dev warn so the
  // contract is enforced in code; copy policy itself lives in CMS.
  if (
    state === 'coming-soon' &&
    !eta &&
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV !== 'production'
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      '[StateView] state="coming-soon" requires an `eta` prop (month or date). "Segera hadir" without an ETA is a content violation.',
    );
  }

  const effectiveTone = tone || cfg.tone;
  const IconCmp = cfg.Icon;
  const effectiveIcon = icon !== undefined ? icon : IconCmp ? <IconCmp /> : null;
  const effectiveEyebrow =
    eyebrow !== undefined ? eyebrow : state === 'coming-soon' ? (eta || null) : cfg.eyebrow;
  const effectiveTitle = title !== undefined ? title : cfg.title;
  const effectiveBody = body !== undefined ? body : cfg.body;

  // Default action: retry button for error / partial when onRetry is given.
  let effectiveAction = action;
  if (effectiveAction === undefined && onRetry && (state === 'error' || state === 'partial')) {
    effectiveAction = (
      <button
        type="button"
        className={
          state === 'error' ? 'g-btn g-btn--primary g-btn--sm' : 'g-btn g-btn--ghost g-btn--sm'
        }
        onClick={onRetry}
        style={{ marginTop: 6 }}
      >
        <RefreshIcon size={14} /> {retryLabel}
      </button>
    );
  }

  return (
    <StatePanel
      tone={effectiveTone}
      icon={effectiveIcon}
      eyebrow={effectiveEyebrow}
      title={effectiveTitle}
      body={effectiveBody}
      mono={mono}
      action={effectiveAction}
      sport={sport}
      role={cfg.role}
      ariaLive={cfg.ariaLive}
    />
  );
}
