#!/usr/bin/env bash
# One bad source must not replace the last good file, and a good fetch must.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export SITE_ROOT="$ROOT"
export SISCOPE_SOURCE_RETRY_S=0
# shellcheck disable=SC1091
source "$ROOT/scripts/source-refresh.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }

tmp="$(mktemp -d)"
good="$tmp/arena.json"
printf '%s\n' '{"boards":{"text":{"overall":{"rows":[{"name":"A"}]}}}}' > "$good"
kept="$(cat "$good")"

# A failing command leaves the previous file in place.
if refresh_one arena "$good" bash -c 'echo fail >&2; exit 1'; then
  fail "a failing fetch should not count as updated"
fi
[ "$(cat "$good")" = "$kept" ] || fail "a failing fetch replaced the last good snapshot"

# Broken JSON is restored.
if refresh_one arena "$good" bash -c "printf '%s\n' 'not-json' > '$good'"; then
  fail "broken JSON should not count as updated"
fi
[ "$(cat "$good")" = "$kept" ] || fail "broken JSON replaced the last good snapshot"

# An empty shape is restored.
if refresh_one arena "$good" bash -c "printf '%s\n' '{\"boards\":{}}' > '$good'"; then
  fail "an empty arena file should not count as updated"
fi
[ "$(cat "$good")" = "$kept" ] || fail "an empty arena file replaced the last good snapshot"

# A good file is kept, and the other source is untouched.
other="$tmp/epoch.json"
printf '%s\n' '{"results":[1],"benchmarks":{"a":{}}}' > "$other"
other_kept="$(cat "$other")"
if ! refresh_one arena "$good" bash -c "printf '%s\n' '{\"boards\":{\"text\":{\"overall\":{\"rows\":[{\"name\":\"B\"}]}}}}' > '$good'"; then
  fail "a good fetch should be kept"
fi
grep -q '"B"' "$good" || fail "the good fetch was not written"
[ "$(cat "$other")" = "$other_kept" ] || fail "a good arena fetch changed the epoch file"

# Retries stop after three failures. SISCOPE_SOURCE_RETRY_S=0 makes the waits instant.
count="$tmp/count"
: > "$count"
if refresh_one epoch "$other" bash -c "echo x >> '$count'; exit 1"; then
  fail "three failures should still restore"
fi
[ "$(wc -l < "$count" | tr -d ' ')" = "3" ] || fail "expected 3 attempts, got $(wc -l < "$count")"
[ "$(cat "$other")" = "$other_kept" ] || fail "retries overwrote the last good epoch file"

echo "source isolation passed"
