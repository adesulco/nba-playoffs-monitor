// Lightweight i18n dict. Add new keys here; falls back to English if missing.
export const LOCALES = {
  en: {
    // Masthead
    tagline: '2025–26 POSTSEASON',
    liveLabel: 'LIVE',
    partial: 'PARTIAL',
    offline: 'OFFLINE',
    connecting: 'CONNECTING',
    refresh: 'refresh',
    ago: 'ago',
    pickTeam: 'Pick your team',
    clear: '× Clear selection',
    easternConf: 'EASTERN CONFERENCE',
    westernConf: 'WESTERN CONFERENCE',

    // Hero / scoreboard
    liveScoreboard: 'LIVE SCOREBOARD',
    scoresSchedule: 'SCORES & SCHEDULE',
    today: 'TODAY',
    tomorrow: 'TOMORROW',
    games: 'GAMES',
    game: 'GAME',
    upcoming: 'UPCOMING',
    final: 'FINAL',
    live: 'LIVE',
    espnLive: 'ESPN LIVE',
    espnOff: 'ESPN OFF · SHOWING SCHEDULE',
    yourTeam: '★ YOUR TEAM',
    following: '● FOLLOWING',
    swipeHint: 'SWIPE ← →',
    // v0.11.5 editorial pass — empty/off-day states get voice instead of
    // system-default copy. Matches the audit's "8 editorial empty-state
    // strings" remediation + Persona C (Pak Haryanto) benefits from a
    // concrete description rather than "No games."
    noGamesDay: 'No games today — grab coffee',
    offDay: 'OFF DAY',

    // Context strip
    titleFavorite: 'TITLE FAVORITE',
    round1Tips: 'ROUND 1 TIPS',
    finalsTipoff: 'FINALS TIP-OFF',
    nextTip: 'NEXT TIP',
    gamesFriday: 'games Friday',

    // Focus panel
    liveFocus: 'LIVE FOCUS',
    tipoffPending: 'TIP-OFF PENDING',
    closeFocus: '× CLOSE FOCUS',
    winProbability: 'WIN PROBABILITY',
    playByPlay: 'Play-by-play',
    boxScore: 'Box Score',
    statsOpen: 'Box score opens at tip-off — one more minute.',
    noPlaysYet: 'Still warming up — tip-off, then we move.',
    streamOpens: 'Win probability stream opens at tip-off',
    pickMatchAbove: 'Pick a match above.',
    tapToFollow: 'Tap any game above to follow live — win probability, play-by-play, and live score.',
    injuryReport: 'INJURY REPORT',
    updatesEveryPlay: 'ESPN · updates every play',

    // Bracket
    round1Bracket: 'ROUND 1 BRACKET',
    playInTbd: 'Play-In TBD',
    leads: 'LEADS',
    tied: 'TIED',
    wins: 'WINS',
    titleFavoritePoly: 'Highlighted = title favorite per Polymarket',

    // Panels
    titleOdds: 'TITLE ODDS',
    playerStats: 'PLAYER STATS',
    focused: 'FOCUSED',
    pickATeam: 'PICK A TEAM',
    loadingLeaders: 'Loading leaders',
    fullRoster: 'FULL ROSTER',
    statsUpdateNote: 'Stats update as the team advances through the playoffs.',

    // Featured / stories / accounts
    featuredSeries: 'FEATURED SERIES',
    round1Label: 'ROUND 1',
    keyAccounts: 'KEY ACCOUNTS',
    teamFeed: 'FEED',
    playoffStories: 'PLAYOFF STORIES',
    previewAnalysis: 'PREVIEW · ANALYSIS',

    // Tonight
    tonightPlayIn: 'TONIGHT · PLAY-IN FINALE',
    primeNote: 'Prime Video · Winners take 8-seed',
    confFinale: 'CONFERENCE FINALE',
    winnersFace: 'Winners face',
    sunday: 'Sunday',

    // News ticker
    news: 'NEWS',

    // Yesterday recap
    yesterday: 'YESTERDAY',
    show: 'show',
    hide: 'hide',
    by: 'by',
    blowout: 'BLOWOUT',

    // Catatan Playoff (daily recap brand/label)
    catatanPlayoff: 'Playoff Notes',
    catatanPlayoffSub: 'Daily Playoff Recap',
    catatanPlayoffLead: 'Daily playoff recap — a screenshot-ready wrap of every game.',
    catatanTodays: "Today's Playoff Notes",
    catatanYesterdays: "Yesterday's Playoff Notes",
    catatanDaily: 'Daily Playoff Recap',
    readRecap: 'Read recap',

    // Footer
    poll: 'Poll',
    last: 'last',
    dataSources: 'Polymarket Gamma + CLOB WS · ESPN Scoreboard · 30s poll + live ticks',
    builtBy: 'ESPN · Polymarket · Built by Claude',

    // Theme toggle
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',

    // v2 redesign — top-bar label, home + match surfaces, AI recap,
    // multi-sport hub strings. Existing keys are reused where the semantics
    // match; these are only the net-new keys from the v2 i18n dictionary.
    langLabel: 'EN',
    home: 'Home',
    liveNow: 'Live now',
    watching: 'watching',
    followingNav: 'Following',
    openMatch: 'Open match',
    open: 'Open',
    addToBoard: '＋ Board',
    addMatch: '＋ Add match',
    multiMatch: 'Command Center',
    comingSoon: 'Coming soon',
    joinWaitlist: 'Join waitlist',
    beFirstToKnow: 'Be the first in when we flip it on.',
    championshipOdds: 'Championship odds',
    keyMoment: 'Key moment',
    topPerformers: 'Top performers',
    momentum: 'Momentum',
    bracket: 'Bracket',
    standings: 'Standings',
    fixtures: 'Fixtures',
    scheduleOfPlay: 'Schedule of play',
    aiRecap: 'AI Recap',
    todayReaction: 'Fans reacting',
    west: 'West',
    east: 'East',
    serving: 'Serving',
    aces: 'Aces',
    dblFaults: 'Double faults',
    firstServe: '1st serve %',
    breakPts: 'Break pts',
    pitWindow: 'Pit window',
    tyreStrategy: 'Tyre strategy',
    commentary: 'Commentary',
    // Share cards
    shareCardOG: 'OG',
    shareCardStory: 'Story',
    shareCardSquare: 'Square',
    // States — editorial voice (v0.11.5)
    stateEmptyLive: 'Nothing live right now — still early',
    stateEmptyCheckBack: 'Come back at',
    stateErrorFeed: 'Feed lost a beat — reconnecting',
    stateRetry: 'Try again',
    // Theme popover labels
    themeAuto: 'AUTO',
    themeDark: 'DARK',
    themeLight: 'LIGHT',
    // V2TopBar nav labels (v0.11.21 GIB-007). NBA + F1 stay untranslated
    // as brand acronyms; only generic-name items translate.
    //
    // v0.15.1 — split single "Football" into two: Liga 1 (Indonesia,
    // priority surface per Gibol mission) and Liga Inggris (EPL).
    // navFootball kept as a deprecated alias so any straggler reference
    // doesn't break — it now maps to the EPL label.
    //
    // v0.15.2 — restore navTennis + navWorldCup. The v0.15.1 edit
    // accidentally removed them along with the old block; TopBar still
    // references both keys via `labelKey`, so without these the BI
    // toggle was falling through to the EN label fallback for Bahasa
    // users on Tennis + Piala Dunia. Pure regression repair.
    navHome: 'Home',
    navLiga1: 'Liga 1',
    navEPL: 'Premier League',
    navFootball: 'Premier League',
    navTennis: 'Tennis',
    navWorldCup: 'World Cup',
    // v0.16.0 (Phase 2 Sprint A) — A11y + share-button keys.
    // skipToContent powers the .skip-link in App.jsx (was a hardcoded
    // bilingual concat). copyLink + share are picked up by Phase 2's
    // <HubActionRow> + ShareButton when those land in Sprint B.
    skipToContent: 'Skip to content',
    copyLink: 'Copy link',
    share: 'Share',
    // Season label (v0.11.21 GIB-010) — previously hardcoded "SEASON"
    // on F1 + Tennis hubs regardless of language.
    season: 'SEASON',
  },

  id: {
    // Masthead — Bahasa Indonesia (casual/basketball register, "gila bola" voice)
    tagline: 'POSTSEASON 2025–26',
    liveLabel: 'LIVE',
    partial: 'SEBAGIAN',
    offline: 'OFFLINE',
    connecting: 'MENGHUBUNGKAN',
    refresh: 'refresh',
    ago: 'lalu',
    pickTeam: 'Pilih tim favoritmu',
    clear: '× Hapus pilihan',
    easternConf: 'EASTERN CONFERENCE',
    westernConf: 'WESTERN CONFERENCE',

    // Hero
    liveScoreboard: 'PAPAN SKOR LANGSUNG',
    scoresSchedule: 'SKOR & JADWAL',
    today: 'HARI INI',
    tomorrow: 'BESOK',
    games: 'LAGA',
    game: 'LAGA',
    upcoming: 'AKAN MAIN',
    final: 'SELESAI',
    live: 'LIVE',
    espnLive: 'ESPN LIVE',
    espnOff: 'ESPN OFF · TAMPILKAN JADWAL',
    yourTeam: '★ TIM KAMU',
    following: '● DIIKUTI',
    swipeHint: 'GESER ← →',
    // v0.11.5 editorial pass — casual Bahasa, "gila bola" register.
    noGamesDay: 'Hari ini kosong — ngopi dulu',
    offDay: 'LIBUR DULU',

    // Context strip
    titleFavorite: 'FAVORIT JUARA',
    round1Tips: 'TIP-OFF RONDE 1',
    finalsTipoff: 'TIP-OFF FINAL',
    nextTip: 'LAGA BERIKUT',
    gamesFriday: 'laga Jumat',

    // Focus
    liveFocus: 'FOKUS LIVE',
    tipoffPending: 'MENUNGGU TIP-OFF',
    closeFocus: '× TUTUP',
    winProbability: 'PELUANG MENANG',
    playByPlay: 'Play-by-play',
    boxScore: 'Statistik',
    statsOpen: 'Box score kebuka pas tip-off — sabar sebentar.',
    noPlaysYet: 'Lagi pemanasan — tip-off dulu, baru jalan.',
    streamOpens: 'Peluang menang mulai tampil saat tip-off',
    pickMatchAbove: 'Pilih laga di atas.',
    tapToFollow: 'Klik laga di atas untuk mengikuti live — peluang menang, play-by-play, dan skor langsung.',
    injuryReport: 'LAPORAN CEDERA',
    updatesEveryPlay: 'ESPN · update tiap permainan',

    // Bracket
    round1Bracket: 'BRACKET RONDE 1',
    playInTbd: 'Play-In TBD',
    leads: 'UNGGUL',
    tied: 'SERI',
    wins: 'MENANG',
    titleFavoritePoly: 'Disorot = favorit juara menurut Polymarket',

    // Panels
    titleOdds: 'PELUANG JUARA',
    playerStats: 'STATISTIK PEMAIN',
    focused: 'DIFOKUSKAN',
    pickATeam: 'PILIH TIM',
    loadingLeaders: 'Memuat pemain',
    fullRoster: 'ROSTER LENGKAP',
    statsUpdateNote: 'Statistik update seiring perjalanan tim di playoff.',

    // Featured / stories / accounts
    featuredSeries: 'SERI PILIHAN',
    round1Label: 'RONDE 1',
    keyAccounts: 'AKUN UTAMA',
    teamFeed: 'FEED',
    playoffStories: 'BERITA PLAYOFF',
    previewAnalysis: 'PRATINJAU · ANALISIS',

    // Tonight
    tonightPlayIn: 'MALAM INI · FINAL PLAY-IN',
    primeNote: 'Prime Video · Pemenang dapat seed-8',
    confFinale: 'FINAL KONFERENSI',
    winnersFace: 'Pemenang hadapi',
    sunday: 'Minggu',

    // News ticker
    news: 'KABAR',

    // Yesterday
    yesterday: 'KEMARIN',
    show: 'tampilkan',
    hide: 'sembunyikan',
    by: 'selisih',
    blowout: 'KEMENANGAN TELAK',

    // Catatan Playoff (brand lokal — tidak diterjemahkan di versi ID)
    catatanPlayoff: 'Catatan Playoff',
    catatanPlayoffSub: 'Catatan Playoff harian',
    catatanPlayoffLead: 'Catatan Playoff harian — rekap semua laga siap di-screenshot.',
    catatanTodays: 'Catatan Playoff Hari Ini',
    catatanYesterdays: 'Catatan Playoff Kemarin',
    catatanDaily: 'Catatan Playoff harian',
    readRecap: 'Baca catatan',

    // Footer
    poll: 'Poll',
    last: 'terakhir',
    dataSources: 'Polymarket Gamma + CLOB WS · ESPN Scoreboard · poll 30d + tick langsung',
    builtBy: 'ESPN · Polymarket · Dibuat oleh Claude',

    // Theme toggle
    switchToLight: 'Mode terang',
    switchToDark: 'Mode gelap',

    // v2 redesign — bilingual parity. Casual register per CLAUDE.md voice
    // rules (gue/lo acceptable in editorial, formal in data tables).
    // Note: UI label is 'BI' even though internal storage key is 'id'.
    langLabel: 'BI',
    home: 'Beranda',
    liveNow: 'Live sekarang',
    watching: 'menonton',
    followingNav: 'Diikuti',
    openMatch: 'Buka pertandingan',
    open: 'Buka',
    addToBoard: '＋ Papan',
    addMatch: '＋ Tambah',
    multiMatch: 'Pusat Komando',
    comingSoon: 'Segera hadir',
    joinWaitlist: 'Gabung waitlist',
    beFirstToKnow: 'Jadi yang pertama tahu saat kami aktifkan.',
    championshipOdds: 'Peluang juara',
    keyMoment: 'Momen kunci',
    topPerformers: 'Pemain top',
    momentum: 'Momentum',
    bracket: 'Bracket',
    standings: 'Klasemen',
    fixtures: 'Jadwal',
    scheduleOfPlay: 'Jadwal pertandingan',
    aiRecap: 'Ringkasan AI',
    todayReaction: 'Fans bereaksi',
    west: 'Barat',
    east: 'Timur',
    serving: 'Servis',
    aces: 'Ace',
    dblFaults: 'Double fault',
    firstServe: 'Servis pertama %',
    breakPts: 'Break point',
    pitWindow: 'Jendela pit',
    tyreStrategy: 'Strategi ban',
    commentary: 'Komentar',
    // Share cards
    shareCardOG: 'OG',
    shareCardStory: 'Story',
    shareCardSquare: 'Square',
    // States — casual register (v0.11.5 editorial)
    stateEmptyLive: 'Belum ada yang main — masih sepi',
    stateEmptyCheckBack: 'Cek lagi jam',
    stateErrorFeed: 'Feed putus sebentar — lagi connect ulang',
    stateRetry: 'Coba lagi',
    // Theme popover labels (keep uppercase mono across both langs)
    themeAuto: 'AUTO',
    themeDark: 'DARK',
    themeLight: 'LIGHT',
    // V2TopBar nav (v0.11.21 GIB-007). BI casual register.
    // v0.15.1 — split "Football" → "Liga 1" + "Liga Inggris" so
    // Indonesia is the first football surface in the header.
    // v0.15.2 — restore navTennis + navWorldCup (regression — see EN
    // section). BI casual: "Tenis" not "Tennis", "Piala Dunia" not
    // "World Cup".
    navHome: 'Beranda',
    navLiga1: 'Liga 1',
    navEPL: 'Liga Inggris',
    navFootball: 'Liga Inggris',
    navTennis: 'Tenis',
    navWorldCup: 'Piala Dunia',
    // v0.16.0 (Phase 2 Sprint A) — A11y + share-button keys, BI casual.
    skipToContent: 'Langsung ke konten',
    copyLink: 'Salin link',
    share: 'Bagikan',
    // Season label (v0.11.21 GIB-010).
    season: 'MUSIM',
  },
};

export function createTranslator(lang) {
  const dict = LOCALES[lang] || LOCALES.en;
  const fallback = LOCALES.en;
  return (key) => dict[key] ?? fallback[key] ?? key;
}
