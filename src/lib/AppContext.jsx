import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createTranslator } from './i18n.js';
import { trackEvent } from './analytics.js';

const THEME_STORAGE_KEY = 'gibol:theme';
const LANG_STORAGE_KEY = 'gibol:lang';
const F1_CONSTRUCTOR_KEY = 'gibol:f1:constructor';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const [lang, setLang] = useState(() => {
    try {
      // Respect the user's explicit choice if they've toggled before.
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'id') return saved;
    } catch {}
    // Default to English for all first-time visitors regardless of browser locale.
    // Users can flip to Bahasa Indonesia via the ID/EN toggle in the TopBar.
    return 'en';
  });

  useEffect(() => {
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {}
    // F18 — sync <html lang> globally so screen readers + translators pick the
    // right mode. Helmet also sets this per-route via SEO.jsx; this line makes
    // sure the attribute is correct on first paint even before Helmet hydrates.
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const t = useMemo(() => createTranslator(lang), [lang]);

  // v0.2.5 — F1 constructor pick (parallel to NBA TeamPicker). Persists
  // across reloads via localStorage. Stored as the team `id` (e.g. 'mclaren')
  // not the slug; UI resolves id → meta via TEAMS_BY_ID.
  const [selectedConstructor, setSelectedConstructor] = useState(() => {
    try {
      const saved = localStorage.getItem(F1_CONSTRUCTOR_KEY);
      return saved && saved !== 'null' ? saved : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (selectedConstructor) {
        localStorage.setItem(F1_CONSTRUCTOR_KEY, selectedConstructor);
      } else {
        localStorage.removeItem(F1_CONSTRUCTOR_KEY);
      }
    } catch {}
  }, [selectedConstructor]);

  const value = {
    theme,
    toggleTheme: () => setTheme((x) => {
      const next = x === 'dark' ? 'light' : 'dark';
      trackEvent('theme_toggle', { to: next });
      return next;
    }),
    lang,
    toggleLang: () => setLang((x) => {
      const next = x === 'en' ? 'id' : 'en';
      trackEvent('lang_toggle', { to: next });
      return next;
    }),
    t,
    selectedConstructor,
    setSelectedConstructor: (id) => {
      trackEvent('f1_constructor_select', { to: id || 'clear' });
      setSelectedConstructor(id);
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
