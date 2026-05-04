import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';

/**
 * <PeerNav> — v0.13.0 SEO sprint.
 *
 * Renders a horizontally-scrollable strip of sibling-entity links on
 * leaf pages. The point: distribute PageRank from a hub-adjacent leaf
 * (e.g. /nba-playoff-2026/lakers) to its siblings (/celtics, /thunder,
 * etc.). Without internal links, leaf pages are crawl islands that
 * Google reaches only via sitemap.xml — much weaker signal.
 *
 * Visual: small color-swatch chips (matching the team/constructor/
 * club/player accent), horizontal scroll on mobile, wraps on desktop.
 * The current entity is omitted from the list (don't link a page to
 * itself).
 *
 * Props:
 *   title         — section heading (Bahasa or English)
 *   currentSlug   — slug of the current leaf to omit from the list
 *   items         — [{ slug, name, short?, color, href }]
 *                   `name` is shown as the chip label.
 *                   `short` is a 2-3-char abbreviation in the swatch.
 *                   `color` is the hex accent.
 *                   `href` is the SPA path.
 *   maxItems      — optional cap (default 12) to keep the strip light
 */
export default function PeerNav({ title, currentSlug, items, maxItems = 12 }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const filtered = items.filter((it) => it.slug !== currentSlug).slice(0, maxItems);
  if (filtered.length === 0) return null;
  return (
    <section
      aria-label={title}
      style={{
        background: C.panel,
        border: `1px solid ${C.lineSoft}`,
        borderRadius: 4,
        padding: '12px 14px',
        margin: '14px 0',
      }}
    >
      <h2
        style={{
          margin: '0 0 10px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: 1.2,
          color: C.dim,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        {filtered.map((it) => (
          <Link
            key={it.slug}
            to={it.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: 'transparent',
              border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${it.color}`,
              borderRadius: 3,
              fontSize: 11.5,
              fontFamily: 'inherit',
              color: C.text,
              textDecoration: 'none',
              minHeight: 28,
            }}
          >
            {it.short && (
              <span
                aria-hidden="true"
                style={{
                  width: 16,
                  height: 16,
                  background: it.color,
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 7.5,
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: 0.3,
                  flexShrink: 0,
                }}
              >
                {it.short}
              </span>
            )}
            <span style={{ whiteSpace: 'nowrap' }}>{it.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
