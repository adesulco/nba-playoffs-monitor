/**
 * Tennis — 2026 tournament registry (v0.5.0 Phase 1A).
 *
 * Scope per brief 00-brief.md:
 *   - Tier 1: 4 Grand Slams
 *   - Tier 2: Masters 1000 / WTA 1000 combined + single-tour + 2 Year-End Finals
 *
 * Total: 18 tournaments (4 slams + 6 combined 1000s + 3 ATP-only masters +
 * 3 WTA-only 1000s + 2 year-end finals). Each tournament is one indexable
 * URL under /tennis/{slug}-{year}.
 *
 * ESPN tournament IDs are only hard-coded for the four Grand Slams (stable
 * across seasons per 01-data-sources.md). Masters/WTA 1000 tournament IDs
 * change per season and must be resolved at build time by querying ESPN
 * scoreboard with the known start date.
 *
 * Dates and cities verified 2026-04-20 against the provisional ATP/WTA
 * calendars — re-verify before RG 2026 ship (2026-05-24).
 */

export const SEASON_YEAR = 2026;

/**
 * Canonical tournament shape:
 *   id:          stable internal key (kebab-case)
 *   slug:        URL slug — `/tennis/{slug}-{year}`
 *   name:        short English name for UI + JSON-LD
 *   nameId:      short Bahasa name
 *   tier:        'slam' | 'combined1000' | 'masters' | 'wta1000' | 'finals'
 *   tours:       ['atp'] | ['wta'] | ['atp','wta']
 *   surface:     'clay' | 'grass' | 'hard' | 'indoor'
 *   city:        host city + country for SEO + Place schema
 *   country:     ISO-ish country name
 *   startDate:   YYYY-MM-DD ISO (main-draw start)
 *   endDate:     YYYY-MM-DD ISO (men's final day)
 *   espnEventId: '{tournamentId}-{year}' for ESPN scoreboard lookup (null =
 *                resolve at runtime)
 *   accent:      hex tier accent (TENNIS_SLAM_GOLD / _SILV / _RED). Components
 *                may override per surface.
 */
export const TOURNAMENTS_2026 = [
  // ─── Grand Slams (4) ──────────────────────────────────────────────────────
  {
    id: 'australian-open',
    slug: 'australian-open',
    name: 'Australian Open',
    nameId: 'Australian Open',
    tier: 'slam',
    tours: ['atp', 'wta'],
    surface: 'hard',
    city: 'Melbourne, Australia',
    country: 'Australia',
    venue: 'Melbourne Park',
    startDate: '2026-01-19',
    endDate: '2026-02-01',
    espnEventId: '154-2026',
    accent: '#D4A13A',
    organizer: 'Tennis Australia',
    web: 'https://ausopen.com',
  },
  {
    id: 'roland-garros',
    slug: 'roland-garros',
    name: 'Roland Garros',
    nameId: 'Roland Garros',
    tier: 'slam',
    tours: ['atp', 'wta'],
    surface: 'clay',
    city: 'Paris, France',
    country: 'France',
    venue: 'Stade Roland Garros',
    startDate: '2026-05-24',
    endDate: '2026-06-07',
    espnEventId: '172-2026',
    accent: '#D4A13A',
    organizer: 'Fédération Française de Tennis',
    web: 'https://www.rolandgarros.com',
  },
  {
    id: 'wimbledon',
    slug: 'wimbledon',
    name: 'Wimbledon',
    nameId: 'Wimbledon',
    tier: 'slam',
    tours: ['atp', 'wta'],
    surface: 'grass',
    city: 'London, United Kingdom',
    country: 'United Kingdom',
    venue: 'All England Lawn Tennis Club',
    startDate: '2026-06-29',
    endDate: '2026-07-12',
    espnEventId: '188-2026',
    accent: '#D4A13A',
    organizer: 'The All England Lawn Tennis and Croquet Club',
    web: 'https://www.wimbledon.com',
  },
  {
    id: 'us-open',
    slug: 'us-open',
    name: 'US Open',
    nameId: 'US Open',
    tier: 'slam',
    tours: ['atp', 'wta'],
    surface: 'hard',
    city: 'New York, USA',
    country: 'United States',
    venue: 'USTA Billie Jean King National Tennis Center',
    startDate: '2026-08-24',
    endDate: '2026-09-06',
    espnEventId: '189-2026',
    accent: '#D4A13A',
    organizer: 'United States Tennis Association',
    web: 'https://www.usopen.org',
  },

  // ─── Combined 1000s (ATP Masters + WTA 1000 at the same venue) ───────────
  {
    id: 'indian-wells',
    slug: 'indian-wells',
    name: 'Indian Wells Open',
    nameId: 'Indian Wells Open',
    tier: 'combined1000',
    tours: ['atp', 'wta'],
    surface: 'hard',
    city: 'Indian Wells, USA',
    country: 'United States',
    venue: 'Indian Wells Tennis Garden',
    startDate: '2026-03-05',
    endDate: '2026-03-22',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'BNP Paribas Open',
    web: 'https://bnpparibasopen.com',
  },
  {
    id: 'miami-open',
    slug: 'miami-open',
    name: 'Miami Open',
    nameId: 'Miami Open',
    tier: 'combined1000',
    tours: ['atp', 'wta'],
    surface: 'hard',
    city: 'Miami Gardens, USA',
    country: 'United States',
    venue: 'Hard Rock Stadium',
    startDate: '2026-03-18',
    endDate: '2026-04-05',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'Miami Open presented by Itaú',
    web: 'https://www.miamiopen.com',
  },
  {
    id: 'madrid-open',
    slug: 'madrid-open',
    name: 'Madrid Open',
    nameId: 'Madrid Open',
    tier: 'combined1000',
    tours: ['atp', 'wta'],
    surface: 'clay',
    city: 'Madrid, Spain',
    country: 'Spain',
    venue: 'Caja Mágica',
    startDate: '2026-04-20',
    endDate: '2026-05-04',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'Mutua Madrid Open',
    web: 'https://www.mutuamadridopen.com',
  },
  {
    id: 'italian-open',
    slug: 'italian-open',
    name: 'Italian Open',
    nameId: 'Italian Open',
    tier: 'combined1000',
    tours: ['atp', 'wta'],
    surface: 'clay',
    city: 'Rome, Italy',
    country: 'Italy',
    venue: 'Foro Italico',
    startDate: '2026-05-06',
    endDate: '2026-05-18',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'Federazione Italiana Tennis',
    web: 'https://www.internazionalibnlditalia.com',
  },
  {
    id: 'canadian-open',
    slug: 'canadian-open',
    name: 'Canadian Open',
    nameId: 'Canadian Open',
    tier: 'combined1000',
    tours: ['atp', 'wta'],
    surface: 'hard',
    city: 'Toronto / Montreal, Canada',
    country: 'Canada',
    venue: 'Sobeys Stadium / IGA Stadium',
    startDate: '2026-08-03',
    endDate: '2026-08-16',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'Tennis Canada',
    web: 'https://nationalbankopen.com',
  },
  {
    id: 'cincinnati-open',
    slug: 'cincinnati-open',
    name: 'Cincinnati Open',
    nameId: 'Cincinnati Open',
    tier: 'combined1000',
    tours: ['atp', 'wta'],
    surface: 'hard',
    city: 'Mason, USA',
    country: 'United States',
    venue: 'Lindner Family Tennis Center',
    startDate: '2026-08-10',
    endDate: '2026-08-19',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'Cincinnati Open',
    web: 'https://www.cincytennis.com',
  },

  // ─── ATP Masters 1000 — single-tour (ATP only) ───────────────────────────
  {
    id: 'monte-carlo',
    slug: 'monte-carlo',
    name: 'Monte-Carlo Masters',
    nameId: 'Monte-Carlo Masters',
    tier: 'masters',
    tours: ['atp'],
    surface: 'clay',
    city: 'Monte Carlo, Monaco',
    country: 'Monaco',
    venue: 'Monte Carlo Country Club',
    startDate: '2026-04-12',
    endDate: '2026-04-19',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'Monte-Carlo Country Club',
    web: 'https://www.rolexmontecarlomasters.mc',
  },
  {
    id: 'shanghai-masters',
    slug: 'shanghai-masters',
    name: 'Shanghai Masters',
    nameId: 'Shanghai Masters',
    tier: 'masters',
    tours: ['atp'],
    surface: 'hard',
    city: 'Shanghai, China',
    country: 'China',
    venue: 'Qizhong Forest Sports City Arena',
    startDate: '2026-10-04',
    endDate: '2026-10-18',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'Shanghai Juss Sports',
    web: 'https://www.shanghairolexmasters.com',
  },
  {
    id: 'paris-masters',
    slug: 'paris-masters',
    name: 'Paris Masters',
    nameId: 'Paris Masters',
    tier: 'masters',
    tours: ['atp'],
    surface: 'indoor',
    city: 'Paris, France',
    country: 'France',
    venue: 'La Défense Arena',
    startDate: '2026-10-27',
    endDate: '2026-11-01',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'Fédération Française de Tennis',
    web: 'https://www.rolexparismasters.com',
  },

  // ─── WTA 1000 — single-tour (WTA only) ───────────────────────────────────
  {
    id: 'dubai-championships',
    slug: 'dubai-championships',
    name: 'Dubai Tennis Championships',
    nameId: 'Dubai Tennis Championships',
    tier: 'wta1000',
    tours: ['wta'],
    surface: 'hard',
    city: 'Dubai, UAE',
    country: 'United Arab Emirates',
    venue: 'Dubai Duty Free Tennis Stadium',
    startDate: '2026-02-16',
    endDate: '2026-02-22',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'Dubai Duty Free',
    web: 'https://www.dubaidutyfreetennischampionships.com',
  },
  {
    id: 'china-open',
    slug: 'china-open',
    name: 'China Open',
    nameId: 'China Open',
    tier: 'wta1000',
    tours: ['wta'],
    surface: 'hard',
    city: 'Beijing, China',
    country: 'China',
    venue: 'National Tennis Center',
    startDate: '2026-09-24',
    endDate: '2026-10-04',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'China Open',
    web: 'https://www.chinaopen.com.cn',
  },
  {
    id: 'wuhan-open',
    slug: 'wuhan-open',
    name: 'Wuhan Open',
    nameId: 'Wuhan Open',
    tier: 'wta1000',
    tours: ['wta'],
    surface: 'hard',
    city: 'Wuhan, China',
    country: 'China',
    venue: 'Optics Valley International Tennis Center',
    startDate: '2026-10-05',
    endDate: '2026-10-11',
    espnEventId: null,
    accent: '#9DA6AD',
    organizer: 'Wuhan Open',
    web: 'https://www.wuhanopen.org',
  },

  // ─── Year-End Finals (2) ─────────────────────────────────────────────────
  {
    id: 'wta-finals',
    slug: 'wta-finals',
    name: 'WTA Finals',
    nameId: 'WTA Finals',
    tier: 'finals',
    tours: ['wta'],
    surface: 'indoor',
    city: 'Riyadh, Saudi Arabia',
    country: 'Saudi Arabia',
    venue: 'King Saud University Indoor Arena',
    startDate: '2026-11-01',
    endDate: '2026-11-08',
    espnEventId: null,
    accent: '#C83030',
    organizer: 'WTA',
    web: 'https://www.wtafinals.com',
  },
  {
    id: 'atp-finals',
    slug: 'atp-finals',
    name: 'ATP Finals',
    nameId: 'ATP Finals',
    tier: 'finals',
    tours: ['atp'],
    surface: 'indoor',
    city: 'Turin, Italy',
    country: 'Italy',
    venue: 'Inalpi Arena',
    startDate: '2026-11-08',
    endDate: '2026-11-15',
    espnEventId: null,
    accent: '#C83030',
    organizer: 'ATP Tour',
    web: 'https://www.nittoatpfinals.com',
  },
];

export const TOURNAMENTS_BY_ID = Object.fromEntries(
  TOURNAMENTS_2026.map((t) => [t.id, t])
);

export const TOURNAMENTS_BY_SLUG = Object.fromEntries(
  TOURNAMENTS_2026.map((t) => [t.slug, t])
);

/**
 * Group tournaments by tier (slam / combined1000 / masters / wta1000 / finals).
 * Preserves the calendar ordering within each tier.
 */
export const TOURNAMENTS_BY_TIER = TOURNAMENTS_2026.reduce((acc, t) => {
  (acc[t.tier] = acc[t.tier] || []).push(t);
  return acc;
}, {});

/**
 * Return the next upcoming Grand Slam relative to `now` (or the currently
 * running one if we're inside a slam window). Returns `null` once the
 * final slam of the season is complete.
 */
export function nextSlam(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const slams = TOURNAMENTS_2026.filter((t) => t.tier === 'slam').sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  );
  // Running now — prefer this over a future slam.
  const inProgress = slams.find((t) => today >= t.startDate && today <= t.endDate);
  if (inProgress) return inProgress;
  // Else next future.
  return slams.find((t) => t.startDate > today) || null;
}

/**
 * Return the tournament that is CURRENTLY running (any tier) on `date`, or
 * `null`. Only one is returned; if multiple overlap (e.g. Madrid ATP running
 * while a WTA 500 runs elsewhere), the higher-tier wins per TIER_PRIORITY.
 */
const TIER_PRIORITY = ['slam', 'combined1000', 'masters', 'wta1000', 'finals'];
export function tournamentInProgress(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const running = TOURNAMENTS_2026.filter(
    (t) => today >= t.startDate && today <= t.endDate
  );
  if (!running.length) return null;
  running.sort(
    (a, b) => TIER_PRIORITY.indexOf(a.tier) - TIER_PRIORITY.indexOf(b.tier)
  );
  return running[0];
}

/** URL slug-with-year — `/tennis/{slug}-{year}`. */
export function tournamentPath(t, year = SEASON_YEAR) {
  return `/tennis/${t.slug}-${year}`;
}
