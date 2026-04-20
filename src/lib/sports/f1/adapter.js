/**
 * Formula 1 2026 adapter — live in v0.2.2 (F1 Phase 1A).
 *
 * Phase 1A scope (this ship): real dashboard at /formula-1-2026 powered by
 * Jolpica-F1 (schedule + driver + constructor standings) behind /api/proxy/
 * jolpica-f1. Per-GP SEO routes for each of the 23 announced rounds + the
 * main dashboard + driver + constructor landing stubs. Status flipped
 * 'soon' → 'live' so Home shows the LIVE badge.
 *
 * Phase 1B (v0.2.3, next ship): OpenF1 live session mode (positions, intervals,
 * pit stops, telemetry), Polymarket championship odds, per-driver + per-team
 * SEO pages with career stats. Intentionally deferred so this ship doesn't
 * couple Jolpica downtime to OpenF1 downtime.
 */

import { CALENDAR_2026, formatGPDate, SEASON, TEAMS_2026, TEAMS_BY_ID, DRIVERS_2026 } from './constants.js';

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const routeBase = '/formula-1-2026';

// Championship-level SportsEvent schema — emitted on the main dashboard page.
const CHAMPIONSHIP_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: '2026 FIA Formula One World Championship',
  description: "The 2026 Formula 1 World Championship — 23+ Grand Prix across four continents, new chassis + power unit regulations, Audi and Cadillac entering as constructors.",
  startDate: '2026-03-06',
  endDate: '2026-12-06',
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Formula 1',
  location: { '@type': 'Place', name: 'Worldwide' },
  organizer: { '@type': 'SportsOrganization', name: "Fédération Internationale de l'Automobile (FIA)", url: 'https://www.fia.com' },
  url: `${SITE}${routeBase}`,
};

// Per-GP SportsEvent schema builder. Each race = its own indexable page with
// its own schema so search engines can surface "Japanese GP 2026 start time".
function gpSchema(gp) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${gp.name} 2026 · Round ${gp.round}`,
    description: `The 2026 ${gp.name} — Round ${gp.round} of the FIA Formula One World Championship, held at ${gp.circuit}, ${gp.country}. Race date ${gp.dateISO}, main race ${gp.wibTime} WIB.`,
    startDate: gp.dateISO,
    endDate: gp.dateISO,
    eventStatus: 'https://schema.org/EventScheduled',
    sport: 'Formula 1',
    location: {
      '@type': 'Place',
      name: gp.circuit,
      address: { '@type': 'PostalAddress', addressCountry: gp.country },
    },
    superEvent: {
      '@type': 'SportsEvent',
      name: '2026 FIA Formula One World Championship',
      url: `${SITE}${routeBase}`,
    },
    organizer: { '@type': 'SportsOrganization', name: "Fédération Internationale de l'Automobile (FIA)", url: 'https://www.fia.com' },
    url: `${SITE}${routeBase}/race/${gp.slug}`,
  };
}

// Per-constructor SportsTeam + SportsOrganization (hybrid) — emitted on
// /formula-1-2026/team/:slug pages. Uses memberOf to tie back to the
// championship superEvent, and subOrganization list of drivers.
function teamSchema(team, driversForTeam) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    alternateName: team.short,
    sport: 'Formula 1',
    url: `${SITE}${routeBase}/team/${team.slug}`,
    foundingDate: String(team.founded),
    location: { '@type': 'Place', name: team.base },
    memberOf: {
      '@type': 'SportsOrganization',
      name: '2026 FIA Formula One World Championship',
      url: `${SITE}${routeBase}`,
    },
    athlete: driversForTeam.map((d) => ({
      '@type': 'Person',
      name: d.name,
      jobTitle: 'Formula 1 Driver',
      url: `${SITE}${routeBase}/driver/${d.slug}`,
    })),
  };
}

// Per-driver Person (athlete) — emitted on /formula-1-2026/driver/:slug.
function driverSchema(driver, team) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: driver.name,
    jobTitle: 'Formula 1 Driver',
    url: `${SITE}${routeBase}/driver/${driver.slug}`,
    identifier: driver.code,
    memberOf: team
      ? {
          '@type': 'SportsTeam',
          name: team.name,
          url: `${SITE}${routeBase}/team/${team.slug}`,
        }
      : undefined,
  };
}

function prerenderRoutes() {
  const out = [];

  // Main dashboard — live now.
  out.push({
    path: routeBase,
    title: 'Formula 1 2026 · Klasemen Pembalap, Jadwal 23 GP (WIB), Hasil Live | gibol.co',
    description: `Dashboard live F1 ${SEASON} dalam Bahasa Indonesia — klasemen pembalap + konstruktor, kalender 23 Grand Prix dengan jam start WIB, hasil balapan terbaru, podium, dan tracking juara. Dari fan F1 Indonesia untuk fan F1 Indonesia.`,
    keywords: 'formula 1 2026, f1 2026, klasemen f1, jadwal f1 2026, hasil grand prix, peluang juara f1, max verstappen, lando norris, lewis hamilton, charles leclerc, oscar piastri, kimi antonelli, f1 bahasa indonesia, WIB f1',
    ogImage: DEFAULT_OG,
    jsonLd: CHAMPIONSHIP_JSONLD,
  });

  // Per-GP race pages — 23 unique indexable URLs with per-race JSON-LD.
  for (const gp of CALENDAR_2026) {
    out.push({
      path: `${routeBase}/race/${gp.slug}`,
      title: `${gp.name} 2026 · Jadwal WIB, Hasil, Klasemen Sementara (R${String(gp.round).padStart(2, '0')}) | gibol.co`,
      description: `${gp.name} 2026 — Round ${gp.round} F1 di sirkuit ${gp.circuit}, ${gp.country}. Jadwal race hari Minggu ${formatGPDate(gp.dateISO, 'id')} pukul ${gp.wibTime} WIB${gp.sprint ? ' (weekend sprint)' : ''}. Klasemen sementara, prediksi juara, dan recap Bahasa pasca-balapan.`,
      keywords: `${gp.name.toLowerCase()} 2026, ${gp.slug.replace(/-/g, ' ')} 2026, jadwal ${gp.name.toLowerCase()}, hasil ${gp.name.toLowerCase()} 2026, f1 round ${gp.round}, ${gp.circuit.toLowerCase()}, f1 ${gp.country.toLowerCase()}, WIB f1 ${gp.round}`,
      ogImage: DEFAULT_OG,
      jsonLd: gpSchema(gp),
    });
  }

  // Per-constructor pages — 11 indexable URLs (v0.2.5).
  const driversByTeam = DRIVERS_2026.reduce((acc, d) => {
    (acc[d.teamId] = acc[d.teamId] || []).push(d);
    return acc;
  }, {});
  for (const team of TEAMS_2026) {
    const driversForTeam = driversByTeam[team.id] || [];
    const driverNames = driversForTeam.map((d) => d.name).join(' · ');
    out.push({
      path: `${routeBase}/team/${team.slug}`,
      title: `${team.name} F1 2026 · Pembalap, Poin, Klasemen Konstruktor | gibol.co`,
      description: `${team.name} di musim F1 2026 — line-up pembalap ${driverNames}, basis tim ${team.base}, power unit ${team.power}. Poin, klasemen konstruktor, hasil balapan dan peluang juara.`,
      keywords: `${team.name.toLowerCase()} f1 2026, ${team.short.toLowerCase()} 2026, ${team.slug.replace(/-/g, ' ')} f1, pembalap ${team.short.toLowerCase()}, klasemen konstruktor 2026, ${driversForTeam.map((d) => d.name.toLowerCase()).join(', ')}`,
      ogImage: DEFAULT_OG,
      jsonLd: teamSchema(team, driversForTeam),
    });
  }

  // Per-driver pages — 22 indexable URLs (v0.2.5).
  for (const driver of DRIVERS_2026) {
    const team = TEAMS_BY_ID[driver.teamId];
    out.push({
      path: `${routeBase}/driver/${driver.slug}`,
      title: `${driver.name} F1 2026 · Poin, Podium, Stats Pembalap ${team ? team.short : ''} | gibol.co`,
      description: `${driver.name} (#${driver.number}, ${driver.code}) membalap untuk ${team ? team.name : 'F1 2026'} di musim 2026. Poin klasemen, jumlah podium, jumlah menang, dan peluang juara pembalap.`,
      keywords: `${driver.name.toLowerCase()}, ${driver.slug}, ${driver.code.toLowerCase()} f1, f1 2026 ${driver.slug}, pembalap ${team ? team.short.toLowerCase() : 'f1'}, klasemen pembalap, podium ${driver.name.toLowerCase()}`,
      ogImage: DEFAULT_OG,
      jsonLd: driverSchema(driver, team),
    });
  }

  return out;
}

// Helper so UI components don't need to re-import constants for display lookups.
function teams() { return TEAMS_2026; }
function drivers() { return DRIVERS_2026; }
function calendar() { return CALENDAR_2026; }

export const adapter = {
  id: 'f1',
  name: 'Formula 1 2026',
  nameId: 'Formula 1 2026',
  routeBase,
  accent: '#E10600',
  glyph: '🏎️',
  status: 'live', // flipped from 'soon' in v0.2.2
  prerenderRoutes,
  teams,
  drivers,
  calendar,
};

export default adapter;
