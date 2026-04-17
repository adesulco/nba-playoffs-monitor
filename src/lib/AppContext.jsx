import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createTranslator } from './i18n.js';

const THEME_STORAGE_KEY = 'gibol:theme';
const LANG_STORAGE_KEY = 'gibol:lang';

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
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'id') return saved;
      if ((navigator.language || '').toLowerCase().startsWith('id')) return 'id';
    } catch {}
    return 'en';
  });

  useEffect(() => {
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {}
  }, [lang]);

  const t = useMemo(() => createTranslator(lang), [lang]);

  const value = {
    theme,
    toggleTheme: () => setTheme((x) => (x === 'dark' ? 'light' : 'dark')),
    lang,
    toggleLang: () => setLang((x) => (x === 'en' ? 'id' : 'en')),
    t,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
