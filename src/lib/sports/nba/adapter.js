/**
 * NBA adapter — v0.2.0 wraps the existing NBA stack in the adapter interface
 * without moving any code. Phase 1 proved the interface works; migrating the
 * rest of usePlayoffData / usePolymarketWS / api.js into this module is
 * deferred to a later v0.2.x patch so the live playoff window is not at risk.
 *
 * For now this adapter supplies:
 *   - Route + SEO metadata (so the generic prerender can replace the
 *     hardcoded NBA entries in scripts/prerender.mjs)
 *   - The sport's identity (id, accent, icon, status)
 *   - JSON-LD schemas: SportsEvent (hub), SportsTeam (per-team),
 *     BreadcrumbList everywhere (v0.13.0 SEO sprint).
 *
 * The actual data hooks (useLivePlayoffs, usePolymarketWS, etc.) continue to
 * live under src/hooks/ and be imported directly by NBADashboard.jsx. That
 * indirection-free path is fine while NBA is the only live sport.
 */

import { teamSlug, TEAM_META } from '../../constants.js';
import { breadcrumbSchema } from '../_schema.js';

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const HUB_OG = `${SITE}/og/hub-nba.png`;
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

// v0.13.0 — championship-level SportsEvent for the NBA hub. Mirrors
// the F1 / EPL / Tennis adapters which were already emitting this; NBA
// was the outlier with zero schema before this sprint.
const PLAYOFFS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: 'NBA Playoffs 2026',
  description: 'The 2026 NBA Playoffs — best-of-7 bracket from the play-in finale (April 17) through the NBA Finals tip-off (June 3 on ABC). 16 teams, 4 rounds, live odds + bracket + play-by-play tracked in Bahasa Indonesia.',
  startDate: '2026-04-17',
  endDate: '2026-06-20',
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Basketball',
  location: { '@type': 'Country', name: 'United States' },
  organizer: {
    '@type': 'SportsOrganization',
    name: 'National Basketball Association',
    url: 'https://www.nba.com',
  },
  url: `${SITE}${routeBase}`,
};

// Per-team SportsTeam schema — emitted on /nba-playoff-2026/:teamSlug.
// Mirrors the EPL clubSchema() pattern.
function teamSchema(t) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: t.name,
    alternateName: t.abbr,
    sport: 'Basketball',
    url: `${SITE}${routeBase}/${t.slug}`,
    memberOf: {
      '@type': 'SportsOrganization',
      name: 'National Basketball Association',
      url: 'https://www.nba.com',
    },
    athlete: t.star
      ? {
          '@type': 'Person',
          name: t.star,
          jobTitle: 'NBA Player',
        }
      : undefined,
  };
}

function prerenderRoutes() {
  const out = [
    {
      path: routeBase,
      // v0.13.0 trim — was 77 chars title / 224 chars description.
      // Now 56 / 156. Lead with the keyword users actually type
      // ("skor NBA playoff 2026"), keep brand suffix.
      title: 'Skor NBA Playoff 2026 — Bracket, Peluang Juara | gibol.co',
      description: 'Skor NBA Playoff 2026 live: bracket Ronde 1, peluang juara Polymarket, win probability, play-by-play, shot chart, statistik pemain, watchlist.',
      keywords: 'skor nba, skor basket, skor playoff nba, skor nba live, skor nba hari ini, peluang juara nba 2026, bracket nba playoff 2026, jadwal nba playoff, nba playoff 2026 indonesia, live nba indonesia',
      ogImage: HUB_OG,
      jsonLd: [
        PLAYOFFS_JSONLD,
        breadcrumbSchema([
          { name: 'gibol.co', url: '/' },
          { name: 'NBA Playoffs 2026', url: routeBase },
        ]),
      ],
    },
    {
      path: '/recap',
      // v0.13.0 trim — was 69 chars / 192 chars.
      title: 'Catatan Playoff NBA — Recap Harian | gibol.co',
      description: 'Hasil NBA Playoff harian dalam Bahasa: skor akhir, top scorer, momen terbesar, analisis per laga. Update tiap pagi, shareable ke WhatsApp.',
      keywords: 'hasil nba hari ini, hasil nba kemarin, recap nba playoff, catatan playoff, skor akhir nba playoff',
      ogImage: DEFAULT_OG,
      jsonLd: [
        // v0.13.0 — Article schema unlocks Google's news-carousel +
        // "Top stories" placement. The recap is genuinely editorial
        // (Bahasa lede + per-game analysis), so it qualifies. Author
        // is the brand (Organization) since recap copy is composed
        // by the gibol.co editorial team rather than a single byline.
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Catatan Playoff NBA — Recap Harian Hasil + Momen Terbesar',
          description: 'Hasil lengkap NBA Playoff harian dalam Bahasa Indonesia. Skor akhir, top scorer, momen terbesar, dan analisis per laga.',
          image: `${SITE}/og-image.png`,
          author: { '@type': 'Organization', name: 'gibol.co', url: SITE },
          publisher: {
            '@type': 'Organization',
            name: 'gibol.co',
            logo: { '@type': 'ImageObject', url: `${SITE}/gibol-logo-1024.png` },
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/recap` },
          inLanguage: 'id-ID',
          isPartOf: {
            '@type': 'CreativeWorkSeries',
            name: 'NBA Playoffs 2026 Daily Recap',
            url: `${SITE}/recap`,
          },
        },
        breadcrumbSchema([
          { name: 'gibol.co', url: '/' },
          { name: 'NBA Playoffs 2026', url: routeBase },
          { name: 'Catatan Playoff', url: '/recap' },
        ]),
      ],
    },
  ];

  for (const t of teams()) {
    out.push({
      path: `${routeBase}/${t.slug}`,
      // v0.13.0 trim — was "Skor {nickname} NBA Playoff 2026 · Jadwal
      // & Statistik | gibol.co" (≤62 chars). Now ≤55 chars even for
      // the longest nickname (Trail Blazers → "Blazers"). Description
      // stays under 160.
      title: `Skor ${t.nickname} NBA Playoff 2026 | gibol.co`,
      description: `Skor live ${t.name} (${t.abbr}) NBA Playoff 2026: jadwal, statistik pemain, peluang juara. Star: ${t.star}.`,
      keywords: `skor ${t.nickname.toLowerCase()}, skor ${t.abbr.toLowerCase()}, ${t.nickname.toLowerCase()} playoff, jadwal ${t.nickname.toLowerCase()}, peluang juara ${t.nickname.toLowerCase()}, ${t.name.toLowerCase()}, nba playoff 2026`,
      // v0.13.0 Ship 4 — per-team OG card (generated by
      // scripts/generate-entity-og.mjs).
      ogImage: `${SITE}/og/nba/${t.slug}.png`,
      jsonLd: [
        teamSchema(t),
        breadcrumbSchema([
          { name: 'gibol.co', url: '/' },
          { name: 'NBA Playoffs 2026', url: routeBase },
          { name: t.name, url: `${routeBase}/${t.slug}` },
        ]),
      ],
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
  icon: 'nba',
  status: 'live',
  prerenderRoutes,
};

export default adapter;
