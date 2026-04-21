/**
 * Premier League 2025-26 — 20 clubs source of truth.
 *
 * Phase 1A (v0.4.0). Structure mirrors `src/lib/sports/f1/constants.js` so
 * future sport adapters can rhyme without copy-pasting the shape.
 *
 * Each club entry:
 *   slug     — URL + SEO slug used by /premier-league-2025-26/club/:slug.
 *              Short, lowercase, nickname-first when the nickname is the
 *              searched term ("spurs" > "tottenham-hotspur"). Stable across
 *              seasons — promoted/relegated clubs are added/removed, never
 *              renamed.
 *   espnId   — ESPN soccer/eng.1 team id. Verified via ESPN scoreboard
 *              + teams endpoints. Used to resolve live scores, fixtures,
 *              and rosters through /api/proxy/espn/.../teams/{id}.
 *   name     — canonical English name (what ESPN returns).
 *   nameId   — Bahasa alt used in body copy when it's idiomatic
 *              ("Setan Merah", "Si Merah"). Falls back to `name` in the
 *              UI when the Bahasa nickname is just the English name.
 *   city     — host city for geo chips + SEO.
 *   founded  — year the club was founded.
 *   stadium  — primary home ground.
 *   accent   — primary brand hex. Used for borderLeft accents, hero tints
 *              (<=14%), and row highlights on the dashboard.
 *   handle   — official X/Twitter handle WITHOUT the `@`. Used by
 *              "Key Accounts" panels on per-club pages + EPL dashboard
 *              (mirrors the NBA TEAM_META.handle pattern in constants.js).
 *              Resolve URL via `https://x.com/${club.handle}`. Verified
 *              against public club profiles 2026-04-21.
 *   bio      — one short Bahasa paragraph for the club page "Tentang"
 *              block. Casual register — gue/lo OK, stays factual.
 *
 * 2025-26 promoted trio: Leeds, Burnley, Sunderland (Championship play-off
 * winner). Relegated from 2024-25: Leicester, Ipswich, Southampton.
 */

export const SEASON = '2025-26';
export const SEASON_START = '2025-08-15';
export const SEASON_END = '2026-05-24';

export const CLUBS = [
  {
    slug: 'arsenal',
    espnId: '359',
    name: 'Arsenal',
    nameId: 'Arsenal',
    city: 'London',
    founded: 1886,
    stadium: 'Emirates Stadium',
    accent: '#EF0107',
    handle: 'Arsenal',
    bio: 'Arsenal — "The Gunners" dari London Utara. Era Arteta dewasa: squad muda, build-up disiplin, pressing tinggi. Finis runner-up tiga musim beruntun bikin 2025-26 jadi musim "sekarang atau nggak" buat nembus gelar Premier League pertama sejak 2003-04.',
  },
  {
    slug: 'aston-villa',
    espnId: '362',
    name: 'Aston Villa',
    nameId: 'Aston Villa',
    city: 'Birmingham',
    founded: 1874,
    stadium: 'Villa Park',
    accent: '#95BFE5',
    handle: 'AVFCOfficial',
    bio: 'Aston Villa — salah satu klub tertua Inggris, juara Eropa 1982. Era Unai Emery bikin Villa balik ke papan atas + balik ke kompetisi Eropa. Villa Park tetap salah satu atmosfer paling keras di liga.',
  },
  {
    slug: 'bournemouth',
    espnId: '349',
    name: 'AFC Bournemouth',
    nameId: 'Bournemouth',
    city: 'Bournemouth',
    founded: 1899,
    stadium: 'Vitality Stadium',
    accent: '#DA291C',
    handle: 'afcbournemouth',
    bio: 'Bournemouth — "The Cherries" dari pantai selatan. Iraola ball: pressing agresif, transisi cepat, atletik banget. Meski stadion kecil (11k), tim ini rutin bikin pusing Big Six.',
  },
  {
    slug: 'brentford',
    espnId: '337',
    name: 'Brentford',
    nameId: 'Brentford',
    city: 'London',
    founded: 1889,
    stadium: 'Gtech Community Stadium',
    accent: '#E30613',
    handle: 'BrentfordFC',
    bio: 'Brentford — klub Moneyball-nya Premier League. Model data-driven + rekrut undervalued bikin klub kecil London Barat ini stabil di EPL sejak promosi 2021. Set-piece master di bawah Thomas Frank, lanjut di era Keith Andrews.',
  },
  {
    slug: 'brighton',
    espnId: '331',
    name: 'Brighton & Hove Albion',
    nameId: 'Brighton',
    city: 'Brighton',
    founded: 1901,
    stadium: 'American Express Stadium',
    accent: '#0057B8',
    handle: 'OfficialBHAFC',
    bio: 'Brighton — "The Seagulls". Skautinya terkenal nyari permata murah dari seluruh dunia, terus dijual mahal ke Big Six. Gaya De Zerbi bikin Brighton possession-based sekelas atas, tim kecil dengan otak paling tajam di liga.',
  },
  {
    slug: 'burnley',
    espnId: '379',
    name: 'Burnley',
    nameId: 'Burnley',
    city: 'Burnley',
    founded: 1882,
    stadium: 'Turf Moor',
    accent: '#6C1D45',
    handle: 'BurnleyOfficial',
    bio: 'Burnley — "The Clarets" promosi ke EPL 2025-26 setelah juara Championship. Scott Parker bangun tim disiplin yang pragmatis. Turf Moor tetap salah satu lapangan tersulit buat tim tamu — dingin, sempit, fans setia.',
  },
  {
    slug: 'chelsea',
    espnId: '363',
    name: 'Chelsea',
    nameId: 'Chelsea',
    city: 'London',
    founded: 1905,
    stadium: 'Stamford Bridge',
    accent: '#034694',
    handle: 'ChelseaFC',
    bio: 'Chelsea — "The Blues" dari London Barat. Proyek Boehly kembali serius setelah Maresca ngajarin squad termuda di liga cara main bola. Juara Conference League 2025, juara Club World Cup 2025 — fondasinya makin terbentuk.',
  },
  {
    slug: 'crystal-palace',
    espnId: '384',
    name: 'Crystal Palace',
    nameId: 'Crystal Palace',
    city: 'London',
    founded: 1905,
    stadium: 'Selhurst Park',
    accent: '#1B458F',
    handle: 'CPFC',
    bio: 'Crystal Palace — "The Eagles" dari London Selatan. Juara FA Cup 2025 pertama dalam sejarah klub + kualifikasi Europa League. Oliver Glasner bangun tim keras di transisi, Selhurst Park atmosfer paling otentik di London.',
  },
  {
    slug: 'everton',
    espnId: '368',
    name: 'Everton',
    nameId: 'Everton',
    city: 'Liverpool',
    founded: 1878,
    stadium: 'Hill Dickinson Stadium',
    accent: '#003399',
    handle: 'Everton',
    bio: 'Everton — "The Toffees". Salah satu klub pendiri Football League 1888, nggak pernah turun dari divisi teratas lebih lama dari klub lain di Inggris. Musim 2025-26 pertama di stadion baru 53k di Bramley-Moore Dock.',
  },
  {
    slug: 'fulham',
    espnId: '370',
    name: 'Fulham',
    nameId: 'Fulham',
    city: 'London',
    founded: 1879,
    stadium: 'Craven Cottage',
    accent: '#000000',
    handle: 'FulhamFC',
    bio: 'Fulham — klub London tertua, dari tepi Sungai Thames. Marco Silva bangun tim solid + possession bersih. Craven Cottage dengan cottage di sudut lapangan tetap salah satu stadion paling ikonik di liga.',
  },
  {
    slug: 'leeds',
    espnId: '357',
    name: 'Leeds United',
    nameId: 'Leeds United',
    city: 'Leeds',
    founded: 1919,
    stadium: 'Elland Road',
    accent: '#FFCD00',
    handle: 'LUFC',
    bio: 'Leeds United — "The Whites" balik ke EPL setelah juara Championship 2024-25. Daniel Farke lanjutin rebuild. Elland Road dan 37 ribu fans Yorkshire salah satu atmosfer paling keras di Inggris — "Marching on Together".',
  },
  {
    slug: 'liverpool',
    espnId: '364',
    name: 'Liverpool',
    nameId: 'Liverpool',
    city: 'Liverpool',
    founded: 1892,
    stadium: 'Anfield',
    accent: '#C8102E',
    handle: 'LFC',
    bio: 'Liverpool — "The Reds" dari Merseyside. Era Arne Slot: juara Premier League 2024-25 di musim pertama post-Klopp. Anfield di malam hari Champions League tetap tempat paling ajaib di sepakbola Inggris. "You\'ll Never Walk Alone".',
  },
  {
    slug: 'manchester-city',
    espnId: '382',
    name: 'Manchester City',
    nameId: 'Manchester City',
    city: 'Manchester',
    founded: 1880,
    stadium: 'Etihad Stadium',
    accent: '#6CABDD',
    handle: 'ManCity',
    bio: 'Manchester City — era Guardiola sejak 2016. Juara EPL enam dari tujuh musim antara 2017-18 sampai 2023-24. 2024-25 tumbang runner-up Liverpool — 2025-26 musim pembuktian kalau Pep masih mampu mereset squad.',
  },
  {
    slug: 'manchester-united',
    espnId: '360',
    name: 'Manchester United',
    nameId: 'Manchester United',
    city: 'Manchester',
    founded: 1878,
    stadium: 'Old Trafford',
    accent: '#DA291C',
    handle: 'ManUtd',
    bio: 'Manchester United — "Setan Merah", klub dengan fanbase global terbesar. Era Ruben Amorim lanjutin rekonstruksi post-Ferguson yang udah jalan lebih dari satu dekade. Old Trafford tetap "Theatre of Dreams" — walaupun mimpinya sekarang cuma finis empat besar.',
  },
  {
    slug: 'newcastle',
    espnId: '361',
    name: 'Newcastle United',
    nameId: 'Newcastle United',
    city: 'Newcastle upon Tyne',
    founded: 1892,
    stadium: 'St James\' Park',
    accent: '#241F20',
    handle: 'NUFC',
    bio: 'Newcastle United — "The Magpies" dari Tyneside. Proyek PIF sejak 2021 bikin Newcastle balik ke elit Eropa. Juara League Cup 2024-25 (trofi besar pertama sejak 1955). Eddie Howe bangun tim pressing atletik, St James\' Park salah satu atmosfer paling keras di Inggris.',
  },
  {
    slug: 'nottingham-forest',
    espnId: '393',
    name: 'Nottingham Forest',
    nameId: 'Nottingham Forest',
    city: 'Nottingham',
    founded: 1865,
    stadium: 'City Ground',
    accent: '#DD0000',
    handle: 'NFFC',
    bio: 'Nottingham Forest — klub tertua ketiga di dunia, juara Piala Champions 1979 & 1980 di bawah Brian Clough. Kembali ke EPL 2022, finis ke-7 musim lalu — kualifikasi Conference League. Evangelos Marinakis terus investasi, Nuno Espírito Santo bangun tim keras.',
  },
  {
    slug: 'sunderland',
    espnId: '366',
    name: 'Sunderland',
    nameId: 'Sunderland',
    city: 'Sunderland',
    founded: 1879,
    stadium: 'Stadium of Light',
    accent: '#EB172B',
    handle: 'SunderlandAFC',
    bio: 'Sunderland — "The Black Cats" promosi ke EPL 2025-26 lewat play-off Championship (ngalahin Sheffield United di Wembley). Balik ke divisi teratas setelah 8 tahun. Stadium of Light 49 ribu fans Wearside, salah satu fanbase paling setia di Inggris.',
  },
  {
    slug: 'tottenham',
    espnId: '367',
    name: 'Tottenham Hotspur',
    nameId: 'Tottenham Hotspur',
    city: 'London',
    founded: 1882,
    stadium: 'Tottenham Hotspur Stadium',
    accent: '#132257',
    handle: 'SpursOfficial',
    bio: 'Tottenham — "Spurs" dari London Utara. Juara Europa League 2024-25 — trofi besar pertama sejak 2008. Thomas Frank gantiin Postecoglou, bangun tim lebih defensif. Stadion baru 62 ribu di High Road salah satu yang terbaik di Eropa.',
  },
  {
    slug: 'west-ham',
    espnId: '371',
    name: 'West Ham United',
    nameId: 'West Ham United',
    city: 'London',
    founded: 1895,
    stadium: 'London Stadium',
    accent: '#7A263A',
    handle: 'WestHam',
    bio: 'West Ham — "The Hammers" dari London Timur. Juara Conference League 2023, tim Inggris yang konsisten di Eropa. Graham Potter bangun ulang post-Moyes, London Stadium 62 ribu fans setia meski masih debat soal pindah dari Upton Park.',
  },
  {
    slug: 'wolves',
    espnId: '380',
    name: 'Wolverhampton Wanderers',
    nameId: 'Wolverhampton Wanderers',
    city: 'Wolverhampton',
    founded: 1877,
    stadium: 'Molineux Stadium',
    accent: '#FDB913',
    handle: 'Wolves',
    bio: 'Wolves — "The Wolves" dari West Midlands. Warna emas-hitam salah satu kit paling ikonik Inggris. Era Vítor Pereira: tim muda, pressing, mengandalkan transisi. Molineux atmosfer khas English football — keras, tradisional.',
  },
];

// ─── Lookup maps ─────────────────────────────────────────────────────────
export const CLUBS_BY_SLUG = Object.fromEntries(CLUBS.map((c) => [c.slug, c]));
export const CLUBS_BY_ESPN_ID = Object.fromEntries(CLUBS.map((c) => [c.espnId, c]));
export const CLUBS_BY_NAME = Object.fromEntries(CLUBS.map((c) => [c.name, c]));

// ─── Bahasa formatters ───────────────────────────────────────────────────
const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Format an ISO date into a short Bahasa / English fixture label.
 *   formatFixtureDate('2026-04-26T14:00:00Z', 'id') → 'Min, 26 Apr · 21:00 WIB'
 *   formatFixtureDate('2026-04-26T14:00:00Z', 'en') → 'Sun, 26 Apr · 21:00 WIB'
 *
 * WIB = UTC+7. ESPN returns kickoff as UTC Z-time.
 */
export function formatFixtureDate(iso, lang = 'id') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Shift to WIB (UTC+7). toLocaleString with Asia/Jakarta would pull in the
  // runtime's ICU data which Node minimal builds may not ship — do the math.
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
