# 01 · Product

What Gibol is, who it is for, and what it refuses to be. Condensed on 2026-10-01 from doc 11 (platform strategy v2), doc 14 §1–4 (Sistem 4a build handover) and doc 16 §5–7 (modules, BD, decisions); the originals are in `docs/archive/pickem-flagship/` and win on detail. Scope and schedule: `docs/pickem-flagship/17-PLATFORM-RESET-2026-10-01.md`.

## The one paragraph

Gibol is Indonesia's free, prestige-only **Playoff Pick'em**: you simulate a dream bracket in 30 seconds without logging in (`/simulasi`), challenge your WhatsApp grup (`/g/:code`), lock your tournament bracket (`/bagan`) plus round-by-round match picks, and climb a klasemen with people you actually know. Focusing on **short, high-stakes Playoff & Knockout windows** (MLBB M8/MPL, BWF Istora Super 500/1000 & Sudirman, UCL Knockouts, NBA/IBL Playoffs, Timnas Garuda Cups, and 5-week Liga 1/EPL Title Run-Ins) eliminates 38-week regular-season fatigue. No odds, no money prizes, no betting vocabulary, ever. Gengsi is the currency.

## Who

- **Komisioner** — the friend who starts the grup, shares the link, nudges the ones who haven't picked. Owns the template (Santai / Standar / Sultan) and pays for a Season Pass when the grup outgrows the free cap.
- **Anggota** — picks on their phone in under a minute, mostly from a WhatsApp link, mostly on a Friday. Cares about one number: where they stand against their grup.
- **Tamu** — arrives from an invite, picks as a guest, signs in later. The pick and the invite follow the device to the account (claim-on-login).

## The loop

invite → pick (3 taps, no login wall) → lock at kickoff → scored by the cron within two hours of full time → klasemen → share card → next matchweek. Every surface serves one step of this loop; anything that does not is a hub or a digest, not Pick'em.

## Mechanics (named, never renamed)

1. **Skenario & Dream Bracket Simulator (`/simulasi/:comp`)** — zero-login, zero-DB-cost top-of-funnel sandbox → 1080×1080 dark Satori Champion Card (`g4-bracket`) → 1-tap WhatsApp grup creation.
2. **5-Shape Playoff Bracket (`/bagan/:comp`) + `Babak Baru`** — `single-elim`, `two-leg-ko`, `playoff-series` (series length bonus), `double-elim` (Upper + Lower `loserOf`), and `group-plus-ko`, plus **`Babak Baru`** (0.75× Second Chance re-entry per knockout stage so busted brackets never churn).
3. **Tebak Skor** (exact score 5 · result + margin 3 · result 2 · **Nyaris** 1), **jagoan ★** (one per round, ×2), underdog (×1.5 under 30 % consensus), **colek** (nudge via WA), **Papan Nasional** (every grup, one board). (`Gugur` survivor is parked/disabled on new Playoff tentpoles). Full numbers: `02-PLATFORM-CONTRACT.md` §1.

## Surfaces

3-Tab Pick'em Shell (`Main · Grup · Skor`): Main (`/`), Grup (`/grup`, `/grup/:code`, `/grup/baru`), Skor (`/skor`), Simulator (`/simulasi`, `/simulasi/:comp`), Playoff Bracket (`/bagan`, `/bagan/:comp`), pick sheet (`/pick/:id`), invite landing (`/g/:code`), Papan Nasional (`/papan`), rules (`/aturan`), sign-in (`/masuk` — 1-tap Google OAuth + Magic Link), profile (`/profil`). Bahasa Indonesia (`id`) by default (`D6`). Mobile-first at 390 px; desktop is CSS-only (`03-DESIGN.md`).

## Money

Free for grups up to 10 members. Season Pass (per competition), Lifetime, Gibol+ (monthly) — prices in `src/pickem/pricing.js`, never typed into copy. Sponsor pools later. Billing (Midtrans) lands when KYB closes; until then an order link and a manual grant (`grant-entitlement`). Monetisation never touches the pick itself.

## Portfolio and calendar

One sport = one registry row (`src/pickem/competitions.js`). Live: Premier League 2026/27. Registered: Liga 1 2026/27 (feed pending at ESPN), NBA 2026/27 (regular-season weeks). Finished and kept as history: World Cup 2026, ASEAN Cup 2026, NBA Playoffs 2026. Magnets fund the moat: a big-audience sport brings people; the grup keeps them.

## What we do not build

Odds, cash prizes, fantasy salary caps, public chat, a second scoring system, a native app before the PWA earns it, a regional expansion before an Indonesian grup renews on its own.

## Gates

Weekly active pools (grups with ≥ 3 members and ≥ 1 pick in 7 days) is the north star. Invite → pick ≥ 50 % same session; matchweek completion ≥ 70 %. The FGD on MD7–8 (Oct 17–18) is the first measured read.

## Decisions on record

Doc 16 §7 (2026-08-08) and doc 17 §4 (2026-10-01): Spec v1 ladder from the EPL catch-up; jagoan ×2 flat with penalty off by default; Gugur draw = out, per grup, gated by the grup toggle; grup bonus removed; `enabled_modes` is the one mode system; `UI.pickemHome` default true; four docs only.
