# Phase 2 — Auto-publish for stable sports (Ship #15)

When a sport's voice has stabilized, you can flip it to auto-publish.
Cron-generated articles for that sport go public **immediately**
on the next page load — no manual review needed. Flagship matches
still always require editor approval, regardless of this setting.

## Doctrine recap

Per CLAUDE.md non-negotiable rules #8 + #10 + locked decision § 8:

* **Phase 1 default**: every article = `manual_review:true`. Editor
  must approve via `/editor` before public.
* **Phase 2 (per-sport)**: when a sport hits stable criteria
  (≥100 approved articles, lint score avg ≥85, editor approval rate
  ≥80%), the sport graduates and the cron auto-publishes its non-
  flagship articles.
* **Flagship articles always need manual review** — even after a
  sport graduates. List lives in
  `packages/content-engine/src/content_engine/quality/flagship.py`.

## How auto-publish works

```
content engine generates article (existing pipeline)
  ↓
JSON file written to public/content/{type}/{slug}.json
  ↓
auto_publish.maybe_publish() runs three checks:
  1. Is sport_id in AUTO_PUBLISH_SPORTS env var?
  2. Is article flagship per quality/flagship.py?
  3. Is SUPABASE_SERVICE_ROLE_KEY available?
  ↓
If (1) AND NOT (2) AND (3):
  → write ce_article_publishes row directly via service-role
  → article publicly visible on next page load
Else:
  → leave as manual_review draft → editor approves via /editor
```

## How to graduate a sport to auto-publish

### Step 1: Confirm stability

Run a quick check in Supabase SQL editor:

```sql
SELECT
  CASE
    WHEN slug LIKE '%-grand-prix-%' THEN 'f1'
    WHEN slug LIKE 'ranking-atp-%' OR slug LIKE 'ranking-wta-%' THEN 'tennis'
    WHEN slug LIKE 'epl-%' THEN 'epl-standings'
    WHEN slug LIKE 'liga-1-id-%' THEN 'liga-1-id-standings'
    WHEN slug LIKE '%-at-%' THEN 'nba'
    ELSE 'football-fixtures'
  END AS sport_bucket,
  count(*) AS approved_articles
FROM public.ce_article_publishes
GROUP BY sport_bucket
ORDER BY approved_articles DESC;
```

A sport's `approved_articles >= 100` is one of the criteria.

For the other two (lint score avg + editor approval rate) you'd
inspect `/editor` qualitatively — the dashboard shows score per
article. **Phase 2b** (future ship) adds a stability-metrics view.

### Step 2: Set the allowlist env var

**On Vercel (for the SPA + serverless API)**:

```bash
npx vercel env add AUTO_PUBLISH_SPORTS production
# Enter: tennis
# (or comma-separated: tennis,liga-1-id,f1)
```

**On GitHub Actions (for the cron jobs)**:

Add `AUTO_PUBLISH_SPORTS` as a repository secret with the same value.
The cron workflow's `env:` block needs an extra line to thread it
through; update `.github/workflows/content-cron.yml`:

```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  ...
  AUTO_PUBLISH_SPORTS: ${{ secrets.AUTO_PUBLISH_SPORTS }}
```

### Step 3: Verify

Run the discovery script for the graduated sport:

```bash
cd packages/content-engine
AUTO_PUBLISH_SPORTS=tennis python -m content_engine.scripts.discover tennis-rankings
```

Output should include `✓ Auto-published: auto-published (sport=tennis, non-flagship)`
for each new article.

Inspect the publish ledger:

```sql
SELECT slug, type, approver_email, published_at
FROM public.ce_article_publishes
WHERE approver_email = 'auto-publish@gibol.co'
ORDER BY published_at DESC
LIMIT 10;
```

Auto-published rows have `approver_email = 'auto-publish@gibol.co'`
so they're filterable from manual approvals.

## Recommended graduation order

1. **Tennis rankings (Haiku 4.5, templated)** — first to graduate.
   Lowest variance, simplest rules, never flagship.
2. **EPL + Liga 1 standings (Haiku 4.5, templated)** — same shape.
3. **F1 race recaps + previews** — once you've seen 50+ recaps and
   the championship-state framing is consistent.
4. **EPL fixture previews** — auto-publish for non-derby fixtures;
   derbies stay manual via the flagship list.
5. **EPL fixture recaps** — last to graduate. Most variance, biggest
   risk. Flagship list is most important here.
6. **NBA + Liga 1 fixture content** — last; similar shape to EPL but
   smaller editorial track record at time of writing.

## Flagship rules (current)

The list is **explicit only** in this ship — Phase 2b adds dynamic
rules (table position, championship implications). For now:

| Sport | Flagship | Examples |
|---|---|---|
| EPL | derbies + big-6 vs big-6 | Arsenal-Tottenham, Liverpool-MU, MU-City, Liverpool-Everton, Chelsea-Arsenal, Liverpool-City, Arsenal-City, Liverpool-Arsenal, Chelsea-Liverpool, MU-Arsenal, MU-Chelsea, Chelsea-Tottenham |
| Liga 1 | El Clasico Indonesia + JATIM derby + Sumatra/Sulawesi-Java | Persija-Persib, Persebaya-Arema, PSM-Persib |
| NBA | Conference Finals + NBA Finals + Game 7 + storied-team elimination | Any "Conference Final" or "NBA Finals" series; series tied 3-3 (Game 7 imminent); LAL/GSW/BOS/MIA/NYK in elimination |
| F1 | iconic tracks + season opener/finale | Monaco, Monza, Silverstone, Spa, Abu Dhabi, Brazilian, Suzuka; Round 1; Round 22+ |
| Tennis | (Phase 1 ship #15 has rankings only — never flagship) | (no match recaps yet) |

To add a new flagship case: edit
`packages/content-engine/src/content_engine/quality/flagship.py`
and the next cron run will pick it up.

## Rollback

If auto-publish is misbehaving for a sport, instantly disable:

1. **Vercel + GitHub Actions**: clear `AUTO_PUBLISH_SPORTS` secret,
   or remove the offending sport from the comma list.
2. New articles immediately go back to manual-review queue.
3. **Already-published rogue articles**: delete their rows from
   `ce_article_publishes` via SQL editor:

```sql
DELETE FROM public.ce_article_publishes
WHERE slug = 'the-bad-article-slug' AND type = 'recap';
```

The article instantly disappears from public (next page load) +
will not appear in the next prerender's sitemap.

## What this ship does NOT include

* **Stability metrics dashboard** at `/editor` — Phase 2b. Today
  the editor uses qualitative judgment to decide when to graduate.
* **Dynamic flagship rules** (top-4-vs-top-4, championship math) —
  Phase 2c. Today flagship is explicit-only.
* **Per-sport budget caps** in auto-publish — Phase 2d. Today the
  per-agent daily-budget gate (config.py `daily_token_budget_usd`)
  applies across all auto-published content.
* **Auto-unpublish on flag-raised editor feedback** — never; manual
  unpublish via SQL is the safest path.

## Cost note

Auto-publish itself is free — it just writes a Supabase row. The
generation cost is unchanged. Auto-publish does mean MORE articles go
public faster (no editor delay), so monthly cost may rise slightly
because cron-generated articles that previously sat in the queue
unread now drive Vercel/Supabase traffic immediately.
