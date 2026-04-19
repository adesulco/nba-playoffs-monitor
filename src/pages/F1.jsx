import React from 'react';
import ComingSoon from './ComingSoon.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { COLORS as C } from '../lib/constants.js';

const features = [
  { title: 'Race calendar (WIB)', desc: 'All 24 rounds of the 2026 season with practice, qualifying, sprint, and race times converted to WIB — no more math at 3 AM.' },
  { title: 'Driver + constructor standings', desc: 'Live points tables after every session. Champion projections based on Polymarket market signal.' },
  { title: 'Race-mode live', desc: 'Positions, intervals, pit stops, tyre stints, sector times — 3-second latency via OpenF1. Works even when ESPN does not.' },
  { title: 'Telemetry charts', desc: 'Speed, throttle, brake per lap for every driver — surface no Indonesian F1 site currently offers.' },
  { title: 'Championship odds', desc: 'Polymarket "2026 F1 Drivers Champion" market with Bahasa narrative layer on top of the number.' },
  { title: 'Bahasa-first', desc: 'Recap Grand Prix tiap Minggu sore dalam Bahasa, share-ready untuk grup WhatsApp dan story Instagram.' },
];

const featuresId = [
  { title: 'Kalender balapan (WIB)', desc: '24 ronde musim 2026 dengan waktu FP1, kualifikasi, sprint, dan race langsung dalam WIB — gak perlu ngitung lagi jam 3 pagi.' },
  { title: 'Klasemen pembalap + konstruktor', desc: 'Tabel poin live setelah setiap sesi. Proyeksi juara berdasarkan sinyal pasar Polymarket.' },
  { title: 'Mode balapan live', desc: 'Posisi, interval, pit stop, tyre stint, waktu sektor — latensi 3 detik via OpenF1. Jalan bahkan saat ESPN lag.' },
  { title: 'Grafik telemetri', desc: 'Kecepatan, throttle, rem per lap untuk setiap pembalap — surface yang belum ada di situs F1 Indonesia manapun.' },
  { title: 'Peluang juara', desc: 'Polymarket "Juara F1 2026" dengan lapisan narasi Bahasa di atas angka mentahnya.' },
  { title: 'Bahasa-first', desc: 'Recap Grand Prix tiap Minggu sore dalam Bahasa, siap share ke grup WhatsApp dan story Instagram.' },
];

const CALENDAR_HIGHLIGHTS = [
  { round: 'R01', gp: 'Australian GP', location: 'Melbourne', wib: '8 Mar · 12:00 WIB' },
  { round: 'R02', gp: 'Chinese GP', location: 'Shanghai', wib: '22 Mar · 14:00 WIB' },
  { round: 'R03', gp: 'Japanese GP', location: 'Suzuka', wib: '5 Apr · 12:00 WIB' },
  { round: '…', gp: '24 rounds total', location: 'World tour', wib: 'Mar–Des 2026' },
  { round: 'R24', gp: 'Abu Dhabi GP', location: 'Yas Marina', wib: '29 Nov · 20:00 WIB' },
];

function F1PreviewBlock() {
  const { lang } = useApp();
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section>
        <h2 style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 600,
          margin: '10px 0 10px', color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Musim 2026 — 24 Grand Prix' : '2026 season — 24 Grands Prix'}
        </h2>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 12, lineHeight: 1.6, maxWidth: 720 }}>
          {lang === 'id'
            ? 'Kalender F1 terpanjang sepanjang sejarah. Peraturan baru 2026 membawa chassis + power unit baru, Audi + Cadillac gabung sebagai konstruktor, dan enam akhir pekan sprint. Dashboard F1 gibol.co melacak semuanya dengan waktu WIB.'
            : 'The longest F1 calendar ever. New 2026 regulations bring fresh chassis + power units, Audi + Cadillac join as constructors, and six sprint weekends. Our dashboard tracks every round in WIB.'}
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8,
        }}>
          {CALENDAR_HIGHLIGHTS.map((r, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              background: C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderLeft: '3px solid #E10600',
              borderRadius: 3,
              fontSize: 11.5,
            }}>
              <div style={{ color: '#E10600', fontWeight: 700, fontSize: 10, letterSpacing: 1 }}>{r.round}</div>
              <div style={{ color: C.text, fontWeight: 600, marginTop: 2 }}>{r.gp}</div>
              <div style={{ color: C.dim, fontSize: 10.5 }}>{r.location} · {r.wib}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{
        padding: 14, background: C.panel, border: `1px solid ${C.line}`, borderLeft: '3px solid #E10600',
        borderRadius: 3, fontSize: 12, lineHeight: 1.7,
      }}>
        <h3 style={{ fontSize: 14, margin: '0 0 6px', color: C.text }}>
          {lang === 'id' ? 'Kenapa F1 butuh dashboard Bahasa' : "Why F1 deserves a Bahasa dashboard"}
        </h3>
        <p style={{ margin: 0, color: C.dim }}>
          {lang === 'id'
            ? 'Fanbase F1 Indonesia tumbuh cepat — Netflix Drive to Survive + tiga pembalap muda Asia di grid bikin minat meledak. Tapi situs F1 resmi cuma Bahasa Inggris, waktu semua ditampilkan UTC, dan telemetri hampir gak pernah ditayangkan ke publik. Kami tutup gap itu.'
            : 'Indonesian F1 fandom is exploding — Drive to Survive plus three young Asian drivers on the 2026 grid. But the official site is English-only, every time is UTC, and live telemetry is rarely surfaced. We close the gap.'}
        </p>
      </section>
    </div>
  );
}

export default function F1() {
  return (
    <ComingSoon
      league="FORMULA 1 · SEASON 2026"
      title="Formula 1 2026 Live Dashboard"
      titleId="Dashboard Live Formula 1 2026"
      blurb="The definitive Bahasa-first F1 companion — calendar in WIB, live race mode with 3s latency, driver & constructor standings, and Polymarket championship odds. Launching mid-2026."
      blurbId="Companion Bahasa-first definitif untuk Formula 1 — kalender WIB, mode balapan live latensi 3 detik, klasemen pembalap & konstruktor, plus peluang juara Polymarket. Rilis pertengahan 2026."
      accent="#E10600"
      launchDate="Mid 2026"
      glyph="🏎️"
      features={features}
      featuresId={featuresId}
      seoKeywords="formula 1 2026, f1 2026, jadwal f1 2026, klasemen f1, peluang juara f1, hasil grand prix, max verstappen, lewis hamilton, lando norris, charles leclerc, oscar piastri, f1 bahasa indonesia"
    >
      <F1PreviewBlock />
    </ComingSoon>
  );
}
