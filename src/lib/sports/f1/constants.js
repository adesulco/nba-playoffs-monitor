/**
 * Formula 1 2026 — season constants.
 *
 * Why hardcoded: the 2026 calendar, driver line-up, and constructor list are
 * locked by the FIA and publicly announced. We hardcode here so the prerender
 * and UI have deterministic fallback values when Jolpica/OpenF1 are slow or
 * down. Live hooks (useF1Schedule, useF1Standings) will override at runtime.
 *
 * Single source of truth shape:
 *   - TEAMS_2026 → constructor metadata (id, name, accent color)
 *   - DRIVERS_2026 → driver metadata (code, name, number, teamId, slug)
 *   - CALENDAR_2026 → 24 Grand Prix (round, slug, name, circuit, country,
 *                     dateISO of Sunday race, wibTimeHHMM, sprint boolean)
 *
 * Facts only — no logos (trademark concerns per docs/10 §3.2). Team accent
 * colors are publicly known brand palette and used non-confusingly for visual
 * identity, which is standard editorial practice.
 */

export const SEASON = '2026';

// ─── Constructors (11 — Audi and Cadillac join in 2026) ─────────────────────
export const TEAMS_2026 = [
  { id: 'red_bull',      name: 'Red Bull Racing',       short: 'Red Bull',     accent: '#3671C6' },
  { id: 'mclaren',       name: 'McLaren',               short: 'McLaren',      accent: '#FF8000' },
  { id: 'ferrari',       name: 'Scuderia Ferrari',      short: 'Ferrari',      accent: '#E8002D' },
  { id: 'mercedes',      name: 'Mercedes-AMG Petronas', short: 'Mercedes',     accent: '#27F4D2' },
  { id: 'aston_martin',  name: 'Aston Martin Aramco',   short: 'Aston Martin', accent: '#229971' },
  { id: 'alpine',        name: 'BWT Alpine F1 Team',    short: 'Alpine',       accent: '#FF87BC' },
  { id: 'williams',      name: 'Williams Racing',       short: 'Williams',     accent: '#64C4FF' },
  { id: 'rb',            name: 'Racing Bulls',          short: 'Racing Bulls', accent: '#6692FF' },
  { id: 'sauber_audi',   name: 'Audi F1 Team',          short: 'Audi',         accent: '#00A19B' },
  { id: 'haas',          name: 'MoneyGram Haas',        short: 'Haas',         accent: '#B6BABD' },
  { id: 'cadillac',      name: 'Cadillac F1 Team',      short: 'Cadillac',     accent: '#C6AF7F' },
];

export const TEAMS_BY_ID = Object.fromEntries(TEAMS_2026.map((t) => [t.id, t]));

// ─── Drivers (22 — indicative 2026 line-up; will be overridden by Jolpica) ─
// Note: 2026 silly season finalized by end of 2025. We list known signings;
// the UI uses Jolpica's live driverStandings response for the canonical list.
export const DRIVERS_2026 = [
  { code: 'VER', name: 'Max Verstappen',     number: 1,  teamId: 'red_bull',     slug: 'verstappen' },
  { code: 'TSU', name: 'Yuki Tsunoda',       number: 22, teamId: 'red_bull',     slug: 'tsunoda' },
  { code: 'NOR', name: 'Lando Norris',       number: 4,  teamId: 'mclaren',      slug: 'norris' },
  { code: 'PIA', name: 'Oscar Piastri',      number: 81, teamId: 'mclaren',      slug: 'piastri' },
  { code: 'LEC', name: 'Charles Leclerc',    number: 16, teamId: 'ferrari',      slug: 'leclerc' },
  { code: 'HAM', name: 'Lewis Hamilton',     number: 44, teamId: 'ferrari',      slug: 'hamilton' },
  { code: 'RUS', name: 'George Russell',     number: 63, teamId: 'mercedes',     slug: 'russell' },
  { code: 'ANT', name: 'Andrea Kimi Antonelli', number: 12, teamId: 'mercedes',  slug: 'antonelli' },
  { code: 'ALO', name: 'Fernando Alonso',    number: 14, teamId: 'aston_martin', slug: 'alonso' },
  { code: 'STR', name: 'Lance Stroll',       number: 18, teamId: 'aston_martin', slug: 'stroll' },
  { code: 'GAS', name: 'Pierre Gasly',       number: 10, teamId: 'alpine',       slug: 'gasly' },
  { code: 'COL', name: 'Franco Colapinto',   number: 43, teamId: 'alpine',       slug: 'colapinto' },
  { code: 'ALB', name: 'Alexander Albon',    number: 23, teamId: 'williams',     slug: 'albon' },
  { code: 'SAI', name: 'Carlos Sainz',       number: 55, teamId: 'williams',     slug: 'sainz' },
  { code: 'HAD', name: 'Isack Hadjar',       number: 6,  teamId: 'rb',           slug: 'hadjar' },
  { code: 'LAW', name: 'Liam Lawson',        number: 30, teamId: 'rb',           slug: 'lawson' },
  { code: 'HUL', name: 'Nico Hülkenberg',    number: 27, teamId: 'sauber_audi',  slug: 'hulkenberg' },
  { code: 'BOR', name: 'Gabriel Bortoleto',  number: 5,  teamId: 'sauber_audi',  slug: 'bortoleto' },
  { code: 'OCO', name: 'Esteban Ocon',       number: 31, teamId: 'haas',         slug: 'ocon' },
  { code: 'BEA', name: 'Oliver Bearman',     number: 87, teamId: 'haas',         slug: 'bearman' },
  { code: 'PER', name: 'Sergio Pérez',       number: 11, teamId: 'cadillac',     slug: 'perez' },
  { code: 'BOT', name: 'Valtteri Bottas',    number: 77, teamId: 'cadillac',     slug: 'bottas' },
];

export const DRIVERS_BY_CODE = Object.fromEntries(DRIVERS_2026.map((d) => [d.code, d]));

// ─── Calendar (24 rounds, dates in WIB for the SUNDAY main race) ────────────
// Source: FIA provisional calendar announced Sep 2024. Sprint weekends: six.
// wibTime is the race-start local time in WIB (UTC+7) as a string "HH:MM".
// We pre-compute WIB so UI doesn't need a timezone library; for non-race
// sessions (FP, qualifying, sprint) we'll derive relative to this in v0.2.3.
export const CALENDAR_2026 = [
  { round: 1,  slug: 'australian-gp',  name: 'Australian GP',        circuit: 'Albert Park',                  country: 'Australia',     countryId: 'Australia',     dateISO: '2026-03-08', wibTime: '12:00', sprint: false },
  { round: 2,  slug: 'chinese-gp',     name: 'Chinese GP',           circuit: 'Shanghai International',       country: 'China',         countryId: 'Tiongkok',      dateISO: '2026-03-22', wibTime: '14:00', sprint: true  },
  { round: 3,  slug: 'japanese-gp',    name: 'Japanese GP',          circuit: 'Suzuka',                       country: 'Japan',         countryId: 'Jepang',        dateISO: '2026-04-05', wibTime: '12:00', sprint: false },
  { round: 4,  slug: 'bahrain-gp',     name: 'Bahrain GP',           circuit: 'Bahrain International',        country: 'Bahrain',       countryId: 'Bahrain',       dateISO: '2026-04-12', wibTime: '22:00', sprint: false },
  { round: 5,  slug: 'saudi-arabian-gp', name: 'Saudi Arabian GP',   circuit: 'Jeddah Corniche',              country: 'Saudi Arabia',  countryId: 'Arab Saudi',    dateISO: '2026-04-19', wibTime: '00:00', sprint: false },
  { round: 6,  slug: 'miami-gp',       name: 'Miami GP',             circuit: 'Miami International Autodrome',country: 'USA',           countryId: 'Amerika Serikat',dateISO:'2026-05-03', wibTime: '03:00', sprint: true  },
  { round: 7,  slug: 'canadian-gp',    name: 'Canadian GP',          circuit: 'Circuit Gilles Villeneuve',    country: 'Canada',        countryId: 'Kanada',        dateISO: '2026-05-24', wibTime: '01:00', sprint: false },
  { round: 8,  slug: 'monaco-gp',      name: 'Monaco GP',            circuit: 'Circuit de Monaco',            country: 'Monaco',        countryId: 'Monaco',        dateISO: '2026-06-07', wibTime: '20:00', sprint: false },
  { round: 9,  slug: 'spanish-gp',     name: 'Spanish GP',           circuit: 'Circuit de Barcelona-Catalunya',country:'Spain',         countryId: 'Spanyol',       dateISO: '2026-06-14', wibTime: '20:00', sprint: false },
  { round: 10, slug: 'austrian-gp',    name: 'Austrian GP',          circuit: 'Red Bull Ring',                country: 'Austria',       countryId: 'Austria',       dateISO: '2026-06-28', wibTime: '20:00', sprint: false },
  { round: 11, slug: 'british-gp',     name: 'British GP',           circuit: 'Silverstone',                  country: 'United Kingdom',countryId: 'Inggris',       dateISO: '2026-07-05', wibTime: '21:00', sprint: false },
  { round: 12, slug: 'hungarian-gp',   name: 'Hungarian GP',         circuit: 'Hungaroring',                  country: 'Hungary',       countryId: 'Hungaria',      dateISO: '2026-07-19', wibTime: '20:00', sprint: false },
  { round: 13, slug: 'belgian-gp',     name: 'Belgian GP',           circuit: 'Spa-Francorchamps',            country: 'Belgium',       countryId: 'Belgia',        dateISO: '2026-07-26', wibTime: '20:00', sprint: true  },
  { round: 14, slug: 'dutch-gp',       name: 'Dutch GP',             circuit: 'Zandvoort',                    country: 'Netherlands',   countryId: 'Belanda',       dateISO: '2026-08-23', wibTime: '20:00', sprint: false },
  { round: 15, slug: 'italian-gp',     name: 'Italian GP',           circuit: 'Monza',                        country: 'Italy',         countryId: 'Italia',        dateISO: '2026-09-06', wibTime: '20:00', sprint: false },
  { round: 16, slug: 'azerbaijan-gp',  name: 'Azerbaijan GP',        circuit: 'Baku City Circuit',            country: 'Azerbaijan',    countryId: 'Azerbaijan',    dateISO: '2026-09-27', wibTime: '18:00', sprint: false },
  { round: 17, slug: 'singapore-gp',   name: 'Singapore GP',         circuit: 'Marina Bay',                   country: 'Singapore',     countryId: 'Singapura',     dateISO: '2026-10-11', wibTime: '19:00', sprint: false },
  { round: 18, slug: 'united-states-gp', name: 'United States GP',   circuit: 'Circuit of the Americas',      country: 'USA',           countryId: 'Amerika Serikat',dateISO:'2026-10-25', wibTime: '01:00', sprint: true  },
  { round: 19, slug: 'mexico-city-gp', name: 'Mexico City GP',       circuit: 'Autódromo Hermanos Rodríguez', country: 'Mexico',        countryId: 'Meksiko',       dateISO: '2026-11-01', wibTime: '02:00', sprint: false },
  { round: 20, slug: 'sao-paulo-gp',   name: 'São Paulo GP',         circuit: 'Interlagos',                   country: 'Brazil',        countryId: 'Brasil',        dateISO: '2026-11-08', wibTime: '00:00', sprint: true  },
  { round: 21, slug: 'las-vegas-gp',   name: 'Las Vegas GP',         circuit: 'Las Vegas Strip Circuit',      country: 'USA',           countryId: 'Amerika Serikat',dateISO:'2026-11-21', wibTime: '11:00', sprint: false },
  { round: 22, slug: 'qatar-gp',       name: 'Qatar GP',             circuit: 'Lusail International',         country: 'Qatar',         countryId: 'Qatar',         dateISO: '2026-11-29', wibTime: '23:00', sprint: true  },
  { round: 23, slug: 'abu-dhabi-gp',   name: 'Abu Dhabi GP',         circuit: 'Yas Marina',                   country: 'UAE',           countryId: 'Uni Emirat Arab',dateISO:'2026-12-06', wibTime: '20:00', sprint: false },
  // Round 24 TBD — FIA left one slot open during the 2024 announcement.
  // If the 24-round total is confirmed before ship, add here.
];

export const CALENDAR_BY_SLUG = Object.fromEntries(CALENDAR_2026.map((gp) => [gp.slug, gp]));
export const CALENDAR_BY_ROUND = Object.fromEntries(CALENDAR_2026.map((gp) => [String(gp.round), gp]));

/** Returns the next upcoming GP relative to `now` (date-only compare), or the
 *  last GP of the season if the season is over. */
export function nextGP(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const upcoming = CALENDAR_2026.find((gp) => gp.dateISO >= today);
  return upcoming || CALENDAR_2026[CALENDAR_2026.length - 1];
}

/** Human-friendly month abbreviation in Bahasa / English for date chips. */
export const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
export const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Format ISO date "2026-03-08" → "8 Mar 2026" (id) or "Mar 8, 2026" (en). */
export function formatGPDate(iso, lang = 'id') {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dd = String(d);
  if (lang === 'id') return `${dd} ${MONTHS_ID[m - 1]} ${y}`;
  return `${MONTHS_EN[m - 1]} ${dd}, ${y}`;
}
