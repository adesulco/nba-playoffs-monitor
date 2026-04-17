import React from 'react';
import { COLORS as C } from '../lib/constants.js';

/**
 * Partnership / sponsorship / press contact bar.
 * Renders a compact mailto link with pre-filled subject line that opens the
 * user's default email client pointed at hi@gibol.co.
 *
 * Use in footers across Home, NBA Dashboard, TeamPage, Recap, ComingSoon.
 */
export default function ContactBar({ lang = 'id', variant = 'inline' }) {
  const email = 'hi@gibol.co';

  const copy = lang === 'id'
    ? { label: 'PARTNERSHIP · SPONSORSHIP · PRESS', cta: 'hi@gibol.co', subject: 'Partnership/Sponsorship Inquiry — gibol.co' }
    : { label: 'PARTNERSHIPS · SPONSORSHIPS · PRESS', cta: 'hi@gibol.co', subject: 'Partnership/Sponsorship Inquiry — gibol.co' };

  const href = `mailto:${email}?subject=${encodeURIComponent(copy.subject)}`;

  // Card variant — prominent panel for Home page
  if (variant === 'card') {
    return (
      <a
        href={href}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          margin: '0 24px 16px',
          background: C.panelRow,
          border: `1px solid ${C.line}`,
          borderLeft: `3px solid #ffb347`,
          borderRadius: 4,
          textDecoration: 'none',
          color: C.text,
          transition: 'all 0.15s',
          fontSize: 12,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderLeftWidth = '6px'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderLeftWidth = '3px'; }}
      >
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: 1.5, color: C.dim, fontWeight: 600, marginBottom: 3 }}>
            {copy.label}
          </div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
            {lang === 'id'
              ? 'Tertarik berkolaborasi, sponsor, atau peliputan media?'
              : 'Interested in a partnership, sponsorship, or press coverage?'}
          </div>
        </div>
        <div style={{
          padding: '6px 12px',
          background: '#ffb347',
          color: '#08111f',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          borderRadius: 3,
          whiteSpace: 'nowrap',
        }}>
          {copy.cta} →
        </div>
      </a>
    );
  }

  // Inline variant — single footer line
  return (
    <span style={{ fontSize: 9.5, color: C.muted, letterSpacing: 0.3 }}>
      {copy.label} ·{' '}
      <a
        href={href}
        style={{ color: '#ffb347', textDecoration: 'none', fontWeight: 600 }}
      >
        {copy.cta}
      </a>
    </span>
  );
}
