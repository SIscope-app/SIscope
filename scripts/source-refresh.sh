#!/usr/bin/env bash
# Fetch one source without letting it take the refresh down.
# A failed or empty fetch puts the previous file back. The caller ships the rest.
set -o pipefail

# retry_cmd ATTEMPTS PAUSE_SECONDS -- command...
retry_cmd() {
  local attempts="$1" pause="$2" n=1
  shift 2
  while true; do
    if "$@"; then
      return 0
    fi
    if [ "$n" -ge "$attempts" ]; then
      return 1
    fi
    echo "fetch attempt ${n}/${attempts} failed. Retrying in $((pause * n))s."
    sleep $((pause * n))
    n=$((n + 1))
  done
}

# refresh_one NAME OUTFILE -- command...
# Returns 0 when the new file is good. Returns 1 after restoring the last good file.
refresh_one() {
  local name="$1" outfile="$2"
  shift 2
  local backup had=0
  backup="$(mktemp)"
  if [ -f "$outfile" ]; then
    cp "$outfile" "$backup"
    had=1
  fi
  local pause="${SISCOPE_SOURCE_RETRY_S:-10}"
  if retry_cmd 3 "$pause" "$@" && python3 "$SITE_ROOT/scripts/check-source.py" "$name" "$outfile"; then
    rm -f "$backup"
    echo "Updated ${name}."
    return 0
  fi
  if [ "$had" = 1 ]; then
    cp "$backup" "$outfile"
    echo "Kept the last good ${name} snapshot."
  else
    echo "No previous ${name} snapshot to keep."
  fi
  rm -f "$backup"
  return 1
}
