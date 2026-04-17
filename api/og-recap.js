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

const h = React.createElement;

export default function handler(req) {
  const url = new URL(req.url);
  const rawDate = url.searchParams.get('date') || '';
  const rawHeadline = url.searchParams.get('headline') || '';
  const rawSubtitle = url.searchParams.get('subtitle') || '';
  const gamesCount = url.searchParams.get('games') || '';
  const accent = url.searchParams.get('accent') || ORANGE;

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
          zIndex: 2,
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
          marginBottom: 'auto',
          maxWidth: 1020,
          opacity: 0.85,
          zIndex: 2,
          display: 'flex',
        },
      },
      subtitle
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
