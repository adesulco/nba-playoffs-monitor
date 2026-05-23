import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';

/**
 * Syarat & Ketentuan — gibol.co.
 *
 * v0.62.0 ship — closes audit F-001 (no ToS published).
 *
 * Bahasa-only, same reasoning as Privacy.jsx — single canonical version
 * avoids translation drift.
 *
 * Highlights:
 *  - § Polymarket: explicit disclaimer that the odds panels are
 *    EDITORIAL probability for journalistic context, NOT a betting
 *    platform and NOT an endorsement of gambling. This is the
 *    documentary half of the F-002 interim mitigation (the kill-switch
 *    in v0.61.2 is the operational half). The full Blocker close still
 *    needs an Indonesian counsel memo.
 *  - § Akurasi data: best-effort disclaimer for sports data accuracy;
 *    we proxy ESPN / Polymarket / Jolpica F1 / API-Football and don't
 *    warrant their output.
 *  - § Hukum yang berlaku: Indonesia.
 */
export default function Terms() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <SEO
        title="Syarat & Ketentuan — gibol.co"
        description="Aturan main pemakaian gibol.co — lisensi, akurasi data, disclaimer Polymarket, hak kekayaan intelektual, hukum yang berlaku."
        path="/terms"
        noindex={false}
      />
      <main id="main" style={mainStyle}>
        <header style={{ marginBottom: 32 }}>
          <p style={kicker}>SYARAT & KETENTUAN</p>
          <h1 style={h1Style}>Syarat & Ketentuan gibol.co</h1>
          <p style={leadStyle}>
            Dengan memakai gibol.co kamu setuju dengan syarat di halaman ini.
            Berlaku sejak <strong>{TODAY}</strong>.
          </p>
        </header>

        <Section title="1. Apa itu gibol.co">
          <p>
            gibol.co adalah dashboard olahraga gratis berbahasa Indonesia.
            Kami menampilkan skor live, klasemen, jadwal, recap, profil tim
            dan pemain dari NBA, Liga Inggris, Formula 1, Tenis ATP/WTA,
            FIFA World Cup, dan BRI Liga 1. Tidak ada akun yang wajib
            dibuat, tidak ada langganan berbayar, dan tidak ada iklan
            pihak ketiga di dalam konten.
          </p>
        </Section>

        <Section title="2. Lisensi pemakaian">
          <p>
            gibol.co bebas dipakai untuk pemakaian pribadi non-komersial.
            Kamu bisa baca, share link, screenshot, dan diskusikan apa yang
            ada di sini. Yang <strong>tidak</strong> diperbolehkan tanpa
            persetujuan tertulis:
          </p>
          <ul style={ulStyle}>
            <li>Scrape data gibol.co secara otomatis dengan cara yang
                membebani server (lihat <code>robots.txt</code> untuk crawl-rate
                yang sopan; AI crawler dipersilakan).</li>
            <li>Reproduksi sebagian besar editorial copy (recap, preview,
                profil) di domain lain tanpa atribusi.</li>
            <li>Reverse-engineer infrastruktur gibol.co, mencoba bypass
                rate-limit, atau memanfaatkan celah keamanan tanpa
                melaporkannya lewat <a href="mailto:security@gibol.co" style={linkStyle}>security@gibol.co</a>.</li>
          </ul>
        </Section>

        <Section title="3. Akurasi data — disclaimer best-effort">
          <p>
            Skor, klasemen, statistik, dan jadwal di gibol.co di-fetch dari
            sumber publik (ESPN, Polymarket, Jolpica F1, API-Football) lewat
            proxy server kami. Kami merefresh data ini secara berkala (10–30
            detik untuk skor live, hingga 60 menit untuk standings + odds),
            tapi:
          </p>
          <ul style={ulStyle}>
            <li>Bisa ada keterlambatan beberapa detik dari kejadian aktual di lapangan.</li>
            <li>Provider hulu sewaktu-waktu down, throttle, atau berubah format. Saat itu terjadi, beberapa surface gibol.co bisa kosong atau menampilkan data cached.</li>
            <li>Editorial copy (recap, preview, profil) di-generate dengan bantuan AI dan diverifikasi tim editorial. Bisa ada salah fakta sesekali — laporkan ke <a href="mailto:hi@gibol.co" style={linkStyle}>hi@gibol.co</a>.</li>
          </ul>
          <p>
            <strong>gibol.co tidak menjamin akurasi data 100% dan tidak
            bertanggung jawab atas kerugian apa pun yang timbul karena
            keputusan yang kamu ambil berdasarkan data yang ditampilkan.</strong>
          </p>
        </Section>

        <Section title="4. Panel peluang juara (Polymarket) — BUKAN platform judi">
          <p>
            Sebagian dashboard sport (NBA Title Odds, EPL Title Odds, F1
            Championship Odds, Tennis Slam Odds) menampilkan persentase
            peluang juara. Data persentase ini di-fetch dari prediction
            market Polymarket dan ditampilkan sebagai <strong>konteks
            editorial</strong> — sebanding dengan analisa pundit atau model
            statistik media olahraga lain.
          </p>
          <p>
            <strong>gibol.co bukan platform judi, bukan agen taruhan, dan
            tidak memfasilitasi penempatan taruhan dalam bentuk apa pun.</strong>
            {' '}Tidak ada link affiliate ke situs judi, tidak ada bonus
            sign-up, tidak ada penjualan tip atau "prediksi pemenang".
            Persentase peluang yang ditampilkan adalah hasil agregat trader
            di pasar prediksi — kami mengutipnya seperti media olahraga
            mengutip rating ESPN BPI atau peringkat ATP.
          </p>
          <p>
            Tampilan panel ini bisa dimatikan oleh tim gibol dalam 1 jam
            tanpa redeploy (lihat <a href="https://github.com/adesulco/nba-playoffs-monitor" style={linkStyle}>repo</a>{' '}
            untuk detail teknis) — sehingga kami siap merespons regulasi
            yang berubah.
          </p>
        </Section>

        <Section title="5. Hak kekayaan intelektual">
          <p>
            Layout, kode, branding, dan editorial copy original gibol.co
            adalah milik Tim gibol.co. Logo + statistik + foto tim dan
            pemain adalah hak masing-masing klub, liga, dan provider data.
            Pemakaian wajar untuk pelaporan jurnalistik diperbolehkan
            dengan atribusi yang jelas.
          </p>
        </Section>

        <Section title="6. Larangan & terminasi akses">
          <p>
            Kami berhak membatasi akses (IP block, rate-limit) ke pengguna
            yang melakukan abuse — termasuk scraping otomatis tanpa
            mengikuti <code>robots.txt</code>, percobaan reverse-engineer,
            atau pengiriman traffic yang tidak proporsional.
          </p>
        </Section>

        <Section title="7. Hubungan dengan layanan pihak ketiga">
          <p>
            gibol.co tidak menjual produk, tidak memproses pembayaran, dan
            tidak menjadi perantara transaksi finansial. Lihat
            {' '}<Link to="/privacy" style={linkStyle}>Kebijakan Privasi</Link>
            {' '}untuk daftar lengkap provider analytics dan tracking.
          </p>
        </Section>

        <Section title="8. Hukum yang berlaku & yurisdiksi">
          <p>
            Syarat ini diatur oleh hukum Republik Indonesia. Sengketa yang
            timbul akan diselesaikan terlebih dahulu lewat musyawarah; jika
            tidak ada penyelesaian, akan diajukan ke pengadilan negeri di
            Jakarta.
          </p>
        </Section>

        <Section title="9. Perubahan syarat">
          <p>
            Kami bisa mengubah halaman ini sewaktu-waktu. Perubahan material
            akan diumumkan lewat banner di home selama 7 hari. Pemakaian
            berlanjut setelah perubahan dianggap menerima syarat baru.
          </p>
        </Section>

        <Section title="10. Kontak">
          <p>
            Pertanyaan umum: <a href="mailto:hi@gibol.co" style={linkStyle}>hi@gibol.co</a><br />
            Masalah keamanan: <a href="mailto:security@gibol.co" style={linkStyle}>security@gibol.co</a>
          </p>
        </Section>

        <div style={footerNoteStyle}>
          <Link to="/privacy" style={linkStyle}>← Kebijakan Privasi</Link>
          <Link to="/" style={linkStyle}>← Kembali ke Beranda</Link>
        </div>
      </main>
    </div>
  );
}

const TODAY = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={h2Style}>{title}</h2>
      {children}
    </section>
  );
}

// Reuse the visual style from Privacy.jsx — keep the two pages
// visually consistent so they read as a pair.
const mainStyle = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '40px 20px 80px',
  fontFamily: 'var(--font-sans)',
  lineHeight: 1.6,
  color: 'var(--ink-2)',
};
const kicker = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: 2,
  color: 'var(--amber)',
  fontWeight: 700,
  margin: '0 0 8px',
};
const h1Style = {
  fontFamily: 'Space Grotesk, system-ui, sans-serif',
  fontSize: 'clamp(28px, 5vw, 44px)',
  fontWeight: 700,
  lineHeight: 1.15,
  color: 'var(--ink)',
  margin: '0 0 14px',
  letterSpacing: -0.02,
};
const h2Style = {
  fontFamily: 'var(--font-sans)',
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--ink)',
  margin: '0 0 12px',
  borderTop: '2px solid var(--ink)',
  paddingTop: 12,
};
const leadStyle = {
  fontSize: 16,
  lineHeight: 1.55,
  color: 'var(--ink-2)',
  margin: 0,
};
const ulStyle = {
  margin: '4px 0 12px 20px',
  padding: 0,
  fontSize: 14,
};
const linkStyle = {
  color: 'var(--amber)',
  textDecoration: 'underline',
};
const footerNoteStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  marginTop: 48,
  paddingTop: 24,
  borderTop: '1px solid var(--line-soft)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: 1,
};
