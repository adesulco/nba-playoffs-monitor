/**
 * UpgradeSheet4a — the paywall moment (doc 17 §2.2): member #11 is pending
 * and approving them needs a Season Pass. Prices come from pricing.js;
 * until billing ships the order goes through VITE_ORDER_URL.
 */
import { PRICING, formatRupiah } from '../pricing.js';

export default function UpgradeSheet4a({ open, onClose, grupName, lang = 'en' }) {
  const tx = (en, id) => (lang === 'id' ? id : en);
  if (!open) return null;
  const tiers = [PRICING.season, PRICING.lifetime];
  return (
    <div role="dialog" aria-modal="true" style={S.backdrop} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.eyebrow}>{tx('GRUP IS FULL', 'GRUP PENUH')}</div>
        <h2 style={S.title}>
          {tx(`${grupName || 'Your grup'} has ${PRICING.freeMembers} members.`, `${grupName || 'Grupmu'} sudah ${PRICING.freeMembers} anggota.`)}
        </h2>
        <p style={S.body}>
          {tx(
            'A Season Pass lifts the cap for this competition so the whole tongkrongan fits.',
            'Season Pass buka batas anggota buat kompetisi ini, biar satu tongkrongan masuk semua.'
          )}
        </p>
        <div style={S.tiers}>
          {tiers.map((t) => (
            <div key={t.product} style={S.tier}>
              <div style={S.tierName}>{t.label[lang] || t.label.en}</div>
              <div style={S.tierPrice}>{formatRupiah(t.amount)}</div>
              <div style={S.tierPer}>{t.per[lang] || t.per.en}</div>
            </div>
          ))}
        </div>
        {PRICING.orderUrl ? (
          <a href={PRICING.orderUrl} target="_blank" rel="noopener noreferrer" style={S.cta}>
            {tx('Get a Season Pass →', 'Ambil Season Pass →')}
          </a>
        ) : (
          <p style={S.soon}>{tx('Ordering opens soon. Your pending members keep their spot.', 'Pemesanan segera dibuka. Anggota yang menunggu tetap dapat tempat.')}</p>
        )}
        <button type="button" onClick={onClose} style={S.close}>{tx('Not now', 'Nanti saja')}</button>
      </div>
    </div>
  );
}

const S = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(23,19,16,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60 },
  sheet: { width: '100%', maxWidth: 480, background: 'var(--g4-bg)', color: 'var(--g4-text)', borderRadius: '18px 18px 0 0', padding: '18px var(--g4-gutter) 28px', boxSizing: 'border-box', fontFamily: 'var(--g4-font-ui)' },
  eyebrow: { font: '700 10px/1 var(--g4-font-ui)', letterSpacing: '0.6px', color: 'var(--g4-accent)' },
  title: { font: '800 20px/1.15 var(--g4-font-display)', margin: '8px 0 6px' },
  body: { font: '500 13px/1.45 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: '0 0 14px' },
  tiers: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
  tier: { border: '1.5px solid var(--g4-text)', borderRadius: 'var(--g4-radius-card)', padding: '12px 12px' },
  tierName: { font: '700 12px/1 var(--g4-font-ui)' },
  tierPrice: { font: '800 20px/1.1 var(--g4-font-display)', margin: '6px 0 2px' },
  tierPer: { font: '500 11px/1 var(--g4-font-ui)', color: 'var(--g4-text-muted)' },
  cta: { display: 'block', textAlign: 'center', textDecoration: 'none', background: 'var(--g4-scarlet)', color: '#fff', font: '700 15px/1 var(--g4-font-ui)', padding: '15px 16px', borderRadius: 'var(--g4-radius-pill)' },
  soon: { font: '500 12px/1.4 var(--g4-font-ui)', color: 'var(--g4-text-muted)', textAlign: 'center', margin: '0 0 6px' },
  close: { appearance: 'none', border: 'none', background: 'transparent', color: 'var(--g4-text)', font: '700 13px/1 var(--g4-font-ui)', padding: 12, width: '100%', cursor: 'pointer' },
};
