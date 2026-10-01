/**
 * Prices live here and nowhere else (doc 17 §2.2). Copy renders these;
 * it never hardcodes a number. Rupiah, no money vocabulary in product copy
 * beyond the price tags themselves.
 */
export const PRICING = Object.freeze({
  currency: 'IDR',
  season:   { product: 'season_pass', amount: 79000,  label: { en: 'Season Pass', id: 'Season Pass' },  per: { en: 'per competition', id: 'per kompetisi' } },
  lifetime: { product: 'lifetime',    amount: 249000, label: { en: 'Lifetime', id: 'Selamanya' },         per: { en: 'one time', id: 'sekali bayar' } },
  plus:     { product: 'gibol_plus',  amount: 19000,  label: { en: 'Gibol+', id: 'Gibol+' },             per: { en: 'per month', id: 'per bulan' } },
  // What a free grup gets before the cap paywall (entitlements.js mirrors it).
  freeMembers: 10,
  // Until billing lands (S4): orders go through this link. Set
  // VITE_ORDER_URL in Vercel (a wa.me link). Null hides the button and shows
  // "coming soon" copy instead of inventing a contact.
  orderUrl: import.meta.env?.VITE_ORDER_URL || null,
});

export function formatRupiah(amount) {
  return `Rp${Number(amount).toLocaleString('id-ID')}`;
}
