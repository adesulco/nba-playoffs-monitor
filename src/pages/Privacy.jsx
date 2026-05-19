import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { clearConsent } from '../lib/consent.js';
import SEO from '../components/SEO.jsx';

/**
 * Kebijakan Privasi — gibol.co.
 *
 * v0.62.0 ship — closes audit F-001 (no privacy policy published).
 *
 * Bahasa-only by design; the policy must describe what visitors of an
 * Indonesia-targeted site actually experience. English speakers can
 * read it with browser translate — keeping a single canonical version
 * avoids the translation-drift trap where the EN and ID copies say
 * different things and the regulator gets the wrong one.
 *
 * Scope: covers UU PDP 27/2022 Art. 21 (informed consent), Art. 22-25
 * (data-subject rights), Art. 26 (transparency about recipients),
 * Art. 56 (overseas transfer disclosure). Also bridges GDPR Art. 6(1)(a)
 * for EU visitors because PostHog/Sentry/Vercel/OneSignal are all US-hosted.
 *
 * Entity: kept anonymous per F-012 decision ("Tim gibol.co" — no NIB,
 * no registered address). Contact channels: hi@gibol.co (general) +
 * security@gibol.co (security disclosures via /.well-known/security.txt).
 */
export default function Privacy() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <SEO
        title="Kebijakan Privasi — gibol.co"
        description="Bagaimana gibol.co mengumpulkan, memakai, dan melindungi data kamu. Apa yang dikumpulkan, siapa pihak ketiganya, dan cara opt-out."
        path="/privacy"
        noindex={false}
      />
      <main id="main" style={mainStyle}>
        <header style={{ marginBottom: 32 }}>
          <p style={kicker}>KEBIJAKAN PRIVASI</p>
          <h1 style={h1Style}>Kebijakan Privasi gibol.co</h1>
          <p style={leadStyle}>
            Halaman ini menjelaskan data apa yang dikumpulkan saat kamu pakai gibol.co,
            siapa pihak ketiga yang ikut terima data tersebut, dan bagaimana kamu bisa
            mengontrol atau menarik persetujuan. Ditulis Bahasa karena audience utama
            gibol.co adalah fan Indonesia. Berlaku sejak <strong>{TODAY}</strong>.
          </p>
        </header>

        <Section id="ringkasan" title="Ringkasan singkat">
          <ul style={ulStyle}>
            <li>Pengumpulan tracker (Google Analytics, PostHog, Sentry, OneSignal, Vercel Analytics) <strong>tidak aktif sampai kamu setuju lewat banner persetujuan</strong>.</li>
            <li>Preferensi yang kamu set di gibol — bahasa, tema, klub favorit, watchlist — disimpan di browser kamu (<code>localStorage</code>), tidak dikirim ke server.</li>
            <li>Data skor olahraga yang ditampilkan diambil dari sumber publik (ESPN, Polymarket, Jolpica F1, API-Football) lewat proxy server kami.</li>
            <li>Notifikasi push (OneSignal) cuma aktif kalau kamu klik tombol opt-in secara eksplisit.</li>
            <li>Kontak privasi: <a href="mailto:hi@gibol.co" style={linkStyle}>hi@gibol.co</a></li>
          </ul>
        </Section>

        <Section id="pengendali" title="Siapa pengendali data?">
          <p>
            gibol.co dioperasikan oleh <strong>Tim gibol.co</strong>. Untuk pertanyaan
            tentang data pribadi kamu, hubungi <a href="mailto:hi@gibol.co" style={linkStyle}>hi@gibol.co</a>.
            Untuk laporan masalah keamanan, gunakan <a href="mailto:security@gibol.co" style={linkStyle}>security@gibol.co</a>
            {' '}(detail di <a href="/.well-known/security.txt" style={linkStyle}>security.txt</a>).
          </p>
        </Section>

        <Section id="data-dikumpulkan" title="Data apa saja yang dikumpulkan">
          <h3 style={h3Style}>1. Data teknis (otomatis, lewat tracker pihak ketiga, hanya jika kamu setuju)</h3>
          <ul style={ulStyle}>
            <li>Alamat IP (di-truncate oleh GA4 via <code>anonymize_ip</code>)</li>
            <li>Tipe browser + sistem operasi + ukuran layar</li>
            <li>Halaman yang dibuka + waktu kunjungan + halaman referrer</li>
            <li>Interaksi UI: klik tombol, swipe day-strip, ganti tab, dll. (PostHog autocapture)</li>
            <li>Stack trace error JavaScript (Sentry, jika aktif)</li>
          </ul>

          <h3 style={h3Style}>2. Preferensi (disimpan di browser kamu saja)</h3>
          <ul style={ulStyle}>
            <li>Bahasa UI (<code>gibol:lang</code>)</li>
            <li>Tema visual — terang/gelap/auto (<code>gibol:theme</code>, <code>gibol:brand</code>)</li>
            <li>Tim/klub/driver favorit (<code>gibol:watchlist</code>, dll.)</li>
            <li>Status persetujuan ini (<code>gibol:consent</code>)</li>
            <li>Cache skor + standings (<code>swr-*</code>) — kedaluwarsa otomatis</li>
          </ul>
          <p>
            Data preferensi tidak dikirim ke server gibol.co maupun pihak ketiga.
            Hapus kapan saja lewat menu "Clear browsing data" di browser kamu.
          </p>

          <h3 style={h3Style}>3. Hash voter derby (opsional, untuk anti-spam)</h3>
          <p>
            Kalau kamu vote di polling derby Persija-Persib, sebuah hash satu-arah
            dari IP + User-Agent disimpan supaya satu pengunjung tidak bisa vote
            berulang dalam satu sesi. Hash ini tidak bisa di-reverse ke IP asli
            dan dihapus 24 jam setelah polling tutup.
          </p>

          <h3 style={h3Style}>4. Push notification token (opsional)</h3>
          <p>
            Cuma kalau kamu klik tombol "Nyalakan alert" untuk fitur tertentu —
            OneSignal menyimpan device subscription ID supaya kami bisa kirim
            notifikasi (misal: game NBA close-game alert, EPL kickoff alert).
            SDK OneSignal <strong>tidak di-load</strong> sampai kamu klik tombolnya.
            Cabut izin push kapan saja lewat settings browser.
          </p>
        </Section>

        <Section id="pihak-ketiga" title="Pihak ketiga (data recipients)">
          <p>
            Saat kamu setuju lewat banner, data teknis dikirim ke pihak ketiga
            berikut. Semua provider hosting berada <strong>di luar Indonesia</strong> —
            transfer ini termasuk transfer data lintas batas per UU PDP Art. 56.
            gibol.co mengandalkan standard data-processing terms masing-masing
            provider sebagai dasar transfer.
          </p>
          <div style={{ overflowX: 'auto', margin: '12px 0 16px' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Penerima</th>
                  <th style={thStyle}>Tujuan</th>
                  <th style={thStyle}>Lokasi server</th>
                  <th style={thStyle}>Kategori</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={tdStyle}>Google Analytics 4</td><td style={tdStyle}>Statistik pemakaian agregat</td><td style={tdStyle}>US</td><td style={tdStyle}>Analytics</td></tr>
                <tr><td style={tdStyle}>PostHog</td><td style={tdStyle}>Analytics produk + funnel</td><td style={tdStyle}>US</td><td style={tdStyle}>Analytics</td></tr>
                <tr><td style={tdStyle}>Sentry</td><td style={tdStyle}>Pelacakan error JavaScript</td><td style={tdStyle}>US</td><td style={tdStyle}>Analytics</td></tr>
                <tr><td style={tdStyle}>OneSignal</td><td style={tdStyle}>Push notifications (jika opt-in)</td><td style={tdStyle}>US</td><td style={tdStyle}>Marketing</td></tr>
                <tr><td style={tdStyle}>Vercel Analytics + Speed Insights</td><td style={tdStyle}>Page view + Core Web Vitals</td><td style={tdStyle}>US</td><td style={tdStyle}>Analytics</td></tr>
              </tbody>
            </table>
          </div>
          <p style={smallStyle}>
            Sumber data olahraga (ESPN, Polymarket, Jolpica F1, API-Football) di-fetch
            server-side lewat <code>/api/proxy/*</code>; tidak ada koneksi langsung
            dari browser kamu ke server-server tersebut, dan tidak ada data personal
            kamu yang dikirim ke mereka.
          </p>
        </Section>

        <Section id="dasar-hukum" title="Dasar hukum">
          <p>
            Pemrosesan data analytics dan marketing dilakukan berdasarkan
            <strong> persetujuan eksplisit</strong> kamu (UU PDP 27/2022 Art. 21;
            GDPR Art. 6(1)(a) untuk pengunjung dari Uni Eropa). Persetujuan default
            adalah <strong>tidak setuju</strong> — kami tidak mengaktifkan tracker
            sampai kamu menekan "Setujui" di banner.
          </p>
        </Section>

        <Section id="hak-kamu" title="Hak kamu sebagai subjek data">
          <ul style={ulStyle}>
            <li><strong>Akses</strong> — minta salinan data yang kami punya tentang kamu (kirim email ke hi@gibol.co).</li>
            <li><strong>Koreksi</strong> — minta kami memperbaiki data yang salah.</li>
            <li><strong>Penghapusan</strong> — minta data kamu dihapus dari sistem kami dan dari pihak ketiga yang menerima.</li>
            <li><strong>Pembatasan</strong> — minta pemrosesan dihentikan tapi data tetap tersimpan.</li>
            <li><strong>Portabilitas</strong> — minta data dalam format machine-readable.</li>
            <li><strong>Tarik persetujuan</strong> — kapan saja, lewat link "Pengaturan cookie" di footer atau lewat tombol di bawah. Penarikan tidak mempengaruhi keabsahan pemrosesan sebelum penarikan.</li>
          </ul>
        </Section>

        <Section id="retensi" title="Berapa lama data disimpan">
          <ul style={ulStyle}>
            <li>Preferensi browser (<code>localStorage</code>) — sampai kamu clear browser.</li>
            <li>Hash voter derby — 24 jam setelah polling tutup.</li>
            <li>Google Analytics 4 — 14 bulan (setting default GA4; akan kami pendekkan ke 2 bulan ketika dashboard memungkinkan).</li>
            <li>PostHog — sesuai retention policy default (7 tahun, akan kami review).</li>
            <li>Sentry — 90 hari (free tier).</li>
            <li>OneSignal subscription — sampai kamu cabut izin push di browser.</li>
            <li>Vercel Analytics — 90 hari.</li>
          </ul>
        </Section>

        <Section id="anak-anak" title="Pengguna di bawah 17 tahun">
          <p>
            gibol.co tidak menargetkan anak di bawah 17 tahun. Kami tidak sengaja
            mengumpulkan data pribadi dari anak-anak. Kalau kamu orang tua atau
            wali yang menyadari anak kamu memberikan data ke kami, hubungi
            <a href="mailto:hi@gibol.co" style={linkStyle}> hi@gibol.co</a> dan
            kami akan menghapusnya.
          </p>
        </Section>

        <Section id="perubahan" title="Perubahan kebijakan">
          <p>
            Kami bisa mengubah kebijakan ini sewaktu-waktu (misal: tambah
            provider baru, ubah retention). Perubahan material akan memicu
            banner persetujuan untuk muncul lagi sehingga kamu bisa review
            ulang. Versi sebelumnya akan diarsip di repo gibol.co.
          </p>
        </Section>

        <Section id="kontak" title="Kontak">
          <p>
            Pertanyaan umum: <a href="mailto:hi@gibol.co" style={linkStyle}>hi@gibol.co</a><br />
            Laporan masalah keamanan: <a href="mailto:security@gibol.co" style={linkStyle}>security@gibol.co</a>
          </p>
        </Section>

        <Section id="tarik-persetujuan" title="Tarik persetujuan sekarang">
          <p>
            Klik tombol di bawah untuk menghapus pilihan persetujuan kamu. Banner
            persetujuan akan muncul lagi di kunjungan berikutnya, dan semua tracker
            non-essential akan dinonaktifkan sampai kamu memilih ulang.
          </p>
          <button
            type="button"
            onClick={() => {
              clearConsent();
              // Reload so the banner re-mounts cleanly + tracker state resets.
              if (typeof window !== 'undefined') window.location.reload();
            }}
            style={buttonStyle}
          >
            Tarik persetujuan & reset banner
          </button>
        </Section>

        <div style={footerNoteStyle}>
          <Link to="/terms" style={linkStyle}>Syarat &amp; Ketentuan →</Link>
          <Link to="/" style={linkStyle}>← Kembali ke Beranda</Link>
        </div>
      </main>
    </div>
  );
}

const TODAY = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

function Section({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 36 }}>
      <h2 style={h2Style}>{title}</h2>
      {children}
    </section>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
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
  fontFamily: 'Newsreader, Georgia, serif',
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
  paddingTop: 4,
  borderTop: '2px solid var(--ink)',
  paddingTop: 12,
};
const h3Style = {
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--ink)',
  margin: '18px 0 8px',
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
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
};
const thStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '2px solid var(--ink)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
};
const tdStyle = {
  padding: '8px 10px',
  borderBottom: '1px solid var(--line-soft)',
  verticalAlign: 'top',
};
const smallStyle = {
  fontSize: 12,
  color: 'var(--ink-3)',
  marginTop: 8,
};
const buttonStyle = {
  marginTop: 8,
  padding: '10px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
  background: 'transparent',
  color: 'var(--ink)',
  border: '1.5px solid var(--ink)',
  borderRadius: 3,
  cursor: 'pointer',
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
