/**
 * English Premier League 2025-26 adapter — Phase 2 target (v0.2.2). Stub only
 * in v0.2.0; real data stack (ESPN eng.1, football-data.org, Polymarket) lands
 * in Phase 2.
 */

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const routeBase = '/premier-league-2025-26';

function prerenderRoutes() {
  return [
    {
      path: routeBase,
      title: 'Liga Inggris 2025-26 · Klasemen, Top Skor, Skor Live EPL (Segera Hadir) | gibol.co',
      description: 'Dashboard live Liga Inggris (Premier League) musim 2025-26 — klasemen 20 klub, skor live match-day, top skor Golden Boot, ras juara dan zona degradasi. Polymarket odds untuk juara dan top-4. Segera hadir di gibol.co.',
      keywords: 'liga inggris, premier league, epl 2025-26, klasemen liga inggris, top skor epl, skor liga inggris, jadwal liga inggris, arsenal liverpool manchester city chelsea, epl bahasa indonesia',
      ogImage: DEFAULT_OG,
    },
  ];
}

export const adapter = {
  id: 'epl',
  name: 'Premier League 2025-26',
  nameId: 'Liga Inggris 2025-26',
  routeBase,
  accent: '#37003C',
  glyph: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  status: 'soon',
  prerenderRoutes,
};

export default adapter;
