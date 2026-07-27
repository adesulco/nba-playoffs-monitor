/**
 * Bottom tab bar — Main · Grup · Skor · Kabar (R2 screen 4).
 *
 * The locked navigation grammar from #t4: 2px ink top border, tab-bar
 * surface, active = scarlet, inactive = muted, ~22px bottom safe-area
 * padding. Icons come from the inline-SVG set (the canvas's ▲●▶■ were
 * placeholders and explicitly not shipping).
 *
 * Kabar renders muted and inert until Kabar v1 lands in R4 — a tab that
 * navigates nowhere is worse than one that visibly isn't ready yet, and
 * the grammar stays intact either way.
 */

import { useNavigate } from 'react-router-dom';
import { IconMain, IconGrup, IconSkor, IconKabar } from './icons4a.jsx';

export default function TabBar4a({ active = 'main', grupCode, lang = 'en' }) {
  const navigate = useNavigate();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const tabs = [
    { key: 'main', Icon: IconMain, label: tx('Main', 'Main'), to: '/main' },
    {
      key: 'grup',
      Icon: IconGrup,
      label: tx('Grup', 'Grup'),
      // Straight to the grup when we know which one; otherwise the picker.
      to: grupCode ? `/grup/${grupCode}` : '/pickem/grup',
    },
    { key: 'skor', Icon: IconSkor, label: tx('Skor', 'Skor'), to: '/skor' },
    { key: 'kabar', Icon: IconKabar, label: tx('Kabar', 'Kabar'), soon: true },
  ];

  return (
    <nav style={S.bar} aria-label={tx('Main navigation', 'Navigasi utama')}>
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
