#!/usr/bin/env bash
# Bulk-generate NBA player profiles for the top scorers across the league.
#
# Phase 2 ship #24. Discovers top scorers via ESPN's stats leaders
# endpoint, takes the top N (default 12) by PPG, idempotent.

set -euo pipefail

cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; source .env; set +a; fi

TOP_N="${1:-12}"
CONTENT_DIR="../../public/content/team"
mkdir -p "$CONTENT_DIR"

# ESPN stats endpoint — top scorers (PPG leaders) for current season.
PLAYER_DATA=$(curl -sL "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?category=offensive&sort=avgPoints&pageSize=${TOP_N}" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
ath = (d.get('athletes') or [])
for a in ath:
    aid = (a.get('athlete') or {}).get('id')
    name = (a.get('athlete') or {}).get('displayName')
    if aid and name:
        print(f'{aid}|{name}')
")

# Fallback if the byathlete endpoint changes shape: hardcode marquee names.
if [ -z "$PLAYER_DATA" ]; then
  echo "  (byathlete endpoint empty — using marquee fallback list)"
  PLAYER_DATA=$(cat <<'EOF'
4066648|Shai Gilgeous-Alexander
3112335|Nikola Jokic
4066261|Luka Doncic
4066336|Jayson Tatum
3917376|Jaylen Brown
3032977|Giannis Antetokounmpo
6606|LeBron James
6580|Stephen Curry
3992|Kevin Durant
4395630|Anthony Edwards
4278073|Donovan Mitchell
3934672|Devin Booker
EOF
  )
fi

DONE=0; SKIPPED=0; FAILED=0
START=$(date +%s)
COUNT=$(echo "$PLAYER_DATA" | wc -l | tr -d ' ')

echo "▶ Bulk NBA top-${TOP_N} player profile generation — ${COUNT} players"

while IFS='|' read -r aid name; do
  slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//g')
  outfile="${CONTENT_DIR}/pemain-nba-${slug}.json"
  if [ -f "$outfile" ]; then
    echo "  ⊘ skip ${name}"; SKIPPED=$((SKIPPED + 1)); continue
  fi
  echo "  ▶ ${name} (athlete_id=${aid})"
  if ./.venv/bin/python -m content_engine.cli nba-player-profile \
       --athlete-id "$aid" --write 2>&1 | tail -3; then
    DONE=$((DONE + 1))
  else
    echo "  ✗ FAILED ${name}"; FAILED=$((FAILED + 1))
  fi
done <<< "$PLAYER_DATA"

ELAPSED=$(( $(date +%s) - START ))
echo
echo "✓ Done in ${ELAPSED}s. Generated ${DONE}, skipped ${SKIPPED}, failed ${FAILED}."
