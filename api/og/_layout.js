/**
 * Per-game recap-card layout for the v0.12.0 Theme A OG endpoint.
 *
 * Built as a pure object tree (no JSX, no React runtime) so the file
 * works in a Vercel Node serverless function without a JSX transform.
 * Satori accepts this shape directly via `satori(tree, options)`.
 *
 * Three variants, one shared composition:
 *   og     — 1200×630, Twitter / Open Graph default
 *   story  — 1080×1920, Instagram / WhatsApp Story
 *   square — 1080×1080, Instagram feed / generic share
 *
 * Five enhancements landing on top of the static template:
 *   A — fixed contrast on verdict body, player-card stat line, footer
 *       tagline. Was rendering at ~10% opacity on the static PNGs
 *       (the audit's NEW-4 surface that didn't get the live-UI lift).
 *   B — quarter-by-quarter score row under the main score
 *       (Q1 28–22 · Q2 24–31 · …). ESPN provides this cheaply.
 *   C — smarter status pill: FINAL · LAL leads 2-1 (post),
 *       LIVE · Q3 5:23 (live, with red pulse), TIPOFF Sat 22:30 WIB
 *       (pre). Replaces the generic "FINAL" middle separator.
 *   D — top-3 stat-leaders strip on OG (was Story-only). Fills the
 *       formerly-empty bottom-right of the 1200×630 canvas.
 *   E — win-probability bar — a horizontal gradient under the score
 *       showing each team's % share. ESPN provides win prob.
 */

import { COLORS, brighten, hexa } from './_theme.js';

// ─── Tiny hyperscript helper ─────────────────────────────────────────────
// Satori reads { type, props: { children, style, ... } } trees. `h()`
// wraps that shape so the layout reads like JSX without a transform.
//
// v0.12.0 — Satori requires every <div> with > 1 child to have an
// explicit `display: flex|contents|none` set on the style object. We
// inject `display: flex` automatically when:
//   - element type is 'div'
//   - children count > 1 after flattening + filtering null/false
//   - the caller didn't already specify a `display`
// Default flexDirection is 'row'; callers can override via style. Single-
// child divs and text-only divs are untouched.
function h(type, props, ...children) {
  const flat = children.flat().filter((c) => c !== null && c !== undefined && c !== false);
  const finalChildren = flat.length === 1 ? flat[0] : flat;
  let finalProps = props || {};
  // v0.12.0 Satori — every <div> must have explicit `display`. Applying
  // unconditionally (single-child divs included) is the simplest way to
  // never trip the validator. Caller's explicit display always wins.
  if (
    type === 'div' &&
    !(finalProps.style && finalProps.style.display)
  ) {
    finalProps = {
      ...finalProps,
      style: { display: 'flex', ...(finalProps.style || {}) },
    };
  }
  return {
    type,
    props: {
      ...finalProps,
      children: finalChildren,
    },
  };
}

// ─── Variant geometry ────────────────────────────────────────────────────
const VARIANTS = {
  og: {
    W: 1200, H: 630, pad: 56,
    titleSize: 18, scoreNumSize: 116, scoreLabelSize: 16,
    statusPillSize: 18, verdictSize: 30, verdictBodySize: 17,
    statCardW: 220, statCardH: 88, statNameSize: 18, statLineSize: 14,
    showLeaders: true, showQuarters: true, showWinProb: true,
    leadersInline: true,  // OG → render leaders strip inside main canvas
  },
  story: {
    W: 1080, H: 1920, pad: 72,
    titleSize: 26, scoreNumSize: 168, scoreLabelSize: 22,
    statusPillSize: 26, verdictSize: 56, verdictBodySize: 26,
    statCardW: 296, statCardH: 110, statNameSize: 22, statLineSize: 18,
    showLeaders: true, showQuarters: true, showWinProb: true,
    leadersInline: false, // Story → leaders below the verdict card
  },
  square: {
    W: 1080, H: 1080, pad: 64,
    titleSize: 22, scoreNumSize: 156, scoreLabelSize: 20,
    statusPillSize: 22, verdictSize: 40, verdictBodySize: 20,
    statCardW: 240, statCardH: 96, statNameSize: 20, statLineSize: 16,
    showLeaders: true, showQuarters: true, showWinProb: true,
    leadersInline: false, // Square → leaders below the verdict card
  },
};

// ─── Status pill (Enhancement C) ─────────────────────────────────────────
//   pre  → "TIPOFF · SAT 22:30 WIB"
//   live → red pulse dot + "LIVE · Q3 5:23"
//   post → "FINAL · LAL leads 2-1"
function StatusPill(game, geom) {
  const { status, statusDetail, seriesRecord } = game;
  let text;
  let dotColor = null;
  if (status === 'in') {
    text = `LIVE · ${statusDetail || 'IN PROGRESS'}`;
    dotColor = COLORS.liveDot;
  } else if (status === 'pre') {
    text = `TIPOFF · ${statusDetail || 'TBC'}`;
  } else {
    // post — show series record when present, otherwise plain FINAL
    text = seriesRecord ? `FINAL · ${seriesRecord}` : 'FINAL';
  }
  return h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: geom.statusPillSize,
      fontWeight: 700,
      letterSpacing: 1.6,
      color: COLORS.ink2,
      fontFamily: 'JetBrains Mono',
      textTransform: 'uppercase',
    },
  },
    dotColor ? h('div', {
      style: {
        width: 12, height: 12, borderRadius: '50%',
        background: dotColor,
      },
    }) : null,
    h('div', {}, text),
  );
}

// ─── Team score column ───────────────────────────────────────────────────
// One half of the central score block. Includes the team-color square chip
// (LAL / DEN), the score number, the team name. Winning side gets full ink;
// loser dims to ink2.
function TeamScoreColumn(team, geom, isWinner, align = 'left') {
  const chipSize = geom.scoreNumSize * 0.62;
  return h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: align === 'right' ? 'flex-end' : 'flex-start',
      gap: 14,
    },
  },
    // Team chip (color block + tri)
    h('div', {
      style: {
        width: chipSize, height: chipSize,
        background: team.color,
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 8px 32px ${hexa(team.color, 0.4)}`,
      },
    },
      h('div', {
        style: {
          fontSize: chipSize * 0.42,
          fontWeight: 800,
          color: '#FFFFFF',
          letterSpacing: -1,
          fontFamily: 'Inter Tight',
        },
      }, team.tri),
    ),
    // Score number
    h('div', {
      style: {
        fontSize: geom.scoreNumSize,
        fontWeight: 800,
        color: isWinner ? COLORS.ink : COLORS.ink2,
        letterSpacing: -4,
        lineHeight: 1,
        fontFamily: 'Inter Tight',
        fontVariantNumeric: 'tabular-nums',
      },
    }, String(team.score ?? '—')),
    // Team name
    h('div', {
      style: {
        fontSize: geom.scoreLabelSize,
        fontWeight: 500,
        color: COLORS.ink3,
        fontFamily: 'Inter Tight',
      },
    }, team.name),
  );
}

// ─── Quarter-by-quarter row (Enhancement B) ──────────────────────────────
function QuarterRow(game, geom) {
  const quarters = Array.isArray(game.quarters) ? game.quarters : [];
  if (quarters.length === 0) return null;
  return h('div', {
    style: {
      display: 'flex',
      gap: 18,
      fontSize: geom.statusPillSize - 2,
      fontFamily: 'JetBrains Mono',
      fontWeight: 600,
      color: COLORS.ink3,
      letterSpacing: 0.5,
      fontVariantNumeric: 'tabular-nums',
    },
  },
    quarters.map((q, i) => h('div', {
      key: `q${i}`,
      style: { display: 'flex', gap: 6 },
    },
      h('span', { style: { color: COLORS.muted } }, `Q${i + 1}`),
      h('span', {}, `${q.away}–${q.home}`),
    )),
  );
}

// ─── Win-probability bar (Enhancement E) ─────────────────────────────────
// Horizontal gradient under the scores: away color | home color, each
// segment proportional to that team's win probability. When no win prob
// is available, returns null. Always rendered for `post` games as 0%/100%
// reflecting the actual outcome — this gives the "story arc" feel without
// needing live odds.
function WinProbBar(game, geom) {
  let homeProb = game.winProb?.home ?? null;
  let awayProb = game.winProb?.away ?? null;
  if (game.status === 'post' && (homeProb == null || awayProb == null)) {
    homeProb = (game.home.score ?? 0) > (game.away.score ?? 0) ? 1 : 0;
    awayProb = 1 - homeProb;
  }
  if (homeProb == null || awayProb == null) return null;
  const W = geom.W - geom.pad * 2;
  const awayPct = Math.round(awayProb * 100);
  const homePct = 100 - awayPct;
  return h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      width: W,
    },
  },
    // Bar
    h('div', {
      style: {
        display: 'flex',
        width: '100%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        background: COLORS.panel,
      },
    },
      h('div', { style: { width: `${awayPct}%`, height: '100%', background: brighten(game.away.color, 0.3) } }),
      h('div', { style: { width: `${homePct}%`, height: '100%', background: brighten(game.home.color, 0.3) } }),
    ),
    // Pct labels
    h('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 12,
        fontFamily: 'JetBrains Mono',
        fontWeight: 600,
        letterSpacing: 0.5,
        color: COLORS.ink3,
      },
    },
      h('div', {}, `${game.away.tri} ${awayPct}%`),
      h('div', { style: { color: COLORS.muted } }, 'WIN PROBABILITY'),
      h('div', {}, `${game.home.tri} ${homePct}%`),
    ),
  );
}

// ─── Stat-leaders strip (Enhancement D) ──────────────────────────────────
// Three player cards: name + tri + stat line ("32 · 9 · 7"). On OG variant
// renders inline next to the score; on Story / Square renders below the
// verdict card. White card surface for legibility — ink is read from
// COLORS.bg (dark text on white).
function LeadersStrip(game, geom) {
  const leaders = Array.isArray(game.leaders) ? game.leaders.slice(0, 3) : [];
  if (leaders.length === 0) return null;
  return h('div', {
    style: {
      display: 'flex',
      gap: 14,
      flexWrap: 'wrap',
    },
  },
    leaders.map((p, i) => h('div', {
      key: `ld${i}`,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: geom.statCardW,
        minHeight: geom.statCardH,
        padding: '14px 18px',
        background: COLORS.cardBg,
        borderRadius: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      },
    },
      h('div', {
        style: {
          fontSize: 12,
          fontFamily: 'JetBrains Mono',
          fontWeight: 700,
          letterSpacing: 1.4,
          color: '#475569',
        },
      }, p.team || ''),
      h('div', {
        style: {
          fontSize: geom.statNameSize,
          fontWeight: 700,
          color: '#0F172A',
          fontFamily: 'Inter Tight',
          letterSpacing: -0.3,
        },
      }, p.name),
      h('div', {
        style: {
          fontSize: geom.statLineSize,
          fontFamily: 'JetBrains Mono',
          fontWeight: 500,
          color: '#475569',
          letterSpacing: 0.3,
        },
      }, p.statline),
    )),
  );
}

// ─── Header lockup ───────────────────────────────────────────────────────
function Header(game, geom) {
  return h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    },
  },
    // Brand mark — orange G square
    h('div', {
      style: {
        width: geom.titleSize * 2.4,
        height: geom.titleSize * 2.4,
        borderRadius: geom.titleSize * 0.5,
        background: COLORS.amber,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: geom.titleSize * 1.4,
        fontWeight: 800,
        color: '#FFFFFF',
        fontFamily: 'Inter Tight',
        letterSpacing: -1,
      },
    }, 'G'),
    h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      },
    },
      h('div', {
        style: {
          fontSize: geom.titleSize * 2,
          fontWeight: 700,
          color: COLORS.ink,
          fontFamily: 'Inter Tight',
          letterSpacing: -0.5,
        },
      }, 'gibol.co'),
      h('div', {
        style: {
          fontSize: geom.titleSize,
          fontFamily: 'JetBrains Mono',
          fontWeight: 600,
          color: COLORS.ink3,
          letterSpacing: 1.4,
        },
      }, `NBA · ${game.series || ''}`),
    ),
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────
function Footer(game, geom) {
  return h('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: geom.titleSize * 0.85,
      fontFamily: 'JetBrains Mono',
      fontWeight: 600,
      letterSpacing: 1.5,
    },
  },
    h('div', { style: { color: COLORS.ink3 } }, 'GIBOL.CO · GILA BOLA'),
    h('div', { style: { color: COLORS.amber } }, 'NBA PLAYOFFS 2026'),
  );
}

// ─── Verdict card ────────────────────────────────────────────────────────
function VerdictCard(game, geom) {
  const v = game.verdict || {};
  return h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: '28px 32px',
      background: COLORS.cardBg,
      borderRadius: 14,
      boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
    },
  },
    h('div', {
      style: {
        fontSize: geom.verdictSize,
        fontWeight: 700,
        color: '#0F172A',
        fontFamily: 'Inter Tight',
        letterSpacing: -0.5,
        lineHeight: 1.15,
      },
    }, v.headline || `${game.home.name} vs ${game.away.name}`),
    v.body ? h('div', {
      style: {
        fontSize: geom.verdictBodySize,
        color: '#334155',
        fontFamily: 'Inter Tight',
        lineHeight: 1.4,
      },
    }, v.body) : null,
    v.author ? h('div', {
      style: {
        fontSize: geom.verdictBodySize - 2,
        color: '#64748B',
        fontFamily: 'Inter Tight',
        marginTop: 4,
      },
    }, `— ${v.author}`) : null,
  );
}

// ─── Background ──────────────────────────────────────────────────────────
// Page bg with a winner-color gradient overlay. Same effect the static
// Python template uses, but expressed as CSS gradient layers for Satori.
function Background(game, geom) {
  const winner = (game.home.score ?? 0) > (game.away.score ?? 0) ? game.home : game.away;
  return {
    position: 'absolute',
    top: 0, left: 0,
    width: geom.W, height: geom.H,
    background: `linear-gradient(180deg, ${hexa(winner.color, 0.55)} 0%, ${COLORS.bg} 100%)`,
  };
}

// ─── Card composer ───────────────────────────────────────────────────────
export function buildCard(game, variant = 'og') {
  const geom = VARIANTS[variant] || VARIANTS.og;
  const isOg = variant === 'og';
  const homeWon = (game.home.score ?? 0) > (game.away.score ?? 0);
  const awayWon = (game.away.score ?? 0) > (game.home.score ?? 0);

  // ─── OG (1200×630) ──────────────────────────────────────────────────
  // Two-row layout with leaders strip filling the formerly-empty right
  // half of the verdict block (Enhancement D).
  if (isOg) {
    return h('div', {
      style: {
        position: 'relative',
        width: geom.W,
        height: geom.H,
        background: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter Tight',
      },
    },
      // bg gradient layer
      h('div', { style: Background(game, geom) }),
      // content
      h('div', {
        style: {
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: geom.pad,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 12,
        },
      },
        // Top row: brand + status pill
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
        },
          Header(game, geom),
          StatusPill(game, geom),
        ),
        // Middle row: score block (left half) + leaders strip (right half)
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 32,
          },
        },
          // Score block — home and away side by side
          h('div', {
            style: {
              display: 'flex',
              gap: 48,
              alignItems: 'flex-end',
            },
          },
            TeamScoreColumn(game.away, geom, awayWon, 'left'),
            TeamScoreColumn(game.home, geom, homeWon, 'left'),
          ),
          // Leaders strip — vertical column on OG so it fits next to the score
          geom.showLeaders && Array.isArray(game.leaders) && game.leaders.length > 0
            ? h('div', {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  width: 240,
                },
              },
                h('div', {
                  style: {
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 700,
                    letterSpacing: 1.4,
                    color: COLORS.ink3,
                    marginBottom: 2,
                  },
                }, 'TOP 3 STATLINES'),
                game.leaders.slice(0, 3).map((p, i) => h('div', {
                  key: `og-ld${i}`,
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 6,
                  },
                },
                  h('div', {
                    style: {
                      fontSize: 13,
                      fontWeight: 700,
                      color: COLORS.ink,
                      fontFamily: 'Inter Tight',
                    },
                  }, `${p.team} · ${p.name}`),
                  h('div', {
                    style: {
                      fontSize: 12,
                      color: COLORS.ink3,
                      fontFamily: 'JetBrains Mono',
                      letterSpacing: 0.3,
                    },
                  }, p.statline),
                )),
              )
            : null,
        ),
        // Quarters + win-prob row
        h('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          },
        },
          geom.showQuarters ? QuarterRow(game, geom) : null,
          geom.showWinProb ? WinProbBar(game, geom) : null,
        ),
        // Footer
        Footer(game, geom),
      ),
    );
  }

  // ─── Story (1080×1920) + Square (1080×1080) ─────────────────────────
  // Vertical layout. Score block stacked centered, verdict card below,
  // leaders strip below verdict, quarters + win-prob mid-card.
  return h('div', {
    style: {
      position: 'relative',
      width: geom.W,
      height: geom.H,
      background: COLORS.bg,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter Tight',
    },
  },
    h('div', { style: Background(game, geom) }),
    h('div', {
      style: {
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: geom.pad,
        display: 'flex',
        flexDirection: 'column',
        gap: variant === 'story' ? 36 : 24,
      },
    },
      // Header
      Header(game, geom),
      // Score block
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
          marginTop: variant === 'story' ? 80 : 24,
        },
      },
        TeamScoreColumn(game.away, geom, awayWon, 'left'),
        StatusPill(game, geom),
        TeamScoreColumn(game.home, geom, homeWon, 'right'),
      ),
      // Quarters
      geom.showQuarters
        ? h('div', { style: { display: 'flex', justifyContent: 'center' } }, QuarterRow(game, geom))
        : null,
      // Win-prob bar
      geom.showWinProb ? WinProbBar(game, geom) : null,
      // Verdict card
      VerdictCard(game, geom),
      // Leaders strip
      geom.showLeaders ? LeadersStrip(game, geom) : null,
      // Spacer pushes footer to bottom
      h('div', { style: { flex: 1 } }),
      // Footer
      Footer(game, geom),
    ),
  );
}
