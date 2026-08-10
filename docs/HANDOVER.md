# Gibol — Where we are, what's next

**Living document. Update it at the end of every working session.**
Last updated: **2026-08-10** · shipped version **v0.84.0** · branch `main` · **STATUS: TEST-READY**

If you are new to this repo, read this file, then `docs/pickem-flagship/16-MODULE-EXPANSION-CPO-BD-PLAN.md`
(the approved module/BD plan — supersedes doc 13 for R4+), then `13-DEVELOPMENT-PLAN.md`
(still plan of record through R3), then `CLAUDE.md` (voice, stack, operating rules).

> **⚠ Reconciliation note on doc 16 (2026-08-09).** Doc 16's STRATEGY (modules M1–M13, BD
> workstream, §7 decisions) is approved and current. Its §1 snapshot and R3′ ticket list were
> drafted against a pre-R1/R2 state and are partly STALE: R3′-1 (EPL seed), R3′-2 (liveness
> alarm), R3′-3 (CI gate + budget verify) all shipped in R0; R1/R2 are done (v0.83.0), not
> "unstarted". Still genuinely open from R3′: the AFF SF/F seeding decision and the MW1
> launch push. **Decision 1 (option B) is the operative change: EPL launches Aug 15 on the
> CURRENT shell — the root-flip to Main is deferred; 4a keeps shipping route-by-route behind
> flags.**

---

## 1 · Read this before you touch anything

| # | Thing that will bite you | What to do |
|---|---|---|
| 1 | **Do not work from `~/Documents/Claude.nosync/`.** macOS evicts file data there; reads block forever and `git status` hangs. It has already destroyed work once. | The working clone is **`~/gibol-workspace/nba-playoffs-monitor`**. Everything since v0.81.0 was committed from there. |
| 2 | **Vite dev does not run the `api/` functions.** `/api/*` returns raw JS source, so every data-driven screen silently renders its empty state. | Run dev with `DEV_API_PROXY=https://www.gibol.co npm run dev`. Guest mode never writes to the server, so this is read-only in practice. Don't run admin/scoring actions behind it. |
| 3 | **Node serverless function budget is 12/12 — full.** Edge functions are exempt (confirmed 2026-08-08 by shipping `api/g/[code].js`). | For a Node endpoint, add a `?type=` / `?_action=` branch to an existing function — that's why the 4a share cards live inside `api/og-recap.js`. A new **edge** function is fine. |
| 4 | **A thrown exception in an edge function returns HTTP 200 with an empty body**, not a 500. | Never treat `200` as proof. Always check `%{size_download}`. This bug hid blank share cards in production for weeks. |
| 5 | Invite codes are **case-sensitive**. | Never `.toUpperCase()` them — it breaks every join path. |
| 6 | **Run `actionlint` before pushing any workflow edit.** A 0-second run with no jobs and no logs is a *startup* failure — the logs API has nothing to show by definition, so it is unguessable from the UI. | `content-cron.yml` was invalid YAML from the day it was written and had literally never run; a guard added to `deploy.yml` used the `secrets` context in a step `if:`, which is not permitted and stopped that workflow compiling too. Both were found in one actionlint run after two wrong guesses. |

**Deploy:** push to `origin/main`; Vercel auto-deploys. Verify with `curl`, never with build success.
**Secrets:** service-role key + `PICKEM_ADMIN_TOKEN` live only in Vercel env vars and local `.env.local`. Never commit them.

---

## 2 · What is shipped and live

The **whole Pick'em loop is built and pixel-faithful** to the `#t4` design canvas.

| Surface | Route | State |
|---|---|---|
| Invite landing | `/g/:code` | **Live**, public, no auth |
| Pick sheet | `/pick/:fixtureId` | **Live** |
| Grup home | `/grup/:code` | **Live** |
| Main root shell | `/main` | **Live in prod by URL** (route flag on since 2026-08-09; nothing links to it — root untouched per doc 16 decision 1) |
| Skor tab | `/skor` | **Live in prod by URL** (same) |
| Share cards v2 | `api/og-recap?type=g4-*` | **Live**, renders |

**The core loop is verified in a real browser at 390×844:** invite link → confirmed pick in
**exactly 3 taps, no login wall**, guest prediction persisted to `guestStore` ready for
`mergeGuest` to claim on first login.

Underneath: R0 rebuilt the data spine (AFF + EPL seeded, generic football backfill/scoring
cron every 2h, 115-test Vitest gate wired into deploy, scoring-liveness alarm), and R1 laid
the Sistem 4a substrate (self-hosted fonts, token table + Edisi Malam dark set, six
primitives, sport skins, icon set, kamu-register copy guard).

---

## 3 · Pick up here — the pre-live checklist

Ordered by value. Item 1 shipped 2026-08-08; the rest are open.

| # | Item | Why it's on the list |
|---|---|---|
| ~~1~~ | ~~**Invite OG card**~~ | ✅ **Shipped 2026-08-08.** Invites now unfurl the real grup card. |
| ~~2~~ | ~~**Port nickname nudge to the 4a surfaces**~~ | ✅ **Shipped 2026-08-09** — `NicknameNudge4a` on MainShell + GrupHome, same dismissal key as the old hub's nudge. |
| ~~3~~ | ~~**Make `/main` + `/skor` testable**~~ | ✅ **Done 2026-08-09** — route flag ON in production; reachable by URL, unlinked, root untouched (doc 16 decision 1). Vercel preview deploys turned out to be SSO-walled (302), so prod-by-URL is the tester path. |
| ~~4~~ | ~~**Brand fonts on share cards**~~ | ✅ **Shipped 2026-08-10.** Root cause: Satori can't parse VARIABLE fonts. Static per-weight instances shipped; `scripts/test-satori-fonts.mjs` is now the mandatory pre-deploy parse test for any font change (see FONT RULE in `api/og-recap.js`). |
| 5 | **Take the R2 exit measurement** | See below — it gates the launch and the AFF window closes Aug 11. |
| 6 | **AFF SF/F decision** (doc 16 R3′-4) | Seed the semis/final only if two-leg handling verifies in <½ day; otherwise skip — group stage ends Aug 11. Log the decision either way. |
| 7 | **EPL MW1 launch push** (doc 16 R3′-5) | Aug 15, on the current shell. Fixtures are seeded (MW1 kicks off Aug 21). WA-ready invite cards now unfurl correctly; rollover banner exists (R0-6). |

**How to verify anything you build here:** run `DEV_API_PROXY=https://www.gibol.co npm run dev`,
drive the real screen at 390×844, and `curl` the deployed endpoint checking
`%{size_download}` — not the status code. Every defect found in this last stretch was invisible
to `npm run build` and visible within seconds in a browser.

## 4 · The R2 exit gate (still open)

**R2 is built. R2 is not *done*** — its exit gate is a measurement, not a build:

> invite→pick **≥50%** same-session · completion **≥70%** in the AFF beta grups

**Nobody has taken that measurement yet. This is the single most important open item.**
The AFF group stage (the live beta window) ends **Aug 11**, and the R3 freeze is **Aug 13** —
so the window to gather it is closing now.

To take it: seed 5–10 real grups (one exists — **"Tongkrongan AFF"**, code `QyAumSpv`, owned
by Ade) and read the `pickemEvents` funnel.

---

## 5 · What is missing

### ~~Pre-live blocker #1 — invite links have no OG card~~ ✅ FIXED (2026-08-08)

Sharing a grup invite now unfurls the real card: *"Bang Ade ngajak kamu ke Tongkrongan AFF"* ·
*"1 orang udah gabung. Pick tiga tap, gratis — semua demi gengsi."* over the `g4-invite` image.
Previously it previewed "Skor Live NBA · F1 · Liga Inggris" with the generic site image.

`api/g/[code].js` is an edge handler serving crawler-ready OG meta, reached from a `/g/:code`
rewrite gated on a **user-agent `has` condition placed ahead of the SPA rule** — so only crawlers
hit it and human traffic still gets the SPA untouched. Verify either side:

```bash
curl -sS -A "WhatsApp/2.23" https://www.gibol.co/g/QyAumSpv | grep 'og:image'
```

Edge functions do **not** count against the Hobby 12-function cap — now confirmed by this
shipping. That reopens the option for future crawler/meta endpoints; the 12/12 limit in §1
applies to Node serverless functions.

### Known defects / debt
- ~~Brand typography~~ ✅ fixed 2026-08-10 (variable fonts were the cause — see §1 FONT RULE).
- ~~Nickname onboarding~~ ✅ ported 2026-08-10 (`NicknameNudge4a` on MainShell + GrupHome).
- **(superseded notes below kept for the paper trail)** Nickname onboarding original note: It *does* exist — the
  `/onboarding/teams` route is live and `PredictingHub.jsx` has a one-tap nickname nudge
  (v0.79.22). But that nudge lives on the **old** hub, which Main replaces at the R3 flag flip.
  `MainShell` / `GrupHome` / `SkorTab` have no equivalent, so after R3 a new user has no path to
  set a nickname and the klasemen shows `user_id.slice(0,8)`. Port the nudge to the 4a surfaces
  before the flip — this is visible in every share card and every standings view.
- **API-Football subscription lapsed** → *(Ade, payment action)*. Nothing is blocked; ESPN +
  fixturedownload carry the load. Renewing restores the richer stats path.
- **`Kabar` tab is intentionally inert** (muted, non-navigating) until Kabar v1 in R4.
- **NBA close-game push scanner fails every 20 min** with `{"error":"espn","detail":"ESPN 403"}`
  → HTTP 502. ESPN is refusing the scanner's requests. No user impact today (NBA is in
  offseason) and the football backfill on the same upstream still succeeds, but the NBA nightly
  slate in R5 rides on this path — fix before then. Not caused by, or fixed in, the R2 work.

### Not yet started, in calendar order
- **R3 — EPL launch · Aug 13–15 · v0.90.** Freeze Aug 13; flip `VITE_FLAG_PICKEM_HOME`
  default-on so **gibol.co root = Main**; AFF→EPL rollover banner during AFF semis; launch
  push carried by share cards. Rollback = flag off.
- **R4 — Liga 1 + platform split · Aug 17–Sep 4 · v0.91–0.93.** Liga 1 seed + Bola skin for
  the Sep 4 kickoff; **Phase B:** 301 the sport hubs to `skor.gibol.co` during the Aug 25–Sep 1
  quiet week and make the Skor tab the in-app live surface; **Kabar v1**; desktop ≥1024 pass
  per `#t6`; trust pages (scoring rules, "kenapa gratis").
- **R5 — Money + nightly · Sep–Oct · v0.94+.** `api/billing.js` + Midtrans QRIS (commissioner
  tiers, Gibol+) — **gated on KYB, stopgap manual grants already live**; NBA 2026-27 nightly
  slate; **Mandalika Oct 11** MotoGP event mode + first sponsored-pool pitch.
- **R6 — Platform proof · Nov–Jan · v1.0 candidate.** BWF Finals pilot; Bahasa Melayu locale;
  **IBL + Proliga as pure config rows (≤2 weeks each — the real test of the grammar)**;
  prop-picks; Liga 1 Fantasy scoping.
- **Content Engine Phase 1+** (writer agents) — still blocked on the Phase 0 local ingest
  dry-run on Ade's Mac. See `packages/content-engine/STATUS.md`.

---

## 6 · The design direction, in one page

The redesign is **"Sistem 4a"** — the locked canvas is `#t4`; `#t6` covers desktop. The
strategic move it encodes: **gibol.co stops being a scores site with a Pick'em feature and
becomes a Pick'em platform with scores attached.**

Three structural consequences, all already built or scheduled:

1. **Main replaces the scores hub as the root.** The app opens on *what you owe* — the
   "utang pick" hero — not on a scoreboard. (Built; flag flip is R3.)
2. **Scores become a tab, not the product.** The Skor tab shows live matches *with your pick
   status on them*, which is the only thing that differentiates it from Sofascore. The
   standalone sport hubs move off to `skor.gibol.co` in R4 — they stay valuable as the SEO
   moat, but they stop being the front door.
3. **The grup is the retention unit.** Invite → pick → standings → nudge is the loop; share
   cards are the acquisition engine hanging off it.

**Non-negotiable design rules** (violating these is a bug, not a preference):
- Every screen composes the six primitives in `src/pickem/components/primitives4a.jsx`.
  Don't hand-roll a card.
- Screens consume **only** `src/pickem/api.js` (the seam rule). No direct Supabase calls
  from a screen.
- Any full-bleed dark panel uses `--g4-ink-block` / `--g4-ink-block-border`, never
  `--g4-ink` directly — otherwise it vanishes in Edisi Malam (the auto dark mode).
- Copy is **kamu-register**, EN default key + native ID key. Never "lo/gue", never betting
  vocabulary. A build-time guard enforces both; it will fail your build.
- Naming stays **sport-agnostic** (`league`, `series`, `team`) so IBL/MotoGP inherit for free.

---

## 7 · Orientation map

```
src/pickem/
  api.js                     ← the ONLY data seam screens may use
  guestStore.js              ← guest picks in localStorage until mergeGuest claims them
  competitions.js            ← competition registry + windows (drives defaults & Skor board)
  sportSkins.js              ← per-sport accent/labels; how a new sport inherits the UI
  InviteLanding.jsx  PickSheet.jsx  GrupHome.jsx  MainShell.jsx  SkorTab.jsx
  components/
    primitives4a.jsx         ← the six locked primitives
    TabBar4a.jsx  Logo4a.jsx  icons4a.jsx
src/styles/tokens-4a.css     ← palette / type / shape / spacing + Edisi Malam dark set
api/og-recap.js              ← all share-card rendering (?type=g4-* | pickem-* | default)
api/_lib/og/share4a.js       ← the 4 Sistem 4a share-card moments
docs/pickem-flagship/13-DEVELOPMENT-PLAN.md   ← the release calendar (R0…R6)
docs/SHIP-LOG-2026-07-20.md                   ← running narrative of what shipped and why
```

**Adding a sport:** follow `docs/06-adding-a-sport.md`. Don't freestyle — the whole
architecture bet is that a new sport is a config row, and R6 is the exam.
