import { ImageResponse } from '@vercel/og';
import React from 'react';

/**
 * GET /api/recap/[gameId]?v=story|og|square
 *
 * Dynamic recap PNG — renders a Bahasa-first share card for a single NBA
 * game. Three aspect ratios covered by one endpoint:
 *   · story  = 1080×1920 (IG Stories / TikTok / WhatsApp Status)
 *   · og     = 1200× 630 (Twitter / FB / WhatsApp link preview)
 *   · square = 1080×1080 (IG feed)
 *
 * Data is URL-encoded by the caller — no DB lookup on this path so the
 * hot path stays edge-cacheable. The caller already has the game object
 * from useDailyRecap; packaging it into the URL costs ~200 bytes but
 * removes any runtime ESPN dependency from the image pipeline.
 *
 * Query params (all optional; sensible fallbacks):
 *   gameId (path)   — used only for cache keying + CTA URL
 *   winner, loser   — team abbrs (e.g. "PHI", "BOS")
 *   winScore, loseScore — final scores as integers
 *   winColor, loseColor — hex like "#0078C6"; fall back to neutral
 *   top             — top scorer display name ("V. Edgecombe")
 *   topPts/Reb/Ast  — stat line integers
 *   topTeam         — abbr of the top scorer's team (for accent bar)
 *   date            — ISO date for the CTA subtitle
 *   lang            — 'id' | 'en' (default 'id')
 *   v               — variant: story | og | square
 *
 * Why three sizes from one handler: most readers will share to multiple
 * surfaces. One source of truth for the design means brand consistency
 * is automatic and a font tweak propagates everywhere.
 */

export const config = { runtime: 'edge' };

// Gibol brand palette — matches the dark theme masthead + hero tokens.
const BG = '#08111f';
const BG_SOFT = '#11213a';
const ORANGE = '#FFB347';
const NBA_RED = '#E8502E';
const TEXT = '#E6EDF5';
const DIM_TEXT = '#8899AA';
const MUTED_TEXT = '#5A6B7D';

const SIZES = {
  story:  { w: 1080, h: 1920 },
  og:     { w: 1200, h:  630 },
  square: { w: 1080, h: 1080 },
};

const h = React.createElement;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function parseHex(hex, fallback = ORANGE) {
  if (typeof hex !== 'string') return fallback;
  const s = hex.startsWith('#') ? hex : `#${hex}`;
  return /^#[0-9A-Fa-f]{3,8}$/.test(s) ? s : fallback;
}

export default function handler(req) {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const gameId = decodeURIComponent(url.pathname.split('/').pop() || '').replace(/\.png$/, '');
  const variant = (sp.get('v') || 'story').toLowerCase();
  const { w, h: H } = SIZES[variant] || SIZES.story;
  const lang = sp.get('lang') === 'en' ? 'en' : 'id';

  const winner = (sp.get('winner') || '—').slice(0, 4).toUpperCase();
  const loser = (sp.get('loser') || '—').slice(0, 4).toUpperCase();
  const winScore = clamp(parseInt(sp.get('winScore') || '0', 10) || 0, 0, 999);
  const loseScore = clamp(parseInt(sp.get('loseScore') || '0', 10) || 0, 0, 999);
  const winColor = parseHex(sp.get('winColor'), ORANGE);
  const loseColor = parseHex(sp.get('loseColor'), DIM_TEXT);
  const top = (sp.get('top') || '').slice(0, 40);
  const topPts = clamp(parseInt(sp.get('topPts') || '0', 10) || 0, 0, 99);
  const topReb = clamp(parseInt(sp.get('topReb') || '0', 10) || 0, 0, 99);
  const topAst = clamp(parseInt(sp.get('topAst') || '0', 10) || 0, 0, 99);
  const topTeam = (sp.get('topTeam') || '').slice(0, 4).toUpperCase();
  const topTeamColor = parseHex(sp.get('topTeamColor'), winColor);
  const date = (sp.get('date') || '').slice(0, 10);

  const body = variant === 'og'
    ? renderOG({ winner, loser, winScore, loseScore, winColor, loseColor, top, topPts, topReb, topAst, topTeamColor, lang, date, W: w, H })
    : variant === 'square'
    ? renderSquare({ winner, loser, winScore, loseScore, winColor, loseColor, top, topPts, topReb, topAst, topTeam, topTeamColor, lang, date, W: w, H })
    : renderStory({ winner, loser, winScore, loseScore, winColor, loseColor, top, topPts, topReb, topAst, topTeam, topTeamColor, lang, date, W: w, H });

  return new ImageResponse(body, {
    width: w,
    height: H,
    headers: {
      // Per-game cards can swing based on live state, so cache short but
      // stale-while-revalidate for aggressive CDN reuse. 5 min fresh, 1d stale.
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}

// ─── Story (1080×1920, portrait) ────────────────────────────────────────────
// Dominated by a vertical score stack. Top scorer takes the lower third.
// Accent gradient at the bottom is on-brand and gives the CTA contrast.
function renderStory(p) {
  const { winner, loser, winScore, loseScore, winColor, loseColor, top, topPts, topReb, topAst, topTeam, topTeamColor, lang, date, W, H } = p;
  return h('div', {
    style: {
      width: W, height: H,
      display: 'flex', flexDirection: 'column',
      background: BG,
      color: TEXT,
      fontFamily: 'ui-sans-serif,system-ui,Inter,Arial,sans-serif',
      position: 'relative',
    },
  }, [
    // Ambient accent wash — 8% of the winning team's color at top
    h('div', {
      key: 'wash',
      style: {
        position: 'absolute', top: 0, left: 0, width: W, height: H,
        background: `linear-gradient(180deg, ${winColor}1f 0%, ${BG} 55%)`,
      },
    }),
    // Masthead
    h('div', {
      key: 'hdr',
      style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '80px 72px 0 72px', position: 'relative',
      },
    }, [
      h('div', { key: 'brand', style: { display: 'flex', alignItems: 'baseline', gap: 14 } }, [
        h('div', { key: 'g', style: { fontSize: 44, fontWeight: 900, color: ORANGE, letterSpacing: -1 } }, 'gibol'),
        h('div', { key: 'dom', style: { fontSize: 44, fontWeight: 400, color: DIM_TEXT } }, '.co'),
      ]),
      h('div', {
        key: 'tag',
        style: {
          fontSize: 22, fontWeight: 700, color: NBA_RED, letterSpacing: 4,
          padding: '8px 14px',
          border: `2px solid ${NBA_RED}`, borderRadius: 6,
        },
      }, 'FINAL'),
    ]),
    // Date / league row
    h('div', {
      key: 'meta',
      style: {
        padding: '24px 72px 0 72px',
        fontSize: 24, color: DIM_TEXT, letterSpacing: 3, fontWeight: 600,
        position: 'relative',
        display: 'flex',
      },
    }, `NBA · ${date ? formatDate(date, lang) : (lang === 'id' ? 'PLAYOFF 2026' : 'PLAYOFF 2026')}`),

    // Score block — dominant vertical stack
    h('div', {
      key: 'score',
      style: {
        flexGrow: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: 24, padding: '0 72px',
        position: 'relative',
      },
    }, [
      scoreRow('win', winner, winScore, winColor, true),
      scoreRow('lose', loser, loseScore, loseColor, false),
    ]),

    // Top scorer hero
    top ? h('div', {
      key: 'top',
      style: {
        padding: '0 72px 40px 72px',
        display: 'flex', flexDirection: 'column',
        borderLeft: `8px solid ${topTeamColor}`,
        marginLeft: 72, paddingLeft: 24,
        position: 'relative',
      },
    }, [
      h('div', {
        key: 'topLbl',
        style: { fontSize: 22, color: DIM_TEXT, letterSpacing: 3, fontWeight: 700, marginBottom: 10 },
      }, lang === 'id' ? 'TOP SKOR' : 'TOP PERFORMER'),
      h('div', {
        key: 'topName',
        style: { fontSize: 60, fontWeight: 800, color: TEXT, letterSpacing: -1.5, lineHeight: 1.1 },
      }, top),
      h('div', {
        key: 'topLine',
        style: {
          fontSize: 38, color: winColor, fontWeight: 700, marginTop: 12,
          fontFamily: 'ui-monospace,SFMono-Regular,"JetBrains Mono",monospace',
          display: 'flex',
        },
      }, `${topPts} PTS · ${topReb} REB · ${topAst} AST`),
    ]) : null,

    // Footer CTA
    h('div', {
      key: 'cta',
      style: {
        padding: '40px 72px 80px 72px',
        background: `linear-gradient(180deg, transparent 0%, ${BG_SOFT} 100%)`,
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      },
    }, [
      h('div', {
        key: 'ctaTag',
        style: { fontSize: 24, color: DIM_TEXT, letterSpacing: 3, fontWeight: 600, marginBottom: 8 },
      }, lang === 'id' ? 'RECAP LENGKAP' : 'FULL RECAP'),
      h('div', {
        key: 'ctaUrl',
        style: {
          fontSize: 42, color: TEXT, fontWeight: 800, letterSpacing: -0.5,
          display: 'flex',
        },
      }, 'gibol.co/recap'),
      h('div', {
        key: 'ctaSub',
        style: { fontSize: 22, color: MUTED_TEXT, marginTop: 12 },
      }, lang === 'id' ? 'Bahasa · skor live · bracket · peluang juara' : 'Bahasa · live scores · bracket · title odds'),
    ]),
  ]);
}

// ─── OG (1200×630, landscape) ───────────────────────────────────────────────
// Dense single-line score + one-line narrative below. Suited to Twitter and
// Slack previews where the image gets scaled down aggressively.
function renderOG(p) {
  const { winner, loser, winScore, loseScore, winColor, loseColor, top, topPts, topReb, topAst, lang, date, W, H } = p;
  return h('div', {
    style: {
      width: W, height: H,
      display: 'flex', flexDirection: 'column',
      background: BG,
      color: TEXT,
      fontFamily: 'ui-sans-serif,system-ui,Inter,Arial,sans-serif',
      position: 'relative',
    },
  }, [
    h('div', {
      key: 'wash',
      style: {
        position: 'absolute', top: 0, left: 0, width: W, height: H,
        background: `linear-gradient(120deg, ${winColor}26 0%, ${BG} 45%, ${loseColor}14 100%)`,
      },
    }),
    // Header
    h('div', {
      key: 'hdr',
      style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '40px 56px 0 56px', position: 'relative',
      },
    }, [
      h('div', { key: 'brand', style: { display: 'flex', alignItems: 'baseline', gap: 10 } }, [
        h('div', { key: 'g', style: { fontSize: 40, fontWeight: 900, color: ORANGE, letterSpacing: -1 } }, 'gibol'),
        h('div', { key: 'dom', style: { fontSize: 40, fontWeight: 400, color: DIM_TEXT } }, '.co'),
        h('div', {
          key: 'tag',
          style: { fontSize: 18, color: NBA_RED, letterSpacing: 3, fontWeight: 700, marginLeft: 24 },
        }, `NBA · ${date ? formatDate(date, lang) : 'PLAYOFF 2026'}`),
      ]),
      h('div', {
        key: 'final',
        style: {
          fontSize: 20, fontWeight: 700, color: NBA_RED, letterSpacing: 4,
          padding: '6px 12px', border: `2px solid ${NBA_RED}`, borderRadius: 5,
        },
      }, 'FINAL'),
    ]),
    // Score row — horizontal
    h('div', {
      key: 'score',
      style: {
        flexGrow: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 36, padding: '0 56px',
        position: 'relative',
      },
    }, [
      teamTile(winner, winScore, winColor, true, 'og'),
      h('div', {
        key: 'dash',
        style: { fontSize: 80, color: DIM_TEXT, fontWeight: 300, display: 'flex' },
      }, '—'),
      teamTile(loser, loseScore, loseColor, false, 'og'),
    ]),
    // Footer — top scorer one-liner
    h('div', {
      key: 'foot',
      style: {
        padding: '0 56px 36px 56px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'relative',
      },
    }, [
      h('div', {
        key: 'topLine',
        style: {
          fontSize: 28, color: TEXT, fontWeight: 700,
          maxWidth: 880,
          overflow: 'hidden', display: 'flex',
        },
      }, top ? `${top} · ${topPts}/${topReb}/${topAst}` : ''),
      h('div', {
        key: 'cta',
        style: { fontSize: 22, color: DIM_TEXT, letterSpacing: 2, fontWeight: 600, display: 'flex' },
      }, lang === 'id' ? 'GILA BOLA · GIBOL.CO' : 'GILA BOLA · GIBOL.CO'),
    ]),
  ]);
}

// ─── Square (1080×1080, IG feed) ────────────────────────────────────────────
function renderSquare(p) {
  const { winner, loser, winScore, loseScore, winColor, loseColor, top, topPts, topReb, topAst, topTeamColor, lang, date, W, H } = p;
  return h('div', {
    style: {
      width: W, height: H,
      display: 'flex', flexDirection: 'column',
      background: BG,
      color: TEXT,
      fontFamily: 'ui-sans-serif,system-ui,Inter,Arial,sans-serif',
      position: 'relative',
    },
  }, [
    h('div', {
      key: 'wash',
      style: {
        position: 'absolute', top: 0, left: 0, width: W, height: H,
        background: `linear-gradient(135deg, ${winColor}26 0%, ${BG} 55%)`,
      },
    }),
    // Header
    h('div', {
      key: 'hdr',
      style: {
        padding: '56px 56px 0 56px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'relative',
      },
    }, [
      h('div', { key: 'brand', style: { display: 'flex', alignItems: 'baseline', gap: 10 } }, [
        h('div', { key: 'g', style: { fontSize: 44, fontWeight: 900, color: ORANGE, letterSpacing: -1 } }, 'gibol'),
        h('div', { key: 'dom', style: { fontSize: 44, fontWeight: 400, color: DIM_TEXT } }, '.co'),
      ]),
      h('div', {
        key: 'tag',
        style: {
          fontSize: 18, fontWeight: 700, color: NBA_RED, letterSpacing: 3,
          padding: '6px 12px', border: `2px solid ${NBA_RED}`, borderRadius: 5,
        },
      }, 'FINAL'),
    ]),
    h('div', {
      key: 'meta',
      style: {
        padding: '16px 56px 0 56px', position: 'relative',
        fontSize: 20, color: DIM_TEXT, letterSpacing: 3, fontWeight: 600, display: 'flex',
      },
    }, `NBA · ${date ? formatDate(date, lang) : 'PLAYOFF 2026'}`),
    // Scores
    h('div', {
      key: 'score',
      style: {
        flexGrow: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: 18, padding: '0 56px',
        position: 'relative',
      },
    }, [
      scoreRow('win', winner, winScore, winColor, true, 'square'),
      scoreRow('lose', loser, loseScore, loseColor, false, 'square'),
    ]),
    // Top scorer
    top ? h('div', {
      key: 'top',
      style: {
        padding: '0 56px 56px 56px',
        borderLeft: `6px solid ${topTeamColor}`,
        marginLeft: 56, paddingLeft: 20,
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      },
    }, [
      h('div', {
        key: 'topName',
        style: { fontSize: 44, fontWeight: 800, color: TEXT, letterSpacing: -1, display: 'flex' },
      }, top),
      h('div', {
        key: 'topLine',
        style: {
          fontSize: 28, color: winColor, fontWeight: 700, marginTop: 6,
          fontFamily: 'ui-monospace,SFMono-Regular,"JetBrains Mono",monospace',
          display: 'flex',
        },
      }, `${topPts} PTS · ${topReb} REB · ${topAst} AST`),
    ]) : h('div', { key: 'spacer', style: { padding: '0 56px 56px 56px', display: 'flex' } }),
  ]);
}

// ─── Shared tiles ───────────────────────────────────────────────────────────
function scoreRow(key, abbr, score, color, isWin, variant = 'story') {
  const tileW = variant === 'square' ? 140 : 180;
  const tileH = variant === 'square' ? 140 : 180;
  const abbrSize = variant === 'square' ? 54 : 68;
  const scoreSize = variant === 'square' ? 120 : 180;
  return h('div', {
    key,
    style: {
      display: 'flex', alignItems: 'center', gap: 32,
      opacity: isWin ? 1 : 0.58,
    },
  }, [
    h('div', {
      key: 'tile',
      style: {
        width: tileW, height: tileH,
        background: color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: abbrSize, fontWeight: 900, letterSpacing: -1,
        borderRadius: 16,
        // Winner tile gets a subtle outline to pop against the score
        boxShadow: isWin ? `0 0 0 4px ${color}55` : 'none',
      },
    }, abbr),
    h('div', {
      key: 'score',
      style: {
        fontSize: scoreSize, fontWeight: 900, color: isWin ? TEXT : DIM_TEXT,
        letterSpacing: -5, lineHeight: 1, display: 'flex',
      },
    }, String(score)),
  ]);
}

function teamTile(abbr, score, color, isWin, variant) {
  return h('div', {
    key: `team-${abbr}`,
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      opacity: isWin ? 1 : 0.65,
    },
  }, [
    h('div', {
      key: 't',
      style: {
        width: 130, height: 130,
        background: color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 52, fontWeight: 900, letterSpacing: -1, borderRadius: 14,
      },
    }, abbr),
    h('div', {
      key: 's',
      style: {
        fontSize: 128, fontWeight: 900,
        color: isWin ? TEXT : DIM_TEXT,
        letterSpacing: -4, lineHeight: 1, display: 'flex',
      },
    }, String(score)),
  ]);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso, lang) {
  // Expect YYYY-MM-DD. Return "22 APR 2026" (id) or "APR 22, 2026" (en).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  const MON_ID = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'];
  const MON_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const arr = lang === 'id' ? MON_ID : MON_EN;
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return '';
  return lang === 'id'
    ? `${parseInt(d, 10)} ${arr[idx]} ${y}`
    : `${arr[idx]} ${parseInt(d, 10)}, ${y}`;
}
