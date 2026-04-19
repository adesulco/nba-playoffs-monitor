/**
 * FIFA World Cup 2026 adapter — Phase 3 target (v0.2.3). Hard ship deadline
 * 2026-06-07 (4 days before first match). For v0.2.0 this emits the existing
 * /fifa-world-cup-2026 coming-soon route with its SEO meta.
 */

const SITE = 'https://www.gibol.co';
const DEFAULT_OG = `${SITE}/og-image.png`;
const routeBase = '/fifa-world-cup-2026';

function prerenderRoutes() {
  return [
    {
      path: routeBase,
      title: 'Piala Dunia FIFA 2026 — 48 Tim · 104 Laga · 16 Kota (Segera Hadir) | gibol.co',
      description: 'Dashboard live untuk Piala Dunia FIFA 2026 — 48 tim, 104 pertandingan, 16 kota tuan rumah di AS, Meksiko, dan Kanada. Skor live, tabel grup, bagan gugur, tracking pemain, dan pasar prediksi. Mulai 11 Juni 2026.',
      keywords: 'piala dunia 2026, FIFA world cup 2026, skor piala dunia, jadwal piala dunia 2026, tim piala dunia 2026',
      ogImage: DEFAULT_OG,
    },
  ];
}

export const adapter = {
  id: 'fifa_wc',
  name: 'FIFA World Cup 2026',
  nameId: 'Piala Dunia FIFA 2026',
  routeBase,
  accent: '#326295',
  glyph: '⚽',
  status: 'soon',
  prerenderRoutes,
};

export default adapter;
