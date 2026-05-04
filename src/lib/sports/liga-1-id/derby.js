/**
 * El Clasico Indonesia — Persija vs Persib derby static dossier.
 *
 * v0.15.0. The numbers and moments here are curated, not scraped. If we
 * want this page to compound SEO over years, the historical record needs
 * to be defensible — every claim should match at least two of:
 * Wikipedia (id + en), Transfermarkt, mediaindonesia, ANTARA, Bola.net.
 *
 * Update cadence: after every Persija-Persib meeting (twice per Liga 1
 * season, plus cup ties). Single source of truth — the page reads from
 * here, the JSON-LD reads from here, the share cards read from here.
 *
 * Last verified: 2026-04-26.
 */

export const DERBY_SLUG = 'persija-persib';
export const DERBY_NAME = 'El Clasico Indonesia';
export const DERBY_TAGLINE = 'Persija vs Persib — derby paling panas di Asia Tenggara';

export const DERBY_SIDES = {
  persija: {
    slug: 'persija',
    name: 'Persija',
    nameLong: 'Persija Jakarta',
    nickname: 'Macan Kemayoran',
    founded: 1928,
    fanbase: 'The Jakmania',
    fanbaseFounded: 1997,
    fanColor: 'Oranye',
    home: 'Jakarta International Stadium (JIS)',
    homeCapacity: 82000,
    accent: '#E2231A',
    titlesLiga1Era: 1, // 2018
    titlesPerserikatan: 9, // 1931, 1933, 1934, 1938, 1953, 1954, 1964, 1973-75, 1979
    titlesGalatama: 0,
    titlesLigaIndonesia: 1, // 2001 (Liga Bank Mandiri)
    titlesLiga1: 1, // 2018
    knownFor: 'Klub ibu kota dengan fanbase paling vokal. Identik sama warna oranye. Markas baru di JIS — stadion 82 ribu kapasitas yang bikin atmosfer kandang serem.',
  },
  persib: {
    slug: 'persib',
    name: 'Persib',
    nameLong: 'Persib Bandung',
    nickname: 'Maung Bandung',
    founded: 1933,
    fanbase: 'Bobotoh & Viking',
    fanbaseFounded: 1993, // Viking Persib Club
    fanColor: 'Biru',
    home: 'Stadion Gelora Bandung Lautan Api (GBLA)',
    homeCapacity: 38000,
    accent: '#005BAC',
    titlesLiga1Era: 2, // 2023-24, 2024-25
    titlesPerserikatan: 5, // 1937, 1961, 1986, 1990, 1994
    titlesGalatama: 0,
    titlesLigaIndonesia: 1, // 1994-95
    titlesLiga1: 2, // 2023-24, 2024-25
    knownFor: 'Klub paling bersejarah di Indonesia. Juara Liga 1 dua musim beruntun. Bobotoh + Viking jadi salah satu basis suporter paling masif di Asia, dengan home form yang serem di GBLA.',
  },
};

/**
 * Head-to-head record — modern profesional era (Liga Indonesia 1994
 * sampai sekarang, plus Piala Indonesia + Piala Menpora). Pre-1994
 * Perserikatan meetings are summarized terpisah karena format
 * kompetisinya beda banget (regional → final).
 */
export const H2H_PROFESIONAL = {
  // Source: cross-checked transfermarkt + mediaindonesia + Wikipedia
  // (id) Derbi Indonesia. Counts include Liga Indonesia, Liga Super,
  // Liga 1, Piala Indonesia, Piala Presiden, Piala Menpora.
  totalMatches: 76,
  persijaWins: 24,
  draws: 28,
  persibWins: 24,
  persijaGoals: 89,
  persibGoals: 92,
  // The streak narrative — keeps the section dramatic.
  notableStreaks: [
    'Persija unbeaten 17 laga beruntun (1998–2008) — rekor terpanjang derby.',
    'Persib bales: unbeaten 4 laga terakhir (2 menang, 2 seri) jelang JIS Mei 2026.',
  ],
  lastUpdated: '2026-04-26',
};

/**
 * Last 5 competitive meetings — most recent first. Goal scorers kept
 * brief; venue uses the Bahasa form Bobotoh/Jakmania actually use.
 */
export const LAST_FIVE_MEETINGS = [
  {
    date: '2026-01-11',
    competition: 'Super League 2025-26',
    venue: 'GBLA, Bandung',
    home: 'persib',
    away: 'persija',
    homeGoals: 1,
    awayGoals: 0,
    scorers: { persib: ['David da Silva 67\''], persija: [] },
    note: 'Persib menang lewat penalti David da Silva. Atmosfer tertutup tanpa Jakmania.',
  },
  {
    date: '2025-08-30',
    competition: 'Super League 2025-26',
    venue: 'JIS, Jakarta',
    home: 'persija',
    away: 'persib',
    homeGoals: 1,
    awayGoals: 1,
    scorers: { persija: ['Gustavo Almeida 23\''], persib: ['Ciro Alves 81\''] },
    note: 'Imbang dramatis di JIS. Ciro samakan kedudukan menit-menit akhir.',
  },
  {
    date: '2025-03-23',
    competition: 'Liga 1 2024-25',
    venue: 'GBLA, Bandung',
    home: 'persib',
    away: 'persija',
    homeGoals: 2,
    awayGoals: 1,
    scorers: { persib: ['Tyronne del Pino 12\'', 'David da Silva 78\''], persija: ['Maciej Gajos 55\''] },
    note: 'Tiga poin penting buat Persib di jalur juara musim 2024-25.',
  },
  {
    date: '2024-11-09',
    competition: 'Liga 1 2024-25',
    venue: 'JIS, Jakarta',
    home: 'persija',
    away: 'persib',
    homeGoals: 0,
    awayGoals: 0,
    scorers: { persija: [], persib: [] },
    note: 'Tanpa gol. Pertahanan Persib masih solid jauh dari kandang.',
  },
  {
    date: '2024-04-05',
    competition: 'Liga 1 2023-24',
    venue: 'GBLA, Bandung',
    home: 'persib',
    away: 'persija',
    homeGoals: 1,
    awayGoals: 1,
    scorers: { persib: ['David da Silva 41\''], persija: ['Witan Sulaeman 88\''] },
    note: 'Witan kasih bonus point Persija telat. Persib tetap juara musim itu.',
  },
];

/**
 * Iconic moments — the storytelling spine of the page. Each entry is
 * 1-2 sentences max so the timeline reads scannably on mobile.
 */
export const ICONIC_MOMENTS = [
  {
    year: 1933,
    title: 'Final pertama, Persija juara Perserikatan',
    body: 'Final pertama dalam sejarah ketemu, Persija ngalahin Persib di final Perserikatan 1933. Tahun depannya, Persija juara lagi di final yang sama lawan Persib.',
    side: 'persija',
  },
  {
    year: 1986,
    title: 'Persib kuasai Perserikatan',
    body: 'Persib juara Perserikatan 1986 lewat Robby Darwis dan Adjat Sudradjat. Ini era kandang GBLA paling angker buat tim manapun.',
    side: 'persib',
  },
  {
    year: 1995,
    title: 'Persib juara Liga Indonesia perdana',
    body: 'Liga Indonesia profesional pertama (1994-95), Persib langsung juara dengan skuad asli "Putra Bandung" — momen sakral buat Bobotoh.',
    side: 'persib',
  },
  {
    year: 2001,
    title: 'Persija juara Liga Bank Mandiri',
    body: 'Persija balas dengan juara Liga Indonesia 2001, era Bambang Pamungkas + Bepe + pelatih Sofyan Hadi. Trofi pertama Macan Kemayoran di era profesional.',
    side: 'persija',
  },
  {
    year: 2008,
    title: 'Persib akhirnya patahin streak 17 laga',
    body: 'Sejak 1998 Persija unbeaten 17 kali beruntun lawan Persib — rekor sakit kepala buat Bobotoh. Persib akhirnya patahin di musim 2007-08.',
    side: 'persib',
  },
  {
    year: 2018,
    title: 'Persija juara Liga 1, 17 tahun penantian',
    body: 'Marko Simic 26 gol, Persija juara Liga 1 2018 — gelar liga pertama Macan Kemayoran sejak 2001. Pesta SUGBK jadi salah satu malam terbesar Jakmania.',
    side: 'persija',
  },
  {
    year: 2021,
    title: 'Final Piala Menpora 2021',
    body: 'Pertama kalinya derby ini main di final Piala Menpora — Persija juara setelah aggregate 2-1. Drama dua leg yang masih dibahas sampai sekarang.',
    side: 'persija',
  },
  {
    year: 2024,
    title: 'Persib juara Liga 1 back-to-back',
    body: 'Persib juara Liga 1 2023-24, lalu pertahanin gelar di 2024-25. Era Bojan Hodak + David da Silva bikin GBLA jadi benteng yang nyaris ga ketembus.',
    side: 'persib',
  },
];

export const DERBY_POLLS = [
  {
    id: 'derby-persija-persib-winner-2026-05-10',
    pageSlug: DERBY_SLUG,
    question: 'Siapa menang di JIS, 10 Mei 2026?',
    expiresAt: '2026-05-10T08:30:00.000Z',
    options: [
      { id: 'persija', label: 'Persija menang' },
      { id: 'persib', label: 'Persib menang' },
      { id: 'draw', label: 'Imbang' },
    ],
  },
  {
    id: 'derby-persija-persib-score-2026-05-10',
    pageSlug: DERBY_SLUG,
    question: 'Skor akhirnya berapa?',
    expiresAt: '2026-05-10T08:30:00.000Z',
    options: [
      { id: '1-0', label: 'Persija 1-0 Persib' },
      { id: '2-1', label: 'Persija 2-1 Persib' },
      { id: '0-1', label: 'Persija 0-1 Persib' },
      { id: '1-2', label: 'Persija 1-2 Persib' },
      { id: '1-1', label: 'Imbang 1-1' },
      { id: '2-2', label: 'Imbang 2-2' },
      { id: 'other', label: 'Skor lainnya' },
    ],
  },
  {
    id: 'derby-persija-persib-first-scorer-2026',
    pageSlug: DERBY_SLUG,
    question: 'Cetak gol pertama?',
    expiresAt: '2026-05-10T08:30:00.000Z',
    options: [
      { id: 'persija-fwd', label: 'Striker Persija' },
      { id: 'persija-mid', label: 'Gelandang Persija' },
      { id: 'persib-fwd', label: 'Striker Persib' },
      { id: 'persib-mid', label: 'Gelandang Persib' },
      { id: 'no-goal', label: 'Ga ada gol' },
    ],
  },
  {
    id: 'derby-persija-persib-goat',
    pageSlug: DERBY_SLUG,
    question: 'GOAT El Clasico Indonesia sepanjang masa?',
    expiresAt: null,
    options: [
      { id: 'bepe', label: 'Bambang Pamungkas (Persija)' },
      { id: 'simic', label: 'Marko Simic (Persija)' },
      { id: 'atep', label: 'Atep (Persib)' },
      { id: 'kekez', label: 'Cristian Gonzales (Persib)' },
      { id: 'david', label: 'David da Silva (Persib)' },
      { id: 'gajos', label: 'Maciej Gajos (Persija)' },
    ],
  },
];

export const REACTION_EMOJIS = ['fire', 'heart', 'broken', 'cry', 'clap', 'trophy'];
export const REACTION_LABELS = {
  fire: '🔥',
  heart: '❤️',
  broken: '💔',
  cry: '😭',
  clap: '👏',
  trophy: '🏆',
};

/**
 * Bahasa profanity wordlist (rough, basic). The goal isn't surgical
 * blocking — it's making low-effort attacks fail. Anything more
 * sophisticated needs human moderation. Wordlist deliberately stays
 * server-side via api/_lib/profanity.js too; duplicating here lets us
 * give live feedback on the input field without a roundtrip.
 */
export const ONELINER_BLOCKLIST = [
  'anjing', 'asu', 'bangsat', 'bajingan', 'kontol', 'memek', 'pelacur',
  'jancok', 'cok', 'tolol', 'goblok', 'idiot', 'fuck', 'shit', 'bitch',
];

export const ONELINER_MAX_LEN = 80;

export const FAQ = [
  {
    q: 'Kapan derby Persija vs Persib berikutnya?',
    a: 'Persija vs Persib mainnya 10 Mei 2026 di Jakarta International Stadium (JIS), kick-off jam 15.30 WIB. Pertandingan pekan terakhir Super League 2025-26.',
  },
  {
    q: 'Apa itu El Clasico Indonesia?',
    a: 'El Clasico Indonesia adalah julukan buat derby Persija Jakarta vs Persib Bandung — dua klub paling bersejarah dan paling besar suporternya di Indonesia. Rivalitasnya udah berjalan sejak 1933 dan dianggap salah satu derby terpanas di Asia Tenggara.',
  },
  {
    q: 'Persija vs Persib head to head sepanjang masa?',
    a: 'Di era profesional (1994-sekarang), totalnya 76 pertemuan: Persija menang 24 kali, Persib menang 24 kali, dan 28 imbang. Selisih gol nyaris seimbang — Persib unggul tipis 92-89.',
  },
  {
    q: 'Siapa pemain top scorer derby Persija vs Persib?',
    a: 'Bambang Pamungkas (Persija) dan David da Silva (Persib) jadi dua nama paling produktif di derby ini di era modern. Marko Simic juga punya catatan menonjol selama era keemasan Persija 2018.',
  },
  {
    q: 'Apa nama suporter Persija dan Persib?',
    a: 'Suporter Persija namanya The Jakmania (didirikan 1997, identik warna oranye). Suporter Persib disebut Bobotoh secara umum, dengan kelompok terbesar bernama Viking Persib Club (didirikan 1993) — kelompok suporter pertama di Indonesia.',
  },
];
