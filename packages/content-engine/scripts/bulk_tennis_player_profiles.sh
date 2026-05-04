#!/usr/bin/env bash
# Bulk-generate tennis player profiles for top-N from a tour's rankings.
#
# Phase 2 ship #24. Discovers athlete IDs from ESPN rankings.
# Idempotent. Top 20 by default to avoid blowing the cost budget.

set -euo pipefail

cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; source .env; set +a; fi

TOUR="${1:-atp}"
TOP_N="${2:-20}"
CONTENT_DIR="../../public/content/team"
mkdir -p "$CONTENT_DIR"

PLAYER_DATA=$(curl -sL "https://site.api.espn.com/apis/site/v2/sports/tennis/${TOUR}/rankings" \
  | python3 -c "
import sys, json
top_n = ${TOP_N}
d = json.load(sys.stdin)
ranks = (d.get('rankings') or [])
if not ranks: sys.exit(0)
rows = (ranks[0] or {}).get('ranks') or []
for r in rows[:top_n]:
    ath = r.get('athlete') or {}
    aid = ath.get('id')
    name = ath.get('displayName') or f\"{ath.get('firstName','')} {ath.get('lastName','')}\".strip()
    if aid: print(f'{aid}|{name}')
")

if [ -z "$PLAYER_DATA" ]; then
  echo "✗ Could not discover ${TOUR} players"; exit 2
fi

DONE=0; SKIPPED=0; FAILED=0
START=$(date +%s)
COUNT=$(echo "$PLAYER_DATA" | wc -l | tr -d ' ')

TOUR_UP=$(echo "$TOUR" | tr '[:lower:]' '[:upper:]')
echo "▶ Bulk ${TOUR_UP} top-${TOP_N} player profile generation — ${COUNT} players"

while IFS='|' read -r aid name; do
  slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//g')
  outfile="${CONTENT_DIR}/tennis-${slug}.json"
  if [ -f "$outfile" ]; then
    echo "  ⊘ skip ${name}"; SKIPPED=$((SKIPPED + 1)); continue
  fi
  echo "  ▶ ${name} (athlete_id=${aid})"
  if ./.venv/bin/python -m content_engine.cli tennis-player-profile \
       --athlete-id "$aid" --tour "$TOUR" --write 2>&1 | tail -3; then
    DONE=$((DONE + 1))
  else
    echo "  ✗ FAILED ${name}"; FAILED=$((FAILED + 1))
  fi
done <<< "$PLAYER_DATA"

ELAPSED=$(( $(date +%s) - START ))
echo
echo "✓ Done in ${ELAPSED}s. Generated ${DONE}, skipped ${SKIPPED}, failed ${FAILED}."
