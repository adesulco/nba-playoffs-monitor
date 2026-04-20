import React from 'react';
import { COLORS as C } from '../lib/constants.js';

/**
 * Per-sport error boundary — multi-sport build plan §2.3.
 *
 * Wraps each sport route so an unhandled render error in (e.g.) the F1 adapter
 * shows a polite fallback instead of white-screening the whole SPA. NBA must
 * never be affected by F1's problems, and vice versa.
 *
 * Usage in App.jsx:
 *   <SportErrorBoundary sport="f1" sportLabel="Formula 1 2026">
 *     <F1 />
 *   </SportErrorBoundary>
 */
export default class SportErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to console (and to Vercel logs via the global error handler if
    // one is wired up later). Keep this cheap — no network calls on the error
    // path, that only makes things worse when the issue is network-related.
    // eslint-disable-next-line no-console
    console.error(`[SportErrorBoundary:${this.props.sport || 'unknown'}]`, error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const label = this.props.sportLabel || this.props.sport || 'dashboard ini';
    const lang = (typeof navigator !== 'undefined' && navigator.language?.startsWith('en')) ? 'en' : 'id';

    const headline = lang === 'id'
      ? `Lagi ada gangguan di ${label}`
      : `Something's up with ${label}`;
    const body = lang === 'id'
      ? 'Dashboard lain di gibol.co masih jalan normal. Coba refresh, atau balik ke beranda.'
      : "Other gibol.co dashboards are running fine. Try refreshing, or head back home.";
    const back = lang === 'id' ? '← Balik ke beranda' : '← Back to home';

    return (
      <div style={{
        background: C.bg, minHeight: '100vh', color: C.text,
        fontFamily: '"JetBrains Mono", monospace',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 480, textAlign: 'center',
          padding: 24, background: C.panel,
          border: `1px solid ${C.line}`, borderLeft: `3px solid #e8502e`,
          borderRadius: 4,
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚠️</div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 20, fontWeight: 600, marginBottom: 8,
            color: C.text, letterSpacing: -0.2,
          }}>
            {headline}
          </div>
          <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6, marginBottom: 18 }}>
            {body}
          </div>
          <a href="/" style={{
            display: 'inline-block', padding: '8px 14px',
            background: '#e8502e', color: '#fff',
            textDecoration: 'none', borderRadius: 3,
            fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
          }}>{back}</a>
        </div>
      </div>
    );
  }
}
