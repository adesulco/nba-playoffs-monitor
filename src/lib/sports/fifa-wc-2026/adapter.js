/**
 * FIFA World Cup 2026 adapter — Phase 3 target (v0.2.3). Hard ship deadline
 * 2026-06-07 (4 days before first match). For v0.2.0 this emits the existing
 * /fifa-world-cup-2026 coming-soon route with its SEO meta.
 */

import { breadcrumbSchema } from '../_schema.js';

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const HUB_OG = `${SITE}/og/hub-fifa-wc.png`;
const routeBase = '/fifa-world-cup-2026';

function prerenderRoutes() {
  return [
    {
      path: routeBase,
      // v0.13.0 trim — was 81 chars / 213 chars.
      title: 'Piala Dunia FIFA 2026 — 48 Tim, 104 Laga | gibol.co',
      description: 'Piala Dunia FIFA 2026 — 48 tim, 104 laga di AS, Meksiko, Kanada. Skor live, grup, bagan gugur, prediksi. Kickoff 11 Juni 2026.',
      keywords: 'piala dunia 2026, FIFA world cup 2026, skor piala dunia, jadwal piala dunia 2026, tim piala dunia 2026',
      ogImage: HUB_OG,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: '2026 FIFA World Cup',
          description: 'The 23rd FIFA World Cup — the first with 48 teams and the first co-hosted by three nations (USA, Mexico, Canada). 104 matches across 16 host cities, opening match June 11, final July 19 at MetLife Stadium.',
          startDate: '2026-06-11',
          endDate: '2026-07-19',
          eventStatus: 'https://schema.org/EventScheduled',
          sport: 'Soccer',
          location: [
            { '@type': 'Country', name: 'United States' },
            { '@type': 'Country', name: 'Mexico' },
            { '@type': 'Country', name: 'Canada' },
          ],
          organizer: { '@type': 'SportsOrganization', name: 'FIFA', url: 'https://www.fifa.com' },
          url: `${SITE}${routeBase}`,
        },
        breadcrumbSchema([
          { name: 'gibol.co', url: '/' },
          { name: 'Piala Dunia 2026', url: routeBase },
        ]),
      ],
    },
  ];
}

export const adapter = {
  id: 'fifa_wc',
  name: 'FIFA World Cup 2026',
  nameId: 'Piala Dunia FIFA 2026',
  routeBase,
  accent: '#326295',
  icon: 'wc',
  status: 'soon',
  prerenderRoutes,
};

export default adapter;
