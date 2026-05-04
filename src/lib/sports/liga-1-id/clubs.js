/**
 * Super League Indonesia 2025-26 — 18 clubs source of truth.
 *
 * Phase 1A (v0.13.0). Structure mirrors src/lib/sports/epl/clubs.js so the
 * hooks + components only need to swap the import + the league code.
 *
 * Each club entry:
 *   slug     — URL + SEO slug used by /super-league-2025-26/club/:slug.
 *              Short, lowercase, nickname-first when the nickname is the
 *              searched term ("persib" > "persib-bandung"). Stable across
 *              seasons — promoted/relegated clubs are added/removed.
 *   espnId   — ESPN soccer/idn.1 team id. Verified via ESPN's
 *              /teams endpoint (2026-04-26). Used to resolve live
 *              standings + fixtures via /api/proxy/espn/.../teams/{id}.
 *   name     — canonical name (what ESPN returns).
 *   nameId   — Bahasa alt for body copy ("Macan Kemayoran", "Bajul Ijo").
 *              Falls back to `name` in the UI when there's no idiomatic
 *              Bahasa nickname.
 *   city     — host city for geo chips + SEO.
 *   founded  — year the club was founded.
 *   stadium  — primary home ground.
 *   accent   — primary brand hex. Used for borderLeft accents, hero tints
 *              (<=14%), and row highlights on the dashboard.
 *   handle   — official X/Twitter handle WITHOUT the `@`. Verified
 *              against public profiles 2026-04-26. Used by Key Accounts
 *              panels on per-club pages.
 *   bio      — one short Bahasa paragraph for the club page "Tentang"
 *              block. Casual register — gue/lo OK, stays factual.
 *
 * 2025-26 promoted trio (from Liga 2): PSIM Yogyakarta, Persijap Jepara,
 * Bhayangkara Surabaya (renamed from Bhayangkara FC).
 * Relegated 2024-25: PSS Sleman, Barito Putera, Persita Tangerang*
 * (* readmitted via expansion to 18 — confirm with PSSI).
 *
 * League rebrand: starting 2025-26 the competition is officially marketed
 * as "Super League" (Indonesian Super League per ESPN's `idn.1`). Older
 * "Liga 1" + "BRI Liga 1" branding remains in fan vocabulary, so keep
 * keyword strings aware of both.
 */

export const SEASON = '2025-26';
export const SEASON_START = '2025-08-08';
export const SEASON_END = '2026-05-31';
export const LEAGUE_NAME = 'Super League';
export const LEAGUE_NAME_FULL = 'Indonesian Super League';
export const LEAGUE_NAME_ID = 'Super League Indonesia';

export const CLUBS = [
  {
    slug: 'persija',
    espnId: '8030',
    name: 'Persija',
    nameId: 'Persija Jakarta',
    city: 'Jakarta',
    founded: 1928,
    stadium: 'Jakarta International Stadium',
    accent: '#E2231A',
    handle: 'Persija_Jkt',
    bio: 'Persija Jakarta — "Macan Kemayoran", klub ibu kota dengan fanbase Jakmania paling vokal di Indonesia. Juara Liga 1 2018, mainnya sekarang di JIS 82 ribu kapasitas. Rivalitas El Clasico Indonesia lawan Persib salah satu derby terpanas di Asia Tenggara.',
  },
  {
    slug: 'persib',
    espnId: '8293',
    name: 'Persib',
    nameId: 'Persib Bandung',
    city: 'Bandung',
    founded: 1933,
    stadium: 'Stadion Gelora Bandung Lautan Api',
    accent: '#005BAC',
    handle: 'persib',
    bio: 'Persib Bandung — "Maung Bandung", klub paling bersejarah di Indonesia. Juara Liga 1 dua musim beruntun (2023-24, 2024-25). Bobotoh + Viking jadi salah satu basis suporter terbesar se-Asia. GBLA jadi benteng dengan rekor home form yang serem.',
  },
  {
    slug: 'persebaya',
    espnId: '8016',
    name: 'Persebaya Surabaya',
    nameId: 'Persebaya',
    city: 'Surabaya',
    founded: 1927,
    stadium: 'Stadion Gelora Bung Tomo',
    accent: '#0E5C2F',
    handle: 'officialpersebaya',
    bio: 'Persebaya Surabaya — "Bajul Ijo", klub asal Jawa Timur dengan Bonek sebagai fanbase paling fanatik di Indonesia. Juara Liga 1 1996-97, 2004. Hijau-hijau Bung Tomo malam minggu salah satu atmosfer terbaik di liga.',
  },
  {
    slug: 'arema',
    espnId: '7137',
    name: 'Arema FC',
    nameId: 'Arema Malang',
    city: 'Malang',
    founded: 1987,
    stadium: 'Stadion Kanjuruhan',
    accent: '#1E3A8A',
    handle: 'Aremafcofficial',
    bio: 'Arema FC — "Singo Edan", klub Malang dengan fanbase Aremania yang setia. Juara Liga 1 2009-10. Pasca-tragedi Kanjuruhan 2022, klub terus rebuild — comeback ke Kanjuruhan diiringi haru + harapan baru.',
  },
  {
    slug: 'bali-united',
    espnId: '17733',
    name: 'Bali United',
    nameId: 'Bali United',
    city: 'Gianyar',
    founded: 2014,
    stadium: 'Stadion Kapten I Wayan Dipta',
    accent: '#E11D2C',
    handle: 'BaliUtd',
    bio: 'Bali United — "Serdadu Tridatu", klub paling profesional di Indonesia. Juara Liga 1 2019, 2021-22. Pertama listing di BEI (BOLA). Kombinasi manajemen modern + atmosfer Pulau Dewata bikin Bali jadi destinasi tandang favorit.',
  },
  {
    slug: 'borneo',
    espnId: '17732',
    name: 'Borneo FC',
    nameId: 'Borneo Samarinda',
    city: 'Samarinda',
    founded: 2014,
    stadium: 'Stadion Batakan',
    accent: '#F59E0B',
    handle: 'BorneoFCID',
    bio: 'Borneo FC — "Pesut Etam", klub Kalimantan Timur yang konsisten finis papan atas tiga musim terakhir. Investasi serius bikin squad Borneo jadi salah satu yang paling lengkap di liga. Stadion Batakan 40 ribu.',
  },
  {
    slug: 'dewa-united',
    espnId: '21591',
    name: 'Dewa United',
    nameId: 'Dewa United',
    city: 'Tangerang',
    founded: 2018,
    stadium: 'Indomilk Arena',
    accent: '#EAB308',
    handle: 'dewaunitedfc',
    bio: 'Dewa United — klub baru milik Lippo Group, naik ke Liga 1 2022. Investasi besar di akademi + infrastruktur. Indomilk Arena di Tangerang jadi salah satu venue terbaik dari segi kualitas lapangan.',
  },
  {
    slug: 'madura-united',
    espnId: '18732',
    name: 'Madura United',
    nameId: 'Madura United',
    city: 'Pamekasan',
    founded: 2016,
    stadium: 'Stadion Gelora Bangkalan',
    accent: '#DC2626',
    handle: 'MaduraUnitedFC',
    bio: 'Madura United — "Laskar Sape Kerrab", representasi Pulau Madura di kasta tertinggi. Runner-up Liga 1 2019. Karakter main keras + atmosfer derby Jawa Timur lawan Persebaya selalu jadi tontonan wajib.',
  },
  {
    slug: 'malut-united',
    espnId: '22339',
    name: 'Malut United',
    nameId: 'Malut United',
    city: 'Ternate',
    founded: 2020,
    stadium: 'Stadion Gelora Kie Raha',
    accent: '#F97316',
    handle: 'MalutUnitedFC',
    bio: 'Malut United — klub Maluku Utara yang naik ke Liga 1 2024-25. Promosi dari Liga 2 jadi cerita underdog 2025-26. Ternate sebagai kota tuan rumah bikin penerbangan tandang paling jauh di liga.',
  },
  {
    slug: 'psbs-biak',
    espnId: '22338',
    name: 'PSBS Biak',
    nameId: 'PSBS Biak',
    city: 'Biak',
    founded: 1976,
    stadium: 'Stadion Cenderawasih',
    accent: '#16A34A',
    handle: 'PSBSBiakOfficial',
    bio: 'PSBS Biak — klub asal Papua, satu-satunya wakil tanah Papua di Liga 1 2024-25. Tim representasi semangat Indonesia Timur. Stadion Cenderawasih jadi venue dengan perjalanan tandang paling ekstrem di kompetisi.',
  },
  {
    slug: 'psim',
    espnId: '131304',
    name: 'PSIM Yogyakarta',
    nameId: 'PSIM Jogja',
    city: 'Yogyakarta',
    founded: 1929,
    stadium: 'Stadion Mandala Krida',
    accent: '#1E40AF',
    handle: 'PSIMJogjaOfc',
    bio: 'PSIM Yogyakarta — "Laskar Mataram", klub bersejarah Jogja yang promosi ke Liga 1 2025-26. Brajamusti + Mataram Is Blue jadi fanbase yang menanti momen ini lebih dari satu dekade. Comeback Jogja ke kasta tertinggi.',
  },
  {
    slug: 'psm-makassar',
    espnId: '8112',
    name: 'PSM Makassar',
    nameId: 'PSM Makassar',
    city: 'Makassar',
    founded: 1915,
    stadium: 'Stadion Batakan',
    accent: '#B91C1C',
    handle: 'PSM_Makassar',
    bio: 'PSM Makassar — "Juku Eja", klub tertua di Indonesia (1915). Juara Liga 1 2022-23 setelah puasa gelar 22 tahun. Ramang sampai era modern — fanbase Maczman + atmosfer Sulawesi Selatan tetap militan.',
  },
  {
    slug: 'persijap',
    espnId: '131305',
    name: 'Persijap',
    nameId: 'Persijap Jepara',
    city: 'Jepara',
    founded: 1954,
    stadium: 'Stadion Gelora Bumi Kartini',
    accent: '#7C3AED',
    handle: 'OfficialPersijap',
    bio: 'Persijap Jepara — "Laskar Kalinyamat", klub Jawa Tengah yang promosi ke Liga 1 2025-26 lewat play-off Liga 2. Comeback ke divisi teratas setelah 11 tahun. Bumi Kartini sebagai benteng Jepara.',
  },
  {
    slug: 'persik',
    espnId: '7524',
    name: 'Persik Kediri',
    nameId: 'Persik Kediri',
    city: 'Kediri',
    founded: 1950,
    stadium: 'Stadion Brawijaya',
    accent: '#7E22CE',
    handle: 'PersikKediriOfc',
    bio: 'Persik Kediri — "Macan Putih", klub Jawa Timur dengan dua gelar Liga Indonesia (2003, 2006). Persikmania jadi fanbase setia. Tim sederhana yang mengandalkan karakter + semangat lokal.',
  },
  {
    slug: 'persis',
    espnId: '21590',
    name: 'Persis Solo',
    nameId: 'Persis Solo',
    city: 'Surakarta',
    founded: 1923,
    stadium: 'Stadion Manahan',
    accent: '#DC2626',
    handle: 'PersisOfficial',
    bio: 'Persis Solo — "Laskar Sambernyawa", klub Solo dengan investasi pasca-akuisisi Kaesang Pangarep. Persis bangun ulang dari Liga 2, fokus rekrutmen pemain muda + pelatih asing. Stadion Manahan 25 ribu.',
  },
  {
    slug: 'persita',
    espnId: '8033',
    name: 'Persita Tangerang',
    nameId: 'Persita',
    city: 'Tangerang',
    founded: 1953,
    stadium: 'Indomilk Arena',
    accent: '#7C2D12',
    handle: 'Persita1953',
    bio: 'Persita Tangerang — "Pendekar Cisadane", klub Banten dengan basis suporter Lapper Persita yang loyal. Berbagi Indomilk Arena dengan Dewa United bikin derby Tangerang jadi salah satu rivalitas baru paling menarik.',
  },
  {
    slug: 'semen-padang',
    espnId: '8034',
    name: 'Semen Padang',
    nameId: 'Semen Padang FC',
    city: 'Padang',
    founded: 1980,
    stadium: 'Stadion Haji Agus Salim',
    accent: '#B91C1C',
    handle: 'semenpadangfcid',
    bio: 'Semen Padang FC — "Kabau Sirah", klub Sumatera Barat dengan fanbase The Kmers. Juara Community Shield 2013 + langganan papan atas era 2010-an. Comeback ke Liga 1 setelah turun-naik kompetisi divisi.',
  },
  {
    slug: 'bhayangkara',
    espnId: '18734',
    name: 'Bhayangkara Surabaya',
    nameId: 'Bhayangkara FC',
    city: 'Surabaya',
    founded: 2010,
    stadium: 'Stadion Gelora Delta Sidoarjo',
    accent: '#1F2937',
    handle: 'bhayangkarafcid',
    bio: 'Bhayangkara Surabaya — "The Guardian", klub afiliasi Polri yang juara Liga 1 2017. Pindah base ke Surabaya tahun 2024-25, sharing Sidoarjo dengan Persebaya jadi narasi unik. Disiplin + fisik jadi DNA tim.',
  },
];

// ─── Lookup maps ─────────────────────────────────────────────────────────
export const CLUBS_BY_SLUG = Object.fromEntries(CLUBS.map((c) => [c.slug, c]));
export const CLUBS_BY_ESPN_ID = Object.fromEntries(CLUBS.map((c) => [c.espnId, c]));
export const CLUBS_BY_NAME = Object.fromEntries(CLUBS.map((c) => [c.name, c]));

// ─── Bahasa formatters (mirrors EPL) ─────────────────────────────────────
const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Format an ISO date into a short Bahasa / English fixture label.
 *   formatFixtureDate('2026-04-26T14:00:00Z', 'id') → 'Min, 26 Apr · 21:00 WIB'
 *
 * Liga 1 kicks off in WIB (UTC+7). ESPN returns kickoff as UTC Z-time.
 * Note: matches in WITA / WIT cities still get scheduled in WIB on the
 * broadcaster side, so a single timezone label is correct.
 */
export function formatFixtureDate(iso, lang = 'id') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDate();
  const mon = MONTHS_ID[wib.getUTCMonth()];
  const dow = lang === 'id'
    ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][wib.getUTCDay()]
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][wib.getUTCDay()];
  const hh = String(wib.getUTCHours()).padStart(2, '0');
  const mm = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${dow}, ${day} ${mon} · ${hh}:${mm} WIB`;
}

export const FORM_SYMBOL = { W: 'M', D: 'S', L: 'K' }; // Bahasa form guide letters
