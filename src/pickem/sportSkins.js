/**
 * Sport skin config — R1-5 (v0.82.0).
 *
 * The design contract (README §"Skin config" / canvas #5c): all sports
 * use exactly the same 6 primitives, and THIS TABLE is the only thing
 * that changes between them. If a sport needs a new layout, the pattern
 * is wrong — fix the pattern, don't fork the sport.
 *
 * Keep this sport-generic: keys are sports ('bola', 'basket'), never
 * competitions ('AFF2026'). Competitions map to a sport via
 * skinForCompetition() so EPL, AFF, and Liga 1 all share 'bola'.
 *
 * Named mechanics keep their Indonesian names per the voice rule
 * (Tebak Skor, jagoan/★, colek) in both locales.
 */

export const SPORT_SKINS = {
  bola: {
    key: 'bola',
    label: 'Bola',
    emoji: '⚽',
    accent: 'var(--g4-sport-bola)',
    accentHex: '#D92D1C',
    eventUnit: { en: 'Match', id: 'Pertandingan' },
    // Primary pick: 1 / X / 2 — football draws, so three ways.
    primaryPick: '1X2',
    primaryLabels: [
      { value: 'H', short: '1' },
      { value: 'D', short: 'X' },
      { value: 'A', short: '2' },
    ],
    allowDraw: true,
    // Bonus picks: exact score ships now; scorer props are R6-parked.
    bonusPicks: [
      { key: 'exact_score', label: { en: 'Exact score', id: 'Skor akhir' }, shipped: true },
      { key: 'first_scorer', label: { en: 'First scorer', id: 'Pencetak gol' }, shipped: false },
    ],
    lockVerb: { en: 'Kick-off', id: 'Kick-off' },
    rhythm: { en: 'Weekly (EPL) · tournament (AFF)', id: 'Mingguan (EPL) · turnamen (AFF)' },
    // Live tile: minute + score.
    liveTile: 'minute',
  },
  basket: {
    key: 'basket',
    label: 'Basket',
    emoji: '🏀',
    accent: 'var(--g4-sport-basket)',
    accentHex: '#E07B00',
    eventUnit: { en: 'Game', id: 'Game' },
    // No draws in basketball — two ways, shown as team codes.
    primaryPick: 'WL',
    primaryLabels: [
      { value: 'H', short: 'W' },
      { value: 'A', short: 'L' },
    ],
    allowDraw: false,
    bonusPicks: [
      { key: 'point_diff', label: { en: 'Point margin', id: 'Selisih poin' }, shipped: true },
      { key: 'top_scorer', label: { en: 'Top scorer', id: 'Top scorer' }, shipped: false },
    ],
    lockVerb: { en: 'Tip-off', id: 'Tip-off' },
    rhythm: { en: 'Nightly, WIB morning', id: 'Nightly, pagi WIB' },
    liveTile: 'quarter',
  },
  motogp: {
    key: 'motogp',
    label: 'MotoGP',
    emoji: '🏍',
    accent: 'var(--g4-sport-motogp)',
    accentHex: '#1E3FBB',
    eventUnit: { en: 'Race', id: 'Race' },
    // A 20+ rider grid: the pick is a podium order, not a 2-way outcome.
    primaryPick: 'podium',
    primaryLabels: [],
    allowDraw: false,
    bonusPicks: [
      { key: 'pole', label: { en: 'Pole', id: 'Pole' }, shipped: false },
      { key: 'fastest_lap', label: { en: 'Fastest lap', id: 'Fastest lap' }, shipped: false },
      { key: 'dnf', label: { en: 'DNF', id: 'DNF' }, shipped: false },
    ],
    lockVerb: { en: 'Lights out', id: 'Lights out' },
    rhythm: { en: 'Biweekly, Sunday afternoon', id: '2-mingguan, Minggu sore' },
    liveTile: 'lap',
  },
  voli: {
    key: 'voli',
    label: 'Voli',
    emoji: '🏐',
    accent: 'var(--g4-sport-voli)',
    accentHex: '#7A2E8E',
    eventUnit: { en: 'Match', id: 'Pertandingan' },
    primaryPick: 'WL',
    primaryLabels: [
      { value: 'H', short: 'W' },
      { value: 'A', short: 'L' },
    ],
    allowDraw: false,
    bonusPicks: [
      { key: 'set_count', label: { en: 'Set count', id: 'Jumlah set' }, shipped: false },
    ],
    lockVerb: { en: 'First serve', id: 'Servis pertama' },
    rhythm: { en: 'Weekly', id: 'Mingguan' },
    liveTile: 'set',
  },
};

/** Competition key → sport skin key. */
const COMPETITION_SPORT = {
  'AFF2026': 'bola',
  'EPL-2026-27': 'bola',
  'WC2026': 'bola',
  'NBA-Playoffs-2026': 'basket',
};

export const DEFAULT_SKIN = 'bola';

/** Resolve a skin from a sport key; never returns undefined. */
export function skin(sportKey) {
  return SPORT_SKINS[sportKey] || SPORT_SKINS[DEFAULT_SKIN];
}

/**
 * Resolve a skin from a Pick'em competition key. Falls back through the
 * competition's own `sport` field, then to Bola — so a competition added
 * to the registry without a mapping here still renders coherently.
 */
export function skinForCompetition(competitionKey, competition) {
  const direct = COMPETITION_SPORT[competitionKey];
  if (direct) return skin(direct);
  const s = competition?.sport;
  if (s === 'nba' || s === 'basket') return skin('basket');
  if (s === 'motogp') return skin('motogp');
  return skin(DEFAULT_SKIN);
}

/** Pick a localized string out of a { en, id } skin field. */
export function skinText(field, lang) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return lang === 'id' ? (field.id ?? field.en) : (field.en ?? field.id);
}
