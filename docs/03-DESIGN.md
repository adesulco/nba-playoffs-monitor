# 03 · Design — Sistem 4a

The design system every Pick'em screen is built from. Canvas and handoff: `design-handoff-pickem/` (the `#t4` screens). Tokens: `src/styles/tokens-4a.css`. Desktop promotion: `src/styles/desktop-4a.css`. Primitives: `src/pickem/components/primitives4a.jsx`, icons `icons4a.jsx`, logo `Logo4a.jsx`, tab bar `TabBar4a.jsx`, countdown `Countdown4a.jsx`, sheets `UpgradeSheet4a.jsx`.

## Principles

- **Paper, ink, scarlet.** Light paper background (`--g4-paper #FAF7F1`), ink text and structural rules (`--g4-ink #171310`), one accent (`--g4-scarlet #D92D1C`) for the primary CTA and the selected pick. Edisi Malam (dark) swaps paper and ink after 23:00 WIB or on system preference.
- **Two faces, self-hosted.** Bricolage Grotesque (display, 800) and Instrument Sans (UI). Static per-weight files only — Satori cannot parse variable fonts; run `scripts/test-satori-fonts.mjs` after any font change.
- **Rules, not shadows.** 2 px ink rules carry structure; cards are 1.5 px borders on a surface; pills are full-radius.
- **Register.** kamu/-mu, EN key + ID key, named mechanics keep their names (Tebak Skor, jagoan, colek, Nyaris, Gugur). No money vocabulary; `scripts/check-vocab.mjs` fails the build otherwise.
- **Three taps.** Invite → outcome → lock. Anything that adds a tap to the first pick needs a reason written down.

## Layout

Mobile-first inline styles capped at 480 px (`.g4-shell`, `.g4-body`, `--g4-gutter`). Desktop is CSS-only: `desktop-4a.css` promotes at ≥ 640 / 900 / 1200 px with a left nav rail and a right `SideRail4a`; overrides need `!important` because inline styles win. Both rails are positioned off the viewport centre — change a shell's max-width and you must change the rails' half-width. Verify every shell change at 390 px and 1440 px.

## Primitives

`PickChip` (default / selected / locked), `MatchCard`, `LeaderboardRow` (rank, avatar, name, `kamu` and `belum pick` chips, nyaris chip, streak, points), `LiveTile` (sport-colour border, pick status strip, provisional points), `KabarCard`, `LockBadge` + `formatCountdown` (EN `1d 2h`, ID `1h 2j`), `Countdown4a` (the only thing that ticks).

## Share cards

`api/og-recap?type=g4-*` rendered by `api/_lib/og/share4a.js`: `g4-invite`, `g4-matchday`, `g4-juara`, `g4-streak`, `g4-gugur`; `size=og` for 1200×630, square otherwise. Edge functions return 200 with an empty body on a throw — verify with `%{size_download}`.

## Skins

`src/pickem/sportSkins.js`: Bola, Basket, MotoGP, Voli — accent, lock verb, rhythm, live-tile shape. The competition registry's `sport` key picks the skin; nothing else maps competitions to colours.
