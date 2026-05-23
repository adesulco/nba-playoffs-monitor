import React from 'react';

// ============================================================================
// v0.68.0 — Pick'em P3 social primitives.
//
// Components needed by /pickem/board + /pickem/grup/* — ported from
// design-handoff-pickem/js/components.jsx #9-#12 + #15-#16.
//
// Exports:
//   <RankBadge rank movement />     #9 (sub)
//   <LeaderboardRow row you />      #9
//   <GrupCard grup onClick />       #10
//   <EmptyState icon title body action tone />  #11
//   <PickemBtn variant size icon full /> #12
//   <Tabs tabs active onChange />   #15
//   <SegmentedPicker items active onChange />   #16
// ============================================================================

// ── #9 RankBadge + LeaderboardRow ──────────────────────────────────────────

export function RankBadge({ rank, movement }) {
  const mc = movement > 0 ? 'var(--p-up)' : movement < 0 ? 'var(--p-down)' : 'var(--ink-3)';
  const ma = movement > 0 ? '▲' : movement < 0 ? '▼' : '·';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 38 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--ink-1)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        #{rank}
      </span>
      {movement != null && movement !== 0 && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: mc,
            marginTop: 3,
          }}
        >
          {ma} {Math.abs(movement)}
        </span>
      )}
    </div>
  );
}

/**
 * <LeaderboardRow row you onClick podium /> — one row in any of the
 * three leaderboard views (competition/league/matchday).
 *
 * `row` shape (from list-leaderboard):
 *   { rank, user_id, username, avatar_url, points,
 *     exact_count, matchday_rank?, previous_rank? }
 *
 * `you` highlights the row (pickem-orange wash + left border + "KAMU" tag).
 * `podium` adds 🥇🥈🥉 to ranks 1-3 (use only for global board top).
 */
export function LeaderboardRow({ row, you = false, onClick, podium = false }) {
  const movement =
    row.previous_rank != null && row.matchday_rank != null
      ? row.previous_rank - row.matchday_rank
      : null;
  const name = row.username || row.user_id?.slice(0, 8) || 'Pemain';
  const accuracy = row.accuracy ?? null;

  const cell = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {podium && row.rank <= 3 && (
          <span style={{ fontSize: 18 }}>
            {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : '🥉'}
          </span>
        )}
        <RankBadge rank={row.rank} movement={movement} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: you ? 700 : 600,
            color: 'var(--ink-1)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
          {you && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--pickem-orange)',
                fontSize: 10,
                letterSpacing: '0.1em',
                marginLeft: 6,
              }}
            >
              KAMU
            </span>
          )}
        </div>
        <div
          style={{
            color: 'var(--ink-3)',
            fontSize: 11,
            marginTop: 2,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {(row.exact_count ?? 0)} skor pas
          {accuracy != null ? ` · akurasi ${accuracy}%` : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--ink-1)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Number(row.points || 0).toLocaleString('id-ID')}
        </div>
        <div
          style={{
            color: 'var(--ink-3)',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
          }}
        >
          poin
        </div>
      </div>
    </>
  );

  const baseStyle = {
    display: 'grid',
    gridTemplateColumns: '52px 1fr auto',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: you ? 'var(--pickem-orange-wash)' : 'transparent',
    borderLeft: you ? '3px solid var(--pickem-orange)' : '3px solid transparent',
    borderBottom: '1px solid var(--line-1)',
    fontFamily: 'var(--font-ui-pickem)',
    color: 'var(--ink-1)',
    width: '100%',
    textAlign: 'left',
  };

  if (onClick) {
    return (
      <button type="button" onClick={() => onClick(row)} style={{ ...baseStyle, border: 'none', cursor: 'pointer' }}>
        {cell}
      </button>
    );
  }
  return <div style={baseStyle}>{cell}</div>;
}

// ── #10 GrupCard ───────────────────────────────────────────────────────────

/**
 * <GrupCard grup onClick /> — one grup in the user's grup list.
 *
 * `grup` shape:
 *   { id, name, members, rank, movement, color?, initial? }
 */
export function GrupCard({ grup, onClick }) {
  const movementColor =
    grup.movement > 0 ? 'var(--p-up)' : grup.movement < 0 ? 'var(--p-down)' : 'var(--ink-3)';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        padding: '14px 16px',
        background: 'var(--bg-raised)',
        border: '1px solid var(--line-1)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: 'var(--ink-1)',
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: grup.color || 'var(--pickem-orange-wash)',
          color: grup.colorFg || 'var(--pickem-orange)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {(grup.initial || grup.name?.charAt(0) || 'G').toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--ink-1)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {grup.name}
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2 }}>
          {grup.members} anggota{grup.rank != null ? ` · #${grup.rank} dari ${grup.members}` : ''}
        </div>
      </div>
      {grup.movement != null && (
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              color: movementColor,
            }}
          >
            {grup.movement > 0 ? '+' : ''}{grup.movement}
          </div>
          <div
            style={{
              color: 'var(--ink-3)',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
            }}
          >
            pekan ini
          </div>
        </div>
      )}
    </button>
  );
}

// ── #11 EmptyState ─────────────────────────────────────────────────────────

const EMPTY_TONES = {
  default: { bg: 'var(--bg-raised)', border: 'var(--line-1)' },
  soon:    { bg: 'var(--p-info-wash)', border: 'rgba(42, 111, 219, 0.30)' },
  error:   { bg: 'var(--p-down-wash)', border: 'rgba(184, 52, 31, 0.30)' },
};

/**
 * <EmptyState icon title body action tone /> — generic empty surface.
 * tone='soon' uses the info wash for "Mainan baru, isi nanti" copy;
 * tone='error' uses the error wash.
 */
export function EmptyState({ icon, title, body, action, tone = 'default' }) {
  const t = EMPTY_TONES[tone] || EMPTY_TONES.default;
  return (
    <div
      style={{
        padding: '32px 20px',
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        textAlign: 'center',
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      {icon && <div style={{ fontSize: 32, marginBottom: 8 }} aria-hidden="true">{icon}</div>}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--ink-1)',
          marginBottom: body ? 6 : action ? 14 : 0,
        }}
      >
        {title}
      </div>
      {body && (
        <div
          style={{
            color: 'var(--ink-2)',
            fontSize: 13,
            marginBottom: action ? 14 : 0,
            maxWidth: 320,
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          {body}
        </div>
      )}
      {action}
    </div>
  );
}

// ── #12 PickemBtn ──────────────────────────────────────────────────────────

const BTN_SIZES = {
  sm: { p: '8px 14px', fs: 13, h: 36 },
  md: { p: '12px 18px', fs: 14, h: 44 },
  lg: { p: '14px 22px', fs: 15, h: 52 },
};
const BTN_VARIANTS = {
  primary:   { bg: 'var(--pickem-orange)', fg: '#0A1628',         border: 'transparent' },
  secondary: { bg: 'transparent',          fg: 'var(--ink-1)',    border: 'var(--line-2)' },
  ghost:     { bg: 'transparent',          fg: 'var(--ink-2)',    border: 'transparent' },
  inverse:   { bg: 'var(--ink-1)',         fg: 'var(--bg-base)',  border: 'transparent' },
};

/**
 * <PickemBtn variant size icon full /> — the canonical Pick'em button.
 * variant: 'primary' (default) | 'secondary' | 'ghost' | 'inverse'
 * size:    'sm' | 'md' (default) | 'lg'
 */
export function PickemBtn({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  full,
  type = 'button',
  disabled,
  onClick,
  ...rest
}) {
  const s = BTN_SIZES[size] || BTN_SIZES.md;
  const v = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.border}`,
        padding: s.p,
        borderRadius: 999,
        minHeight: s.h,
        fontSize: s.fs,
        fontFamily: 'var(--font-ui-pickem)',
        fontWeight: 700,
        display: full ? 'flex' : 'inline-flex',
        width: full ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : 1,
        transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
      }}
      {...rest}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

// ── #15 Tabs ───────────────────────────────────────────────────────────────

/**
 * <Tabs tabs active onChange /> — underline tabs.
 * `tabs`: [{ k, l, count? }]
 */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--line-1)',
        padding: '0 16px',
        overflowX: 'auto',
      }}
    >
      {tabs.map((t) => {
        const sel = active === t.k;
        return (
          <button
            key={t.k}
            type="button"
            role="tab"
            aria-selected={sel}
            onClick={() => onChange?.(t.k)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '12px 4px',
              position: 'relative',
              whiteSpace: 'nowrap',
              color: sel ? 'var(--ink-1)' : 'var(--ink-3)',
              fontFamily: 'var(--font-ui-pickem)',
              fontSize: 14,
              fontWeight: sel ? 700 : 500,
              marginRight: 18,
            }}
          >
            {t.l}
            {t.count != null && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  marginLeft: 4,
                  color: 'var(--ink-3)',
                }}
              >
                {t.count}
              </span>
            )}
            {sel && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -1,
                  height: 2,
                  background: 'var(--pickem-orange)',
                  borderRadius: 1,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── #16 SegmentedPicker ────────────────────────────────────────────────────

// ── #17 StreakFlame ────────────────────────────────────────────────────────

/**
 * <StreakFlame days /> — mono flame chip showing the user's current
 * consecutive-matchday streak. Per spec §9 — "Streaks: Consecutive
 * match-days with predictions submitted → a streak counter + small
 * streak bonus. The habit loop; losing a streak hurts, so people come
 * back."
 */
export function StreakFlame({ days }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--p-live)',
      }}
    >
      🔥 {days}
    </span>
  );
}

// ── #18 Badge ──────────────────────────────────────────────────────────────

/**
 * <Badge icon label sublabel locked color /> — one tile in the profile
 * badge gallery. `locked` greys + de-saturates the badge. Status
 * currency per spec §9 — the legal/on-brand reward currency.
 */
export function Badge({ icon, label, sublabel, locked = false, color = 'var(--pickem-orange)' }) {
  return (
    <div
      style={{
        padding: '14px 8px',
        borderRadius: 12,
        background: 'var(--bg-raised)',
        border: '1px solid var(--line-1)',
        textAlign: 'center',
        opacity: locked ? 0.45 : 1,
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          fontSize: 30,
          marginBottom: 4,
          filter: locked ? 'grayscale(1)' : 'none',
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: locked ? 'var(--ink-2)' : 'var(--ink-1)',
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

/**
 * <SegmentedPicker items active onChange /> — compact segmented control.
 * `items`: [{ k, l }]
 */
export function SegmentedPicker({ items, active, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        background: 'var(--bg-deep)',
        padding: 3,
        borderRadius: 10,
        gap: 2,
      }}
    >
      {items.map((it) => {
        const sel = active === it.k;
        return (
          <button
            key={it.k}
            type="button"
            role="tab"
            aria-selected={sel}
            onClick={() => onChange?.(it.k)}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '8px 14px',
              borderRadius: 8,
              minHeight: 34,
              background: sel ? 'var(--bg-raised)' : 'transparent',
              color: sel ? 'var(--ink-1)' : 'var(--ink-3)',
              fontFamily: 'var(--font-ui-pickem)',
              fontSize: 13,
              fontWeight: sel ? 700 : 500,
            }}
          >
            {it.l}
          </button>
        );
      })}
    </div>
  );
}
