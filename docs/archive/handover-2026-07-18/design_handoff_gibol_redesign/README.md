# Handoff: Gibol Full Redesign — "Sistem 4a" (scarlet/ink · Bricolage + Instrument)

## Overview
Ground-up redesign of gibol.co — a fantasy/pick'em-first, live-score/news-second sports platform for Indonesian friend groups ("grup"). Free to play, prestige-only stakes (strictly NO gambling/betting framing anywhere: no odds, no "taruhan", no money language). Multi-sport via one shared component grammar skinned per sport (Bola / Basket / MotoGP).

The locked direction merges two explorations: the **stacked GI/BOL block logo + scarlet/ink/cobalt palette** from the editorial concept, with the **rounded shapes + Bricolage Grotesque/Instrument Sans type** from the tongkrongan concept, on a light paper background.

## About the Design Files
`Gibol Redesign Concepts.dc.html` is a **design reference created in HTML** — a canvas of exploration turns, not production code. Implement by **recreating the locked system in the target codebase's environment** (or, if greenfield, pick the stack that fits — a React/Next.js PWA is the natural fit for a mobile-first web app with an invite-link growth loop). **Turns 4, 5, 6 are the locked spec** (sections `#t4`, `#t5`, `#t6`, newest at top). Turns 1–3 are superseded explorations — ignore them except for history.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and copy in turns 4–6 are final. Recreate pixel-faithfully using the codebase's component patterns.

## Design Tokens

### Color
| Token | Value | Use |
|---|---|---|
| `scarlet` | `#D92D1C` | Brand accent, primary CTA, Bola sport accent, selected pick state |
| `scarlet-soft` | `#FF6B57` | Scarlet on dark surfaces (live dot, highlights in dark mode / share cards) |
| `ink` | `#171310` | Text, borders (2px structural rules), dark surfaces, secondary CTA |
| `paper` | `#FAF7F1` | App background (light). Deliberately light — NOT deep cream |
| `card` | `#FFFFFF` | Card surfaces on paper |
| `line` | `#E8E2D5` | Hairline card borders (1px / 1.5px) |
| `line-soft` | `#F0EBDF` | Row dividers inside cards |
| `muted` | `#9A8E7B` | Secondary text, timestamps, inactive nav |
| `body-muted` | `#6E6455` | Body copy on paper |
| `cobalt` | `#1E3FBB` | Links / tertiary accent, MotoGP sport accent |
| `basket` | `#E07B00` | Basket sport accent |
| `voli` | `#7A2E8E` | Voli sport accent (future) |
| `win` | `#1F7A3D` (bg tint `#E7F1E9`) | Correct pick, points gained |
| `lose` | `#A31F12` (bg tint `#FBEAE7`) | Missed pick, "belum pick" alert |
| `locked-chip` | `#EDE7D9` bg / `#9A8E7B` text | Locked pick chip |
| `star-bg` | `#F2ECDF` | Star (×2) button resting state |
| Dark surfaces | bg `#15110C`, card `#211C15`, tab bar `#1B1610`, border `#35302A` | "Edisi Malam" dark mode (auto 19:00–06:00 WIB) |

### Typography
- **Headline: Bricolage Grotesque** (Google Fonts, weight 800, tight letter-spacing −0.3px to −1px). Used for: logo block, screen titles, hero numbers ("3 pick belum masuk"), scores, leaderboard points, share-card headlines.
- **UI/body: Instrument Sans** (weights 400–700). Everything else. Bold 700 for buttons/labels/team names, 600 for meta, 500 for body.
- Scale (mobile): hero 28–32px · screen title 22–24px · card title 14–16px · body 12–13px · meta/labels 9–11px · countdown/lock badges 10px bold.
- Desktop hero scales up (score detail 44px).

### Shape & spacing
- Radii: cards 14–18px · hero cards 18px · buttons/CTAs 12–14px · chips/badges 999px (pill) · phone-frame 28px. Rounded language throughout — no hard corners except intent: none.
- Structural rules: 2px solid ink under headers/tab bar tops; 1px `line` for card borders; 3px sport-color top-border on Kabar cards; 4px sport-color left-border on live tiles.
- Base spacing: 16px screen gutter, 10–12px gap between cards, 12–14px card padding.

## Logo
Stacked block: "GI" over "BOL", Bricolage Grotesque 800, `paper` text on `scarlet` rounded rectangle (radius ~6–12px scaled to size), line-height 0.9–0.92, letter-spacing −0.5px. Sizes used: 12px font (inline header), 15px (desktop header), 26–28px (landing/brand). Tagline: **"Main. Skor. Kabar."** with support line **"Semua demi gengsi."**

## Voice & copy rules (hard constraints)
1. **No "lo/gue"** — use neutral-warm Indonesian: "kamu", "-mu" suffix ("grupmu", "pickmu", "peringkatmu"). Casual but not street: "udah", "Gas"-level slang is out; "ingatkan", "colek" ok.
2. **No betting/money language ever** — never "taruhan", "uang", odds, stakes. Prestige framing: "Semua demi gengsi.", invite footer: "Menang, dibanggakan seminggu. Kalah, jadi bahan bercandaan."
3. Every news (Kabar) item carries a pick hook CTA ("Udah pick semifinalmu? →").
4. Exact copy for all screens is in the HTML file — treat it as the copy deck.

## Screens (all in `#t4`–`#t6` of the HTML)

Mobile screens are 390×844. Bottom tab bar (mobile): **Main ▲ · Grup ● · Skor ▶ · Kabar ■** — active = scarlet, inactive = muted; 2px ink top border, white bg, ~22px bottom safe-area padding.

1. **Beranda / Main (root shell)** — header (logo block + "Edisi Malam · date" + avatar, 2px ink underline); hero "utang pick" card (white, 2px ink border, scarlet header strip w/ lock time, Bricolage hero line, ink CTA); "Malam Ini" section rule; match cards (1/X/2 + ★ row); grup summary card (ink bg, stacked avatars, nudge line); Kabar teaser card (3px scarlet top border).
2. **Pick sheet** — back + title + lock countdown pill (ink); match banner card (2px ink border, scarlet strip); progress "Pick 3 dari 5" + scarlet bar; question cards (winner 1/X/2 → exact score chips → first scorer chips); star card (ink bg, scarlet toggle, "Poin ×2 · sisa 1 bintang pekan ini"); sticky footer CTA (scarlet, "Kunci pick → 2 pertanyaan lagi").
3. **Grup home** — ink header block (name, meta, kode pill, 3 stat tiles: peringkat #3 in `scarlet-soft` / poin / streak in green); klasemen card (rows: rank Bricolage, avatar, name, streak, points; "kamu" row tinted `#FBEAE7` + 3px scarlet left border; "belum pick" badge on delinquents); scarlet nudge banner ("3 anggota belum pick" + "via WA" pill); invite card (1.5px dashed ink border + "Salin link").
4. **Skor** — title + "● 2 live"; sport filter pills; live cards (4px sport-color left border, score in Bricolage, personal pick status strip: green "pickmu unggul ✓" / red "pickmu tertinggal"); finished list with +pts/0 pills; upcoming with "pick podium →" link.
5. **Kabar** — title + date; topic filter pills; hero article (2px ink border, scarlet category strip, Bricolage headline, pick-hook CTA); article cards with 3px sport-color top borders; group weekly recap card (ink bg).
6. **Malam Ini (dark "Edisi Malam")** — auto theme 19:00–06:00 WIB; dark tokens above; live cards keep 4px sport left borders; scores in `scarlet-soft`.
7. **Invite landing** (public, no auth) — centered logo block; invite card (white, 2px ink border: stacked avatars, "Bima mengundang kamu ke", grup name, meta, sport pills); scarlet CTA "Gabung grup — gratis"; prestige footer + first-pick teaser.
8. **Desktop ≥1024px** (`#t6`) — top nav replaces tab bar (logo + Main/Grup/Skor/Kabar center, active = scarlet w/ 3px underline; live count + avatar right). Beranda = 3 columns `200px | 1fr | 300px`: left rail (sport filters + seasons), center feed (hero pick card horizontal, match cards in 2-col grid, kabar row), right rail (grup card + live tiles). Skor/Kabar = split view `380px | 1fr`: list left, detail right (big score 44px, timeline + group-pick breakdown). **Responsive rule: mobile = center column only + bottom tabs; primitives and grammar identical across breakpoints.**

## Components — 6 primitives (`#5a`)
All sports use exactly these; per-sport differences live only in the skin config:
1. **Match card** — teams + pick row (1/X/2 or sport equivalent) + ★.
2. **Pick chip** — 5 states: default (1.5px ink border) / selected (scarlet fill) / locked (`locked-chip` + 🔒) / correct (green fill "+3") / missed (red tint "0").
3. **Leaderboard row** — rank (Bricolage) · avatar · name (+"kamu"/"belum pick" badges) · streak · points.
4. **Live tile** — 4px sport-color left border, status line, score, personal pick status.
5. **Kabar card** — 3px sport-color top border, category+time, headline, pick-hook CTA.
6. **Lock badge** — pill: countdown (ink fill) → "terkunci" (ink outline).

## Skin config (`#5c`) — the only thing that changes per sport
| | Bola | Basket | MotoGP |
|---|---|---|---|
| Accent | `#D92D1C` | `#E07B00` | `#1E3FBB` |
| Event unit | Pertandingan (2 tim) | Game (2 tim) | Race (grid 20+) |
| Pick utama | 1 / X / 2 | Menang / Kalah | Podium 1-2-3 |
| Pick bonus | Skor akhir · pencetak gol | Selisih poin · top scorer | Pole · fastest lap · DNF |
| Lock | Kick-off | Tip-off | Lights out |
| Ritme | Mingguan (EPL) · turnamen (AFF) | Nightly, pagi WIB | 2-mingguan, Minggu sore |
| Live tile | Menit + skor | Quarter + skor | Lap + posisi pick |

## Share cards (`#5b`)
1080×1080, always dark (`ink` bg) regardless of app theme. Grammar: logo block top-left + context label top-right (muted or `scarlet-soft` if live) → Bricolage 800 two-line headline (~36px at 280px preview ⇒ ~138px at 1080), second line in `scarlet-soft` → stats block (white + muted lines) → scarlet pill CTA with `gibol.co/g/CODE` deep link. Four moments: **Juara grup** (weekly winner) · **Streak** (×N benar) · **Matchday challenge** (pre-match, group % split) · **Invite** ("Kursimu masih kosong.").

## Interactions & Behavior
- Pick flow: tap chips to select (scarlet fill), progress bar updates, footer CTA counts remaining questions; at lock time all chips → locked state.
- Lock countdown is live (HH:MM:SS) in badges and hero.
- Star toggle: ×2 multiplier, budget 1/week, shown on pick sheet + match card ★.
- "Colek/ingatkan via WA" → opens WhatsApp share with prefilled message + deep link.
- "Salin link" → clipboard copy of `gibol.co/g/<KODE>`.
- Dark mode auto-switches 19:00–06:00 WIB (user-overridable).
- Live tiles poll/stream score updates; personal pick status recomputes per update.
- Invite landing is public; join CTA → auth → lands in grup with first pick prompted.

## State Management (minimum)
- `user` (id, name, avatar initial), `grup` (kode, members, season, week), `picks` (per event: answers, star, locked, result, points), `leaderboard` (weekly + season), `events` (per sport, status: upcoming/live/finished + live payload), `kabar` feed (with linked event ids for pick hooks), theme (auto/manual).

## Assets
No raster assets. Logo is pure CSS/type. Fonts via Google Fonts: **Bricolage Grotesque** (400–800), **Instrument Sans** (400–700). Icons in mocks are unicode placeholders (▲●▶■ tab glyphs, ★, 🔒) — replace with a proper icon set matching the rounded language (e.g., Phosphor bold).

## Files
- `Gibol Redesign Concepts.dc.html` — full design canvas. Locked spec = sections `#t4` (mobile screens), `#t5` (primitives, share cards, skin config), `#t6` (desktop). Turns 1–3 = superseded explorations.
