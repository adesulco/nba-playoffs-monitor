/**
 * Sistem 4a share cards — R2 screen 6 (v0.83.0).
 *
 * Four moments, per the design's #5b share-card set:
 *   g4-juara     — weekly grup winner
 *   g4-streak    — ×N correct in a row
 *   g4-matchday  — pre-match challenge with the grup's consensus split
 *   g4-invite    — "Kursimu masih kosong."
 *
 * ALWAYS DARK regardless of app theme (design: "1080×1080, always dark
 * (`ink` bg) regardless of app theme"), because these are read in a
 * WhatsApp thread, not in the app — they have to look deliberate against
 * both WA light and dark bubbles.
 *
 * Two sizes off one renderer: `square` 1080×1080 for WA/IG, and `og`
 * 1200×630 for link unfurls. The grammar is identical, only the crop
 * changes — so a shared card and a link preview never disagree.
 *
 * Lives under api/_lib/ (underscore = not deployed as its own function)
 * and is dispatched from api/og-recap.js via ?type=g4-*. The function
 * budget is 12/12, so a new endpoint was never an option.
 */

import React from 'react';

const h = React.createElement;

const INK = '#15110C';
const PAPER = '#FAF7F1';
const SCARLET = '#D92D1C';
const SCARLET_SOFT = '#FF6B57';
const MUTED = '#9A8E7B';

/** Card copy per moment. Second headline line renders in scarlet-soft. */
function moment(type, p) {
  switch (type) {
    case 'g4-juara':
      return {
        context: p.context || 'REKAP PEKAN',
        line1: 'Juara',
        line2: 'grup.',
        stats: [
          `${p.name || 'Kamu'} · ${p.points || '0'} pts · #1 dari ${p.members || '0'}`,
          p.grup || '',
        ],
        cta: p.code ? `Tantang grupnya → gibol.co/g/${p.code}` : 'gibol.co',
      };
    case 'g4-streak':
      return {
        context: p.context || 'REKAP PEKAN',
        line1: 'Streak',
        line2: `×${p.streak || '0'} benar.`,
        stats: [
          `${p.name || 'Kamu'}${p.rank ? ` · naik ke #${p.rank}` : ''}`,
          `${p.streak || '0'} pick beruntun tepat`,
        ],
        cta: p.code ? `Berani samain? → gibol.co/g/${p.code}` : 'gibol.co',
      };
    case 'g4-matchday':
      return {
        context: p.context || '● MALAM INI',
        line1: p.home || 'Indonesia',
        line2: p.away || 'Thailand',
        separator: true,
        stats: [
          p.pct && p.pick ? `Grup kami ${p.pct}% pilih ${p.pick}.` : 'Grup kami udah pick.',
          'Pick-mu apa?',
        ],
        cta: p.code ? `Ikut pick → gibol.co/g/${p.code}` : 'gibol.co',
        live: true,
      };
    case 'g4-invite':
    default:
      return {
        context: p.context || 'UNDANGAN',
        line1: 'Kursimu',
        line2: 'masih kosong.',
        stats: [
          `${p.grup || 'Grup'}${p.members ? ` · ${p.members} anggota` : ''}`,
          p.season || '',
        ],
        cta: p.code ? `Gabung gratis → gibol.co/g/${p.code}` : 'gibol.co',
      };
  }
}

/** GI/BOL logo block, drawn as two stacked lines on a scarlet rect. */
function logoBlock(scale) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        background: SCARLET,
        borderRadius: 10 * scale,
        padding: `${6 * scale}px ${11 * scale}px ${4 * scale}px`,
      },
    },
    h('div', {
      style: {
        display: 'flex',
        fontFamily: 'Bricolage Grotesque',
        fontWeight: 800,
        fontSize: 30 * scale,
        lineHeight: 0.9,
        letterSpacing: -0.5 * scale,
        color: PAPER,
      },
    }, 'GI'),
    h('div', {
      style: {
        display: 'flex',
        fontFamily: 'Bricolage Grotesque',
        fontWeight: 800,
        fontSize: 30 * scale,
        lineHeight: 0.9,
        letterSpacing: -0.5 * scale,
        color: PAPER,
      },
    }, 'BOL')
  );
}

/**
 * Build the card tree. `size` is 'square' (1080×1080) or 'og' (1200×630).
 * The og crop keeps the same grammar with a tighter vertical rhythm.
 */
export function buildShare4a(type, params) {
  const size = params.size === 'og' ? 'og' : 'square';
  const W = size === 'og' ? 1200 : 1080;
  const H = size === 'og' ? 630 : 1080;
  const m = moment(type, params);

  // One scale factor drives every dimension so both crops stay in
  // proportion instead of needing a second hand-tuned layout.
  const scale = size === 'og' ? 1.5 : 2.2;
  const pad = size === 'og' ? 64 : 88;
  const headlineSize = size === 'og' ? 104 : 138;

  return h(
    'div',
    {
      style: {
        width: W,
        height: H,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: INK,
        padding: pad,
        fontFamily: 'Instrument Sans',
      },
    },
    // Top row — logo + context label
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      logoBlock(scale / 2.2),
      h('div', {
        style: {
          display: 'flex',
          fontSize: size === 'og' ? 22 : 28,
          fontWeight: 700,
          letterSpacing: 1,
          color: m.live ? SCARLET_SOFT : MUTED,
        },
      }, m.context)
    ),

    // Headline — two lines, second in scarlet-soft
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'Bricolage Grotesque',
          fontWeight: 800,
          fontSize: headlineSize,
          lineHeight: 0.98,
          letterSpacing: -headlineSize * 0.028,
          color: PAPER,
        },
      }, m.line1),
      m.separator
        ? h('div', {
            style: {
              display: 'flex',
              fontSize: headlineSize * 0.42,
              fontWeight: 600,
              color: MUTED,
              marginTop: 4,
              marginBottom: 4,
            },
          }, 'vs')
        : null,
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'Bricolage Grotesque',
          fontWeight: 800,
          fontSize: headlineSize,
          lineHeight: 0.98,
          letterSpacing: -headlineSize * 0.028,
          color: m.separator ? PAPER : SCARLET_SOFT,
        },
      }, m.line2)
    ),

    // Stats block + scarlet pill CTA
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', marginBottom: size === 'og' ? 22 : 32 } },
        ...m.stats.filter(Boolean).map((line, i) =>
          h('div', {
            key: `s${i}`,
            style: {
              display: 'flex',
              fontSize: size === 'og' ? 28 : 36,
              fontWeight: 600,
              lineHeight: 1.35,
              color: i === 0 ? PAPER : MUTED,
            },
          }, line)
        )
      ),
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: SCARLET,
          color: '#fff',
          borderRadius: 999,
          padding: size === 'og' ? '18px 30px' : '26px 40px',
          fontSize: size === 'og' ? 28 : 36,
          fontWeight: 700,
        },
      }, m.cta)
    )
  );
}

export const SHARE4A_TYPES = ['g4-juara', 'g4-streak', 'g4-matchday', 'g4-invite'];

/** Pixel size for a given request, so the caller can set ImageResponse. */
export function share4aSize(params) {
  return params.size === 'og'
    ? { width: 1200, height: 630 }
    : { width: 1080, height: 1080 };
}
