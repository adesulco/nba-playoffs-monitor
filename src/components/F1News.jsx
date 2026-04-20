import React from 'react';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { useF1News } from '../hooks/useF1News.js';

const F1_RED = '#E10600';

// Source → chip color. Keeps the sidebar visually scannable so you can
// pick "oh, that's an Autosport one, I trust that" at a glance.
// Bahasa sources get warm tints, English sources get cool tints — a soft
// visual cue that mirrors the ID/EN toggle, without competing with the
// F1-red brand accent.
const SOURCE_META = {
  // ID
  'detikSport':     { color: '#E8002D', short: 'detik'    },
  'Bola.com':       { color: '#1F8A4C', short: 'Bola'     },
  'CNN Indonesia':  { color: '#CC0000', short: 'CNN ID'   },
  'Kompas.com':     { color: '#0061A0', short: 'Kompas'   },
  // EN
  'Autosport':      { color: '#FFDB00', short: 'Autosport' },
  'Motorsport.com': { color: '#E8002D', short: 'Motorspt'  },
  'BBC Sport':      { color: '#BB1919', short: 'BBC'       },
  'Formula1.com':   { color: '#E10600', short: 'F1.com'    },
};

// Return a human-readable "2 jam lalu" / "2 hours ago" relative timestamp.
// Anything older than 7 days falls back to a compact DD/MM date.
function timeAgo(iso, lang) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const secs = Math.max(0, (Date.now() - t) / 1000);

  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  if (lang === 'id') {
    if (secs < 60) return 'baru saja';
    if (mins < 60) return `${mins} mnt lalu`;
    if (hrs < 24) return `${hrs} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    const d = new Date(t);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  if (secs < 60) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * F1News — terminal-style bilingual news sidebar.
 *
 * Picks its language from AppContext (id|en) and hits /api/f1-news in that
 * language. Bahasa sources show when lang=id, English sources show when
 * lang=en — no machine translation (see feedback_news_bilingual).
 *
 * Layout is a dense vertical list to match the Bloomberg-style dashboard.
 * Each row: source chip, title (link, new tab), relative timestamp.
 */
export default function F1News({ limit = 12 }) {
  const { lang } = useApp();
  const { items, loading, error, updatedAt } = useF1News(lang);
  const visible = items.slice(0, limit);

  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${F1_RED}`,
      borderRadius: 3,
      padding: '14px 14px 10px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 10,
      }}>
        <h2 style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 15, fontWeight: 600,
          margin: 0, color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Berita F1' : 'F1 News'}
          <span style={{ marginLeft: 8, fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 500 }}>
            {lang === 'id' ? 'LIVE · BAHASA + ENG' : 'LIVE · BAHASA + ENG'}
          </span>
        </h2>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 0.3 }}>
          {updatedAt ? `· ${timeAgo(updatedAt, lang)}` : ''}
        </div>
      </div>

      {/* Error */}
      {error && visible.length === 0 && (
        <div style={{ fontSize: 11, color: C.muted, padding: '8px 0' }}>
          {lang === 'id'
            ? 'Sumber berita lagi ngadat. Coba refresh beberapa menit lagi.'
            : 'News sources are slow. Try refreshing in a few minutes.'}
        </div>
      )}

      {/* Loading */}
      {loading && visible.length === 0 && !error && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Memuat berita…' : 'Loading news…'}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && visible.length === 0 && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Belum ada berita F1 terbaru.' : 'No recent F1 news.'}
        </div>
      )}

      {/* List */}
      {visible.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {visible.map((it, i) => {
            const meta = SOURCE_META[it.source] || { color: C.muted, short: it.source };
            return (
              <li key={it.url + i} style={{
                borderTop: i === 0 ? 'none' : `1px solid ${C.lineSoft}`,
                padding: '8px 0',
              }}>
                <a
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 10,
                    alignItems: 'baseline',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {/* Source chip */}
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    fontSize: 8.5,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    color: '#fff',
                    background: meta.color,
                    borderRadius: 2,
                    whiteSpace: 'nowrap',
                    minWidth: 54,
                    textAlign: 'center',
                  }}>
                    {meta.short.toUpperCase()}
                  </span>

                  {/* Title */}
                  <span style={{
                    fontSize: 12,
                    color: C.text,
                    fontWeight: 500,
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {it.title}
                  </span>

                  {/* Timestamp */}
                  <span style={{
                    fontSize: 9.5,
                    color: C.muted,
                    fontFamily: '"JetBrains Mono", monospace',
                    letterSpacing: 0.3,
                    whiteSpace: 'nowrap',
                  }}>
                    {timeAgo(it.pubDate, lang)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footnote */}
      <div style={{
        fontSize: 9, color: C.muted, padding: '8px 0 2px', letterSpacing: 0.3,
        borderTop: `1px solid ${C.lineSoft}`, marginTop: 8, paddingTop: 8,
      }}>
        {lang === 'id'
          ? 'Sumber: detikSport · Bola.com · CNN Indonesia · Kompas (refresh tiap 15 mnt)'
          : 'Sources: Autosport · Motorsport.com · BBC Sport · Formula1.com (refresh every 15 min)'}
      </div>
    </section>
  );
}
