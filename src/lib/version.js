// Single source of truth for the app's displayed version + build date.
// Update APP_VERSION when cutting a new release. BUILD_DATE is stamped
// at import time; for production we rely on CI/Vercel build time to be
// close enough.
//
// Convention:
//   - Treat post-recovery from origin/main (Apr 2026) as the true v0.1.0 baseline.
//   - Patch bumps for bug-fix-only ships (0.1.x).
//   - Minor bumps for new-feature / infra milestones (0.2.0, 0.3.0…).
//   - Major bump when the first non-NBA sport goes live to users (1.0.0).
//
// v0.2.0 — multi-sport infra milestone. Home now shows NBA + F1/EPL/FIFA/Liga 1
// as coming-soon cards. Adapter pattern, /api/proxy edge cache, feature flags,
// SportErrorBoundary, generic prerender, /api/health/data-sources all landed.
// NBA stack itself is untouched — live hooks still hit ESPN/Polymarket directly
// until each sport adapter migrates through the proxy in its phase.

export const APP_VERSION = '0.2.0';

// Short ISO date. Vite replaces import.meta.env.VITE_BUILD_DATE at build
// time if set (see vercel.json / build command); otherwise falls back to
// the module's import time.
export const BUILD_DATE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BUILD_DATE) ||
  new Date().toISOString().slice(0, 10);

export const VERSION_LABEL = `v${APP_VERSION} · ${BUILD_DATE}`;
