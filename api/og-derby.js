/**
 * Derby share-card OG endpoint — `/api/og-derby`.
 *
 * v0.21.0 Phase 2 follow-up · growth-track. Renders a
 * prediction-baked share card so when a fan picks a derby score,
 * shares it on WhatsApp / X / IG, the unfurl shows their pick
 * with full Persija ↔ Persib branding. This is the single biggest
 * virality multiplier we can ship in the 13 days before the JIS
 * derby on 2026-05-10.
 *
 * Runtime: edge (mirrors api/og-recap.js pattern). Per-request
 * @vercel/og does the satori → resvg pipeline; first hit per
 * unique param combo pays ~150-300ms compute, subsequent hits
 * served from Vercel's edge cache.
 *
 * Query params:
 *   score   — "2-1" (Persija-Persib, dash-separated). Defaults to "1-1".
 *   side    — "persija" | "persib" | "neutral". Tints accent + side
 *             label. Defaults to "neutral".
 *   handle  — optional shouter handle ("Bobotoh", "Ade", etc.).
 *             Truncated at 24 chars. Renders as a "— @{handle}" line
 *             below the score.
 *   size    — "og" | "story" | "square".
 *             og     = 1200×630 (default; Twitter / WhatsApp / FB unfurl)
 *             story  = 1080×1920 (Instagram Story / vertical phone share)
 *             square = 1080×1080 (Instagram feed post)
 *
 * Cache strategy: Cache-Control public, s-maxage=86400,
 * stale-while-revalidate=604800. Once a prediction PNG has been
 * generated for a given param combo, Vercel's edge serves it from
 * cache for a week before re-generating.
 *
 * Why dynamic instead of pre-generated static PNGs (per CLAUDE.md
 * "prefer static"): the cardinality is unbounded once handles
 * enter the picture (7 scores × 3 sides × ~thousands of handles).
 * Aggressive edge cache + the function's tiny compute cost makes
 * dynamic the right call here. We pay for first-hit only.
 */

import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = {
  runtime: 'edge',
};

// Brand palette — pulled from src/lib/sports/liga-1-id/derby.js
// (DERBY_SIDES.persija.accent, DERBY_SIDES.persib.accent). Hard-coded
// here so the edge function doesn't have to import the SPA module.
const PERSIJA_RED = '#E2231A';
const PERSIB_BLUE = '#005BAC';
const BG_DARK = '#0A1628';
const TEXT = '#E6EEF9';
const DIM = '#9FB4CC';
const AMBER = '#F59E0B';

const SIZES = {
  og:     { w: 1200, h: 630,  scoreSize: 220, nameSize: 64 },
  story:  { w: 1080, h: 1920, scoreSize: 320, nameSize: 88 },
  square: { w: 1080, h: 1080, scoreSize: 280, nameSize: 80 },
};

const h = React.createElement;

function safeScore(raw) {
  // Accept "2-1", "0-0", up to single digits each side. Reject anything else.
  const m = String(raw || '').match(/^([0-9])-([0-9])$/);
  if (!m) return { home: 1, away: 1, raw: '1-1' };
  return { home: Number(m[1]), away: Number(m[2]), raw: `${m[1]}-${m[2]}` };
}

function safeSide(raw) {
  const v = String(raw || '').toLowerCase();
  if (v === 'persija' || v === 'persib' || v === 'neutral') return v;
  return 'neutral';
}

function safeHandle(raw) {
  // Strip leading @, cap at 24 chars, allow only safe glyphs (letters,
  // digits, underscore, dot, dash, space). Anything else gets dropped
  // — the OG endpoint runs on edge with no auth, so we treat the
  // handle as untrusted input.
  const s = String(raw || '').replace(/^@/, '').slice(0, 24);
  if (!/^[a-zA-Z0-9_.\- ]*$/.test(s)) return '';
  return s;
}

export default function handler(req) {
  const url = new URL(req.url);
  const score = safeScore(url.searchParams.get('score'));
  const side = safeSide(url.searchParams.get('side'));
  const handle = safeHandle(url.searchParams.get('handle'));
  const sizeKey = url.searchParams.get('size') || 'og';
  const size = SIZES[sizeKey] || SIZES.og;

  // Decide which side "won" the prediction for visual emphasis.
  const winner = score.home > score.away ? 'persija'
              : score.away > score.home ? 'persib'
              : 'draw';

  // Background gradient — Persija red ← center → Persib blue.
  // Tint shifts based on `side` pick: leans red if user is Jakmania,
  // blue if Bobotoh, balanced for neutral.
  const bgGradient =
    side === 'persija'
      ? `linear-gradient(135deg, ${PERSIJA_RED}99 0%, ${BG_DARK} 50%, ${PERSIB_BLUE}55 100%)`
      : side === 'persib'
        ? `linear-gradient(135deg, ${PERSIJA_RED}55 0%, ${BG_DARK} 50%, ${PERSIB_BLUE}99 100%)`
        : `linear-gradient(135deg, ${PERSIJA_RED}77 0%, ${BG_DARK} 50%, ${PERSIB_BLUE}77 100%)`;

  const tagText = side === 'persija' ? 'JAKMANIA · PREDIKSI GUE'
                : side === 'persib'  ? 'BOBOTOH · PREDIKSI GUE'
                : 'PREDIKSI GUE';

  // Layout — column for square/og, taller column for story.
  const padding = sizeKey === 'story' ? 80 : 56;

  const root = h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: bgGradient,
        color: TEXT,
        fontFamily: 'sans-serif',
        position: 'relative',
        padding,
      },
    },

    // Top-left eyebrow strip.
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: sizeKey === 'story' ? 28 : 20,
          letterSpacing: 4,
          fontWeight: 700,
          color: AMBER,
          textTransform: 'uppercase',
        },
      },
      'EL CLASICO INDONESIA',
      h('span', { style: { color: DIM, display: 'flex' } }, '·'),
      h('span', { style: { color: TEXT, display: 'flex' } }, '10 MEI 2026'),
      h('span', { style: { color: DIM, display: 'flex' } }, '·'),
      h('span', { style: { color: TEXT, display: 'flex' } }, 'JIS'),
    ),

    // Predikssi gue tag.
    h(
      'div',
      {
        style: {
          marginTop: sizeKey === 'story' ? 60 : 36,
          fontSize: sizeKey === 'story' ? 32 : 22,
          letterSpacing: 6,
          fontWeight: 700,
          color: side === 'persija' ? PERSIJA_RED : side === 'persib' ? PERSIB_BLUE : AMBER,
          textTransform: 'uppercase',
          display: 'flex',
        },
      },
      tagText,
    ),

    // Score row — PERSIJA  N–N  PERSIB.
    h(
      'div',
      {
        style: {
          marginTop: sizeKey === 'story' ? 40 : 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: 24,
        },
      },
      // Persija block
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            flex: 1,
            minWidth: 0,
          },
        },
        h(
          'div',
          {
            style: {
              fontSize: size.nameSize,
              fontWeight: 900,
              letterSpacing: -2,
              color: winner === 'persija' ? '#fff' : DIM,
              display: 'flex',
              lineHeight: 1,
            },
          },
          'PERSIJA',
        ),
        h(
          'div',
          {
            style: {
              marginTop: 8,
              fontSize: sizeKey === 'story' ? 24 : 18,
              letterSpacing: 2,
              fontWeight: 700,
              color: PERSIJA_RED,
              textTransform: 'uppercase',
              display: 'flex',
            },
          },
          'MACAN KEMAYORAN',
        ),
      ),

      // Center score
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
            padding: '0 24px',
          },
        },
        h(
          'div',
          {
            style: {
              fontSize: size.scoreSize,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: -8,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'baseline',
            },
          },
          h('span', { style: { color: winner === 'persija' ? '#fff' : DIM, display: 'flex' } }, String(score.home)),
          h('span', { style: { color: AMBER, margin: '0 18px', fontSize: size.scoreSize * 0.7, display: 'flex' } }, '–'),
          h('span', { style: { color: winner === 'persib' ? '#fff' : DIM, display: 'flex' } }, String(score.away)),
        ),
      ),

      // Persib block
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            flex: 1,
            minWidth: 0,
          },
        },
        h(
          'div',
          {
            style: {
              fontSize: size.nameSize,
              fontWeight: 900,
              letterSpacing: -2,
              color: winner === 'persib' ? '#fff' : DIM,
              display: 'flex',
              lineHeight: 1,
            },
          },
          'PERSIB',
        ),
        h(
          'div',
          {
            style: {
              marginTop: 8,
              fontSize: sizeKey === 'story' ? 24 : 18,
              letterSpacing: 2,
              fontWeight: 700,
              color: PERSIB_BLUE,
              textTransform: 'uppercase',
              display: 'flex',
            },
          },
          'MAUNG BANDUNG',
        ),
      ),
    ),

    // Optional shouter handle line.
    handle
      ? h(
          'div',
          {
            style: {
              marginTop: sizeKey === 'story' ? 80 : 40,
              fontSize: sizeKey === 'story' ? 36 : 26,
              fontWeight: 600,
              color: TEXT,
              display: 'flex',
            },
          },
          `— ${handle}`,
        )
      : null,

    // Spacer to push footer down.
    h('div', { style: { flex: 1, display: 'flex' } }),

    // Footer: domain + tagline.
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: sizeKey === 'story' ? 28 : 20,
          color: DIM,
          fontWeight: 600,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
        },
      },
      h('span', { style: { display: 'flex', color: TEXT } }, 'gibol.co/derby/persija-persib'),
      h('span', { style: { display: 'flex' } }, 'derby No. 1 Indonesia'),
    ),
  );

  return new ImageResponse(root, {
    width: size.w,
    height: size.h,
    headers: {
      // 1 day at the edge, 7 days SWR — once a prediction PNG is
      // generated, it's served from cache aggressively. New params
      // miss the cache and pay the ~150-300ms render cost on first hit.
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
