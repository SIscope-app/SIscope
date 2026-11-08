#!/usr/bin/env bash
# Guards for the refresh script. Does not fetch, build, or deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/data-refresh.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }

if ! commit_allowed 1 1 1; then fail "a verified deploy should be allowed to commit"; fi
if commit_allowed 1 0 0; then fail "an unverified deploy must not commit"; fi
if commit_allowed 1 1 0; then fail "a deploy whose success stamp was not kept must not commit"; fi
if commit_allowed 1 0 1; then fail "a failed live check must not commit"; fi
if ! commit_allowed 0 0 0; then fail "a local no-deploy run may still commit fetched data"; fi

tmp="$(mktemp -d)"
export PUBLISH_FILE="$tmp/publish.json"
printf '%s\n' '{ "last_success_at": "2026-11-05T12:01:21Z" }' > "$PUBLISH_FILE"
orig="$(cat "$PUBLISH_FILE")"
(
  cd "$ROOT"
  export PUBLISH_FILE SISCOPE_RETRY_SLEEP_S=0
  backup_publish
  stamp_publish >/dev/null
  [ "$(cat "$PUBLISH_FILE")" != "$orig" ] || exit 2
  restore_publish >/dev/null
  [ "$(cat "$PUBLISH_FILE")" = "$orig" ] || exit 3
) || fail "stamp/restore did not put the previous success time back"

repo="$(mktemp -d)"
git -C "$repo" init -q
git -C "$repo" config user.email "test@example.com"
git -C "$repo" config user.name "test"
mkdir -p "$repo/data"
printf '%s\n' '{"last_success_at":"2026-11-05T12:01:21Z"}' > "$repo/data/publish.json"
echo base > "$repo/data/note.txt"
git -C "$repo" add data
git -C "$repo" commit -qm "base"
echo dirty > "$repo/data/note.txt"
set +e
(
  cd "$repo"
  DEPLOY=1
  VERIFY_OK=0
  STAMP_KEPT=0
  COMMIT=1
  commit_snapshot
)
status=$?
set -e
[ "$status" = 1 ] || fail "commit_snapshot should refuse an unverified deploy (got ${status})"
[ "$(git -C "$repo" rev-list --count HEAD)" = 1 ] || fail "refused commit still created a snapshot"
[ -z "$(git -C "$repo" diff --cached --name-only)" ] || fail "refused commit left files staged"

echo "data-refresh guards passed"
