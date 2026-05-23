import React from 'react';
import Flag from '../Flag.jsx';
import { teamLabel } from '../bracketData.js';

// ============================================================================
// v0.71.0 — Kartu Bola recap cards (Pick'em P6).
//
// Three variants ported from design-handoff-pickem/js/recap.jsx. Built
// for the WhatsApp-screenshot moment — paper substrate (white card, navy
// ink), slim flag-color rail at the top, oversized mono numerals as the
// hero, Bahasa headline + display-serif italic kicker. Reads at 64×64
// thumbnail AND as a 4:5 IG/WA story.
//
//   <RecapBigWin   ...props />   matchday summary (green rail, big +N)
//   <RecapUpset    ...props />   called-the-upset (amber rail, ×N)
//   <RecapGrupUp   ...props />   grup rank-up (orange rail, leaderboard)
//
// Cards use HEX literals (not theme tokens) so they render identically
// whether the surrounding Pickem container is light or dark — the
// screenshot needs to look the same on every device.
//
// For v1 the cards are HTML-rendered (no server PNG). Users screenshot.
// A P6.5 follow-on adds a static-PNG OG generator (path TBD; will not
// introduce runtime @vercel/og per CLAUDE.md #7).
// ============================================================================

const INK_1 = '#0F1E2E';
const INK_2 = '#3A4856';
const INK_3 = '#6B7480';
const INK_4 = '#98998E';
const LINE_1 = 'rgba(15,30,46,0.08)';
const LINE_2 = 'rgba(15,30,46,0.14)';
const PAPER = '#FFFFFF';
const PAPER_2 = '#F8FAFC';
const ORANGE = '#9A3412';
const ORANGE_WASH = '#F4D9CC';
const ORANGE_AMBER = '#F59E0B';
const ORANGE_AMBER_WASH = '#FCE9CD';
const PULSE_DEEP = '#1F8A5B';

// ── RecapShell ─────────────────────────────────────────────────────────────

/**
 * <RecapShell rail children /> — the paper substrate. Slim rail at the
 * top (use the variant's accent), branded footer at the bottom.
 * Children render between, with their own padding.
 */
export function RecapShell({ rail = ORANGE_AMBER, children }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: PAPER,
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: "'Space Grotesk', system-ui, -apple-system, sans-serif",
        color: INK_1,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 28px -8px rgba(15,30,46,0.15)',
        position: 'relative',
      }}
    >
      <div style={{ height: 8, background: rail }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
      <RecapFooter />
    </div>
  );
}

function RecapFooter() {
  return (
    <div
      style={{
        padding: '10px 18px',
        borderTop: `1px solid ${LINE_1}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: PAPER_2,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: ORANGE }} aria-hidden="true" />
        <span
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontWeight: 700,
            fontSize: 11,
            color: INK_1,
            letterSpacing: '0.04em',
          }}
        >
          GIBOL.CO
        </span>
      </div>
      <span
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10,
          fontWeight: 600,
          color: INK_3,
          letterSpacing: '0.06em',
        }}
      >
        PICK&apos;EM · WC 2026
      </span>
    </div>
  );
}

// ── Variant 1: RecapBigWin (matchday summary) ──────────────────────────────

/**
 * <RecapBigWin /> — matchday summary, green rail. Defaults render a
 * sample card; pass `data` to drive with real values:
 *
 *   data: {
 *     weekdayLabel?:  string  e.g. 'SABTU · MATCHDAY 3'
 *     headline?:      string  e.g. 'Empat dari lima.'
 *     subheadline?:   string  e.g. 'Pekan terbaik kamu sejauh ini.'
 *     pointsLabel?:   string  default 'POIN PEKAN INI'
 *     points:         number  required
 *     teamCodes:      string[]  e.g. ['ARG','BRA','ESP','NED']
 *     teamSummary?:   string  e.g. 'Argentina, Brasil, Spanyol, Belanda.'
 *     rank?:          number
 *     rankChange?:    number  positive = up
 *   }
 */
export function RecapBigWin({ data = {} }) {
  const {
    weekdayLabel = 'SABTU · MATCHDAY 3',
    headline = 'Empat dari lima.',
    subheadline = 'Pekan terbaik kamu sejauh ini.',
    pointsLabel = 'POIN PEKAN INI',
    points = 42,
    teamCodes = ['ARG', 'BRA', 'ESP', 'NED'],
    teamSummary = 'Argentina, Brasil, Spanyol, Belanda.',
    rank = 412,
    rankChange = 38,
  } = data;
  return (
    <RecapShell rail={PULSE_DEEP}>
      <div style={{ padding: '20px 22px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            fontWeight: 700,
            color: INK_3,
            letterSpacing: '0.10em',
            marginBottom: 8,
          }}
        >
          {weekdayLabel}
        </div>
        <div
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginBottom: 4,
            color: INK_1,
          }}
        >
          {headline}
        </div>
        <div
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontStyle: 'italic',
            fontSize: 18,
            color: INK_3,
            marginBottom: 14,
          }}
        >
          {subheadline}
        </div>

        <div
          style={{
            background: PULSE_DEEP,
            color: '#FFFFFF',
            borderRadius: 14,
            padding: '20px 22px',
            textAlign: 'center',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              opacity: 0.8,
              marginBottom: 6,
            }}
          >
            {pointsLabel}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontWeight: 700,
              fontSize: 64,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            +{points}
          </div>
          {teamSummary && (
            <div
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontStyle: 'italic',
                fontSize: 16,
                marginTop: 8,
                opacity: 0.95,
              }}
            >
              {teamSummary}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 11,
                fontWeight: 700,
                color: INK_3,
                letterSpacing: '0.10em',
              }}
            >
              POSISI GLOBAL
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontWeight: 700,
                fontSize: 24,
                color: INK_1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              #{rank}{' '}
              {rankChange != null && rankChange !== 0 && (
                <span style={{ fontSize: 14, color: rankChange > 0 ? PULSE_DEEP : '#B8341F' }}>
                  {rankChange > 0 ? '▲' : '▼'} {Math.abs(rankChange)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {teamCodes.slice(0, 4).map((c) => (
              <Flag key={c} code={c} w={26} h={18} round={3} />
            ))}
          </div>
        </div>
      </div>
    </RecapShell>
  );
}

// ── Variant 2: RecapUpset (called-the-upset) ───────────────────────────────

/**
 * <RecapUpset /> — upset celebration, amber rail.
 *
 *   data: {
 *     pickedPct:      number   e.g. 8 (8% of users nailed it)
 *     pickedLabel:    string   e.g. 'Jepang'
 *     homeCode, awayCode:   ISO codes
 *     homeLabel, awayLabel: Bahasa labels (auto from teamLabel if absent)
 *     homeScore, awayScore: number
 *     basePoints:     number   e.g. 6
 *     upsetMult:      number   e.g. 3
 *     bonusPoints:    number   e.g. 18 (base × upset)
 *     quote?:         string   editorial kicker
 *   }
 */
export function RecapUpset({ data = {} }) {
  const {
    pickedPct = 8,
    pickedLabel = 'Jepang',
    homeCode = 'ESP',
    awayCode = 'JPN',
    homeLabel,
    awayLabel,
    homeScore = 1,
    awayScore = 2,
    basePoints = 6,
    upsetMult = 3,
    bonusPoints = 18,
    quote = '"Berani tebak yang ini? Poin dobel."',
  } = data;
  const hLabel = homeLabel || teamLabel(homeCode);
  const aLabel = awayLabel || teamLabel(awayCode);
  return (
    <RecapShell rail={ORANGE_AMBER}>
      <div style={{ padding: '20px 22px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            fontWeight: 700,
            color: ORANGE,
            letterSpacing: '0.10em',
            marginBottom: 8,
          }}
        >
          ⚡ UPSET TERBESAR PEKAN INI
        </div>
        <div
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginBottom: 14,
            color: INK_1,
          }}
        >
          Kamu satu dari <span style={{ color: ORANGE }}>{pickedPct}%</span> yang nebak {pickedLabel}.
        </div>

        <div
          style={{
            background: PAPER,
            border: `2px solid ${INK_1}`,
            borderRadius: 14,
            padding: '18px 20px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Flag code={homeCode} w={44} h={32} round={5} />
              <div
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 6,
                  color: INK_3,
                }}
              >
                {hLabel}
              </div>
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontWeight: 700,
                fontSize: 36,
                letterSpacing: '-0.02em',
                color: INK_1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {homeScore} – {awayScore}
            </div>
            <div style={{ textAlign: 'center' }}>
              <Flag code={awayCode} w={44} h={32} round={5} />
              <div
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  marginTop: 6,
                  color: INK_1,
                }}
              >
                {aLabel}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: ORANGE_AMBER_WASH,
            borderRadius: 10,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 10,
                fontWeight: 700,
                color: ORANGE,
                letterSpacing: '0.10em',
              }}
            >
              POIN PRABEDA
            </div>
            <div
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: INK_1,
                marginTop: 2,
              }}
            >
              +{basePoints} dasar × {upsetMult} upset = <strong>+{bonusPoints}</strong>
            </div>
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontWeight: 700,
              fontSize: 32,
              color: ORANGE,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            +{bonusPoints}
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontStyle: 'italic',
            fontSize: 13,
            color: INK_3,
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          {quote}
        </div>
      </div>
    </RecapShell>
  );
}

// ── Variant 3: RecapGrupUp (grup rank-up) ──────────────────────────────────

/**
 * <RecapGrupUp /> — friend-grup rank-up, brand-orange rail.
 *
 *   data: {
 *     grupName:       string  e.g. 'Anak Kantor'
 *     rankChange:     number  positive = up
 *     headlineLine1?: string  e.g. 'Naik 2 peringkat,'
 *     headlineLine2?: string  e.g. 'masih ngintilin Faiz.'
 *     rows: [{ rank, name, points, you?, prevRank? }] × 4
 *     diffToFirst?:   number  poin selisih ke #1
 *     weeksLeft?:     number
 *   }
 */
export function RecapGrupUp({ data = {} }) {
  const {
    grupName = 'Anak Kantor',
    rankChange = 2,
    headlineLine1,
    headlineLine2 = 'masih ngintilin Faiz.',
    rows = [
      { rank: 1, name: 'Faiz R.', points: 142 },
      { rank: 2, name: 'Bagas K.', points: 138 },
      { rank: 3, name: 'Kamu', points: 124, you: true, prevRank: 5 },
      { rank: 4, name: 'Lila P.', points: 118 },
    ],
    diffToFirst = 18,
    weeksLeft = 2,
  } = data;
  const line1 = headlineLine1
    || (rankChange > 0 ? `Naik ${rankChange} peringkat,` : rankChange < 0 ? `Turun ${Math.abs(rankChange)} peringkat,` : 'Posisi tetap,');
  return (
    <RecapShell rail={ORANGE}>
      <div style={{ padding: '20px 22px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            fontWeight: 700,
            color: INK_3,
            letterSpacing: '0.10em',
            marginBottom: 8,
          }}
        >
          GRUP · {grupName.toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginBottom: 6,
            color: INK_1,
          }}
        >
          {line1}
        </div>
        <div
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontStyle: 'italic',
            fontSize: 18,
            color: ORANGE,
            marginBottom: 14,
          }}
        >
          {headlineLine2}
        </div>

        <div
          style={{
            background: PAPER,
            border: `1px solid ${LINE_2}`,
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          {rows.map((row, i) => {
            const movement = row.you && row.prevRank != null ? row.prevRank - row.rank : null;
            return (
              <div
                key={`${row.rank}-${row.name}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr auto',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderBottom: i < rows.length - 1 ? `1px solid ${LINE_1}` : 'none',
                  background: row.you ? ORANGE_WASH : 'transparent',
                  borderLeft: row.you ? `3px solid ${ORANGE}` : '3px solid transparent',
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontWeight: 700,
                    fontSize: 14,
                    color: INK_1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  #{row.rank}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: row.you ? 700 : 500,
                    color: INK_1,
                  }}
                >
                  {row.name}
                  {movement != null && movement > 0 && (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                        fontSize: 9,
                        color: ORANGE,
                        marginLeft: 6,
                      }}
                    >
                      ▲ {movement}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontWeight: 700,
                    fontSize: 14,
                    color: INK_1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.points}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontStyle: 'italic',
              fontSize: 14,
              color: INK_3,
            }}
          >
            Selisih ke #1:{' '}
            <strong
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontStyle: 'normal',
                color: INK_1,
              }}
            >
              {diffToFirst} poin
            </strong>
          </div>
          {weeksLeft != null && (
            <div
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 11,
                fontWeight: 700,
                color: ORANGE,
                letterSpacing: '0.08em',
              }}
            >
              {weeksLeft} PEKAN TERSISA
            </div>
          )}
        </div>
      </div>
    </RecapShell>
  );
}

// ── Variant dispatcher ─────────────────────────────────────────────────────

export const RECAP_VARIANTS = [
  { k: 'big-win', l: 'Pekan',  Component: RecapBigWin },
  { k: 'upset',   l: 'Upset',  Component: RecapUpset },
  { k: 'grup-up', l: 'Grup',   Component: RecapGrupUp },
];

export function RecapCard({ variant = 'big-win', data }) {
  const meta = RECAP_VARIANTS.find((v) => v.k === variant) || RECAP_VARIANTS[0];
  const Cmp = meta.Component;
  return <Cmp data={data} />;
}
