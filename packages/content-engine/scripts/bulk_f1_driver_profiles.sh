#!/usr/bin/env bash
# Bulk-generate F1 driver profiles for all drivers in current standings.
#
# Phase 2 ship #24. Discovers driver IDs from jolpica's
# driverStandings endpoint. Idempotent.

set -euo pipefail

cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; source .env; set +a; fi

SEASON="${1:-2026}"
CONTENT_DIR="../../public/content/team"
mkdir -p "$CONTENT_DIR"

DRIVER_DATA=$(curl -sL "https://api.jolpi.ca/ergast/f1/${SEASON}/driverStandings.json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
lists = (((d.get('MRData') or {}).get('StandingsTable') or {}).get('StandingsLists') or [])
if not lists: sys.exit(0)
rows = (lists[0] or {}).get('DriverStandings') or []
for r in rows:
    drv = r.get('Driver') or {}
    did = drv.get('driverId')
    name = f\"{drv.get('givenName','')} {drv.get('familyName','')}\".strip()
    if did: print(f'{did}|{name}')
")

if [ -z "$DRIVER_DATA" ]; then
  echo "✗ Could not discover F1 drivers"; exit 2
fi

DONE=0; SKIPPED=0; FAILED=0
START=$(date +%s)

echo "▶ Bulk F1 driver profile generation (season ${SEASON})"

while IFS='|' read -r did name; do
  # Slug pattern matches f1_driver_profile_slug() — slugify the name.
  slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//g')
  outfile="${CONTENT_DIR}/f1-${slug}.json"
  if [ -f "$outfile" ]; then
    echo "  ⊘ skip ${name}"; SKIPPED=$((SKIPPED + 1)); continue
  fi
  echo "  ▶ ${name} (id=${did})"
  if ./.venv/bin/python -m content_engine.cli f1-driver-profile \
       --driver-id "$did" --season "$SEASON" --write 2>&1 | tail -3; then
    DONE=$((DONE + 1))
  else
    echo "  ✗ FAILED ${name}"; FAILED=$((FAILED + 1))
  fi
done <<< "$DRIVER_DATA"

ELAPSED=$(( $(date +%s) - START ))
echo
echo "✓ Done in ${ELAPSED}s. Generated ${DONE}, skipped ${SKIPPED}, failed ${FAILED}."
