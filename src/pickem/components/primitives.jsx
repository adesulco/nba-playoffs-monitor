import React from 'react';
import { LockIcon, StarIcon } from '../icons.jsx';

// ============================================================================
// v0.67.0 — Pick'em P2 match-predictor primitives.
//
// Small, self-contained components ported from
// design-handoff-pickem/js/components.jsx #1-7. Composed into
// <FixtureCard /> in ../components/FixtureCard.jsx. All read paper +
// stadium tokens from .pickem-root scope (no inline hex).
//
// Exports:
//   <StatePill state kickoff />               #1
//   <ProbabilityChip value label />           #2
//   <LockCountdown value urgent />            #3
//   <ScoreStepper value onChange size />      #4
//   <JagoanToggle active onClick compact />   #5
//   <OutcomePicker odds value onChange hint />#6
//   <PointsPill value tone big />             #7
//   <ScoreBreakdown base jagoan upset />      #7
// ============================================================================

// ── 1. StatePill ───────────────────────────────────────────────────────────

const STATE_LABELS = {
  open:   { l: 'TERBUKA',         fg: 'var(--pickem-orange)' },
  locked: { l: 'TERKUNCI',        fg: 'var(--ink-3)' },
  scored: { l: 'SELESAI',         fg: 'var(--ink-3)' },
  missed: { l: 'TIDAK DIPREDIKSI', fg: 'var(--ink-3)' },
  soon:   { l: 'SEGERA',          fg: 'var(--ink-3)' },
};

export function StatePill({ state, kickoff }) {
  if (state === 'live') {
    return (
      <span
        role="status"
        aria-live="polite"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 9px 3px 8px',
          borderRadius: 999,
          background: 'var(--p-live-wash)',
          color: 'var(--p-live)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.10em',
        }}
      >
        <span className="p-live-dot" />
        LIVE
      </span>
    );
  }
  const meta = STATE_LABELS[state] || { l: String(state).toUpperCase(), fg: 'var(--ink-3)' };
  // 'open' is the only state where we replace the label with the kickoff
  // time when the caller supplies one (e.g. "21:00 WIB").
  const label = state === 'open' && kickoff ? kickoff : meta.l;
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.10em',
        color: meta.fg,
      }}
    >
      {label}
    </span>
  );
}

// ── 2. ProbabilityChip ─────────────────────────────────────────────────────

/**
 * Implied-probability chip — e.g. "MNG 64%", "SRI 22%", "KLH 14%".
 * `value` is the integer percentage; `label` the short outcome code.
 * Neutral framing — never "odds" or "stake" (legal: spec §2.2 / §7.3).
 */
export function ProbabilityChip({ value, label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 999,
        background: 'var(--bg-deep)',
        color: 'var(--ink-2)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {label && <span style={{ color: 'var(--ink-3)' }}>{label}</span>}
      {value}%
    </span>
  );
}

// ── 3. LockCountdown ───────────────────────────────────────────────────────

/**
 * Pre-lock countdown — "2j 15m" / "8m 42d". `urgent` flips color to live
 * amber when the lock is < 1 hour away.
 */
export function LockCountdown({ value, urgent }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontWeight: 700,
        color: urgent ? 'var(--p-live)' : 'var(--ink-2)',
        letterSpacing: '0.02em',
      }}
    >
      <LockIcon size={11} />
      {value}
    </span>
  );
}

// ── 4. ScoreStepper ────────────────────────────────────────────────────────

const STEP_BTN_STYLE = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--ink-2)',
  fontFamily: 'var(--font-ui-pickem)',
};

/**
 * <ScoreStepper value={2} onChange={n => …} /> — mono numeric stepper for
 * exact-score input. Floors at 0, no upper cap (the API enforces 0..99).
 * size='lg' bumps the buttons to 36px for the fixture-detail screen.
 */
export function ScoreStepper({ value = 0, onChange, size = 'md', minValue = 0, maxValue = 20, ariaLabel }) {
  const dims = size === 'lg' ? { btn: 36, w: 24, fs: 16 } : { btn: 30, w: 20, fs: 14 };
  const clamp = (n) => Math.max(minValue, Math.min(maxValue, n));
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--bg-base)',
        borderRadius: 8,
        border: '1px solid var(--line-2)',
      }}
    >
      <button
        type="button"
        aria-label="Kurangi skor"
        onClick={() => onChange?.(clamp(value - 1))}
        style={{ ...STEP_BTN_STYLE, width: dims.btn, height: dims.btn }}
      >
        −
      </button>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: dims.fs,
          minWidth: dims.w,
          textAlign: 'center',
          padding: '0 4px',
          color: 'var(--ink-1)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Tambah skor"
        onClick={() => onChange?.(clamp(value + 1))}
        style={{ ...STEP_BTN_STYLE, width: dims.btn, height: dims.btn }}
      >
        +
      </button>
    </div>
  );
}

// ── 5. JagoanToggle ────────────────────────────────────────────────────────

/**
 * <JagoanToggle active onClick /> — the §5.2 banker pill.
 * `compact` renders the read-only "✦ ×2" chip used on locked/scored cards.
 * Active state on a CTA pill = strong contrast (filled pickem-orange).
 */
export function JagoanToggle({ active, onClick, compact, koMult = 2 }) {
  if (compact) {
    if (!active) return null;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 999,
          background: 'var(--pickem-orange-wash)',
          color: 'var(--pickem-orange)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        <StarIcon filled size={11} />×{koMult}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Tandai jagoan matchday"
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 999,
        minHeight: 40,
        cursor: 'pointer',
        background: active ? 'var(--pickem-orange)' : 'transparent',
        color: active ? '#0A1628' : 'var(--pickem-orange)',
        border: '1px solid ' + (active ? 'var(--pickem-orange)' : 'var(--pickem-orange-soft)'),
        fontFamily: 'var(--font-ui-pickem)',
        fontWeight: 600,
        fontSize: 13,
        transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
      }}
    >
      <StarIcon filled={active} size={13} />
      Jagoan{active && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>×{koMult}</span>}
    </button>
  );
}

// ── 6. OutcomePicker ───────────────────────────────────────────────────────

/**
 * <OutcomePicker odds value onChange /> — the 1X2 picker (Menang / Seri /
 * Kalah). Self-labelling: shows Bahasa label, market probability, and the
 * tier code (1 / X / 2). aria-radiogroup with aria-checked.
 *
 * `odds` shape: { home, draw, away } — integer percentages.
 * `value`: 'H' | 'D' | 'A' (the spec code, also what the API expects).
 */
const OUTCOME_OPTS = [
  { value: 'H', code: '1', label: 'Menang', oddsKey: 'home' },
  { value: 'D', code: 'X', label: 'Seri',   oddsKey: 'draw' },
  { value: 'A', code: '2', label: 'Kalah',  oddsKey: 'away' },
];

export function OutcomePicker({ odds = {}, value, onChange, hint, disabled }) {
  return (
    <div
      role="radiogroup"
      aria-label={hint || 'Hasil pertandingan'}
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}
    >
      {OUTCOME_OPTS.map((o) => {
        const sel = value === o.value;
        const prob = odds[o.oddsKey];
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={sel}
            disabled={disabled}
            onClick={() => onChange?.(o.value)}
            style={{
              appearance: 'none',
              cursor: disabled ? 'default' : 'pointer',
              border: '1px solid ' + (sel ? 'var(--pickem-orange)' : 'var(--line-2)'),
              background: sel ? 'var(--pickem-orange)' : 'transparent',
              color: sel ? '#0A1628' : 'var(--ink-1)',
              padding: '10px 8px',
              borderRadius: 10,
              minHeight: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              fontFamily: 'var(--font-ui-pickem)',
              transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
              opacity: disabled ? 0.55 : 1,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                opacity: 0.75,
                letterSpacing: '0.10em',
              }}
            >
              {o.code}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{o.label}</span>
            {prob != null && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, opacity: 0.8 }}>
                {prob}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── 7. PointsPill + ScoreBreakdown ─────────────────────────────────────────

/**
 * <PointsPill value /> — large mono +N pill in pulse-green / error-red.
 * Used on scored cards + the post-matchday recap.
 */
export function PointsPill({ value, tone = 'up', big }) {
  const color =
    tone === 'up' ? 'var(--p-up)' : tone === 'down' ? 'var(--p-down)' : 'var(--ink-1)';
  const sign = value > 0 ? '+' : '';
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: big ? 32 : 24,
        color,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {sign}{value}
    </span>
  );
}

/**
 * <ScoreBreakdown base jagoan upset /> — audit ladder shown under the
 * PointsPill on scored cards. Each non-zero multiplier appears as its
 * own segment so the user understands WHY they got 35 not 8.
 *
 * `base`     — pts_outcome / pts_goaldiff / pts_exact (3 / 5 / 8)
 * `jagoan`   — jagoan_mult_applied (numeric); chip hidden when ≤1
 * `upset`    — upset_mult_applied (numeric); chip hidden when ≤1
 */
export function ScoreBreakdown({ base = 0, jagoan = 1, upset = 1 }) {
  const fmt = (n) => (Number.isInteger(n) ? n : Number(n).toFixed(1).replace(/\.0$/, ''));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--ink-3)',
      }}
    >
      <span>Dasar {base}</span>
      {jagoan > 1 && (
        <span style={{ color: 'var(--pickem-orange)' }}>× Jagoan {fmt(jagoan)}</span>
      )}
      {upset > 1 && (
        <span style={{ color: 'var(--pickem-orange)' }}>× Upset {fmt(upset)}</span>
      )}
    </div>
  );
}
