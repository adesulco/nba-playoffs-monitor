import React from 'react';
import { Helmet } from 'react-helmet-async';
import { COLORS as C } from '../lib/constants.js';

/**
 * Crawlable Bahasa + English content block for Google and AI search.
 * Sits at the bottom of the NBA dashboard, visible but low-profile.
 * Ships target keywords (skor basket, skor playoff NBA, peluang juara,
 * jadwal NBA, etc) as actual HTML text — required since Vite SPAs
 * render via JS and many crawlers (including AI bots) don't execute
 * JS fully.
 */
export default function SEOContent({ lang = 'id' }) {
  const content = lang === 'id' ? idContent : enContent;

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

      <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 600, color: C.text, letterSpacing: -0.3, marginBottom: 10 }}>
        {content.h1}
      </h1>
      <p style={{ color: C.dim, maxWidth: 820, marginBottom: 22 }}>{content.intro}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 24 }}>
        {content.sections.map((s, i) => (
          <div key={i}>
            <h2 style={{ fontSize: 13, color: C.text, fontWeight: 600, letterSpacing: 0.3, marginBottom: 6 }}>{s.heading}</h2>
            <p style={{ color: C.dim, fontSize: 11.5 }}>{s.body}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 15, color: C.text, fontWeight: 600, marginBottom: 10 }}>
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
