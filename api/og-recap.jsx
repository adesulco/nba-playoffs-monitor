import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

// OG images are 1200x630 — Twitter, Facebook, WhatsApp, LinkedIn, Slack all use this canonical size.
const W = 1200;
const H = 630;

// Brand colors — match gibol.co dark theme masthead.
const BG = '#08111f';
const PANEL = '#0f1a2d';
const ORANGE = '#ffb347';
const NBA_RED = '#e8502e';
const TEXT = '#e6edf5';
const DIM = '#8899aa';

export default function handler(req) {
  const url = new URL(req.url);
  const rawDate = url.searchParams.get('date') || '';
  const rawHeadline = url.searchParams.get('headline') || '';
  const rawSubtitle = url.searchParams.get('subtitle') || '';
  const gamesCount = url.searchParams.get('games') || '';
  const accent = url.searchParams.get('accent') || ORANGE;

  // Truncate to sane lengths — huge headlines break layout.
  const headline = rawHeadline.slice(0, 90) || 'Catatan Playoff NBA';
  const subtitle = rawSubtitle.slice(0, 120) || 'Skor · Top Scorer · Momen Terbesar';

  // Format the date for display (fallback to today if missing).
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
  } catch {
    // keep raw
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: BG,
          color: TEXT,
          fontFamily: 'sans-serif',
          position: 'relative',
          padding: 56,
        }}
      >
        {/* Massive watermark "NBA" in corner */}
        <div
          style={{
            position: 'absolute',
            right: -40,
            bottom: -100,
            fontSize: 420,
            fontWeight: 900,
            color: 'rgba(232,80,46,0.08)',
            letterSpacing: -10,
            lineHeight: 1,
            display: 'flex',
          }}
        >
          NBA
        </div>

        {/* Orange accent bar top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: `linear-gradient(90deg, ${accent}, ${NBA_RED})`,
            display: 'flex',
          }}
        />

        {/* Brand row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 32,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: -1,
              display: 'flex',
            }}
          >
            gibol.co
          </div>
          <div
            style={{
              padding: '6px 14px',
              background: accent,
              color: BG,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2,
              borderRadius: 4,
              display: 'flex',
            }}
          >
            CATATAN PLAYOFF
          </div>
        </div>

        {/* Date */}
        <div
          style={{
            fontSize: 20,
            color: DIM,
            letterSpacing: 3,
            marginBottom: 24,
            display: 'flex',
          }}
        >
          {displayDate || 'NBA POSTSEASON 2025–26'}
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: headline.length > 50 ? 58 : 72,
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.08,
            letterSpacing: -1.5,
            marginBottom: 24,
            maxWidth: 1060,
            zIndex: 2,
            display: 'flex',
          }}
        >
          {headline}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 26,
            color: TEXT,
            lineHeight: 1.35,
            marginBottom: 'auto',
            maxWidth: 1020,
            opacity: 0.85,
            zIndex: 2,
            display: 'flex',
          }}
        >
          {subtitle}
        </div>

        {/* Footer row */}
        <div
          style={{
            position: 'absolute',
            left: 56,
            right: 56,
            bottom: 40,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: DIM,
              letterSpacing: 1.5,
              display: 'flex',
              gap: 20,
            }}
          >
            {gamesCount ? <span>{gamesCount} LAGA</span> : <span>NBA PLAYOFF 2026</span>}
            <span style={{ color: accent }}>●</span>
            <span>ESPN · POLYMARKET</span>
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: accent,
              letterSpacing: 1,
              display: 'flex',
            }}
          >
            GILA BOLA →
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      // 1 year CDN cache keyed by query string. When headline/date changes the URL changes,
      // so stale entries don't serve.
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'image/png',
      },
    }
  );
}
