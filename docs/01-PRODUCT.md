# 01 · Product

What Gibol is, who it is for, and what it refuses to be. Condensed on 2026-10-01 from doc 11 (platform strategy v2), doc 14 §1–4 (Sistem 4a build handover) and doc 16 §5–7 (modules, BD, decisions); the originals are in `docs/archive/pickem-flagship/` and win on detail. Scope and schedule: `docs/pickem-flagship/17-PLATFORM-RESET-2026-10-01.md`.

## The one paragraph

Gibol is Indonesia's free, multi-sport Pick'em: you open a WhatsApp invite, lock a pick in three taps without an account, and climb a klasemen with people you actually know. The sport hubs (Premier League, Liga 1, NBA, F1, tennis, World Cup) are SEO assets that feed the loop; the loop is the product. No odds, no money, no betting vocabulary, ever. Gengsi is the currency.

## Who

- **Komisioner** — the friend who starts the grup, shares the link, nudges the ones who haven't picked. Owns the template (Santai / Standar / Sultan) and pays for a Season Pass when the grup outgrows the free cap.
- **Anggota** — picks on their phone in under a minute, mostly from a WhatsApp link, mostly on a Friday. Cares about one number: where they stand against their grup.
- **Tamu** — arrives from an invite, picks as a guest, signs in later. The pick and the invite follow the device to the account (claim-on-login).

## The loop

invite → pick (3 taps, no login wall) → lock at kickoff → scored by the cron within two hours of full time → klasemen → share card → next matchweek. Every surface serves one step of this loop; anything that does not is a hub or a digest, not Pick'em.

## Mechanics (named, never renamed)

**Tebak Skor** (exact score 5 · result + margin 3 · result 2 · **Nyaris** 1), **jagoan ★** (one per matchweek, ×2), underdog (×1.5 under 30 % consensus), **Gugur** (survivor: one team a week, draw = out, life per grup), **colek** (nudge via WA), **Papan Nasional** (every grup, one board), streak board. Full numbers and edge cases: `02-PLATFORM-CONTRACT.md` §1.

## Surfaces

Main (`/`), Grup (`/grup`, `/grup/:code`, `/grup/baru`), Skor (`/skor`), Kabar (`/kabar`, static digest), pick sheet (`/pick/:id`), invite landing (`/g/:code`), Gugur (`/gugur/:code`), Papan Nasional (`/papan`), rules (`/aturan`), sign-in (`/masuk`), profile (`/profil`). Mobile-first at 390 px; desktop is CSS-only (`03-DESIGN.md`).

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
