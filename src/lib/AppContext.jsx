import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createTranslator } from './i18n.js';
import { trackEvent } from './analytics.js';

const THEME_STORAGE_KEY = 'gibol:theme';
const LANG_STORAGE_KEY = 'gibol:lang';
const ACCENT_STORAGE_KEY = 'gibol:accent';
const F1_CONSTRUCTOR_KEY = 'gibol:f1:constructor';
const EPL_CLUB_KEY = 'gibol:epl:club';

// v2 introduces a third theme value ('auto' = follow OS). We resolve 'auto'
// → 'dark' | 'light' at runtime so the rest of the app only sees the two
// effective themes it already understands.
function resolveAutoTheme() {
  try {
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  // theme is the USER PREFERENCE ('auto' | 'dark' | 'light').
  // effectiveTheme is what actually gets applied ('dark' | 'light').
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
      // Legacy: no saved value → honor OS, same as before.
      if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
    } catch {}
    return 'dark';
  });

  const effectiveTheme = theme === 'auto' ? resolveAutoTheme() : theme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
  }, [theme, effectiveTheme]);

  // When theme is 'auto', live-update as the OS flips.
  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mq) return;
    const onChange = () => {
      document.documentElement.setAttribute(
        'data-theme',
        mq.matches ? 'light' : 'dark',
      );
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [theme]);

  const [lang, setLang] = useState(() => {
    try {
      // Respect the user's explicit choice if they've toggled before.
      // Internal storage uses ISO 639-1 'id'; the v2 UI labels it 'BI'.
      // 'bi' is accepted as a synonym for back-compat and mapped to 'id'.
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'id') return saved;
      if (saved === 'bi') return 'id';
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

  // v2 accent — optional per-user hex override for the --accent CSS var.
  // TeamPicker bridges into this so "Set as accent" on a team page tints the
  // hero gradient + pinned cards globally. null = fall back to --amber default.
  const [accent, setAccentState] = useState(() => {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (saved && /^#[0-9A-Fa-f]{6}$/.test(saved)) return saved;
    } catch {}
    return null;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (accent) {
      root.style.setProperty('--accent', accent);
      try { localStorage.setItem(ACCENT_STORAGE_KEY, accent); } catch {}
    } else {
      root.style.removeProperty('--accent');
      try { localStorage.removeItem(ACCENT_STORAGE_KEY); } catch {}
    }
  }, [accent]);

  const t = useMemo(() => createTranslator(lang), [lang]);

  // v0.6.4 — EPL favorite club. Persists the clubs.js slug (e.g.
  // 'arsenal'). Consumers resolve slug → metadata via CLUBS_BY_SLUG.
  const [selectedEPLClub, setSelectedEPLClub] = useState(() => {
    try {
      const saved = localStorage.getItem(EPL_CLUB_KEY);
      return saved && saved !== 'null' ? saved : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (selectedEPLClub) {
        localStorage.setItem(EPL_CLUB_KEY, selectedEPLClub);
      } else {
        localStorage.removeItem(EPL_CLUB_KEY);
      }
    } catch {}
  }, [selectedEPLClub]);

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
    // theme = user preference ('auto' | 'dark' | 'light')
    // effectiveTheme = resolved value actually applied ('dark' | 'light')
    theme,
    effectiveTheme,
    toggleTheme: () => setTheme((x) => {
      // Legacy two-way toggle: swap current effective to the opposite concrete value.
      // v2 top-bar popover will call setTheme('auto' | 'dark' | 'light') directly.
      const next = effectiveTheme === 'dark' ? 'light' : 'dark';
      trackEvent('theme_toggle', { to: next });
      return next;
    }),
    setTheme: (next) => {
      if (next !== 'auto' && next !== 'dark' && next !== 'light') return;
      trackEvent('theme_set', { to: next });
      setTheme(next);
    },
    lang,
    toggleLang: () => setLang((x) => {
      const next = x === 'en' ? 'id' : 'en';
      trackEvent('lang_toggle', { to: next });
      return next;
    }),
    t,
    // v2: accent color override for --accent CSS var. Pass a #RRGGBB hex or
    // null to clear. Components that want to bridge into it (e.g. TeamPicker)
    // call setAccent from useApp().
    accent,
    setAccent: (hex) => {
      if (hex !== null && !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
      trackEvent('accent_set', { to: hex || 'clear' });
      setAccentState(hex);
    },
    selectedConstructor,
    setSelectedConstructor: (id) => {
      trackEvent('f1_constructor_select', { to: id || 'clear' });
      setSelectedConstructor(id);
    },
    selectedEPLClub,
    setSelectedEPLClub: (slug) => {
      trackEvent('epl_club_select', { to: slug || 'clear' });
      setSelectedEPLClub(slug);
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
