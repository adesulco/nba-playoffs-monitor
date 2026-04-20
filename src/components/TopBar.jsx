import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import ToolbarButton from './ToolbarButton.jsx';
import { Glyph } from './Logo.jsx';

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
      <Link
        to="/"
        aria-label="gibol.co home"
        style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}
      >
        <span style={{ color: C.text, display: 'inline-flex' }}>
          <Glyph size={28} title="gibol" />
        </span>
        <div>
          <div
            className="brand-wordmark"
            style={{ fontSize: 16, color: C.text }}
          >
            gibol<span className="brand-wordmark-dot">.</span>
            <span style={{ fontWeight: 400, letterSpacing: 0, color: C.dim, fontSize: 12, marginLeft: 4 }}>
              {title === 'gibol.co' ? 'co' : title}
            </span>
          </div>
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
        <ToolbarButton
          onClick={toggleLang}
          label={lang === 'en' ? 'EN' : 'ID'}
          title={lang === 'en' ? 'Beralih ke Bahasa Indonesia' : 'Switch to English'}
          ariaLabel={lang === 'en' ? 'Beralih ke Bahasa Indonesia' : 'Switch to English'}
          accent={accentColor}
        />
        <ToolbarButton
          onClick={toggleTheme}
          icon={theme === 'dark' ? '☀' : '☾'}
          title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
          ariaLabel={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
          accent={accentColor}
        />
      </div>
    </div>
  );
}
