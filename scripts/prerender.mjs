#!/usr/bin/env node
/**
 * Static per-route HTML prerender for gibol.co — F01 audit fix.
 *
 * Why: we're a pure client-side React SPA. That means scrapers that don't
 * execute JavaScript (WhatsApp, Slack, Discord, AI crawlers, Bing's early
 * crawler pass) only see the static index.html from Vite. Their preview,
 * title, and og:image all fall back to the default.
 *
 * Fix: after `vite build`, run this script. For each known route, write a
 * per-route `dist/{route}/index.html` with the route's unique meta baked
 * into the HTML before JS runs. React still hydrates client-side for full
 * interactivity — but scrapers now see correct per-route meta.
 *
 * v0.2.0 — generic over sports. The per-sport SEO routes now live inside each
 * sport adapter's prerenderRoutes() (src/lib/sports/<slug>/adapter.js). This
 * script iterates the registry and emits one HTML file per route. Adding a new
 * sport no longer requires touching this file — the adapter is enough.
 *
 * The STATIC_ROUTES array below remains for truly cross-sport routes that
 * don't belong to any one sport (home, about, glossary, legacy /ibl stub).
 *
 * Usage: runs automatically after `npm run build` via package.json postbuild hook.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;

// ─── Publication ledger (Phase 1 ship #10) ───────────────────────────────
// At deploy time, query ce_article_publishes for the list of approved
// articles. Approved → emit indexable HTML + sitemap entry + full
// JSON-LD. Unapproved → emit a redirect-to-home stub HTML with noindex,
// EXCLUDE from sitemap.
//
// This protects unapproved drafts from being indexed by search engines
// or socially unfurled. The SPA layer also gates the body client-side
// (GeneratedArticle.jsx redirects to /); prerender is the static layer.
// v0.58.1 — local-DX fix: load .env files into process.env at startup
// so `npm run build` from a dev machine picks up SUPABASE_URL etc.
// without needing `set -a && source .env.production.local`. Vercel
// server-side builds inject env vars natively so this is a no-op
// in production. We try .env.production.local first (Vercel pull
// output), then .env.local. Manual parser — avoids adding `dotenv`
// dep just for this.
function _loadEnvFile(filePath) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let value = m[2].trim();
      // Strip surrounding quotes if present.
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Don't overwrite anything already set in the environment.
      if (!process.env[key] && value) process.env[key] = value;
    }
  } catch (_) { /* file absent — fine */ }
}
_loadEnvFile(path.join(ROOT, '.env.production.local'));
_loadEnvFile(path.join(ROOT, '.env.local'));

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://egzacjfbmgbcwhtvqixc.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

async function loadPublishLedger() {
  if (!SUPABASE_ANON_KEY) {
    console.warn('[prerender] SUPABASE_ANON_KEY missing — assuming nothing is published. All generated articles will emit as drafts (redirect-to-home + noindex).');
    return new Map();
  }
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb
      .from('ce_article_publishes')
      .select('slug, type, published_at');
    if (error) {
      console.warn(`[prerender] publish ledger query failed: ${error.message}. Treating all as drafts.`);
      return new Map();
    }
    const map = new Map();
    for (const row of data || []) {
      map.set(`${row.type}:${row.slug}`, row);
    }
    console.log(`[prerender] publish ledger loaded — ${map.size} approved articles`);
    return map;
  } catch (e) {
    console.warn(`[prerender] publish ledger crashed: ${e.message}. Treating all as drafts.`);
    return new Map();
  }
}

// v0.48.0 — Phase 2 ship #29. Load the editor's body overrides at
// deploy time so the static prerendered HTML reflects the latest
// edits (not the AI-generated baseline). The SPA also overlays at
// runtime via fetchArticleEdit, so even visitors hitting the static
// HTML between deploys get the edited body once their JS hydrates.
async function loadEditOverlay() {
  if (!SUPABASE_ANON_KEY) return new Map();
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb
      .from('ce_article_edits')
      .select('slug, type, edited_body_md, edited_at, edit_count');
    if (error) {
      console.warn(`[prerender] edits overlay query failed: ${error.message}. Static HTML uses AI baselines.`);
      return new Map();
    }
    const map = new Map();
    for (const row of data || []) {
      map.set(`${row.type}:${row.slug}`, row);
    }
    if (map.size > 0) {
      console.log(`[prerender] edits overlay loaded — ${map.size} edited articles`);
    }
    return map;
  } catch (e) {
    console.warn(`[prerender] edits overlay crashed: ${e.message}. Static HTML uses AI baselines.`);
    return new Map();
  }
}

// ─── Static (non-sport) routes ────────────────────────────────────────────
// These are global pages or legacy stubs that don't belong to one sport.
//
// v0.13.0 — every static route now carries BreadcrumbList JSON-LD too.
// The home page additionally emits WebSite (with SearchAction) and
// Organization, so the brand can land in Google's knowledge panel.
const breadcrumb = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: it.url.startsWith('http') ? it.url : `${SITE}${it.url}`,
  })),
});

const HOME_WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  url: SITE,
  name: 'gibol.co',
  alternateName: 'gila bola',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE}/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const HOME_ORG = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'gibol.co',
  alternateName: 'gila bola',
  url: SITE,
  logo: `${SITE}/gibol-logo-1024.png`,
};

const STATIC_ROUTES = [
  {
    path: '/',
    // v0.13.0 trim — was 82 chars, "gibol.co — gila bola · skor live
    // NBA, F1, Liga Inggris, Tenis, Piala Dunia 2026". Cut to 59 chars
    // so it doesn't truncate in Google SERPs.
    title: 'Skor Live NBA · F1 · Liga Inggris · Tenis | gibol.co',
    description: 'Skor live NBA Playoffs 2026, Formula 1 2026, Liga Inggris 2025-26, Tenis ATP+WTA, dan Piala Dunia FIFA 2026. Klasemen, bracket, peluang juara, recap Bahasa.',
    keywords: 'gibol, gila bola, skor nba, skor basket, skor playoff, live skor nba, peluang juara nba 2026, bracket nba, formula 1 2026, f1 2026, liga inggris, premier league, tenis 2026, atp tour 2026, wta tour 2026, grand slam 2026, roland garros 2026, peringkat atp, peringkat wta, FIFA world cup 2026, piala dunia 2026',
    ogImage: DEFAULT_OG,
    jsonLd: [HOME_WEBSITE, HOME_ORG],
  },
  {
    path: '/about',
    title: 'Tentang gibol.co — Dashboard Olahraga Indonesia',
    description: 'gibol.co dibangun untuk fan bola Indonesia — skor live NBA, F1, Liga Inggris, Liga 1 Indonesia, Piala Dunia 2026, semua dengan waktu WIB.',
    keywords: 'tentang gibol, gila bola, dashboard olahraga, indonesian sports dashboard',
    ogImage: DEFAULT_OG,
    jsonLd: breadcrumb([
      { name: 'gibol.co', url: '/' },
      { name: 'Tentang', url: '/about' },
    ]),
  },
  {
    path: '/glossary',
    // v0.13.0 trim — was 87 chars.
    title: 'Glosarium NBA Playoff — Bracket, Peluang Juara | gibol.co',
    description: 'Glosarium 20 istilah NBA playoff dalam Bahasa: peluang juara, bracket, seed, play-in, play-by-play, shot chart, box score, dan lainnya.',
    keywords: 'apa itu peluang juara, arti bracket nba, apa itu shot chart, arti play-in nba, glosarium nba, istilah nba indonesia',
    ogImage: DEFAULT_OG,
    jsonLd: breadcrumb([
      { name: 'gibol.co', url: '/' },
      { name: 'Glosarium', url: '/glossary' },
    ]),
  },
  {
    path: '/ibl',
    // v0.13.0 trim — was 73 chars.
    title: 'IBL — Liga Basket Indonesia (Segera Hadir) | gibol.co',
    description: 'Dashboard live IBL — skor, klasemen, dan watchlist pemain untuk Liga Basket Indonesia. Coverage Bahasa penuh. Segera hadir.',
    keywords: 'IBL, liga basket indonesia, skor IBL, jadwal IBL, basket indonesia, iblindonesia',
    ogImage: DEFAULT_OG,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: 'Indonesia Basketball League 2026-27',
        description: "The Indonesia Basketball League (IBL) 2026-27 season — Indonesia's top-tier professional basketball league featuring Pelita Jaya Bakrie Jakarta, Prawira Harum Bandung, Satria Muda Pertamina, RANS Simba Bogor, and 12+ other clubs.",
        eventStatus: 'https://schema.org/EventScheduled',
        sport: 'Basketball',
        location: { '@type': 'Country', name: 'Indonesia' },
        organizer: { '@type': 'SportsOrganization', name: 'PT Bola Basket Indonesia (IBL)', url: 'https://iblindonesia.com' },
        url: 'https://www.gibol.co/ibl',
      },
      breadcrumb([
        { name: 'gibol.co', url: '/' },
        { name: 'IBL', url: '/ibl' },
      ]),
    ],
  },
  // v0.15.0 — El Clasico Indonesia derby landing page. Static-prerender
  // it so search crawlers and link previews see the full Bahasa meta
  // before any JS runs. The dynamic engagement layer (polls, reactions)
  // hydrates client-side after navigation.
  {
    path: '/derby/persija-persib',
    title: 'Persija vs Persib — El Clasico Indonesia | H2H, Polling, Sejarah',
    description: 'Derby Persija vs Persib di Super League: head-to-head sepanjang masa, jadwal pertemuan berikutnya 10 Mei 2026 di JIS, polling fan, momen ikonik 1933-2026, dan skuad terbaru. Update otomatis.',
    keywords: 'persija persib, el clasico indonesia, derby indonesia, persija vs persib, jakmania, bobotoh, viking persib, super league indonesia, liga 1, head to head persija persib',
    // v0.21.0 — neutral 1-1 derby card as the default unfurl image.
    // Per-prediction shares get a custom card via the dynamic
    // /api/og-derby endpoint at the page level (Derby.jsx reads
    // ?prediction= + ?side= and overrides the OG meta client-side).
    // The prerender just sets a strong fallback so the BARE URL
    // /derby/persija-persib unfurls with the El-Clasico card
    // instead of the generic gibol-logo og-image.
    ogImage: 'https://www.gibol.co/api/og-derby?score=1-1',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: 'Persija Jakarta vs Persib Bandung — El Clasico Indonesia',
        description: 'Derby Super League Indonesia 2025-26 antara Persija Jakarta dan Persib Bandung di Jakarta International Stadium.',
        startDate: '2026-05-10T08:30:00.000Z',
        sport: 'Football',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: 'Jakarta International Stadium',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Jakarta',
            addressCountry: 'ID',
          },
        },
        homeTeam: { '@type': 'SportsTeam', name: 'Persija Jakarta' },
        awayTeam: { '@type': 'SportsTeam', name: 'Persib Bandung' },
        url: 'https://www.gibol.co/derby/persija-persib',
      },
      breadcrumb([
        { name: 'gibol.co', url: '/' },
        { name: 'Super League', url: '/super-league-2025-26' },
        { name: 'Derby Persija vs Persib', url: '/derby/persija-persib' },
      ]),
    ],
  },
];

// ─── Pull routes from every registered sport adapter ──────────────────────
// The registry lives at src/lib/sports/index.js. Each adapter's
// prerenderRoutes() returns an array of { path, title, description, ... }.
async function loadSportRoutes() {
  const registryUrl = pathToFileURL(
    path.join(ROOT, 'src', 'lib', 'sports', 'index.js')
  ).href;
  const mod = await import(registryUrl);
  const sports = mod.SPORTS || mod.default || [];
  const out = [];
  for (const sport of sports) {
    if (typeof sport.prerenderRoutes !== 'function') continue;
    const rs = sport.prerenderRoutes();
    for (const r of rs) out.push({ ...r, _sport: sport.id });
  }
  return out;
}

// ─── Pull routes from generated content (Phase 1+) ────────────────────────
// The Python content engine writes one JSON per article to
// public/content/{type}/{slug}.json. For each one, we emit a static
// /{type}/{slug}/index.html so AI/social crawlers see Bahasa meta +
// SportsEvent JSON-LD before any JS runs. The body_md itself still
// hydrates client-side via Preview.jsx (lazy route).
//
// v0.23.0 — currently handles `preview`. Recap, standings, race, h2h,
// glossary will land their own type-specific renderers as Phase 1
// ships them; the loop below is generic so a new type folder gets
// picked up automatically once we add a humanLabel + prerender logic
// for it.
const CONTENT_TYPES = {
  preview: {
    humanLabel: 'Preview',
    routePrefix: '/preview',
    league: (fm) => {
      if (fm.league === 'epl') return 'Liga Inggris 2025-26';
      if (fm.league === 'liga-1-id') return 'Super League Indonesia 2025-26';
      if (fm.league === 'nba') return 'NBA Playoffs 2026';
      if (fm.league === 'f1') return `Formula 1 ${fm.season || ''}`.trim();
      if (fm.league === 'tennis') return `Tennis ${(fm.tour || '').toUpperCase()} ${fm.year || ''}`.trim();
      return fm.league || 'Liga';
    },
    leagueCrumb: (fm) => {
      if (fm.league === 'epl') return { name: 'Liga Inggris', url: '/premier-league-2025-26' };
      if (fm.league === 'liga-1-id') return { name: 'Super League', url: '/super-league-2025-26' };
      if (fm.league === 'nba') return { name: 'NBA Playoffs', url: '/nba-playoff-2026' };
      if (fm.league === 'f1') return { name: 'Formula 1', url: '/formula-1-2026' };
      if (fm.league === 'tennis') return { name: 'Tennis', url: '/tennis' };
      return { name: 'Liga', url: '/' };
    },
    eventStatus: 'EventScheduled',
  },
  recap: {
    humanLabel: 'Recap',
    routePrefix: '/match-recap',
    league: (fm) => {
      if (fm.league === 'epl') return 'Liga Inggris 2025-26';
      if (fm.league === 'liga-1-id') return 'Super League Indonesia 2025-26';
      if (fm.league === 'nba') return 'NBA Playoffs 2026';
      if (fm.league === 'f1') return `Formula 1 ${fm.season || ''}`.trim();
      if (fm.league === 'tennis') return `Tennis ${(fm.tour || '').toUpperCase()} ${fm.year || ''}`.trim();
      return fm.league || 'Liga';
    },
    leagueCrumb: (fm) => {
      if (fm.league === 'epl') return { name: 'Liga Inggris', url: '/premier-league-2025-26' };
      if (fm.league === 'liga-1-id') return { name: 'Super League', url: '/super-league-2025-26' };
      if (fm.league === 'nba') return { name: 'NBA Playoffs', url: '/nba-playoff-2026' };
      if (fm.league === 'f1') return { name: 'Formula 1', url: '/formula-1-2026' };
      if (fm.league === 'tennis') return { name: 'Tennis', url: '/tennis' };
      return { name: 'Liga', url: '/' };
    },
    eventStatus: 'EventCompleted',
  },
  standings: {
    humanLabel: 'Klasemen',
    routePrefix: '/standings',
    league: (fm) => {
      if (fm.league === 'epl') return 'Liga Inggris 2025-26';
      if (fm.league === 'liga-1-id') return 'Super League Indonesia 2025-26';
      if (fm.league === 'nba') return 'NBA Playoffs 2026';
      if (fm.league === 'f1') return `Formula 1 ${fm.season || ''}`.trim();
      if (fm.league === 'tennis') return `Tennis ${(fm.tour || '').toUpperCase()} ${fm.year || ''}`.trim();
      return fm.league || 'Liga';
    },
    leagueCrumb: (fm) => {
      if (fm.league === 'epl') return { name: 'Liga Inggris', url: '/premier-league-2025-26' };
      if (fm.league === 'liga-1-id') return { name: 'Super League', url: '/super-league-2025-26' };
      if (fm.league === 'nba') return { name: 'NBA Playoffs', url: '/nba-playoff-2026' };
      if (fm.league === 'f1') return { name: 'Formula 1', url: '/formula-1-2026' };
      if (fm.league === 'tennis') return { name: 'Tennis', url: '/tennis' };
      return { name: 'Liga', url: '/' };
    },
    eventStatus: 'EventScheduled', // standings is not a sports event itself; the type guard below skips SportsEvent emission
  },
  // Phase 2 ship #21 — evergreen team / player profiles. The on-disk
  // folder is `team` (matches json_writer.write_article type_) but the
  // SPA route is `/profile/{slug}` — short, sport-agnostic, distinct
  // from the live team dashboards under each sport's hub. Profiles are
  // written once and rarely updated; weekly cadence at most.
  team: {
    humanLabel: 'Profil',
    routePrefix: '/profile',
    league: (fm) => {
      if (fm.league === 'epl') return 'Liga Inggris 2025-26';
      if (fm.league === 'liga-1-id') return 'Super League Indonesia 2025-26';
      if (fm.league === 'nba') return 'NBA';
      if (fm.league === 'f1') return `Formula 1 ${fm.season || ''}`.trim();
      if (fm.league === 'tennis') return `Tennis ${(fm.tour || '').toUpperCase()}`.trim();
      return fm.league || 'Liga';
    },
    leagueCrumb: (fm) => {
      if (fm.league === 'epl') return { name: 'Liga Inggris', url: '/premier-league-2025-26' };
      if (fm.league === 'liga-1-id') return { name: 'Super League', url: '/super-league-2025-26' };
      if (fm.league === 'nba') return { name: 'NBA Playoffs', url: '/nba-playoff-2026' };
      if (fm.league === 'f1') return { name: 'Formula 1', url: '/formula-1-2026' };
      if (fm.league === 'tennis') return { name: 'Tennis', url: '/tennis' };
      return { name: 'Liga', url: '/' };
    },
    eventStatus: 'EventScheduled', // profile is evergreen, not an event
  },
  // Phase 2 ship #23 — head-to-head matchup explainers. Folder name
  // matches the SPA route prefix (h2h → /h2h). Football-first; sport
  // diversifies via the league frontmatter.
  h2h: {
    humanLabel: 'Head-to-head',
    routePrefix: '/h2h',
    league: (fm) => {
      if (fm.league === 'epl') return 'Liga Inggris 2025-26';
      if (fm.league === 'liga-1-id') return 'Super League Indonesia 2025-26';
      return fm.league || 'Liga';
    },
    leagueCrumb: (fm) => {
      if (fm.league === 'epl') return { name: 'Liga Inggris', url: '/premier-league-2025-26' };
      if (fm.league === 'liga-1-id') return { name: 'Super League', url: '/super-league-2025-26' };
      return { name: 'Liga', url: '/' };
    },
    eventStatus: 'EventScheduled',
  },
};

async function loadGeneratedContentRoutes(publishLedger, editOverlay = new Map()) {
  const out = [];
  const contentDir = path.join(ROOT, 'public', 'content');
  if (!fs.existsSync(contentDir)) return out;

  for (const [type, cfg] of Object.entries(CONTENT_TYPES)) {
    const typeDir = path.join(contentDir, type);
    if (!fs.existsSync(typeDir)) continue;
    const files = fs.readdirSync(typeDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const full = path.join(typeDir, file);
      let article;
      try {
        article = JSON.parse(fs.readFileSync(full, 'utf8'));
      } catch (e) {
        console.warn(`[prerender] skip ${full}: bad JSON (${e.message})`);
        continue;
      }
      const fm = article.frontmatter || {};
      const slug = article.slug || file.replace(/\.json$/, '');
      // v0.48.0 — Phase 2 ship #29. Overlay editor's body if present.
      // This makes the static prerendered HTML reflect the latest edit,
      // matching what the SPA renders post-hydration. Frontmatter (lint,
      // QC, all metadata) stays from the disk JSON — only the body is
      // overridden. Edits flow through to /content/{type}/{slug}.json
      // shipped in dist/, so subsequent fetches also see the edit.
      const editRow = editOverlay.get(`${type}:${slug}`);
      if (editRow && editRow.edited_body_md) {
        article.body_md = editRow.edited_body_md;
      }
      // Path matches the SPA route in App.jsx (`/preview/:slug`,
      // `/match-recap/:slug`). The route prefix differs from the
      // content-folder type because /recap is taken by the NBA
      // landing — content-engine recaps live at /match-recap.
      const routePath = `${cfg.routePrefix}/${slug}`;
      // Title bakes "| gibol.co" so social cards + SERPs read cleanly.
      const title = `${article.title} | gibol.co`;
      const description = article.description || '';
      const ogImage = article.og_image || DEFAULT_OG;
      const league = cfg.league(fm);
      const leagueCrumb = cfg.leagueCrumb(fm);

      // Build SportsEvent JSON-LD when frontmatter has the kickoff +
      // teams. Falls back to the article's own schema_jsonld if the
      // engine emitted a richer one. eventStatus differs between
      // preview (Scheduled) and recap (Completed) — recap also
      // surfaces the final score via homeTeam/awayTeam.score.
      let jsonLd = [];
      if (article.schema_jsonld && Object.keys(article.schema_jsonld).length > 0) {
        jsonLd.push(article.schema_jsonld);
      } else if (fm.kickoff_utc && fm.home_team && fm.away_team) {
        const isRecap = type === 'recap';
        // Sport: defaults to Football; NBA articles set fm.sport = 'basketball'
        // in their frontmatter so we surface schema.org's expected casing.
        const sportLabel = fm.sport === 'basketball' ? 'Basketball' : 'Football';
        const sportsEvent = {
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: `${fm.home_team} vs ${fm.away_team}`,
          description,
          startDate: fm.kickoff_utc,
          eventStatus: `https://schema.org/${cfg.eventStatus}`,
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          sport: sportLabel,
          location: fm.venue
            ? { '@type': 'Place', name: fm.venue }
            : undefined,
          homeTeam: isRecap && fm.home_score != null
            ? { '@type': 'SportsTeam', name: fm.home_team, score: fm.home_score }
            : { '@type': 'SportsTeam', name: fm.home_team },
          awayTeam: isRecap && fm.away_score != null
            ? { '@type': 'SportsTeam', name: fm.away_team, score: fm.away_score }
            : { '@type': 'SportsTeam', name: fm.away_team },
          url: `${SITE}${routePath}`,
        };
        jsonLd.push(sportsEvent);
      }
      jsonLd.push(breadcrumb([
        { name: 'gibol.co', url: '/' },
        leagueCrumb,
        { name: cfg.humanLabel, url: routePath },
      ]));

      // NewsArticle / Article wrapper so Google News + Discover treat
      // the URL as editorial content, not just a sports event card.
      // Uses the AI disclosure footer language as accountableOrganization.
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description,
        datePublished: fm.published_at,
        dateModified: fm.published_at,
        author: { '@type': 'Organization', name: 'Gibol Newsroom', url: SITE },
        publisher: {
          '@type': 'Organization',
          name: 'gibol.co',
          logo: { '@type': 'ImageObject', url: `${SITE}/gibol-logo-1024.png` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}${routePath}` },
        inLanguage: 'id-ID',
        isAccessibleForFree: true,
      });

      // Keyword targets vary by content type. Previews + recaps
      // surface team-vs-team and league name; standings surface the
      // gameweek + table phrases. The earlier template had a "premier
      // league preview" literal in every entry — Liga 1 articles
      // dragged it into their keywords too. Fixed.
      const teamPair = fm.home_team && fm.away_team ? `${fm.home_team} vs ${fm.away_team}` : null;
      const typeWord = cfg.humanLabel.toLowerCase();
      const kwBits = [];
      if (teamPair) kwBits.push(`${typeWord} ${teamPair}`);
      kwBits.push(league.toLowerCase());
      if (fm.gameweek != null) kwBits.push(`pekan ${fm.gameweek}`);
      kwBits.push(slug);

      // Phase 1 ship #10: publication gate. Approved articles get
      // full indexable HTML + sitemap entry. Unapproved get a stub
      // redirect-to-home page with noindex so search crawlers and
      // social unfurls don't expose draft content.
      const ledgerKey = `${type}:${slug}`;
      const publishedRow = publishLedger?.get?.(ledgerKey);
      const isPublished =
        fm.manual_review === false || !!publishedRow;

      out.push({
        path: routePath,
        title,
        description,
        keywords: kwBits.join(', '),
        ogImage,
        jsonLd,
        _content: type,
        _draft: !isPublished,
        _publishedAt: publishedRow?.published_at || fm.published_at,
      });
    }
  }
  return out;
}

// ─── HTML injection ───────────────────────────────────────────────────────
// Replace the <title>, <meta name="description">, and inject Open Graph +
// Twitter card meta tags ahead of the Vite script. Everything else (gtag,
// fonts, noscript body) stays unchanged.
function renderHtml(template, route) {
  const canonical = `${SITE}${route.path}`;
  const ogImage = route.ogImage || DEFAULT_OG;

  // Replace the existing <title>
  let html = template.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(route.title)}</title>`
  );

  // Replace meta description (if exists) or inject after title
  if (/<meta\s+name="description"/i.test(html)) {
    html = html.replace(
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="${escapeAttr(route.description)}" />`
    );
  } else {
    html = html.replace(
      /<\/title>/,
      `</title>\n    <meta name="description" content="${escapeAttr(route.description)}" />`
    );
  }

  // Replace keywords
  if (/<meta\s+name="keywords"/i.test(html)) {
    html = html.replace(
      /<meta\s+name="keywords"[^>]*>/i,
      `<meta name="keywords" content="${escapeAttr(route.keywords)}" />`
    );
  }

  // Inject canonical + hreflang + OG + Twitter (right before </head>)
  const metaBlock = `
    <!-- Prerendered per-route meta (F01 fix — scrapers without JS see this) -->
    <link rel="canonical" href="${canonical}" />
    <link rel="alternate" hreflang="id" href="${canonical}" />
    <link rel="alternate" hreflang="en" href="${canonical}" />
    <link rel="alternate" hreflang="x-default" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="gibol.co" />
    <meta property="og:title" content="${escapeAttr(route.title)}" />
    <meta property="og:description" content="${escapeAttr(route.description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:locale" content="id_ID" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(route.title)}" />
    <meta name="twitter:description" content="${escapeAttr(route.description)}" />
    <meta name="twitter:image" content="${ogImage}" />
`;

  // Per-route JSON-LD structured data (SportsEvent for sport routes, etc.).
  // Emitted here so crawlers pick it up without executing React/Helmet.
  // Accepts a single object OR an array — each becomes its own <script> block.
  let jsonLdBlock = '';
  if (route.jsonLd) {
    const schemas = Array.isArray(route.jsonLd) ? route.jsonLd : [route.jsonLd];
    jsonLdBlock = schemas
      .map((schema) => `    <script type="application/ld+json">${JSON.stringify(schema)}</script>`)
      .join('\n');
    jsonLdBlock = `\n${jsonLdBlock}\n`;
  }

  html = html.replace(/<\/head>/, `${metaBlock}${jsonLdBlock}  </head>`);

  return html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function escapeAttr(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Phase 1 ship #10: stub HTML for unapproved articles. Search crawlers
// see noindex + minimal title/desc. Anonymous browsers without JS get a
// meta-refresh redirect to home. Browsers with JS hit the SPA which
// also redirects (GeneratedArticle.jsx detects unpublished + non-editor
// and `<Navigate to="/" />`s). Editor session in the SPA renders the
// draft body — that path is JS-only on purpose (no need to expose draft
// metadata in HTML).
//
// We do NOT serve a hard 404 because the JS app loads at this URL and
// makes its own decision — the editor's preview view depends on
// reaching the SPA. The meta-refresh + JS redirect double-up is just
// what non-JS / pre-hydration browsers see.
function renderDraftStub(template, route) {
  const canonical = `${SITE}${route.path}`;
  // Title is intentionally generic — never leak the article subject.
  let html = template.replace(/<title>[\s\S]*?<\/title>/, `<title>gibol.co</title>`);
  if (/<meta\s+name="description"/i.test(html)) {
    html = html.replace(
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="gibol.co — dashboard olahraga Bahasa-first." />`,
    );
  }
  if (/<meta\s+name="keywords"/i.test(html)) {
    html = html.replace(/<meta\s+name="keywords"[^>]*>/i, '');
  }
  // Remove the default permissive robots tag from the SPA template so
  // there's no conflicting directive — only our noindex remains.
  html = html.replace(/<meta\s+name="robots"[^>]*>/gi, '');
  html = html.replace(/<meta\s+name="googlebot"[^>]*>/gi, '');
  // Inject noindex + meta-refresh + canonical pointing back to home.
  // The canonical-to-home tells crawlers "this URL is not the canonical
  // version of any page" so even if they see it, they don't index it.
  const draftMeta = `
    <!-- Phase 1 ship #10: unapproved draft. Body rendered client-side only
         when editor session is active. Anonymous + non-editor → redirect home. -->
    <meta name="robots" content="noindex, nofollow" />
    <meta name="googlebot" content="noindex, nofollow" />
    <link rel="canonical" href="${SITE}/" />
    <meta http-equiv="refresh" content="0; url=/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="gibol.co" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${DEFAULT_OG}" />
`;
  html = html.replace(/<\/head>/, `${draftMeta}  </head>`);
  return html;
}

// ─── Run ──────────────────────────────────────────────────────────────────
const templatePath = path.join(DIST, 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error(`[prerender] ${templatePath} not found. Run \`vite build\` first.`);
  process.exit(1);
}
const template = fs.readFileSync(templatePath, 'utf8');

const sportRoutes = await loadSportRoutes();
const publishLedger = await loadPublishLedger();
const editOverlay = await loadEditOverlay();
const generatedRoutes = await loadGeneratedContentRoutes(publishLedger, editOverlay);
const routes = [...STATIC_ROUTES, ...sportRoutes, ...generatedRoutes];

// Dedupe by path — a static route and a sport route could collide (defensive).
// First occurrence wins so STATIC_ROUTES has priority.
const seen = new Set();
const unique = [];
for (const r of routes) {
  if (seen.has(r.path)) {
    console.warn(`[prerender] duplicate path ${r.path} — keeping first definition`);
    continue;
  }
  seen.add(r.path);
  unique.push(r);
}

let written = 0;
let drafts = 0;
const bySport = {};
for (const route of unique) {
  const html = route._draft
    ? renderDraftStub(template, route)
    : renderHtml(template, route);
  const outDir = route.path === '/'
    ? DIST
    : path.join(DIST, route.path.replace(/^\//, ''));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  written++;
  if (route._draft) drafts++;
  const bucket = route._sport || (route._content ? `gen-${route._content}` : 'static');
  bySport[bucket] = (bySport[bucket] || 0) + 1;
  console.log(`[prerender] ${route.path}${route._draft ? ' (draft, noindex)' : ''}`);
}

const summary = Object.entries(bySport)
  .map(([k, v]) => `${k}=${v}`)
  .join(', ');
console.log(`\n[prerender] Wrote ${written} route HTML files (${summary}) to ${DIST}`);
if (drafts > 0) {
  console.log(`[prerender] ${drafts} of those are unapproved drafts (noindex stub HTML, redirect-to-home)`);
}

// ─── Sitemap.xml ──────────────────────────────────────────────────────────
// v0.13.0 Ship 5 — generate sitemap.xml dynamically so:
//   - lastmod reflects the build date (was hardcoded 2026-04-18)
//   - every prerendered route is included (no manual maintenance)
//   - changefreq + priority follow the route's sport status (live
//     hubs poll hourly, leaf pages weekly, "soon" stubs monthly)
//
// Writes to dist/sitemap.xml AFTER vite copies the stub from
// public/sitemap.xml — so this overwrites the static file. Vercel
// serves the dist version with the correct headers via vercel.json.
function sitemapPriorityFor(route) {
  if (route.path === '/') return '1.0';
  // Generated editorial content (Phase 1+) — preview/recap articles
  // are time-sensitive but high-value. Sit between sport hubs and
  // leaf entity pages. Once auto-publish lands in Phase 2 these will
  // dominate the sitemap by count.
  if (route._content) return '0.8';
  // Sport hubs (no nested path beyond the sport route base)
  const segments = route.path.split('/').filter(Boolean);
  if (segments.length === 1) return '0.9';
  // /recap landing
  if (route.path === '/recap') return '0.8';
  // Leaf entity pages
  if (segments.length >= 2) return '0.7';
  return '0.6';
}

function sitemapChangefreqFor(route) {
  if (route.path === '/') return 'daily';
  if (route.path === '/recap') return 'daily';
  // Generated editorial content — previews update at most once when
  // form/lineup data lands close to kickoff; recaps are write-once.
  // Daily is the right ceiling so crawlers re-fetch within the
  // window the article is relevant.
  if (route._content) return 'daily';
  // Live sport hubs
  const live = ['/nba-playoff-2026', '/premier-league-2025-26', '/formula-1-2026', '/tennis', '/super-league-2025-26'];
  if (live.includes(route.path)) return 'hourly';
  // "Soon" hubs
  const soon = ['/fifa-world-cup-2026', '/ibl'];
  if (soon.includes(route.path)) return 'monthly';
  // Leaf entity pages — weekly is fine; Google adapts.
  return 'weekly';
}

const today = new Date().toISOString().slice(0, 10);
// Exclude unapproved drafts from the sitemap — Phase 1 ship #10. The
// stub HTML for drafts already carries noindex; keeping them out of
// the sitemap means crawlers don't even discover them via the
// sitemap path.
const indexable = unique.filter((r) => !r._draft);
const sitemapUrls = indexable.map((r) => {
  const loc = `${SITE}${r.path === '/' ? '/' : r.path}`;
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${sitemapChangefreqFor(r)}</changefreq>
    <priority>${sitemapPriorityFor(r)}</priority>
    <xhtml:link rel="alternate" hreflang="id" href="${loc}" />
    <xhtml:link rel="alternate" hreflang="en" href="${loc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />
  </url>`;
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapUrls}
</urlset>
`;

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
console.log(`[prerender] Wrote sitemap.xml with ${indexable.length} URLs (lastmod=${today}, ${drafts} drafts excluded)`);

// ─── Editorial dashboard index ────────────────────────────────────────────
// v0.28.0 Ship #7 — emit dist/content/index.json with the metadata the
// /editor page needs to render the manual-review queue. Walks the same
// public/content/{type}/*.json files prerender already touched, picks
// out the gate results + frontmatter, sorts by review priority (lowest
// voice_lint score first so the worst articles surface for editor
// attention).
//
// Why a build-time emission: the SPA can't list a directory at runtime,
// and we don't want to add a server function for what's effectively a
// static manifest. Rebuild on every deploy when content changes.
function buildEditorIndex(publishLedger) {
  const contentDir = path.join(ROOT, 'public', 'content');
  if (!fs.existsSync(contentDir)) return null;
  const articles = [];
  for (const typeDir of fs.readdirSync(contentDir)) {
    const typePath = path.join(contentDir, typeDir);
    if (!fs.statSync(typePath).isDirectory()) continue;
    for (const file of fs.readdirSync(typePath).filter((f) => f.endsWith('.json'))) {
      try {
        const article = JSON.parse(fs.readFileSync(path.join(typePath, file), 'utf8'));
        const fm = article.frontmatter || {};
        const slug = article.slug || file.replace(/\.json$/, '');
        // Map content folder → SPA route prefix. Most types share the
        // folder name (preview → /preview, standings → /standings) but:
        //   recap (folder) → /match-recap (route — /recap is taken by
        //                    the existing NBA recap landing)
        //   team  (folder) → /profile (route — sport-agnostic profiles)
        const routePrefix = (
          typeDir === 'recap' ? '/match-recap' :
          typeDir === 'team' ? '/profile' :
          `/${typeDir}`
        );
        // v0.58.0 — bake `approved` flag from the publish ledger so
        // the SPA's NewsroomSlice can filter on it. Before this fix,
        // NewsroomSlice filtered on `manual_review === false` from
        // the static JSON, which is always true (the engine sets it
        // at write time and never updates it). Approval state lives
        // in Supabase ce_article_publishes; threading the ledger
        // here lets the build-time index reflect editor decisions.
        const ledgerKey = `${typeDir}:${slug}`;
        const approved = !!(publishLedger && publishLedger.get(ledgerKey));
        articles.push({
          type: typeDir,
          slug,
          title: article.title,
          description: article.description,
          path: `${routePrefix}/${slug}`,
          league: fm.league,
          home_team: fm.home_team,
          away_team: fm.away_team,
          home_score: fm.home_score ?? null,
          away_score: fm.away_score ?? null,
          kickoff_utc: fm.kickoff_utc,
          published_at: fm.published_at,
          // Approved at build time — true when the slug is in the
          // publish ledger. NewsroomSlice + future public surfaces
          // filter on this. Editor.jsx still fetches the live ledger
          // for real-time state; this build-time flag is "good enough
          // until next deploy" for public surfaces.
          approved,
          manual_review: fm.manual_review === true,
          model: fm.model,
          cost_usd: fm.cost_usd ?? null,
          // v0.47.0 — Phase 2 ship #28. CLI helpers now write full
          // `issues` and `suggestions` arrays into the per-article JSON.
          // Keep index.json compact by stripping those — Editor.jsx
          // fetches /content/{type}/{slug}.json on-demand when the
          // user expands "Show issues" for a row. Index stays ~5KB
          // per row instead of bloating to 50KB+ with full arrays.
          voice_lint: fm.voice_lint
            ? (() => {
                const { issues: _, ...rest } = fm.voice_lint;
                return rest;
              })()
            : null,
          fact_check: fm.fact_check || null,
          plagiarism_hash: fm.plagiarism_hash || null,
          qc_review: fm.qc_review
            ? (() => {
                const { suggestions: _s, headline_comment: _h, lead_comment: _l,
                        structure_comment: _str, voice_comment: _v, ...rest } = fm.qc_review;
                return rest;
              })()
            : null,
          chars: (article.body_md || '').length,
        });
      } catch (e) {
        console.warn(`[prerender] index: skip ${file}: ${e.message}`);
      }
    }
  }
  // Sort: pending review first, then ascending voice_lint score (worst
  // first for editor priority), then descending published_at (newest
  // first within tier).
  articles.sort((a, b) => {
    if (a.manual_review !== b.manual_review) return a.manual_review ? -1 : 1;
    const sa = a.voice_lint?.score ?? 100;
    const sb = b.voice_lint?.score ?? 100;
    if (sa !== sb) return sa - sb;
    return (b.published_at || '').localeCompare(a.published_at || '');
  });
  return {
    generated_at: new Date().toISOString(),
    article_count: articles.length,
    articles,
  };
}

const editorIndex = buildEditorIndex(publishLedger);
if (editorIndex) {
  const distContentDir = path.join(DIST, 'content');
  fs.mkdirSync(distContentDir, { recursive: true });
  fs.writeFileSync(
    path.join(distContentDir, 'index.json'),
    JSON.stringify(editorIndex, null, 2),
  );
  console.log(`[prerender] Wrote content/index.json with ${editorIndex.article_count} articles`);
}
