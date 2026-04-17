# Monitoring the Playoffs — NBA 2026

Bloomberg-terminal-style live dashboard for the 2026 NBA Playoffs. Pulls real data from Polymarket and ESPN every 30 seconds, with WebSocket-driven tick updates for the top 3 championship contenders.

## Features

- **Live championship odds** from Polymarket Gamma API (30s poll)
- **WebSocket tick updates** from Polymarket CLOB for top 3 teams
- **7-day price sparklines** per team from CLOB price history
- **Live game scores** from ESPN scoreboard API
- **MVP race leaderboard** from Polymarket
- **Full Round 1 bracket** with favorite highlighting
- **Mobile-responsive** — stacks cleanly below 1280px
- **Graceful degradation** — every panel shows LIVE/CACHED/OFFLINE state

## Stack

- Vite + React 18
- Zero backend — all APIs called directly from the browser (CORS-enabled)
- Ships as a static site

## Local development

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Production build

```bash
npm run build
npm run preview  # test locally
```

## Deployment

### Vercel (recommended)

```bash
npm i -g vercel
vercel        # preview deploy
vercel --prod # production
```

On first run, Vercel auto-detects Vite, sets build command and output directory, and asks which project to link to. Accept the defaults.

### Netlify (alternative)

```bash
npm i -g netlify-cli
netlify deploy --build        # preview
netlify deploy --build --prod # production
```

### Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist
```

## GitHub auto-deploy

After pushing to GitHub and linking the Vercel project once:

1. Every push to `main` → production deploy
2. Every PR → preview deploy with unique URL

Alternatively, the `.github/workflows/deploy.yml` gives you full CI control if you add three repo secrets:
- `VERCEL_TOKEN` — from vercel.com/account/tokens
- `VERCEL_ORG_ID` — from your project's `.vercel/project.json`
- `VERCEL_PROJECT_ID` — same file

## Project structure

```
src/
├── App.jsx                       # Main dashboard
├── main.jsx                      # React entry
├── index.css                     # Global styles + responsive breakpoints
├── components/
│   ├── Bracket.jsx               # R1 bracket viz (E + W)
│   └── Sparkline.jsx             # SVG sparkline
├── hooks/
│   ├── usePlayoffData.js         # 30s polling orchestrator
│   └── usePolymarketWS.js        # CLOB WebSocket subscriber
└── lib/
    ├── api.js                    # Polymarket + ESPN clients
    └── constants.js              # Team metadata, fallback data, colors
```

## Data sources

| Source | Endpoint | Purpose | Auth |
|---|---|---|---|
| Polymarket Gamma | `gamma-api.polymarket.com/events` | Championship + MVP odds, volume | None |
| Polymarket CLOB | `clob.polymarket.com/prices-history` | Sparkline price history | None |
| Polymarket CLOB WS | `wss://ws-subscriptions-clob.polymarket.com/ws/market` | Live price ticks | None |
| ESPN | `site.api.espn.com/.../scoreboard` | Today's game scores | None |

Rate limits: Gamma 500 req/10s, CLOB generous. Polling at 30s uses ~0.2% of budget.

## Extending

**Add a new prediction market:**
1. Find event slug in Polymarket URL
2. Add a fetcher in `src/lib/api.js` following `fetchMvpOdds` pattern
3. Wire it into `usePlayoffData`

**Customize colors:** edit `COLORS` in `src/lib/constants.js`

**Change refresh rate:** pass different ms to `usePlayoffData(ms)` in `App.jsx`

**Add analytics:** install `@vercel/analytics` or Plausible; one import in `main.jsx`

## License

MIT
