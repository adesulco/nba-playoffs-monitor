import { useApp } from '../lib/AppContext.jsx';

// ============================================================================
// v0.81.0 — Pick'em i18n helper.
//
// The Pick'em surface shipped Bahasa-only (hardcoded strings, no i18n) while
// the rest of the app defaults to English with an ID/EN toggle in the TopBar
// (AppContext lang, default 'en'). Per Ade's directive — "English first
// language, Bahasa secondary" — Pick'em now follows the same global lang.
//
// Rather than a 200-key central dict (overkill for one feature), we expose a
// tiny inline translator: tx(en, id) returns the English string by default and
// the Bahasa string only when the user has flipped the global toggle to ID.
// Pass the Bahasa second; omit it to fall back to English for both.
//
//   const tx = usePickemT();
//   tx('Predict today', 'Prediksi hari ini')   // 'en' → English, 'id' → Bahasa
//   tx('Leaderboard')                           // same in both
//
// Reads the global lang from AppContext — every Pick'em screen renders under
// <AppProvider>, so the hook is always available.
// ============================================================================

export function usePickemT() {
  const { lang } = useApp();
  return (en, id) => (lang === 'id' && id != null ? id : en);
}

// Non-hook variant for pure helpers that already have `lang` in scope.
export function px(lang, en, id) {
  return lang === 'id' && id != null ? id : en;
}
