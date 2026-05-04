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
import { breadcrumbSchema } from '../_schema.js';

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const HUB_OG = `${SITE}/og/hub-f1.png`;
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
//
// v0.13.0 — `identifier` is not a valid schema.org Person property
// (it's defined on Thing but most validators flag it as a warning
// when used to carry the FIA driver code). Drop it; the driver
// `code` (e.g. "VER", "HAM") is already encoded in `name` and the
// URL slug, which is enough for crawlers. If we ever want to expose
// the FIA code as structured data, the right field is `additionalName`.
function driverSchema(driver, team) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: driver.name,
    additionalName: driver.code,
    jobTitle: 'Formula 1 Driver',
    url: `${SITE}${routeBase}/driver/${driver.slug}`,
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
    // v0.13.0 trim — was 78 chars / 225 chars.
    title: `F1 ${SEASON} — Klasemen, Jadwal 23 GP, Hasil Live | gibol.co`,
    description: `Skor F1 ${SEASON} live: klasemen pembalap + konstruktor, kalender 23 GP dengan jam WIB, hasil balapan, podium, tracking juara. Bahasa Indonesia.`,
    keywords: 'formula 1 2026, f1 2026, klasemen f1, jadwal f1 2026, hasil grand prix, peluang juara f1, max verstappen, lando norris, lewis hamilton, charles leclerc, oscar piastri, kimi antonelli, f1 bahasa indonesia, WIB f1',
    ogImage: HUB_OG,
    jsonLd: [
      CHAMPIONSHIP_JSONLD,
      breadcrumbSchema([
        { name: 'gibol.co', url: '/' },
        { name: 'Formula 1 2026', url: routeBase },
      ]),
    ],
  });

  // Per-GP race pages — 23 unique indexable URLs with per-race JSON-LD.
  for (const gp of CALENDAR_2026) {
    out.push({
      path: `${routeBase}/race/${gp.slug}`,
      // v0.13.0 trim — was up to 95 chars / 280+ chars. Worst-case
      // title now ≤60 (Australian Grand Prix = 21 + 38 = 59).
      title: `${gp.name} 2026 — Jadwal WIB & Hasil F1 | gibol.co`,
      description: `${gp.name} 2026 (Round ${gp.round}) di ${gp.circuit}, ${gp.country}. Jadwal Minggu ${formatGPDate(gp.dateISO, 'id')} ${gp.wibTime} WIB${gp.sprint ? ' · sprint' : ''}. Hasil + recap Bahasa.`,
      keywords: `${gp.name.toLowerCase()} 2026, ${gp.slug.replace(/-/g, ' ')} 2026, jadwal ${gp.name.toLowerCase()}, hasil ${gp.name.toLowerCase()} 2026, f1 round ${gp.round}, ${gp.circuit.toLowerCase()}, f1 ${gp.country.toLowerCase()}, WIB f1 ${gp.round}`,
      ogImage: DEFAULT_OG,
      jsonLd: [
        gpSchema(gp),
        breadcrumbSchema([
          { name: 'gibol.co', url: '/' },
          { name: 'Formula 1 2026', url: routeBase },
          { name: gp.name, url: `${routeBase}/race/${gp.slug}` },
        ]),
      ],
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
      // v0.13.0 trim — was up to 73 chars (Red Bull Racing). Now ≤60.
      title: `${team.name} F1 2026 — Pembalap & Poin | gibol.co`,
      description: `${team.name} F1 2026 — line-up ${driverNames}, basis ${team.base}, power unit ${team.power}. Poin, klasemen konstruktor, hasil, peluang juara.`,
      keywords: `${team.name.toLowerCase()} f1 2026, ${team.short.toLowerCase()} 2026, ${team.slug.replace(/-/g, ' ')} f1, pembalap ${team.short.toLowerCase()}, klasemen konstruktor 2026, ${driversForTeam.map((d) => d.name.toLowerCase()).join(', ')}`,
      // v0.13.0 Ship 4 — per-constructor OG card.
      ogImage: `${SITE}/og/f1/team-${team.slug}.png`,
      jsonLd: [
        teamSchema(team, driversForTeam),
        breadcrumbSchema([
          { name: 'gibol.co', url: '/' },
          { name: 'Formula 1 2026', url: routeBase },
          { name: team.name, url: `${routeBase}/team/${team.slug}` },
        ]),
      ],
    });
  }

  // Per-driver pages — 22 indexable URLs (v0.2.5).
  for (const driver of DRIVERS_2026) {
    const team = TEAMS_BY_ID[driver.teamId];
    out.push({
      path: `${routeBase}/driver/${driver.slug}`,
      // v0.13.0 trim — was up to 95 chars. Now ≤55 even for longest
      // driver name (Andrea Kimi Antonelli = 21 + 36 = 57).
      title: `${driver.name} F1 2026 — Poin & Podium | gibol.co`,
      description: `${driver.name} (#${driver.number}, ${driver.code}) di ${team ? team.name : 'F1 2026'}. Poin klasemen, jumlah podium, menang, peluang juara pembalap.`,
      keywords: `${driver.name.toLowerCase()}, ${driver.slug}, ${driver.code.toLowerCase()} f1, f1 2026 ${driver.slug}, pembalap ${team ? team.short.toLowerCase() : 'f1'}, klasemen pembalap, podium ${driver.name.toLowerCase()}`,
      // v0.13.0 Ship 4 — per-driver OG card.
      ogImage: `${SITE}/og/f1/driver-${driver.slug}.png`,
      jsonLd: [
        driverSchema(driver, team),
        breadcrumbSchema([
          { name: 'gibol.co', url: '/' },
          { name: 'Formula 1 2026', url: routeBase },
          { name: driver.name, url: `${routeBase}/driver/${driver.slug}` },
        ]),
      ],
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
  icon: 'f1',
  status: 'live', // flipped from 'soon' in v0.2.2
  prerenderRoutes,
  teams,
  drivers,
  calendar,
};

export default adapter;
