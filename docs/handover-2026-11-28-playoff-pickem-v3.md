# Handover — Gibol Playoff Pick'em v3 (2026-11-28 · v0.90.0)

Locked product & engineering blueprint approved on **2026-11-28** (`D1`–`D7`), built cleanly on top of `v0.89.18` (`Sistem 4a` + `Scoring Spec v1`).

---

## 1. Locked Strategic Decisions (`D1`–`D7`)

| ID | Decision | Locked Rule |
|---|---|---|
| **D1** | **Football & League Cadence** | **Pure Playoff / Knockout windows** (`UCL Knockouts`, `Timnas Cups`) + **5-Week Title Run-In / Big Derby Specials** (`LIGA1-RUNIN-2027`, `EPL-RUNIN-2027`). Zero 34–38 week regular-season grind on new grups. |
| **D2** | **Esports Vertical** | Include **Mobile Legends Playoffs** (`M8-KO-2027` Jan 14–23, 2027 & `MPL ID` S19/S20 Playoffs) in Tier 1 under strict anti-judol guardrails (`double-elim` + series score, zero odds/coins/skins, `check-vocab.mjs` enforced). |
| **D3** | **2027–2028 Relaunch Sequence** | Dec 2026 internal dogfooding → **Jan 14–23 `M8-KO-2027` Viral Public Beta** → **Feb 9–14 `ID-Masters-2027` (Istora)** → **Feb 16 – Jun 5 `UCL-KO-2026-27` ("Edisi Sahur" Flagship Paid Launch)** → Apr–Jul (`SUDIRMAN-2027`, `NBA-Playoffs-2027`, `EPL/LIGA1 Run-Ins`, `ID-Open-2027`, `IBL-Playoffs-2027`) → Sep–Dec (`SEA Games`, `MotoGP Mandalika`, `Proliga Final Four`) → **Dec 23, 2027 – Jan 21, 2028 `AFC-ASIAN-CUP-2027` (Timnas Garuda)**. |
| **D4** | **3-Layer Playoff Mechanics** | **Layer 1:** Zero-login `/simulasi/:competition` Dream Bracket Simulator (Rp 0 DB cost → 1080×1080 dark Satori PNG `g4-bracket` → 1-tap WA grup CTA). **Layer 2:** Universal 5-Shape Bracket (`/bagan/:competition`: `single-elim`, `two-leg-ko`, `playoff-series`, `double-elim`, `group-plus-ko`) + **`Babak Baru` (0.75× Second Chance)**. **Layer 3:** Match/Series Pick Sheet (`5/3/2/+1 Nyaris`, `★ Jagoan` ×2, `Underdog` ×1.5). `Gugur` disabled on new playoff tentpoles. |
| **D5** | **Domain, Shell & CMS** | Stay unified on `www.gibol.co`; trim Pick'em nav to **3 tabs (`Main · Grup · Skor`)**; keep SEO hubs; **pause autonomous daily `content-cron.yml`** until WPP > 10,000. |
| **D6** | **Locale & Design Scope** | Default locale flipped to **Bahasa Indonesia (`id`, `kamu/-mu` prestige register)** via `gibol:lang:v2` (auto-`en` only outside Indonesian timezones/locales). |
| **D7** | **Infra, Auth & Billing** | Stay on Vercel Hobby (**8/12 Node functions**); add **1-tap Google OAuth (`signInWithGoogle`)** alongside Magic Link; keep 10-member free cap (`Rp 79k / \$19 Playoff Pass` · `Rp 249k / \$49 Lifetime`); Jan M8 on Free + manual QRIS (`grant-entitlement`), automated QRIS + Stripe live by Feb 16 UCL. |

---

## 2. What Shipped in `v0.90.0`

- `src/pickem/playoffTopology.js` + `src/pickem/playoffTopology.test.js`: Pure 5-shape DAG engine (`single-elim`, `two-leg-ko`, `playoff-series`, `double-elim` with `loserOf` drop-down, `group-plus-ko` with `groupRankOf`), `Babak Baru` 0.75× phase filtering & scoring, URL query state (`?s=...`), and zero-migration-wait slot serialization onto `public.picks`.
- `src/pickem/Simulasi4a.jsx` (`/simulasi`, `/simulasi/:competition`) + `src/pickem/components/TopologyTree4a.jsx`: Zero-login Skenario & Dream Bracket Simulator with `⚡ Acak Skenario`, Champion reveal, 1080×1080 WA card share, and 1-tap conversion into `/grup/baru`.
- `src/pickem/Bracket4a.jsx` (`/bagan`, `/bagan/:competition`): Official Playoff Bracket + `Babak Baru` screen backed by `get-bracket` (`api/_lib/pickem/get-bracket.js`) and extended `upsert-bracket` (`api/_lib/pickem/upsert-bracket.js`) + `claimGuestBrackets` on sign-in.
- `api/_lib/og/share4a.js`: Added `g4-bracket` dark 1080×1080 / 1200×630 Satori card.
- `src/pickem/competitions.js` + `src/pickem/sportSkins.js` + `src/styles/tokens-4a.css`: Registered 10 Playoff 2027–2028 tentpoles + `mlbb` & `badminton` skins (`competitions.json` synced).
- `src/lib/AppContext.jsx`, `src/pickem/components/TabBar4a.jsx`, `src/pickem/Login4a.jsx`, `src/pickem/api.js`, `.github/workflows/content-cron.yml`: Bahasa default, 3-tab shell, 1-tap Google OAuth, daily content cron paused.
- `supabase/migrations/0025_playoff_topologies.sql`: Idempotent DDL for `public.league_seasons` (Grup Trophy Case) and `brackets.entry_phase`.
