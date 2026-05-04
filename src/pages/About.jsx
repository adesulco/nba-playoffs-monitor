// Stub — real content shipped in Round 4 of audit cleanup.
import React from 'react';
import { useApp } from '../lib/AppContext.jsx';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
// v0.19.5 Phase 2 Sprint E — share rail.
import HubActionRow from '../components/v2/HubActionRow.jsx';

export default function About() {
  const { lang } = useApp();
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={lang === 'id'
          ? 'Tentang gibol.co — dashboard olahraga live untuk fan Indonesia'
          : 'About gibol.co — live sports dashboards for Indonesian fans'}
        description={lang === 'id'
          ? 'gibol.co dibangun untuk para penggemar bola — live score NBA, Formula 1, Liga Inggris, Piala Dunia 2026, dan BRI Liga 1 Indonesia dalam Bahasa Indonesia dengan waktu WIB.'
          : 'gibol.co is built for sports fans — live scores for NBA, Formula 1, Premier League, FIFA World Cup 2026, and BRI Liga 1 Indonesia in Bahasa Indonesia with WIB timezone.'}
        path="/about"
        lang={lang}
      />
      <div className="dashboard-wrap" style={{ maxWidth: 820, margin: '0 auto', padding: '0 20px 40px' }}>
        {/* v0.19.5 Phase 2 Sprint E — hero compressed from fixed
            36px to .editorial-h1 token (24/28/32 mobile/tablet/
            desktop) per directive §6 type table. Share rail added
            below subhead via <HubActionRow> consuming the Sprint A
            i18n keys (copyLink / share). */}
        <section style={{ padding: '40px 8px' }}>
          <div style={{ marginBottom: 6, fontSize: 11, color: C.dim, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            gibol.co · {lang === 'id' ? 'TENTANG KAMI' : 'ABOUT US'}
          </div>
          <h1 className="editorial-h1" style={{
            fontFamily: 'var(--font-sans)',
            margin: 0,
            color: C.text,
            textWrap: 'balance',
          }}>
            {lang === 'id' ? 'Tentang gibol.co' : 'About gibol.co'}
          </h1>
          <div style={{ marginTop: 8, fontSize: 14, color: C.dim, lineHeight: 1.55, maxWidth: 600 }}>
            {lang === 'id' ? 'Dashboard olahraga live, dari fan untuk fan.' : 'Live sports dashboards, from fans for fans.'}
          </div>
          <div style={{ marginTop: 14 }}>
            <HubActionRow
              url="/about"
              shareText={lang === 'id'
                ? 'gibol.co — dashboard olahraga live Bahasa Indonesia'
                : 'gibol.co — live sports dashboards in Bahasa Indonesia'}
              analyticsEvent="about_share"
            />
          </div>

          <div style={{ marginTop: 28, fontSize: 14, lineHeight: 1.75, color: C.text, maxWidth: 700 }}>
            {lang === 'id' ? (
              <>
                <p><strong>gibol.co</strong> (gila bola) adalah dashboard olahraga live yang dibangun untuk penggemar bola Indonesia. Tujuan kami sederhana: berikan fan apa yang mereka butuhkan untuk menikmati pertandingan — skor live, statistik, peluang juara, dan konteks — semua dalam Bahasa Indonesia dengan waktu WIB.</p>
                <p>Kami percaya fan Indonesia pantas mendapat pengalaman nonton yang setara dengan fan di luar negeri. Jadi kami bangun dashboard yang fokus: tanpa iklan mengganggu, tanpa pop-up, tanpa login. Buka di browser, nikmati pertandingan.</p>
                <h2 style={{ marginTop: 32, marginBottom: 12, fontSize: 22, fontFamily: 'var(--font-sans)' }}>Apa yang kami sajikan</h2>
                <ul style={{ paddingLeft: 24, lineHeight: 1.9 }}>
                  <li><strong>NBA Playoffs 2026</strong> — live score, play-by-play, win probability, shot chart, peluang juara Polymarket, watchlist pemain, bracket, dan jalan menuju juara untuk 30 tim NBA.</li>
                  <li><strong>Catatan Playoff harian</strong> — rekap hasil tiap hari dengan momen terbesar, top scorer, dan analisis singkat.</li>
                  <li><strong>Formula 1 2026</strong> (segera hadir) — jadwal balap, klasemen pembalap &amp; konstruktor, hasil tiap GP.</li>
                  <li><strong>Liga Inggris 2025-26</strong> (segera hadir) — klasemen, jadwal, hasil, top skorer Premier League.</li>
                  <li><strong>Piala Dunia FIFA 2026</strong> (segera hadir) — 48 tim, 104 pertandingan, 16 kota tuan rumah.</li>
                  <li><strong>BRI Liga 1 2026 Indonesia</strong> (segera hadir) — klasemen, jadwal, hasil Super League Indonesia.</li>
                </ul>
                <h2 style={{ marginTop: 32, marginBottom: 12, fontSize: 22, fontFamily: 'var(--font-sans)' }}>Sumber data</h2>
                <p>Kami menggunakan API publik dari ESPN (skor & statistik) dan Polymarket (peluang juara). Semua sumber dicantumkan di tiap halaman. Data di-refresh setiap 10–30 detik saat laga berlangsung.</p>
                <h2 style={{ marginTop: 32, marginBottom: 12, fontSize: 22, fontFamily: 'var(--font-sans)' }}>Partnership &amp; kerjasama</h2>
                <p>Tertarik bekerjasama? Kami terbuka untuk sponsor, press coverage, data partnership, dan kolaborasi editorial. Hubungi kami di <a href="mailto:hi@gibol.co" style={{ color: 'var(--amber)', fontWeight: 600 }}>hi@gibol.co</a>.</p>
              </>
            ) : (
              <>
                <p><strong>gibol.co</strong> ("gila bola" — Indonesian slang for sports-crazy) is a live sports dashboard built for Indonesian fans. Our goal is simple: give fans what they need to enjoy the game — live scores, stats, championship odds, and context — all in Bahasa Indonesia with WIB timezone.</p>
                <p>Indonesian fans deserve the same viewing experience as fans overseas. So we built a focused dashboard: no intrusive ads, no popups, no login. Open your browser, enjoy the game.</p>
                <h2 style={{ marginTop: 32, marginBottom: 12, fontSize: 22, fontFamily: 'var(--font-sans)' }}>What we cover</h2>
                <ul style={{ paddingLeft: 24, lineHeight: 1.9 }}>
                  <li><strong>NBA Playoffs 2026</strong> — live scores, play-by-play, win probability, shot charts, Polymarket championship odds, player watchlist, bracket, and title path for all 30 NBA teams.</li>
                  <li><strong>Daily Playoff Recap</strong> — every day's results with biggest moment, top scorer, and quick analysis.</li>
                  <li><strong>IBL — Indonesia Basketball League</strong> (coming soon).</li>
                  <li><strong>FIFA World Cup 2026</strong> (coming soon) — 48 teams, 104 matches, 16 host cities.</li>
                </ul>
                <h2 style={{ marginTop: 32, marginBottom: 12, fontSize: 22, fontFamily: 'var(--font-sans)' }}>Data sources</h2>
                <p>We use ESPN's public APIs (scores &amp; stats) and Polymarket (title odds). All sources are credited on every page. Data refreshes every 10–30 seconds during live games.</p>
                <h2 style={{ marginTop: 32, marginBottom: 12, fontSize: 22, fontFamily: 'var(--font-sans)' }}>Partnerships</h2>
                <p>Interested in working with us? We're open to sponsorships, press coverage, data partnerships, and editorial collaborations. Reach out at <a href="mailto:hi@gibol.co" style={{ color: 'var(--amber)', fontWeight: 600 }}>hi@gibol.co</a>.</p>
              </>
            )}
          </div>
        </section>
        <div style={{
          display: 'flex', justifyContent: 'space-between', padding: '14px 8px',
          borderTop: `1px solid ${C.line}`, fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · {lang === 'id' ? 'dari fan, untuk fan' : 'from fans, for fans'}</div>
          <ContactBar lang={lang} variant="inline" />
          <div>ESPN · Polymarket · NBA</div>
        </div>
      </div>
    </div>
  );
}
