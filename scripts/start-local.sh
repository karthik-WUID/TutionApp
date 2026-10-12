#!/usr/bin/env bash
set -euo pipefail
SMART_TUTOR_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$SMART_TUTOR_ROOT/.local/env.sh" ]; then
  source "$SMART_TUTOR_ROOT/.local/env.sh"
fi
cd "$SMART_TUTOR_ROOT"
exec npm start
