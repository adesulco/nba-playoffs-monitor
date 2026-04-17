import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/AppContext.jsx';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';
import TopBar from '../components/TopBar.jsx';
import ContactBar from '../components/ContactBar.jsx';

// 20 NBA/playoff terms defined in Bahasa Indonesia for long-tail SEO.
// Each entry ranks independently for queries like "apa itu shot chart",
// "peluang juara NBA", "arti play-by-play", etc.
const ENTRIES = [
  { term: 'Peluang juara', en: 'Title odds', def: 'Probabilitas tim memenangkan NBA Championship musim ini, dihitung dari pasar prediksi seperti Polymarket. Angka berubah setiap hari sesuai hasil pertandingan dan pergerakan taruhan.' },
  { term: 'Bracket', en: 'Bracket', def: 'Bagan 16 tim playoff — 8 dari Wilayah Timur, 8 dari Wilayah Barat. Dari Ronde 1 lolos ke Semifinal Wilayah, lalu Final Wilayah, lalu NBA Finals. Setiap seri best-of-7.' },
  { term: 'Seed', en: 'Seed', def: 'Peringkat unggulan tim di wilayahnya. Seed 1 adalah tim dengan rekor terbaik — lawan Ronde 1-nya adalah pemenang play-in (Seed 8). Seed 4 vs 5, Seed 3 vs 6, Seed 2 vs 7.' },
  { term: 'Play-in tournament', en: 'Play-in', def: 'Mini-tournament untuk menentukan 2 tim terakhir (seed 7 dan 8) yang lolos ke playoff. Tim peringkat 7–10 reguler season harus menang di play-in untuk masuk bracket.' },
  { term: 'Best-of-7', en: 'Best-of-7', def: 'Format seri playoff: tim yang pertama menang 4 laga lolos ke babak berikutnya. Maksimum 7 laga. Semua seri playoff NBA pakai format ini.' },
  { term: 'Win probability', en: 'Win probability', def: 'Persentase peluang tim memenangkan laga yang sedang berjalan — dihitung real-time berdasarkan skor, waktu tersisa, posisi bola, dan kekuatan tim. Angka bergerak tiap play.' },
  { term: 'Play-by-play', en: 'Play-by-play', def: 'Log aksi pertandingan aksi-per-aksi: siapa cetak poin, siapa blok, siapa foul, di kuarter berapa, sisa waktu berapa. Update real-time tiap 10–30 detik di gibol.co.' },
  { term: 'Shot chart', en: 'Shot chart', def: 'Peta lokasi tembakan pemain di lapangan. Titik hijau = skor, titik merah = miss. Pakai untuk lihat pola tembakan: tim suka 3-pointer dari corner, atau drive ke rim?' },
  { term: 'Box score', en: 'Box score', def: 'Tabel statistik pemain dalam satu laga: PTS (poin), REB (rebound), AST (assist), STL (steal), BLK (blok), TO (turnover), FG% (persentase lemparan).' },
  { term: 'Double-double', en: 'Double-double', def: 'Pemain mencetak angka dua digit (≥10) di dua kategori: poin, rebound, assist, steal, atau blok. Contoh: 20 poin + 12 rebound.' },
  { term: 'Triple-double', en: 'Triple-double', def: 'Angka dua digit di tiga kategori. Langka — biasanya poin + rebound + assist. Pemain seperti Jokić, LeBron, dan Luka sering mencatatkan triple-double.' },
  { term: 'Clutch', en: 'Clutch', def: 'Situasi 5 menit terakhir laga dengan selisih ≤5 poin. Pemain "clutch" adalah yang tampil bagus di tekanan tinggi. Clutch leaderboard di gibol.co tracking ini.' },
  { term: 'Streak', en: 'Streak', def: 'Beruntun menang (W5 = 5 kemenangan beruntun) atau beruntun kalah (L3 = 3 kekalahan beruntun). Chip merah di gibol.co menandai tim yang lagi "dingin".' },
  { term: 'Head-to-head (H2H)', en: 'Head-to-head', def: 'Rekam jejak pertemuan dua tim. Contoh: OKC 3-1 vs DEN di reguler season. H2H penting untuk prediksi hasil playoff, tapi post-season sering berbeda total.' },
  { term: 'Seri (series)', en: 'Series', def: 'Rangkaian maksimum 7 laga antara dua tim di playoff. "Series 2-1" artinya tim pertama menang 2, tim kedua menang 1, masih ada 4 laga tersisa maksimal.' },
  { term: 'Conference finals', en: 'Conference finals', def: 'Final wilayah — pemenang Timur dan Barat akan ketemu di NBA Finals. Di NBA 2026: Final Timur (ECF) dan Final Barat (WCF).' },
  { term: 'NBA Finals', en: 'NBA Finals', def: 'Babak final NBA. Pemenang Wilayah Timur melawan pemenang Wilayah Barat, best-of-7. Tipoff 3 Juni 2026 di ABC.' },
  { term: 'Top seed', en: 'Top seed', def: 'Seed 1 — tim terbaik di wilayahnya. Keunggulan: home court advantage sepanjang playoff (laga pertama dan ketujuh di kandang sendiri).' },
  { term: 'Injury report', en: 'Injury report', def: 'Daftar status cedera pemain: "Out" (tidak main), "Questionable" (ragu-ragu), "Probable" (kemungkinan besar main), "Day-to-day" (cek hari H).' },
  { term: 'MVP', en: 'MVP', def: 'Most Valuable Player — penghargaan untuk pemain paling berpengaruh di liga reguler season. MVP Finals = versi playoff. Jokić, SGA, dan Giannis adalah kandidat 2026.' },
];

export default function Glossary() {
  const { lang } = useApp();
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={lang === 'id'
          ? 'Glosarium Istilah NBA Playoff — Apa itu Bracket, Peluang Juara, Shot Chart | gibol.co'
          : 'NBA Playoff Glossary — Bracket, Title Odds, Shot Chart explained | gibol.co'}
        description={lang === 'id'
          ? 'Glosarium 20 istilah NBA playoff dalam Bahasa Indonesia: peluang juara, bracket, seed, play-in, play-by-play, shot chart, box score, dan lainnya.'
          : 'Glossary of 20 NBA playoff terms explained in Indonesian: title odds, bracket, seed, play-in, play-by-play, shot chart, box score, and more.'}
        path="/glossary"
        lang={lang}
        keywords="apa itu peluang juara, arti bracket nba, apa itu shot chart, arti play-in nba, glosarium nba, istilah nba indonesia"
      />
      <div className="dashboard-wrap" style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 40px' }}>
        <TopBar showBackLink title="gibol.co" subtitle={lang === 'id' ? 'glosarium istilah NBA' : 'NBA glossary'} />
        <main style={{ padding: '32px 8px' }}>
          <h1 style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 44, lineHeight: 1, margin: 0, letterSpacing: -0.5,
          }}>
            {lang === 'id' ? 'Glosarium NBA Playoff' : 'NBA Playoff Glossary'}
          </h1>
          <p style={{ marginTop: 12, fontSize: 13, color: C.dim, lineHeight: 1.6, maxWidth: 680 }}>
            {lang === 'id'
              ? '20 istilah penting di NBA Playoff 2026 — dijelaskan dalam Bahasa Indonesia. Dari peluang juara sampai triple-double, semuanya di sini.'
              : '20 key terms from the 2026 NBA Playoffs — explained simply. From title odds to triple-doubles, all in one place.'}
          </p>

          <div style={{ marginTop: 32, display: 'grid', gap: 14 }}>
            {ENTRIES.map((e, i) => (
              <article key={i} style={{
                padding: '16px 18px',
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderLeft: `3px solid #ffb347`,
                borderRadius: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  <h2 style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: 18, fontWeight: 600, margin: 0, letterSpacing: -0.2,
                  }}>
                    {e.term}
                  </h2>
                  <span style={{ fontSize: 10, color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    EN · {e.en}
                  </span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.65, color: C.text, margin: 0 }}>
                  {e.def}
                </p>
              </article>
            ))}
          </div>

          <div style={{
            marginTop: 36, padding: 18,
            background: C.panelRow, border: `1px solid ${C.line}`, borderRadius: 4,
            fontSize: 13, lineHeight: 1.6,
          }}>
            <strong>{lang === 'id' ? 'Siap nonton live?' : 'Ready to watch live?'}</strong>{' '}
            {lang === 'id' ? 'Semua istilah di atas bisa kamu lihat beraksi di' : 'See every one of these live at'}{' '}
            <Link to="/nba-playoff-2026" style={{ color: '#ffb347', fontWeight: 600 }}>
              /nba-playoff-2026
            </Link>
            {' — '}
            {lang === 'id' ? 'dashboard live NBA Playoff 2026.' : 'the live NBA Playoffs 2026 dashboard.'}
          </div>

          {/* JSON-LD DefinedTermSet schema for each entry — boosts glossary SERP visibility */}
          <script type="application/ld+json">{JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DefinedTermSet',
            name: 'NBA Playoff Glossary · gibol.co',
            description: 'Istilah NBA playoff dijelaskan dalam Bahasa Indonesia.',
            hasDefinedTerm: ENTRIES.map((e) => ({
              '@type': 'DefinedTerm',
              name: e.term,
              description: e.def,
              inDefinedTermSet: 'https://www.gibol.co/glossary',
            })),
          })}</script>
        </main>
        <div style={{
          display: 'flex', justifyContent: 'space-between', padding: '14px 8px',
          borderTop: `1px solid ${C.line}`, fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · glosarium NBA</div>
          <ContactBar lang={lang} variant="inline" />
          <div>ESPN · Polymarket · NBA</div>
        </div>
      </div>
    </div>
  );
}
