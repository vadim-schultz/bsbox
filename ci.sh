#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
scripts/test-check-no-legacy.sh
scripts/check-no-legacy.sh
echo "no workspaces yet"
