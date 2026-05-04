import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SectionRule from './SectionRule.jsx';
import AiByline from './AiByline.jsx';
import { supabase } from '../../lib/supabase.js';

/**
 * 3-up newsroom card grid for the bottom of every sport hub.
 *
 * Phase 2 ship Phase C (per docs/redesign-v4-handover.md §4 Phase C).
 * Reads from /content/index.json — the manifest the prerender pipeline
 * builds at deploy time. Filters by sport + published-only + sorts
 * by published_at desc. First card is the lead (16/9 hero placeholder
 * + deck + meta), 2-3 are stacked compact cards.
 *
 * Public-only — articles still in the editor's queue (no
 * publishStatus row) are excluded by checking `article.manual_review`
 * being explicitly false OR the prerender's published manifest.
 * For v1 we just filter on `manual_review === false`; if that's not
 * granular enough, future ship can fetch ce_article_publishes too.
 *
 * Props:
 *   sport       — 'nba' | 'epl' | 'liga-1-id' | 'f1' | 'tennis' | 'fifa'
 *                 Drives the league filter against article.league.
 *   limit       — max cards (default 4: 1 lead + 3 stacked).
 *   newsroomLabel — section-rule kicker label, default "<SPORT> NEWSROOM".
 *   moreHref    — optional. When provided, SectionRule renders
 *                 a "Lihat semua →" action link.
 *   className   — passthrough.
 *
 * Mobile-first: 2-up on mobile (stacks), 3-up on tablet, 4-up
 * (lead + 3 stacked) on desktop ≥1024px. The lead card always
 * spans the first column on desktop.
 */

// Map our content-engine type → public route. Mirrors the mapping in
// scripts/prerender.mjs's editor-index builder.
function routeForArticle(a) {
  if (a.path) return a.path;
  const t = a.type;
  if (t === 'recap') return `/match-recap/${a.slug}`;
  if (t === 'team') return `/profile/${a.slug}`;
  return `/${t}/${a.slug}`;
}

// Friendly "X jam lalu" relative time in Bahasa.
function _formatRelative(iso) {
  if (!iso) return '';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const now = new Date();
  const diff = (now.getTime() - t.getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.round(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.round(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.round(diff / 86400)} hari lalu`;
  return t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

const TYPE_KICKER = {
  preview: 'PREVIEW',
  recap: 'RECAP',
  standings: 'KLASEMEN',
  team: 'PROFIL',
  h2h: 'H2H',
};

// Per-sport gradient tint for the card hero placeholder. Matches
// HeroBand.jsx's SPORT_TINT.
const SPORT_TINT = {
  nba: '#F97316',
  epl: '#22C55E',
  'liga-1-id': '#EF4444',
  f1: '#E10600',
  tennis: '#D4A13A',
  fifa: '#326295',
};

function CardPlaceholder({ sport, ratio = '16/9', maxHeight }) {
  const tint = SPORT_TINT[sport] || SPORT_TINT.nba;
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: ratio,
        maxHeight: maxHeight || undefined,
        overflow: 'hidden',
        borderRadius: 6,
        background: 'var(--bg-3)',
        border: '1px solid var(--line-soft)',
      }}
    >
      <svg
        viewBox="0 0 400 225"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`ns-${sport}`} cx="0.7" cy="0.35" r="0.5">
            <stop offset="0%" stopColor={tint} stopOpacity="0.32" />
            <stop offset="100%" stopColor="#0A1628" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="225" fill="#0F1E36" />
        <rect width="400" height="225" fill={`url(#ns-${sport})`} />
        <g stroke="#FFFFFF" strokeOpacity="0.025" strokeWidth="1">
          {Array.from({ length: 18 }, (_, i) => (
            <line key={i} x1={i * 24} y1="0" x2={i * 24 + 60} y2="225" />
          ))}
        </g>
      </svg>
    </div>
  );
}

// v0.58.3 — Contextual filter for the home page. Replaces the
// per-sport "newest approved" behavior with relevance-weighted
// surfacing tied to the current/recent/upcoming match window.
//
// Scoring (0-100, articles below 1 are dropped):
//   • Just-finished recap (< 6h post-kickoff)        → 95-100
//   • Live preview (just before kickoff or ongoing)  → 90
//   • Recent recap (6-48h post-kickoff)              → 60-95
//   • Soon preview (< 24h to kickoff)                → 50-80
//   • This-week standings                            → 30-60
//   • Recent profile (< 14d)                         → 10-30
//   • H2H                                            → 20-25
//
// Same shape as the per-sport feed (lead + stacked) so the visual
// component below works for both modes.
export function buildContextualFeed(articles, limit = 4) {
  if (!Array.isArray(articles)) return [];
  const now = Date.now();
  const HOURS = 3600 * 1000;
  const DAYS = 24 * HOURS;
  const items = [];
  for (const a of articles) {
    if (!(a.approved === true || a.manual_review === false)) continue;
    let score = 0;
    if (a.type === 'recap' && a.kickoff_utc) {
      const ago = now - new Date(a.kickoff_utc).getTime();
      if (ago > 0 && ago < 48 * HOURS) {
        // Closer to kickoff = higher score. 100 at t=0, 50 at t=48h.
        score = 100 - (ago / (48 * HOURS)) * 50;
      }
    } else if (a.type === 'preview' && a.kickoff_utc) {
      const ahead = new Date(a.kickoff_utc).getTime() - now;
      if (ahead < 0 && ahead > -3 * HOURS) {
        // Game just started — preview is hot live-companion content
        score = 90;
      } else if (ahead > 0 && ahead < 24 * HOURS) {
        // Closer to kickoff = higher score. 80 at t=0, 50 at t=24h.
        score = 80 - (ahead / (24 * HOURS)) * 30;
      }
    } else if (a.type === 'standings') {
      const ago = now - new Date(a.published_at || 0).getTime();
      if (ago < 7 * DAYS) score = 60 - (ago / (7 * DAYS)) * 30;
    } else if (a.type === 'team') {
      const ago = now - new Date(a.published_at || 0).getTime();
      if (ago < 14 * DAYS) score = 30 - (ago / (14 * DAYS)) * 20;
    } else if (a.type === 'h2h') {
      score = 25;
    }
    if (score >= 1) items.push({ ...a, _relevanceScore: score });
  }
  return items
    .sort((a, b) => b._relevanceScore - a._relevanceScore)
    .slice(0, limit);
}

export default function NewsroomSlice({
  sport,
  contextual = false,
  limit = 4,
  newsroomLabel,
  moreHref,
  className = '',
}) {
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/content/index.json', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(async (data) => {
        if (cancelled) return;

        // v0.58.3 — contextual mode: relevance-weighted surfacing
        // for the home page (mixes sports, biases to current match
        // window). Falls back to legacy per-sport "newest approved"
        // behavior on hub pages where contextual=false.
        if (contextual) {
          const feed = buildContextualFeed(data.articles || [], limit);
          // If contextual yields nothing (no recent matches), fall
          // back to "any approved" so the slice doesn't render empty.
          const fallback = feed.length === 0
            ? (data.articles || [])
                .filter((a) => a.approved === true || a.manual_review === false)
                .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
                .slice(0, limit)
            : feed;
          setArticles(fallback);
          return;
        }

        // Per-sport legacy mode (hub pages).
        let filtered = (data.articles || [])
          .filter((a) => a.league === sport)
          .filter((a) => a.approved === true || a.manual_review === false)
          .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
          .slice(0, limit);

        // Runtime fallback when build-time bake gave nothing.
        if (filtered.length === 0 && (data.articles || []).some((a) => a.league === sport)) {
          try {
            const { data: ledger } = await supabase
              .from('ce_article_publishes')
              .select('slug, type')
              .order('published_at', { ascending: false })
              .limit(50);
            if (cancelled) return;
            const approvedKeys = new Set((ledger || []).map((r) => `${r.type}:${r.slug}`));
            filtered = (data.articles || [])
              .filter((a) => a.league === sport)
              .filter((a) => approvedKeys.has(`${a.type}:${a.slug}`))
              .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
              .slice(0, limit);
          } catch (_) { /* silent — fall through to empty */ }
        }

        setArticles(filtered);
      })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)); });
    return () => { cancelled = true; };
  }, [sport, contextual, limit]);

  // Hide entirely while loading + on empty (no published articles
  // for this sport yet). Phase C requirement: no skeleton state
  // crowding the hub bottom — hubs work fine without a newsroom.
  if (error || !articles || articles.length === 0) return null;

  const [lead, ...rest] = articles;
  const restCards = rest.slice(0, 3); // cap at 3 stacked

  const label = newsroomLabel || `${sport.toUpperCase()} NEWSROOM`;
  const action = moreHref ? { to: moreHref, label: 'Lihat semua' } : null;

  return (
    <section className={`v2 newsroom-slice ${className}`.trim()} style={{ marginTop: 32 }}>
      <SectionRule action={action}>{label}</SectionRule>

      <div
        className="newsroom-grid"
        style={{
          display: 'grid',
          gap: 18,
        }}
      >
        {/* Lead — text-led editorial card. v0.58.6: removed the
            16/9 SVG gradient hero. Until we have real article art,
            the placeholder reads as an empty container — especially
            in light mode where the dark navy block sits on cream.
            Bloomberg / NYT-style: the lead is bigger type + a deck,
            not a giant empty hero. */}
        <Link
          to={routeForArticle(lead)}
          className="newsroom-lead"
          style={{
            display: 'block',
            textDecoration: 'none',
            color: 'inherit',
            paddingTop: 4,
            borderTop: '2px solid var(--ink)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--amber)',
              marginTop: 12,
              marginBottom: 8,
            }}
          >
            <span>{TYPE_KICKER[lead.type] || lead.type}</span>
            <AiByline link={false} />
          </div>
          <h3
            className="serif"
            style={{
              fontFamily: 'Newsreader, "Inter Tight", Georgia, serif',
              fontSize: 'clamp(24px, 3.2vw, 36px)',
              fontWeight: 700,
              lineHeight: 1.14,
              color: 'var(--ink)',
              margin: '0 0 12px',
              letterSpacing: -0.015,
            }}
          >
            {lead.title}
          </h3>
          {lead.description && (
            <p
              style={{
                fontFamily: 'Newsreader, "Inter Tight", Georgia, serif',
                fontSize: 17,
                lineHeight: 1.5,
                color: 'var(--ink-2)',
                margin: '0 0 12px',
              }}
            >
              {lead.description}
            </p>
          )}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-3)',
              letterSpacing: '0.06em',
            }}
          >
            {_formatRelative(lead.published_at)}
          </div>
        </Link>

        {/* Stacked secondaries — compact, no hero. */}
        {restCards.map((a) => (
          <Link
            key={`${a.type}:${a.slug}`}
            to={routeForArticle(a)}
            className="newsroom-card-stack"
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              padding: '12px 0',
              borderTop: '1px solid var(--line-soft)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: 4,
              }}
            >
              <span>{TYPE_KICKER[a.type] || a.type}</span>
              <AiByline link={false} />
              <span style={{ marginLeft: 'auto', color: 'var(--ink-3)' }}>
                {_formatRelative(a.published_at)}
              </span>
            </div>
            <h4
              className="serif"
              style={{
                fontFamily: 'Newsreader, "Inter Tight", Georgia, serif',
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'var(--ink)',
                margin: 0,
                letterSpacing: -0.005,
              }}
            >
              {a.title}
            </h4>
          </Link>
        ))}
      </div>

      {/* Responsive grid breakpoint: 2-col layout from 720px,
          3-col with lead spanning col 1 + secondaries stacked in
          col 2 from 1024px.
          v0.58.3 — drop 2-col grid when there are no stacked
          secondaries (lead-only renders full-width, no empty
          right column). Fixes the "empty block" report when only
          one approved article matched the filter. */}
      <style>{`
        .newsroom-slice .newsroom-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .newsroom-slice .newsroom-grid {
            grid-template-columns: ${restCards.length > 0 ? '1.6fr 1fr' : '1fr'};
            gap: 28px;
            align-items: start;
          }
          .newsroom-slice .newsroom-grid > a:first-child {
            grid-row: span ${Math.max(restCards.length, 1)};
          }
        }
      `}</style>
    </section>
  );
}
