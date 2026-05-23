import React from 'react';
import PickemRoot from './PickemRoot.jsx';
import { StarIcon } from './icons.jsx';

// ============================================================================
// v0.65.0 — Pick'em landing (P0 scaffold placeholder).
//
// First user-visible Pick'em route. P0 is scaffold only — this exists to
// prove the route + container + nav + tokens compose end-to-end behind
// flags.pickem. P1 builds the data layer; P2 builds the match-predictor
// core (FixtureCard + predict-first guest flow), which becomes this
// page's actual content.
// ============================================================================

export default function PickemHome() {
  return (
    <PickemRoot active="predict">
      <div style={{ padding: '24px 16px 32px', maxWidth: 720, margin: '0 auto' }}>
        <div className="p-eyebrow" style={{ marginBottom: 8 }}>P0 · SCAFFOLD</div>
        <h1 className="p-display-sm" style={{ marginBottom: 12, color: 'var(--ink-1)' }}>
          Gibol Pick&apos;em
        </h1>
        <p className="p-body" style={{ color: 'var(--ink-2)', maxWidth: 520, marginBottom: 24 }}>
          Game prediksi pertandingan — gratis, Bahasa-first, dibuat untuk pecinta bola
          di Indonesia. Piala Dunia 2026 dimulai sebentar lagi.
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 'var(--r-pill)',
            background: 'var(--pickem-orange-wash)',
            color: 'var(--pickem-orange)',
            fontFamily: 'var(--font-ui-pickem)',
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 32,
          }}
        >
          <StarIcon size={16} filled /> Segera hadir · Juni 2026
        </div>

        <div className="p-eyebrow" style={{ marginBottom: 10 }}>Yang lagi disusun</div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            color: 'var(--ink-2)',
            fontFamily: 'var(--font-ui-pickem)',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <li>Prediksi pertandingan dengan peluang Polymarket</li>
          <li>Papan peringkat global &amp; grup</li>
          <li>Bracket Piala Dunia 2026 (group → KO)</li>
          <li>Survivor mode &amp; lencana</li>
          <li>Kartu Bola — bagikan prediksi kamu ke WhatsApp</li>
        </ul>
      </div>
    </PickemRoot>
  );
}
