#!/bin/bash
# Runs the staff photo sync with the local venv, appending to sync.log.
# Invoked by the launchd schedule (local.acappella.staffsync) and runnable by hand.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "----- $(date '+%Y-%m-%d %H:%M:%S') -----" >> "$DIR/sync.log"
"$DIR/.venv/bin/python" "$DIR/sync.py" >> "$DIR/sync.log" 2>&1
