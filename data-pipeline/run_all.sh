#!/usr/bin/env bash
# Refresh every source and rebuild the site data.
# One source can fail. That source keeps its last good file. The others still ship.
set -u
cd "$(dirname "$0")/.."
SITE_ROOT="$(pwd)"
# shellcheck disable=SC1091
source "$SITE_ROOT/scripts/source-refresh.sh"

failed=()
refresh_one arena "$SITE_ROOT/data/arena.json" python3 "$SITE_ROOT/data-pipeline/fetch_arena.py" || failed+=("arena")
refresh_one epoch "$SITE_ROOT/data/epoch.json" python3 "$SITE_ROOT/data-pipeline/fetch_epoch.py" || failed+=("epoch")
refresh_one openrouter "$SITE_ROOT/data/prices.json" python3 "$SITE_ROOT/data-pipeline/fetch_openrouter.py" || failed+=("openrouter")
refresh_one exgentic "$SITE_ROOT/data/agents_exgentic.json" python3 "$SITE_ROOT/data-pipeline/fetch_agents.py" || failed+=("exgentic")

if [ "${#failed[@]}" -gt 0 ]; then
  echo "These sources kept their last good snapshot: ${failed[*]}"
fi

python3 "$SITE_ROOT/data-pipeline/build.py"
