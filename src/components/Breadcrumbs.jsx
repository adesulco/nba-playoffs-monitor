import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';

/**
 * Visual <Breadcrumbs> — v0.13.0 SEO sprint.
 *
 * Renders the hub-to-leaf navigation path users + crawlers see at the
 * top of leaf pages (per-team, per-club, per-driver, per-tournament).
 * Mirrors the BreadcrumbList JSON-LD already emitted by each adapter
 * so the visual breadcrumb and the schema are always in sync.
 *
 * Why a dedicated component vs ad-hoc links:
 *   - Consistent visual style across sports (no drift).
 *   - One place to add aria-current="page" for the leaf.
 *   - Semantic HTML <nav aria-label="Breadcrumb">+<ol> for AT users.
 *
 * Props:
 *   items — [{ name, to }]
 *     `name` is the visible label (Bahasa or English, parent's choice).
 *     `to`   is a relative SPA path. The LAST item is rendered as plain
 *            text (current page); all earlier items are <Link>s.
 *
 * Usage:
 *   <Breadcrumbs items={[
 *     { name: 'NBA Playoffs 2026', to: '/nba-playoff-2026' },
 *     { name: 'Oklahoma City Thunder' }, // current page — no `to`
 *   ]} />
 */
export default function Breadcrumbs({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        padding: '8px 0',
        fontSize: 11,
        color: C.dim,
        fontFamily: 'var(--font-mono)',
        letterSpacing: 0.3,
      }}
    >
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <li>
          <Link
            to="/"
            style={{
              color: C.dim,
              textDecoration: 'none',
              padding: '4px 0',
              display: 'inline-block',
            }}
          >
            gibol.co
          </Link>
        </li>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <React.Fragment key={`${item.name}-${i}`}>
              <li aria-hidden="true" style={{ color: C.muted }}>›</li>
              <li>
                {isLast || !item.to ? (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    style={{
                      color: C.text,
                      fontWeight: 600,
                      padding: '4px 0',
                      display: 'inline-block',
                    }}
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    to={item.to}
                    style={{
                      color: C.dim,
                      textDecoration: 'none',
                      padding: '4px 0',
                      display: 'inline-block',
                    }}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
