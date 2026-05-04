/**
 * Generation planner — converts natural-language editor requests
 * into a list of content-engine CLI commands.
 *
 * Phase 2 ship #30A. The user types "Generate previews for tomorrow's
 * NBA playoff games" in /editor, this module:
 *   1. Calls Haiku 4.5 to parse the intent into a structured plan
 *   2. Looks up specific game/team/driver/player IDs from the right
 *      data source (ESPN / API-Football proxy / jolpica)
 *   3. Returns a list of CLI commands the editor can copy + run
 *      locally (or, future Ship #30B, dispatch via GitHub Actions)
 *
 * Implementation note: raw fetch to Anthropic API instead of the
 * SDK to keep package.json lean. ANTHROPIC_API_KEY is already in
 * Vercel env (used by the prerender pipeline elsewhere).
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// API-Football league IDs (matches packages/content-engine/.../api_football.py)
const LEAGUE_AF_ID = { epl: 39, 'liga-1-id': 274 };
const LEAGUE_SEASON = { epl: 2025, 'liga-1-id': 2025 };

// ── Haiku intent parser ──────────────────────────────────────────────────

const INTENT_SYSTEM_PROMPT = `You are an intent parser for the Gibol Bahasa-Indonesia sports content engine. The user wants to generate articles. Parse their request into a structured plan; the backend will then look up specific IDs and build CLI commands.

Available CLI commands (the user request maps to ONE of these):
- nba-preview     (one upcoming NBA game, takes ESPN game_id)
- nba-recap       (one finished NBA game, takes ESPN game_id)
- nba-team-profile (one of 30 NBA teams, takes ESPN team_id)
- nba-player-profile (one NBA player, takes ESPN athlete_id)
- nba-series      (NBA playoff series state, takes any game_id from the series)
- preview         (one upcoming football fixture, takes API-Football fixture_id; --league=epl or liga-1-id)
- recap           (one finished football fixture, takes fixture_id)
- standings       (weekly football standings, takes --league + --gameweek)
- football-team-profile (one football club, takes --league + team_id)
- f1-preview      (one upcoming F1 race, takes --season + --round)
- f1-recap        (one finished F1 race, takes --season + --round)
- f1-championship (F1 standings explainer after a round)
- f1-driver-profile (one F1 driver, takes jolpica driver_id like 'max_verstappen')
- tennis-rankings (weekly ATP or WTA rankings explainer, takes --tour=atp|wta)
- tennis-player-profile (one tennis player, takes ESPN athlete_id + --tour)
- h2h             (head-to-head between two football clubs, takes --team-a + --team-b + --league)

Output ONLY this JSON shape, raw, no markdown fences, no preamble:

{
  "command": "<one of the commands above, or null if request is unclear>",
  "sport": "nba" | "epl" | "liga-1-id" | "f1" | "tennis" | null,
  "intent": {
    "date_filter": "today" | "tomorrow" | "yesterday" | "this_week" | null,
    "specific_date": "YYYY-MM-DD" or null,
    "round": <int> or null,
    "gameweek": <int> or null,
    "season": <int> or null,
    "team_name": "<string>" or null,
    "team_a_name": "<string>" or null,
    "team_b_name": "<string>" or null,
    "player_name": "<string>" or null,
    "tournament": "<string>" or null,
    "tour": "atp" | "wta" | null,
    "competition_filter": "playoff" | "regular_season" | null
  },
  "limit": <int 1-30; how many articles max to plan; default 10>,
  "explanation": "<one sentence summarizing what you parsed>"
}

If the user's request is ambiguous, contradictory, or asks for something outside the available commands, set command=null and put a helpful clarification in explanation.

Examples:

User: "Generate previews for tomorrow's NBA playoff games"
{"command":"nba-preview","sport":"nba","intent":{"date_filter":"tomorrow","competition_filter":"playoff"},"limit":10,"explanation":"NBA playoff game previews for tomorrow"}

User: "Recap the Lakers' last game"
{"command":"nba-recap","sport":"nba","intent":{"team_name":"Los Angeles Lakers","date_filter":"yesterday"},"limit":1,"explanation":"Most recent finished Lakers game"}

User: "EPL gameweek 36 previews"
{"command":"preview","sport":"epl","intent":{"gameweek":36},"limit":10,"explanation":"EPL preview articles for gameweek 36"}

User: "F1 race recap for round 5"
{"command":"f1-recap","sport":"f1","intent":{"round":5,"season":2026},"limit":1,"explanation":"F1 race recap for 2026 round 5"}

User: "Tennis profile for Sinner"
{"command":"tennis-player-profile","sport":"tennis","intent":{"player_name":"Jannik Sinner","tour":"atp"},"limit":1,"explanation":"Tennis player profile for Jannik Sinner"}

User: "Generate stuff"
{"command":null,"sport":null,"intent":{},"limit":0,"explanation":"Request is too vague. Try: 'previews for tomorrow's NBA games', 'EPL gameweek 36 previews', 'F1 round 5 recap', 'profile for Persib Bandung', etc."}
`;

async function haikuParseIntent(userPrompt, todayIso) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const userMsg = `Today's date: ${todayIso}\n\nUser request:\n${userPrompt}`;

  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 600,
      system: INTENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Anthropic API ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text = (data.content && data.content[0] && data.content[0].text) || '';

  // Extract the JSON. Haiku occasionally wraps in fences despite the
  // system prompt; defensive parse.
  let candidate = text.trim();
  const fence = candidate.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fence) candidate = fence[1];
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < 0) {
    throw new Error(`Haiku output not parseable JSON: ${text.slice(0, 200)}`);
  }
  candidate = candidate.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (e) {
    throw new Error(`Haiku JSON parse failed: ${e.message}; raw: ${text.slice(0, 200)}`);
  }
}

// ── Date helpers ─────────────────────────────────────────────────────────

function _resolveDate(filter, specific) {
  if (specific && /^\d{4}-\d{2}-\d{2}$/.test(specific)) return specific;
  const now = new Date();
  if (filter === 'today') return now.toISOString().slice(0, 10);
  if (filter === 'tomorrow') {
    const t = new Date(now); t.setUTCDate(t.getUTCDate() + 1);
    return t.toISOString().slice(0, 10);
  }
  if (filter === 'yesterday') {
    const t = new Date(now); t.setUTCDate(t.getUTCDate() - 1);
    return t.toISOString().slice(0, 10);
  }
  return null;
}

function _yyyymmdd(iso) { return iso.replace(/-/g, ''); }

// ── Resolvers ────────────────────────────────────────────────────────────

async function resolveNbaGamesByDate(dateIso) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${_yyyymmdd(dateIso)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`ESPN NBA scoreboard ${resp.status}`);
  const data = await resp.json();
  const events = data.events || [];
  return events.map((e) => {
    const comp = (e.competitions && e.competitions[0]) || {};
    const status = (comp.status && comp.status.type) || {};
    const competitors = comp.competitors || [];
    const home = competitors.find((c) => c.homeAway === 'home') || {};
    const away = competitors.find((c) => c.homeAway === 'away') || {};
    return {
      game_id: e.id,
      label: `${(away.team || {}).abbreviation || '?'} @ ${(home.team || {}).abbreviation || '?'}`,
      status: status.state, // 'pre' | 'in' | 'post'
      date: e.date,
    };
  });
}

async function resolveNbaTeamId(name) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  const teams = (((data.sports || [])[0] || {}).leagues || [])
    .flatMap((l) => l.teams || [])
    .map((t) => t.team || {});
  const lower = (name || '').toLowerCase();
  // Prefer exact match on displayName, fall back to substring match.
  let hit = teams.find((t) => (t.displayName || '').toLowerCase() === lower);
  if (!hit) hit = teams.find((t) => (t.displayName || '').toLowerCase().includes(lower));
  if (!hit) hit = teams.find((t) => (t.name || '').toLowerCase().includes(lower));
  if (!hit) hit = teams.find((t) => (t.abbreviation || '').toLowerCase() === lower);
  return hit ? { id: hit.id, name: hit.displayName, abbr: hit.abbreviation } : null;
}

async function resolveFootballFixturesByGameweek(league, gameweek) {
  const cfg = LEAGUE_AF_ID[league];
  if (!cfg) return [];
  const params = new URLSearchParams({
    league: String(cfg),
    season: String(LEAGUE_SEASON[league]),
    round: `Regular Season - ${gameweek}`,
  });
  const url = `https://www.gibol.co/api/proxy/api-football/fixtures?${params}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`API-Football proxy ${resp.status}`);
  const data = await resp.json();
  return (data.response || []).map((f) => ({
    fixture_id: (f.fixture || {}).id,
    label: `${(f.teams || {}).home?.name} vs ${(f.teams || {}).away?.name}`,
    date: (f.fixture || {}).date,
    status: ((f.fixture || {}).status || {}).short,
  }));
}

async function resolveFootballTeamId(league, name) {
  const cfg = LEAGUE_AF_ID[league];
  if (!cfg) return null;
  const url = `https://www.gibol.co/api/proxy/api-football/teams?league=${cfg}&season=${LEAGUE_SEASON[league]}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  const teams = (data.response || []).map((r) => r.team || {});
  const lower = (name || '').toLowerCase();
  let hit = teams.find((t) => (t.name || '').toLowerCase() === lower);
  if (!hit) hit = teams.find((t) => (t.name || '').toLowerCase().includes(lower));
  return hit ? { id: hit.id, name: hit.name } : null;
}

// ── Plan builder ─────────────────────────────────────────────────────────

function buildCommand(cliName, args) {
  const parts = [`python -m content_engine.cli ${cliName}`];
  for (const [k, v] of Object.entries(args || {})) {
    parts.push(`--${k} ${v}`);
  }
  parts.push('--write');
  return parts.join(' ');
}

/**
 * Public entry. Returns:
 *   { ok, intent, items: [{label, command}, ...], notes }
 * or:
 *   { ok: false, message }
 */
export async function planGeneration({ prompt, todayIso }) {
  if (!prompt || prompt.trim().length < 5) {
    return { ok: false, message: 'Prompt is too short (min 5 chars).' };
  }
  let intent;
  try {
    intent = await haikuParseIntent(prompt, todayIso || new Date().toISOString().slice(0, 10));
  } catch (e) {
    return { ok: false, message: `Intent parser failed: ${e.message}` };
  }

  if (!intent.command) {
    return {
      ok: false,
      message: intent.explanation || 'Could not determine a command from your request.',
      intent,
    };
  }

  const items = [];
  const notes = [];
  const limit = Math.min(Math.max(intent.limit || 1, 1), 30);

  try {
    if (intent.command === 'nba-preview' || intent.command === 'nba-recap') {
      const dateIso = _resolveDate(intent.intent?.date_filter, intent.intent?.specific_date);
      if (!dateIso) {
        return { ok: false, message: 'NBA preview/recap needs a date filter (today/tomorrow/yesterday or specific date).', intent };
      }
      const games = await resolveNbaGamesByDate(dateIso);
      const wantPre = intent.command === 'nba-preview';
      const filtered = games.filter((g) => wantPre ? g.status !== 'post' : g.status === 'post').slice(0, limit);
      for (const g of filtered) {
        items.push({
          label: `${g.label}  (${g.status}, ${g.date})`,
          command: buildCommand(intent.command, { 'game-id': g.game_id }),
        });
      }
      if (!filtered.length) {
        notes.push(`ESPN scoreboard for ${dateIso} returned ${games.length} games but none matched the ${wantPre ? 'upcoming' : 'finished'} filter.`);
      }
    } else if (intent.command === 'nba-team-profile') {
      const team = await resolveNbaTeamId(intent.intent?.team_name);
      if (!team) {
        return { ok: false, message: `Couldn't find an NBA team named "${intent.intent?.team_name}".`, intent };
      }
      items.push({
        label: `${team.name} (${team.abbr})`,
        command: buildCommand('nba-team-profile', { 'team-id': team.id }),
      });
    } else if (intent.command === 'preview' || intent.command === 'recap') {
      // Football preview/recap. Need either gameweek (returns N fixtures) or specific match by team_name + date.
      const league = intent.sport === 'liga-1-id' ? 'liga-1-id' : 'epl';
      if (intent.intent?.gameweek != null) {
        const fixtures = await resolveFootballFixturesByGameweek(league, intent.intent.gameweek);
        const wantPre = intent.command === 'preview';
        const filtered = fixtures
          .filter((f) => wantPre ? f.status !== 'FT' : f.status === 'FT')
          .slice(0, limit);
        for (const f of filtered) {
          items.push({
            label: `${f.label}  (${f.status}, ${f.date.slice(0, 10)})`,
            command: buildCommand(intent.command, { 'fixture-id': f.fixture_id }),
          });
        }
        if (!filtered.length) {
          notes.push(`Gameweek ${intent.intent.gameweek} returned ${fixtures.length} fixtures, none matched the ${wantPre ? 'upcoming' : 'finished'} filter.`);
        }
      } else {
        return { ok: false, message: 'Football preview/recap currently needs a gameweek number. Try "EPL gameweek 36 previews".', intent };
      }
    } else if (intent.command === 'standings') {
      const league = intent.sport === 'liga-1-id' ? 'liga-1-id' : 'epl';
      const gw = intent.intent?.gameweek;
      if (gw == null) {
        return { ok: false, message: 'Standings needs a gameweek number.', intent };
      }
      items.push({
        label: `${league.toUpperCase()} standings after gameweek ${gw}`,
        command: buildCommand('standings', { league, gameweek: gw }),
      });
    } else if (intent.command === 'football-team-profile') {
      const league = intent.sport === 'liga-1-id' ? 'liga-1-id' : 'epl';
      const team = await resolveFootballTeamId(league, intent.intent?.team_name);
      if (!team) {
        return { ok: false, message: `Couldn't find a ${league} team named "${intent.intent?.team_name}".`, intent };
      }
      items.push({
        label: `${team.name} (${league})`,
        command: buildCommand('football-team-profile', { league, 'team-id': team.id }),
      });
    } else if (intent.command === 'f1-preview' || intent.command === 'f1-recap' || intent.command === 'f1-championship') {
      const season = intent.intent?.season || 2026;
      const round = intent.intent?.round;
      if (round == null) {
        return { ok: false, message: 'F1 commands need a round number.', intent };
      }
      items.push({
        label: `F1 ${intent.command.replace('f1-', '')} for ${season} round ${round}`,
        command: buildCommand(intent.command, { season, round }),
      });
    } else if (intent.command === 'f1-driver-profile') {
      const name = (intent.intent?.player_name || '').toLowerCase().trim();
      // Convert "Max Verstappen" → "max_verstappen" (jolpica driverId convention)
      const driverId = name.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (!driverId) {
        return { ok: false, message: 'F1 driver profile needs a driver name.', intent };
      }
      items.push({
        label: `F1 driver profile: ${intent.intent?.player_name}`,
        command: buildCommand('f1-driver-profile', { 'driver-id': driverId, season: intent.intent?.season || 2026 }),
      });
      notes.push(`Driver ID inferred as "${driverId}". If the CLI fails, the actual jolpica id may differ — check https://api.jolpi.ca/ergast/f1/2026/drivers.json.`);
    } else if (intent.command === 'tennis-rankings') {
      const tour = intent.intent?.tour || 'atp';
      items.push({
        label: `Tennis ${tour.toUpperCase()} rankings`,
        command: buildCommand('tennis-rankings', { tour }),
      });
    } else if (intent.command === 'tennis-player-profile') {
      // Tennis player ID lookup is more involved (ESPN core API). For
      // v1 we hand back an unresolved CLI hint with the player name;
      // editor fills in the athlete-id manually after looking up via
      // /api/proxy/espn/tennis/{tour}/rankings or the bulk script.
      const name = intent.intent?.player_name;
      const tour = intent.intent?.tour || 'atp';
      items.push({
        label: `Tennis player profile: ${name} (${tour.toUpperCase()})`,
        command: `python -m content_engine.cli tennis-player-profile --athlete-id <LOOKUP> --tour ${tour} --write  # find athlete-id via /api/proxy/espn/tennis/${tour}/rankings`,
      });
      notes.push('Tennis player ID lookup is manual in v1 — find athlete-id from the rankings response.');
    } else {
      return { ok: false, message: `Command "${intent.command}" is recognized but not yet supported in v1 plan generation.`, intent };
    }
  } catch (e) {
    return { ok: false, message: `Resolver failed: ${e.message}`, intent };
  }

  return {
    ok: true,
    intent,
    items,
    notes,
    instructions: items.length
      ? 'Copy the commands below and run from packages/content-engine/ with .venv activated and ANTHROPIC_API_KEY in env. Each generates a single article (~$0.04). After running, redeploy with npx vercel --prod.'
      : 'No items resolved. Check the notes for context.',
  };
}
