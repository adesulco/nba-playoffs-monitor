import React from 'react';
import { Helmet } from 'react-helmet-async';
import { COLORS as C } from '../lib/constants.js';

/**
 * Crawlable Bahasa + English content block for Google and AI search.
 * Sits at the bottom of every sport hub, visible but low-profile.
 * Ships target keywords + a populated FAQ as actual HTML text — required
 * since Vite SPAs render via JS and many crawlers (incl. AI bots) don't
 * execute JS fully.
 *
 * v0.11.25 — extended with `sport` prop. Each sport's hub mounts this
 * at the bottom of the page in place of its own free-text lede; the
 * lede + sections + FAQ all live here so the user lands on
 * scoreboard-first and the prose is below the fold for crawlers + the
 * curious. Sports: 'nba' (default), 'epl', 'f1', 'tennis'.
 */
export default function SEOContent({ lang = 'id', sport = 'nba' }) {
  const pack = CONTENT[sport] || CONTENT.nba;
  const content = lang === 'id' ? pack.id : pack.en;

  return (
    <section
      aria-label={lang === 'id' ? 'Tentang NBA Playoffs 2026' : 'About the 2026 NBA Playoffs'}
      style={{
        padding: '28px 24px',
        borderTop: `1px solid ${C.line}`,
        background: C.bg,
        color: C.text,
        fontSize: 12,
        lineHeight: 1.65,
      }}
    >
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema(content.faqs))}</script>
      </Helmet>

      {/* v0.11.12 — was <h1>. NBADashboard already carries a visually-
          hidden <h1> at the top of the page, so this SEO block's
          intro heading is demoted to <h2> to fix the "2 h1s per page"
          WCAG 1.3.1 defect. The JSON-LD structured data + the content
          itself are unchanged — only the tag. */}
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: C.text, letterSpacing: -0.3, marginBottom: 10 }}>
        {content.h1}
      </h2>
      <p style={{ color: C.dim, maxWidth: 820, marginBottom: 22 }}>{content.intro}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 24 }}>
        {content.sections.map((s, i) => (
          <div key={i}>
            <h2 style={{ fontSize: 13, color: C.text, fontWeight: 600, letterSpacing: 0.3, marginBottom: 6 }}>{s.heading}</h2>
            <p style={{ color: C.dim, fontSize: 11.5 }}>{s.body}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: C.text, fontWeight: 600, marginBottom: 10 }}>
        {content.faqHeading}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {content.faqs.map((q, i) => (
          <div key={i} style={{ borderLeft: `2px solid ${C.lineSoft}`, paddingLeft: 12 }}>
            <h3 style={{ fontSize: 11.5, color: C.text, fontWeight: 600, marginBottom: 4 }}>{q.q}</h3>
            <p style={{ fontSize: 11, color: C.dim }}>{q.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((f) => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a,
      },
    })),
  };
}

// v0.11.25 — multi-sport content packs. Each sport packs an idContent +
// enContent shape (h1, intro, sections, faqHeading, faqs). Mounted at
// the bottom of the corresponding sport hub via <SEOContent sport="…"/>.
// Keep FAQs realistic — populate at least 6 questions per sport.

const idContent = {
  h1: 'Skor NBA Playoffs 2026 Live — Dashboard Gila Bola',
  intro:
    'gibol.co adalah dashboard live untuk NBA Playoffs 2026. Kami menyajikan skor NBA live, peluang juara dari Polymarket, bracket Ronde 1, play-by-play, win probability, statistik pemain, laporan cedera, dan watchlist — semuanya dalam satu halaman yang update setiap 10–30 detik. Dibangun untuk pecinta bola basket Indonesia (gila bola) oleh Ade Sulistio Putra.',
  sections: [
    {
      heading: 'Skor Live NBA Hari Ini',
      body:
        'Semua laga NBA hari ini tampil di Papan Skor Live di bagian atas dashboard. Skor real-time ditarik langsung dari ESPN dan update setiap 30 detik. Tekan kartu laga untuk membuka panel fokus: win probability, play-by-play, box score, shot chart, dan statistik kuarter.',
    },
    {
      heading: 'Peluang Juara NBA 2026',
      body:
        'Peluang juara NBA 2026 ditarik langsung dari pasar prediksi Polymarket — pasar terbesar untuk NBA Champion. Thunder Oklahoma City saat ini unggulan dengan ~44%, diikuti Spurs 15%, Celtics 13%, Nuggets 9%. Volume total pasar tembus $475 juta. Odds update tiap 30 detik lewat WebSocket.',
    },
    {
      heading: 'Bracket Ronde 1 Lengkap',
      body:
        'Ronde 1 mulai 18 April 2026. Timur: Pistons (1) vs play-in (8), Cavaliers (4) vs Raptors (5), Knicks (3) vs Hawks (6), Celtics (2) vs 76ers (7). Barat: Thunder (1) vs play-in (8), Lakers (4) vs Rockets (5), Nuggets (3) vs Timberwolves (6), Spurs (2) vs Blazers (7). Format best-of-7. Finals tip-off 3 Juni di ABC.',
    },
    {
      heading: 'Pilih Tim Favorit Kamu',
      body:
        'Klik "Pilih tim favoritmu" di pojok kiri atas. Pilih dari 30 tim NBA. Dashboard akan berubah warna sesuai warna tim kamu, menampilkan jalan menuju juara (R1 → R2 → Conf Finals → Finals) dengan peluang tiap babak, serta memfilter feed akun utama dan berita ke tim kamu.',
    },
    {
      heading: 'Watchlist Pemain + Alert',
      body:
        'Tekan bintang di samping nama pemain mana pun untuk masuk watchlist. Dashboard akan menampilkan statistik live mereka (poin/rebound/assist) dan memberi alert saat mencetak 20/25/30/40/50+ poin, double-double, atau triple-double. Aktifkan notifikasi browser untuk alert real-time.',
    },
    {
      heading: 'Play-by-Play + Shot Chart',
      body:
        'Panel Fokus menampilkan play-by-play tiap permainan dengan scoring highlight warna tim, plus shot chart yang memetakan lokasi tembakan made dan missed di lapangan half-court. Statistik kuarter dan laporan cedera juga tersedia per laga.',
    },
  ],
  faqHeading: 'Pertanyaan yang Sering Diajukan',
  faqs: [
    {
      q: 'Kapan NBA Playoffs 2026 dimulai?',
      a: 'Play-in finale berlangsung 17 April 2026 (ORL vs CHA jam 7:30 PM ET, PHX vs GSW jam 10:00 PM ET). Ronde 1 resmi tip-off 18 April 2026. NBA Finals tip-off 3 Juni 2026 di ABC, format best-of-7.',
    },
    {
      q: 'Siapa favorit juara NBA 2026?',
      a: 'Per Polymarket, Oklahoma City Thunder unggulan juara dengan peluang ~44%. Spurs (15%), Celtics (13%), dan Nuggets (9%) mengekor. Thunder catatkan rekor reguler 64–18 musim ini.',
    },
    {
      q: 'Di mana nonton NBA Playoff 2026 di Indonesia?',
      a: 'NBA Playoff 2026 disiarkan live di Prime Video Indonesia (playoff games) dan beberapa laga di ABC/ESPN internasional. Jadwal siaran muncul per laga di dashboard gibol.co.',
    },
    {
      q: 'Apakah gibol.co gratis?',
      a: 'Ya, gibol.co 100% gratis. Tidak ada login, tidak ada paywall, tidak ada iklan di dalam dashboard. Data langsung dari ESPN dan Polymarket.',
    },
    {
      q: 'Kenapa bernama gibol?',
      a: '"Gibol" singkatan dari "gila bola" — slang Indonesia untuk pecinta olahraga yang maniak. Kami dibangun untuk audiens Indonesia yang gila bola basket.',
    },
    {
      q: 'Dashboard Formula 1 2026 kapan hadir?',
      a: 'Dashboard F1 2026 aktif April–Mei 2026 — jadwal balap, klasemen pembalap & konstruktor, serta live timing tiap GP. Musim FIA F1 2026 mulai 6 Maret di Australia, finale Abu Dhabi 6 Desember.',
    },
    {
      q: 'Dashboard Liga Inggris kapan hadir?',
      a: 'Dashboard Liga Inggris (Premier League 2025-26) akan aktif menjelang akhir April 2026 — klasemen, hasil, top skorer. Musim berjalan Agustus 2025 – Mei 2026.',
    },
    {
      q: 'Dashboard FIFA World Cup 2026 kapan?',
      a: 'Dashboard Piala Dunia FIFA 2026 akan aktif saat kickoff 11 Juni 2026. Mencakup 48 tim, 104 pertandingan, dan 16 kota tuan rumah di USA, Meksiko, dan Kanada.',
    },
    {
      q: 'Dashboard BRI Liga 1 Indonesia kapan hadir?',
      a: 'Dashboard Liga 1 Indonesia (BRI Super League) akan menyusul untuk musim 2026 — klasemen, jadwal, hasil Persija, Persib, dan 18 klub lainnya.',
    },
    {
      q: 'Dashboard IBL kapan launching?',
      a: 'Dashboard IBL (Liga Basket Indonesia) direncanakan menyusul untuk musim 2026–27. Cek halaman IBL di gibol.co untuk update.',
    },
  ],
};

const enContent = {
  h1: '2026 NBA Playoffs — Live Scores & Companion Dashboard',
  intro:
    'gibol.co is a live dashboard for the 2026 NBA Playoffs. Live scores, Polymarket championship odds, Round 1 bracket, play-by-play, win probability, player stats, injury report, and watchlist — all in one page, refreshed every 10–30 seconds. Built for Indonesian basketball fans (gila bola).',
  sections: [
    {
      heading: 'Live NBA Scores Today',
      body:
        'All today\'s NBA games appear in the Live Scoreboard at the top. Real-time scores pulled from ESPN, refreshed every 30 seconds. Tap any game card to open the Focus panel: win probability, play-by-play, box score, shot chart, quarter-by-quarter stats.',
    },
    {
      heading: '2026 NBA Championship Odds',
      body:
        'Championship odds come live from Polymarket — the largest prediction market for the NBA Champion. Oklahoma City Thunder currently favored at ~44%, followed by Spurs 15%, Celtics 13%, Nuggets 9%. Total market volume exceeds $475M. Odds update every 30s via WebSocket.',
    },
    {
      heading: 'Round 1 Bracket',
      body:
        'Round 1 starts April 18, 2026. East: Pistons (1) vs play-in (8), Cavaliers (4) vs Raptors (5), Knicks (3) vs Hawks (6), Celtics (2) vs 76ers (7). West: Thunder (1) vs play-in (8), Lakers (4) vs Rockets (5), Nuggets (3) vs Timberwolves (6), Spurs (2) vs Blazers (7). All series best-of-7. Finals tip-off June 3 on ABC.',
    },
    {
      heading: 'Pick Your Favorite Team',
      body:
        'Click "Pick your team" in the top bar. Choose from all 30 NBA teams. The dashboard themes in your team colors, shows your path to the title (R1 → R2 → Conf Finals → Finals) with per-round probabilities, and filters key accounts and stories to your team.',
    },
    {
      heading: 'Player Watchlist + Alerts',
      body:
        'Star any player to add them to your watchlist. Dashboard shows their live stat line (pts/reb/ast) and fires an alert when they hit 20/25/30/40/50+ points, a double-double, or triple-double. Enable browser notifications for real-time alerts.',
    },
    {
      heading: 'Play-by-Play + Shot Chart',
      body:
        'The Focus panel shows play-by-play with team-colored scoring highlights, plus a shot chart mapping made and missed shots on a half-court overlay. Quarter-by-quarter line scores and injury report also live per game.',
    },
  ],
  faqHeading: 'Frequently Asked Questions',
  faqs: [
    {
      q: 'When do the 2026 NBA Playoffs start?',
      a: 'The play-in finale is April 17, 2026 (ORL vs CHA 7:30 PM ET, PHX vs GSW 10:00 PM ET). Round 1 tips off April 18, 2026. NBA Finals tip-off June 3, 2026 on ABC, best-of-7.',
    },
    {
      q: 'Who is the 2026 NBA title favorite?',
      a: 'Per Polymarket, Oklahoma City Thunder is the title favorite at ~44%. Spurs (15%), Celtics (13%), and Nuggets (9%) follow. Thunder finished the regular season 64–18.',
    },
    {
      q: 'Is gibol.co free?',
      a: 'Yes, 100% free. No login, no paywall, no in-dashboard ads. Data flows direct from ESPN and Polymarket APIs.',
    },
    {
      q: 'What does "gibol" mean?',
      a: '"Gibol" is short for "gila bola" — Indonesian slang for a sports-obsessed fan. gibol.co is built for Indonesian basketball fans.',
    },
    {
      q: 'When does the Formula 1 2026 dashboard go live?',
      a: 'The F1 2026 dashboard ships late April 2026 — schedule, driver & constructor standings, and live timing. The FIA F1 2026 season runs March 6 (Australia) through December 6 (Abu Dhabi).',
    },
    {
      q: 'When does the Premier League dashboard go live?',
      a: 'The Premier League 2025-26 dashboard ships late April 2026 — table, fixtures, top scorers. Season runs August 2025 – May 2026.',
    },
    {
      q: 'When does the FIFA World Cup 2026 dashboard go live?',
      a: 'The World Cup 2026 dashboard activates at kickoff on June 11, 2026. Covers 48 teams, 104 matches, and 16 host cities across the USA, Mexico, and Canada.',
    },
    {
      q: 'When does the BRI Liga 1 Indonesia dashboard go live?',
      a: 'The Liga 1 Indonesia (BRI Super League) dashboard ships for the 2026 season — table, fixtures, results for Persija, Persib, and 18 other clubs.',
    },
    {
      q: 'When is the IBL dashboard launching?',
      a: 'The IBL (Indonesian Basketball League) dashboard is planned for the 2026–27 season. Check the IBL page on gibol.co for updates.',
    },
  ],
};

// ─── EPL ─────────────────────────────────────────────────────────────
const eplIdContent = {
  h1: 'Liga Inggris 2025-26 — Klasemen, Jadwal, Top Skor Live',
  intro:
    'Dashboard Liga Inggris (Premier League) 2025-26 dalam Bahasa Indonesia. Klasemen 20 klub dengan form 5 laga, jadwal pekan ini dalam WIB, hasil terbaru, ras Golden Boot, peluang juara dari Polymarket, dan halaman individual untuk tiap klub. 380 laga, Agustus 2025 – Mei 2026.',
  sections: [
    {
      heading: 'Klasemen Liga Inggris Live',
      body:
        'Klasemen 20 klub Premier League update tiap 30 detik dari ESPN — main, menang, seri, kalah, gol masuk, gol kebobolan, selisih gol, dan poin. Tabel mini di kolom kanan menampilkan top-4 (zona Liga Champions), top-6 (zona Eropa), dan tiga klub di zona degradasi.',
    },
    {
      heading: 'Jadwal Match-day WIB',
      body:
        'Jadwal pekan ini ditampilkan dalam Waktu Indonesia Barat (WIB, UTC+7). Geser tab tanggal untuk lihat hasil kemarin atau jadwal pekan depan. Tiap kartu menampilkan klub kandang dan tamu, jam kickoff WIB, dan peluang menang per klub dari Polymarket.',
    },
    {
      heading: 'Top Skor — Ras Golden Boot',
      body:
        'Top skor Premier League 2025-26 update live. Kolom Top Skor menampilkan 10 pencetak gol terbanyak dengan jumlah gol, klub, dan posisi. Sepatu Emas (Golden Boot) diberikan ke top skor di akhir musim setiap Mei.',
    },
    {
      heading: 'Pilih Klub Favoritmu',
      body:
        'Klik "Pilih klub kamu" di pojok kiri atas. Pilih dari 20 klub Premier League. Dashboard akan berubah warna sesuai warna klub kamu, memfilter berita ke klub itu, dan menampilkan akun resmi sosial media klub. Tiap klub punya halaman SEO sendiri di /premier-league-2025-26/club/{slug}.',
    },
    {
      heading: 'Peluang Juara Polymarket',
      body:
        'Peluang juara Premier League dari pasar prediksi Polymarket — pasar terbesar untuk EPL Champion. Volume pasar > $20 juta. Top-6 favorit ditampilkan dengan persentase update tiap 60 detik.',
    },
    {
      heading: 'Halaman Per Klub',
      body:
        'Tiap dari 20 klub Premier League punya halaman sendiri yang memuat klasemen mini, form 5 laga, jadwal pekan ini, hasil terbaru, top skor klub, dan akun resmi — semua dalam Bahasa Indonesia. Crawlable untuk Google dan optimal untuk SEO Bahasa.',
    },
  ],
  faqHeading: 'Pertanyaan yang Sering Diajukan',
  faqs: [
    {
      q: 'Klub mana favorit juara Premier League 2025-26?',
      a: 'Per Polymarket, Manchester City favorit juara Premier League 2025-26. Arsenal dan Liverpool mengekor di top-3. Persentase peluang update tiap 60 detik di kolom Peluang Juara.',
    },
    {
      q: 'Kapan musim Premier League 2025-26 selesai?',
      a: 'Musim 2025-26 berlangsung 16 Agustus 2025 – 24 Mei 2026. Total 380 laga, 38 pekan match-day. FA Cup final 16 Mei, Liga Champions final 30 Mei di Madrid.',
    },
    {
      q: 'Di mana nonton Premier League di Indonesia?',
      a: 'Premier League 2025-26 disiarkan live di Vidio (full season pass) dan beberapa laga tertentu di NET, K-Vision, dan TV berbayar lainnya. Cek jadwal siaran tiap pekan.',
    },
    {
      q: 'Jam berapa kickoff Premier League di WIB?',
      a: 'Kickoff Premier League di WIB umumnya: Sabtu sore 19:30 WIB (1 laga), Sabtu malam 22:00 WIB (3 laga), Minggu malam 20:00 / 22:30 WIB. Big match Sunday biasanya 23:30 WIB. Senin malam 03:00 WIB. Jadwal lengkap di kolom Scores & Schedule.',
    },
    {
      q: 'Apa itu Golden Boot Premier League?',
      a: 'Golden Boot (Sepatu Emas) adalah penghargaan untuk top skor Premier League di akhir musim. Pemenang ditentukan tiap Mei. Kolom Top Skor di dashboard menampilkan 10 pencetak gol terbanyak musim ini.',
    },
    {
      q: 'Kenapa beberapa laga ditampilkan dengan jam berbeda?',
      a: 'Premier League menggunakan jam Inggris (UK time, GMT/BST). Dashboard mengkonversi semua kickoff ke WIB (UTC+7). Selisih: 6 jam saat winter (Okt–Mar), 7 jam saat summer (Mar–Okt). Jadi laga 15:00 UK = 22:00 WIB winter, 21:00 WIB summer.',
    },
    {
      q: 'Apa itu zona Liga Champions dan zona degradasi?',
      a: 'Top-4 di akhir musim lolos ke Liga Champions UEFA. Posisi 5–6 lolos ke Liga Europa atau Liga Conference. Tiga klub paling bawah (posisi 18, 19, 20) terdegradasi ke Championship. Dashboard menandai tiga zona ini di tabel klasemen.',
    },
    {
      q: 'Apakah data live update otomatis?',
      a: 'Ya. Klasemen, hasil, dan jadwal update tiap 30 detik dari ESPN. Peluang juara update tiap 60 detik dari Polymarket. Tidak perlu refresh manual.',
    },
  ],
};

const eplEnContent = {
  h1: 'Premier League 2025-26 — Live Table, Fixtures, Top Scorers',
  intro:
    'Live Premier League 2025-26 dashboard in Bahasa Indonesia. 20-club table with 5-match form, this week\'s fixtures in WIB, latest results, the Golden Boot race, Polymarket title odds, and individual pages for every club. 380 matches, August 2025 – May 2026.',
  sections: [
    {
      heading: 'Live Premier League Table',
      body:
        '20-club Premier League table refreshed every 30 seconds from ESPN — played, won, drawn, lost, goals for, goals against, goal difference, points. Compact mini-table on the right column shows the top-4 (Champions League zone), top-6 (European zone), and three relegation-zone clubs.',
    },
    {
      heading: 'Match-day Schedule (WIB)',
      body:
        'This week\'s fixtures display in Western Indonesia Time (WIB, UTC+7). Swipe the date tabs to see yesterday\'s results or next week\'s fixtures. Each card shows home/away clubs, kickoff in WIB, and per-club Polymarket win odds.',
    },
    {
      heading: 'Top Scorers — Golden Boot Race',
      body:
        'Live 2025-26 Premier League top scorers. The Top Scorers panel lists the 10 leading goal-scorers with goals, club, and position. The Golden Boot is awarded to the season\'s top scorer in May.',
    },
    {
      heading: 'Pick Your Club',
      body:
        'Click "Pick your club" in the top bar. Choose from any of the 20 Premier League clubs. The dashboard themes to your club colors, filters news to that club, and surfaces the club\'s official social accounts. Every club has its own SEO page at /premier-league-2025-26/club/{slug}.',
    },
    {
      heading: 'Polymarket Title Odds',
      body:
        'Premier League title odds come from Polymarket prediction markets — the deepest market for EPL Champion. Volume above $20M. Top-6 favorites display with percentages refreshed every 60 seconds.',
    },
    {
      heading: 'Per-club Pages',
      body:
        'Each of the 20 Premier League clubs has its own page with mini-table, 5-match form, this week\'s fixtures, latest results, club top scorers, and official accounts — all in Bahasa Indonesia. Fully crawlable for Google and optimized for Bahasa SEO.',
    },
  ],
  faqHeading: 'Frequently Asked Questions',
  faqs: [
    {
      q: 'Who is the 2025-26 Premier League title favorite?',
      a: 'Per Polymarket, Manchester City is the title favorite for 2025-26. Arsenal and Liverpool sit in the chasing top-3. Live percentages refresh every 60 seconds in the Title Odds panel.',
    },
    {
      q: 'When does the 2025-26 Premier League season end?',
      a: 'The 2025-26 season runs August 16, 2025 – May 24, 2026. 380 matches across 38 match-weeks. FA Cup final May 16, Champions League final May 30 in Madrid.',
    },
    {
      q: 'Where to watch the Premier League in Indonesia?',
      a: 'Premier League 2025-26 streams live on Vidio (full season pass) plus select matches on NET, K-Vision, and other paid TV partners. Check weekly broadcast schedules.',
    },
    {
      q: 'What time do Premier League matches kick off in WIB?',
      a: 'Typical WIB kickoffs: Saturday 19:30 WIB (1 match), Saturday evening 22:00 WIB (3 matches), Sunday evening 20:00 / 22:30 WIB. Sunday Big Match usually 23:30 WIB. Monday Night Football 03:00 WIB. Full schedule in the Scores & Schedule strip.',
    },
    {
      q: 'What is the Premier League Golden Boot?',
      a: 'The Golden Boot is awarded to the Premier League top scorer at season end. Winner declared in May. The Top Scorers panel shows the 10 leading goal-scorers this season.',
    },
    {
      q: 'Why do some matches show different times?',
      a: 'The Premier League runs on UK time (GMT/BST). The dashboard converts every kickoff to WIB (UTC+7). Offset: 6 hours in UK winter (Oct–Mar), 7 hours in UK summer (Mar–Oct). So 15:00 UK = 22:00 WIB in winter, 21:00 WIB in summer.',
    },
    {
      q: 'What are Champions League and relegation zones?',
      a: 'Top-4 at season end qualify for the UEFA Champions League. Positions 5–6 enter the Europa League or Conference League. Bottom three clubs (18, 19, 20) are relegated to the Championship. The dashboard highlights all three zones in the table.',
    },
    {
      q: 'Does live data refresh automatically?',
      a: 'Yes. Table, results, and fixtures refresh every 30 seconds from ESPN. Title odds refresh every 60 seconds from Polymarket. No manual refresh needed.',
    },
  ],
};

// ─── F1 ──────────────────────────────────────────────────────────────
const f1IdContent = {
  h1: 'Formula 1 2026 — Klasemen, Jadwal 23 GP, Hasil Live',
  intro:
    'Dashboard Formula 1 2026 dalam Bahasa Indonesia. Klasemen pembalap dan konstruktor live, kalender 23 Grand Prix dengan jam start WIB, hasil tiap balapan, podium, dan tracking juara dari Polymarket. Regulasi chassis + power unit baru musim 2026, Audi & Cadillac gabung — musim paling seru dalam dekade.',
  sections: [
    {
      heading: 'Klasemen Pembalap & Konstruktor',
      body:
        'Klasemen pembalap menampilkan 20+ pembalap dengan poin musim ini, kemenangan, podium, dan posisi. Klasemen konstruktor menampilkan 11 tim dengan total poin gabungan kedua pembalap. Update setelah tiap race weekend.',
    },
    {
      heading: 'Kalender 23 GP (WIB)',
      body:
        'Kalender F1 2026 berisi 23 Grand Prix dari Bahrain (8 Maret) hingga Abu Dhabi (29 November). Tiap GP menampilkan jam start race dalam WIB, sirkuit, jumlah lap, dan jarak race. Geser kalender untuk lihat round detail dengan grid awal dan hasil race.',
    },
    {
      heading: 'Tim 2026 — 11 Konstruktor',
      body:
        'Musim 2026 adalah musim historis: regulasi chassis + power unit baru. Audi (chassis Sauber + PU sendiri) dan Cadillac/General Motors (chassis Andretti + PU GM) gabung sebagai tim ke-11. Tim lain: Red Bull, McLaren, Ferrari, Mercedes, Williams, Alpine, Aston Martin, RB (Racing Bulls), Haas, Sauber-Audi.',
    },
    {
      heading: 'Hasil Race + Podium',
      body:
        'Setelah tiap balapan, dashboard menampilkan podium 1-2-3, fastest lap, plus hasil lengkap top 10 dengan poin yang didapat. Poin: P1=25, P2=18, P3=15, P4=12, P5=10, P6=8, P7=6, P8=4, P9=2, P10=1, fastest lap (jika top-10) +1.',
    },
    {
      heading: 'Peluang Juara Polymarket',
      body:
        'Peluang juara F1 2026 dari pasar Polymarket update live tiap 60 detik. Pasar terbesar untuk F1 World Champion. Top-6 favorit pembalap dan konstruktor ditampilkan dengan persentase real-time.',
    },
    {
      heading: 'Pilih Tim atau Pembalap Favorit',
      body:
        'Klik "Pilih tim kamu" untuk filter dashboard ke konstruktor favorit. Tiap pembalap dan tim punya halaman sendiri di /formula-1-2026/driver/{slug} dan /formula-1-2026/team/{slug}.',
    },
  ],
  faqHeading: 'Pertanyaan yang Sering Diajukan',
  faqs: [
    {
      q: 'Siapa juara F1 2025?',
      a: 'Lando Norris memenangi F1 World Championship 2025 untuk McLaren. McLaren juga memenangi Constructors Championship untuk pertama kali sejak 1998.',
    },
    {
      q: 'Kapan F1 2026 mulai?',
      a: 'Musim F1 2026 mulai 6 Maret 2026 di Sakhir, Bahrain. Total 23 Grand Prix sampai 29 November 2026 di Abu Dhabi.',
    },
    {
      q: 'Apa yang baru di regulasi 2026?',
      a: 'Regulasi 2026 mengenalkan power unit baru (50% listrik, fuel sustainable 100%, MGU-K lebih bertenaga, MGU-H dihapus), chassis baru lebih kecil + ringan, sayap aktif untuk drag reduction. Audi dan Cadillac gabung sebagai tim baru.',
    },
    {
      q: 'Tim mana yang baru di 2026?',
      a: 'Audi (resmi rebrand dari Sauber) dan Cadillac/General Motors (sebelumnya proyek Andretti, sekarang berbendera GM) gabung sebagai tim ke-11. Total 11 konstruktor di 2026, 22 pembalap.',
    },
    {
      q: 'Di mana nonton F1 2026 di Indonesia?',
      a: 'F1 2026 disiarkan live di Mola TV (semua sesi: practice, qualifying, race) dan F1 TV Pro untuk akses langsung dari FOM. Beberapa GP juga di RCTI/MNCTV/iNews.',
    },
    {
      q: 'Apa itu Sprint Race?',
      a: 'Sprint Race adalah balapan pendek 100 km (sekitar 1/3 distance race normal) yang berlangsung Sabtu, sebelum race utama Minggu. Poin sprint: P1=8, P2=7, ..., P8=1. Musim 2026 ada 6 Sprint Weekend.',
    },
    {
      q: 'Sirkuit baru di kalender 2026?',
      a: 'Madrid Grand Prix (sirkuit Madring di IFEMA) menggantikan Spanish GP di Catalunya. Imola dan Monaco tetap. Total kalender naik dari 24 (2024) ke 23 (2026) dengan rotasi sirkuit Eropa.',
    },
    {
      q: 'Jam berapa F1 di WIB?',
      a: 'Jam start race bervariasi per zona waktu sirkuit. WIB konversi tipikal: Eropa siang = 21:00–22:00 WIB, Amerika malam = 02:00–04:00 WIB hari Senin pagi, Asia/Australia siang = 12:00–17:00 WIB. Jadwal lengkap di kalender dashboard.',
    },
  ],
};

const f1EnContent = {
  h1: 'Formula 1 2026 — Driver Standings, 23-GP Calendar, Live Results',
  intro:
    'Live Formula 1 2026 dashboard in Bahasa Indonesia. Driver and constructor standings, 23-GP calendar with WIB start times, per-race results, podiums, and Polymarket title tracking. New chassis + power unit regulations for 2026, Audi & Cadillac join — most compelling F1 season in a decade.',
  sections: [
    {
      heading: 'Driver & Constructor Standings',
      body:
        'Driver standings show 20+ drivers with season points, wins, podiums, and position. Constructor standings show 11 teams with combined points from both drivers. Updated after each race weekend.',
    },
    {
      heading: '23-GP Calendar (WIB)',
      body:
        'F1 2026 calendar runs 23 Grands Prix from Bahrain (March 8) to Abu Dhabi (November 29). Each GP shows race start time in WIB, circuit, lap count, and race distance. Swipe the calendar for round detail with grid and full race results.',
    },
    {
      heading: '11 Teams in 2026',
      body:
        '2026 is a historic season: new chassis + power unit regulations. Audi (Sauber chassis + own PU) and Cadillac/General Motors (Andretti chassis + GM PU) join as the 11th team. Other teams: Red Bull, McLaren, Ferrari, Mercedes, Williams, Alpine, Aston Martin, RB (Racing Bulls), Haas, Sauber-Audi.',
    },
    {
      heading: 'Race Results + Podium',
      body:
        'After each race, the dashboard shows the 1-2-3 podium, fastest lap, and full top-10 with points awarded. Points: P1=25, P2=18, P3=15, P4=12, P5=10, P6=8, P7=6, P8=4, P9=2, P10=1, fastest lap (if top-10) +1.',
    },
    {
      heading: 'Polymarket Title Odds',
      body:
        'F1 2026 title odds from Polymarket update live every 60 seconds — the deepest market for F1 World Champion. Top-6 driver and constructor favorites display with real-time percentages.',
    },
    {
      heading: 'Pick Your Team or Driver',
      body:
        'Click "Pick your team" to filter the dashboard to your favorite constructor. Every driver and team has its own page at /formula-1-2026/driver/{slug} and /formula-1-2026/team/{slug}.',
    },
  ],
  faqHeading: 'Frequently Asked Questions',
  faqs: [
    {
      q: 'Who won the 2025 F1 World Championship?',
      a: 'Lando Norris won the 2025 F1 World Championship for McLaren. McLaren also clinched the Constructors Championship — their first since 1998.',
    },
    {
      q: 'When does F1 2026 begin?',
      a: 'The F1 2026 season starts March 6, 2026 in Sakhir, Bahrain. 23 Grands Prix run through November 29, 2026 in Abu Dhabi.',
    },
    {
      q: 'What are the 2026 regulation changes?',
      a: '2026 introduces new power units (50% electric, 100% sustainable fuels, more powerful MGU-K, MGU-H removed), new smaller + lighter chassis, and active wings for drag reduction. Audi and Cadillac join as new teams.',
    },
    {
      q: 'Which teams are new in 2026?',
      a: 'Audi (rebranded from Sauber) and Cadillac/General Motors (previously the Andretti project, now under GM) join as the 11th team. 11 constructors and 22 drivers in 2026.',
    },
    {
      q: 'Where to watch F1 2026 in Indonesia?',
      a: 'F1 2026 streams live on Mola TV (all sessions: practice, qualifying, race) and F1 TV Pro direct from FOM. Selected races also on RCTI, MNCTV, and iNews.',
    },
    {
      q: 'What is a Sprint Race?',
      a: 'A Sprint Race is a short 100 km race (about 1/3 of a normal race distance) held on Saturday before the main Sunday race. Sprint points: P1=8, P2=7, ..., P8=1. The 2026 season has 6 Sprint Weekends.',
    },
    {
      q: 'New circuits in 2026?',
      a: 'Madrid Grand Prix (Madring circuit at IFEMA) replaces the Spanish GP in Catalunya. Imola and Monaco remain. Calendar size adjusts from 24 (2024) to 23 (2026) with European circuit rotation.',
    },
    {
      q: 'What time are F1 races in WIB?',
      a: 'Race start times vary by circuit time zone. Typical WIB conversions: European afternoon = 21:00–22:00 WIB, Americas night = 02:00–04:00 WIB Monday morning, Asia/Australia afternoon = 12:00–17:00 WIB. Full schedule in the calendar.',
    },
  ],
};

// ─── Tennis ──────────────────────────────────────────────────────────
const tennisIdContent = {
  h1: 'Tenis 2026 — Grand Slam, Masters 1000, ATP & WTA Finals',
  intro:
    'Dashboard Tenis 2026 dalam Bahasa Indonesia. 4 Grand Slam, ATP Masters 1000, WTA 1000, dan Year-End Finals. Jadwal turnamen WIB, undian live, peringkat ATP + WTA, sorotan petenis Indonesia (Aldila Sutjiadi, Priska Nugroho, Christopher Rungkat), dan peluang juara dari pasar prediksi.',
  sections: [
    {
      heading: 'Grand Slam — 4 Major',
      body:
        'Empat Grand Slam tahun 2026: Australian Open (18 Jan – 1 Feb, Melbourne), Roland Garros / French Open (24 Mei – 7 Jun, Paris), Wimbledon (29 Jun – 12 Jul, London), US Open (31 Agu – 13 Sep, New York). Tiap Grand Slam berlangsung 2 minggu dengan format best-of-5 (putra) dan best-of-3 (putri).',
    },
    {
      heading: 'ATP Masters 1000 + WTA 1000',
      body:
        '9 ATP Masters 1000 (Indian Wells, Miami, Monte Carlo, Madrid, Roma, Kanada, Cincinnati, Shanghai, Paris). 10 WTA 1000 (Doha, Indian Wells, Miami, Madrid, Roma, Toronto, Cincinnati, Beijing, Wuhan, Guadalajara). Pemain top dunia wajib main, kecuali ada cedera.',
    },
    {
      heading: 'Year-End Finals',
      body:
        'ATP Finals (Turin, 8–15 Nov) untuk 8 pemain top musim ini. WTA Finals (Riyadh, 1–8 Nov) untuk 8 pemain putri top. Kedua turnamen ini menutup musim tenis dan membagikan poin terbesar setelah Grand Slam.',
    },
    {
      heading: 'Petenis Indonesia',
      body:
        'Sorotan petenis Indonesia di tour internasional. Aldila Sutjiadi aktif di WTA tour, fokus ganda. Priska Nugroho di sirkuit ITF + WTA. Christopher Rungkat di ATP doubles. Klik picker pemain untuk filter dashboard ke petenis favorit.',
    },
    {
      heading: 'Peringkat ATP + WTA',
      body:
        'Peringkat ATP (putra) dan WTA (putri) update tiap pekan setelah turnamen selesai. Top 100 ditampilkan dengan poin, negara, dan turnamen kunci. Points musim 2026 di-reset Januari.',
    },
    {
      heading: 'Format Skor Tenis',
      body:
        'Set: pertama yang menang 6 game, harus selisih 2. Tie-break di 6-6 (kecuali Grand Slam set deciding). Game: 15-30-40-game, must lead by 2. Match: best-of-5 set di Grand Slam putra, best-of-3 untuk semua tour lain.',
    },
  ],
  faqHeading: 'Pertanyaan yang Sering Diajukan',
  faqs: [
    {
      q: 'Siapa juara Grand Slam 2025?',
      a: 'Australian Open 2025: Jannik Sinner (putra), Madison Keys (putri). Roland Garros 2025: Carlos Alcaraz (putra), Coco Gauff (putri). Wimbledon 2025: Jannik Sinner (putra), Iga Swiatek (putri). US Open 2025: Carlos Alcaraz (putra), Aryna Sabalenka (putri).',
    },
    {
      q: 'Kapan Australian Open 2026 main?',
      a: 'Australian Open 2026 berlangsung 18 Januari – 1 Februari 2026 di Melbourne Park, Australia. Final putra Minggu 1 Feb, final putri Sabtu 31 Jan.',
    },
    {
      q: 'Di mana nonton tenis di Indonesia?',
      a: 'Grand Slam disiarkan di Vidio (Australian Open + Roland Garros), TNT Sports (Wimbledon), dan ESPN/beIN Sports (US Open). Tour utama (ATP + WTA Masters) di Tennis Channel via streaming.',
    },
    {
      q: 'Petenis Indonesia siapa di tour profesional?',
      a: 'Aldila Sutjiadi (WTA, ganda), Priska Nugroho (ITF + WTA singles), Christopher Rungkat (ATP doubles), dan Justin Barki (ATP juniors). Sorotan harian di kolom "Petenis Indonesia" dashboard.',
    },
    {
      q: 'Apa itu Masters 1000?',
      a: 'Masters 1000 adalah 9 turnamen ATP paling prestisius setelah Grand Slam. Pemenang dapat 1000 poin ranking. Pemain top 30 wajib main (dengan pengecualian cedera). Sama: WTA 1000 untuk putri, 10 turnamen.',
    },
    {
      q: 'Bagaimana cara kualifikasi ATP / WTA Finals?',
      a: 'ATP Finals: 8 pemain dengan poin terbanyak musim itu (Race to Turin). WTA Finals: 8 pemain dengan poin terbanyak (Race to Riyadh). Round-robin format, 2 grup 4 pemain, top-2 lolos ke semifinal.',
    },
    {
      q: 'Berapa hadiah uang Grand Slam?',
      a: 'Hadiah juara Grand Slam 2025: Australian Open AUD 3,5 juta (~Rp 36 miliar), Roland Garros €2,55 juta (~Rp 44 miliar), Wimbledon £3,0 juta (~Rp 60 miliar), US Open USD 5,0 juta (~Rp 80 miliar). Hadiah 2026 naik ~5–10% per turnamen.',
    },
    {
      q: 'Apa beda ATP dan WTA?',
      a: 'ATP (Association of Tennis Professionals) mengelola sirkuit putra. WTA (Women\'s Tennis Association) mengelola sirkuit putri. Grand Slam dikelola ITF (International Tennis Federation), gabungan putra + putri di event yang sama.',
    },
  ],
};

const tennisEnContent = {
  h1: 'Tennis 2026 — Grand Slams, Masters 1000, ATP & WTA Finals',
  intro:
    'Live Tennis 2026 dashboard in Bahasa Indonesia. 4 Grand Slams, ATP Masters 1000, WTA 1000, and Year-End Finals. Tournament schedules in WIB, live draws, ATP + WTA rankings, Indonesian player spotlights (Aldila Sutjiadi, Priska Nugroho, Christopher Rungkat), and championship odds from prediction markets.',
  sections: [
    {
      heading: 'The Four Grand Slams',
      body:
        '2026 Grand Slams: Australian Open (Jan 18 – Feb 1, Melbourne), Roland Garros / French Open (May 24 – Jun 7, Paris), Wimbledon (Jun 29 – Jul 12, London), US Open (Aug 31 – Sep 13, New York). Each Slam runs two weeks. Best-of-5 (men), best-of-3 (women).',
    },
    {
      heading: 'ATP Masters 1000 + WTA 1000',
      body:
        '9 ATP Masters 1000 events (Indian Wells, Miami, Monte Carlo, Madrid, Rome, Canada, Cincinnati, Shanghai, Paris). 10 WTA 1000 events (Doha, Indian Wells, Miami, Madrid, Rome, Toronto, Cincinnati, Beijing, Wuhan, Guadalajara). Top players are required to enter unless injured.',
    },
    {
      heading: 'Year-End Finals',
      body:
        'ATP Finals (Turin, Nov 8–15) for the 8 top men. WTA Finals (Riyadh, Nov 1–8) for the 8 top women. Both close the season and award the most points after Grand Slams.',
    },
    {
      heading: 'Indonesian Players',
      body:
        'Indonesian players on the international tour. Aldila Sutjiadi competes on the WTA tour, doubles focus. Priska Nugroho on ITF + WTA singles. Christopher Rungkat in ATP doubles. Use the player picker to filter the dashboard to your favorite.',
    },
    {
      heading: 'ATP + WTA Rankings',
      body:
        'ATP (men\'s) and WTA (women\'s) rankings update weekly after tournaments conclude. Top 100 displayed with points, country, and key tournaments. 2026 season points reset in January.',
    },
    {
      heading: 'Tennis Scoring Format',
      body:
        'Set: first to 6 games, must lead by 2. Tie-break at 6-6 (except Grand Slam deciding sets). Game: 15-30-40-game, must lead by 2. Match: best-of-5 sets at men\'s Grand Slams, best-of-3 for all other tour events.',
    },
  ],
  faqHeading: 'Frequently Asked Questions',
  faqs: [
    {
      q: 'Who won the 2025 Grand Slams?',
      a: '2025 Australian Open: Jannik Sinner (men), Madison Keys (women). Roland Garros 2025: Carlos Alcaraz (men), Coco Gauff (women). Wimbledon 2025: Jannik Sinner (men), Iga Swiatek (women). US Open 2025: Carlos Alcaraz (men), Aryna Sabalenka (women).',
    },
    {
      q: 'When is the 2026 Australian Open?',
      a: 'The 2026 Australian Open runs January 18 – February 1, 2026 at Melbourne Park. Men\'s final Sunday Feb 1, women\'s final Saturday Jan 31.',
    },
    {
      q: 'Where to watch tennis in Indonesia?',
      a: 'Grand Slams stream on Vidio (Australian Open + Roland Garros), TNT Sports (Wimbledon), and ESPN / beIN Sports (US Open). Main tour (ATP + WTA Masters) on the Tennis Channel via streaming.',
    },
    {
      q: 'Who are Indonesia\'s pro tennis players?',
      a: 'Aldila Sutjiadi (WTA, doubles), Priska Nugroho (ITF + WTA singles), Christopher Rungkat (ATP doubles), and Justin Barki (ATP juniors). Daily spotlight in the dashboard\'s "Indonesian Players" panel.',
    },
    {
      q: 'What is a Masters 1000?',
      a: 'Masters 1000 events are the 9 most prestigious ATP tournaments after Grand Slams. Winners earn 1000 ranking points. Top-30 players are required to enter (injury exceptions apply). The WTA equivalent is WTA 1000 — 10 women\'s events.',
    },
    {
      q: 'How do players qualify for the ATP / WTA Finals?',
      a: 'ATP Finals: 8 players with the most season points (Race to Turin). WTA Finals: 8 players with the most points (Race to Riyadh). Round-robin format, two groups of 4, top-2 advance to semifinals.',
    },
    {
      q: 'How much prize money do Grand Slams pay?',
      a: '2025 winner prizes: Australian Open AUD 3.5M (~Rp 36B), Roland Garros €2.55M (~Rp 44B), Wimbledon £3.0M (~Rp 60B), US Open USD 5.0M (~Rp 80B). 2026 prize money rises ~5–10% per tournament.',
    },
    {
      q: 'What\'s the difference between ATP and WTA?',
      a: 'ATP (Association of Tennis Professionals) governs the men\'s tour. WTA (Women\'s Tennis Association) governs the women\'s tour. Grand Slams are run by the ITF (International Tennis Federation), combining men\'s + women\'s in the same event.',
    },
  ],
};

// ─── Super League Indonesia (Liga 1) content ────────────────────────
const superLeagueIdContent = {
  h1: 'Super League Indonesia 2025-26 — Klasemen, Jadwal, Hasil Live',
  intro:
    'Dashboard Super League Indonesia (sebelumnya BRI Liga 1) musim 2025-26 dalam Bahasa Indonesia. Klasemen 18 klub dengan form 5 laga, jadwal pekan ini dalam WIB, hasil terbaru, plus halaman tiap klub. 306 laga, Agustus 2025 – Mei 2026.',
  sections: [
    {
      heading: 'Klasemen Super League Live',
      body:
        'Klasemen 18 klub Super League update tiap 60 detik dari ESPN — main, menang, seri, kalah, gol masuk, gol kebobolan, selisih gol, dan poin. Tabel menandai zona AFC Champions League Elite (juara), zona kualifikasi AFC, zona play-off degradasi (peringkat 16), dan zona degradasi langsung (peringkat 17–18).',
    },
    {
      heading: 'Jadwal Match-day WIB',
      body:
        'Jadwal pekan ini ditampilkan dalam Waktu Indonesia Barat (WIB, UTC+7). Geser tab tanggal untuk lihat hasil kemarin atau jadwal pekan depan. Tiap kartu menampilkan klub kandang dan tamu, jam kickoff WIB, status live (menit jalan), atau full time.',
    },
    {
      heading: 'El Clasico Indonesia · Persija vs Persib',
      body:
        'Rivalitas terbesar Indonesia. Persija Jakarta lawan Persib Bandung dimainkan dua kali per musim — selalu jadi laga dengan rating TV tertinggi. Klik klub di klasemen untuk lihat detail head-to-head, jadwal derby, dan halaman SEO per klub.',
    },
    {
      heading: 'Pilih Klub Favoritmu',
      body:
        'Klik "Pilih klub kamu" di bar atas. Pilih dari 18 klub Super League — Persija, Persib, Persebaya, Arema, Bali United, PSM Makassar, Borneo, Madura United, Dewa United, Malut United, PSBS Biak, PSIM, Persijap, Persik, Persis, Persita, Semen Padang, Bhayangkara. Dashboard akan highlight klub kamu di klasemen dan tampilkan stat ringkas. Tiap klub punya halaman SEO sendiri di /super-league-2025-26/club/{slug}.',
    },
    {
      heading: 'Halaman Per Klub',
      body:
        'Tiap dari 18 klub Super League punya halaman sendiri yang memuat klasemen mini, form 5 laga, jadwal pekan ini, hasil terbaru, dan info kandang — semua dalam Bahasa Indonesia. Crawlable untuk Google dan optimal untuk SEO Bahasa pencarian "klasemen [nama klub]" atau "jadwal [nama klub]".',
    },
    {
      heading: 'Update Otomatis',
      body:
        'Klasemen, hasil, dan jadwal update tiap 60 detik dari ESPN. Tidak perlu refresh manual. Ketika ada laga live, status menit jalan diperbarui langsung di kartu jadwal.',
    },
  ],
  faqHeading: 'Pertanyaan yang Sering Diajukan',
  faqs: [
    {
      q: 'Klub mana favorit juara Super League 2025-26?',
      a: 'Per klasemen terkini, Persib Bandung memimpin sebagai favorit juara — pertahankan gelar juara dua musim beruntun (2023-24, 2024-25). Persija, Borneo FC, dan Bali United jadi pesaing utama. Cek klasemen live di atas untuk update terbaru.',
    },
    {
      q: 'Kapan musim Super League Indonesia 2025-26 selesai?',
      a: 'Musim 2025-26 berlangsung 8 Agustus 2025 – 31 Mei 2026. Total 306 laga, 34 pekan match-day. Format: setiap klub main 34 laga (home + away). Juara dapat tiket AFC Champions League Elite.',
    },
    {
      q: 'Di mana nonton Super League Indonesia?',
      a: 'Super League 2025-26 disiarkan live di Vidio (full season pass) sebagai pemegang hak siar utama. Beberapa laga big-match juga disiarkan di Indosiar dan SCTV. Cek jadwal siaran tiap pekan di kolom Jadwal & Hasil.',
    },
    {
      q: 'Jam berapa kickoff Super League?',
      a: 'Kickoff Super League umumnya: laga sore 15:30 WIB, laga malam 19:30 WIB. Big match weekend (Persija vs Persib, derby Jawa Timur) biasanya 20:30 WIB di Sabtu atau Minggu malam. Jadwal lengkap di kolom Jadwal & Hasil di atas.',
    },
    {
      q: 'Apa beda Super League dan Liga 1?',
      a: 'Super League adalah nama baru kompetisi mulai musim 2025-26 — sebelumnya bernama BRI Liga 1, dan sebelumnya lagi Liga 1, Indonesia Super League (ISL), dan seterusnya. Format dan klub-klubnya sama, hanya rebranding. Banyak fans masih menyebut "Liga 1".',
    },
    {
      q: 'Apa itu zona degradasi Super League?',
      a: 'Tiga klub paling bawah masuk zona degradasi. Peringkat 17 dan 18 turun langsung ke Liga 2. Peringkat 16 main play-off degradasi melawan tim peringkat 4 dari Liga 2. Dashboard menandai zona-zona ini dengan strip warna di kolom paling kiri tabel klasemen.',
    },
    {
      q: 'Klub mana yang main di Liga Champions Asia (AFC)?',
      a: 'Juara Super League 2025-26 lolos langsung ke AFC Champions League Elite. Peringkat 2-4 lolos ke AFC Champions League Two atau play-off (sesuai kuota Indonesia di kompetisi AFC tahun depan, biasanya 2-3 slot total). Dashboard menandai zona AFC dengan warna biru.',
    },
    {
      q: 'Apakah data live update otomatis?',
      a: 'Ya. Klasemen, hasil, dan jadwal update tiap 60 detik dari ESPN. Tidak perlu refresh halaman manual.',
    },
  ],
};

const superLeagueEnContent = {
  h1: 'Indonesian Super League 2025-26 — Live Standings, Fixtures, Results',
  intro:
    'Indonesian Super League (formerly BRI Liga 1) 2025-26 dashboard. 18-club standings with last-5 form, this week\'s fixtures in WIB, latest results, plus a per-club page for every team. 306 matches, August 2025 – May 2026.',
  sections: [
    {
      heading: 'Live Super League Standings',
      body:
        'Live 18-club standings updated every 60 seconds from ESPN — played, won, drawn, lost, goals for, goals against, goal difference, and points. Zones marked: champion (AFC CL Elite), AFC qualification, relegation play-off (16th), direct relegation (17th–18th).',
    },
    {
      heading: 'Match-day Fixtures in WIB',
      body:
        'This week\'s fixtures shown in Western Indonesian Time (WIB, UTC+7). Swipe day tabs to see yesterday\'s results or next week\'s schedule. Each card shows home + away clubs, kickoff time, live status (current minute), or full time.',
    },
    {
      heading: 'El Clasico Indonesia · Persija vs Persib',
      body:
        'Indonesia\'s biggest rivalry. Persija Jakarta vs Persib Bandung is played twice per season — always the highest-rated TV match. Click any club in the standings for head-to-head, derby fixtures, and the per-club SEO page.',
    },
    {
      heading: 'Pick Your Club',
      body:
        'Click "Pick your club" in the toolbar. Choose from all 18 Super League clubs — Persija, Persib, Persebaya, Arema, Bali United, PSM Makassar, Borneo, Madura United, Dewa United, Malut United, PSBS Biak, PSIM, Persijap, Persik, Persis, Persita, Semen Padang, Bhayangkara. The dashboard highlights your club in the standings. Each club has its own SEO page at /super-league-2025-26/club/{slug}.',
    },
    {
      heading: 'Per-club Pages',
      body:
        'Every Super League club has its own page with mini standing, last-5 form, this week\'s fixtures, latest results, and home stadium info — all in Bahasa. Crawlable for Google, optimized for Bahasa SEO queries like "klasemen [club]" or "jadwal [club]".',
    },
    {
      heading: 'Auto-updating Data',
      body:
        'Standings, results, and fixtures refresh every 60 seconds from ESPN. No manual refresh needed. Live match status (current minute) updates directly on fixture cards while a match is in progress.',
    },
  ],
  faqHeading: 'Frequently Asked Questions',
  faqs: [
    {
      q: 'Who\'s favorite to win the 2025-26 Indonesian Super League?',
      a: 'Per current standings, Persib Bandung leads as title favorites — defending two consecutive championships (2023-24, 2024-25). Persija, Borneo FC, and Bali United are the main challengers. Check the live standings above for the latest.',
    },
    {
      q: 'When does the 2025-26 Indonesian Super League season end?',
      a: 'The 2025-26 season runs August 8, 2025 – May 31, 2026. 306 total matches across 34 match-day rounds. Format: each club plays 34 games (home + away). The champion qualifies directly for AFC Champions League Elite.',
    },
    {
      q: 'Where can I watch the Indonesian Super League?',
      a: 'The 2025-26 Super League is broadcast live on Vidio (full season pass) as the primary rights holder. Selected big matches also air on Indosiar and SCTV. Check the broadcast schedule each week.',
    },
    {
      q: 'What time do Super League matches kick off?',
      a: 'Standard kickoffs are 15:30 WIB (afternoon) and 19:30 WIB (evening). Big-match weekends (Persija vs Persib, East Java derbies) typically 20:30 WIB on Saturday or Sunday night. Full schedule in the Fixtures section above.',
    },
    {
      q: 'What\'s the difference between Super League and Liga 1?',
      a: 'Super League is the rebranded name starting in 2025-26 — previously BRI Liga 1, before that Liga 1, ISL, and so on. The format and clubs are the same — only the branding changed. Many fans still call it "Liga 1".',
    },
    {
      q: 'How does relegation work in the Super League?',
      a: 'Bottom three clubs enter the relegation zone. 17th and 18th drop directly to Liga 2. 16th plays a relegation play-off against the 4th-place team in Liga 2. The dashboard marks these zones with colored strips in the standings table.',
    },
    {
      q: 'Which clubs play in the AFC Champions League?',
      a: 'The 2025-26 Super League champion qualifies directly for AFC Champions League Elite. 2nd-4th place teams enter AFC Champions League Two or play-off (depending on Indonesia\'s AFC slot allocation, typically 2-3 total slots). Dashboard marks AFC zones in blue.',
    },
    {
      q: 'Does the data update automatically?',
      a: 'Yes. Standings, results, and fixtures refresh every 60 seconds from ESPN. No manual page refresh needed.',
    },
  ],
};

// ─── CONTENT registry ────────────────────────────────────────────────
const CONTENT = {
  nba:            { id: idContent,             en: enContent },
  epl:            { id: eplIdContent,          en: eplEnContent },
  f1:             { id: f1IdContent,           en: f1EnContent },
  tennis:         { id: tennisIdContent,       en: tennisEnContent },
  'super-league': { id: superLeagueIdContent,  en: superLeagueEnContent },
};
