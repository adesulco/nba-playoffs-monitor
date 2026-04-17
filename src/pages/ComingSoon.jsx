import React, { useState } from 'react';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import { useApp } from '../lib/AppContext.jsx';

export default function ComingSoon({ league, title, titleId, blurb, blurbId, accent, launchDate, glyph, features, featuresId }) {
  const { lang } = useApp();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const displayTitle = lang === 'id' && titleId ? titleId : title;
  const displayBlurb = lang === 'id' && blurbId ? blurbId : blurb;
  const displayFeatures = lang === 'id' && featuresId ? featuresId : features;

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.includes('@')) return;
    // For now, just visually confirm. Future: wire to a mailing service.
    try {
      const stored = JSON.parse(localStorage.getItem('gibol:notify') || '[]');
      stored.push({ email, league, at: Date.now() });
      localStorage.setItem('gibol:notify', JSON.stringify(stored));
    } catch {}
    setSubmitted(true);
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <div className="dashboard-wrap">
        <TopBar showBackLink accent={accent} />

        <div style={{
          padding: '48px 24px',
          borderBottom: `1px solid ${C.line}`,
          background: `linear-gradient(180deg, ${accent}20 0%, ${C.bg} 100%)`,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 72, lineHeight: 1, marginBottom: 16,
            filter: 'grayscale(0)',
          }}>
            {glyph}
          </div>
          <div style={{
            fontSize: 9, letterSpacing: 1.5, fontWeight: 700,
            padding: '3px 10px',
            background: 'transparent',
            border: `1px solid ${accent}`,
            color: accent,
            borderRadius: 2,
            display: 'inline-block',
            marginBottom: 16,
          }}>
            COMING SOON
          </div>
          <div style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 56, lineHeight: 1, letterSpacing: -1, color: C.text, marginBottom: 8,
          }}>
            {displayTitle}
          </div>
          <div style={{
            fontSize: 11, color: C.dim, letterSpacing: 1, marginBottom: 20,
          }}>
            {league}
            {launchDate && <span> · {launchDate}</span>}
          </div>
          <div style={{
            fontSize: 13, color: C.dim, lineHeight: 1.6,
            maxWidth: 600, margin: '0 auto 28px',
          }}>
            {displayBlurb}
          </div>

          {/* Notify form */}
          {!submitted ? (
            <form onSubmit={handleSubmit} style={{
              display: 'flex', gap: 0, maxWidth: 420, margin: '0 auto',
              border: `1px solid ${C.line}`,
              borderRadius: 4,
              overflow: 'hidden',
              background: C.panel,
            }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={lang === 'id' ? 'email@kamu.com' : 'you@email.com'}
                required
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: C.text,
                  padding: '10px 14px',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: accent,
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {lang === 'id' ? 'BERI TAHU SAYA' : 'NOTIFY ME'}
              </button>
            </form>
          ) : (
            <div style={{
              padding: '12px 18px',
              background: `${accent}20`,
              border: `1px solid ${accent}`,
              borderRadius: 4,
              color: C.text,
              fontSize: 12,
              maxWidth: 420,
              margin: '0 auto',
            }}>
              ✓ {lang === 'id' ? 'Kamu akan diberi tahu saat launching.' : 'You\'ll be notified at launch.'}
            </div>
          )}
        </div>

        {/* Features preview */}
        {displayFeatures && displayFeatures.length > 0 && (
          <div style={{ padding: '28px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {displayFeatures.map((f, i) => (
              <div key={i} style={{
                padding: '16px',
                background: C.panelRow,
                border: `1px solid ${C.lineSoft}`,
                borderTop: `2px solid ${accent}`,
                borderRadius: 3,
              }}>
                <div style={{ fontSize: 9, color: accent, letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>
                  0{i + 1} ·
                </div>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
        }}>
          <div>gibol.co · part of the family</div>
          <div>← <a href="/" style={{ color: C.dim, textDecoration: 'none' }}>back to all dashboards</a></div>
        </div>
      </div>
    </div>
  );
}
