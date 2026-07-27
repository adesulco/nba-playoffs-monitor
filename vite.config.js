import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite's dev server doesn't run the Vercel functions in api/ — it serves
// them as static JS source, so every /api call fails locally and any
// data-driven screen renders its empty state. That made the R2 surfaces
// unverifiable in dev.
//
// Set DEV_API_PROXY=https://www.gibol.co (or a preview URL) to proxy /api
// at a real deployment. Opt-in on purpose, because it points local dev at
// real data. Safe for QA: guest mode never writes to the server (guest
// picks sit in localStorage until claimed) and authed writes need a real
// session — but don't run admin/scoring actions behind it.
const apiTarget = process.env.DEV_API_PROXY;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    ...(apiTarget
      ? { proxy: { '/api': { target: apiTarget, changeOrigin: true, secure: true } } }
      : {}),
  },
  build: { outDir: 'dist', sourcemap: false },
});
