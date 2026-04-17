#!/usr/bin/env node
/**
 * Static per-route HTML prerender for gibol.co — F01 audit fix.
 *
 * Why: we're a pure client-side React SPA. That means scrapers that don't
 * execute JavaScript (WhatsApp, Slack, Discord, AI crawlers, Bing's early
 * crawler pass) only see the static index.html from Vite. Their preview,
 * title, and og:image all fall back to the default.
 *
 * Fix: after `vite build`, run this script. For each of our 35 known routes,
 * write a per-route `dist/{route}/index.html` with the route's unique meta
 * tags BAKED INTO THE HTML BEFORE JS runs. React still hydrates client-side
 * for full interactivity — but scrapers now see correct per-route meta.
 *
 * Dynamic routes (/recap/:date, /nba-playoff-2026/:teamSlug) are handled:
 *   - Team slugs: all 30 teams pre-rendered.
 *   - /recap/:date: NOT pre-rendered (date is unbounded). The base /recap
 *     route is pre-rendered with a default "today's recap" meta; per-date
 *     recap meta is still injected client-side by react-helmet-async.
 *
 * Usage: runs automatically after `npm run build` via package.json postbuild hook.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;

// ─── Route metadata — one entry per route we want to prerender ────────────
// title & description are the Bahasa-first versions; we flip English via Helmet
// at runtime for users on /?lang=en or when toggle is set. Crawlers get Bahasa.
const routes = [
  {
    path: '/',
    title: 'gibol.co — gila bola · skor live NBA, IBL, Piala Dunia 2026',
    description: 'Dashboard live untuk NBA Playoffs 2026, IBL (Liga Basket Indonesia), dan Piala Dunia FIFA 2026. Skor live, peluang juara Polymarket, bracket, play-by-play, dan statistik pemain dalam satu halaman.',
    keywords: 'gibol, gila bola, skor nba, skor basket, skor playoff, live skor nba, peluang juara nba 2026, bracket nba, IBL, liga basket indonesia, FIFA world cup 2026, piala dunia 2026',
    ogImage: DEFAULT_OG,
  },
  {
    path: '/nba-playoff-2026',
    title: 'Skor NBA Playoff 2026 Live · Bracket, Peluang Juara, Play-by-Play | gibol.co',
    description: 'Dashboard live NBA Playoff 2026: skor real-time, bracket Ronde 1, peluang juara Polymarket (OKC 44%), win probability, play-by-play, shot chart, statistik pemain, laporan cedera, dan watchlist. Update setiap 10–30 detik.',
    keywords: 'skor nba, skor basket, skor playoff nba, skor nba live, skor nba hari ini, peluang juara nba 2026, bracket nba playoff 2026, jadwal nba playoff, nba playoff 2026 indonesia, live nba indonesia',
    ogImage: DEFAULT_OG,
  },
  {
    path: '/recap',
    title: 'Catatan Playoff NBA · Recap Harian Hasil + Momen Terbesar | gibol.co',
    description: 'Hasil lengkap NBA Playoff harian dalam Bahasa Indonesia. Skor akhir, top scorer, momen terbesar, dan analisis per laga. Update tiap pagi, shareable ke WhatsApp dan Instagram.',
    keywords: 'hasil nba hari ini, hasil nba kemarin, recap nba playoff, catatan playoff, skor akhir nba playoff',
    ogImage: DEFAULT_OG,
  },
  {
    path: '/about',
    title: 'Tentang gibol.co — dashboard olahraga live untuk fan Indonesia',
    description: 'gibol.co dibangun untuk para penggemar bola — live score NBA, IBL, dan Piala Dunia 2026 dalam Bahasa Indonesia dengan waktu WIB.',
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
  {
    path: '/fifa-world-cup-2026',
    title: 'Piala Dunia FIFA 2026 — 48 Tim · 104 Laga · 16 Kota (Segera Hadir) | gibol.co',
    description: 'Dashboard live untuk Piala Dunia FIFA 2026 — 48 tim, 104 pertandingan, 16 kota tuan rumah di AS, Meksiko, dan Kanada. Skor live, tabel grup, bagan gugur, tracking pemain, dan pasar prediksi. Mulai 11 Juni 2026.',
    keywords: 'piala dunia 2026, FIFA world cup 2026, skor piala dunia, jadwal piala dunia 2026, tim piala dunia 2026',
    ogImage: DEFAULT_OG,
  },
];

// Team page metadata — all 30 NBA teams. Pre-rendered with team-specific title/desc/keywords.
const teams = [
  { slug: 'thunder', name: 'Oklahoma City Thunder', abbr: 'OKC', nickname: 'Thunder', star: 'Shai Gilgeous-Alexander' },
  { slug: 'spurs', name: 'San Antonio Spurs', abbr: 'SAS', nickname: 'Spurs', star: 'Victor Wembanyama' },
  { slug: 'celtics', name: 'Boston Celtics', abbr: 'BOS', nickname: 'Celtics', star: 'Jayson Tatum' },
  { slug: 'nuggets', name: 'Denver Nuggets', abbr: 'DEN', nickname: 'Nuggets', star: 'Nikola Jokić' },
  { slug: 'pistons', name: 'Detroit Pistons', abbr: 'DET', nickname: 'Pistons', star: 'Cade Cunningham' },
  { slug: 'cavaliers', name: 'Cleveland Cavaliers', abbr: 'CLE', nickname: 'Cavaliers', star: 'Donovan Mitchell' },
  { slug: 'knicks', name: 'New York Knicks', abbr: 'NYK', nickname: 'Knicks', star: 'Jalen Brunson' },
  { slug: 'rockets', name: 'Houston Rockets', abbr: 'HOU', nickname: 'Rockets', star: 'Kevin Durant' },
  { slug: 'lakers', name: 'Los Angeles Lakers', abbr: 'LAL', nickname: 'Lakers', star: 'LeBron James' },
  { slug: 'timberwolves', name: 'Minnesota Timberwolves', abbr: 'MIN', nickname: 'Timberwolves', star: 'Anthony Edwards' },
  { slug: 'raptors', name: 'Toronto Raptors', abbr: 'TOR', nickname: 'Raptors', star: 'Scottie Barnes' },
  { slug: 'hawks', name: 'Atlanta Hawks', abbr: 'ATL', nickname: 'Hawks', star: 'Trae Young' },
  { slug: 'sixers', name: 'Philadelphia 76ers', abbr: 'PHI', nickname: 'Sixers', star: 'Joel Embiid' },
  { slug: 'blazers', name: 'Portland Trail Blazers', abbr: 'POR', nickname: 'Blazers', star: 'Scoot Henderson' },
  { slug: 'warriors', name: 'Golden State Warriors', abbr: 'GSW', nickname: 'Warriors', star: 'Stephen Curry' },
  { slug: 'suns', name: 'Phoenix Suns', abbr: 'PHX', nickname: 'Suns', star: 'Devin Booker' },
  { slug: 'magic', name: 'Orlando Magic', abbr: 'ORL', nickname: 'Magic', star: 'Paolo Banchero' },
  { slug: 'hornets', name: 'Charlotte Hornets', abbr: 'CHA', nickname: 'Hornets', star: 'LaMelo Ball' },
  { slug: 'heat', name: 'Miami Heat', abbr: 'MIA', nickname: 'Heat', star: 'Bam Adebayo' },
  { slug: 'bucks', name: 'Milwaukee Bucks', abbr: 'MIL', nickname: 'Bucks', star: 'Giannis Antetokounmpo' },
  { slug: 'bulls', name: 'Chicago Bulls', abbr: 'CHI', nickname: 'Bulls', star: 'Coby White' },
  { slug: 'nets', name: 'Brooklyn Nets', abbr: 'BKN', nickname: 'Nets', star: 'Cam Thomas' },
  { slug: 'pacers', name: 'Indiana Pacers', abbr: 'IND', nickname: 'Pacers', star: 'Tyrese Haliburton' },
  { slug: 'wizards', name: 'Washington Wizards', abbr: 'WAS', nickname: 'Wizards', star: 'Jordan Poole' },
  { slug: 'mavericks', name: 'Dallas Mavericks', abbr: 'DAL', nickname: 'Mavericks', star: 'Luka Dončić' },
  { slug: 'grizzlies', name: 'Memphis Grizzlies', abbr: 'MEM', nickname: 'Grizzlies', star: 'Ja Morant' },
  { slug: 'pelicans', name: 'New Orleans Pelicans', abbr: 'NOP', nickname: 'Pelicans', star: 'Zion Williamson' },
  { slug: 'kings', name: 'Sacramento Kings', abbr: 'SAC', nickname: 'Kings', star: 'Domantas Sabonis' },
  { slug: 'jazz', name: 'Utah Jazz', abbr: 'UTA', nickname: 'Jazz', star: 'Lauri Markkanen' },
  { slug: 'clippers', name: 'Los Angeles Clippers', abbr: 'LAC', nickname: 'Clippers', star: 'James Harden' },
];

for (const t of teams) {
  routes.push({
    path: `/nba-playoff-2026/${t.slug}`,
    title: `Skor ${t.nickname} NBA Playoff 2026 · Jadwal & Statistik | gibol.co`,
    description: `Skor live ${t.name} (${t.abbr}) di NBA Playoff 2026. Jadwal lengkap, statistik pemain, laporan cedera, dan peluang juara. Star: ${t.star}.`,
    keywords: `skor ${t.nickname.toLowerCase()}, skor ${t.abbr.toLowerCase()}, ${t.nickname.toLowerCase()} playoff, jadwal ${t.nickname.toLowerCase()}, peluang juara ${t.nickname.toLowerCase()}, ${t.name.toLowerCase()}, nba playoff 2026`,
    ogImage: DEFAULT_OG,
  });
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

let written = 0;
for (const route of routes) {
  const html = renderHtml(template, route);
  const outDir = route.path === '/'
    ? DIST
    : path.join(DIST, route.path.replace(/^\//, ''));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  written++;
  console.log(`[prerender] ${route.path}`);
}
console.log(`\n[prerender] Wrote ${written} route HTML files with per-route meta to ${DIST}`);
