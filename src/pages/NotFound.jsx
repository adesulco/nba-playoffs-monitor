import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

/**
 * NotFound — v0.12.10 catch-all route for unknown SPA paths.
 *
 * Pre-fix: <Route path="*" element={<Navigate to="/" replace />} />
 * silently redirected to home, hiding the bad URL completely. Bots
 * indexing /admin or /wp-admin saw HTTP 200 and the home page,
 * polluting Google's index with garbage canonicals.
 *
 * Now:
 *   - Renders a clear "halaman tidak ditemukan" UI with quick links
 *     to the live sport hubs (so a typo'd team URL is one tap from
 *     the right page).
 *   - SEO emits <meta name="robots" content="noindex, nofollow">
 *     so JS-executing crawlers de-list the URL on next pass.
 *   - Vercel-side, /public/404.html with HTTP 404 status handles
 *     non-JS crawlers via the file-system 404 fallback (only fires
 *     for paths not covered by the explicit SPA-route rewrites in
 *     vercel.json).
 */
export default function NotFound() {
  const { lang } = useApp();
  const location = useLocation();

  return (
    <div style={{
      background: C.bg,
      minHeight: '100vh',
      color: C.text,
      fontFamily: '"JetBrains Mono", monospace',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <SEO
        title={lang === 'id' ? 'Halaman tidak ditemukan · gibol.co' : 'Page not found · gibol.co'}
        description={lang === 'id'
          ? 'Halaman yang kamu cari tidak ada. Cek hub olahraga di gibol.co.'
          : 'The page you are looking for does not exist. Browse the sport hubs on gibol.co.'}
        path={location.pathname}
        lang={lang}
        noindex
      />
      <main style={{ maxWidth: 540, width: '100%', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 96,
          fontWeight: 700,
          color: C.amber,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          marginBottom: 12,
        }}>
          404
        </div>
        <h1 style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 24,
          fontWeight: 700,
          margin: '0 0 12px',
          letterSpacing: '-0.02em',
        }}>
          {lang === 'id' ? 'Halaman tidak ditemukan' : 'Page not found'}
        </h1>
        <p style={{ fontSize: 13, color: C.dim, margin: '0 0 24px', lineHeight: 1.5 }}>
          {lang === 'id'
            ? 'URL yang kamu masuk tidak ada di gibol.co. Mungkin link-nya expired, atau ada typo. Coba langsung ke salah satu hub di bawah.'
            : 'The URL you entered does not exist on gibol.co. The link may be expired or contain a typo. Try one of the hubs below.'}
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 8,
          marginBottom: 16,
        }}>
          {[
            { to: '/nba-playoff-2026',         label: 'NBA Playoffs 2026', accent: '#c8102e' },
            { to: '/premier-league-2025-26',   label: lang === 'id' ? 'Liga Inggris' : 'Premier League', accent: '#37003c' },
            { to: '/formula-1-2026',           label: 'Formula 1 2026',    accent: '#E8002D' },
            { to: '/tennis',                   label: lang === 'id' ? 'Tenis 2026' : 'Tennis 2026', accent: '#1F6FB4' },
          ].map((it) => (
            <Link
              key={it.to}
              to={it.to}
              style={{
                display: 'block',
                padding: '12px 14px',
                background: `${it.accent}22`,
                border: `1px solid ${it.accent}`,
                borderLeft: `3px solid ${it.accent}`,
                borderRadius: 4,
                color: C.text,
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              {it.label}
            </Link>
          ))}
        </div>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: 'transparent',
            color: C.dim,
            border: `1px solid ${C.line}`,
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            letterSpacing: 0.3,
          }}
        >
          {lang === 'id' ? '← Kembali ke beranda' : '← Back to home'}
        </Link>
      </main>
    </div>
  );
}
