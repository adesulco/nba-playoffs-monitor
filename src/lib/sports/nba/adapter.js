/**
 * NBA adapter — v0.2.0 wraps the existing NBA stack in the adapter interface
 * without moving any code. Phase 1 proved the interface works; migrating the
 * rest of usePlayoffData / usePolymarketWS / api.js into this module is
 * deferred to a later v0.2.x patch so the live playoff window is not at risk.
 *
 * For now this adapter supplies:
 *   - Route + SEO metadata (so the generic prerender can replace the
 *     hardcoded NBA entries in scripts/prerender.mjs)
 *   - The sport's identity (id, accent, glyph, status)
 *
 * The actual data hooks (useLivePlayoffs, usePolymarketWS, etc.) continue to
 * live under src/hooks/ and be imported directly by NBADashboard.jsx. That
 * indirection-free path is fine while NBA is the only live sport.
 */

import { teamSlug, TEAM_META } from '../../constants.js';

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const routeBase = '/nba-playoff-2026';

// Teams list reused for per-team prerender. We derive it from TEAM_META so
// a change in constants flows through without touching prerender logic.
function teams() {
  return Object.entries(TEAM_META).map(([name, meta]) => ({
    name,
    slug: teamSlug(name),
    abbr: meta.abbr,
    nickname: name.split(' ').pop(),
    star: meta.star,
  }));
}

function prerenderRoutes() {
  const out = [
    {
      path: routeBase,
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
  ];

  for (const t of teams()) {
    out.push({
      path: `${routeBase}/${t.slug}`,
      title: `Skor ${t.nickname} NBA Playoff 2026 · Jadwal & Statistik | gibol.co`,
      description: `Skor live ${t.name} (${t.abbr}) di NBA Playoff 2026. Jadwal lengkap, statistik pemain, laporan cedera, dan peluang juara. Star: ${t.star}.`,
      keywords: `skor ${t.nickname.toLowerCase()}, skor ${t.abbr.toLowerCase()}, ${t.nickname.toLowerCase()} playoff, jadwal ${t.nickname.toLowerCase()}, peluang juara ${t.nickname.toLowerCase()}, ${t.name.toLowerCase()}, nba playoff 2026`,
      ogImage: DEFAULT_OG,
    });
  }
  return out;
}

export const adapter = {
  id: 'nba',
  name: 'NBA Playoffs 2026',
  nameId: 'NBA Playoff 2026',
  routeBase,
  accent: '#e8502e',
  glyph: '🏀',
  status: 'live',
  prerenderRoutes,
};

export default adapter;
