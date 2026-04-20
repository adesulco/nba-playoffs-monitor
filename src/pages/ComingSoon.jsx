import React from 'react';
import { useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { useApp } from '../lib/AppContext.jsx';

export default function ComingSoon({ league, title, titleId, blurb, blurbId, accent, launchDate, glyph, features, featuresId, seoKeywords, jsonLd, children }) {
  const location = useLocation();
  const { lang } = useApp();

  const displayTitle = lang === 'id' && titleId ? titleId : title;
  const displayBlurb = lang === 'id' && blurbId ? blurbId : blurb;
  const displayFeatures = lang === 'id' && featuresId ? featuresId : features;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={`${displayTitle} · gibol.co — segera hadir`}
        description={displayBlurb}
        path={location.pathname}
        lang={lang}
        keywords={seoKeywords}
        jsonLd={jsonLd}
      />
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

          {/* Static launch note */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px',
            background: `${accent}18`,
            border: `1px solid ${accent}`,
            borderRadius: 4,
            color: C.text,
            fontSize: 12,
            letterSpacing: 0.3,
          }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: accent }} />
            {lang === 'id'
              ? launchDate ? `Dijadwalkan rilis ${launchDate}. Pantau terus gibol.co.` : 'Segera hadir. Pantau terus gibol.co.'
              : launchDate ? `Launching ${launchDate}. Check back on gibol.co.` : 'Launching soon. Check back on gibol.co.'}
          </div>
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

        {/* F05 — Rich preview content slot (teams, dates, host cities, etc.). */}
        {children && (
          <div style={{ padding: '8px 24px 32px' }}>
            {children}
          </div>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · part of the family</div>
          <ContactBar lang={lang} variant="inline" />
          <div>← <a href="/" style={{ color: C.dim, textDecoration: 'none' }}>back to all dashboards</a></div>
        </div>
      </div>
    </div>
  );
}
