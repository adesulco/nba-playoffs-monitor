# Gibol — Where we are, what's next

**Living document. Update it at the end of every working session.**
Last updated: **2026-08-03** · shipped version **v0.83.0** · branch `main`

If you are new to this repo, read this file, then `docs/pickem-flagship/13-DEVELOPMENT-PLAN.md`
(the release calendar), then `CLAUDE.md` (voice, stack, and operating rules). Everything
else is background.

---

## 1 · Read this before you touch anything

| # | Thing that will bite you | What to do |
|---|---|---|
| 1 | **Do not work from `~/Documents/Claude.nosync/`.** macOS evicts file data there; reads block forever and `git status` hangs. It has already destroyed work once. | The working clone is **`~/gibol-workspace/nba-playoffs-monitor`**. Everything since v0.81.0 was committed from there. |
| 2 | **Vite dev does not run the `api/` functions.** `/api/*` returns raw JS source, so every data-driven screen silently renders its empty state. | Run dev with `DEV_API_PROXY=https://www.gibol.co npm run dev`. Guest mode never writes to the server, so this is read-only in practice. Don't run admin/scoring actions behind it. |
| 3 | **Vercel Hobby function budget is 12/12 — full.** | New endpoints are not possible. Add a `?type=` / `?_action=` branch to an existing function instead. This is why the 4a share cards live inside `api/og-recap.js`. |
| 4 | **A thrown exception in an edge function returns HTTP 200 with an empty body**, not a 500. | Never treat `200` as proof. Always check `%{size_download}`. This bug hid blank share cards in production for weeks. |
| 5 | Invite codes are **case-sensitive**. | Never `.toUpperCase()` them — it breaks every join path. |

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
| Main root shell | `/main` | Built, **flag OFF in prod** (`VITE_FLAG_PICKEM_HOME`) |
| Skor tab | `/skor` | Built, **flag OFF in prod** |
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

Ordered by value. Nothing below is started; the repo is clean at `f5f60b0`.

| # | Item | Why it's on the list |
|---|---|---|
| 1 | **Invite OG card** (§5 blocker #1) | WhatsApp invite previews are wrong today. Acquisition loop's last mile. Template exists in-repo. |
| 2 | **Port nickname nudge to the 4a surfaces** | After the R3 flip there is no path to set a nickname; klasemen shows raw `user_id`. |
| 3 | **Turn `VITE_FLAG_PICKEM_HOME` on somewhere testable** | `/main` + `/skor` are built and browser-verified but OFF in prod, so testers can't reach them. A preview deploy with the env var set is enough — don't flip prod before R3. |
| 4 | **Brand fonts on share cards** | Cards render, typography is generic. Cosmetic but launch-facing. |
| 5 | **Take the R2 exit measurement** | See below — it gates R3 and the window closes Aug 11. |

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

### 🔴 Pre-live blocker #1 — invite links have no OG card

**Sharing a grup invite on WhatsApp currently previews "Skor Live NBA · F1 · Liga Inggris"
with the generic site image.** Someone sends "join my grup" and the recipient sees a live-scores
ad. The invite *is* the acquisition loop, so this is the highest-value fix before launch.

Verify it yourself:

```bash
curl -sS -A "WhatsApp/2.23" https://www.gibol.co/g/QyAumSpv | grep 'og:image'
```

**Cause:** `/g/:code` rewrites to the static `/index.html` SPA shell. Crawlers don't run JS, so
the `<SEO>` tags `InviteLanding.jsx` sets at runtime are never seen. Passing an `image` prop to
`<SEO>` will *not* fix this on its own — it only changes what JS-executing clients see.

**The fix already has a working template in this repo:** `api/recap/page/[gameId].js` is an edge
function that returns crawler-ready HTML with correct OG meta, reached via a rewrite from
`/recap/[gameId]`. Copy that shape for invites:
1. New edge handler that looks up the grup by code and returns HTML whose `og:image` points at
   `…/api/og-recap?type=g4-invite&grup=…&members=…&code=…` (that card renders correctly today).
2. Rewrite `/g/:code` to it **with a `has` condition on the `user-agent` header** so only
   crawlers are routed there and humans keep getting the SPA untouched — zero risk to the live
   invite flow.

**Function budget note:** the repo counts 8 Node + 4 Edge functions, and `api/recap/[gameId].js`
carries an in-repo comment stating Edge functions don't count toward the Hobby 12-function cap.
That suggests an Edge handler for this is affordable — **verify against Vercel before relying
on it**, since the 12/12 figure in `CLAUDE.md` is what forced the share cards into `og-recap.js`.

### Known defects / debt
- **Brand typography is off on every share card.** Satori throws on our font subsets
  (`TypeError: Cannot read properties of undefined (reading '256')`), so
  `USE_CUSTOM_FONTS=false` in `api/og-recap.js` and cards render in the bundled default face.
  Layout and copy are correct; only the typeface is generic. **Fix forward:** build full
  non-subset TTFs from upstream and verify a non-zero-byte response before re-enabling.
  Ruled out already, don't re-litigate: duplicated `Content-Type` header (real, fixed, not
  the cause) and WOFF2-vs-TTF (Satori can't read WOFF2, but TTF conversions of the *same
  subsets* fail identically — the subsets lack tables Satori needs).
- **Nickname onboarding doesn't reach the new surfaces.** It *does* exist — the
  `/onboarding/teams` route is live and `PredictingHub.jsx` has a one-tap nickname nudge
  (v0.79.22). But that nudge lives on the **old** hub, which Main replaces at the R3 flag flip.
  `MainShell` / `GrupHome` / `SkorTab` have no equivalent, so after R3 a new user has no path to
  set a nickname and the klasemen shows `user_id.slice(0,8)`. Port the nudge to the 4a surfaces
  before the flip — this is visible in every share card and every standings view.
- **API-Football subscription lapsed** → *(Ade, payment action)*. Nothing is blocked; ESPN +
  fixturedownload carry the load. Renewing restores the richer stats path.
- **`Kabar` tab is intentionally inert** (muted, non-navigating) until Kabar v1 in R4.

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
