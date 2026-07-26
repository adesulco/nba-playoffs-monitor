/**
 * The 6 Sistem 4a primitives — R1-4 (v0.82.0).
 *
 * Design contract (README §Components / canvas #5a): every sport uses
 * exactly these six, and per-sport differences live ONLY in the skin
 * config (sportSkins.js). These are presentation-only — they take data
 * and callbacks, never fetch, so R2's screens can compose them against
 * the src/pickem/api.js seam.
 *
 *   1. MatchCard      — teams + pick row (1/X/2 or sport equivalent) + ★
 *   2. PickChip       — 5 states: default / selected / locked / correct / missed
 *   3. LeaderboardRow — rank · avatar · name (+kamu / belum pick) · streak · points
 *   4. LiveTile       — 4px sport left border, status, score, personal pick status
 *   5. KabarCard      — 3px sport top border, category+time, headline, pick-hook CTA
 *   6. LockBadge      — countdown (ink fill) → "terkunci" (ink outline)
 *
 * Copy is caller-supplied so screens keep the EN-default + ID-key
 * discipline; the only strings baked in here are the named mechanics and
 * badges the design fixes verbatim ("kamu", "belum pick", "terkunci").
 */

import { IconStar, IconLock, IconLiveDot, IconChevronRight } from './icons4a.jsx';

const displayFont = 'var(--g4-font-display)';
const uiFont = 'var(--g4-font-ui)';

/* ══ 2. PickChip ═══════════════════════════════════════════════════════
   The 5 states are exact, from canvas #5a:
     default  — 1.5px ink border, transparent
     selected — scarlet fill, white text
     locked   — locked-chip bg + 🔒, muted text
     correct  — green fill, "+3"
     missed   — red tint bg, red text, "0"
   `state` is explicit rather than derived so a screen can render any
   state without faking data (and /dev/primitives can show all five). */
export function PickChip({
  state = 'default',
  children,
  onClick,
  size = 'md',
  block = false,
  ...rest
}) {
  const pad = size === 'sm' ? '4px 9px' : size === 'lg' ? '10px 16px' : '8px 14px';
  const font = size === 'sm' ? 9 : size === 'lg' ? 13 : 12;

  const skins = {
    default: {
      background: 'transparent',
      color: 'var(--g4-text)',
      border: '1.5px solid var(--g4-text)',
    },
    selected: {
      background: 'var(--g4-scarlet)',
      color: '#fff',
      border: '1.5px solid var(--g4-scarlet)',
    },
    locked: {
      background: 'var(--g4-locked-chip-bg)',
      color: 'var(--g4-locked-chip-fg)',
      border: '1.5px solid transparent',
    },
    correct: {
      background: 'var(--g4-win)',
      color: '#fff',
      border: '1.5px solid var(--g4-win)',
    },
    missed: {
      background: 'var(--g4-lose-bg)',
      color: 'var(--g4-lose)',
      border: '1.5px solid transparent',
    },
  };
  const skinStyle = skins[state] || skins.default;
  const interactive = typeof onClick === 'function' && state !== 'locked';

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      aria-pressed={state === 'selected' ? true : state === 'default' ? false : undefined}
      style={{
        appearance: 'none',
        borderRadius: 'var(--g4-radius-pill)',
        padding: pad,
        font: `700 ${font}px/1 ${uiFont}`,
        cursor: interactive ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        ...(block ? { flex: 1, justifyContent: 'center' } : {}),
        ...skinStyle,
      }}
      {...rest}
    >
      {state === 'locked' && <IconLock size={font + 2} />}
      {children}
    </button>
  );
}

/* ══ 1. MatchCard ══════════════════════════════════════════════════════
   Teams + the primary pick row + ★. Pick options come from the skin, so
   Bola renders 1/X/2 and Basket renders two team codes with no branching
   here. The ★ toggle is the existing jagoan mechanic. */
export function MatchCard({
  skin,
  eyebrow,
  timeLabel,
  homeTeam,
  awayTeam,
  separator,
  options,
  selected,
  onSelect,
  starred = false,
  onToggleStar,
  showStar = true,
  locked = false,
  children,
  style,
}) {
  const accent = skin?.accent || 'var(--g4-scarlet)';
  const opts = options || skin?.primaryLabels || [];

  return (
    <div
      style={{
        background: 'var(--g4-surface)',
        border: '1px solid var(--g4-border)',
        borderRadius: 'var(--g4-radius-card)',
        padding: 'var(--g4-pad-card-sm) var(--g4-pad-card)',
        ...style,
      }}
    >
      {(eyebrow || timeLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', font: `700 9px/1.2 ${uiFont}` }}>
          <span style={{ color: accent }}>{eyebrow}</span>
          <span style={{ color: 'var(--g4-text-muted)' }}>{timeLabel}</span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '8px 0 10px',
        }}
      >
        <span style={{ font: `700 15px/1.2 ${uiFont}`, color: 'var(--g4-text)' }}>{homeTeam}</span>
        <span style={{ font: `600 10px/1 ${uiFont}`, color: 'var(--g4-text-muted)' }}>
          {separator || 'vs'}
        </span>
        <span style={{ font: `700 15px/1.2 ${uiFont}`, color: 'var(--g4-text)' }}>{awayTeam}</span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {opts.map((o) => {
          const isSel = selected === o.value;
          return (
            <PickChipSquare
              key={o.value}
              state={locked ? 'locked' : isSel ? 'selected' : 'default'}
              onClick={locked || !onSelect ? undefined : () => onSelect(o.value)}
            >
              {o.short}
            </PickChipSquare>
          );
        })}
        {showStar && (
          <button
            type="button"
            onClick={locked || !onToggleStar ? undefined : onToggleStar}
            disabled={locked || !onToggleStar}
            aria-pressed={starred}
            aria-label="jagoan"
            title="Poin ×2"
            style={{
              appearance: 'none',
              width: 44,
              border: starred ? '1.5px solid var(--g4-scarlet)' : '1.5px solid transparent',
              borderRadius: 10,
              padding: '9px 0',
              background: starred ? 'var(--g4-scarlet)' : 'var(--g4-star-bg)',
              color: starred ? '#fff' : 'var(--g4-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: locked || !onToggleStar ? 'default' : 'pointer',
            }}
          >
            <IconStar size={15} filled={starred} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/* The square-cornered variant used inside MatchCard's pick row (radius
   10px per canvas), as distinct from the pill PickChip used for score
   and scorer options on the pick sheet. Same 5 states. */
function PickChipSquare({ state = 'default', children, onClick }) {
  const skins = {
    default: { background: 'transparent', color: 'var(--g4-text)', border: '1.5px solid var(--g4-text)' },
    selected: { background: 'var(--g4-scarlet)', color: '#fff', border: '1.5px solid var(--g4-scarlet)' },
    locked: { background: 'var(--g4-locked-chip-bg)', color: 'var(--g4-locked-chip-fg)', border: '1.5px solid transparent' },
    correct: { background: 'var(--g4-win)', color: '#fff', border: '1.5px solid var(--g4-win)' },
    missed: { background: 'var(--g4-lose-bg)', color: 'var(--g4-lose)', border: '1.5px solid transparent' },
  };
  const interactive = typeof onClick === 'function';
  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      aria-pressed={state === 'selected' ? true : state === 'default' ? false : undefined}
      style={{
        appearance: 'none',
        flex: 1,
        textAlign: 'center',
        padding: '9px 0',
        borderRadius: 10,
        font: `700 13px/1 ${uiFont}`,
        cursor: interactive ? 'pointer' : 'default',
        ...(skins[state] || skins.default),
      }}
    >
      {children}
    </button>
  );
}

/* ══ 3. LeaderboardRow ═════════════════════════════════════════════════
   The "kamu" row is tinted with a 3px scarlet left border; delinquents
   carry a "belum pick" badge — the two states that make a klasemen feel
   personal and create the nudge. */
export function LeaderboardRow({
  rank,
  name,
  avatarInitial,
  avatarColor = 'var(--g4-ink)',
  points,
  streak,
  isYou = false,
  hasNotPicked = false,
  onClick,
  last = false,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px var(--g4-pad-card)',
        borderBottom: last ? 'none' : '1px solid var(--g4-border-soft)',
        ...(isYou
          ? {
              background: 'var(--g4-lose-bg)',
              borderLeft: '3px solid var(--g4-scarlet)',
            }
          : {}),
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span
        style={{
          font: `800 13px/1 ${displayFont}`,
          width: 14,
          color: isYou ? 'var(--g4-scarlet)' : 'var(--g4-text)',
        }}
      >
        {rank}
      </span>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: avatarColor,
          color: 'var(--g4-paper)',
          font: `700 11px/1 ${uiFont}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        {avatarInitial || (name || '?').charAt(0).toUpperCase()}
      </span>
      <span style={{ flex: 1, font: `700 13px/1.3 ${uiFont}`, color: 'var(--g4-text)' }}>
        {name}
        {isYou && (
          <span
            style={{
              font: `600 9px/1 ${uiFont}`,
              background: 'var(--g4-scarlet)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 'var(--g4-radius-pill)',
              marginLeft: 6,
            }}
          >
            kamu
          </span>
        )}
        {hasNotPicked && (
          <span
            style={{
              font: `600 9px/1 ${uiFont}`,
              background: 'var(--g4-lose-bg)',
              color: 'var(--g4-lose)',
              padding: '2px 6px',
              borderRadius: 'var(--g4-radius-pill)',
              marginLeft: 6,
            }}
          >
            belum pick
          </span>
        )}
      </span>
      {streak != null && (
        <span style={{ font: `600 10px/1 ${uiFont}`, color: 'var(--g4-win)' }}>▲{streak}</span>
      )}
      <span
        style={{
          font: `800 14px/1 ${displayFont}`,
          color: isYou ? 'var(--g4-scarlet)' : 'var(--g4-text)',
        }}
      >
        {points}
      </span>
    </div>
  );
}

/* ══ 4. LiveTile ═══════════════════════════════════════════════════════
   4px sport-colour left border; score in Bricolage; a personal pick
   status strip (green "pickmu unggul ✓" / red "pickmu tertinggal") which
   is what turns a scoreboard into something with stakes. */
export function LiveTile({
  skin,
  statusLabel,
  metaLabel,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  pickStatus,        // 'ahead' | 'behind' | null
  pickStatusLabel,
  live = false,
  onClick,
  style,
}) {
  const accent = skin?.accent || 'var(--g4-scarlet)';
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--g4-surface)',
        border: '1px solid var(--g4-border)',
        borderLeft: `var(--g4-rule-live-left) solid ${accent}`,
        borderRadius: 'var(--g4-radius-card-sm)',
        padding: 'var(--g4-pad-card-sm) var(--g4-pad-card)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          font: `600 10px/1.2 ${uiFont}`,
          color: 'var(--g4-text-muted)',
        }}
      >
        <span style={{ color: accent, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {live && <IconLiveDot size={7} />}
          {statusLabel}
        </span>
        {metaLabel && <span>{metaLabel}</span>}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '8px 0',
        }}
      >
        <span style={{ font: `700 16px/1.2 ${uiFont}`, color: 'var(--g4-text)' }}>{homeTeam}</span>
        <span
          style={{
            font: `800 25px/1 ${displayFont}`,
            letterSpacing: 'var(--g4-track-display)',
            color: live ? 'var(--g4-accent)' : 'var(--g4-text)',
          }}
        >
          {homeScore}–{awayScore}
        </span>
        <span style={{ font: `700 16px/1.2 ${uiFont}`, color: 'var(--g4-text)' }}>{awayTeam}</span>
      </div>

      {pickStatus && (
        <div
          style={{
            background: pickStatus === 'ahead' ? 'var(--g4-win-bg)' : 'var(--g4-lose-bg)',
            color: pickStatus === 'ahead' ? 'var(--g4-win)' : 'var(--g4-lose)',
            borderRadius: 9,
            padding: '6px 10px',
            font: `700 11px/1.3 ${uiFont}`,
          }}
        >
          {pickStatusLabel}
        </div>
      )}
    </div>
  );
}

/* ══ 5. KabarCard ══════════════════════════════════════════════════════
   3px sport-colour TOP border, category + time, headline, and — non
   negotiable per the design's voice rules — every item carries a pick
   hook CTA. News that doesn't lead back to a pick is just news. */
export function KabarCard({
  skin,
  category,
  timeLabel,
  headline,
  summary,
  hookLabel,
  onHookClick,
  hero = false,
  style,
}) {
  const accent = skin?.accent || 'var(--g4-scarlet)';
  return (
    <div
      style={{
        background: 'var(--g4-surface)',
        border: hero ? '2px solid var(--g4-text)' : '1px solid var(--g4-border)',
        borderTop: hero ? undefined : `var(--g4-rule-kabar-top) solid ${accent}`,
        borderRadius: hero ? 'var(--g4-radius-hero)' : 'var(--g4-radius-card-sm)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {hero ? (
        <div
          style={{
            background: accent,
            color: '#fff',
            padding: '6px 14px',
            font: `700 10px/1.2 ${uiFont}`,
            letterSpacing: '0.5px',
          }}
        >
          {category}{timeLabel ? ` · ${timeLabel}` : ''}
        </div>
      ) : null}

      <div style={{ padding: hero ? '12px 14px' : 'var(--g4-pad-card-sm) var(--g4-pad-card)' }}>
        {!hero && (
          <div style={{ font: `600 9px/1.2 ${uiFont}`, color: accent }}>
            {category}{timeLabel ? ` · ${timeLabel}` : ''}
          </div>
        )}
        <div
          style={
            hero
              ? {
                  font: `800 20px/1.08 ${displayFont}`,
                  letterSpacing: '-0.3px',
                  color: 'var(--g4-text)',
                }
              : { font: `700 14px/1.3 ${uiFont}`, color: 'var(--g4-text)', margin: '3px 0' }
          }
        >
          {headline}
        </div>
        {summary && (
          <div
            style={{
              font: `500 12px/1.45 ${uiFont}`,
              color: 'var(--g4-text-muted)',
              marginTop: 6,
            }}
          >
            {summary}
          </div>
        )}
        {hookLabel && (
          <button
            type="button"
            onClick={onHookClick}
            style={
              hero
                ? {
                    appearance: 'none',
                    border: 'none',
                    marginTop: 10,
                    background: 'var(--g4-ink)',
                    color: 'var(--g4-paper)',
                    borderRadius: 'var(--g4-radius-pill)',
                    padding: '7px 14px',
                    font: `700 12px/1 ${uiFont}`,
                    cursor: 'pointer',
                  }
                : {
                    appearance: 'none',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    marginTop: 4,
                    font: `700 11px/1.2 ${uiFont}`,
                    color: 'var(--g4-cobalt)',
                    cursor: 'pointer',
                  }
            }
          >
            {hookLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ══ 6. LockBadge ══════════════════════════════════════════════════════
   Countdown (ink fill) → "terkunci" (ink outline). Pass `secondsLeft`
   for a live HH:MM:SS countdown; the screen owns the ticking so this
   stays a pure presentational component. */
export function LockBadge({ secondsLeft, locked = false, label, style }) {
  if (locked || (secondsLeft != null && secondsLeft <= 0)) {
    return (
      <span
        style={{
          border: '1.5px solid var(--g4-text)',
          color: 'var(--g4-text)',
          fontFamily: uiFont,
          fontSize: 10,
          fontWeight: 700,
          padding: '4px 8px',
          borderRadius: 'var(--g4-radius-pill)',
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        terkunci
      </span>
    );
  }
  return (
    <span
      style={{
        background: 'var(--g4-ink)',
        color: 'var(--g4-paper)',
        fontSize: 10,
        fontWeight: 700,
        fontFamily: uiFont,
        padding: '4px 8px',
        borderRadius: 'var(--g4-radius-pill)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label || `lock ${formatCountdown(secondsLeft)}`}
    </span>
  );
}

/**
 * Lock countdown: MM:SS under an hour, HH:MM:SS under a day, and "2h 5j"
 * style beyond that.
 *
 * The day form matters because fixtures are seeded a whole season ahead:
 * a raw clock would render "lock 912:14:07" for an EPL match in May, and
 * even a next-day match reads as a confusing "lock 25:42:10". Day/hour is
 * the only form that stays legible across the full range.
 *
 * 'h'/'j' are hari/jam — the ID abbreviations, kept in both locales since
 * they're compact and the surrounding "lock" label carries the meaning.
 */
export function formatCountdown(totalSeconds) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00';
  const pad = (n) => String(n).padStart(2, '0');
  const DAY = 86400;
  if (totalSeconds >= DAY) {
    const d = Math.floor(totalSeconds / DAY);
    const h = Math.floor((totalSeconds % DAY) / 3600);
    return `${d}h ${h}j`;
  }
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
