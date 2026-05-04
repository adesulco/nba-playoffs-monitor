#!/usr/bin/env bash
# Bulk-generate NBA team profiles for all 30 ESPN NBA teams.
#
# Phase 2 ship #21 follow-up. Skips teams whose profile JSON already
# exists so the loop is idempotent — re-run after a partial failure
# without paying for already-completed work.
#
# Cost shape: ~$0.05 per profile baseline + ~$0.32 each time QC fires
# (deterministic 10% slug hash). Expected total: ~$1.50 baseline +
# ~$0.85 from 3 QC samples = ~$2.35.
#
# Usage:
#   cd packages/content-engine
#   bash scripts/bulk_nba_team_profiles.sh
#
# Requires: ANTHROPIC_API_KEY in env (source .env first), .venv set up.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a; source .env; set +a
fi

# ESPN team_id, abbreviation, slug — used for skip-existing check.
TEAMS=(
  "1:ATL:atlanta-hawks"
  "2:BOS:boston-celtics"
  "17:BKN:brooklyn-nets"
  "30:CHA:charlotte-hornets"
  "4:CHI:chicago-bulls"
  "5:CLE:cleveland-cavaliers"
  "6:DAL:dallas-mavericks"
  "7:DEN:denver-nuggets"
  "8:DET:detroit-pistons"
  "9:GS:golden-state-warriors"
  "10:HOU:houston-rockets"
  "11:IND:indiana-pacers"
  "12:LAC:la-clippers"
  "13:LAL:los-angeles-lakers"
  "29:MEM:memphis-grizzlies"
  "14:MIA:miami-heat"
  "15:MIL:milwaukee-bucks"
  "16:MIN:minnesota-timberwolves"
  "3:NO:new-orleans-pelicans"
  "18:NY:new-york-knicks"
  "25:OKC:oklahoma-city-thunder"
  "19:ORL:orlando-magic"
  "20:PHI:philadelphia-76ers"
  "21:PHX:phoenix-suns"
  "22:POR:portland-trail-blazers"
  "23:SAC:sacramento-kings"
  "24:SA:san-antonio-spurs"
  "28:TOR:toronto-raptors"
  "26:UTAH:utah-jazz"
  "27:WSH:washington-wizards"
)

CONTENT_DIR="../../public/content/team"
mkdir -p "$CONTENT_DIR"

DONE=0; SKIPPED=0; FAILED=0
START=$(date +%s)

echo "▶ Bulk NBA team profile generation — ${#TEAMS[@]} teams"

for entry in "${TEAMS[@]}"; do
  IFS=':' read -r tid abbr slug <<< "$entry"
  outfile="${CONTENT_DIR}/nba-${slug}.json"
  if [ -f "$outfile" ]; then
    echo "  ⊘ skip ${abbr} (${slug}) — already exists"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  echo "  ▶ ${abbr} (team_id=${tid}, slug=${slug})"
  if ./.venv/bin/python -m content_engine.cli nba-team-profile \
       --team-id "$tid" --write 2>&1 | tail -3; then
    DONE=$((DONE + 1))
  else
    echo "  ✗ FAILED ${abbr}"
    FAILED=$((FAILED + 1))
  fi
done

ELAPSED=$(( $(date +%s) - START ))
echo
echo "✓ Done in ${ELAPSED}s. Generated ${DONE}, skipped ${SKIPPED}, failed ${FAILED}."
