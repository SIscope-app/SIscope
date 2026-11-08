#!/usr/bin/env bash
# Refresh every source and rebuild the site data. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"
python3 fetch_arena.py
python3 fetch_epoch.py
python3 fetch_openrouter.py
python3 fetch_agents.py
python3 build.py
