/**
 * Tennis 2026 adapter — ships v0.5.0 (Tennis Phase 1A).
 *
 * Phase 1A scope (this ship): hub at /tennis, 18 per-tournament SEO pages at
 * /tennis/{slug}-2026, plus ATP + WTA rankings landings at
 * /tennis/rankings/{atp|wta}. Data powered by ESPN's undocumented tennis API
 * via /api/proxy/espn — scoreboard (live sets), rankings (top 500 per tour),
 * and news. Zero new infra.
 *
 * Phase 1B (v0.5.1, by Roland Garros 2026-05-24): per-player SEO pages for
 * top 200 ATP + top 200 WTA, Catatan Match share PNGs, draw viewer, watchlist.
 * Intentionally deferred per 00-brief.md.
 *
 * Route count for prerender: 1 hub + 2 rankings + 18 tournaments = 21 URLs.
 */

import { SEASON } from './constants.js';
import {
  SEASON_YEAR,
  TOURNAMENTS_2026,
  tournamentPath,
} from './tournaments.js';
import { SURFACE_LABEL, TIER_LABEL } from './glossary.js';

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const routeBase = '/tennis';

// ─── JSON-LD schemas ─────────────────────────────────────────────────────────

// Umbrella SportsEvent — emitted on the /tennis hub. Covers the season as a
// whole and ties each tournament together via superEvent.
const SEASON_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: `ATP & WTA Tour ${SEASON}`,
  description:
    'Kalender lengkap ATP & WTA Tour 2026 — empat Grand Slam, Masters 1000, WTA 1000, Year-End Finals — plus klasemen peringkat dan sorotan petenis Indonesia.',
  startDate: '2026-01-19', // AO main draw
  endDate: '2026-11-15', // ATP Finals last day
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Tennis',
  location: { '@type': 'Place', name: 'Worldwide' },
  organizer: [
    { '@type': 'SportsOrganization', name: 'ATP Tour', url: 'https://www.atptour.com' },
    { '@type': 'SportsOrganization', name: 'WTA', url: 'https://www.wtatennis.com' },
  ],
  url: `${SITE}${routeBase}`,
};

// Per-tournament SportsEvent. Each is one indexable URL.
function tournamentSchema(t) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${t.name} ${SEASON_YEAR}`,
    description: `${t.name} ${SEASON_YEAR} — ${TIER_LABEL[t.tier]?.en || ''} di ${t.venue}, ${t.city}. Undian, jadwal WIB, dan hasil live untuk tur ${t.tours.map((x) => x.toUpperCase()).join(' + ')}.`,
    startDate: t.startDate,
    endDate: t.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    sport: 'Tennis',
    location: {
      '@type': 'Place',
      name: t.venue,
      address: { '@type': 'PostalAddress', addressLocality: t.city, addressCountry: t.country },
    },
    superEvent: {
      '@type': 'SportsEvent',
      name: `ATP & WTA Tour ${SEASON}`,
      url: `${SITE}${routeBase}`,
    },
    organizer: {
      '@type': 'SportsOrganization',
      name: t.organizer,
      url: t.web,
    },
    url: `${SITE}${tournamentPath(t, SEASON_YEAR)}`,
  };
}

// Rankings page — ItemList of Person entries. Top 10 of each tour is fine for
// prerender; the live page fetches the full top-500 at runtime.
function rankingsSchema(tour) {
  const tourLabel = tour === 'atp' ? 'ATP' : 'WTA';
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Peringkat ${tourLabel} ${SEASON}`,
    description: `Peringkat petenis ${tourLabel} ${SEASON} dengan poin, perubahan posisi, dan tren pekanan. Refresh setiap Senin.`,
    url: `${SITE}${routeBase}/rankings/${tour}`,
    numberOfItems: 500,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
  };
}

// ─── Prerender ───────────────────────────────────────────────────────────────

function prerenderRoutes() {
  const out = [];

  // 1. Hub.
  out.push({
    path: routeBase,
    title: `Tenis ${SEASON} · Kalender ATP & WTA, Grand Slam, Peringkat Bahasa Indonesia | gibol.co`,
    description: `Hub tenis ${SEASON} dalam Bahasa — 4 Grand Slam (Australian Open, Roland Garros, Wimbledon, US Open), Masters 1000, WTA 1000, Year-End Finals. Jadwal WIB, peringkat ATP + WTA, dan sorotan petenis Indonesia (Aldila Sutjiadi, Priska Madelyn Nugroho, Christopher Rungkat).`,
    keywords:
      'tenis 2026, tennis 2026, atp tour 2026, wta tour 2026, grand slam 2026, australian open 2026, roland garros 2026, wimbledon 2026, us open 2026, masters 1000, wta 1000, peringkat atp, peringkat wta, aldila sutjiadi, priska nugroho, christopher rungkat, tenis bahasa indonesia, jadwal tenis WIB',
    ogImage: DEFAULT_OG,
    jsonLd: SEASON_JSONLD,
  });

  // 2. Rankings landings (ATP + WTA).
  for (const tour of ['atp', 'wta']) {
    const tourLabel = tour.toUpperCase();
    out.push({
      path: `${routeBase}/rankings/${tour}`,
      title: `Peringkat ${tourLabel} ${SEASON} · Top 500 Petenis ${tour === 'atp' ? 'Putra' : 'Putri'} Live | gibol.co`,
      description: `Peringkat ${tourLabel} ${SEASON} lengkap — poin, perubahan posisi pekanan, karier tertinggi, kewarganegaraan. Refresh setiap Senin sesuai update resmi ${tourLabel}. Termasuk petenis Indonesia di papan peringkat ganda.`,
      keywords: `peringkat ${tour}, ranking ${tour}, klasemen ${tour} 2026, top ${tour} players, ${tour} rankings 2026, poin ${tour}, karier tertinggi, petenis ${tour === 'atp' ? 'putra' : 'putri'}, tenis bahasa indonesia`,
      ogImage: DEFAULT_OG,
      jsonLd: rankingsSchema(tour),
    });
  }

  // 3. Per-tournament pages (18 URLs).
  for (const t of TOURNAMENTS_2026) {
    const surface = SURFACE_LABEL[t.surface] || { id: t.surface, en: t.surface };
    const tier = TIER_LABEL[t.tier] || { id: t.tier, en: t.tier };
    const tourLabel = t.tours.map((x) => x.toUpperCase()).join(' + ');
    out.push({
      path: tournamentPath(t, SEASON_YEAR),
      title: `${t.name} ${SEASON_YEAR} · Jadwal WIB, Undian, Hasil Live (${tier.en}) | gibol.co`,
      description: `${t.name} ${SEASON_YEAR} — ${tier.id} di ${t.venue}, ${t.city}. Main draw ${t.startDate} sampai ${t.endDate}. Undian lengkap ${tourLabel}, jadwal pertandingan WIB, hasil live set-per-set, dan recap Bahasa per hari turnamen. Permukaan ${surface.id}.`,
      keywords: `${t.name.toLowerCase()} ${SEASON_YEAR}, ${t.slug.replace(/-/g, ' ')} ${SEASON_YEAR}, jadwal ${t.name.toLowerCase()}, hasil ${t.name.toLowerCase()} ${SEASON_YEAR}, undian ${t.name.toLowerCase()}, ${tier.en.toLowerCase()}, ${t.city.toLowerCase()}, tenis ${surface.id.toLowerCase()}, ${t.tours.join(' ')} ${SEASON_YEAR}`,
      ogImage: DEFAULT_OG,
      jsonLd: tournamentSchema(t),
    });
  }

  return out;
}

// Helpers so UI components can pull the registry without re-importing constants.
function tournaments() {
  return TOURNAMENTS_2026;
}

export const adapter = {
  id: 'tennis',
  name: `Tennis ${SEASON}`,
  nameId: `Tenis ${SEASON}`,
  routeBase,
  accent: '#D4A13A', // TENNIS_SLAM_GOLD — hub tier accent
  icon: 'tennis',
  status: 'live', // Phase 1A ships live
  prerenderRoutes,
  tournaments,
};

export default adapter;
