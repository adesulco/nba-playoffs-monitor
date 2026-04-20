/**
 * Bahasa ↔ English tennis vocabulary (v0.5.0 Phase 1A).
 *
 * Used by UI strings + by the /tennis/glossary page (Phase 2). Keep it tight.
 * Loan-words in Bahasa ("tiebreak", "set", "bye", "ace") are preserved as-is
 * to match native fan usage — see 03-ui-spec.md Bahasa copy examples. When
 * translating new strings, prefer this table over inline ad-hoc translations.
 */

export const TENNIS_GLOSSARY = [
  { id: 'draw',          en: 'Draw',            bahasa: 'Undian',         note: 'Bracket of the tournament.' },
  { id: 'seed',          en: 'Seed',            bahasa: 'Unggulan',       note: 'Top-ranked player placed to avoid early clash.' },
  { id: 'bye',           en: 'Bye',             bahasa: 'Bye',            note: 'Auto-advance when no opponent is scheduled.' },
  { id: 'walkover',      en: 'Walkover',        bahasa: 'Walkover',       note: 'Opponent withdraws before the match starts.' },
  { id: 'retirement',    en: 'Retired',         bahasa: 'Mundur',         note: 'Player withdraws mid-match.' },
  { id: 'tiebreak',      en: 'Tiebreak',        bahasa: 'Tiebreak',       note: 'Decider at 6-6 in a set.' },
  { id: 'set',           en: 'Set',             bahasa: 'Set',            note: 'First to 6 games with a 2-game lead.' },
  { id: 'break',         en: 'Break of serve', bahasa: 'Break servis',   note: 'Winning a game while returning.' },
  { id: 'ace',           en: 'Ace',             bahasa: 'Ace',            note: 'Serve opponent cannot touch.' },
  { id: 'double-fault',  en: 'Double fault',    bahasa: 'Double fault',   note: 'Two consecutive service faults.' },
  { id: 'deuce',         en: 'Deuce',           bahasa: 'Deuce',          note: 'Tied at 40-40.' },
  { id: 'advantage',     en: 'Advantage',       bahasa: 'Advantage',      note: 'Point won at deuce.' },
  { id: 'let',           en: 'Let',             bahasa: 'Let',            note: 'Replay of the point — usually on a net cord serve.' },
  { id: 'rally',         en: 'Rally',           bahasa: 'Reli',           note: 'Exchange of shots within a point.' },
  { id: 'grand-slam',    en: 'Grand Slam',      bahasa: 'Grand Slam',     note: 'AO, RG, Wim, USO.' },
  { id: 'masters',       en: 'Masters 1000',    bahasa: 'Masters 1000',   note: 'Tier below the Slams; mandatory for top-30 ATP.' },
  { id: 'wta-1000',      en: 'WTA 1000',        bahasa: 'WTA 1000',       note: "Women's equivalent of Masters 1000." },
  { id: 'singles',       en: 'Singles',         bahasa: 'Tunggal',        note: 'One vs one.' },
  { id: 'doubles',       en: 'Doubles',         bahasa: 'Ganda',          note: 'Two vs two.' },
  { id: 'mixed',         en: 'Mixed doubles',   bahasa: 'Ganda campuran', note: 'One man + one woman per team.' },
  { id: 'qualifier',     en: 'Qualifier',       bahasa: 'Kualifikasi',    note: 'Player who won pre-tournament qualifying rounds.' },
  { id: 'lucky-loser',   en: 'Lucky loser',     bahasa: 'Lucky loser',    note: 'Qualifier who lost but enters main draw as replacement.' },
  { id: 'wildcard',      en: 'Wildcard',        bahasa: 'Wildcard',       note: 'Direct entry granted by tournament organizer.' },
  { id: 'atp',           en: 'ATP',             bahasa: 'ATP',            note: 'Association of Tennis Professionals — male tour.' },
  { id: 'wta',           en: 'WTA',             bahasa: 'WTA',            note: "Women's Tennis Association — female tour." },
  { id: 'court',         en: 'Court',           bahasa: 'Lapangan',       note: 'Playing surface.' },
  { id: 'clay',          en: 'Clay',            bahasa: 'Tanah liat',     note: 'Slower surface; ball bounces higher.' },
  { id: 'grass',         en: 'Grass',           bahasa: 'Rumput',         note: 'Fastest surface; lowest bounce.' },
  { id: 'hard',          en: 'Hard court',      bahasa: 'Lapangan keras', note: 'Medium pace; acrylic-over-concrete.' },
  { id: 'indoor',        en: 'Indoor (hard)',   bahasa: 'Indoor',         note: 'Indoor hard court; controlled conditions.' },
  { id: 'round-of-32',   en: 'Round of 32',     bahasa: 'Babak 32 besar', note: 'R32 — last 32 players in the draw.' },
  { id: 'round-of-16',   en: 'Round of 16',     bahasa: 'Babak 16 besar', note: 'R16 — last 16 players.' },
  { id: 'quarterfinal',  en: 'Quarterfinal',    bahasa: 'Perempat final', note: 'Last 8.' },
  { id: 'semifinal',     en: 'Semifinal',       bahasa: 'Semifinal',      note: 'Last 4.' },
  { id: 'final',         en: 'Final',           bahasa: 'Final',          note: 'Last 2.' },
  { id: 'champion',      en: 'Champion',        bahasa: 'Juara',          note: 'Tournament winner.' },
  { id: 'runner-up',     en: 'Runner-up',       bahasa: 'Runner-up',      note: 'Losing finalist.' },
  { id: 'ranking',       en: 'Ranking',         bahasa: 'Peringkat',      note: 'Points-based ATP / WTA standing, refreshed Mondays.' },
  { id: 'points',        en: 'Points',          bahasa: 'Poin',           note: 'Ranking currency; more = higher rank.' },
  { id: 'career-high',   en: 'Career high',     bahasa: 'Peringkat tertinggi karier', note: 'Best rank ever reached.' },
];

export const TENNIS_GLOSSARY_BY_ID = Object.fromEntries(
  TENNIS_GLOSSARY.map((g) => [g.id, g])
);

/**
 * Quick Bahasa label lookup used inline in components. Falls back to the
 * English term if no translation is registered.
 */
export function bahasaTerm(id) {
  return TENNIS_GLOSSARY_BY_ID[id]?.bahasa ?? id;
}

export const SURFACE_LABEL = {
  clay:   { id: 'Tanah liat',     en: 'Clay' },
  grass:  { id: 'Rumput',         en: 'Grass' },
  hard:   { id: 'Lapangan keras', en: 'Hard' },
  indoor: { id: 'Indoor',         en: 'Indoor' },
};

export const TIER_LABEL = {
  slam:         { id: 'Grand Slam',              en: 'Grand Slam' },
  masters:      { id: 'Masters 1000',            en: 'Masters 1000' },
  wta1000:      { id: 'WTA 1000',                en: 'WTA 1000' },
  combined1000: { id: 'Masters 1000 / WTA 1000', en: 'Masters 1000 / WTA 1000' },
  finals:       { id: 'Year-End Finals',         en: 'Year-End Finals' },
};

/** Ordered list of tier IDs for grouping tournaments on the hub. */
export const TIER_ORDER = ['slam', 'combined1000', 'masters', 'wta1000', 'finals'];
