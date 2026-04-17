import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';

/**
 * Shared masthead used across Home + dashboard pages.
 * `children` slot is for page-specific content (e.g. TeamPicker, status line).
 */
export default function TopBar({
  showBackLink = false,
  backTo = '/',
  backLabel,
  title = 'gibol.co',
  subtitle = 'gila bola · live sports dashboards',
  children,
  accent,
}) {
  const { theme, toggleTheme, lang, toggleLang, t } = useApp();
  const accentColor = accent || C.amber;
  const resolvedBackLabel = backLabel || (lang === 'id' ? '← SEMUA DASHBOARD' : '← ALL DASHBOARDS');

  return (
    <div className="topbar" style={{
      display: 'grid',
      gridTemplateColumns: 'auto auto 1fr auto',
      gap: 18,
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: `1px solid ${C.line}`,
      background: C.topbarBg,
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #e8502e 0%, #8c1a1a 100%)',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(0,0,0,0.4)' }} />
        </div>
        <div>
          <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 14, color: C.text }}>{title}</div>
          <div style={{ fontSize: 10.5, color: C.dim, letterSpacing: 0.5 }}>{subtitle}</div>
        </div>
      </Link>

      <div>
        {showBackLink && (
          <Link
            to={backTo}
            style={{
              fontSize: 10.5, color: C.dim, textDecoration: 'none', letterSpacing: 0.5,
              padding: '5px 10px', border: `1px solid ${C.lineSoft}`, borderRadius: 4,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = accentColor; e.currentTarget.style.borderColor = accentColor; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.dim; e.currentTarget.style.borderColor = C.lineSoft; }}
          >
            {resolvedBackLabel}
          </Link>
        )}
      </div>

      <div style={{ flex: 1 }}>{children}</div>

      <div className="topbar-meta" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', fontSize: 10.5, color: C.dim, alignItems: 'center' }}>
        <button
          onClick={toggleLang}
          title={lang === 'en' ? 'Beralih ke Bahasa Indonesia' : 'Switch to English'}
          aria-label={lang === 'en' ? 'Beralih ke Bahasa Indonesia' : 'Switch to English'}
          style={{
            background: 'transparent',
            border: `1px solid ${C.lineSoft}`,
            color: C.dim,
            height: 26,
            padding: '0 8px',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 10,
            letterSpacing: 1,
            fontWeight: 600,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.lineSoft; e.currentTarget.style.color = C.dim; }}
        >
          {lang === 'en' ? 'EN' : 'ID'}
        </button>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
          aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
          style={{
            background: 'transparent',
            border: `1px solid ${C.lineSoft}`,
            color: C.dim,
            width: 26, height: 26,
            borderRadius: 4,
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12,
            padding: 0,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.lineSoft; e.currentTarget.style.color = C.dim; }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </div>
  );
}
