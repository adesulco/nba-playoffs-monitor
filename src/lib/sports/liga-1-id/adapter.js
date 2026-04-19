/**
 * Super League Indonesia (Liga 1) adapter — Phase 4 target (v0.2.4). Activates
 * the $19/mo API-Football Pro subscription. Stub only in v0.2.0.
 */

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const routeBase = '/liga-1-2026';

function prerenderRoutes() {
  return [
    {
      path: routeBase,
      title: 'Liga 1 Indonesia 2025-26 · Klasemen BRI, Top Skor, Skor Live (Segera Hadir) | gibol.co',
      description: 'Dashboard live BRI Liga 1 Super League Indonesia 2025-26 — klasemen 18 klub, skor live match-day, top skor, ras juara dan zona degradasi, derby Persija vs Persib. Segera hadir di gibol.co.',
      keywords: 'liga 1 indonesia, super league indonesia, bri liga 1, klasemen liga 1, jadwal liga 1, top skor liga 1, persija persib, el clasico indonesia, liga 1 2025-26',
      ogImage: DEFAULT_OG,
    },
  ];
}

export const adapter = {
  id: 'liga_1_id',
  name: 'Super League Indonesia',
  nameId: 'Super League Indonesia',
  routeBase,
  accent: '#0057A8',
  glyph: '🇮🇩',
  status: 'soon',
  prerenderRoutes,
};

export default adapter;
