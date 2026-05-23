import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = {
  runtime: 'edge',
};

// OG images are 1200x630 — canonical size for Twitter, Facebook, WhatsApp, LinkedIn, Slack.
const W = 1200;
const H = 630;

// Brand palette — matches gibol.co dark theme masthead.
const BG = '#08111f';
const ORANGE = '#ffb347';
const NBA_RED = '#e8502e';
const TEXT = '#e6edf5';
const DIM = '#8899aa';

// Pick'em Kartu Bola palette (paper substrate, navy ink) — matches
// src/pickem/components/recapCards.jsx hex literals so the OG render
// reads identically to the in-app card.
const PICKEM_INK_1 = '#0F1E2E';
const PICKEM_INK_2 = '#3A4856';
const PICKEM_INK_3 = '#6B7480';
const PICKEM_PAPER = '#FFFFFF';
const PICKEM_PAPER_2 = '#F8FAFC';
const PICKEM_LINE = 'rgba(15,30,46,0.10)';
const PICKEM_ORANGE = '#9A3412';
const PICKEM_AMBER = '#F59E0B';
const PICKEM_AMBER_WASH = '#FCE9CD';
const PICKEM_PULSE = '#1F8A5B';
const PICKEM_ORANGE_WASH = '#F4D9CC';

const h = React.createElement;

export default function handler(req) {
  const url = new URL(req.url);
  // v0.74.0 — Pick'em P6.5 variants. ?type=pickem-bigwin|pickem-upset|
  // pickem-grupup branches to the Kartu Bola recap renderers. Falls
  // through to the existing NBA recap renderer for everything else
  // (back-compat with /recap/[gameId] callers).
  const type = url.searchParams.get('type') || '';
  if (type.startsWith('pickem-')) {
    return renderPickem(type, url);
  }
  const rawDate = url.searchParams.get('date') || '';
  const rawHeadline = url.searchParams.get('headline') || '';
  const rawSubtitle = url.searchParams.get('subtitle') || '';
  const gamesCount = url.searchParams.get('games') || '';
  const accent = url.searchParams.get('accent') || ORANGE;
  // v0.1.4: full-day mode renders a mini scoreboard instead of a single headline.
  // Digests are passed as pipe-delimited strings, e.g.
  //   digests=LAL 112-108 DEN · LeBron 32|BOS 104-98 MIA · Tatum 38
  const mode = url.searchParams.get('mode') || 'moment';
  const rawDigests = url.searchParams.get('digests') || '';
  const digests = mode === 'fullday' && rawDigests
    ? rawDigests.split('|').map((s) => s.trim()).filter(Boolean).slice(0, 6)
    : [];

  const headline = rawHeadline.slice(0, 90) || 'Catatan Playoff NBA';
  const subtitle = rawSubtitle.slice(0, 120) || 'Skor · Top Scorer · Momen Terbesar';

  let displayDate = rawDate;
  try {
    if (rawDate) {
      const d = new Date(rawDate);
      displayDate = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).toUpperCase();
    }
  } catch {}

  const root = h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: BG,
        color: TEXT,
        fontFamily: 'sans-serif',
        position: 'relative',
        padding: 56,
      },
    },
    // Massive "NBA" watermark
    h(
      'div',
      {
        style: {
          position: 'absolute',
          right: -40,
          bottom: -100,
          fontSize: 420,
          fontWeight: 900,
          color: 'rgba(232,80,46,0.08)',
          letterSpacing: -10,
          lineHeight: 1,
          display: 'flex',
        },
      },
      'NBA'
    ),
    // Accent bar top
    h('div', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 8,
        background: `linear-gradient(90deg, ${accent}, ${NBA_RED})`,
        display: 'flex',
      },
    }),
    // Brand row
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 32,
          zIndex: 2,
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 48,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: -1,
            display: 'flex',
          },
        },
        'gibol.co'
      ),
      h(
        'div',
        {
          style: {
            padding: '6px 14px',
            background: accent,
            color: BG,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 2,
            borderRadius: 4,
            display: 'flex',
          },
        },
        'CATATAN PLAYOFF'
      )
    ),
    // Date
    h(
      'div',
      {
        style: {
          fontSize: 20,
          color: DIM,
          letterSpacing: 3,
          marginBottom: 24,
          display: 'flex',
        },
      },
      displayDate || 'NBA POSTSEASON 2025–26'
    ),
    // Headline OR full-day scoreboard — different framing depending on mode
    mode === 'fullday'
      ? h(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              marginBottom: 'auto',
              maxWidth: 1060,
              zIndex: 2,
            },
          },
          h(
            'div',
            {
              style: {
                fontSize: 54,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: -1.2,
                marginBottom: 10,
                display: 'flex',
              },
            },
            'REKAP LENGKAP'
          ),
          ...digests.slice(0, 5).map((line, i) =>
            h(
              'div',
              {
                key: i,
                style: {
                  display: 'flex',
                  fontSize: 30,
                  fontWeight: 700,
                  color: TEXT,
                  lineHeight: 1.25,
                  letterSpacing: -0.3,
                  borderLeft: `4px solid ${accent}`,
                  paddingLeft: 16,
                },
              },
              line.slice(0, 70)
            )
          )
        )
      : h(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 'auto',
              zIndex: 2,
            },
          },
          // Headline
          h(
            'div',
            {
              style: {
                fontSize: headline.length > 50 ? 58 : 72,
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.08,
                letterSpacing: -1.5,
                marginBottom: 24,
                maxWidth: 1060,
                display: 'flex',
              },
            },
            headline
          ),
          // Subtitle
          h(
            'div',
            {
              style: {
                fontSize: 26,
                color: TEXT,
                lineHeight: 1.35,
                maxWidth: 1020,
                opacity: 0.85,
                display: 'flex',
              },
            },
            subtitle
          )
        ),
    // Footer
    h(
      'div',
      {
        style: {
          position: 'absolute',
          left: 56,
          right: 56,
          bottom: 40,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2,
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 20,
            color: DIM,
            letterSpacing: 1.5,
            display: 'flex',
            gap: 20,
          },
        },
        h('span', null, gamesCount ? `${gamesCount} LAGA` : 'NBA PLAYOFF 2026'),
        h('span', { style: { color: accent } }, '●'),
        h('span', null, 'ESPN · POLYMARKET')
      ),
      h(
        'div',
        {
          style: {
            fontSize: 20,
            fontWeight: 700,
            color: accent,
            letterSpacing: 1,
            display: 'flex',
          },
        },
        'GILA BOLA →'
      )
    )
  );

  return new ImageResponse(root, {
    width: W,
    height: H,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': 'image/png',
    },
  });
}

// ============================================================================
// v0.74.0 — Pick'em Kartu Bola recap variants (Pick'em P6.5).
//
// Three render functions matching src/pickem/components/recapCards.jsx
// 1:1 (same hex palette, same Bahasa copy, same layout). Rendered at
// 1080×1350 (4:5) — IG/WA story aspect ratio per the spec — so the
// generated PNG is the canonical "screenshot moment" image.
//
// Query params for each:
//
//   ?type=pickem-bigwin  &matchday=3 &weekday=SABTU
//                        &points=42 &headline=Empat+dari+lima.
//                        &summary=Argentina+Brasil+Spanyol+Belanda
//                        &rank=412 &change=38
//
//   ?type=pickem-upset   &pct=8 &picked=Jepang
//                        &home=ESP &away=JPN &home_score=1 &away_score=2
//                        &base=6 &mult=3 &total=18
//
//   ?type=pickem-grupup  &grup=Anak+Kantor &change=2
//                        &kicker=masih+ngintilin+Faiz.
//                        &diff=18 &weeks=2
//
// All values have sensible Bahasa defaults so a bare URL still renders
// a plausible card.
// ============================================================================

const PICKEM_W = 1080;
const PICKEM_H = 1350;

function renderPickem(type, url) {
  let card;
  if (type === 'pickem-bigwin') {
    card = renderBigWin(url);
  } else if (type === 'pickem-upset') {
    card = renderUpset(url);
  } else if (type === 'pickem-grupup') {
    card = renderGrupUp(url);
  } else {
    // Unknown sub-variant — fall back to big-win.
    card = renderBigWin(url);
  }
  return new ImageResponse(card, {
    width: PICKEM_W,
    height: PICKEM_H,
    headers: {
      // Pick'em recap PNGs are derived from a single user moment; cache
      // aggressively (1 year, immutable) the same way the NBA recap path
      // does. Each unique query produces a unique URL.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': 'image/png',
    },
  });
}

// ── Shared shell ──────────────────────────────────────────────────────────

function pickemShell(rail, body) {
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        background: PICKEM_PAPER,
        color: PICKEM_INK_1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      },
    },
    // Flag-color rail (top)
    h('div', {
      style: {
        height: 24,
        background: rail,
        display: 'flex',
      },
    }),
    // Body — caller-supplied
    body,
    // Branded footer
    h(
      'div',
      {
        style: {
          padding: '24px 48px',
          borderTop: `1px solid ${PICKEM_LINE}`,
          background: PICKEM_PAPER_2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        },
      },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 14 } },
        h('div', {
          style: {
            width: 36,
            height: 36,
            borderRadius: 8,
            background: PICKEM_ORANGE,
            display: 'flex',
          },
        }),
        h(
          'span',
          {
            style: {
              fontSize: 26,
              fontWeight: 700,
              color: PICKEM_INK_1,
              letterSpacing: 1,
              display: 'flex',
            },
          },
          'GIBOL.CO'
        )
      ),
      h(
        'span',
        {
          style: {
            fontSize: 22,
            fontWeight: 600,
            color: PICKEM_INK_3,
            letterSpacing: 2,
            display: 'flex',
          },
        },
        "PICK'EM · WC 2026"
      )
    )
  );
}

// ── Variant 1: pickem-bigwin ───────────────────────────────────────────────

function renderBigWin(url) {
  const matchday = url.searchParams.get('matchday') || '3';
  const weekday = (url.searchParams.get('weekday') || 'SABTU').toUpperCase();
  const eyebrow = `${weekday} · MATCHDAY ${matchday}`;
  const headline = url.searchParams.get('headline') || 'Empat dari lima.';
  const subheadline = url.searchParams.get('subheadline') || 'Pekan terbaik kamu sejauh ini.';
  const points = url.searchParams.get('points') || '42';
  const summary = url.searchParams.get('summary') || 'Argentina, Brasil, Spanyol, Belanda.';
  const rank = url.searchParams.get('rank') || '412';
  const change = parseInt(url.searchParams.get('change') || '0', 10);

  return pickemShell(
    PICKEM_PULSE,
    h(
      'div',
      {
        style: {
          flex: 1,
          padding: '64px 64px 28px',
          display: 'flex',
          flexDirection: 'column',
        },
      },
      // Eyebrow
      h(
        'div',
        {
          style: {
            fontSize: 28,
            fontWeight: 700,
            color: PICKEM_INK_3,
            letterSpacing: 4,
            marginBottom: 24,
            display: 'flex',
          },
        },
        eyebrow
      ),
      // Headline
      h(
        'div',
        {
          style: {
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: PICKEM_INK_1,
            marginBottom: 10,
            display: 'flex',
          },
        },
        headline
      ),
      // Subheadline (italic)
      h(
        'div',
        {
          style: {
            fontSize: 44,
            fontStyle: 'italic',
            color: PICKEM_INK_3,
            marginBottom: 48,
            display: 'flex',
          },
        },
        subheadline
      ),
      // Points hero (green block)
      h(
        'div',
        {
          style: {
            background: PICKEM_PULSE,
            color: '#FFFFFF',
            borderRadius: 32,
            padding: '52px 56px',
            textAlign: 'center',
            marginBottom: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          },
        },
        h(
          'div',
          {
            style: {
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 5,
              opacity: 0.85,
              marginBottom: 14,
              display: 'flex',
            },
          },
          'POIN PEKAN INI'
        ),
        h(
          'div',
          {
            style: {
              fontSize: 200,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -6,
              display: 'flex',
            },
          },
          `+${points}`
        ),
        h(
          'div',
          {
            style: {
              fontSize: 36,
              fontStyle: 'italic',
              marginTop: 18,
              opacity: 0.95,
              display: 'flex',
              textAlign: 'center',
            },
          },
          summary
        )
      ),
      // Footer row — rank + change
      h(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
          },
        },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column' } },
          h(
            'div',
            {
              style: {
                fontSize: 24,
                fontWeight: 700,
                color: PICKEM_INK_3,
                letterSpacing: 4,
                display: 'flex',
              },
            },
            'POSISI GLOBAL'
          ),
          h(
            'div',
            {
              style: {
                fontSize: 60,
                fontWeight: 700,
                color: PICKEM_INK_1,
                marginTop: 6,
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
              },
            },
            `#${rank}`,
            change !== 0
              ? h(
                  'span',
                  {
                    style: {
                      fontSize: 32,
                      color: change > 0 ? PICKEM_PULSE : '#B8341F',
                      display: 'flex',
                    },
                  },
                  `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}`
                )
              : null
          )
        )
      )
    )
  );
}

// ── Variant 2: pickem-upset ────────────────────────────────────────────────

function renderUpset(url) {
  const pct = url.searchParams.get('pct') || '8';
  const picked = url.searchParams.get('picked') || 'Jepang';
  const homeLabel = url.searchParams.get('home_label') || 'Spanyol';
  const awayLabel = url.searchParams.get('away_label') || 'Jepang';
  const homeScore = url.searchParams.get('home_score') || '1';
  const awayScore = url.searchParams.get('away_score') || '2';
  const basePoints = url.searchParams.get('base') || '6';
  const upsetMult = url.searchParams.get('mult') || '3';
  const totalPoints = url.searchParams.get('total') || '18';

  return pickemShell(
    PICKEM_AMBER,
    h(
      'div',
      {
        style: {
          flex: 1,
          padding: '64px 64px 32px',
          display: 'flex',
          flexDirection: 'column',
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 28,
            fontWeight: 700,
            color: PICKEM_ORANGE,
            letterSpacing: 4,
            marginBottom: 24,
            display: 'flex',
          },
        },
        '⚡ UPSET TERBESAR PEKAN INI'
      ),
      h(
        'div',
        {
          style: {
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            color: PICKEM_INK_1,
            marginBottom: 56,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
          },
        },
        h('span', null, 'Kamu satu dari'),
        h('span', { style: { color: PICKEM_ORANGE, display: 'flex' } }, `${pct}%`),
        h('span', null, `yang nebak ${picked}.`)
      ),
      // Scoreline card
      h(
        'div',
        {
          style: {
            background: PICKEM_PAPER,
            border: `4px solid ${PICKEM_INK_1}`,
            borderRadius: 28,
            padding: '40px 32px',
            marginBottom: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          },
        },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 } },
          h(
            'div',
            {
              style: {
                fontSize: 38,
                fontWeight: 700,
                color: PICKEM_INK_3,
                marginTop: 12,
                display: 'flex',
              },
            },
            homeLabel
          )
        ),
        h(
          'div',
          {
            style: {
              fontSize: 110,
              fontWeight: 700,
              letterSpacing: -3,
              color: PICKEM_INK_1,
              display: 'flex',
            },
          },
          `${homeScore} – ${awayScore}`
        ),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 } },
          h(
            'div',
            {
              style: {
                fontSize: 38,
                fontWeight: 700,
                color: PICKEM_INK_1,
                marginTop: 12,
                display: 'flex',
              },
            },
            awayLabel
          )
        )
      ),
      // Math strip
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '28px 36px',
            background: PICKEM_AMBER_WASH,
            borderRadius: 24,
            marginTop: 'auto',
          },
        },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column' } },
          h(
            'div',
            {
              style: {
                fontSize: 22,
                fontWeight: 700,
                color: PICKEM_ORANGE,
                letterSpacing: 3,
                display: 'flex',
              },
            },
            'POIN PRABEDA'
          ),
          h(
            'div',
            {
              style: {
                fontSize: 34,
                fontWeight: 700,
                color: PICKEM_INK_1,
                marginTop: 6,
                display: 'flex',
              },
            },
            `+${basePoints} dasar × ${upsetMult} upset`
          )
        ),
        h(
          'div',
          {
            style: {
              fontSize: 90,
              fontWeight: 700,
              color: PICKEM_ORANGE,
              letterSpacing: -2,
              display: 'flex',
            },
          },
          `+${totalPoints}`
        )
      )
    )
  );
}

// ── Variant 3: pickem-grupup ──────────────────────────────────────────────

function renderGrupUp(url) {
  const grup = (url.searchParams.get('grup') || 'Anak Kantor').toUpperCase();
  const change = parseInt(url.searchParams.get('change') || '2', 10);
  const headlineLine1 =
    url.searchParams.get('headline1')
    || (change > 0
      ? `Naik ${change} peringkat,`
      : change < 0
      ? `Turun ${Math.abs(change)} peringkat,`
      : 'Posisi tetap,');
  const kicker = url.searchParams.get('kicker') || 'masih ngintilin Faiz.';
  const diffToFirst = url.searchParams.get('diff') || '18';
  const weeksLeft = url.searchParams.get('weeks') || '2';

  // The rows are decorative on the OG card — driven by simple defaults.
  const youRank = parseInt(url.searchParams.get('rank') || '3', 10);
  const rows = [
    { rank: 1, name: url.searchParams.get('row1') || 'Faiz R.',  pts: 142 },
    { rank: 2, name: url.searchParams.get('row2') || 'Bagas K.', pts: 138 },
    { rank: 3, name: url.searchParams.get('row3') || 'Kamu',     pts: 124 },
    { rank: 4, name: url.searchParams.get('row4') || 'Lila P.',  pts: 118 },
  ];

  return pickemShell(
    PICKEM_ORANGE,
    h(
      'div',
      {
        style: {
          flex: 1,
          padding: '64px 64px 32px',
          display: 'flex',
          flexDirection: 'column',
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 28,
            fontWeight: 700,
            color: PICKEM_INK_3,
            letterSpacing: 4,
            marginBottom: 24,
            display: 'flex',
          },
        },
        `GRUP · ${grup}`
      ),
      h(
        'div',
        {
          style: {
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: PICKEM_INK_1,
            marginBottom: 8,
            display: 'flex',
          },
        },
        headlineLine1
      ),
      h(
        'div',
        {
          style: {
            fontSize: 48,
            fontStyle: 'italic',
            color: PICKEM_ORANGE,
            marginBottom: 36,
            display: 'flex',
          },
        },
        kicker
      ),
      // Mini leaderboard
      h(
        'div',
        {
          style: {
            background: PICKEM_PAPER,
            border: `2px solid ${PICKEM_LINE}`,
            borderRadius: 24,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            marginBottom: 24,
          },
        },
        ...rows.map((row, i) => {
          const you = row.rank === youRank;
          return h(
            'div',
            {
              key: `${row.rank}-${row.name}`,
              style: {
                display: 'flex',
                alignItems: 'center',
                padding: '24px 32px',
                borderBottom: i < rows.length - 1 ? `1px solid ${PICKEM_LINE}` : 'none',
                background: you ? PICKEM_ORANGE_WASH : 'transparent',
                borderLeft: you ? `8px solid ${PICKEM_ORANGE}` : '8px solid transparent',
              },
            },
            h(
              'div',
              {
                style: {
                  fontSize: 32,
                  fontWeight: 700,
                  color: PICKEM_INK_1,
                  width: 80,
                  display: 'flex',
                },
              },
              `#${row.rank}`
            ),
            h(
              'div',
              {
                style: {
                  fontSize: 32,
                  fontWeight: you ? 700 : 500,
                  color: PICKEM_INK_1,
                  flex: 1,
                  display: 'flex',
                },
              },
              row.name + (you && change > 0 ? `  ▲ ${change}` : '')
            ),
            h(
              'div',
              {
                style: {
                  fontSize: 32,
                  fontWeight: 700,
                  color: PICKEM_INK_1,
                  display: 'flex',
                },
              },
              String(row.pts)
            )
          );
        })
      ),
      // Footer
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'auto',
          },
        },
        h(
          'div',
          {
            style: {
              fontSize: 30,
              fontStyle: 'italic',
              color: PICKEM_INK_3,
              display: 'flex',
              gap: 8,
            },
          },
          h('span', null, 'Selisih ke #1:'),
          h(
            'span',
            { style: { fontWeight: 700, color: PICKEM_INK_1, fontStyle: 'normal', display: 'flex' } },
            `${diffToFirst} poin`
          )
        ),
        h(
          'div',
          {
            style: {
              fontSize: 26,
              fontWeight: 700,
              color: PICKEM_ORANGE,
              letterSpacing: 3,
              display: 'flex',
            },
          },
          `${weeksLeft} PEKAN TERSISA`
        )
      )
    )
  );
}
