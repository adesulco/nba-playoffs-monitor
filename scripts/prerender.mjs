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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;

// ─── Static (non-sport) routes ────────────────────────────────────────────
// These are global pages or legacy stubs that don't belong to one sport.
const STATIC_ROUTES = [
  {
    path: '/',
    title: 'gibol.co — gila bola · skor live NBA, F1, Liga Inggris, Piala Dunia 2026',
    description: 'Dashboard live untuk NBA Playoffs 2026, Formula 1 2026, Liga Inggris 2025-26, Piala Dunia FIFA 2026, dan Liga 1 Indonesia. Skor live, peluang juara Polymarket, klasemen, dan recap Bahasa.',
    keywords: 'gibol, gila bola, skor nba, skor basket, skor playoff, live skor nba, peluang juara nba 2026, bracket nba, formula 1 2026, f1 2026, liga inggris, premier league, FIFA world cup 2026, piala dunia 2026, liga 1 indonesia',
    ogImage: DEFAULT_OG,
  },
  {
    path: '/about',
    title: 'Tentang gibol.co — dashboard olahraga live untuk fan Indonesia',
    description: 'gibol.co dibangun untuk para penggemar bola — live score NBA, F1, Liga Inggris, Liga 1 Indonesia, dan Piala Dunia 2026 dalam Bahasa Indonesia dengan waktu WIB.',
    keywords: 'tentang gibol, gila bola, dashboard olahraga, indonesian sports dashboard',
    ogImage: DEFAULT_OG,
  },
  {
    path: '/glossary',
    title: 'Glosarium Istilah NBA Playoff — Apa itu Bracket, Peluang Juara, Shot Chart | gibol.co',
    description: 'Glosarium 20 istilah NBA playoff dalam Bahasa Indonesia: peluang juara, bracket, seed, play-in, play-by-play, shot chart, box score, dan lainnya.',
    keywords: 'apa itu peluang juara, arti bracket nba, apa itu shot chart, arti play-in nba, glosarium nba, istilah nba indonesia',
    ogImage: DEFAULT_OG,
  },
  {
    path: '/ibl',
    title: 'IBL — Liga Basket Indonesia · Dashboard Live (Segera Hadir) | gibol.co',
    description: 'Dashboard live untuk Indonesian Basketball League (IBL). Skor live, klasemen, dan watchlist pemain untuk liga basket profesional teratas Indonesia. Coverage Bahasa penuh. Segera hadir.',
    keywords: 'IBL, liga basket indonesia, skor IBL, jadwal IBL, basket indonesia, iblindonesia',
    ogImage: DEFAULT_OG,
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

  html = html.replace(/<\/head>/, `${metaBlock}  </head>`);

  return html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function escapeAttr(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ─── Run ──────────────────────────────────────────────────────────────────
const templatePath = path.join(DIST, 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error(`[prerender] ${templatePath} not found. Run \`vite build\` first.`);
  process.exit(1);
}
const template = fs.readFileSync(templatePath, 'utf8');

const sportRoutes = await loadSportRoutes();
const routes = [...STATIC_ROUTES, ...sportRoutes];

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
const bySport = {};
for (const route of unique) {
  const html = renderHtml(template, route);
  const outDir = route.path === '/'
    ? DIST
    : path.join(DIST, route.path.replace(/^\//, ''));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  written++;
  const bucket = route._sport || 'static';
  bySport[bucket] = (bySport[bucket] || 0) + 1;
  console.log(`[prerender] ${route.path}`);
}

const summary = Object.entries(bySport)
  .map(([k, v]) => `${k}=${v}`)
  .join(', ');
console.log(`\n[prerender] Wrote ${written} route HTML files (${summary}) to ${DIST}`);
