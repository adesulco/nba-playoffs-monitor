import React from 'react';
import ComingSoon from './ComingSoon.jsx';

const features = [
  { title: 'Live match center', desc: 'Minute-by-minute scoring, xG, possession, shots — all 104 matches across the tournament.' },
  { title: 'Group tables', desc: '12 groups, live standings, qualification scenarios updated in real time.' },
  { title: 'Knockout bracket', desc: 'Round of 32 through Final — path visualization with country flags and predictions.' },
  { title: 'Player tracking', desc: 'Star-player watchlist: goals, assists, cards, and minutes across the tournament.' },
  { title: 'Prediction markets', desc: 'Polymarket + Kalshi for winner odds, top scorer, Golden Boot, and every match line.' },
  { title: 'Host city guides', desc: 'Venue info, broadcast schedule per region, and travel tips for all 16 host cities.' },
];

const featuresId = [
  { title: 'Pusat laga live', desc: 'Skor menit-per-menit, xG, possession, tembakan — 104 laga sepanjang turnamen.' },
  { title: 'Tabel grup', desc: '12 grup, klasemen live, skenario kualifikasi update real-time.' },
  { title: 'Bagan gugur', desc: 'Ronde 32 sampai Final — visualisasi jalan dengan bendera negara dan prediksi.' },
  { title: 'Tracking pemain', desc: 'Watchlist pemain bintang: gol, assist, kartu, dan menit main sepanjang turnamen.' },
  { title: 'Pasar prediksi', desc: 'Polymarket + Kalshi untuk peluang juara, top skor, Sepatu Emas, dan setiap line laga.' },
  { title: 'Panduan kota tuan rumah', desc: 'Info venue, jadwal siaran per region, dan tips travel untuk 16 kota tuan rumah.' },
];

export default function FIFA() {
  return (
    <ComingSoon
      league="FIFA WORLD CUP 2026 · USA · MEXICO · CANADA"
      title="World Cup 2026 Dashboard"
      titleId="Dashboard Piala Dunia 2026"
      blurb="48 teams. 104 matches. 16 host cities across three countries. Live scores, group tables, knockout brackets, player tracking, and prediction markets — from opening match in Mexico City to the final at MetLife Stadium."
      blurbId="48 tim. 104 pertandingan. 16 kota tuan rumah di tiga negara. Skor live, tabel grup, bagan gugur, tracking pemain, dan pasar prediksi — dari laga pembuka di Mexico City hingga final di MetLife Stadium."
      accent="#2c8ad6"
      launchDate="Jun 11, 2026 · kickoff"
      glyph="⚽"
      features={features}
      featuresId={featuresId}
      seoKeywords="fifa world cup 2026, piala dunia 2026, jadwal piala dunia 2026, skor piala dunia, grup piala dunia 2026, kickoff piala dunia 11 juni 2026, USA Mexico Canada world cup, FIFA 2026, world cup indonesia"
    />
  );
}
