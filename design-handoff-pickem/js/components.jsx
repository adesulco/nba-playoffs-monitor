// =====================================================================
// Gibol Pick'em — Design System (Stadium Night)
// =====================================================================
// All reusable components. Used by screens.jsx, prototype.jsx, docs.jsx.
//
// Visual rules:
//   · Dark substrate, amber sole accent, mono numerals are heroes
//   · 16-18px card padding, 12-14px between cards
//   · Touch targets ≥ 44px on mobile
//   · One ":focus-visible" ring at --info, never decorated focus
//   · No left-rail accents; the type does hierarchy
//   · Newsreader appears only on big editorial headlines + recap cards
//
// All components consume tokens from pickem-tokens.css.
// =====================================================================

// ---------- 1. Status pills ----------

function StatePill({ state, mono = true, kickoff }) {
  if (state === 'live') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 9px 3px 8px', borderRadius: 999,
        background: 'var(--p-live-wash)', color: 'var(--p-live)',
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
      }}>
        <span className="p-live-dot" />LIVE
      </span>
    );
  }
  const m = {
    open:    { l: kickoff || 'TERBUKA',   fg: 'var(--pickem-orange)' },
    locked:  { l: 'TERKUNCI',             fg: 'var(--ink-3)' },
    scored:  { l: 'SELESAI',              fg: 'var(--ink-3)' },
    missed:  { l: 'TIDAK DIPREDIKSI',     fg: 'var(--ink-3)' },
    soon:    { l: 'SEGERA',               fg: 'var(--ink-3)' },
  }[state] || { l: state.toUpperCase(), fg: 'var(--ink-3)' };
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', color: m.fg }}>{m.l}</span>;
}

// ---------- 2. ProbabilityChip ----------

function ProbabilityChip({ value, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 999,
      background: 'var(--bg-deep)', color: 'var(--ink-2)',
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
    }}>
      {label && <span style={{ color: 'var(--ink-3)' }}>{label}</span>}
      {value}%
    </span>
  );
}

// ---------- 3. LockCountdown ----------

function LockCountdown({ value, urgent }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
      color: urgent ? 'var(--p-live)' : 'var(--ink-2)',
      letterSpacing: '0.02em',
    }}>
      <LockIcon size={11} color="currentColor" />
      {value}
    </span>
  );
}

// ---------- 4. ScoreStepper ----------

function ScoreStepper({ value, onChange, size = 'md' }) {
  const dims = size === 'lg'
    ? { btn: 36, w: 24, fs: 16 }
    : { btn: 30, w: 20, fs: 14 };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--line-2)',
    }}>
      <button aria-label="Kurangi skor" onClick={() => onChange?.(Math.max(0, value - 1))} style={{ ...stepBtn, width: dims.btn, height: dims.btn }}>−</button>
      <span style={{
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: dims.fs,
        minWidth: dims.w, textAlign: 'center', padding: '0 4px',
        color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums',
      }}>{value}</span>
      <button aria-label="Tambah skor" onClick={() => onChange?.(value + 1)} style={{ ...stepBtn, width: dims.btn, height: dims.btn }}>+</button>
    </div>
  );
}
const stepBtn = {
  border: 'none', background: 'transparent', cursor: 'pointer',
  fontSize: 16, fontWeight: 700, color: 'var(--ink-2)',
  fontFamily: 'var(--font-ui-pickem)',
};

// ---------- 5. JagoanToggle ----------

function JagoanToggle({ active, onClick, compact }) {
  if (compact) {
    return active ? (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 999,
        background: 'var(--pickem-orange-wash)', color: 'var(--pickem-orange)',
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
      }}>
        <StarIcon filled size={11} />×2
      </span>
    ) : null;
  }
  return (
    <button onClick={onClick} aria-label="Tandai jagoan matchday" aria-pressed={active} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 14px', borderRadius: 999, minHeight: 40, cursor: 'pointer',
      background: active ? 'var(--pickem-orange)' : 'transparent',
      color: active ? '#0A1628' : 'var(--pickem-orange)',
      border: '1px solid ' + (active ? 'var(--pickem-orange)' : 'var(--pickem-orange-soft)'),
      fontFamily: 'var(--font-ui-pickem)', fontWeight: 600, fontSize: 13,
      transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
    }}>
      <StarIcon filled={active} size={13} color="currentColor" />
      Jagoan {active && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>×2</span>}
    </button>
  );
}

// ---------- 6. OutcomePicker (1X2) ----------

function OutcomePicker({ odds, value, onChange, hint }) {
  const opts = [
    { code: '1', label: 'Menang', prob: odds.home },
    { code: 'X', label: 'Seri',   prob: odds.draw },
    { code: '2', label: 'Kalah',  prob: odds.away },
  ];
  return (
    <div role="radiogroup" aria-label={hint || 'Hasil pertandingan'} style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
    }}>
      {opts.map((o) => {
        const sel = value === o.code;
        return (
          <button key={o.code}
            role="radio" aria-checked={sel}
            onClick={() => onChange?.(o.code)}
            style={{
              appearance: 'none', cursor: 'pointer',
              border: '1px solid ' + (sel ? 'var(--pickem-orange)' : 'var(--line-2)'),
              background: sel ? 'var(--pickem-orange)' : 'transparent',
              color: sel ? '#0A1628' : 'var(--ink-1)',
              padding: '10px 8px', borderRadius: 10, minHeight: 56,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              fontFamily: 'var(--font-ui-pickem)',
              transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
            }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, opacity: 0.75, letterSpacing: '0.10em' }}>{o.code}</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{o.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{o.prob}%</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- 7. ScoreBreakdown ----------

function ScoreBreakdown({ base = 0, jagoan = 0, upset = 0, total, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: color || 'var(--ink-3)',
    }}>
      <span>Dasar +{base}</span>
      {jagoan > 0 && <span style={{ color: 'var(--pickem-orange)' }}>× Jagoan +{jagoan}</span>}
      {upset > 0 && <span style={{ color: 'var(--pickem-orange)' }}>× Upset +{upset}</span>}
    </div>
  );
}

function PointsPill({ value, tone = 'up', big }) {
  const c = tone === 'up' ? 'var(--p-up)' : tone === 'down' ? 'var(--p-down)' : 'var(--ink-1)';
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontWeight: 700,
      fontSize: big ? 32 : 24, color: c,
      letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
    }}>+{value}</span>
  );
}

// ---------- 8. FixtureCard ----------

function FixtureCard({ data, onClick, compact }) {
  const home = TEAMS[data.home], away = TEAMS[data.away];
  const state = data.state;
  const isLockedish = state === 'locked' || state === 'live' || state === 'scored';

  return (
    <article onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      style={{
        background: 'var(--bg-raised)',
        borderRadius: 14,
        border: '1px solid var(--line-1)',
        padding: 0,
        fontFamily: 'var(--font-ui-pickem)',
        color: 'var(--ink-1)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
      }}>
      {/* Header */}
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="p-eyebrow">{data.group}</div>
        <StatePill state={state} kickoff={state === 'open' ? data.kickoffTime : undefined} />
      </div>

      {/* Scoreboard */}
      <div style={{
        padding: '14px 16px 16px',
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center', gap: 12,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <Flag team={data.home} w={32} h={22} round={3} />
          <span style={{ fontFamily: 'var(--font-ui-pickem)', fontWeight: 600, fontSize: 13, color: 'var(--ink-2)' }}>{home.name}</span>
        </div>

        <div style={{ textAlign: 'center', minWidth: 100 }}>
          {state === 'open' && (
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 36, color: 'var(--ink-4)', letterSpacing: '0.04em' }}>– : –</div>
          )}
          {state === 'locked' && (
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 36, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>– : –</div>
          )}
          {(state === 'live' || state === 'scored') && data.score && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 44,
              color: state === 'live' ? 'var(--p-live)' : 'var(--ink-1)',
              letterSpacing: '-0.01em', lineHeight: 1,
            }}>{data.score.replace('-', ' : ')}</div>
          )}
          {state === 'live' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <span className="p-live-dot" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--p-live)', letterSpacing: '0.08em' }}>{data.minute}</span>
            </div>
          )}
          {state === 'scored' && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em', marginTop: 6 }}>FULL TIME</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <Flag team={data.away} w={32} h={22} round={3} />
          <span style={{ fontFamily: 'var(--font-ui-pickem)', fontWeight: 600, fontSize: 13, color: 'var(--ink-2)' }}>{away.name}</span>
        </div>
      </div>

      {!compact && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--line-1)' }}>
          {state === 'open'   && <FixtureBodyOpen data={data} />}
          {state === 'locked' && <FixtureBodyLocked data={data} home={home} />}
          {state === 'live'   && <FixtureBodyLive data={data} home={home} />}
          {state === 'scored' && <FixtureBodyScored data={data} />}
          {state === 'missed' && <FixtureBodyMissed data={data} />}
        </div>
      )}
    </article>
  );
}

function FixtureBodyOpen({ data }) {
  const [pick, setPick] = React.useState(data.pick?.outcome || '1');
  const [h, setH] = React.useState(parseInt((data.pick?.score || '2-1').split('-')[0]));
  const [a, setA] = React.useState(parseInt((data.pick?.score || '2-1').split('-')[1]));
  const [jag, setJag] = React.useState(!!data.pick?.jagoan);

  return (
    <div style={{ paddingTop: 14 }}>
      <OutcomePicker odds={data.odds} value={pick} onChange={setPick} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12 }}>Skor pas</span>
          <ScoreStepper value={h} onChange={setH} />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--ink-3)' }}>:</span>
          <ScoreStepper value={a} onChange={setA} />
        </div>
        <JagoanToggle active={jag} onClick={() => setJag(!jag)} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-1)' }}>
        <span className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11 }}>{data.venue?.split('·')[0]?.trim()}</span>
        <LockCountdown value={data.lockIn} urgent />
      </div>
    </div>
  );
}

function FixtureBodyLocked({ data, home }) {
  return (
    <div style={{ paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LockIcon size={13} color="var(--ink-3)" />
        <div>
          <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>PREDIKSIMU</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {home.short} menang · <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{data.pick?.score}</span>
          </div>
        </div>
      </div>
      <JagoanToggle active={data.pick?.jagoan} compact />
    </div>
  );
}

function FixtureBodyLive({ data, home }) {
  return (
    <div style={{ paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div className="p-eyebrow" style={{ fontSize: 9, color: 'var(--p-live)', marginBottom: 2 }}>ON TRACK</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {home.short} · <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{data.pick?.score}</span>
        </div>
      </div>
      <span className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12 }}>Skor pas masih mungkin</span>
    </div>
  );
}

function FixtureBodyScored({ data }) {
  const p = data.points;
  const correct = data.correctOutcome;
  return (
    <div style={{ paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: correct ? 'var(--p-up)' : 'var(--p-down)' }}>
            {correct ? 'Hasil kena' : 'Belum kena'}
          </div>
          <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11, marginTop: 2 }}>
            Prediksi <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{data.pick?.score}</span> · Rank ▲ 3
          </div>
        </div>
        <PointsPill value={p.total} tone={correct ? 'up' : 'down'} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ScoreBreakdown {...p} total={p.total} />
        <button style={shareLink}>Bagikan →</button>
      </div>
    </div>
  );
}
const shareLink = {
  appearance: 'none', border: 'none', background: 'transparent',
  color: 'var(--pickem-orange)', fontFamily: 'var(--font-ui-pickem)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
};

function FixtureBodyMissed({ data }) {
  return (
    <div style={{ paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12 }}>Kamu nggak prediksi laga ini.</div>
      <span className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>+0</span>
    </div>
  );
}

// ---------- 9. LeaderboardRow ----------

function RankBadge({ rank, movement }) {
  const mc = movement > 0 ? 'var(--p-up)' : movement < 0 ? 'var(--p-down)' : 'var(--ink-3)';
  const ma = movement > 0 ? '▲' : movement < 0 ? '▼' : '·';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 38 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--ink-1)', lineHeight: 1 }}>#{rank}</span>
      {movement !== undefined && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: mc, marginTop: 3 }}>
          {ma} {Math.abs(movement)}
        </span>
      )}
    </div>
  );
}

function LeaderboardRow({ row, you, podium }) {
  const podiumColors = { 1: '#FBBF24', 2: '#9CA3AF', 3: '#B45309' };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '52px 1fr auto',
      alignItems: 'center', gap: 12,
      padding: '14px 16px',
      background: you ? 'var(--pickem-orange-wash)' : 'transparent',
      borderLeft: you ? '3px solid var(--pickem-orange)' : '3px solid transparent',
      borderBottom: '1px solid var(--line-1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {podium && podiumColors[row.rank] ? (
          <span style={{ fontSize: 18 }}>{row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : '🥉'}</span>
        ) : null}
        <RankBadge rank={row.rank} movement={row.movement} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: you ? 700 : 600, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.name} {you && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--pickem-orange)', fontSize: 10, letterSpacing: '0.1em', marginLeft: 4 }}>KAMU</span>}
        </div>
        <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11, marginTop: 2, fontFamily: 'var(--font-mono)' }}>
          {row.exact ?? 0} skor pas · akurasi {row.acc}%
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums' }}>
          {row.points.toLocaleString()}
        </div>
        <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>poin</div>
      </div>
    </div>
  );
}

// ---------- 10. GrupCard ----------

function GrupCard({ grup, onClick }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', textAlign: 'left', cursor: 'pointer',
      width: '100%', padding: '14px 16px',
      background: 'var(--bg-raised)',
      border: '1px solid var(--line-1)', borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 12,
      color: 'var(--ink-1)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: grup.color || 'var(--pickem-orange-wash)',
        color: grup.colorFg || 'var(--pickem-orange)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
        flexShrink: 0,
      }}>{grup.initial || grup.name.charAt(0)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink-1)' }}>{grup.name}</div>
        <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2 }}>
          {grup.members} anggota · #{grup.rank} dari {grup.members}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: grup.movement > 0 ? 'var(--p-up)' : grup.movement < 0 ? 'var(--p-down)' : 'var(--ink-3)' }}>
          {grup.movement > 0 ? '+' : ''}{grup.movement}
        </div>
        <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>pekan ini</div>
      </div>
    </button>
  );
}

// ---------- 11. EmptyState ----------

function EmptyState({ icon, title, body, action, tone = 'default' }) {
  const tones = {
    default: { bg: 'var(--bg-raised)', border: 'var(--line-1)' },
    soon:    { bg: 'var(--p-info-wash)', border: 'color-mix(in oklab, var(--p-info) 30%, transparent)' },
    error:   { bg: 'var(--p-down-wash)', border: 'color-mix(in oklab, var(--p-down) 30%, transparent)' },
  };
  const t = tones[tone];
  return (
    <div style={{
      padding: '32px 20px',
      background: t.bg, border: `1px solid ${t.border}`,
      borderRadius: 14, textAlign: 'center',
    }}>
      {icon && <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 6 }}>{title}</div>
      {body && <div className="p-bodysm" style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: action ? 14 : 0, maxWidth: 320, margin: '0 auto' }}>{body}</div>}
      {action}
    </div>
  );
}

// ---------- 12. Buttons ----------

function PickemBtn({ children, variant = 'primary', size = 'md', icon, full, onClick, type = 'button', disabled }) {
  const sizes = {
    sm: { p: '8px 14px', fs: 13, h: 36 },
    md: { p: '12px 18px', fs: 14, h: 44 },
    lg: { p: '14px 22px', fs: 15, h: 52 },
  };
  const variants = {
    primary: { bg: 'var(--pickem-orange)', fg: '#0A1628', border: 'transparent' },
    secondary: { bg: 'transparent', fg: 'var(--ink-1)', border: 'var(--line-2)' },
    ghost:   { bg: 'transparent', fg: 'var(--ink-2)', border: 'transparent' },
    inverse: { bg: 'var(--ink-1)', fg: 'var(--bg-base)', border: 'transparent' },
  };
  const s = sizes[size], v = variants[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
      padding: s.p, borderRadius: 999, minHeight: s.h, fontSize: s.fs,
      fontFamily: 'var(--font-ui-pickem)', fontWeight: 700,
      display: full ? 'flex' : 'inline-flex', width: full ? '100%' : 'auto',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: disabled ? 0.5 : 1,
      transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
    }}>
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

// ---------- 13. BottomNav (mobile) ----------

function BottomNav({ active, onChange }) {
  const items = [
    { k: 'predict',  l: 'Prediksi', i: TargetIcon },
    { k: 'board',    l: 'Papan',    i: TrophyIcon },
    { k: 'grup',     l: 'Grup',     i: UsersIcon },
    { k: 'profile',  l: 'Profil',   i: UserIcon },
  ];
  return (
    <nav style={{
      height: 70, background: 'var(--bg-raised)', borderTop: '1px solid var(--line-1)',
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', flexShrink: 0,
      paddingBottom: 18, // home indicator clearance
    }}>
      {items.map((it) => {
        const sel = active === it.k;
        return (
          <button key={it.k} onClick={() => onChange?.(it.k)} aria-current={sel ? 'page' : undefined} style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            fontFamily: 'var(--font-ui-pickem)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            color: sel ? 'var(--pickem-orange)' : 'var(--ink-3)',
            paddingTop: 8,
          }}>
            <it.i size={20} />
            {it.l}
          </button>
        );
      })}
    </nav>
  );
}

// ---------- 14. SideNav (desktop) ----------

function SideNav({ active, onChange }) {
  const items = [
    { k: 'predict',  l: 'Prediksi', badge: 2 },
    { k: 'board',    l: 'Papan Peringkat' },
    { k: 'grup',     l: 'Grup Saya' },
    { k: 'bracket',  l: 'Bracket' },
    { k: 'survivor', l: 'Survivor' },
    { k: 'profile',  l: 'Profil' },
  ];
  return (
    <aside style={{ background: 'var(--bg-raised)', borderRight: '1px solid var(--line-1)', padding: '24px 14px', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 8px' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--pickem-orange)' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--ink-1)' }}>Pick&apos;em</div>
      </div>
      {items.map((it) => {
        const sel = active === it.k;
        return (
          <button key={it.k} onClick={() => onChange?.(it.k)} aria-current={sel ? 'page' : undefined} style={{
            display: 'flex', width: '100%', textAlign: 'left',
            alignItems: 'center', justifyContent: 'space-between',
            border: 'none', cursor: 'pointer',
            padding: '10px 12px', borderRadius: 8, marginBottom: 2,
            background: sel ? 'var(--bg-elev)' : 'transparent',
            color: sel ? 'var(--pickem-orange)' : 'var(--ink-2)',
            fontFamily: 'var(--font-ui-pickem)', fontSize: 14, fontWeight: sel ? 700 : 500,
          }}>
            <span>{it.l}</span>
            {it.badge && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                padding: '2px 6px', borderRadius: 999,
                background: 'var(--pickem-orange)', color: '#0A1628',
              }}>{it.badge}</span>
            )}
          </button>
        );
      })}
    </aside>
  );
}

// ---------- 15. Tabs ----------

function Tabs({ tabs, active, onChange }) {
  return (
    <div role="tablist" style={{
      display: 'flex', gap: 4,
      borderBottom: '1px solid var(--line-1)',
      padding: '0 16px',
      overflowX: 'auto',
    }}>
      {tabs.map((t) => {
        const sel = active === t.k;
        return (
          <button key={t.k} role="tab" aria-selected={sel} onClick={() => onChange?.(t.k)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            padding: '12px 4px', position: 'relative', whiteSpace: 'nowrap',
            color: sel ? 'var(--ink-1)' : 'var(--ink-3)',
            fontFamily: 'var(--font-ui-pickem)', fontSize: 14, fontWeight: sel ? 700 : 500,
            marginRight: 18,
          }}>
            {t.l}
            {t.count !== undefined && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginLeft: 4, color: 'var(--ink-3)' }}>{t.count}</span>}
            {sel && <span style={{
              position: 'absolute', left: 0, right: 0, bottom: -1, height: 2,
              background: 'var(--pickem-orange)', borderRadius: 1,
            }} />}
          </button>
        );
      })}
    </div>
  );
}

// ---------- 16. SegmentedPicker ----------

function SegmentedPicker({ items, active, onChange }) {
  return (
    <div role="tablist" style={{
      display: 'inline-flex', background: 'var(--bg-deep)',
      padding: 3, borderRadius: 10, gap: 2,
    }}>
      {items.map((it) => {
        const sel = active === it.k;
        return (
          <button key={it.k} role="tab" aria-selected={sel} onClick={() => onChange?.(it.k)} style={{
            border: 'none', cursor: 'pointer',
            padding: '8px 14px', borderRadius: 8, minHeight: 34,
            background: sel ? 'var(--bg-raised)' : 'transparent',
            color: sel ? 'var(--ink-1)' : 'var(--ink-3)',
            fontFamily: 'var(--font-ui-pickem)', fontSize: 13, fontWeight: sel ? 700 : 500,
          }}>{it.l}</button>
        );
      })}
    </div>
  );
}

// ---------- 17. StreakFlame ----------

function StreakFlame({ days }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--p-live)',
    }}>
      🔥 {days}
    </span>
  );
}

// ---------- 18. Badge ----------

function Badge({ icon, label, sublabel, locked, color = 'var(--pickem-orange)' }) {
  return (
    <div style={{
      padding: '14px 8px', borderRadius: 12,
      background: 'var(--bg-raised)', border: '1px solid var(--line-1)',
      textAlign: 'center', opacity: locked ? 0.45 : 1,
    }}>
      <div style={{ fontSize: 30, marginBottom: 4, filter: locked ? 'grayscale(1)' : 'none' }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-1)' }}>{label}</div>
      <div className="p-bodysm" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{sublabel}</div>
    </div>
  );
}

// ---------- 19. Toast ----------

function ToastHost() {
  return (
    <div id="toast-host" style={{
      position: 'fixed', top: 16, left: 0, right: 0,
      zIndex: 200, display: 'flex', justifyContent: 'center',
      pointerEvents: 'none',
    }} />
  );
}

function Toast({ tone = 'success', icon, children, visible }) {
  if (!visible) return null;
  const tones = {
    success: { bg: 'var(--p-up)', fg: '#0A1628' },
    info:    { bg: 'var(--p-info)', fg: '#fff' },
    error:   { bg: 'var(--p-down)', fg: '#fff' },
  };
  const t = tones[tone];
  return (
    <div role="status" aria-live="polite" style={{
      pointerEvents: 'auto',
      background: t.bg, color: t.fg,
      padding: '10px 16px', borderRadius: 999,
      boxShadow: '0 10px 30px -8px rgba(0,0,0,0.5)',
      fontFamily: 'var(--font-ui-pickem)', fontSize: 13, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 8,
    }}>
      {icon && <span>{icon}</span>}
      {children}
    </div>
  );
}

// ---------- 20. Icons (inline SVG, no library) ----------

function svgProps(size) { return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }; }

function TrophyIcon({ size = 18 }) {
  return <svg {...svgProps(size)}><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0V4z"/><path d="M17 6h3a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3"/><path d="M7 6H4a1 1 0 0 0-1 1v1a3 3 0 0 0 3 3"/></svg>;
}
function HomeIcon({ size = 18 }) {
  return <svg {...svgProps(size)}><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></svg>;
}
function TargetIcon({ size = 18 }) {
  return <svg {...svgProps(size)}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>;
}
function UsersIcon({ size = 18 }) {
  return <svg {...svgProps(size)}><circle cx="9" cy="8" r="3.5"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M16 7a3 3 0 0 1 0 6"/><path d="M19 21v-1a5 5 0 0 0-3-4.58"/></svg>;
}
function UserIcon({ size = 18 }) {
  return <svg {...svgProps(size)}><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>;
}
function BackIcon({ size = 22 }) {
  return <svg {...svgProps(size)}><path d="M15 18 9 12l6-6"/></svg>;
}
function ShareIcon({ size = 18 }) {
  return <svg {...svgProps(size)}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>;
}
function BellIcon({ size = 18 }) {
  return <svg {...svgProps(size)}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
}
function SearchIcon({ size = 18 }) {
  return <svg {...svgProps(size)}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>;
}
function CheckIcon({ size = 14 }) {
  return <svg {...svgProps(size)}><path d="M20 6 9 17l-5-5"/></svg>;
}
function PlusIcon({ size = 16 }) {
  return <svg {...svgProps(size)}><path d="M12 5v14M5 12h14"/></svg>;
}
function WhatsAppIcon({ size = 16 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
  </svg>;
}

Object.assign(window, {
  StatePill, ProbabilityChip, LockCountdown, ScoreStepper, JagoanToggle,
  OutcomePicker, ScoreBreakdown, PointsPill,
  FixtureCard, FixtureBodyOpen, FixtureBodyLocked, FixtureBodyLive, FixtureBodyScored,
  RankBadge, LeaderboardRow, GrupCard, EmptyState,
  PickemBtn, BottomNav, SideNav, Tabs, SegmentedPicker,
  StreakFlame, Badge, ToastHost, Toast,
  HomeIcon, TrophyIcon, TargetIcon, UsersIcon, UserIcon, BackIcon, ShareIcon, BellIcon, SearchIcon, CheckIcon, PlusIcon, WhatsAppIcon,
});
