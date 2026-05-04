# Handoff: Gibol Sports News Redesign — v4

> A complete sports-news platform redesign for Gibol (Indonesia, English + Bahasa Indonesia bilingual). Direction B — "Editorial-led newsroom" — built end-to-end for a single sport (NBA) to validate the system across the full reader journey: home → sport dashboard → game center → article.

---

## About the Design Files

The files in this bundle are **design references created in HTML**. They are prototypes showing intended look and behavior — **not production code to copy directly**.

The task is to **recreate these designs in the target codebase's existing environment** (whatever React / Next / Vue / native stack Gibol ships) using its established patterns, component library, and design tokens. If no codebase exists yet, choose a framework appropriate for a content-heavy news platform with bilingual i18n and live data — Next.js with App Router would be a sensible default.

Treat the HTML/JSX in this bundle as **specs**, not as a starting point. The styling is scoped under `.gb3` and uses a single global CSS-in-JS stylesheet — that approach was right for a prototype, wrong for production.

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, and layout. Recreate pixel-perfectly using the codebase's libraries.

Every value in the design tokens section below is final. Where the prototype hardcodes content (scores, dates, article copy), that content is illustrative — the **structure** and **type/spacing/color treatment** are what's authoritative.

---

## Overview

Four screens, each a distinct page type but sharing one design system:

1. **Home (Evolution)** — global newsroom front. Live console rail (left) + editorial newsroom (center) + reading list (right).
2. **NBA Dashboard** — sport landing page. Landscape hero, Game Center entry, bracket preview, standings, NBA newsroom slice.
3. **Game Center** — live deep dive for a single game. Big score, by-quarter breakdown, top performers, AI live-summary, win-prob spark, play feed, series tracker.
4. **Article** — full-bleed hero photo, drop cap, pull quote, inline data card, "How was this written?" transparency footnote.

The system also supports four user-toggleable Tweaks: **Language (EN/BI)**, **Density (Comfy/Compact)**, **Sport Accent (Quiet/Balanced/Loud)**, and **Theme (Dark/Light "paper")**.

---

## Design Tokens

All values live in `v3/primitives.jsx` under the `.gb3` selector. Move them into your design-token system (e.g. CSS custom properties, Tailwind `theme.extend`, Style Dictionary).

### Colors — Dark theme (primary)

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0A1628` | Page background |
| `--bg-2` | `#0F1E36` | Card surface |
| `--bg-3` | `#16273F` | Inset surface (input, inactive btn) |
| `--bg-4` | `#1B2E4A` | Hovered/raised inset |
| `--line` | `#223552` | Default border |
| `--line-soft` | `#1A2A44` | Internal divider |
| `--line-loud` | `#2E4569` | Hover border |
| `--ink` | `#E6EEF9` | Primary text |
| `--ink-2` | `#B6C4D8` | Secondary text |
| `--ink-3` | `#7388A5` | Meta / labels |
| `--ink-4` | `#4A5D7A` | Disabled / placeholder |
| `--ink-5` | `#2E4061` | Hairlines on dark |
| `--blue` | `#3B82F6` | Primary accent (links, primary button) |
| `--blue-2` | `#60A5FA` | Hovered link |
| `--amber` | `#F59E0B` | Editorial accent (kicker, AI tag) |
| `--amber-2` | `#FBBF24` | Hovered amber |
| `--live` | `#EF4444` | Live indicator |
| `--up` | `#10B981` | Positive delta (green) |
| `--down` | `#EF4444` | Negative delta |
| `--paper` | `#F5F1EA` | Light theme bg reference |

**Soft fills** (used for pill backgrounds): `--blue-soft: rgba(59,130,246,.14)`, `--amber-soft: rgba(245,158,11,.14)`, `--live-soft: rgba(239,68,68,.14)`.

### Colors — Light theme

| Token | Hex |
|---|---|
| `--bg` | `#F5F1EA` (warm cream paper) |
| `--bg-2` | `#FFFFFF` |
| `--bg-3` | `#FAF7F2` |
| `--bg-4` | `#F0EAD9` |
| `--line` | `#E3DCCF` |
| `--line-soft` | `#EDE7DB` |
| `--line-loud` | `#CFC4AF` |
| `--ink` | `#0A0A0A` |
| `--ink-2` | `#333` |
| `--ink-3` | `#5C5C5C` |
| `--ink-4` | `#9A9A9A` |
| `--ink-5` | `#C9BFA9` |
| `--blue` | `#1E40AF` (deeper blue for contrast on cream) |
| `--amber` | `#B45309` |

### Sport accent colors

Used **sparingly** — only for routing chips, sport tags, and (when accent="loud") a left-border stripe. Never floods.

| Sport | Color |
|---|---|
| NBA | `#F97316` (orange) |
| Premier League | `#22C55E` (green) |
| F1 | `#DC2626` (red) |
| Tennis | `#EAB308` (yellow) |

### Typography

Three families, used together intentionally:

| Family | Stack | Role |
|---|---|---|
| **Inter Tight** | `'Inter Tight', -apple-system, Helvetica, Arial, sans-serif` | Default body & UI |
| **Newsreader** | `'Newsreader', 'Source Serif 4', Georgia, serif` | Editorial display headlines (`.serif`) |
| **JetBrains Mono** | `'JetBrains Mono', ui-monospace, monospace` | Kickers, meta, scores, tabular numbers |

**Type scale:**

| Class | Size / weight / leading | Tracking | Use |
|---|---|---|---|
| `h1.disp` | 800 / 32px / 1.04 | -0.035em | Display headline |
| `h2.disp` | 800 / 22px / 1.1 | -0.025em | Section headline |
| `.deck` | 500 / 13px / 1.45 | — | Standfirst / lede |
| `.kicker` | 700 / 9.5px / — | 0.22em uppercase | Article kicker (amber) |
| `.meta` | 600 / 9.5px / — | 0.1em uppercase | Timestamps, bylines |
| `.card-title` | 700 / 10px / — | 0.14em uppercase | Card headers |
| Body default | 400 / 13px / 1.5 | — | Paragraph |
| `.pill` | 700 / 9.5px / — | 0.06em uppercase | Status pills |

Body base font-size scales with density: **13px comfy, 12px compact**.

Font-feature-settings: `"ss01"` enabled on `.gb3` root (for Inter Tight stylistic alternates).

### Spacing

The design uses an **8px base** with these recurring values: `4, 6, 8, 10, 11, 13, 14, 16, 20, 24, 32px`. Cards use 13px padding (`.card-pad`), card heads use 11px×13px (`.card-head`).

### Border radius

| Element | Radius |
|---|---|
| Pills | `999px` (full) |
| Buttons (default) | `6px` |
| Inputs | `6px` |
| Sport tags | `4px` |
| Cards | `10px` |
| Image placeholders | `8px` |
| Article hero | `12px` |

### Shadows

The design is **flat** — no drop shadows on cards or surfaces. Depth comes from `--bg`/`--bg-2`/`--bg-3` layering. The only shadow effect is the live-dot pulse animation:

```css
@keyframes gb3pulse {
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,.6) }
  70%  { box-shadow: 0 0 0 7px rgba(239,68,68,0) }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0) }
}
/* applied to .dot.live (6×6 red circle), 1.6s infinite */
```

### Pills (status tokens)

Each pill is `padding: 3px 7px`, `border-radius: 999px`, mono uppercase 9.5px / 700, letter-spacing 0.06em. Variants:

- `.pill.live` — red bg + red text, paired with pulsing dot
- `.pill.amber` — amber bg + amber text, used for AI byline ("AI · HUMAN EDITED")
- `.pill.blue` — blue bg + blue text
- `.pill.up` — green bg + green text (used for positive deltas)
- `.pill.muted` — bg-3 + ink-3
- `.pill.outline` — transparent + line border + ink-3

---

## Screens

### 1 · Home (Evolution)

**Purpose:** Global newsroom front. The reader sees what's live now, what's the editorial lede, and what they were reading.

**Layout:** Three-column, asymmetric grid.
- Left rail (~280px): "Live console" — a continuously updating stack of live game scores, F1 timing, etc.
- Center column (~640px): editorial newsroom — hero article, secondary articles, sport sections.
- Right rail (~300px): reading list, bookmarks, "continue reading."

**Top chrome:** logo · primary nav (Home / News / Fixtures / Standings / Pick'em) · search field (`Search · ⌘K` placeholder) · language toggle button · profile avatar.

**Components used:** `.gb3 .card`, `.gb3 .art` (article card), `.gb3 .pill.live`, `.gb3 .sport-tag`, `.gb3 .kicker`, `.gb3 .meta`, `h1.disp`, `.deck`.

**Source files:** `v4/home.jsx` + `v3/homes.jsx` (reuses Direction B home composition from v3).

### 2 · NBA Dashboard

**Purpose:** Sport-specific landing page. The user came in via "NBA" and lands here to see everything for that sport.

**Layout:** Single-column with stacked modules at full board width (1280px).
1. **Landscape hero** — featured article with full-bleed-feel SVG illustration + kicker + headline + deck.
2. **Game Center entry** — single horizontal panel showing the live/next NBA game; primary CTA into Game Center (screen 3).
3. **Bracket preview** — playoff bracket strip (read-only at this level, deep-link to bracket page).
4. **Standings** — Eastern + Western conference top 8, mini-table.
5. **NBA newsroom slice** — 3-up grid of NBA articles.

**Source files:** `v4/nba.jsx` (`<NbaDashboard/>`).

### 3 · Game Center

**Purpose:** Live deep dive for a single in-progress game (Denver Nuggets vs Boston Celtics, Game 3).

**Layout:** Single column, 1280×1500. Stacked sections:
1. **Hero score** — large team names + scores (mono 64px), quarter clock, live pulse dot.
2. **By-quarter breakdown** — 4-column table.
3. **Top performers** — 3-up cards (PPG/RPG/APG leaders), each a player avatar placeholder + stats.
4. **AI live summary** — amber-bordered card with `.ai-byline` pill ("AI · HUMAN EDITED"), 2-3 sentence game summary, "How was this written?" link.
5. **Win-probability spark** — sparkline over the game timeline.
6. **Play feed** — last 6 plays, mono timestamps, "23s ago" relative.
7. **Series tracker** — 2-3-2 dot strip showing wins.

**Source files:** `v4/nba.jsx` (`<NbaGameCenter/>`).

### 4 · Article

**Purpose:** The reading experience.

**Layout:** Single column 1280×1900 (scrolls beyond — actual content is ~2150px).
1. **Full-bleed hero illustration** with photo-feel grain + spotlight gradient overlay.
2. **Caption strip** below hero (kicker + meta + photographer credit).
3. **Headline** (`h1.disp` serif variant — switch to `Newsreader`, 800, 48px/1.05).
4. **Standfirst** (`.deck`, 18px, ink-2).
5. **Article body** in 720px reading column:
   - **Drop cap** on first paragraph (4-line, serif, amber)
   - **Pull quote** — left-border 3px amber, serif italic 28px
   - **Inline data card** — small table or stats card embedded mid-article
6. **AI footnote** — at end of article, "How was this written?" transparency block. Always present, even on purely human articles.

**Source files:** `v4/nba.jsx` (`<NbaArticle/>`) + `v3/articles.jsx` for the article shell.

---

## Interactions & Behavior

### Tweaks panel

The prototype exposes 4 user controls. **Two of these (theme + density) we recommend keeping in production**; **the other two (accent intensity + bilingual) are different concerns:**

| Tweak | Production status |
|---|---|
| **Theme (Dark / Light)** | **Ship it.** User preference, persisted in localStorage. Light = warm cream "paper" palette. |
| **Density (Comfy / Compact)** | **Ship it.** Compact reduces base font-size from 13 → 12 and tightens card padding. |
| **Sport accent (Quiet / Balanced / Loud)** | **Don't ship as user-facing.** This was for the design team to demonstrate accent-color treatments. Pick one (recommend "Balanced") and bake it in. |
| **Bilingual (EN / BI)** | **Ship it, but rebuild.** The prototype's implementation is a no-op (see AUDIT.md). Production needs proper i18n via `next-intl` / `react-i18next` / equivalent. |

### Live indicators

Anything live shows the pulsing red dot (`.dot.live`) animation. It's 1.6s infinite — do not slow it down or speed it up.

### AI disclosure

Three-layer treatment:
1. **Subtle pill** on every AI-touched headline: `<span class="ai-byline">AI · HUMAN EDITED</span>` — small amber pill.
2. **Stronger label + source line** on AI live cards (Game Center): visible "AI summary" header + "Sources: NBA play-by-play feed, AP recap" + "How is this written?" link.
3. **Footnote on every article ending** — including purely-human ones — disclosing reporting + sources + AI usage. Builds editorial trust without scolding the reader.

### Hover states

- Article cards (`.gb3 .art`): headline color shifts to `--blue-2` on container hover
- Buttons: border shifts from `--line` to `--line-loud`
- Primary button (`.btn.primary`): no color change; rely on cursor
- Links: underline on hover, no underline at rest

### Animations

Only one — the live-dot pulse. Everything else is instant. Resist the urge to add transitions; the design is editorial, not toy-like.

---

## State Management

The prototype is stateless beyond the Tweaks panel. Production state requirements:

- **User session** — for reading list, bookmarks, follow chips on Home rail
- **Live game data** — websocket or SSE feed for Game Center; refresh interval for non-live
- **Reading position** — for "continue reading" rail on Home
- **Language preference** — global, persisted
- **Theme + density** — global, persisted
- **Article body** — server-rendered for SEO; comments / reactions are progressive enhancement

---

## Assets

- **Imagery in the prototype is SVG illustrations** authored inline (see `v4/extras.jsx` `ILLUSTRATIONS` map). Production must replace with real photography. Hero crops are `16/9` for landscape, `21/9` for full-bleed article hero.
- **Live game illustrations** show generic court/pitch — production replaces with the actual game's broadcast still or photo.
- **Player avatars** are placeholders (initials in a circle) — production uses team-supplied headshots.
- **Brand:** Gibol logo + brand kit are not in this bundle. Refer to `Gibol Brand Handoff.html` and `design_handoff_gibol_v2/` from earlier in the project.
- **Iconography** — the prototype uses inline SVG paths (search, bell, chevron, etc.). Replace with the codebase's icon library (Phosphor, Lucide, Heroicons — pick one and stay with it).

---

## Files in this bundle

```
design_handoff_gibol_v4/
├── README.md                       ← you are here
├── AUDIT.md                        ← known issues + recommendations
├── Gibol Redesign v4.html          ← root HTML, open this to see the canvas
├── design-canvas.jsx               ← prototype canvas wrapper (DESIGN ONLY — do not port)
├── v4/
│   ├── extras.jsx                  ← V4TweakSync, illustrations, AI byline component
│   ├── home.jsx                    ← Home composition
│   ├── nba.jsx                     ← NBA Dashboard, Game Center, Article
│   └── tweaks-panel.jsx            ← Tweaks UI (DESIGN ONLY — do not port)
└── v3/
    ├── primitives.jsx              ← ⭐ design tokens + base components (.gb3, .pill, .card, .btn, .art, etc.)
    ├── shell.jsx                   ← Top chrome (nav, search, language toggle), I18N3 dictionary
    ├── homes.jsx                   ← Home compositions (Direction B is the one v4 uses)
    ├── articles.jsx                ← Article reading layout
    ├── dashboards.jsx              ← Per-sport dashboard template
    ├── newsroom.jsx                ← Newsroom slices (multi-article rows)
    ├── news.jsx, shared.jsx        ← Shared newsroom helpers
    └── design-canvas.jsx           ← Same as root canvas — ignore
```

**Read order for engineering:**
1. `Gibol Redesign v4.html` — open in browser, click around all 4 screens, try each Tweak
2. `v3/primitives.jsx` — the design system definition
3. `v3/shell.jsx` — top chrome + i18n dictionary
4. `v4/nba.jsx` — three of four production screens (dashboard, game, article)
5. `v4/home.jsx` + `v3/homes.jsx` — home composition

---

## Known issues — see AUDIT.md

The bundled `AUDIT.md` lists the open bugs from final review:
1. Bilingual EN ↔ BI tweak is a no-op (state not plumbed) — **engineering owns the proper i18n implementation**
2. EDITMODE-BEGIN block in wrong file — **prototype-only, irrelevant to production**
3. Boards lack `data-screen-label` — **prototype-only, irrelevant to production**

Plus handoff caveats: in-browser Babel (prototype only), no `alt`/`aria` text yet (production must add), hard-coded live data, desktop-only widths.

---

## Questions for the design team during implementation

Things the design didn't fully resolve — engineering will hit these and need answers:

- **Mobile + tablet layouts.** The 1280px boards don't tell you how the 3-column home collapses, how Game Center reflows, or how the article reading column behaves on narrow screens. Get this from design before starting mobile work.
- **Empty states.** No designs for "no live games right now," empty reading list, no articles in a sport, etc.
- **Error / loading states.** Skeleton patterns, error toasts, retry affordances — all undefined.
- **Pagination / infinite scroll on the article feed.** Direction not specified.
- **Comments / social.** Out of scope for v4. If product wants them, design needs another pass.
- **Pick'em interaction model.** Visible in nav but not designed.
