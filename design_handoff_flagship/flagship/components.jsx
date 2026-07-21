// =====================================================================
// Gibol Pick'em Flagship — paper-theme components
// =====================================================================
// Evolves pickem/js/components.jsx (Stadium Night) for the PAPER theme.
// Reads tokens from ../tokens.css + ../pickem/pickem-tokens.css.
// Reuses Flag, TEAMS, icons from pickem/js/{primitives,components}.jsx.
// =====================================================================

// ---- Extra WC2026 teams used in this pass ---------------------------
Object.assign(TEAMS, {
  SWE: { name: 'Sweden',   code: 'SWE', emoji: '🇸🇪', short: 'SWE' },
  SCO: { name: 'Scotland', code: 'SCO', emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', short: 'SCO' },
  HAI: { name: 'Haiti',    code: 'HAI', emoji: '🇭🇹', short: 'HAI' },
});

// English-first rule (CLAUDE.md): override the Indonesian team names from pass 1
Object.entries({
  BRA: 'Brazil', FRA: 'France', ENG: 'England', ESP: 'Spain', GER: 'Germany',
  NED: 'Netherlands', CRO: 'Croatia', MAR: 'Morocco', JPN: 'Japan', USA: 'USA',
  MEX: 'Mexico', CAN: 'Canada', ITA: 'Italy', BEL: 'Belgium', COL: 'Colombia',
  KOR: 'South Korea', IDN: 'Indonesia',
}).forEach(([code, name]) => { if (TEAMS[code]) TEAMS[code].name = name; });

// ---- Sample data shared by flagship screens -------------------------
const TONIGHT = [
  { id: 'm1', home: 'JPN', away: 'SWE', group: 'Group F', venue: 'Estadio Azteca', time: '23:00 WIB', consensus: { pct: 68, side: 'JPN' } },
  { id: 'm2', home: 'MAR', away: 'SCO', group: 'Group C', venue: 'AT&T Stadium',   time: '02:00 WIB', consensus: { pct: 54, side: 'MAR' } },
  { id: 'm3', home: 'BRA', away: 'HAI', group: 'Group C', venue: 'MetLife',        time: '04:30 WIB', consensus: { pct: 91, side: 'BRA' } },
];

const TKRG_MEMBERS = [
  { rank: 1, name: 'Budi',  points: 84, streak: 3, movement: 0 },
  { rank: 2, name: 'You',   points: 78, movement: 1, you: true },
  { rank: 3, name: 'Sari',  points: 71, movement: -1 },
  { rank: 4, name: 'Ade',   points: 69, movement: 0, crown: true },
  { rank: 5, name: 'Dewi',  points: 64, movement: 2 },
  { rank: 6, name: 'Rizky', points: 58, movement: 0 },
  { rank: 7, name: 'Tono',  points: 51, movement: -2 },
  { rank: 8, name: 'Maya',  points: 47, movement: 0 },
  { rank: 9, name: 'Joko',  points: 30, movement: 0, belum: true },
];

// ---- 1. Logo + chrome ------------------------------------------------

function FLogo({ size = 17 }) {
  return (
    <span style={{ fontFamily: 'var(--font-ui-pickem)', fontWeight: 800, fontSize: size, letterSpacing: '-0.02em', color: 'var(--ink-1)' }}>
      gib<span style={{ color: 'var(--pickem-orange)' }}>ol</span>
    </span>
  );
}

function FTopBar({ right, left, border = true }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 18px', minHeight: 48, flexShrink: 0,
      borderBottom: border ? '1px solid var(--line-1)' : 'none',
      background: 'var(--bg-base)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{left || <FLogo />}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{right}</div>
    </header>
  );
}

function FNavChip({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', cursor: 'pointer', border: '1px solid transparent',
      fontFamily: 'var(--font-ui-pickem)', fontSize: 12, fontWeight: 600,
      background: active ? 'var(--ink-1)' : 'var(--bg-deep)',
      color: active ? '#fff' : 'var(--ink-2)',
      borderRadius: 999, padding: '6px 11px', minHeight: 30, whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

// ---- 2. Pills ---------------------------------------------------------

function FPill({ tone = 'neutral', children, dot }) {
  const tones = {
    neutral: { bg: 'var(--bg-deep)',            fg: 'var(--ink-2)' },
    live:    { bg: 'var(--p-live-wash)',         fg: 'var(--p-live)' },
    up:      { bg: 'var(--p-up-wash)',           fg: 'var(--p-up)' },
    prem:    { bg: 'var(--pickem-orange-soft)',  fg: 'var(--pickem-orange)' },
    info:    { bg: 'var(--p-info-wash)',         fg: 'var(--p-info)' },
    down:    { bg: 'var(--p-down-wash)',         fg: 'var(--p-down)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999, background: t.bg, color: t.fg,
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {dot && <span className="p-live-dot" style={{ width: 6, height: 6 }} />}
      {children}
    </span>
  );
}

// ---- 3. Buttons --------------------------------------------------------

function FBtn({ children, variant = 'primary', size = 'md', full, onClick, icon, disabled, style: extra }) {
  const sizes = { sm: { p: '8px 14px', fs: 13, h: 38 }, md: { p: '12px 18px', fs: 14, h: 48 }, lg: { p: '14px 22px', fs: 15, h: 52 } };
  const variants = {
    primary:   { bg: 'var(--pickem-orange)', fg: '#fff', border: 'transparent' },
    ink:       { bg: 'var(--ink-1)', fg: '#fff', border: 'transparent' },
    secondary: { bg: 'var(--bg-raised)', fg: 'var(--ink-1)', border: 'var(--line-2)' },
    wa:        { bg: 'var(--p-up)', fg: '#fff', border: 'transparent' },
    ghost:     { bg: 'transparent', fg: 'var(--ink-2)', border: 'transparent' },
  };
  const s = sizes[size], v = variants[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
      padding: s.p, borderRadius: 12, minHeight: s.h, fontSize: s.fs,
      fontFamily: 'var(--font-ui-pickem)', fontWeight: 700,
      display: full ? 'flex' : 'inline-flex', width: full ? '100%' : 'auto',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: disabled ? 0.45 : 1, boxSizing: 'border-box',
      transition: 'all 150ms var(--ease-out)',
      ...extra,
    }}>
      {icon}{children}
    </button>
  );
}

// ---- 4. Bottom nav (5 items per build prompt) ---------------------------

function FBottomNav({ active, onChange }) {
  const items = [
    { k: 'tebak',    l: 'Picks',     i: TargetIcon },
    { k: 'grup',     l: 'My Groups', i: UsersIcon },
    { k: 'klasemen', l: 'Standings', i: TrophyIcon },
    { k: 'kartu',    l: 'Cards',     i: ShareIcon },
    { k: 'profil',   l: 'Profile',   i: UserIcon },
  ];
  return (
    <nav aria-label="Main navigation" style={{
      height: 74, background: 'var(--bg-raised)', borderTop: '1px solid var(--line-1)',
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', flexShrink: 0,
      paddingBottom: 16,
    }}>
      {items.map((it) => {
        const sel = active === it.k;
        return (
          <button key={it.k} onClick={() => onChange?.(it.k)} aria-current={sel ? 'page' : undefined} style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            fontFamily: 'var(--font-ui-pickem)', fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
            color: sel ? 'var(--pickem-orange)' : 'var(--ink-3)', paddingTop: 8,
          }}>
            <it.i size={20} />
            {it.l}
          </button>
        );
      })}
    </nav>
  );
}

// ---- 5. Mobile shell (paper) ---------------------------------------------

function FShell({ children, navActive, onNav, withNav = true, topbar, cta }) {
  return (
    <div className="g-root" style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: 'var(--bg-base)', display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)', position: 'relative',
    }}>
      <div style={{ height: 52, flexShrink: 0 }} />
      {topbar}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {children}
        {cta}
      </div>
      {withNav && <FBottomNav active={navActive} onChange={onNav} />}
    </div>
  );
}

// Sticky bottom CTA — sits in the thumb zone, above the nav
function FStickyCTA({ label, sub, onClick, variant = 'primary', disabled }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '28px 16px 12px',
      background: 'linear-gradient(180deg, rgba(238,241,245,0) 0%, var(--bg-base) 45%)',
      pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'auto' }}>
        <FBtn variant={variant} size="lg" full onClick={onClick} disabled={disabled}>{label}</FBtn>
        {sub && <div style={{ textAlign: 'center', marginTop: 7, fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-ui-pickem)' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ---- 6. Cards & sections ----------------------------------------------------

function FCard({ children, pad = 16, style: extra, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg-raised)', border: '1px solid var(--line-1)',
      borderRadius: 14, padding: pad, boxShadow: 'var(--shadow-1)',
      boxSizing: 'border-box', ...extra,
    }}>{children}</div>
  );
}

function FSectionHead({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '18px 0 8px' }}>
      <span className="p-eyebrow">{children}</span>
      {right}
    </div>
  );
}

// ---- 7. Consensus bar (role=meter, post-pick reveal) -------------------------

function ConsensusBar({ pct, label, premiumLocked }) {
  if (premiumLocked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--bg-deep)' }} />
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-ui-pickem)', whiteSpace: 'nowrap' }}>
          Consensus unlocks after you pick · <span style={{ color: 'var(--pickem-orange)', fontWeight: 700 }}>Gibol+ sees it first</span>
        </span>
      </div>
    );
  }
  return (
    <div className="f-reveal" style={{ marginTop: 10 }}>
      <div role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}
        style={{ height: 6, borderRadius: 999, background: 'var(--bg-deep)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--p-info)', borderRadius: 999, transition: 'width 320ms var(--ease-out)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontFamily: 'var(--font-ui-pickem)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--p-info)' }}>{pct}%</span>
      </div>
    </div>
  );
}

// ---- 8. The one-tap fixture card ---------------------------------------------

function TeamPickRow({ team, picked, pct, onClick, disabled }) {
  const t = TEAMS[team];
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={!!picked}
      className={picked ? 'f-confirm' : undefined}
      style={{
        appearance: 'none', cursor: disabled ? 'default' : 'pointer', width: '100%',
        display: 'flex', alignItems: 'center', gap: 10, minHeight: 52,
        padding: '8px 12px', borderRadius: 11, boxSizing: 'border-box',
        border: '1.5px solid ' + (picked ? 'var(--pickem-orange)' : 'var(--line-2)'),
        background: picked ? 'var(--pickem-orange-wash)' : 'var(--bg-raised)',
        color: 'var(--ink-1)', fontFamily: 'var(--font-ui-pickem)',
        transition: 'all 150ms var(--ease-out)', textAlign: 'left',
      }}>
      <Flag team={team} w={30} h={21} round={4} />
      <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{t.name}</span>
      {pct !== undefined && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{pct}%</span>
      )}
      <span aria-hidden="true" style={{
        width: 24, height: 24, borderRadius: 999, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid ' + (picked ? 'var(--pickem-orange)' : 'var(--line-2)'),
        background: picked ? 'var(--pickem-orange)' : 'transparent',
        color: '#fff', transition: 'all 150ms var(--ease-out)',
      }}>{picked && <CheckIcon size={13} />}</span>
    </button>
  );
}

function DrawPickRow({ picked, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={!!picked} style={{
      appearance: 'none', cursor: disabled ? 'default' : 'pointer', width: '100%',
      minHeight: 40, borderRadius: 10, boxSizing: 'border-box',
      border: '1.5px solid ' + (picked ? 'var(--pickem-orange)' : 'transparent'),
      background: picked ? 'var(--pickem-orange-wash)' : 'var(--bg-deep)',
      color: picked ? 'var(--pickem-orange)' : 'var(--ink-3)',
      fontFamily: 'var(--font-ui-pickem)', fontSize: 13, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      transition: 'all 150ms var(--ease-out)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', opacity: 0.7 }}>X</span>
      Draw
    </button>
  );
}

// fx: TONIGHT entry · value: '1'|'X'|'2'|null · skorMode adds steppers post-pick
function FixtureTapCard({ fx, value, onPick, skorMode, skor, onSkor, premium }) {
  const picked = !!value;
  const consensusLabel = `${fx.consensus.pct}% of your group picked ${TEAMS[fx.consensus.side].name}`;
  return (
    <FCard pad={14}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="p-eyebrow" style={{ fontSize: 10 }}>{fx.group} · {fx.venue}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)' }}>
          <LockIcon size={11} color="var(--ink-3)" />{fx.time}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <TeamPickRow team={fx.home} picked={value === '1'} pct={picked ? (fx.consensus.side === fx.home ? fx.consensus.pct : 100 - fx.consensus.pct - 8) : undefined} onClick={() => onPick?.(value === '1' ? null : '1')} />
        <TeamPickRow team={fx.away} picked={value === '2'} pct={picked ? (fx.consensus.side === fx.away ? fx.consensus.pct : 100 - fx.consensus.pct - 8) : undefined} onClick={() => onPick?.(value === '2' ? null : '2')} />
        <DrawPickRow picked={value === 'X'} onClick={() => onPick?.(value === 'X' ? null : 'X')} />
      </div>
      {picked
        ? <ConsensusBar pct={fx.consensus.pct} label={consensusLabel} />
        : <ConsensusBar premiumLocked />}
      {skorMode && picked && (
        <div className="f-reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--line-2)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Tebak Skor <span style={{ fontWeight: 500, color: 'var(--ink-3)', fontSize: 11.5 }}>exact score</span></div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>exact +5 · margin +3 · result +2</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FStepper value={skor?.h ?? 0} onChange={(v) => onSkor?.({ ...(skor || { h: 0, a: 0 }), h: v })} />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-3)' }}>:</span>
            <FStepper value={skor?.a ?? 0} onChange={(v) => onSkor?.({ ...(skor || { h: 0, a: 0 }), a: v })} />
          </div>
        </div>
      )}
    </FCard>
  );
}

// Paper score stepper, 0–9, thumb-only
function FStepper({ value, onChange }) {
  const btn = {
    appearance: 'none', border: 'none', cursor: 'pointer', width: 34, height: 38,
    background: 'transparent', color: 'var(--ink-2)', fontSize: 17, fontWeight: 700,
    fontFamily: 'var(--font-ui-pickem)',
  };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-deep)', borderRadius: 10, border: '1px solid var(--line-1)' }}>
      <button aria-label="Decrease score" style={btn} onClick={() => onChange?.(Math.max(0, value - 1))}>−</button>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17, minWidth: 18, textAlign: 'center', color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <button aria-label="Increase score" style={btn} onClick={() => onChange?.(Math.min(9, value + 1))}>+</button>
    </div>
  );
}

// ---- 9. Leaderboard rows (paper + live provisional) ----------------------------

function FBoardRow({ row, live, dense }) {
  const mv = row.movement || 0;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '34px 1fr auto', alignItems: 'center', gap: 10,
      padding: dense ? '9px 14px' : '12px 14px',
      background: row.you ? 'var(--pickem-orange-wash)' : 'transparent',
      borderLeft: row.you ? '3px solid var(--pickem-orange)' : '3px solid transparent',
      borderBottom: '1px solid var(--line-1)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--ink-2)' }}>{row.rank}</span>
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: row.you ? 800 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: row.belum ? 'var(--ink-3)' : 'var(--ink-1)' }}>
          {row.name}{row.crown ? ' 👑' : ''}
        </span>
        {row.streak && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--p-live)' }}>🔥{row.streak}</span>}
        {mv !== 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: mv > 0 ? 'var(--p-up)' : 'var(--p-down)' }}>
            {mv > 0 ? '▲' : '▼'}{Math.abs(mv)}
          </span>
        )}
        {row.belum && (
          <span style={{ fontSize: 11, color: 'var(--p-info)', fontWeight: 700, whiteSpace: 'nowrap' }}>no pick yet · nudge on WA →</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        {live && row.prov !== undefined && (
          <span className="f-prov" style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
            color: 'var(--p-live)', background: 'var(--p-live-wash)',
            padding: '2px 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span className="p-live-dot" style={{ width: 5, height: 5 }} />+{row.prov}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{row.points}</span>
      </div>
    </div>
  );
}

// ---- 10. Cap meter ("9/10 — 1 slot lagi"), warm, never an error ---------------

function FCapMeter({ n = 9, cap = 10, compact }) {
  const warm = n >= cap - 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2.5, flex: compact ? 'none' : 1 }}>
        {Array.from({ length: cap }).map((_, i) => (
          <span key={i} style={{
            width: compact ? 10 : undefined, flex: compact ? 'none' : 1, height: 6, borderRadius: 2,
            background: i < n ? (warm ? 'var(--p-live)' : 'var(--p-up)') : 'var(--bg-deep)',
          }} />
        ))}
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: warm ? 'var(--p-live)' : 'var(--ink-3)', whiteSpace: 'nowrap' }}>
        {n}/{cap}{warm && n < cap ? ' · 1 slot left' : ''}
      </span>
    </div>
  );
}

// ---- 11. Bottom sheet ------------------------------------------------------------

function FSheet({ children, onClose, title }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,30,46,0.42)' }} />
      <div className="f-sheet-up" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--bg-raised)', borderRadius: '20px 20px 0 0',
        padding: '10px 18px 26px', boxShadow: 'var(--shadow-pop)',
        maxHeight: '88%', overflow: 'hidden', boxSizing: 'border-box',
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line-3)', margin: '0 auto 14px' }} />
        {title && <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

// ---- 12. Wizard chrome -------------------------------------------------------------

function FSteps({ step, total = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 6, margin: '4px 0 16px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < step ? 'var(--pickem-orange)' : 'var(--bg-deep)' }} />
      ))}
    </div>
  );
}

function FField({ label, value, hint, mono, suffix }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        border: '1px solid var(--line-2)', borderRadius: 10, padding: '10px 12px',
        background: 'var(--bg-elev)', minHeight: 44, boxSizing: 'border-box',
      }}>
        <span style={{ flex: 1, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui-pickem)', fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{value}</span>
        {suffix && <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{suffix}</span>}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// Radio-card used for scoring templates + knockout mode
function FOptionCard({ title, sub, selected, badge, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={!!selected} style={{
      appearance: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
      borderRadius: 11, boxSizing: 'border-box',
      border: '1.5px solid ' + (selected ? 'var(--pickem-orange)' : 'var(--line-2)'),
      background: selected ? 'var(--pickem-orange-wash)' : 'var(--bg-raised)',
      fontFamily: 'var(--font-ui-pickem)', transition: 'all 150ms var(--ease-out)',
    }}>
      <span aria-hidden="true" style={{
        width: 18, height: 18, borderRadius: 999, flexShrink: 0,
        border: '1.5px solid ' + (selected ? 'var(--pickem-orange)' : 'var(--line-3)'),
        background: selected ? 'var(--pickem-orange)' : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
      }}>{selected && <CheckIcon size={10} />}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{title}</span>
        {sub && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</span>}
      </span>
      {badge}
    </button>
  );
}

// ---- 13. Legal note (always with pricing) -------------------------------------------

function FLegalNote() {
  return (
    <div style={{
      background: 'var(--warn-wash)', border: '1px solid var(--warn)', borderRadius: 10,
      padding: '9px 12px', fontSize: 11, lineHeight: 1.5, color: '#6B5408',
      fontFamily: 'var(--font-ui-pickem)',
    }}>
      Gibol never holds wager money. You pay for pool-hosting tools — prizes between members are your group's own business. <span style={{ opacity: 0.75 }}>(Gibol nggak pernah pegang uang taruhan.)</span>
    </div>
  );
}

Object.assign(window, {
  TONIGHT, TKRG_MEMBERS,
  FLogo, FTopBar, FNavChip, FPill, FBtn, FBottomNav, FShell, FStickyCTA,
  FCard, FSectionHead, ConsensusBar, TeamPickRow, DrawPickRow, FixtureTapCard,
  FStepper, FBoardRow, FCapMeter, FSheet, FSteps, FField, FOptionCard, FLegalNote,
});
