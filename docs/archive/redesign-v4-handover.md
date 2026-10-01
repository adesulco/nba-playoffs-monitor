# Gibol Redesign v4 — Handover Plan for Claude Code

> **Author:** CPO/architect partner (Claude desktop, 2026-05-03)
> **For:** Claude Code (running on Ade's Mac at `~/Documents/Claude/Projects/Gibol/nba-playoffs-monitor`)
> **Source design:** `design_handoff_gibol_v4/` from the design team (uploaded 2026-05-03)
> **Status:** Ready to start. Decisions below were made by Ade on intake; do not relitigate.

---

## 0 · Why this exists

The design team shipped a four-screen, hi-fi redesign covering Home, NBA Dashboard, Game Center, and Article. It's a Direction-B "editorial-led newsroom" treatment — flat design, dark/cream paper themes, three-family type system (Inter Tight + Newsreader + JetBrains Mono), tight 8px grid, AI disclosure as a first-class element, and a flat color depth model with no shadows.

The design is desktop-only (1280px boards), is pixel-faithful but contains one real bug (bilingual no-op) and several handoff caveats (no mobile breakpoints, no empty/error/loading states, hard-coded data, illustrations not photos).

**Strategic posture:** treat the v4 bundle as authoritative for **tokens, type, chrome, and screen composition**. Treat it as guidance — not gospel — for everything else. Apply the existing Phase 2 mobile-first directive (`docs/phase-2-ux-directive.md`) over the top.

---

## 1 · Decisions Ade made on intake (do not relitigate)

| # | Question | Decision |
|---|---|---|
| D1 | Article content source | **Use existing content engine.** `/editor` already generates Bahasa articles via the pipeline in `api/_lib/`, `supabase/migrations/0006-0011`, and serves them at `/preview`, `/match-recap`, `/standings`, `/team`, `/h2h`. v4's Article screen renders these — does not replace the pipeline. |
| D2 | Mobile vs hub-hero conflict | **Mobile-first wins. No hub hero.** v4's giant NBA-dashboard hero is rejected for hubs. The hero treatment moves to Game Center + Article only. Hubs keep the Phase 2 status-strip pattern (`<HubStatusStrip>`). |
| D3 | Live AI summary cadence | **Cron + cache, 60–90s refresh.** Edge function per live game, writes to a Supabase row, edge-cache reads it. UI label says "diperbarui ~1m yang lalu," not "8s ago." |
| D4 | Fonts + photography | **CPO call: Newsreader preloaded; photography progressive.** Add Newsreader (400, 600, 700, 800) to the existing Google Fonts preload (~30KB). Keep v4's SVG illustrations as the fallback; swap real photos in as the editorial pipeline produces them, with `alt` text in Bahasa, photographer credit, and copyright field on every record. |

Three more standing rules from project memory that must hold throughout this redesign:

- **Bahasa default.** Every new copy string ships in Bahasa first; English is the user-toggle. Do not propose English-default chrome.
- **Hub no-hero.** NBA's existing pattern (status strip + immediate content) is canonical — reaffirmed by D2.
- **Four protected surfaces.** Derby (`/derby/:slug`), FIFA WC teaser, Liga 1 teaser, push notifications + scanner cron. Do not regress any of these. They live in parallel to this redesign on the growth track.

---

## 2 · Repo state on the Mac (verified 2026-05-03 against local working tree)

This is the state Claude Code is starting from. **Verify before doing anything destructive** — run `git status` and `git log -1` first; if either disagrees with what's here, stop and tell Ade.

- **Branch:** `main`, working tree dirty with ~89 modified + 170 untracked files.
- **Last commit on origin/main:** `98717d8 v0.6.9 → v0.10.0 sprint: parity matrix + retention foundation`
- **`package.json` version field:** `0.5.7` in working tree (HEAD says `0.2.10` — the commit messages drifted from the field; do not rely on either as source of truth).
- **What's already on disk but not yet committed (huge):** `src/pages/Editor.jsx`, `src/pages/Preview.jsx`, `src/pages/MatchRecap.jsx`, `src/pages/Standings.jsx`, `src/pages/Derby.jsx`, `src/pages/SuperLeague.jsx`, `src/pages/SuperLeagueClub.jsx`, `src/pages/NBAGameDeepLink.jsx`, the `public/content/{preview,recap,standings,team,h2h}/` directories of generated articles, `api/approve.js`, `api/derby.js`, `api/news.js`, the `MobileBottomNav` + `ScrollToHash` chrome, plus migrations `0006_content_engine.sql` through `0011_article_rejections.sql`. Treat these as **inherited foundation** — the redesign does not rebuild them.
- **v2 design system already in repo:** `src/components/v2/{Board,Card,Pill,Crest,TopBar,Spark,Momentum,Icon,Button,SearchPalette,ThemePopover,states}.jsx` plus the index. The existing v2 tokens in `src/index.css` already match the v4 dark + cream-paper palettes within ~one shade per token. **Extend v2; do not replace it.**
- **Routes in `src/App.jsx` (working tree, not HEAD):** Home, HomeV1, NBADashboard, TeamPage, NBAGameDeepLink, IBL, FIFA, EPL, EPLClub, LigaIndonesia, SuperLeague, SuperLeagueClub, Derby, Tennis, TennisTournament, TennisRankings, Recap, Preview, MatchRecap, Editor, Standings, plus all `/bracket/*`, `/league/*`, `/leaderboard/*`, `/auth/*` routes.
- **i18n:** `src/lib/i18n.js` `LOCALES` dict + `useApp().t()`. Working — extend it, do not rebuild.
- **Theme:** `[data-theme="light"|"dark"]` via `<ThemePopover>`. Working — extend.
- **UI flag system:** `src/lib/flags.js` `UI.v2` is currently `false`. v0.6.3 explicitly rolled back HomeV1 because the chrome was inconsistent with sport hubs. **The v4 redesign is the unifying chrome that lets us flip `UI.v2` back to true.**

---

## 3 · The five jobs the redesign actually does

Reading the v4 bundle alongside our existing surfaces, the redesign fans out into five buckets. Phases below match these.

1. **Token + chrome unification** — bring v3 primitives' dark + paper tokens into `src/index.css`, add Newsreader, normalize `<TopBar>` + sub-nav across every sport.
2. **Editorial chrome** — drop cap, pull quote, AI byline pill, "How was this written?" footnote. Apply to `Preview`, `MatchRecap`, `Standings`, `TeamPage`, and any future generated article without rebuilding their data fetchers.
3. **Hub revamp** — extend the existing `<HubStatusStrip>` + KPI / schedule / picker rows with v4 typography rhythm and the Newsroom Slice card row that pulls the latest 3 articles for that sport from `public/content/`.
4. **Game Center (NEW)** — single deep-dive page per live game. Hero score, by-quarter, top performers, AI live summary (cron+cache), win-prob spark, play feed, series tracker. NBA only in v1; the schema and component tree must be sport-agnostic so EPL/F1/Tennis can inherit.
5. **Home (Evolution)** — one chosen Home that replaces both the gateway `Home.jsx` and the personalized `HomeV1.jsx`. Front-page sentence + 3-column desktop / 1-column mobile / live console + newsroom. Behind `UI.v2` flag; default OFF until phases 1–4 are stable.

---

## 4 · Phased rollout (each phase is one ship-this-week)

Every phase has a paste-ready starting prompt, a file-touch list, an acceptance bar, and an explicit "what stays untouched." Phases 1–3 are independent; 4 depends on 1–2; 5 depends on 1–4.

### Phase A — Tokens, fonts, AI byline primitive (1–2 days)

**Goal:** the editorial type system + AI byline ship as primitives, no surface change yet.

**Files to touch:**
- `index.html` — extend the existing Google Fonts preload to include `Newsreader:wght@400;500;600;700;800&display=swap`. Keep `Inter Tight` + `JetBrains Mono`.
- `src/index.css` — add the missing v4 tokens that aren't already aliased: `--ink-5`, `--line-loud`, `--blue-soft`, `--amber-soft`, `--live-soft`, the `--paper` reference. Add `.serif`, `.kicker`, `.deck`, `.disp`, `.card-title` utility classes scoped under `.v2` (do NOT pollute the global namespace; legacy components keep rendering).
- `src/components/v2/AiByline.jsx` (NEW) — port `V4AiByline` from `design_handoff_gibol_v4/v4/extras.jsx`. Exports default. Two variants: small pill (inline next to byline) and full bar (used inside Game Center live summary card).
- `src/components/v2/EditorialFootnote.jsx` (NEW) — the "How was this written?" disclosure block. Reads article frontmatter (`ai`, `sources[]`, `editor`) from props. Always rendered, even on human-only pieces.
- `src/components/v2/index.js` — re-export both new components.

**Acceptance:**
- `npm run build` passes.
- Lighthouse mobile FCP regresses by ≤80ms after Newsreader add (verify on `/`).
- `<AiByline />` renders in Storybook-equivalent (just stick it in `/glossary` temporarily and screenshot).

**What stays untouched:** every existing page renders identically. No route changes. No data hook changes.

**Paste-ready prompt for Claude Code:**
```
Read docs/redesign-v4-handover.md §4 Phase A. Implement exactly that scope —
tokens + Newsreader + V2 AiByline + V2 EditorialFootnote. No other changes.
Verify with `npm run build` and `npx vercel build` locally. Ship as v0.6.10.
```

---

### Phase B — Editorial chrome on existing generated-article pages (2–3 days)

**Goal:** every page rendered by `/preview`, `/match-recap`, `/standings`, `/team`, `/h2h` gets the v4 article reading layout — without touching the underlying content engine, the markdown body parser, or the Supabase ledger.

**Files to touch:**
- `src/pages/GeneratedArticle.jsx` (working-tree, the shared body renderer per the App.jsx comments — Preview/MatchRecap/Standings all delegate to it) — wrap its output in a v4 article shell: full-bleed hero band (use the `V4Img` SVG illustration based on sport tag if no photo URL is set), kicker + meta caption strip, `h1.disp.serif` headline, `.deck` standfirst, drop cap on first paragraph, pull-quote variant for `<blockquote>`. Tags + `<EditorialFootnote />` at the bottom. Reading column max-width 720px; right rail (sticky) for "in this story" + related series.
- `src/pages/Preview.jsx`, `src/pages/MatchRecap.jsx`, `src/pages/Standings.jsx` — drop-in, no logic change. They just consume the new shell.
- `src/components/v2/HeroBand.jsx` (NEW) — full-bleed photo/illustration with gradient overlay + caption strip. Used by Article + Game Center hero.
- `src/components/v2/PullQuote.jsx` (NEW) — `<blockquote>` styling per v4 spec.
- `src/components/v2/InlineDataCard.jsx` (NEW) — the "bench problem · Q3 minutes" mid-article stat block. Receives `{ title, columns: [{label, value, color, sub}] }`. Sport-agnostic.

**Mobile-first overrides (per D2):**
- Hero band height: `clamp(220px, 38vw, 380px)`. Headline: `clamp(28px, 6vw, 44px)`.
- Reading column collapses to full-width; right rail moves below body, not sticky.
- Drop cap stays on mobile (it's fine, ~64px serif glyph at 480px viewport).

**Acceptance:**
- Open a real generated `/preview/{slug}` URL on a 360×700 viewport — first paint shows hero + kicker + headline within 568px of vertical content.
- `<EditorialFootnote />` renders even on `ai=false` articles, with the right copy ("Reportase dan penulisan oleh X. Tidak ada AI yang digunakan.").
- Existing canonical/JSON-LD/sitemap entries for these pages are unchanged. Verify with `curl -s gibol.co/preview/{slug} | grep canonical`.

**What stays untouched:** `api/approve.js`, the editor at `/editor`, the content cron, all Supabase tables, the markdown body parser. We are repainting the room, not rewiring it.

**Paste-ready prompt for Claude Code:**
```
Read docs/redesign-v4-handover.md §4 Phase B. Build the editorial article
shell + 3 new v2 primitives (HeroBand, PullQuote, InlineDataCard) + the
EditorialFootnote auto-render. Apply to Preview, MatchRecap, Standings.
Mobile-first per §4 mobile overrides. Do NOT touch api/, supabase/, or
the content cron. Verify all 3 routes load on 360px and on 1280px. Ship as v0.6.11.
```

---

### Phase C — Hub revamp + Newsroom Slice (3–4 days)

**Goal:** every sport hub picks up the v4 visual language — sub-nav, tightened type rhythm, Newsroom Slice card row — without breaking the journey budget.

**Files to touch:**
- `src/components/v2/SubNav.jsx` (NEW) — the second tier of `<TopBar>` per v4 (`Overview · Live · Standings · Bracket · Fixtures · Stats · News · Teams`). Renders below `<V2TopBar>` when `subnavItems` prop is passed. Active state = `bg-3` background + 2px sport-color underline.
- `src/components/v2/NewsroomSlice.jsx` (NEW) — the 3-up article card grid that lives at the bottom of every sport hub. Reads from `public/content/index.json` (the existing manifest) filtered by `sport` and `published_at desc`. First card is the lead (16/9 image + deck + meta), 2-3 are stacked compact cards. AI byline pill on each AI-touched headline.
- `src/components/v2/SectionRule.jsx` (NEW) — the editorial section divider (`────  NBA NEWSROOM  ────  /nba/news →`). Amber variant for editorial sections, default variant for utility sections.
- Hub pages — `NBADashboard.jsx`, `EPL.jsx`, `F1.jsx`, `Tennis.jsx`, `SuperLeague.jsx`, `LigaIndonesia.jsx`, `IBL.jsx`, `FIFA.jsx` — each one:
  - Gets `<SubNav>` wired into its `<V2TopBar>`.
  - Gets `<NewsroomSlice>` mounted at the bottom (behind `UI.v2` so old hubs render unchanged when the flag is off).
  - Top-of-hub structure stays as-is per the no-hub-hero rule.
  - Type rhythm pass: section titles use `.serif` for `<h2>`, `JetBrains Mono` for `.card-title` eyebrows.

**Acceptance:**
- All 8 hubs render with `<NewsroomSlice>` showing real content from `public/content/`.
- Mobile journey J1 ("Is anything live right now?") still passes the stopwatch — first match-card row visible at first paint on 360×700.
- No regression on the four protected surfaces (Derby, FIFA WC, Liga 1, push). Open each, screenshot, compare.

**What stays untouched:** All hub data hooks. The existing `<HubStatusStrip>`, `<KpiStrip>`, `<ScheduleStrip>`, `<HubPicker>` from Phase 2 — those wrappers absorb the new sub-nav as a sibling, not a replacement.

**Paste-ready prompt for Claude Code:**
```
Read docs/redesign-v4-handover.md §4 Phase C. Build SubNav + NewsroomSlice +
SectionRule v2 primitives. Mount into all 8 sport hubs behind UI.v2 flag.
Do NOT add hero blocks. Do NOT touch protected surfaces (Derby, FIFA WC,
Liga 1, push). Verify protected surfaces with screenshots before/after.
Ship as v0.6.12.
```

---

### Phase D — Game Center (NEW SURFACE, NBA only in v1) (4–5 days)

**Goal:** new live deep-dive page per NBA game — hero score, by-quarter, top performers, live AI summary (cron+cache), win-prob spark, play feed, series tracker.

**Route:** `/nba-playoff-2026/game/:gameId` (extends the existing `NBAGameDeepLink.jsx` shell, which currently only handles canonical seeding). Sub-nav: `Live play · Box score · Shot chart · Play-by-play · Team stats · Preview · Recap`.

**New page:** `src/pages/NBAGameCenter.jsx` — composes:
- Header strip (`NBA · WEST CONF SF · GM 3 · BALL ARENA · 03 MAY · 19:30 LOCAL`)
- Score hero card (3-col grid: home crest+meta+W/L strip / score+pulse / away crest+meta+W/L strip) + `<Momentum />` bar
- Body 2-col grid: main column has By-quarter table → Top performers (4 cards) → Live AI summary card. Right rail has Win prob spark → Play feed (max-height 280, scroll) → Series tracker (G1–G5 strip, current game in `live` state).

**New v2 primitives:**
- `src/components/v2/QuarterTable.jsx` — 2-row table (home / away), 6 columns (label + 4 quarters + final). Mono tabular. Sport-agnostic (works for periods/halves/sets too — accept a `periods=['1Q','2Q','3Q','4Q','F']` prop).
- `src/components/v2/PlayerStatCard.jsx` — name + crest + position + 4-stat grid. `hot` flag highlights with amber.
- `src/components/v2/LiveSummaryCard.jsx` — amber-bordered card with AI byline header, body markdown, source line, "How is this written?" footer link. Reads from a Supabase row keyed by `game_id`.
- `src/components/v2/PlayFeed.jsx` — sport-agnostic ordered feed of `{t, team, text, big}` rows with team color stripes.
- `src/components/v2/SeriesTracker.jsx` — best-of-N strip with state per game (`won`, `live`, `scheduled`, `if_needed`).

**Infrastructure additions (Ade input needed):**

| Item | What | Approval |
|---|---|---|
| **`game_summaries` table** | New Supabase table: `game_id PK`, `sport`, `body_md`, `sources jsonb`, `editor text null`, `ai_model text`, `cost_cents int`, `updated_at`. RLS: public read for non-null `body_md`. | **Approved by D1+D3 — proceed.** Migration `0012_game_summaries.sql`. |
| **`/api/game-summary/:id` edge function** | GET reads cached row; if older than 90s and game is live, calls LLM with latest play-by-play, writes back, returns. POST is admin-only (matches editor auth). | **Approved by D3 — proceed.** Add to `api/`. Cron orchestrator (`.github/workflows/content-cron.yml`, already exists for editor pipeline) gets a 90s job per `live=true` game. |
| **LLM cost cap** | Hard daily ceiling per sport. Default $5/day for NBA in v1. Posthog event on every call. | **Default $5/day; Ade can change in `api/_lib/aiBudget.js`.** |
| **Win-prob spark data source** | Existing `useLiveWinProbs` hook (Polymarket WS). Right shape — pass `data=[…14 numbers]` to `<V2Spark />`. | No new infra. |
| **Play feed data source** | Existing `useGameDetails` ESPN PBP. Reshape to `{t, team, text, big}` — `big` flag = `play.scoringPlay && play.scoreValue >= 3`. | No new infra. |

**Acceptance:**
- `/nba-playoff-2026/game/{liveGameId}` renders all 7 sections on a live game.
- Live AI summary updates within 90s of an explicit force-refresh (curl the API).
- Mobile (360×700): score hero collapses to single column, by-quarter table horizontal-scrolls, right-rail moves below main body.
- Lighthouse mobile performance score ≥ 75 on a live game (this is the perf bar; live data is expensive).

**What stays untouched:** `LiveGameFocus.jsx` (the in-NBA-dashboard live focus) keeps working — it's a different surface (in-hub focus vs. dedicated game page). They coexist; the hub focus deep-links to Game Center.

**Paste-ready prompt for Claude Code:**
```
Read docs/redesign-v4-handover.md §4 Phase D. Build NBAGameCenter page +
5 v2 primitives + `game_summaries` Supabase migration + /api/game-summary/:id
edge function + cron entry. NBA only. Sport-agnostic primitives (periods,
not quarters). LLM budget $5/day default. Verify on a real live game URL.
Ship as v0.7.0 (minor bump — new surface).
```

---

### Phase E — Home (Evolution) + UI.v2 flip (5–7 days)

**Goal:** one Home — replaces both `Home.jsx` and `HomeV1.jsx`. Behind `UI.v2`, default OFF until QA passes; flip default ON in a follow-up patch ship.

**Page:** `src/pages/HomeV2.jsx` — composes:
- `<V2TopBar>` (existing, unchanged).
- `<V2LiveBand>` (NEW, port `V3LiveBand` from `v3/shell.jsx`) — single-row marquee strip of `LIVE · NBA DEN 78 BOS 82 Q3 4:12 · PL ARS 2 MCI 1 67' · ...`.
- Front-page sentence — auto-generated by the content engine (a new `homepage_sentence` row that updates every 5 min). 32px Newsreader serif. One paragraph, plain language. Bahasa default.
- Two-column body desktop / single-column mobile:
  - **Left (Live console):** hero live game card + 3 stacked compact tiles + "+ N more live · Lihat semua →" button.
  - **Right (Newsroom):** lead article + 3 secondary articles + Reading list module + Popular tags row.
- `<V2Footer>` (NEW or extended).

**Infrastructure:**
- New cron: every 5 min, edge function generates the homepage sentence, writes to `site_state` (single-row table, key=`homepage_sentence`).
- Reading list = uses existing `useWatchlist` (already in repo). No new schema. The "MONDAY EDITION" copy is a static editor pick from `public/content/reading-list-{YYYY-WW}.json`.

**The flip:**
- `src/lib/flags.js`: `UI.v2` defaults to `false` (unchanged in this phase).
- `src/App.jsx`: route `/` switches between `<Home />`, `<HomeV1 />`, and `<HomeV2 />` based on flag value (`v2` flag now tri-state via env var: `0`=v0, `1`=v1, `2`=v2; v0 default).
- A separate trivial follow-up ship flips the default to `2` once QA is done.

**Acceptance:**
- All five Phase 2 journeys (J1–J5) pass the stopwatch test on a real iPhone in under 15 seconds total.
- Front-page sentence renders with real cron data (not mock).
- Reading list shows the user's watchlist if logged in, falls back to editor pick if not.
- Lighthouse mobile performance ≥ 80, accessibility ≥ 95.

**What stays untouched:** Both old Homes coexist on disk until the v2 flip ship. We do NOT delete `Home.jsx` or `HomeV1.jsx` in this phase. Rollback path = flip env var.

**Paste-ready prompt for Claude Code:**
```
Read docs/redesign-v4-handover.md §4 Phase E. Build HomeV2 + LiveBand +
V2Footer + homepage_sentence cron. Wire tri-state UI.v2 flag in
flags.js + App.jsx. Default OFF. Verify all 5 Phase 2 journeys pass on
mobile. Do NOT delete Home.jsx or HomeV1.jsx. Ship as v0.7.1.
A separate v0.7.2 follow-up will flip UI.v2 default to 2.
```

---

## 5 · What is explicitly NOT in scope

- **Pick'em UI revamp.** Designed surfaces don't show Pick'em screens. Pick'em chrome inherits the new tokens automatically; no per-page rework.
- **OG image regeneration.** Existing static PNGs at `public/og/` keep working. v4 may want a future pass — separate ship.
- **Editor at `/editor` revamp.** Internal-only; admin tool. Inherits tokens; no further work.
- **Sport accent rebalance** (Phase 2 Sprint H, behind `VITE_FLAG_SPORT_ACCENT_V2`). Optional. Not required for this redesign.
- **Bracket / Leaderboard chrome.** Inherits tokens; no rework.
- **All four protected surfaces.** Derby, FIFA WC teaser, Liga 1 teaser, push notifications. Each ships parallel; this redesign does not touch them.

---

## 6 · Risks + mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Newsreader font payload regresses LCP on slow Indonesian 4G | Medium | `display=swap` (already set); subset to Latin only; preload only weight 700 inline, lazy-load others. Lighthouse gate at end of Phase A. |
| Live AI summary cron blows past LLM budget on multi-game playoff nights | Medium | Hard cap in `api/_lib/aiBudget.js`. Posthog alert at 80% of daily ceiling. Fallback to "Live update sedang ditunda" copy when cap hit. |
| `UI.v2` flip causes mobile journey regression we didn't catch in QA | High | Tri-state flag; rollback = env var change in Vercel; Home v0 + v1 stay on disk for one full release after flip. |
| Phase B's editorial wrapper accidentally breaks generated-article SEO (canonical, JSON-LD) | Medium | Acceptance check explicitly curls + greps. Add a `tests/seo-snapshot.test.js` that compares before/after curl output for 3 known slugs. |
| Design v4 bilingual no-op gets shipped as-is | Low | We're not porting `V4TweakSync`. We use existing `useApp().t()`. The bug is irrelevant once we don't use the prototype's plumbing. |
| v4 image illustrations look out of place once Phase 2 generates real photos | Medium | Component contract: `<HeroBand sport="nba" image={url|null} />`. When `image` is null, render the SVG illustration; when set, render the photo. No ship halts on photo readiness. |

---

## 7 · Decisions you (Claude Code) are allowed to make without asking

- File names + locations within `src/components/v2/` — match existing conventions.
- CSS class names (prefer scoped `.v2-*` to avoid legacy collisions).
- Bahasa copy choices for new strings — match the casual editorial register (gue/lo only in editorial body, formal in UI labels).
- Prop names + types on new primitives — pick what's clean.
- Test approach — match what's already in the repo (looks like nothing comprehensive yet; add `vitest` if you want, but don't block on it).

## 8 · Decisions you must escalate to Ade

- Anything that requires a Vercel env var change in production.
- Anything that touches `supabase/migrations/` beyond the one new `0012_game_summaries.sql`.
- Anything that adds a new third-party dependency >200KB.
- Anything that touches a protected surface (Derby, FIFA WC, Liga 1, push).
- Any decision to delete `Home.jsx` or `HomeV1.jsx`.
- Any ship that bumps the major version (1.0.0 is reserved for the first non-NBA sport going LIVE, not for redesigns).

---

## 9 · Source-of-truth references

- Design bundle: `design_handoff_gibol_v4/` (this folder, in the repo root)
  - Read order: `README.md` → `AUDIT.md` → `v3/primitives.jsx` → `v3/shell.jsx` → `v4/nba.jsx` → `v4/home.jsx`
- Phase 2 mobile-first directive: `docs/phase-2-ux-directive.md`
- Project rules: `CLAUDE.md` (root)
- Live status (when present): `docs/00-current-state.md` — currently absent on HEAD; create one in Phase A.
- Existing v2 system: `src/components/v2/index.js` and adjacent files.
- Content engine schema: `supabase/migrations/0006_content_engine.sql` through `0011_article_rejections.sql`.
- Memory of past decisions: see auto-memory at `~/Library/Application Support/Claude/local-agent-mode-sessions/.../memory/MEMORY.md`.

## 10 · Versioning + ship sequence

| Ship | Phase | Surface change | Risk |
|---|---|---|---|
| v0.6.10 | A | Tokens + fonts + AI primitives | Near zero |
| v0.6.11 | B | Editorial article shell on existing routes | Low — same routes, prettier |
| v0.6.12 | C | Hub Newsroom Slice + SubNav | Low — additive |
| v0.7.0 | D | NEW Game Center surface | Medium — new infra (cron, table, edge fn) |
| v0.7.1 | E | HomeV2 behind tri-state flag | Low while flag OFF |
| v0.7.2 | E flip | Tri-state default → 2 | Medium — actual users see change |

Total: 6 ships, 3 weeks if executed sequentially. Phases A/B/C can pipeline in parallel if Claude Code wants to multi-thread.
