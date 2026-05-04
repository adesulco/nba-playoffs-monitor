/**
 * English Premier League 2025-26 adapter — live in v0.4.0 (EPL Phase 1A).
 *
 * Phase 1A scope (this ship): real dashboard at /premier-league-2025-26 powered
 * by ESPN soccer/eng.1 (standings, scoreboard, scorers) behind /api/proxy/espn,
 * /api/proxy/espn-v2, /api/proxy/espn-common. 20 per-club SEO pages at
 * /premier-league-2025-26/club/:slug, each with its own SportsTeam JSON-LD.
 * Status flipped 'soon' → 'live' so Home shows the LIVE badge.
 *
 * Phase 1B (v0.4.x, next ship): Polymarket championship + top-4 + relegation
 * odds, ShareButton integration on club pages, Catatan Match-week recap PNG
 * generator. Intentionally deferred so this ship doesn't couple ESPN downtime
 * to Polymarket downtime.
 */

import { CLUBS, SEASON, SEASON_START, SEASON_END } from './clubs.js';
import { breadcrumbSchema } from '../_schema.js';

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const HUB_OG = `${SITE}/og/hub-epl.png`;
const routeBase = '/premier-league-2025-26';

// League-level SportsEvent schema — emitted on the main dashboard page.
const LEAGUE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: `Premier League ${SEASON}`,
  description: `The ${SEASON} English Premier League season — 20 clubs, 380 matches, August 2025 through May 2026. Title race, Champions League qualification, and relegation tracked live in Bahasa.`,
  startDate: SEASON_START,
  endDate: SEASON_END,
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Soccer',
  location: { '@type': 'Place', name: 'England & Wales' },
  organizer: {
    '@type': 'SportsOrganization',
    name: 'The Premier League',
    url: 'https://www.premierleague.com',
  },
  url: `${SITE}${routeBase}`,
};

// Per-club SportsTeam JSON-LD — emitted on /premier-league-2025-26/club/:slug.
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
      name: 'The Premier League',
      url: `${SITE}${routeBase}`,
    },
  };
}

function prerenderRoutes() {
  const out = [];

  // Main dashboard.
  out.push({
    path: routeBase,
    // v0.13.0 trim — was 76 chars / 244 chars.
    title: `Liga Inggris ${SEASON} — Klasemen & Top Skor | gibol.co`,
    description: `Skor Liga Inggris ${SEASON} live: klasemen 20 klub dengan form, jadwal pekan ini (WIB), hasil terbaru, top skor Golden Boot. Bahasa Indonesia.`,
    keywords: 'liga inggris, premier league, epl 2025-26, klasemen liga inggris, top skor epl, skor liga inggris, jadwal liga inggris, golden boot, arsenal liverpool manchester city chelsea tottenham, epl bahasa indonesia',
    ogImage: HUB_OG,
    jsonLd: [
      LEAGUE_JSONLD,
      breadcrumbSchema([
        { name: 'gibol.co', url: '/' },
        { name: 'Liga Inggris 2025-26', url: routeBase },
      ]),
    ],
  });

  // Per-club pages — 20 indexable URLs.
  for (const club of CLUBS) {
    out.push({
      path: `${routeBase}/club/${club.slug}`,
      // v0.13.0 trim — was up to 88 chars (Wolverhampton/Manchester
      // City). Tighter title fits even longest club names ≤60.
      title: `${club.name} · Liga Inggris ${SEASON} | gibol.co`,
      description: `${club.name} Liga Inggris ${SEASON}: klasemen, form 5 laga, jadwal pekan ini, hasil terbaru, top skor klub. Kandang ${club.stadium}, ${club.city}.`,
      keywords: `${club.name.toLowerCase()}, ${club.nameId.toLowerCase()}, ${club.slug} 2025-26, liga inggris ${club.slug}, klasemen ${club.name.toLowerCase()}, jadwal ${club.name.toLowerCase()}, hasil ${club.name.toLowerCase()}, ${club.stadium.toLowerCase()}, ${club.city.toLowerCase()}, epl 2025-26`,
      // v0.13.0 Ship 4 — per-club OG card.
      ogImage: `${SITE}/og/epl/${club.slug}.png`,
      jsonLd: [
        clubSchema(club),
        breadcrumbSchema([
          { name: 'gibol.co', url: '/' },
          { name: 'Liga Inggris 2025-26', url: routeBase },
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
  id: 'epl',
  name: 'Premier League 2025-26',
  nameId: 'Liga Inggris 2025-26',
  routeBase,
  accent: '#37003C',
  icon: 'pl',
  status: 'live', // flipped from 'soon' in v0.4.0
  prerenderRoutes,
  clubs,
};

export default adapter;
