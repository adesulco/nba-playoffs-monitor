# Side-by-Side: Gibol Pick'em (planned + designed) vs PlayoffPickems.com

**Date:** 2026-06-11 · Gibol column = doc set `00`–`06` + the `design_handoff_flagship` bundle (received today). PlayoffPickems column = live product as fetched Jun 10–11, 2026, **plus a logged-in teardown of Ade's real 63-member WC2026 pool (§6)** — the inside view confirms the scorecard and adds one new opportunity.
**Scoring:** 🟢 we win · 🟡 parity · 🔴 they win · Each 🔴 gets a counter-move in §3.

---

## 1. The scorecard

| # | Dimension | PlayoffPickems (live today) | Gibol Pick'em (planned + designed) | Edge |
|---|---|---|---|---|
| 1 | **Shipped & proven** | Live for multiple seasons; 17.7k players, 3.9k pools; Reddit word-of-mouth (r/FFCommish, r/fantasyfootball) | Core loop live (NBA proven, WC2026 on); flagship surfaces are R1–R4 ahead | 🔴 |
| 2 | **Onboarding friction** | Sign-up before anything; commissioner-centric setup | ≤3 taps from invite link to first confirmed pick, **no login wall** (guest picks, magic link at lock — TeachProto proves it) | 🟢 |
| 3 | **First-touch surface** | Bracket-first (US pool culture) | "Tonight"-first — one tap, one match; bracket is a power-user tab | 🟢 |
| 4 | **Game formats** | Full bracket · round-by-round · WC group predictions (2 knockout modes) | Match-by-match · **Bracket Lock** (their parity, designed) · **Tebak Skor** · **Survivor** · group + knockout — and a grup can run formats side-by-side | 🟢 |
| 5 | **Scoring depth** | Custom points/round · perfect-group bonus · auto reseed · lock at kickoff | All of theirs **+ underdog ×1.5 + jagoan ×2/−25% + streak +3 + late-join median par** — every variable commissioner-tunable in `scoring_config` | 🟢 |
| 6 | **During-the-match experience** | Nothing — standings update *after* games | **Live provisional points** ("+10 if it stays like this"), win-prob, live board with pulsing amber chips — powered by a data layer they don't have | 🟢 moat |
| 7 | **Social/share loop** | Generic invite link; no share artifacts | WA-native: colek nudges, 4:5 standings card PNG, auto recap line ("Budi just overtook you — thanks, Morocco 😂"), OG-tuned links | 🟢 moat |
| 8 | **Retention & legacy** | Pools are disposable per season; no identity layer | Trophy case, grup history, H2H records, career stats, one-tap rollover to the next competition, badges/streaks, Musuh Bersama reactivation | 🟢 |
| 9 | **Sports calendar** | NFL · March Madness · NBA · NHL · WC2026 — **all playoff-window products; dark between windows** | WC2026 now · NBA · **EPL full season (Aug)** · Liga 1 · F1 · Tennis · IBL later — year-round cadence | 🟢 strategic |
| 10 | **Markets & localization** | US/English only; card payments | EN-first + ID (design rule change #1), WIB, QRIS/GoPay/OVO/Dana + Stripe USD — international AND Indonesian | 🟢 |
| 11 | **Pricing ladder** | Free (1 pool/10) · $19 season · $49 lifetime | Same ladder + Rp 79k/249k local rails + **Gibol+ player tier (Rp 19k/mo)** — a second revenue line they don't have | 🟡→🟢 |
| 12 | **Payments live** | Working today | R3 (Jun 28+); Midtrans KYB pending | 🔴 |
| 13 | **SEO/funnel** | Tournament landings + free predictor/scenario tools — clean, indexed, working | 216-URL infra + content engine + planned tools (R3) — bigger engine, but Pick'em-specific pages don't exist yet | 🔴 today / 🟢 by R3 |
| 14 | **Trust surface** | Real Reddit testimonials, simple FAQ, transparent pricing | None for Pick'em-as-product yet (testimonials, public changelog, FAQ) | 🔴 |
| 15 | **Platform** | Next.js web app, no offline | PWA: installable, offline picks ("saved on your phone"), push (OneSignal) | 🟢 |
| 16 | **Design system** | Functional SaaS default | Token-built system (paper/Stadium), 44px thumb-first, motion spec, a11y-audited, WA-artifact design | 🟢 |
| 17 | **Simplicity / focus** | Ruthlessly simple — one job, no clutter | Risk side of our richness: jagoan + underdog + streak + survivor + tebak skor can overwhelm | 🔴 risk |
| 18 | **Ship velocity** | Solo dev, fast, attentive (per Reddit) | Claude-Code pipeline + proven 0.x cadence; window discipline | 🟡 |

**Net: 11🟢 · 2🟡 · 5🔴.** Every 🔴 is time or packaging, not structure. Their only structural advantages are *incumbency* (#1, #14) and *simplicity* (#17). Ours — live data, WA culture, year-round calendar, legacy layer, two-market pricing — are things a solo US-sports product can't bolt on quickly.

## 2. Where each side is genuinely better (honest read)

**They're better at:** being live and trusted today; zero-decision simplicity (a commissioner understands the whole product in one scroll); the US playoff calendar muscle memory; having real users vouching on Reddit.

**We're better at (by design, once shipped):** the first 90 seconds (guest picks vs sign-up wall); the 90 minutes *during* a match (live provisional vs silence); the 9 months *between* tournaments (EPL/Liga 1/F1 vs dark site); the group's WhatsApp thread (artifacts vs nothing); two markets and two payers (commissioner + player) vs one.

**The asymmetry that decides it:** PlayoffPickems is a *seasonal tool*; Gibol is designed as a *year-round habit with seasonal spikes*. Their product goes dormant the day a tournament ends — that's exactly when our rollover prompt, trophy case, and the next league fire.

## 3. Counter-moves for every 🔴

| 🔴 | Counter-move | When |
|---|---|---|
| #1 Incumbency | Don't fight it where they are strong (US playoff pools, off-season). Win WC2026 share *now* — they list WC2026 too, but with sign-up walls, no group-stage daily loop, no live layer, English-only flat scoring. Our group-stage window (Jun 11–27) is the beachhead | R1–R2 |
| #12 Payments | Stripe-first if KYB lags; manual-grant stopgap already specced (R2-6) | R3 |
| #13 Pick'em SEO | Tools pages (predictor + scenario) cloned-and-bettered with shareable PNG output; EN + ID; ride the existing prerender/sitemap/IndexNow infra; content engine writes the Bahasa pick'em guides | R3 |
| #14 Trust | Cheap and fast: public changelog page off `version.js`, transparent-pricing FAQ, "built for WA-group commissioners" story page, seed testimonials from the proven NBA grups + WC week-1 groups; legal note on every payment surface (designed) | R2–R3 |
| #17 Complexity risk | Already structurally handled — **templates hide the depth**: free default = match-by-match with standard scoring; jagoan/underdog/streak are commissioner *toggles*, surfaced post-pick. Acceptance rule to keep: a brand-new member never sees a scoring rule before their first pick | always |

## 4. How we get *ahead* (not just to parity) — ranked

1. **Win the window we're in (Jun 11–27).** Group stage = 4–6 matches/day = the daily-habit engine their weekly NFL product never had. Every day of R1/R2 slippage is compounding loss. Nothing on this list matters more than Track A + Track B landing during groups.
2. **Own the off-season they don't have (Aug).** EPL full-season pick'em makes Gibol a 10-month product vs their ~4-month calendar. The Jul 19 rollover prompt is the single highest-leverage ship of the year: it converts WC pools into EPL pools the day their product goes dark.
3. **Make the live board the marketing.** Their testimonials say "easy to use"; nobody can say "we watched the leaderboard flip live in the 89th minute." That moment is the WA-shareable, TikTok-able 6-second clip. Instrument `pickem_share_card` and design week-1 around producing those clips.
4. **Two payers, two markets.** Gibol+ (player premium) is a revenue line structurally unavailable to them (no live data to sell). EN-first design (rule change #1) opens the international commissioner; QRIS opens the Indonesian one. Same product, two funnels.
5. **Legacy as lock-in.** Trophy case + grup history makes year-2 churn-proof in a way disposable pools can't match. By WC final day every active grup must have something to defend.
6. **Optional flanking move (decide by Nov 2026):** NFL Playoffs Jan 2027 on *their* home turf — ESPN API already covers NFL; the registry is sport-generic; our free tier + no-login join + live layer vs their sign-up wall is a clean Reddit pitch in the exact subreddits that built them. Park as R6 candidate; revisit after EPL traction data.

## 5. Inside the product — logged-in teardown (Jun 11, "Neon Trading Cards World Cup", 63 members)

What the marketing pages don't show:

1. **The group stage is a one-shot, then 16 days of silence.** Every group prediction locks at once ("Groups lock in 00d:04h:46m" — first kickoff today), and the Knockout tab is a padlock: "Picks open once official group results are in." A member who drags their 12 groups today has **zero actions until ~Jun 28**. Their "live standings" are just totals updating. This is the strongest possible validation of our Tonight-first match-by-match loop — during the exact window when we'd serve 4–6 picks a day, their members have literally nothing to do.
2. **The pick verb is drag-to-rank** (drag handles + up/down arrows on desktop), with a shuffle button and an autosave "Saved" toast. Clean, but desktop-brain — exactly the interaction our mechanics doc banned from the mobile hot path. Their only data layer is a static FIFA world ranking (#15) next to each team name.
3. **Entries tab = flat CSV-exportable table** (entry name · Groups ✓/— · Bracket ✓/— · Total /512 max pts), me-row highlighted. No avatars, no nudges, no social anything, no way to see *who hasn't picked* and poke them — the commissioner exports a CSV and chases people in chat. Our colek-on-WA row is a direct hit on this.
4. **Activity tab = commissioner audit log** (parity with our R2-5 edit history — they ship it too, so it's table stakes, not differentiation).
5. **The biggest find — sponsored community pools already exist on their platform, unmonetized.** This pool is run by a Whatnot trading-card seller: "FREE TO ENTER! Must be Rookie Tier on Whatnot or have at least 500 points," prizes $500/$200/$100/$50/$50 in store vouchers. A brand is using a $19 tool to run a 63-person engagement campaign, gating entry on *their own* loyalty status, and PlayoffPickems captures $19 of that value with zero sponsor features (no branding, no entry-gating product, no prize display beyond a text box, no lead capture). **This validates our sponsored-pools model (01 §2C) with live evidence and reveals the white space: a "Sponsor Pool" tier** — branded skin, gated entry links, prize/voucher display, member export, engagement stats — priced like a campaign (Rp 2–5jt / $199+), not like a season pass. Park it as the R6 monetization candidate next to the NFL flank; it's also the natural fangir tie-in (vouchers = shoppable prizes).
6. **In-context upgrade modal** ("Go Pro" → Season Pass vs Lifetime cards) — clean paywall UX, same two tiers; nothing we haven't matched, but confirms the upgrade moment is a modal over the working surface, not a separate page. Mirror that in the pending-member sheet.

Scorecard adjustments from the teardown: row #6 (during-the-match) upgraded from "we win" to **structural** — it's not that their live experience is thin, it's that their format produces *no member actions for the entire group stage*. Row #7 (social loop) similarly confirmed: the product has no nudge primitive at all.

**Auth + checkout addendum (second logged-in pass, Jun 11):**

7. **Auth is Google OAuth** (Ade's account: Google avatar + gmail in the user menu). Account surface is a single Display Name field in a modal — no profile, no preferences, no favorite team. Confirms: members must create an account before doing anything, and the product holds no identity data to build retention on. Our guest-first + magic-link + favorite-team/nemesis profile is differentiated on both ends of that.
8. **Checkout = Stripe hosted (live mode), USD card only, with an extra friction step:** Go Pro → tier modal → Season Pass forces a second modal to choose *which* tournament ("Select a tournament to upgrade" — FIFA WC / March Madness / NBA / NFL / NHL) → checkout.stripe.com. Three decisions before paying. Validates our R3 design: provider-hosted checkout (never touch card/QRIS data) but **one decision** — the upgrade sheet opens pre-scoped to the competition the grup is already in. No localized rails confirmed: QRIS/GoPay remains ours alone.
9. **They run PostHog** (us.i.posthog.com events on every click) — same analytics stack as Gibol. Instrumentation parity; the difference will be acting on it (06 GAP-6 targets).

## 6. Watch-list (how they could hurt us)

Solo dev ships fast: jagoan/tebak-skor are copyable in weeks if visible. Defenses that aren't copyable: the live-data layer (cost + integration), WA-culture depth (locale + register), the year-round multi-sport registry, content-engine SEO velocity, and grup legacy (compounding data they'd start from zero on). Also watch RunYourPool/Splash Sports (the incumbents above them) moving down-market with real-money — a lane we legally and deliberately never enter; if real-money pools arrive in SEA, our "no-gambling, grup-safe" positioning becomes the differentiator, not a constraint.
