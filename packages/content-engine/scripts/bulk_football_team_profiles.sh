#!/usr/bin/env bash
# Bulk-generate football team profiles for all teams in a league.
#
# Phase 2 ship #24. Idempotent — skips teams whose profile JSON
# already exists. Discovers team IDs from API-Football's standings
# endpoint so no manual ID list is needed.
#
# Usage:
#   bash scripts/bulk_football_team_profiles.sh epl
#   bash scripts/bulk_football_team_profiles.sh liga-1-id

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a; source .env; set +a
fi

LEAGUE="${1:-epl}"
case "$LEAGUE" in
  epl) AF_LEAGUE=39 ;;
  liga-1-id) AF_LEAGUE=274 ;;
  *) echo "Unknown league: $LEAGUE (expected epl|liga-1-id)" >&2; exit 1 ;;
esac

CONTENT_DIR="../../public/content/team"
mkdir -p "$CONTENT_DIR"

# Pull standings → extract team_id + slug pairs.
TEAM_DATA=$(curl -sL "https://www.gibol.co/api/proxy/api-football/standings?league=${AF_LEAGUE}&season=2025" \
  | python3 -c "
import sys, json, re
d = json.load(sys.stdin)
table = (((d.get('response') or [{}])[0].get('league') or {}).get('standings') or [])[0] or []
for r in table:
    t = r.get('team') or {}
    name = (t.get('name') or '').strip()
    if not name: continue
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    print(f\"{t.get('id')}|{slug}|{name}\")
")

if [ -z "$TEAM_DATA" ]; then
  echo "✗ Could not discover ${LEAGUE} teams from standings"; exit 2
fi

DONE=0; SKIPPED=0; FAILED=0
START=$(date +%s)
COUNT=$(echo "$TEAM_DATA" | wc -l | tr -d ' ')

echo "▶ Bulk ${LEAGUE} team profile generation — ${COUNT} teams"

while IFS='|' read -r tid slug name; do
  outfile="${CONTENT_DIR}/${LEAGUE}-${slug}.json"
  if [ -f "$outfile" ]; then
    echo "  ⊘ skip ${name} (already exists)"
    SKIPPED=$((SKIPPED + 1)); continue
  fi
  echo "  ▶ ${name} (team_id=${tid})"
  if ./.venv/bin/python -m content_engine.cli football-team-profile \
       --league "$LEAGUE" --team-id "$tid" --write 2>&1 | tail -3; then
    DONE=$((DONE + 1))
  else
    echo "  ✗ FAILED ${name}"
    FAILED=$((FAILED + 1))
  fi
done <<< "$TEAM_DATA"

ELAPSED=$(( $(date +%s) - START ))
echo
echo "✓ Done in ${ELAPSED}s. Generated ${DONE}, skipped ${SKIPPED}, failed ${FAILED}."
