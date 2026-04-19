// Single source of truth for the app's displayed version + build date.
// Update APP_VERSION when cutting a new release. BUILD_DATE is stamped
// at import time; for production we rely on CI/Vercel build time to be
// close enough.
//
// Convention:
//   - Treat this moment (post-recovery from origin/main, April 2026) as
//     the true v0.1.0 baseline.
//   - Patch bumps for bug-fix-only ships (0.1.x).
//   - Minor bumps for new features (0.2.0, 0.3.0…).
//   - Major bump when a sport beyond NBA goes live (1.0.0 when IBL ships).

export const APP_VERSION = '0.1.2';

// Short ISO date. Vite replaces import.meta.env.VITE_BUILD_DATE at build
// time if set (see vercel.json / build command); otherwise falls back to
// the module's import time.
export const BUILD_DATE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BUILD_DATE) ||
  new Date().toISOString().slice(0, 10);

export const VERSION_LABEL = `v${APP_VERSION} · ${BUILD_DATE}`;
