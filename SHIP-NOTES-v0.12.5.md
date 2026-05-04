# SHIP-NOTES — v0.12.4 + v0.12.5

**Ship dates:** 2026-04-25 (combined release notes for two back-to-back ships)
**Theme:** Home audit response — Ade's 4-item list ("Let's focus first fixing home")
**Predecessor:** v0.12.3 (mobile audit response)

> **What this pair of ships does in one line.** Closes Ade's four
> reported issues on Home: (1) anon home unclear / placeholder-ish, (2)
> magic-link login state not propagating, (3) no live data shown for
> first-time visitors, (4) no way to save favorite teams. Two ships
> instead of one because the favorites onboarding (v0.12.5) needs a
> Supabase migration that has to be applied separately by Ade.

---

## v0.12.4 — auth fix + cross-sport home redesign

### Fix B · Magic-link UI propagation

**`src/hooks/useUserBracketSummary.js`** now subscribes to
`supabase.auth.onAuthStateChange()`. Pre-fix the hook read the session
ONCE on mount, so a user who signed in via the `/auth/callback`
redirect saw the home Pick'em hero stuck on the anon CTA until a hard
refresh. Fix:

```js
const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !user) {
    setState({ status: 'anon', ... });
    return;
  }
  load(user); // re-fetch with the fresh user
});
```

`SIGNED_IN`, `TOKEN_REFRESHED`, `USER_UPDATED` all trigger a re-fetch
without flickering through `loading` (no interim state flash).

### Fix A · Anon home no longer reads as "logged-in dashboard with placeholder data"

**Three changes on HomeV1:**

1. **`FollowingCard`** renders as **"Trending teams"** for anon users
   (was "Following") with an amber sign-in footer:
   > ★ Masuk untuk simpan tim favorit →

   Routes to `/login?next=/onboarding/teams` so the next step after
   sign-in is the favorites picker (v0.12.5).

2. **`LiveGridCard`** now pulls Tennis live (ATP + WTA via
   `useTennisScoreboard`) on top of NBA + EPL. Header chip flips from
   "NBA · EPL" to "**NBA · EPL · F1 · TENNIS**" so the cross-sport
   intent is visible.

3. **"Coming up" fallback** when nothing is live: surfaces NBA next
   pre-game, EPL next fixture, and the F1 next GP. Cards use a mono-
   status chip instead of the red live Pill so users can tell live vs
   scheduled at a glance.

### Fix (3) · No more "No live matches right now" empty state

The home no longer dead-ends on an empty card. When live=0, it shows
upcoming across four sports.

---

## v0.12.5 — favorite teams onboarding + persistence

### New: `supabase/migrations/0004_profile_favorites.sql`

```sql
alter table public.profiles
  add column if not exists favorite_teams jsonb default '[]'::jsonb;

create index if not exists profiles_favorite_teams_gin_idx
  on public.profiles using gin (favorite_teams);

-- RLS: users can update their own favorites
create policy profiles_self_update_favorites
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
```

**⚠️ Apply step:** Migration must be run manually via the Supabase SQL
Editor before the feature is functional. Without it the picker shows
but `save()` throws — the UI logs the error and continues.

URL: https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new

### New: `src/hooks/useFavoriteTeams.js`

Read + write the favorites array. Same auth-state subscription pattern
as `useUserBracketSummary` so the home FOLLOWING card updates the
moment a user adds a fav. Save uses `upsert` on the user's `id` so it
handles the case where the profile row doesn't exist yet.

Favorite shape:

```js
{ sport: 'nba'|'epl'|'f1'|'tennis', id, short, color, name? }
```

### New: `/onboarding/teams` page

Four sections (NBA 30 teams, EPL 20 clubs, F1 11 constructors, Tennis
~15 popular players) rendered as a chip grid. Multi-select up to **8
total** picks across all sports (cap chosen to keep the home
FOLLOWING list focused).

- "Simpan & lanjut →" button → save to Supabase → navigate to
  `?next=` destination (defaults to `/`)
- "Lewati" → navigate to `?next=` without saving (user can come back
  via the FOLLOWING card's onboarding nudge)
- Disabled chip state when 8/8 reached (with reduced opacity)

### AuthCallback redirect logic

After successful magic-link exchange, peeks at
`profiles.favorite_teams`. Empty → redirect to
`/onboarding/teams?next=…` so first-time users always see the picker
on their first sign-in. Returning users go straight to their requested
`next` page (or `/bracket` default).

### FollowingCard surfaces saved favorites

Logged-in users with saved favs see those rendered exclusively (no
fallback to seed Thunder/Celtics/Arsenal). Each fav links to:
- NBA → `/nba-playoff-2026/{slug}` per-team SEO page
- EPL → `/premier-league-2025-26/club/{slug}` per-club SEO page
- F1 → `/formula-1-2026/team/{slug}` per-constructor SEO page
- Tennis → `/tennis?player={slug}` picker-prefilled hub URL

Three-state UX on the FollowingCard:
- **anon** → "Trending teams" + amber sign-in footer
- **logged-in, no favs yet** → seed teams + blue "★ Pilih tim favoritmu →" footer (routes to onboarding)
- **logged-in, saved favs** → user's saved favs only, no footer nudge

---

## Files added (v0.12.5)

```
supabase/migrations/0004_profile_favorites.sql
src/hooks/useFavoriteTeams.js
src/pages/OnboardingTeams.jsx
SHIP-NOTES-v0.12.5.md
```

## Files modified

```
v0.12.4:
  src/hooks/useUserBracketSummary.js   — onAuthStateChange subscription
  src/pages/HomeV1.jsx                 — isAnon prop on FollowingCard, tennis live, upcoming fallback
  src/lib/version.js                   — APP_VERSION 0.12.3 → 0.12.4
  package.json                         — 0.3.4 → 0.3.5

v0.12.5:
  src/App.jsx                          — register /onboarding/teams route
  src/pages/AuthCallback.jsx           — redirect first-time signed-in users to onboarding
  src/pages/HomeV1.jsx                 — FollowingCard reads from useFavoriteTeams + nudge variants
  src/lib/version.js                   — APP_VERSION 0.12.4 → 0.12.5
  package.json                         — 0.3.5 → 0.3.6
```

---

## Verify

```sh
# Bundles confirm v0.12.5 + the onboarding route returns 200
B=$(curl -s https://www.gibol.co/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
curl -s "https://www.gibol.co/$B" | grep -oE '"0\.12\.[0-9]+(\.[0-9]+)?"' | head -1
# Expected: "0.12.5"

curl -sI "https://www.gibol.co/onboarding/teams" | head -1
# Expected: HTTP/2 200
```

**Manual flows to test:**

1. **Anon home** — visit gibol.co in a fresh incognito tab, scroll
   past the Pick'em hero. Confirm:
   - "Trending teams" label on the FOLLOWING card (not "Following")
   - "★ Masuk untuk simpan tim favorit →" amber footer
   - "NBA · EPL · F1 · TENNIS" chip on the LIVE NOW card
   - When no live games: card flips to "Coming up" with mono status chips

2. **Magic-link sign-in** — first time signing in via magic link.
   Confirm:
   - After /auth/callback completes, you land on /onboarding/teams
     (not /bracket directly)
   - Pick a few teams, save → land on / (or whatever `next` was)
   - FOLLOWING card now shows your saved teams (no seed fallback)

3. **Returning user with saved favs** — sign in again via magic
   link. Confirm:
   - You DON'T see /onboarding/teams (skipped because favs exist)
   - You land on the requested next page (default /bracket)

4. **Magic-link UI propagation** — sign out, sign in via magic link,
   without refreshing observe:
   - Pick'em hero on home flips from anon CTA to logged-in standing
     within ~1s of /auth/callback completing
   - LeagueChip in TopBar appears (if user has a league)
   - FOLLOWING card switches from "Trending teams" to "Following"

---

## Known limitations / parked

- **Migration must be applied manually** — `0004_profile_favorites.sql`
  needs to be run via Supabase SQL Editor. Until applied, picker UI
  works but save throws (logged, no UI break).
- **No edit-favorites surface** beyond re-running /onboarding/teams.
  Future ship: a `/settings/teams` page or modal for in-place edits.
- **No "X people follow this team" social proof yet** — the GIN index
  in the migration is provisioned for this future feature; UI is not
  built.
- **No personalized live ticker yet** — favorites surface in
  FOLLOWING but don't drive the LIVE NOW card. Theme C (Sprint 2 /
  v0.13.x) wires saved favs into the live grid prioritization.
- **Tennis player picker uses ?player= query param** instead of a
  dedicated route. Same as today's behavior; consistent with the
  v0.11.23 hub deep-link pattern.

---

## Sprint 1 final tally

| Ship | Theme |
|---|---|
| v0.12.0 | Theme A part 1 — Dynamic OG endpoint |
| v0.12.1 | Theme A part 2 — Share button rewire + Theme J seedling |
| v0.12.1.1 | Hotfix — Maxey on the wrong team |
| v0.12.2 | Theme B — Pick'em Home hero + League chip |
| v0.12.3 | Mobile audit response (M-1 through M-10) |
| **v0.12.4** | **Home audit — auth fix + cross-sport live redesign** |
| **v0.12.5** | **Home audit — favorite teams onboarding + persistence** |

**7 ships in 8 days, 0 regressions.** Sprint 1 closes 2026-04-25 with
all 24 audit findings + 8 verification follow-ups + 10 mobile fixes +
4 home-audit items shipped to production.

Sprint 2 kickoff Mon 2026-05-04 — Theme C (Mobile-first NBA refactor +
sport-aware MobileBottomNav) takes the next big chunk.
