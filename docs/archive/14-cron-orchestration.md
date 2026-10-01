# Content Engine — Cron Orchestration (Phase 1 ship #14)

The content engine produces articles automatically on a schedule via
GitHub Actions. This doc explains how it works, how to enable each
cadence, and what to do when it breaks.

## Architecture

```
GitHub Actions cron  →  python -m content_engine.scripts.discover <mode>
                         │
                         ├─ queries data source (API-Football / ESPN / jolpica)
                         ├─ filters out articles already on disk (idempotent)
                         ├─ for each candidate: invokes the existing CLI
                         │  (preview / recap / standings / nba-recap / f1-recap / tennis-rankings)
                         │  which runs the full gate pipeline
                         │  (polish → banned-phrase → voice-lint → plagiarism)
                         └─ commits the new public/content/{type}/{slug}.json files

                         ↓ git push

                         Vercel rebuild → prerender → deploy
                         ↓
                         Articles ARE in /content/index.json + the
                         manual-review queue at /editor.
                         Editor approves → article public.
```

Per **Phase 1 doctrine** (CLAUDE.md non-negotiable rule #8 + locked
decision § 8): **no auto-publish in Phase 1.** Cron generates drafts;
manual review still required. Phase 2 (Ship #15) flips per-sport
`auto_publish` flags for stable sports.

## The seven discovery modes

Run via `python -m content_engine.scripts.discover <mode>`:

| Mode | What it does | When to schedule |
|---|---|---|
| `football-previews` | EPL + Liga 1 fixtures with kickoff in T-18h to T-48h | Daily 06:00 UTC |
| `football-recaps` | EPL + Liga 1 fixtures finished in last 6h | Every 30 min Sat/Sun 12:00-23:00 UTC |
| `nba-previews` | NBA games tipping off in next 12h | Daily 00:00 + 04:00 UTC |
| `nba-recaps` | NBA games finished in last 6h | Every 30 min 02:00-08:00 UTC |
| `f1-weekend` | Next upcoming race (preview) + last completed race (recap) | Thursday 12:00 UTC + Sunday 18:00 UTC |
| `tennis-rankings` | Weekly ATP + WTA rankings explainers | Monday 06:00 UTC |
| `weekly-standings` | EPL + Liga 1 standings + tennis rankings | Monday 09:00 UTC |
| `all` | Everything — manual back-fill / smoke-test only | Never (manual only) |

Idempotency: each mode skips slugs already on disk. Safe to run twice
in a row — second run is a no-op.

## Required GitHub repo secrets

Set in repo Settings → Secrets and variables → Actions:

| Secret | Purpose | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sonnet 4.6 + Haiku 4.5 calls | YES |
| `SUPABASE_URL` | https://egzacjfbmgbcwhtvqixc.supabase.co | YES |
| `SUPABASE_ANON_KEY` | For prerender-time Supabase reads | YES |
| `SUPABASE_SERVICE_ROLE_KEY` | (future use — auto-publish in Ship #15) | recommended |
| `API_FOOTBALL_KEY` | Direct API-Football access | OPTIONAL — empty falls back to Vercel proxy |

Once a secret is set, the workflow's `env:` block automatically threads
it through to the Python process.

## Enabling a cadence

The workflow ships with all `schedule:` blocks **commented out**.
Each is wired but inactive until you flip it.

**To enable a cadence:**

1. Open `.github/workflows/content-cron.yml`
2. Uncomment the relevant `cron: '...'` line
3. Push to main
4. GitHub Actions starts firing on that schedule

**Recommended enable order:**

1. **Tennis rankings (Monday)** first — lowest risk, weekly cadence,
   only ATP+WTA. If voice or data is broken, max harm is two articles.
2. **Weekly standings (Monday)** — once you've confirmed cron + commit
   + redeploy works end-to-end via #1.
3. **Football previews (daily)** — adds 5-10 articles per day during
   gameweek windows, idempotent so misses are recoverable.
4. **F1 weekend (Thursday + Sunday)** — twice-weekly, low volume.
5. **NBA + football recaps** — these are the "T+15min" polling
   patterns that fire frequently (every 30 min during match windows).
   Only enable when the editor team is comfortable triaging the queue
   live.

## Manual back-fill / smoke-test

From the GitHub Actions UI:

1. Go to **Actions → Content Engine — Cron**
2. Click **Run workflow**
3. Pick a mode from the dropdown
4. Click **Run workflow**

The job runs once, generates whatever the mode finds, commits + pushes.
This is the primary way to verify a mode works before scheduling it.

## Local development workflow

You can run the discovery script locally too:

```bash
cd packages/content-engine
set -a; source .env; set +a    # load ANTHROPIC_API_KEY etc.
python -m content_engine.scripts.discover tennis-rankings
```

This generates + writes JSON files locally; you'd commit + push manually.
Useful for testing prompt changes without burning a GitHub Actions run.

## Cost guardrails

CLAUDE.md non-negotiable rule #11 ("Cost cap is enforced") is honored
via the existing `daily_token_budget_usd` in `config.py`. The budget
gate fires PER AGENT — football-preview cron and football-recap cron
share a budget cap, but football-preview and tennis-rankings have
separate caps.

Today (Phase 1) the budget gate is a Phase-0 stub (returns without
checking). Wire it in Phase 1 ship #15 when auto-publish lands.

Approximate per-cadence costs at expected volumes:

| Cadence | Articles/day | Cost/article | Daily cost |
|---|---|---|---|
| Football previews (T-24h) | ~3-5 | $0.012-0.020 (warm cache) | ~$0.06-0.10 |
| Football recaps (T+15min) | ~3-5 | $0.015-0.025 | ~$0.08-0.13 |
| NBA previews + recaps | ~6-10 (playoffs only) | $0.012-0.020 | ~$0.10-0.20 |
| F1 weekend | 1 preview + 1 recap | $0.010-0.020 each | ~$0.04 (only race weekends) |
| Tennis rankings | 2/week | $0.001-0.003 (Haiku) | ~$0.001/day amortized |
| Weekly standings | 4/week (EPL + Liga 1 + ATP + WTA) | $0.001-0.003 | ~$0.002/day |

**Daily peak**: ~$0.50/day during a busy weekend covering all 5 sports.
**Monthly**: ~$15/month. Well under the $5/agent/day budget cap.

## When the cron breaks

Go to GitHub Actions → Content Engine — Cron → click the failed run.
Common breakage patterns + fixes:

* **`Could not resolve authentication method`** — `ANTHROPIC_API_KEY`
  secret is missing or wrong. Reset it in repo Settings → Secrets.
* **`HTTP 429 / rate limited`** — API-Football pro plan exhausted.
  Pause cron temporarily, contact API-Football. The proxy fallback
  (set `API_FOOTBALL_KEY` to empty) routes through Vercel which has
  its own quota.
* **`Banned-phrase gate failed`** — model output a banned phrase
  (em-dash, semicolon, blacklist match). Polish should have caught
  most of these; if it didn't, surface the body in the workflow log
  and add the new pattern to `prompts/banned-phrases.txt`.
* **`Plagiarism gate failed`** — the cron tried to regenerate an
  article that's nearly identical to one already on disk. Most often
  this is the discovery script not skipping correctly — verify the
  slug deduplication logic in `discover.py`.
* **No commit at the end** — discovery found nothing new in the
  window. Check the "No new content" log line; this is normal between
  match days.

## Future ships

* **Ship #15** — Per-sport `auto_publish` flag. Cron writes both the
  JSON file AND a Supabase publish row simultaneously, so articles
  go public immediately instead of waiting for editor.
* **Ship #16+** — Persistent per-league state (current gameweek
  number, last completed race round) in Supabase so the discovery
  script doesn't need heuristic gameweek scans.
* **Ship #16+** — NBA + F1 + Tennis-specific rule-based fact-checks
  (verify pts/reb/ast cited match input for NBA; verify finishing
  positions cited match input for F1; verify ranks cited match input
  for tennis).
