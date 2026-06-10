// Minimal lint gate — v0.79.25 (NBA-hub outage postmortem).
//
// The /nba-playoff-2026 hub shipped broken for days because Bracket.jsx
// passed `oddsMap={oddsMap}` after the Polymarket strip deleted the
// variable: Vite builds don't resolve identifiers, so the ReferenceError
// only fired at render time, inside the error boundary, on a surface
// nobody re-visited. `no-undef` catches that class at build time.
//
// Deliberately ONLY correctness rules — no style opinions. Run with:
//   npm run lint        (wired into `npm run build` via prebuild)
export default [
  {
    files: ['src/**/*.{js,jsx}', 'api/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        // browser
        window: 'readonly', document: 'readonly', navigator: 'readonly',
        localStorage: 'readonly', sessionStorage: 'readonly', fetch: 'readonly',
        console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly', URL: 'readonly',
        URLSearchParams: 'readonly', AbortController: 'readonly',
        CustomEvent: 'readonly', Event: 'readonly', WebSocket: 'readonly',
        IntersectionObserver: 'readonly', ResizeObserver: 'readonly',
        MutationObserver: 'readonly', requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly', performance: 'readonly',
        crypto: 'readonly', Blob: 'readonly', File: 'readonly',
        FileReader: 'readonly', FormData: 'readonly', Image: 'readonly',
        history: 'readonly', location: 'readonly', alert: 'readonly',
        atob: 'readonly', btoa: 'readonly', structuredClone: 'readonly',
        getComputedStyle: 'readonly', matchMedia: 'readonly',
        DOMParser: 'readonly', Notification: 'readonly', caches: 'readonly',
        self: 'readonly', gtag: 'readonly', dataLayer: 'readonly',
        TextEncoder: 'readonly', TextDecoder: 'readonly',
        queueMicrotask: 'readonly', reportError: 'readonly',
        // node (api/ + scripts/) + edge runtime (api/recap/*)
        process: 'readonly', Buffer: 'readonly', global: 'readonly',
        __dirname: 'readonly', module: 'readonly', require: 'readonly',
        Response: 'readonly', Request: 'readonly', Headers: 'readonly',
        // test/dev
        vi: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly',
      },
    },
    linterOptions: {
      // The repo predates this config — it carries aspirational
      // eslint-disable comments (react-hooks/exhaustive-deps, no-console)
      // for rules this minimal gate doesn't load. Don't fail on them.
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      // The one rule that would have caught the outage.
      'no-undef': 'error',
      // Cheap adjacent correctness wins, zero style noise.
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
];
