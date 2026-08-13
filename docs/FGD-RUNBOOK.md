# FGD Runbook — Pick'em pretrial (v0.84.x, Aug 2026)

Everything here is **live in production now**. No flags to flip, no local setup.
Run the FGD entirely over WhatsApp + phones.

## The links

| What | URL |
|---|---|
| **Participant entry (send this in WA)** | `https://www.gibol.co/g/FgdGibol` |
| The FGD grup ("FGD Gibol", EPL 2026/27, owner: Ade) | `https://www.gibol.co/grup/FgdGibol` |
| New home (Main shell) | `https://www.gibol.co/main` |
| Skor tab | `https://www.gibol.co/skor` |
| Homepage (has the "Tebak Skor Liga Inggris" bridge card → /main) | `https://www.gibol.co/` |

The invite link unfurls in WhatsApp as *"Bang Ade ngajak kamu ke FGD Gibol"* with the
branded card — send it as a plain message, no image needed.

## What a participant experiences (verified end-to-end in prod, 2026-08-13)

1. Tap the WA link → invite landing ("Bang Ade is inviting you to FGD Gibol · Premier
   League 2026/27 · week 1").
2. Tap **"Join the grup — free"** → pick sheet for the next EPL MW1 fixture (ARS vs COV,
   locks at kickoff).
3. Tap a winner → **"Lock my pick"**. That's the whole floor: **3 taps, no sign-up** —
   the pick saves on-device (`guestStore`) and follows them into their account when they
   log in (`mergeGuest`). Exact score and the ★ star are optional depth, never gates.
4. `/main` shows "utang pick" (10 picks for MW1), Tonight/Coming-up cards, and their grup.

## What to observe / measure

- **The R2 exit gate, now measured on this FGD + EPL MW1** (AFF's window closed before
  anyone measured it): invite→pick **≥50%** same-session, completion **≥70%**.
- Funnel events are GA4 (`src/lib/pickemEvents.js`): `invite_open` → `first_pick` →
  `pick` → `lock_complete`. Compare counts per stage for the session.
- Qualitative: where do they hesitate on the pick sheet? Do they find the grup standings?
  Do they understand "star = double points" without being told? Would they forward the
  invite unprompted?

## Known rough edges (say "noted" and move on — all deliberate)

- **Kabar tab is muted/inert** — Kabar v1 is R4.
- **Nickname requires login** — guests show as guests until they log in; the nickname
  nudge appears on Main/Grup after login (magic-link email, Bahasa template).
- **Root homepage is still the scores site** — per doc 16 decision 1 the root flip is
  deferred; the bridge card ("Tebak Skor Liga Inggris udah dibuka") is the entry.
- **Grup is capped at 10 members** (free tier) — fine for an FGD; the #11 upgrade sheet
  is R5 work.

## Ops notes

- The grup was seeded via service role (league `a8ffcbd8-…`, code `FgdGibol` — codes are
  **case-sensitive**). Reseed pattern: insert `leagues` + owner `league_members` row.
- EPL picks were opened early for this pretrial (`openAt` Aug 14 → Aug 10 in
  `src/pickem/competitions.js`); every fixture still locks at its own kickoff.
- MW1 scoring is autonomous: the football cron backfills + scores every 2h once matches
  finish (first real matchday Aug 21–24). The FGD can run before, during, or after —
  during a matchday is richest (live Skor tab with pick status).
