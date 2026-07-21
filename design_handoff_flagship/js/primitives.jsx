// Pick'em Pass 1 — shared primitives + flag/team helpers used across all three directions.

// Team meta — Piala Dunia 2026 sample matchups (emoji flags for true-color rendering)
const TEAMS = {
  ARG: { name: 'Argentina', code: 'ARG', emoji: '🇦🇷', short: 'ARG' },
  BRA: { name: 'Brasil',    code: 'BRA', emoji: '🇧🇷', short: 'BRA' },
  FRA: { name: 'Prancis',   code: 'FRA', emoji: '🇫🇷', short: 'FRA' },
  ENG: { name: 'Inggris',   code: 'ENG', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', short: 'ENG' },
  IDN: { name: 'Indonesia', code: 'IDN', emoji: '🇮🇩', short: 'INA' },
  ESP: { name: 'Spanyol',   code: 'ESP', emoji: '🇪🇸', short: 'ESP' },
  GER: { name: 'Jerman',    code: 'GER', emoji: '🇩🇪', short: 'GER' },
  NED: { name: 'Belanda',   code: 'NED', emoji: '🇳🇱', short: 'NED' },
  POR: { name: 'Portugal',  code: 'POR', emoji: '🇵🇹', short: 'POR' },
  CRO: { name: 'Kroasia',   code: 'CRO', emoji: '🇭🇷', short: 'CRO' },
  MAR: { name: 'Maroko',    code: 'MAR', emoji: '🇲🇦', short: 'MAR' },
  JPN: { name: 'Jepang',    code: 'JPN', emoji: '🇯🇵', short: 'JPN' },
  USA: { name: 'AS',        code: 'USA', emoji: '🇺🇸', short: 'USA' },
  MEX: { name: 'Meksiko',   code: 'MEX', emoji: '🇲🇽', short: 'MEX' },
  CAN: { name: 'Kanada',    code: 'CAN', emoji: '🇨🇦', short: 'CAN' },
  ITA: { name: 'Italia',    code: 'ITA', emoji: '🇮🇹', short: 'ITA' },
  BEL: { name: 'Belgia',    code: 'BEL', emoji: '🇧🇪', short: 'BEL' },
  URU: { name: 'Uruguay',   code: 'URU', emoji: '🇺🇾', short: 'URU' },
  COL: { name: 'Kolombia',  code: 'COL', emoji: '🇨🇴', short: 'COL' },
  SEN: { name: 'Senegal',   code: 'SEN', emoji: '🇸🇳', short: 'SEN' },
  KOR: { name: 'Korsel',    code: 'KOR', emoji: '🇰🇷', short: 'KOR' },
  AUS: { name: 'Australia', code: 'AUS', emoji: '🇦🇺', short: 'AUS' },
};

// Flag — emoji rendered inside a clipped pill, with a stripe fallback color
// for grouping/accent (the country's brand color)
const COUNTRY_COLORS = {
  ARG: '#74ACDF', BRA: '#FEDF00', FRA: '#0055A4', ENG: '#CE1124',
  IDN: '#FF0000', ESP: '#AA151B', GER: '#000000', NED: '#FF6600',
  POR: '#006600', CRO: '#171796', MAR: '#C1272D', JPN: '#BC002D',
  USA: '#3C3B6E', MEX: '#006847', CAN: '#FF0000', ITA: '#009246',
  BEL: '#FAE042', URU: '#5CBCE9', COL: '#FCD116', SEN: '#00853F',
  KOR: '#003478', AUS: '#012169',
};

function Flag({ team, w = 32, h = 22, round = 4 }) {
  const t = TEAMS[team] || TEAMS.IDN;
  const fontSize = Math.min(w, h * 1.4);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: w, height: h, borderRadius: round, overflow: 'hidden',
      background: 'var(--bg-deep)',
      lineHeight: 1, fontSize, flexShrink: 0,
      fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Twemoji Mozilla", "Noto Color Emoji", emoji',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.06) inset',
      userSelect: 'none',
    }} role="img" aria-label={`Bendera ${t.name}`}>
      {t.emoji}
    </span>
  );
}

// Caption — used inside design-canvas artboards for the anatomy cards
function PCaption({ tag, title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="p-eyebrow" style={{ marginBottom: 6 }}>{tag}</div>
      <div className="p-headline" style={{ marginBottom: subtitle ? 4 : 0, color: 'var(--ink-1)' }}>{title}</div>
      {subtitle && <div className="p-bodysm" style={{ color: 'var(--ink-2)', maxWidth: 640 }}>{subtitle}</div>}
    </div>
  );
}

// Status pill — used across directions for the OPEN/LOCKED/LIVE/SCORED chrome
function StatusPill({ state, mono = true, theme = 'paper' }) {
  const map = {
    open:   { label: 'TERBUKA',  bg: 'var(--bg-deep)',      fg: 'var(--ink-2)',  dot: null },
    locked: { label: 'TERKUNCI', bg: 'var(--bg-deep)',      fg: 'var(--ink-2)',  dot: null, icon: '🔒' },
    live:   { label: 'LIVE',     bg: 'var(--p-live-wash)',  fg: 'var(--p-live)', dot: true },
    scored: { label: 'SELESAI',  bg: 'var(--bg-deep)',      fg: 'var(--ink-2)',  dot: null },
  };
  const m = map[state] || map.open;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: m.bg, color: m.fg,
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui-pickem)',
      fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    }}>
      {m.dot && <span className="p-live-dot" />}
      {!m.dot && m.icon && <span style={{ fontSize: 10 }}>{m.icon}</span>}
      {m.label}
    </span>
  );
}

// Countdown — mono digits, used everywhere
function Countdown({ value, label = 'TERKUNCI DALAM', theme }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
      <span className="p-eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

// Star icon for Jagoan — drawn inline, no library dep
function StarIcon({ filled, size = 18, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? (color || 'currentColor') : 'none'}
      stroke={color || 'currentColor'} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// Lock icon
function LockIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// Shared sample data — same fixture across all 3 directions so the comparison is apples-to-apples
const FIXTURE_DATA = {
  open: {
    home: 'ARG', away: 'BRA',
    group: 'Grup C · Pekan 1',
    venue: 'Estadio Azteca · 21:00 WIB',
    state: 'open',
    odds: { home: 38, draw: 28, away: 34 },
    probLabel: '38% peluang menang',
    lockIn: '02:14:08',
  },
  locked: {
    home: 'FRA', away: 'ENG',
    group: 'Grup A · Pekan 1',
    venue: 'Wembley · 02:00 WIB',
    state: 'locked',
    pick: { outcome: '1', score: '2-1', jagoan: true },
    odds: { home: 44, draw: 27, away: 29 },
    kickoff: 'Mulai dalam 04:38',
  },
  live: {
    home: 'ESP', away: 'GER',
    group: 'Grup B · Pekan 2',
    venue: 'Allianz Arena · 75\'',
    state: 'live',
    score: '2-1',
    pick: { outcome: '1', score: '2-1', jagoan: false },
    minute: "75'",
    probLabel: 'Skor pas masih mungkin',
  },
  scored: {
    home: 'NED', away: 'POR',
    group: 'Grup D · Pekan 3',
    venue: 'MetLife Stadium · FT',
    state: 'scored',
    score: '1-3',
    pick: { outcome: '2', score: '1-2', jagoan: true },
    points: { base: 3, jagoan: 2, upset: 0, total: 6 },
    correctOutcome: true, correctScore: false,
  },
};

// Expose to other scripts
Object.assign(window, { TEAMS, COUNTRY_COLORS, FIXTURE_DATA, Flag, PCaption, StatusPill, Countdown, StarIcon, LockIcon });
