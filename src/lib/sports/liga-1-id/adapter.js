/**
 * Indonesian Super League 2025-26 adapter — live in v0.13.0 (Phase 1A).
 *
 * What was Liga 1 (BRI Liga 1) in prior seasons is officially marketed as
 * "Super League" starting 2025-26. Route + display copy use Super League;
 * the adapter id stays `liga_1_id` so existing flags + Home registry don't
 * break. Old /liga-1-2026 stub URL is 308-redirected to the new route in
 * vercel.json so any prior crawl still resolves.
 *
 * Phase 1A scope (this ship):
 *   - real dashboard at /super-league-2025-26 powered by ESPN soccer/idn.1
 *     (standings, scoreboard) via /api/proxy/espn + /api/proxy/espn-v2.
 *   - 18 per-club SEO pages at /super-league-2025-26/club/:slug, each with
 *     its own SportsTeam JSON-LD.
 *   - status flipped 'soon' → 'live' so Home shows the LIVE badge.
 *
 * Deferred to v0.13.x:
 *   - Top scorer / Golden Boot leaderboard (ESPN doesn't expose scorers
 *     for idn.1 — needs API-Football Pro at $19/mo).
 *   - Persija ↔ Persib derby ("El Clasico Indonesia") dedicated SEO page.
 *   - Polymarket odds (no IDN markets exist).
 */

import { CLUBS, SEASON, SEASON_START, SEASON_END, LEAGUE_NAME, LEAGUE_NAME_FULL, LEAGUE_NAME_ID } from './clubs.js';
import { breadcrumbSchema } from '../_schema.js';

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const HUB_OG = `${SITE}/og/hub-superleague.png`;
const routeBase = '/super-league-2025-26';

// League-level SportsEvent schema — emitted on the main dashboard page.
const LEAGUE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: `${LEAGUE_NAME} ${SEASON} (Indonesia)`,
  alternateName: ['Super League Indonesia', 'BRI Liga 1', 'Liga 1 Indonesia'],
  description: `Musim ${SEASON} Indonesian Super League — 18 klub, kompetisi sepakbola kasta tertinggi di Indonesia. Persija, Persib, Persebaya, Arema, dan rivalitas El Clasico Indonesia. Skor live, klasemen, jadwal — semuanya Bahasa.`,
  startDate: SEASON_START,
  endDate: SEASON_END,
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Soccer',
  location: { '@type': 'Country', name: 'Indonesia' },
  organizer: {
    '@type': 'SportsOrganization',
    name: 'PT Liga Indonesia Baru',
    url: 'https://ligaindonesiabaru.com',
  },
  url: `${SITE}${routeBase}`,
};

// Per-club SportsTeam JSON-LD — emitted on /super-league-2025-26/club/:slug.
function clubSchema(club) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: club.name,
    alternateName: club.nameId !== club.name ? club.nameId : undefined,
    sport: 'Soccer',
    url: `${SITE}${routeBase}/club/${club.slug}`,
    foundingDate: String(club.founded),
    location: { '@type': 'Place', name: club.city },
    memberOf: {
      '@type': 'SportsOrganization',
      name: LEAGUE_NAME_FULL,
      url: `${SITE}${routeBase}`,
    },
  };
}

function prerenderRoutes() {
  const out = [];

  // Main dashboard.
  out.push({
    path: routeBase,
    title: `Super League Indonesia ${SEASON} — Klasemen, Jadwal | gibol.co`,
    description: `Skor Super League (BRI Liga 1) ${SEASON} live: klasemen 18 klub dengan form, jadwal pekan ini WIB, hasil terbaru, derby Persija vs Persib. Bahasa Indonesia.`,
    keywords: 'super league indonesia, liga 1, bri liga 1, liga 1 indonesia 2025-26, klasemen liga 1, jadwal liga 1, skor liga 1, persija persib, el clasico indonesia, liga indonesia bahasa, super league bahasa',
    ogImage: HUB_OG,
    jsonLd: [
      LEAGUE_JSONLD,
      breadcrumbSchema([
        { name: 'gibol.co', url: '/' },
        { name: `Super League Indonesia ${SEASON}`, url: routeBase },
      ]),
    ],
  });

  // Per-club pages — 18 indexable URLs.
  for (const club of CLUBS) {
    out.push({
      path: `${routeBase}/club/${club.slug}`,
      title: `${club.name} · Super League ${SEASON} | gibol.co`,
      description: `${club.name} di Super League Indonesia ${SEASON}: klasemen, form 5 laga, jadwal pekan ini, hasil terbaru. Kandang ${club.stadium}, ${club.city}.`,
      keywords: `${club.name.toLowerCase()}, ${club.nameId.toLowerCase()}, ${club.slug} 2025-26, super league ${club.slug}, liga 1 ${club.slug}, klasemen ${club.name.toLowerCase()}, jadwal ${club.name.toLowerCase()}, hasil ${club.name.toLowerCase()}, ${club.stadium.toLowerCase()}, ${club.city.toLowerCase()}, super league 2025-26, bri liga 1`,
      // v0.13.0 Ship 4 — per-club OG card.
      ogImage: `${SITE}/og/super-league/${club.slug}.png`,
      jsonLd: [
        clubSchema(club),
        breadcrumbSchema([
          { name: 'gibol.co', url: '/' },
          { name: `Super League Indonesia ${SEASON}`, url: routeBase },
          { name: club.name, url: `${routeBase}/club/${club.slug}` },
        ]),
      ],
    });
  }

  return out;
}

// Helper so UI components / tests don't need to re-import constants.
function clubs() { return CLUBS; }

export const adapter = {
  id: 'liga_1_id', // legacy id kept stable so flags + Home registry don't break
  name: `${LEAGUE_NAME_FULL} ${SEASON}`,
  nameId: `${LEAGUE_NAME_ID} ${SEASON}`,
  routeBase,
  accent: '#E2231A',
  icon: 'id',
  status: 'live', // flipped from 'soon' in v0.13.0
  prerenderRoutes,
  clubs,
};

export default adapter;
