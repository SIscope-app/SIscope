#!/usr/bin/env bash
# Fetch Arena, Epoch AI, OpenRouter prices, and the Open Agent Leaderboard, then build,
# deploy the siscope worker, check the live site, and commit the snapshot.
#
# data/publish.json last_success_at is the public "last successful update" time.
# It is written into the build only when a deploy is requested, and it is committed
# only after that deploy's live checks pass. A failure restores the previous time,
# does not commit, and rolls back a deploy that did not pass the checks.
#
# Usage: npm run data:refresh [-- --no-deploy] [-- --no-commit]
# Logs: ../logs when that directory is writable, otherwise ./logs (gitignored).
set -o pipefail

SITE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLISH_FILE="${PUBLISH_FILE:-$SITE/data/publish.json}"
# 3 MiB, matching the Cloudflare Workers compressed script limit.
WORKER_GZIP_LIMIT_KIB=3072
LIVE_PATHS=(/ /leaderboard /compare /agents /methodology /api/v0/models.json /sitemap.xml /robots.txt /opengraph-image)

commit_allowed() {
  local deploy="$1" verified="$2" kept="$3"
  if [ "$deploy" = 1 ]; then
    if [ "$verified" != 1 ] || [ "$kept" != 1 ]; then
      return 1
    fi
  fi
  return 0
}

backup_publish() {
  PUBLISH_BACKUP="$(mktemp)"
  cp "$PUBLISH_FILE" "$PUBLISH_BACKUP"
}

stamp_publish() {
  PUBLISH_FILE="$PUBLISH_FILE" python3 - <<'PY'
import json, os, sys
from pathlib import Path
sys.path.insert(0, "data-pipeline")
from common import now_iso
p = Path(os.environ["PUBLISH_FILE"])
doc = json.loads(p.read_text())
if "last_success_at" not in doc:
    raise SystemExit("publish.json is missing last_success_at")
stamped = now_iso()
p.write_text(json.dumps({"last_success_at": stamped}, indent=2) + "\n")
print(stamped)
PY
}

restore_publish() {
  if [ -z "${PUBLISH_BACKUP:-}" ] || [ ! -f "$PUBLISH_BACKUP" ]; then
    echo "No publish.json backup, so the success time file was left as it is."
    return 1
  fi
  cp "$PUBLISH_BACKUP" "$PUBLISH_FILE"
  echo "Restored publish.json. The public success time was not advanced."
}

is_transient_status() {
  case "$1" in
    000|408|429|500|502|503|504|520|521|522|523|524) return 0 ;;
    *) return 1 ;;
  esac
}

require_ci_secrets() {
  if [ "${GITHUB_ACTIONS:-}" != "true" ]; then
    return 0
  fi
  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
    echo "Refusing to deploy. Set repository secrets CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID."
    echo "No deployment was attempted. The live worker is unchanged."
    return 1
  fi
  python3 - <<'PY'
import json, os, re, sys
from pathlib import Path
text = re.sub(r"^\s*//.*$", "", Path("wrangler.jsonc").read_text(), flags=re.M)
cfg = json.loads(text)["account_id"].strip()
got = os.environ["CLOUDFLARE_ACCOUNT_ID"].strip()
if got != cfg:
    print("CLOUDFLARE_ACCOUNT_ID does not match account_id in wrangler.jsonc. Refusing to deploy.")
    sys.exit(1)
PY
}

assert_worker_size() {
  # Compile only. This does not upload or switch traffic.
  local out status
  set +e
  out="$(npx wrangler deploy --dry-run 2>&1)"
  status=$?
  set -e
  printf '%s\n' "$out"
  if [ "$status" != 0 ]; then
    echo "Wrangler dry-run failed. Refusing to deploy."
    return 1
  fi
  printf '%s\n' "$out" | WORKER_GZIP_LIMIT_KIB="$WORKER_GZIP_LIMIT_KIB" python3 -c '
import os, re, sys
text = sys.stdin.read()
m = re.search(r"gzip:\s*([0-9.]+)\s*KiB", text)
if not m:
    raise SystemExit("Could not read the worker gzip size from wrangler dry-run. Refusing to deploy.")
kib = float(m.group(1))
limit = float(os.environ["WORKER_GZIP_LIMIT_KIB"])
print(f"worker gzip: {kib:.2f} KiB (limit {limit:.0f} KiB)")
if kib >= limit:
    raise SystemExit("Refusing to deploy: worker gzip is over the 3 MiB Cloudflare script limit.")
'
}

capture_prev_version() {
  PREV_VERSION=""
  local json status
  set +e
  json="$(npx wrangler deployments status --json 2>/dev/null)"
  status=$?
  set -e
  if [ "$status" != 0 ] || [ -z "$json" ]; then
    echo "Could not read the current deployment. A failed live check will use wrangler rollback's previous stable version."
    return 0
  fi
  PREV_VERSION="$(python3 -c '
import json, sys
try:
    doc = json.loads(sys.stdin.read())
except Exception:
    raise SystemExit(0)
found = []
def walk(o):
    if isinstance(o, dict):
        vid = o.get("version_id") or o.get("versionId")
        if vid and o.get("percentage") == 100:
            found.append(vid)
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)
walk(doc)
print(found[0] if found else "")
' <<<"$json" || true)"
  if [ -n "$PREV_VERSION" ]; then
    echo "Recorded the current worker version for rollback."
  else
    echo "No current full-traffic version id found. A failed live check will use wrangler rollback's previous stable version."
  fi
}

deploy_worker() {
  local attempt log status
  for attempt in 1 2 3; do
    log="$(mktemp)"
    set +e
    npx opennextjs-cloudflare deploy 2>&1 | tee "$log"
    status="${PIPESTATUS[0]}"
    set -e
    if [ "$status" = 0 ]; then
      rm -f "$log"
      return 0
    fi
    if grep -Eiq 'authentication|unauthorized|not permitted|exceeded the size|too large|quota' "$log"; then
      echo "Deploy failed with a non-transient error. Not retrying."
      rm -f "$log"
      return 1
    fi
    rm -f "$log"
    if [ "$attempt" -lt 3 ]; then
      echo "Deploy attempt ${attempt}/3 failed. Retrying a transient failure in $((attempt * 15))s."
      sleep $((attempt * 15))
    fi
  done
  return 1
}

# HTTP 200 on the public pages. The success time is the header "Updated {Chicago date}"
# linking to #sources. It is not a full-width banner, and this check does not scrape that text.
verify_live() {
  local bust="$1" fail=0 p attempt code url
  for p in "${LIVE_PATHS[@]}"; do
    code=""
    for attempt in 1 2 3; do
      url="https://siscope.app${p}?r=${bust}-${attempt}"
      code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 30 "$url" || true)"
      [ -n "$code" ] || code="000"
      if [ "$code" = "200" ]; then
        break
      fi
      if is_transient_status "$code" && [ "$attempt" -lt 3 ]; then
        echo "  ${code}  ${p} (attempt ${attempt}/3, retrying)"
        sleep $((attempt * 5))
        continue
      fi
      break
    done
    echo "  ${code}  ${p}"
    if [ "$code" != "200" ]; then
      fail=1
    fi
  done
  [ "$fail" = 0 ]
}

rollback_deploy() {
  echo "Live checks failed. Restoring the last good deployment of worker siscope."
  if [ -n "${PREV_VERSION:-}" ]; then
    npx wrangler rollback "$PREV_VERSION" --yes --message "SIscope live checks failed; restore last good deployment"
  else
    npx wrangler rollback --yes --message "SIscope live checks failed; restore last good deployment"
  fi
}

commit_snapshot() {
  if [ "$COMMIT" != 1 ]; then
    echo "Commit skipped (--no-commit)."
    return 0
  fi
  if ! commit_allowed "$DEPLOY" "${VERIFY_OK:-0}" "${STAMP_KEPT:-0}"; then
    echo "Refusing to commit. The live checks did not pass, so the success time stays at the last good snapshot."
    return 1
  fi
  if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  fi
  git add -- data
  local bad
  bad="$(git diff --cached --name-only | grep -v '^data/' || true)"
  if [ -n "$bad" ]; then
    echo "Refusing to commit paths outside data/:"
    printf '%s\n' "$bad"
    git restore --staged -- data >/dev/null 2>&1 || git reset -q -- data || true
    return 1
  fi
  if git diff --cached --quiet; then
    echo "No data changes to commit."
    return 0
  fi
  git commit -m "Data snapshot $(date -u +%Y-%m-%d) [skip ci]"
  echo "Committed data snapshot."
  if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
    if ! git push origin "HEAD:${GITHUB_REF_NAME}"; then
      echo "The verified deployment is live, but pushing the data snapshot failed."
      echo "The public success time on the site matches this deploy. Git does not have the snapshot yet."
      return 1
    fi
  fi
}

report_failure() {
  local step="$1"
  echo
  echo "FAILED during: ${step}"
  if [ "${VERIFY_OK:-0}" = 1 ]; then
    echo "Deploy and the live checks passed. The snapshot commit or push did not."
    echo "The public success time on the site matches this deploy. Git may not have the snapshot yet."
  else
    echo "The public last-successful-update time was not committed."
    echo "No data snapshot was committed."
  fi
  if [ "${VERIFY_OK:-0}" = 1 ]; then
    :
  elif [ "${ROLLED_BACK:-0}" = 1 ]; then
    echo "Rolled back to the previous deployment."
  elif [ "${DEPLOYED:-0}" = 1 ]; then
    echo "A deployment was uploaded and the live checks failed. Rollback did not complete."
    echo "The live worker may be the unverified deploy and needs a manual rollback."
  else
    echo "No new deployment was published. The live site is unchanged."
  fi
  if [ -n "${LOG:-}" ]; then
    echo "Log: ${LOG}"
  fi
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    {
      echo "### SIscope data refresh failed"
      echo
      echo "- Failed during: ${step}"
      echo "- Public success time advanced: no"
      echo "- Snapshot committed: no"
      if [ "${VERIFY_OK:-0}" = 1 ]; then
        echo "- Live deployment: verified. Snapshot git push or commit failed."
      elif [ "${ROLLED_BACK:-0}" = 1 ]; then
        echo "- Rollback: restored the previous deployment"
      elif [ "${DEPLOYED:-0}" = 1 ]; then
        echo "- Rollback: failed. The live worker may be the unverified deploy."
      else
        echo "- Live deployment: unchanged"
      fi
    } >> "$GITHUB_STEP_SUMMARY"
  fi
}

print_success() {
  echo
  echo "Done in $(( $(date +%s) - START ))s."
  python3 - <<'PY'
import json
from pathlib import Path
pub = json.loads(Path("data/publish.json").read_text())
src = json.loads(Path("data/sources.json").read_text())
print(f"Last successful update: {pub['last_success_at']}")
print("Source data-as-of dates (these are not the success time):")
for s in src["sources"]:
    print(f"  {s['id']}: as of {s['as_of']} (fetched {s['fetched_at']})")
PY
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    {
      echo "### SIscope data refresh succeeded"
      echo
      echo "Live checks passed, so this deployment advances the public success time."
    } >> "$GITHUB_STEP_SUMMARY"
  fi
}

die() {
  FAIL_STEP="$1"
  exit 1
}

on_exit() {
  local code=$?
  if [ "${STAMPED:-0}" = 1 ] && [ "${STAMP_KEPT:-0}" != 1 ]; then
    restore_publish || true
  fi
  if [ "$code" != 0 ]; then
    report_failure "${FAIL_STEP:-refresh}"
  fi
}

main() {
  local DEPLOY=1 COMMIT=1 arg
  for arg in "$@"; do
    case "$arg" in
      --no-deploy) DEPLOY=0 ;;
      --no-commit) COMMIT=0 ;;
      *) echo "Unknown argument: $arg" >&2; exit 2 ;;
    esac
  done

  if [ -x "$HOME/.local/node22/bin/node" ]; then
    export PATH="$HOME/.local/node22/bin:$PATH"
  fi
  export WRANGLER_SEND_METRICS=false

  cd "$SITE"
  local prefer="$SITE/../logs"
  if mkdir -p "$prefer" 2>/dev/null && [ -w "$prefer" ]; then
    LOGDIR="$prefer"
  else
    LOGDIR="$SITE/logs"
    mkdir -p "$LOGDIR"
  fi
  LOG="$LOGDIR/data-refresh-$(date -u +%Y%m%d-%H%M%S).log"
  exec > >(tee -a "$LOG") 2>&1

  set -euo pipefail
  START="$(date +%s)"
  STAMPED=0
  STAMP_KEPT=0
  DEPLOYED=0
  VERIFY_OK=0
  ROLLED_BACK=0
  FAIL_STEP=""
  trap on_exit EXIT

  echo "SIscope data refresh. Deploy=${DEPLOY} Commit=${COMMIT}"
  echo "The public success time advances only after deploy and the live checks pass."

  if [ "$DEPLOY" = 1 ]; then
    require_ci_secrets || die "Cloudflare secrets"
  fi

  echo
  echo "== $(date -u '+%H:%M:%S UTC') 1/5 Fetching Arena, Epoch AI, OpenRouter prices, Open Agent Leaderboard"
  SISCOPE_CACHE_H=0 bash data-pipeline/run_all.sh || die "fetch"

  echo
  echo "== $(date -u '+%H:%M:%S UTC') 2/5 Summary versus the last committed snapshot"
  python3 scripts/data-summary.py | tee "$LOGDIR/last-summary.txt" || die "summary"

  echo
  echo "== $(date -u '+%H:%M:%S UTC') 3/5 Lint, OpenNext build, typecheck"
  npm run -s lint || die "lint"
  if [ "$DEPLOY" = 1 ]; then
    backup_publish
    echo "Stamping the success time into this build."
    stamp_publish || die "stamp success time"
    STAMPED=1
  else
    echo "Not stamping the success time (--no-deploy)."
  fi
  # OpenNext build must finish before any wrangler deploy.
  npx opennextjs-cloudflare build || die "OpenNext build"
  if [ "$DEPLOY" = 1 ]; then
    assert_worker_size || die "worker size"
  fi
  npm run -s typecheck || die "typecheck"

  if [ "$DEPLOY" = 1 ]; then
    echo
    echo "== $(date -u '+%H:%M:%S UTC') 4/5 Deploying worker siscope"
    capture_prev_version
    if ! deploy_worker; then
      die "deploy"
    fi
    DEPLOYED=1
    echo
    echo "== $(date -u '+%H:%M:%S UTC') 5/5 Checking https://siscope.app"
    if ! verify_live "$START"; then
      if rollback_deploy; then
        ROLLED_BACK=1
      fi
      die "live checks"
    fi
    VERIFY_OK=1
    STAMP_KEPT=1
  else
    echo
    echo "== $(date -u '+%H:%M:%S UTC') 4/5 Skipped deploy (--no-deploy)"
  fi

  commit_snapshot || die "snapshot commit"
  print_success
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
