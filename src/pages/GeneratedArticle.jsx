import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import HubStatusStrip from '../components/v2/HubStatusStrip.jsx';
import HubActionRow from '../components/v2/HubActionRow.jsx';
import HeroBand from '../components/v2/HeroBand.jsx';
import PullQuote from '../components/v2/PullQuote.jsx';
import EditorialFootnote from '../components/v2/EditorialFootnote.jsx';
import AiByline from '../components/v2/AiByline.jsx';
import { setTopbarSubrow } from '../lib/topbarSubrow.js';
import { fetchArticleEdit, fetchPublishStatus, useEditorSession } from '../lib/editorAuth.js';

/**
 * /preview/[slug] and /match-recap/[slug] — generated article surface.
 *
 * Phase 1 ship #3 (v0.25.0). Generalized from the original Preview.jsx
 * (ship #1, v0.23.0) so the same component renders both pre-match
 * previews and post-match recaps. Distinguished by the `type` prop:
 *
 *   <GeneratedArticle type="preview" />     mounts at /preview/:slug
 *   <GeneratedArticle type="recap" />       mounts at /match-recap/:slug
 *
 * Both fetch `/content/{type}/{slug}.json` (written by the Python
 * content engine to `public/content/{type}/`) and render body_md inline
 * via a tiny markdown pass.
 *
 * No MDX compiler — the body is rendered via inline markdown since these
 * articles are short + the markdown vocabulary is narrow (paragraphs,
 * headings, em/strong, hr).
 *
 * The `manual_review: true` flag in frontmatter renders a "PENDING REVIEW"
 * banner — Phase 1 ships every article through human review before
 * flipping that flag.
 */

// Tiny markdown → React. Handles: # / ## / ### headings, **bold**,
// *italic*, [text](url), > blockquote, horizontal rule (---), and
// paragraphs. Lines of `## ` etc. become H2s; --- is HR; > becomes
// PullQuote; everything else is paragraphs split on blank lines.
//
// v0.52.0 — Phase B redesign: enhanced for the editorial article shell.
//   • opts.dropCap = true → first NON-EMPTY paragraph gets a drop-cap
//     glyph (large serif first letter floated left).
//   • opts.skipFirstH1 = true → first `# Heading` line is suppressed.
//     Body H1 is typically a stylistic duplicate of article.title;
//     the v4 shell renders the title separately above the body.
//   • > blockquote → <PullQuote> (Newsreader italic on amber rule).
//
// Backwards-compatible: calling renderMarkdown(md) with no opts
// behaves identically to v0.51.0.
function renderMarkdown(md, opts = {}) {
  const blocks = md.split(/\n\n+/);
  let firstParaSeen = false;
  let firstH1Skipped = false;

  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      return <hr key={i} style={{ border: 0, borderTop: `1px solid var(--line)`, margin: '24px 0' }} />;
    }

    // Blockquote (Phase B). Multi-line `> ...` blocks become a
    // PullQuote. Strip the leading `> ` from each line + join.
    if (trimmed.startsWith('> ')) {
      const quoteText = trimmed
        .split('\n')
        .map((line) => line.replace(/^>\s?/, ''))
        .join('\n')
        .trim();
      // Optional attribution after a final `— Author` line.
      const dashMatch = quoteText.match(/^(.*?)\n\s*—\s*(.+)$/s);
      const body = dashMatch ? dashMatch[1].trim() : quoteText;
      const attribution = dashMatch ? dashMatch[2].trim() : null;
      return (
        <PullQuote key={i} attribution={attribution}>
          {renderInline(body)}
        </PullQuote>
      );
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      return <h3 key={i} className="v2-h3" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '20px 0 8px', letterSpacing: -0.2 }}>{renderInline(trimmed.slice(4))}</h3>;
    }
    if (trimmed.startsWith('## ')) {
      // Phase B: H2 picks up Newsreader serif when inside a `.v2`
      // article shell; legacy callers without `.v2` parent fall
      // through to the existing Inter Tight rendering via the
      // .serif utility class.
      return <h2 key={i} className="serif" style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: 'var(--ink)', margin: '32px 0 12px', letterSpacing: -0.2, lineHeight: 1.2 }}>{renderInline(trimmed.slice(3))}</h2>;
    }
    if (trimmed.startsWith('# ')) {
      // Phase B: when opts.skipFirstH1 is true, suppress the first H1
      // (stylistic duplicate of article.title rendered by the shell).
      // Subsequent H1s — uncommon — pass through.
      if (opts.skipFirstH1 && !firstH1Skipped) {
        firstH1Skipped = true;
        return null;
      }
      return <h1 key={i} className="editorial-h1 disp serif" style={{ color: 'var(--ink)', margin: '0 0 16px', textWrap: 'balance' }}>{renderInline(trimmed.slice(2))}</h1>;
    }

    // Italic-only block (e.g. an editor's note line)
    if (/^\*[^*].*\*$/.test(trimmed) && !trimmed.includes('\n')) {
      return <p key={i} style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.6, margin: '14px 0', borderLeft: `2px solid var(--line-soft)`, paddingLeft: 12 }}>{renderInline(trimmed.slice(1, -1))}</p>;
    }

    // Default: paragraph. The first non-empty paragraph gets a drop
    // cap when opts.dropCap is set. Drop cap is a `:first-letter`
    // CSS approach scoped via a class so it works across line wraps.
    const isFirstPara = !firstParaSeen;
    if (isFirstPara) firstParaSeen = true;
    const dropCapStyle = (opts.dropCap && isFirstPara) ? {
      // Inline first-letter styling — scoped to this <p> via a
      // unique class. Easier than using ::first-letter (which
      // requires a stylesheet rule).
      // CSS: float left, large serif, lift to align with body.
    } : {};
    return (
      <p
        key={i}
        className={(opts.dropCap && isFirstPara) ? 'editorial-p editorial-dropcap' : 'editorial-p'}
        style={{
          fontSize: 'clamp(16px, 1.8vw, 18px)',
          lineHeight: 1.7,
          color: 'var(--ink)',
          margin: '0 0 16px',
          ...dropCapStyle,
        }}
      >
        {renderInline(trimmed)}
      </p>
    );
  });
}

// Inline: **bold**, *italic*, [text](url). Returns array of strings + JSX.
function renderInline(text) {
  const linked = applyPattern(text, /\[([^\]]+)\]\(([^)]+)\)/g, (m, label, href) =>
    <a href={href} style={{ color: C.amber, textDecoration: 'underline' }} key={`l-${m.index}`}>{label}</a>
  );
  const bolded = applyPattern(linked, /\*\*([^*]+)\*\*/g, (m, body) =>
    <strong key={`b-${m.index}`} style={{ fontWeight: 700, color: C.text }}>{body}</strong>
  );
  const italicized = applyPattern(bolded, /\*([^*\n]+)\*/g, (m, body) =>
    <em key={`i-${m.index}`} style={{ fontStyle: 'italic' }}>{body}</em>
  );
  return italicized;
}

// Walk an array of (string | JSX) and apply a regex to each string element,
// inserting JSX nodes for matches. Returns flat array.
function applyPattern(input, regex, replacer) {
  const arr = Array.isArray(input) ? input : [input];
  const out = [];
  for (const item of arr) {
    if (typeof item !== 'string') {
      out.push(item);
      continue;
    }
    let last = 0;
    let m;
    const r = new RegExp(regex.source, regex.flags);
    while ((m = r.exec(item)) !== null) {
      if (m.index > last) out.push(item.slice(last, m.index));
      out.push(replacer(m, ...m.slice(1)));
      last = m.index + m[0].length;
    }
    if (last < item.length) out.push(item.slice(last));
  }
  return out;
}

// Type-specific configuration. All article types share the same
// chrome (TopBar subrow, Breadcrumbs, manual-review banner, AI footer)
// but differ on labels, route paths, and the eyebrow content.
const TYPE_CONFIG = {
  preview: {
    contentPath: 'preview',
    routePrefix: '/preview',
    eyebrowLabel: 'PREVIEW',
    breadcrumbLabel: 'Preview',
    titleSuffix: '',
    analyticsEvent: 'preview_share',
    eyebrow: (fm) => fm.kickoff_utc
      ? new Date(fm.kickoff_utc).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      : '',
  },
  recap: {
    contentPath: 'recap',
    routePrefix: '/match-recap',
    eyebrowLabel: 'RECAP',
    breadcrumbLabel: 'Recap',
    titleSuffix: '',
    analyticsEvent: 'recap_share',
    eyebrow: (fm) => (fm.home_score != null && fm.away_score != null)
      ? `${fm.home_score}-${fm.away_score}`
      : '',
  },
  standings: {
    contentPath: 'standings',
    routePrefix: '/standings',
    eyebrowLabel: 'KLASEMEN',
    breadcrumbLabel: 'Klasemen',
    titleSuffix: '',
    analyticsEvent: 'standings_share',
    eyebrow: (fm) => fm.gameweek != null ? `PEKAN ${fm.gameweek}` : '',
  },
  // Phase 2 ship #21 — evergreen team / player profiles. JSON file
  // lives at public/content/team/{slug}.json (the type_ value matches
  // the json_writer.write_article allowed-types list). The SPA route
  // is /profile/{slug} — short, sport-agnostic, distinct from the
  // existing canonical NBA team dashboards at /nba-playoff-2026/...
  // Eyebrow shows the season label so a fan reading 6 months later
  // knows the snapshot date.
  profile: {
    contentPath: 'team',
    routePrefix: '/profile',
    eyebrowLabel: 'PROFIL',
    breadcrumbLabel: 'Profil',
    titleSuffix: '',
    analyticsEvent: 'profile_share',
    eyebrow: (fm) => fm.season_label
      ? `MUSIM ${fm.season_label}`
      : (fm.as_of_id ? `PER ${fm.as_of_id.toUpperCase()}` : ''),
  },
  // Phase 2 ship #23 — head-to-head landing pages. Two-team
  // matchup explainer; slug is alphabetically-sorted team-vs-team
  // so the same pair always lands at the same URL.
  h2h: {
    contentPath: 'h2h',
    routePrefix: '/h2h',
    eyebrowLabel: 'H2H',
    breadcrumbLabel: 'Head-to-head',
    titleSuffix: '',
    analyticsEvent: 'h2h_share',
    eyebrow: (fm) => fm.summary?.total_meetings
      ? `${fm.summary.total_meetings} PERTEMUAN TERAKHIR`
      : 'HEAD-TO-HEAD',
  },
};

const LEAGUE_LABELS = {
  epl: { eyebrow: 'LIGA INGGRIS', breadcrumb: 'Liga Inggris', hubPath: '/premier-league-2025-26' },
  'liga-1-id': { eyebrow: 'SUPER LEAGUE', breadcrumb: 'Super League', hubPath: '/super-league-2025-26' },
  nba: { eyebrow: 'NBA PLAYOFFS', breadcrumb: 'NBA Playoffs', hubPath: '/nba-playoff-2026' },
  f1: { eyebrow: 'FORMULA 1', breadcrumb: 'Formula 1', hubPath: '/formula-1-2026' },
  tennis: { eyebrow: 'TENNIS', breadcrumb: 'Tennis', hubPath: '/tennis' },
};

function leagueChrome(leagueId) {
  return LEAGUE_LABELS[leagueId] || { eyebrow: (leagueId || '').toUpperCase(), breadcrumb: 'Liga', hubPath: '/' };
}

// v0.52.0 — Phase B. Per-sport HeroBand sport tag (drives gradient
// tint when no real photo is set). Mirrors the v4 SPORT_COLORS palette.
function sportTagFromLeague(leagueId) {
  if (leagueId === 'liga-1-id') return 'liga-1-id';
  if (leagueId === 'epl' || leagueId === 'nba' || leagueId === 'f1' || leagueId === 'tennis') return leagueId;
  return 'nba';
}

// v0.52.0 — Phase B. Source-data attribution lines for the
// EditorialFootnote per league. Bahasa-first per voice rules.
function sourcesForLeague(leagueId) {
  if (leagueId === 'epl' || leagueId === 'liga-1-id') {
    return [
      { label: 'API-Football', url: 'https://www.api-football.com' },
      'ESPN soccer feed',
    ];
  }
  if (leagueId === 'nba') return ['ESPN NBA play-by-play', 'Polymarket NBA odds'];
  if (leagueId === 'f1') return [
    { label: 'jolpica-f1', url: 'https://github.com/jolpica/jolpica-f1' },
    'OpenF1',
  ];
  if (leagueId === 'tennis') return ['ESPN Tennis'];
  return ['Sumber resmi liga'];
}

// v0.52.0 — Phase B. Compose the kicker line for the article shell.
// Per article type, pulls the right meta: preview shows kickoff date,
// recap shows final score, standings shows gameweek, profile shows
// season label, h2h shows meeting count.
function buildKicker(cfg, fm, league) {
  const eyebrowSuffix = cfg.eyebrow(fm);
  const parts = [cfg.eyebrowLabel, league.eyebrow];
  if (eyebrowSuffix) parts.push(eyebrowSuffix);
  return parts.filter(Boolean).join(' · ');
}

// v0.52.0 — Phase B. Build the HeroBand caption (e.g. "DENVER · BOSTON",
// "GW 36 — ANFIELD"). Only used when the meta yields a sharp short-form
// caption — falls back to null (no caption strip) for profile/h2h.
function buildHeroCaption(type, fm) {
  if (type === 'preview' || type === 'recap') {
    if (fm.home_team && fm.away_team) {
      // Recap: "BOS 128–96 PHI" so score reads naturally
      if (type === 'recap' && fm.home_score != null && fm.away_score != null) {
        const h = fm.home_abbr || fm.home_team.split(' ').pop().slice(0, 3).toUpperCase();
        const a = fm.away_abbr || fm.away_team.split(' ').pop().slice(0, 3).toUpperCase();
        return `${a} ${fm.away_score}–${fm.home_score} ${h}`;
      }
      // Preview: "BOS · PHI"
      const h = fm.home_abbr || fm.home_team.split(' ').pop().slice(0, 3).toUpperCase();
      const a = fm.away_abbr || fm.away_team.split(' ').pop().slice(0, 3).toUpperCase();
      return `${a} · ${h}`;
    }
  }
  if (type === 'standings' && fm.gameweek != null) {
    return `PEKAN ${fm.gameweek}`;
  }
  return null;
}

export default function GeneratedArticle({ type }) {
  const { slug } = useParams();
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.preview;
  const { isEditor, loading: authLoading } = useEditorSession();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState(null);
  // Publication status from Supabase: null = unknown, false = not yet
  // approved, object = approved row { published_at, approver_email, ... }.
  // We start at `null` (loading) and only resolve to false after the
  // Supabase round-trip completes — that prevents a flash of the
  // "redirect" decision while the ledger query is in-flight.
  const [publishStatus, setPublishStatus] = useState(null);

  // Fetch the JSON article body.
  useEffect(() => {
    let cancelled = false;
    fetch(`/content/${cfg.contentPath}/${slug}.json`, { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { if (!cancelled) setArticle(data); })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)); });
    return () => { cancelled = true; };
  }, [slug, cfg.contentPath]);

  // Fetch the publication ledger row in parallel. Resolve to `false`
  // (no row found) explicitly so the gate logic can distinguish
  // "loading" from "definitely unpublished."
  useEffect(() => {
    let cancelled = false;
    fetchPublishStatus({ type: cfg.contentPath, slug })
      .then((row) => { if (!cancelled) setPublishStatus(row || false); })
      .catch(() => { if (!cancelled) setPublishStatus(false); });
    return () => { cancelled = true; };
  }, [slug, cfg.contentPath]);

  // v0.48.0 — Phase 2 ship #29. Fetch the edited body overlay if
  // an editor has saved a revision via /editor's edit modal. The
  // overlay applies AT RENDER TIME — the on-disk JSON's body is
  // replaced by edited_body_md in the markdown pass below. Frontmatter
  // (title, lint, QC, etc) still comes from the disk JSON since the
  // edit only touches the body. Prerender picks the edit up at build
  // time so the static HTML matches the SPA-rendered version.
  const [edit, setEdit] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchArticleEdit({ type: cfg.contentPath, slug })
      .then((row) => { if (!cancelled) setEdit(row); })
      .catch(() => { if (!cancelled) setEdit(null); });
    return () => { cancelled = true; };
  }, [slug, cfg.contentPath]);

  // Push the chrome row into the V2 TopBar subrow. Eyebrow is type-aware:
  // previews show kickoff date, recaps show the final score.
  useEffect(() => {
    if (!article) return undefined;
    const fm = article.frontmatter || {};
    const league = leagueChrome(fm.league);
    const eyebrowSuffix = cfg.eyebrow(fm);
    setTopbarSubrow(
      <HubStatusStrip
        srOnlyTitle={article.title}
        live={(
          <span style={{ textTransform: 'uppercase' }}>
            {cfg.eyebrowLabel} · {league.eyebrow}{eyebrowSuffix ? ` · ${eyebrowSuffix}` : ''}
          </span>
        )}
        actions={(
          <HubActionRow
            url={`${cfg.routePrefix}/${slug}`}
            shareText={article.title + ' · gibol.co'}
            analyticsEvent={cfg.analyticsEvent}
          />
        )}
      />
    );
    return () => setTopbarSubrow(null);
  }, [article, slug, cfg]);

  // v0.48.0 — overlay editor's body if present, else use disk JSON's
  // body_md. Falls through gracefully if the edits row didn't load.
  const renderBody = (edit && edit.edited_body_md) || article?.body_md || '';
  // v0.52.0 — Phase B: drop cap on first paragraph + suppress the
  // body's first H1 (stylistic duplicate of article.title which the
  // shell now renders above the body explicitly).
  const rendered = useMemo(
    () => (renderBody ? renderMarkdown(renderBody, { dropCap: true, skipFirstH1: true }) : null),
    [renderBody]
  );

  if (error) {
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 20 }}>
        <h1 style={{ fontSize: 22, color: C.text }}>{cfg.breadcrumbLabel} belum tersedia</h1>
        <p style={{ color: C.dim, fontSize: 14 }}>
          Slug <code>{slug}</code> belum ter-publish atau URL salah. {error}
        </p>
        <Link to="/" style={{ color: C.amber }}>← Kembali ke beranda</Link>
      </main>
    );
  }

  // Wait for BOTH the article fetch and the publish-ledger lookup AND
  // the auth-session resolution before deciding whether to render or
  // redirect. Otherwise an editor visiting their own draft would race
  // the redirect (auth not yet known when publishStatus resolves).
  if (!article || publishStatus === null || authLoading) {
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 20 }}>
        <p style={{ color: C.dim, fontSize: 14 }}>Memuat {cfg.breadcrumbLabel.toLowerCase()}…</p>
      </main>
    );
  }

  const fm = article.frontmatter || {};

  // Body-gate decision (Phase 1 ship #10):
  //   1. Explicit `manual_review: false` in JSON → published (legacy /
  //      hand-edited articles bypass the ledger entirely).
  //   2. Supabase `ce_article_publishes` has a row → published.
  //   3. Visitor is the editor → show body with a DRAFT banner so the
  //      editor can review before approving.
  //   4. Otherwise → redirect to home. No placeholder, no body, no
  //      JSON-LD. URL still resolves so shared draft URLs don't 404.
  const explicitlyPublished = fm.manual_review === false;
  const ledgerPublished = !!publishStatus;
  const isPublished = explicitlyPublished || ledgerPublished;
  const isEditorPreview = !isPublished && isEditor;

  if (!isPublished && !isEditorPreview) {
    // Per Ade's directive: pending articles redirect to homepage,
    // active editor session only can access. Anonymous + non-editor
    // signed-in users land back at /.
    return <Navigate to="/" replace />;
  }

  const reviewPending = !isPublished;  // editor preview mode shows the banner
  const league = leagueChrome(fm.league);

  // v0.52.0 — Phase B editorial article shell.
  // Layout: full-bleed HeroBand → reading column (max-width 720px,
  // collapses to full-width on mobile) → kicker → display headline
  // → deck → body (with drop cap on first para, PullQuote for >, etc.)
  // → EditorialFootnote.
  // Mobile-first per redesign doc §4 mobile overrides: hero clamps,
  // headline clamps, reading column already at the right max-width.
  const sportTag = sportTagFromLeague(fm.league);
  const heroCaption = buildHeroCaption(type, fm);
  const kickerLine = buildKicker(cfg, fm, league);

  return (
    <main className="v2 v2-article">
      <SEO
        title={article.title + ' | gibol.co'}
        description={article.description}
        path={`${cfg.routePrefix}/${slug}`}
        keywords={`${cfg.breadcrumbLabel.toLowerCase()} ${fm.home_team || ''} vs ${fm.away_team || ''}, ${league.breadcrumb.toLowerCase()}, ${slug}`}
        jsonLd={article.schema_jsonld && Object.keys(article.schema_jsonld).length > 0 ? article.schema_jsonld : undefined}
      />

      {/* Breadcrumbs above the hero — anchored to the same reading-
          column max-width so they don't drift on wide viewports. */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '12px 20px 8px' }}>
        <Breadcrumbs
          items={[
            { name: 'Beranda', to: '/' },
            { name: league.breadcrumb, to: league.hubPath },
            { name: cfg.breadcrumbLabel },
          ]}
        />
      </div>

      {/* Editor preview banner (when applicable) — sits above the hero
          so editors immediately see "this is a draft" without
          scrolling. */}
      {reviewPending && (
        <div
          role="status"
          style={{
            maxWidth: 1080,
            margin: '0 auto 12px',
            padding: '10px 16px',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--amber)',
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            // Outer container width matches breadcrumbs — flush to
            // the left edge on narrow screens via the 16px padding.
            marginLeft: 'clamp(8px, 2vw, auto)',
            marginRight: 'clamp(8px, 2vw, auto)',
          }}
        >
          <span>⚠ Editor preview — draft, belum approved untuk publik</span>
          <Link to="/editor" style={{ color: 'var(--amber)', textDecoration: 'underline', fontSize: 11 }}>
            ← Editor
          </Link>
        </div>
      )}

      {/* Full-bleed hero band. Anchored at full viewport width
          (escapes the reading column). SVG fallback per sport when
          no `image=` prop is available — ade's editorial pipeline can
          flow real photos in later via fm.hero_image. */}
      <HeroBand
        sport={sportTag}
        image={fm.hero_image || null}
        caption={heroCaption}
        credit={fm.hero_credit || null}
      />

      {/* Reading column — max-width 720px on desktop, full-width on
          mobile (the clamp handles padding). */}
      <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(20px, 4vw, 32px) 20px 60px' }}>

        {/* Kicker — small mono uppercase eyebrow above the headline.
            The article-shell-specific kicker (vs the topbar subrow's
            full status strip — that's also live above). */}
        <div className="kicker" style={{ marginBottom: 12 }}>
          {kickerLine}
        </div>

        {/* Display headline — Newsreader serif, mobile-first clamp
            per redesign doc §4 mobile overrides. */}
        <h1
          className="disp serif"
          style={{
            fontSize: 'clamp(28px, 6vw, 44px)',
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -0.01,
            margin: '0 0 14px',
            color: 'var(--ink)',
            textWrap: 'balance',
          }}
        >
          {article.title}
        </h1>

        {/* Deck / standfirst — Newsreader serif, lighter weight,
            article description from frontmatter. */}
        {article.description && (
          <p
            className="deck"
            style={{ margin: '0 0 16px', maxWidth: 640 }}
          >
            {article.description}
          </p>
        )}

        {/* Byline / meta strip — small mono caption with AiByline pill
            for AI-touched articles + published date. */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginBottom: 'clamp(20px, 3vw, 28px)',
            paddingBottom: 16,
            borderBottom: '1px solid var(--line)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-3)',
            letterSpacing: 0.2,
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Tim editorial Gibol
          </span>
          {/* AI byline — every content-engine article (all current articles)
              ships AI-touched per the v1 ingestion architecture. Future
              human-only pieces would set fm.ai === false. */}
          {fm.ai !== false && <AiByline link={true} />}
          {fm.published_at && (
            <span style={{ color: 'var(--ink-3)' }}>
              {new Date(fm.published_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Body — drop cap on first paragraph, PullQuote for `>`
            blockquote markdown, H1s suppressed (the body's H1 is a
            stylistic duplicate of article.title). */}
        <div className="editorial-body">{rendered}</div>

        {/* Editorial footnote — auto-renders the AI/human disclosure
            + sources + editor + relative-time. Replaces the v1
            footer's plain prose disclosure. */}
        <EditorialFootnote
          ai={fm.ai !== false}
          sources={sourcesForLeague(fm.league)}
          editor={fm.editor || null}
          model={fm.model || null}
          updatedAt={fm.published_at || null}
        />
      </article>
    </main>
  );
}
