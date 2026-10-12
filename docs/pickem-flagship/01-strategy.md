# Pick'em as the Business — Strategy & Inversion Plan

**Date:** 2026-06-11 (WC2026 Pick'em switch day) · **Decision owner:** Ade
**Decisions already made:** Pick'em becomes the main business model (gibol.co root). Live scores/media hubs move to a subdomain. Revenue = paid commissioner tiers + premium player features. Live data becomes the addon/differentiator, not the product.

---

## 1. Competitive teardown — PlayoffPickems.com

| Dimension | PlayoffPickems | Implication for Gibol |
|---|---|---|
| Positioning | "Your playoff pool. Zero hassle." Sells to the **commissioner**, not the player | Copy this. The buyer is the grup admin, the players come free |
| Scale | 17,700 players · 3,900 pools · 13,900 brackets | Small. A focused Bahasa+global product can beat this |
| Tournaments | NFL, March Madness, NBA, NHL, FIFA WC2026 | Gibol already has NBA + WC2026 live, plus EPL/F1/Tennis/Liga 1 surface |
| Funnel | SEO landing per tournament + **free tools** (predictors, what-if scenario builders) → sign-up → create pool → invite link → upgrade | Gibol has the SEO infra (216 URLs, prerender, JSON-LD) but no tool-funnel or pool-first onboarding |
| Pricing | Free: 1 pool, 10 members, 1 entry · **$19/season per tournament** · **$49 lifetime all tournaments** | Validate the same ladder; add IDR rail |
| Killer features | Custom scoring per round set by commissioner · group-position points + perfect-group bonus · two knockout modes (independent R32 vs auto-fill from group picks) · picks lock at kickoff · manual entries for offline players · multiple entries per user | This is the P0 gap list — see §3 |
| Weaknesses | English-only, US-centric, no live-score/media layer, no localized payments, no WhatsApp-native flow, solo dev | Gibol's wedge: Bahasa + WhatsApp + live data + content engine |

**The core insight:** PlayoffPickems wins because the *commissioner's pain* (chasing picks, spreadsheets, manual scoring) is the product. Gibol's Pick'em is currently player-first (join Gibol's official competition). The inversion: **pools (grups) become the product; Gibol's official public pool becomes just the default grup everyone is in.**

## 2. Business model

Two paying personas, one free viral loop:

**A. Commissioner (the buyer)**
- **Gratis:** 1 grup, 10 anggota, 1 entry/orang. Enough to taste it with the tongkrongan.
- **Season Pass:** unlimited anggota + grups for one competition, multi-entry, manual entries, custom scoring. **$19/season intl · Rp 79.000/season IDR.**
- **Lifetime:** all competitions forever. **$49 · Rp 249.000.**

**B. Premium player (B2C freemium)** — Rp 19.000/bulan or Rp 99.000/tahun ($2/$10): multiple entries across grups, advanced pick stats (public consensus %, ESPN win-prob overlay on the pick screen — this is where the live-data moat becomes the paid addon), badges/flair on leaderboards, ad-free.

**C. Later (not now):** sponsored public mega-pools with merch/voucher prizes (fangir tie-in — Kartu Bola recap → shoppable card). Indonesia-fit, needs traffic first.

**Legal guardrail (non-negotiable):** no real-money entry fees or pots in Indonesia — that's judi online territory (UU ITE + Komdigi blocking; the Polymarket lesson already absorbed). Revenue is SaaS fees for *hosting* a pool, never a cut of stakes. Keep "main duit" language out of all copy; prizes in sponsored pools are merchandise/vouchers only.

**Payments:** Stripe for USD; Midtrans or Xendit for IDR (QRIS + GoPay/OVO/Dana + VA). One `entitlements` table keyed on `profiles.user_id`, provider-agnostic.

## 3. Feature gap list (to parity, then past it)

**P0 — commissioner layer (the product):**
1. **Pool-first onboarding** — create grup in <60s: name → scoring template → WA share link. Joiner lands on invite page, can pick as guest (`guestStore.js` already exists), account nudge only at save/lock. No account needed to *view* a pool.
2. **Commissioner controls** — custom points per round/stage, perfect-group bonus, knockout mode toggle (independent R32 vs auto-fill from group picks), entry deadline display, kick/rename members, manual entry on behalf of offline players.
3. **Multiple entries per user** (paid gate).
4. **Pool leaderboard as the home screen** for a logged-in member — not the global board.

**P1 — funnel + monetization:**
5. Free no-login tools: WC2026 bracket predictor + "skenario lolos grup" what-if builder, each with shareable PNG (reuse static-PNG pattern) → SEO pages in Bahasa AND English (international market = English landing pages, `/en/` prefix).
6. Pricing page + checkout (Stripe/Midtrans) + entitlement enforcement.
7. Pick-screen addons from existing data: consensus %, win-prob chip, form/H2H snippet (premium).

**P2 — retention:**
8. Round-by-round recap pushed to the grup (OneSignal is wired) + WA-ready standings card per matchday.
9. Badges/streaks surfaced (tables exist via migration 0017).
10. Mid-tournament joinability (late joiners get prorated scoring or join next stage) — PlayoffPickems doesn't do this well; differentiator.

## 4. Architecture inversion — without breaking what's live

Ade's call: **gibol.co root = Pick'em; live scores/media = subdomain.** Recommended subdomain: **`skor.gibol.co`** (Bahasa, says what it is).

The 216-URL SEO moat lives on www. Moving it mid-WC-window would burn the traffic spike. So invert in three phases:

**Phase A — now, during the window (1–2 ships, no URL moves):**
- `/` swaps to the new Pick'em-first home (pool hero + WC2026 CTA). Hubs stay at their current www URLs, reachable via a "Skor & Berita" nav item. `src/pickem/` is already an isolated module with its own root, CSS, API layer — promote it, don't rewrite it.
- All Pick'em screens get the pool-first IA (§5). New routes live under `/` (`/buat-grup`, `/g/:inviteCode`, `/main/:competition`).
- Zero risk to hub SEO; the homepage was never the SEO asset (the player/team/race pages are).

**Phase B — after the WC final (late July):**
- Stand up `skor.gibol.co` as a second Vercel domain on the same project (same repo, env-flag or host-based routing in the SPA — no second codebase). 301 every hub route from www → skor with path preserved; split sitemaps; update OG URLs + canonical tags + llms.txt.
- Pick'em SEO (tool pages, competition landings, EN pages) replaces hub SEO on www over time.

**Phase C — module hardening (background):**
- `api/pickem.js` + `api/_lib/pickem/*` already separate. Add `api/_lib/billing/*` (webhooks for Stripe/Midtrans), `entitlements` + `pool_settings` migrations (0019+). Extend `leagues`/`league_members` (a grup IS a league) rather than new tables. Verified: `leagues` already has `owner_id`, `invite_code`, `visibility`, `competition`, `enabled_modes`, `theme`, `color` — the create→invite→join loop exists. Migration 0019 only needs to add `scoring_config jsonb`, `max_members int`, `tier text` and teach the scoring RPCs to read per-league `scoring_config` (fallback to `pickem_rules`).

**What does NOT change:** Supabase project, auth, scoring cron, competition registry, the hubs' code. The inversion is routing + IA + a billing slice.

## 5. New IA (wireframes in `02-wireframes.html`)

```
gibol.co (PICK'EM = the product)
├── /                     Landing: hero, live competition strip, create-pool CTA, pricing
├── /buat-grup            3-step create (nama → aturan skor → bagikan link WA)
├── /g/:inviteCode        Invite landing → guest picks → login nudge at save
├── /main/:competition    My picks (Grup stage ▸ Knockout tabs; consensus/win-prob = premium)
├── /grup/:id             Pool home: leaderboard, members, commissioner panel
├── /harga                Pricing (IDR ⇄ USD toggle)
├── /tools/*              Free predictors + scenario builders (ID + /en/)
└── /en/*                 English landings for international market

skor.gibol.co (LIVE DATA = the addon)
└── all existing hubs unchanged (NBA, EPL, Liga 1, F1, Tennis, recaps, derby)
    └── every game/recap page gets a "Tebak di Pick'em →" backlink
```

## 6. Sequence (ship-this-week framing)

| Week | Ship |
|---|---|
| **Now (WC group stage)** | Phase A home swap · create-grup 3-step flow · invite/guest-join page · commissioner custom scoring on `leagues.scoring_config` |
| +1 | Pricing page + Midtrans/Stripe checkout + entitlement gates (member cap, multi-entry) · manual entries |
| +2 (R32 starts ~Jun 28) | Free WC predictor tool + EN landing pages · premium pick-screen addons (consensus, win-prob) |
| +3–4 | WA standings cards + push recaps · badges surfacing |
| Post-final (late Jul) | Phase B: skor.gibol.co migration with 301s |

**North-star metric:** weekly active *pools* (not users). Guardrails: pool creation→3-member activation rate; paid conversion of pools hitting the 10-member cap.

## 7. Open risks

1. **SEO transfer (Phase B)** — subdomain moves always cost some equity; mitigate with strict 301s + updated canonicals, and do it in the dead window after the WC final.
2. **WC2026 knockout fixtures** still need the `backfill-wc2026.mjs` re-run once groups resolve — that's also the deadline for the knockout-mode toggle to work.
3. **Payment provider onboarding** (Midtrans KYB) takes days–weeks — start the application now, ship Stripe first if it lags.
4. **Free-tier sizing**: 10 members may be too tight for Indonesian grup culture (WA groups run 50+). Consider Free = 15, and watch the cap-hit conversion data before tuning.
