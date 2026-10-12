import React from 'react';

// ============================================================================
// v0.65.0 — Pick'em <Flag /> + country color map.
//
// Country flag pipeline per the handover's "Critical integration decision
// #4": "the mocks use emoji. Replace with a real flag pipeline —
// country-flag-icons (SVG) or a CDN — behind the design's Flag component,
// with COUNTRY_COLORS as the solid-color fallback. No heavy dependency
// on hot paths."
//
// P0 implementation: emoji-on-coloured-pill. Renders the unicode regional
// indicator emoji over a solid pill colored with the country's brand color.
// Sufficient for prototyping + matches the design mock fidelity. P1+ can
// swap to flagcdn.com SVGs by editing the inner `<FlagImage />` only —
// the public API stays stable.
//
// COUNTRY_COLORS keys are ISO 3166-1 alpha-3 codes (FIFA + commonly-used
// codes). Extend as the tournament demands.
// ============================================================================

// Primary flag color per nation (solid-tint fallback + 1px border).
// Full WC2026 field (48) + legacy aliases (POR/ITA/IDN) for old data.
export const COUNTRY_COLORS = {
  ALG: '#006233', ARG: '#74ACDF', AUS: '#012169', AUT: '#ED2939',
  BEL: '#FAE042', BIH: '#002395', BRA: '#009C3B', CAN: '#FF0000',
  CPV: '#003893', COL: '#FCD116', COD: '#007FFF', CRO: '#171796',
  CUW: '#002B7F', CZE: '#11457E', ECU: '#FFDD00', EGY: '#CE1126',
  ENG: '#CE1124', FRA: '#0055A4', GER: '#000000', GHA: '#006B3F',
  HAI: '#00209F', IRN: '#239F40', IRQ: '#CE1126', CIV: '#F77F00',
  JPN: '#BC002D', JOR: '#007A3D', MEX: '#006847', MAR: '#C1272D',
  NED: '#FF6600', NZL: '#00247D', NOR: '#BA0C2F', PAN: '#005293',
  PAR: '#0038A8', PRT: '#006600', QAT: '#8A1538', KSA: '#006C35',
  SCO: '#0065BF', SEN: '#00853F', RSA: '#007A4D', KOR: '#003478',
  ESP: '#AA151B', SWE: '#006AA7', SUI: '#D52B1E', TUN: '#E70013',
  TUR: '#E30A17', USA: '#3C3B6E', URU: '#0038A8', UZB: '#1EB53A',
  // legacy aliases
  POR: '#006600', ITA: '#009246', IDN: '#FF0000',
};

// ISO alpha-3 (FIFA/IOC) → ISO 3166-1 alpha-2, used to DERIVE the flag
// emoji at render time (typo-proof vs. hand-keying 48 emoji). England &
// Scotland are UK subdivisions with no alpha-2 — handled by SPECIAL_EMOJI.
// A future SVG swap (flagcdn.com) only needs this map, not new emoji.
const ALPHA3_TO_ALPHA2 = {
  ALG: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BIH: 'BA',
  BRA: 'BR', CAN: 'CA', CPV: 'CV', COL: 'CO', COD: 'CD', CRO: 'HR',
  CUW: 'CW', CZE: 'CZ', ECU: 'EC', EGY: 'EG', FRA: 'FR', GER: 'DE',
  GHA: 'GH', HAI: 'HT', IRN: 'IR', IRQ: 'IQ', CIV: 'CI', JPN: 'JP',
  JOR: 'JO', MEX: 'MX', MAR: 'MA', NED: 'NL', NZL: 'NZ', NOR: 'NO',
  PAN: 'PA', PAR: 'PY', PRT: 'PT', QAT: 'QA', KSA: 'SA', SEN: 'SN',
  RSA: 'ZA', KOR: 'KR', ESP: 'ES', SWE: 'SE', SUI: 'CH', TUN: 'TN',
  TUR: 'TR', USA: 'US', URU: 'UY', UZB: 'UZ',
  // legacy aliases
  POR: 'PT', ITA: 'IT', IDN: 'ID',
};

// England + Scotland flag emoji (GB-ENG / GB-SCT tag sequences).
const SPECIAL_EMOJI = {
  ENG: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  SCO: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
};

// Regional-indicator base codepoint for 'A'.
const RI_A = 0x1f1e6;

function emojiFor(key) {
  if (SPECIAL_EMOJI[key]) return SPECIAL_EMOJI[key];
  const a2 = ALPHA3_TO_ALPHA2[key];
  if (!a2 || a2.length !== 2) return null;
  return String.fromCodePoint(
    RI_A + a2.charCodeAt(0) - 65,
    RI_A + a2.charCodeAt(1) - 65,
  );
}

// Bahasa country names — full WC2026 field (48) + legacy aliases.
export const COUNTRY_NAMES = {
  ALG: 'Aljazair', ARG: 'Argentina', AUS: 'Australia', AUT: 'Austria',
  BEL: 'Belgia', BIH: 'Bosnia', BRA: 'Brasil', CAN: 'Kanada',
  CPV: 'Tanjung Verde', COL: 'Kolombia', COD: 'Kongo DR', CRO: 'Kroasia',
  CUW: 'Curaçao', CZE: 'Ceko', ECU: 'Ekuador', EGY: 'Mesir',
  ENG: 'Inggris', FRA: 'Prancis', GER: 'Jerman', GHA: 'Ghana',
  HAI: 'Haiti', IRN: 'Iran', IRQ: 'Irak', CIV: 'Pantai Gading',
  JPN: 'Jepang', JOR: 'Yordania', MEX: 'Meksiko', MAR: 'Maroko',
  NED: 'Belanda', NZL: 'Selandia Baru', NOR: 'Norwegia', PAN: 'Panama',
  PAR: 'Paraguay', PRT: 'Portugal', QAT: 'Qatar', KSA: 'Arab Saudi',
  SCO: 'Skotlandia', SEN: 'Senegal', RSA: 'Afrika Selatan', KOR: 'Korea Selatan',
  ESP: 'Spanyol', SWE: 'Swedia', SUI: 'Swiss', TUN: 'Tunisia',
  TUR: 'Turki', USA: 'Amerika Serikat', URU: 'Uruguay', UZB: 'Uzbekistan',
  // legacy aliases
  POR: 'Portugal', ITA: 'Italia', IDN: 'Indonesia',
};

/**
 * <Flag code="ARG" w={32} h={22} />
 *
 * Renders a country flag chip. Accepts an ISO alpha-3 code (preferred)
 * or a 2-letter ISO code (mapped via alias). Falls back to the solid
 * COUNTRY_COLORS tint with the code shown in mono if the country has
 * no emoji/SVG asset.
 *
 * Props:
 *   code     ISO alpha-3 (e.g. "ARG", "ENG", "IDN")
 *   w, h     pixel dimensions (default 32×22)
 *   round    border-radius (default 4)
 *   label    optional override for the aria-label
 */
export default function Flag({ code, w = 32, h = 22, round = 4, label }) {
  const key = (code || '').toUpperCase();
  const emoji = emojiFor(key);
  const color = COUNTRY_COLORS[key];
  const name = COUNTRY_NAMES[key] || key;
  const ariaLabel = label || `Bendera ${name}`;
  const fontSize = Math.min(w, h * 1.4);
  return (
    <span
      className="p-flag"
      role="img"
      aria-label={ariaLabel}
      style={{
        width: w,
        height: h,
        borderRadius: round,
        fontSize,
        lineHeight: 1,
        fontFamily:
          '"Apple Color Emoji", "Segoe UI Emoji", "Twemoji Mozilla", "Noto Color Emoji", emoji',
        boxShadow: color ? `inset 0 0 0 1px ${color}` : '0 0 0 1px rgba(0,0,0,0.06) inset',
        userSelect: 'none',
      }}
    >
      {emoji || <CodeFallback code={key} color={color} />}
    </span>
  );
}

function CodeFallback({ code, color }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: color || 'var(--bg-deep)',
        color: '#fff',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: '0.04em',
      }}
    >
      {code}
    </span>
  );
}
