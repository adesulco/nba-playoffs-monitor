import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';

/**
 * <SportFooter> — v0.13.0 SEO sprint, Ship 3E.
 *
 * Site-wide cross-sport navigation grid + auxiliary links. Mounts in
 * App.jsx below the route Suspense so EVERY page (including 404 + the
 * SettingsTeams + every leaf) ends with a link to all sport hubs and
 * to /about, /glossary, /settings/teams.
 *
 * Why a global footer:
 *   - Discovery: a Liga Inggris reader rarely wanders to /tennis without
 *     a visible cue. The grid puts every sport one click away.
 *   - PageRank flow: every page now links to every sport hub from the
 *     footer, distributing crawl authority more evenly across the site.
 *   - Brand: the wordmark + tagline grounds the user in gibol.co even
 *     on heavy data pages where the V2TopBar might feel small.
 *
 * Per-page footers (gibol.co · NBA Indonesia / data sources / disclaimer)
 * stay as-is — those carry sport-specific context. SportFooter sits
 * below them.
 */
const HUBS = [
  { to: '/nba-playoff-2026',         labelId: 'NBA Playoffs 2026',     labelEn: 'NBA Playoffs 2026',    accent: '#c8102e' },
  { to: '/premier-league-2025-26',   labelId: 'Liga Inggris 2025-26',  labelEn: 'Premier League 2025-26', accent: '#37003c' },
  { to: '/formula-1-2026',           labelId: 'Formula 1 2026',        labelEn: 'Formula 1 2026',       accent: '#E8002D' },
  { to: '/tennis',                   labelId: 'Tenis 2026',            labelEn: 'Tennis 2026',          accent: '#1F6FB4' },
  { to: '/fifa-world-cup-2026',      labelId: 'Piala Dunia FIFA 2026', labelEn: 'FIFA World Cup 2026',  accent: '#326295' },
  { to: '/super-league-2025-26',     labelId: 'Super League Indonesia',labelEn: 'Indonesian Super League', accent: '#E2231A' },
  { to: '/ibl',                      labelId: 'IBL · Liga Basket Indonesia', labelEn: 'IBL · Indonesian Basketball League', accent: '#0077c0' },
];

const META_LINKS = [
  { to: '/about',          labelId: 'Tentang',  labelEn: 'About' },
  { to: '/glossary',       labelId: 'Glosarium', labelEn: 'Glossary' },
  { to: '/settings/teams', labelId: 'Tim Favorit', labelEn: 'Favorite Teams' },
  { to: '/recap',          labelId: 'Catatan Playoff', labelEn: 'Playoff Recap' },
];

export default function SportFooter() {
  const { lang } = useApp();
  return (
    <footer
      role="contentinfo"
      style={{
        background: C.panelSoft,
        borderTop: `1px solid ${C.line}`,
        padding: '32px 20px 24px',
        marginTop: 24,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gap: 28,
        }}
      >
        {/* Sport hubs grid */}
        <div>
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 10,
              letterSpacing: 1.4,
              color: C.dim,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {lang === 'id' ? 'Hub Olahraga' : 'Sport Hubs'}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 6,
            }}
          >
            {HUBS.map((h) => (
              <Link
                key={h.to}
                to={h.to}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: 'transparent',
                  border: `1px solid ${C.line}`,
                  borderLeft: `3px solid ${h.accent}`,
                  borderRadius: 3,
                  color: C.text,
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  minHeight: 36,
                }}
              >
                {lang === 'id' ? h.labelId : h.labelEn}
              </Link>
            ))}
          </div>
        </div>

        {/* Meta links + brand */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 16,
            paddingTop: 12,
            borderTop: `1px solid ${C.lineSoft}`,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 18,
                fontWeight: 700,
                color: C.text,
                letterSpacing: '-0.02em',
                marginBottom: 4,
              }}
            >
              gibol.co
            </div>
            <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.5 }}>
              {lang === 'id'
                ? 'Gila bola · dashboard olahraga live untuk fan Indonesia.'
                : 'Gila bola · live sports dashboards for Indonesian fans.'}
            </div>
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px 16px',
              fontSize: 11,
            }}
          >
            {META_LINKS.map((m) => (
              <li key={m.to}>
                <Link
                  to={m.to}
                  style={{
                    color: C.dim,
                    textDecoration: 'none',
                    padding: '6px 0',
                    display: 'inline-block',
                  }}
                >
                  {lang === 'id' ? m.labelId : m.labelEn}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
