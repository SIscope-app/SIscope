#!/usr/bin/env bash
# One-shot data refresh: fetch every source, rebuild, deploy to Cloudflare, verify, and log a summary.
# Usage: npm run data:refresh [-- --no-deploy] [-- --no-commit]
# Logs: ../logs/data-refresh-YYYYMMDD-HHMM.log (outside the repo). Not scheduled; run it by hand.
set -euo pipefail
SITE="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY=1; COMMIT=1
for a in "$@"; do case $a in --no-deploy) DEPLOY=0;; --no-commit) COMMIT=0;; esac; done
export PATH="$HOME/.local/node22/bin:$PATH"   # wrangler needs Node 22+
LOGDIR="$SITE/../logs"; mkdir -p "$LOGDIR"
LOG="$LOGDIR/data-refresh-$(date +%Y%m%d-%H%M).log"
exec > >(tee -a "$LOG") 2>&1
cd "$SITE"
step() { echo; echo "== $(date '+%H:%M:%S %Z') $*"; }
START=$(date +%s)

step "1/5 Fetching sources and building data (Arena, Epoch AI, OpenRouter prices, Exgentic)"
SISCOPE_CACHE_H=0 bash data-pipeline/run_all.sh

step "2/5 Summary vs last committed data"
python3 scripts/data-summary.py | tee "$LOGDIR/last-summary.txt"

step "3/5 Lint, build (OpenNext) and typecheck"
npm run -s lint
npx opennextjs-cloudflare build   # runs next build, which also generates the route types tsc needs
npm run -s typecheck

if [ $DEPLOY = 1 ]; then
  step "4/5 Deploying worker 'siscope'"
  npx opennextjs-cloudflare deploy
  step "5/5 Verifying https://siscope.app"
  FAIL=0
  for p in / /leaderboard /compare /agents /methodology /api/v0/models.json /sitemap.xml /robots.txt /opengraph-image; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "https://siscope.app$p?r=$START")
    echo "  $code  $p"; [ "$code" = 200 ] || FAIL=1
  done
  [ $FAIL = 0 ] || { echo "Verification failed"; exit 1; }
else
  step "4/5 Skipped deploy (--no-deploy)"
fi

if [ $COMMIT = 1 ] && [ -n "$(git status --porcelain data/)" ]; then
  git add data/ && git commit -qm "Data snapshot $(date +%Y-%m-%d)" && echo "Committed data snapshot."
fi
echo; echo "Done in $(( $(date +%s) - START ))s. Log: $LOG"
