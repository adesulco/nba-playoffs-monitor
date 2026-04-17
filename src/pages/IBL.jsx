import React from 'react';
import ComingSoon from './ComingSoon.jsx';

const features = [
  { title: 'Live skor + play-by-play', desc: 'Real-time scoring for every IBL game, pulled direct from the league feed.' },
  { title: 'Klasemen + playoff picture', desc: 'Live standings and projected playoff seeding based on current form.' },
  { title: 'Top performers', desc: 'Season leaderboards for points, rebounds, assists, and advanced stats.' },
  { title: 'Broadcast schedule', desc: 'Know exactly where to watch: Vidio, Indosiar, MOJI, and YouTube streams.' },
  { title: 'Team deep dives', desc: 'Roster, schedule, form, and head-to-head history for all 16 IBL clubs.' },
  { title: 'Bahasa first', desc: 'Full Bahasa Indonesia coverage, built for the Indonesian fan.' },
];

const featuresId = [
  { title: 'Live skor + play-by-play', desc: 'Skor real-time untuk setiap laga IBL, langsung dari feed resmi liga.' },
  { title: 'Klasemen + gambaran playoff', desc: 'Klasemen live dan proyeksi seeding playoff berdasarkan form saat ini.' },
  { title: 'Pemain terbaik', desc: 'Leaderboard poin, rebound, assist, dan stat lanjutan sepanjang musim.' },
  { title: 'Jadwal siaran', desc: 'Tahu persis dimana nonton: Vidio, Indosiar, MOJI, dan streaming YouTube.' },
  { title: 'Analisis tim', desc: 'Roster, jadwal, form, dan head-to-head untuk 16 klub IBL.' },
  { title: 'Bahasa first', desc: 'Coverage penuh Bahasa Indonesia, dibuat untuk pecinta bola lokal.' },
];

export default function IBL() {
  return (
    <ComingSoon
      league="INDONESIA BASKETBALL LEAGUE · SEASON 2025–26"
      title="IBL Live Dashboard"
      titleId="Dashboard Live IBL"
      blurb="The definitive live companion for Indonesia's top professional basketball league. Pelita Jaya, Prawira Bandung, Rans Simba, Satria Muda — all live, all in one place."
      blurbId="Companion live definitif untuk liga basket profesional teratas Indonesia. Pelita Jaya, Prawira Bandung, Rans Simba, Satria Muda — semuanya live, di satu tempat."
      accent="#d2191f"
      launchDate="Oct 2026"
      glyph="🇮🇩"
      features={features}
      featuresId={featuresId}
      seoKeywords="IBL, liga basket indonesia, skor IBL, jadwal IBL, klasemen IBL, pelita jaya, prawira bandung, satria muda, rans simba, pro basket indonesia, IBL season 2025-26, liga basket indonesia 2026"
    />
  );
}
