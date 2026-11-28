/**
 * Bottom tab bar — Main · Grup · Skor (Playoff Pick'em v3, Decision D5).
 *
 * Trimmed from 4 tabs to the focused 3-tab Playoff shell so 100% of navigation
 * serves the core loop (pick -> grup -> live score). /kabar remains reachable
 * by direct URL, never crowding the bottom bar.
 */

import { useNavigate } from 'react-router-dom';
import { IconMain, IconGrup, IconSkor } from './icons4a.jsx';

export default function TabBar4a({ active = 'main', grupCode, lang = 'id' }) {
  const navigate = useNavigate();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const tabs = [
    { key: 'main', Icon: IconMain, label: tx('Play', 'Main'), to: '/' },
    {
      key: 'grup',
      Icon: IconGrup,
      label: tx('Grup', 'Grup'),
      to: grupCode ? `/grup/${grupCode}` : '/grup',
    },
    { key: 'skor', Icon: IconSkor, label: tx('Scores', 'Skor'), to: '/skor' },
  ];

  return (
    <nav className="g4-tabbar" style={S.bar} aria-label={tx('Main navigation', 'Navigasi utama')}>
      {tabs.map(({ key, Icon, label, to, soon }) => {
        const isActive = key === active;
        const inert = soon || !to;
        return (
          <button
            key={key}
            type="button"
            disabled={inert}
            aria-current={isActive ? 'page' : undefined}
            onClick={inert ? undefined : () => navigate(to)}
            style={{
              ...S.tab,
              color: isActive ? 'var(--g4-accent)' : 'var(--g4-muted)',
              opacity: inert ? 0.45 : 1,
              cursor: inert ? 'default' : 'pointer',
            }}
          >
            <Icon size={20} />
            <span style={{ ...S.label, fontWeight: isActive ? 700 : 600 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const S = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 480,
    margin: '0 auto',
    display: 'flex',
    borderTop: 'var(--g4-rule-strong) solid var(--g4-text)',
    background: 'var(--g4-tabbar-bg)',
    padding: '10px 8px var(--g4-safe-bottom)',
    boxSizing: 'border-box',
    zIndex: 40,
  },
  tab: {
    appearance: 'none',
    background: 'none',
    border: 'none',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: 0,
  },
  label: { font: '600 11px/1 var(--g4-font-ui)' },
};
