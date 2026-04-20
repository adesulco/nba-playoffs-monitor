import React from 'react';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import Button from './Button.jsx';

const FANGIR_URL = 'https://fangir.com/products/2026-ibl-trading-cards';
const HERO_IMG = 'https://fangir.com/cdn/shop/files/Slide-1_1946x.jpg?v=1776145319';
const LOGO_IMG = 'https://fangir.com/cdn/shop/files/Fangir-Color_13d5fff6-1122-4bd9-8138-58b2a26b9983_90x.png?v=1775875309';

/**
 * Cross-brand promo banner for Fangir's 2026 IBL Trading Cards pre-order.
 * Sits between the news ticker and the footer on the NBA dashboard.
 */
export default function FangirBanner() {
  const { lang } = useApp();

  const copy = lang === 'id' ? {
    pill: 'PARTNER',
    tag: 'PRE-ORDER · 11–25 APRIL',
    title: '2026 IBL Trading Cards',
    sub: 'Koleksi kartu resmi liga basket Indonesia — edisi perdana Fangir. Pengiriman minggu keempat Mei 2026.',
    cta: 'Pre-order di Fangir',
    price: 'Rp 2.500.000',
  } : {
    pill: 'PARTNER',
    tag: 'PRE-ORDER · APR 11–25',
    title: '2026 IBL Trading Cards',
    sub: 'Official collectible trading cards for Indonesia\'s top basketball league — debut Fangir series. Ships late May 2026.',
    cta: 'Pre-order on Fangir',
    price: 'Rp 2,500,000',
  };

  return (
    <a
      href={FANGIR_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fangir-banner"
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr auto',
        alignItems: 'stretch',
        gap: 0,
        borderTop: `1px solid ${C.line}`,
        borderBottom: `1px solid ${C.line}`,
        background: C.panelRow,
        textDecoration: 'none',
        color: 'inherit',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 96,
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = C.panelRow; }}
    >
      {/* Left: hero image */}
      <div style={{
        background: `url(${HERO_IMG}) center/cover no-repeat`,
        borderRight: `1px solid ${C.lineSoft}`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, transparent 0%, ${C.panelRow}80 100%)`,
        }} />
      </div>

      {/* Middle: copy */}
      <div style={{
        padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: 5,
        justifyContent: 'center',
        minWidth: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9, letterSpacing: 1.2, fontWeight: 700,
            padding: '2px 7px',
            background: '#d2191f',
            color: '#fff',
            borderRadius: 2,
          }}>
            {copy.pill}
          </span>
          <img src={LOGO_IMG} alt="Fangir" style={{ height: 14, width: 'auto', display: 'block' }} />
          <span style={{ fontSize: 9.5, color: C.dim, letterSpacing: 0.8, fontWeight: 500 }}>
            {copy.tag}
          </span>
        </div>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 17, fontWeight: 600, color: C.text,
          letterSpacing: -0.2, lineHeight: 1.1,
        }}>
          {copy.title}
        </div>
        <div style={{
          fontSize: 10.5, color: C.dim, lineHeight: 1.45, maxWidth: 560,
          overflow: 'hidden',
        }}>
          {copy.sub}
        </div>
      </div>

      {/* Right: price + CTA */}
      <div style={{
        padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: 6,
        alignItems: 'flex-end',
        justifyContent: 'center',
        borderLeft: `1px solid ${C.lineSoft}`,
        background: C.panelSoft,
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: -0.2,
        }}>
          {copy.price}
        </div>
        {/* Presentational pill — parent <a> owns the click. Fangir red (#d2191f)
            passed as `accent` since no sportId maps to it. `as="span"` keeps
            the DOM valid inside the banner-wide anchor. */}
        <Button
          as="span"
          variant="primary"
          size="sm"
          accent="#d2191f"
          label={copy.cta}
          rightIcon="↗"
        />
      </div>
    </a>
  );
}
