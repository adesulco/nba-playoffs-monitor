/**
 * Formula 1 2026 adapter — Phase 1 target (v0.2.1). For v0.2.0 this is a stub
 * that only ships the route + SEO meta so the coming-soon page gets indexed
 * and shareable. Real data hooks (OpenF1, Jolpica, Polymarket) land in Phase 1.
 */

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const routeBase = '/formula-1-2026';

function prerenderRoutes() {
  return [
    {
      path: routeBase,
      title: 'Formula 1 2026 · Klasemen Pembalap, Jadwal GP, Peluang Juara (Segera Hadir) | gibol.co',
      description: 'Dashboard live Formula 1 musim 2026 — klasemen pembalap dan konstruktor, kalender 24 Grand Prix dalam WIB, mode balapan live (posisi, interval, pit stop, telemetri), dan peluang juara Polymarket. Segera hadir di gibol.co.',
      keywords: 'formula 1 2026, f1 2026, jadwal f1 2026, klasemen f1, peluang juara f1, hasil grand prix, max verstappen, lewis hamilton, lando norris, charles leclerc, oscar piastri, f1 bahasa indonesia',
      ogImage: DEFAULT_OG,
    },
  ];
}

export const adapter = {
  id: 'f1',
  name: 'Formula 1 2026',
  nameId: 'Formula 1 2026',
  routeBase,
  accent: '#E10600',
  glyph: '🏎️',
  status: 'soon',
  prerenderRoutes,
};

export default adapter;
