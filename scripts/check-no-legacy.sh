#!/usr/bin/env bash
# Fails if v1 paths or words reappear. Usage: check-no-legacy.sh [root-dir]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${1:-$(dirname "$SCRIPT_DIR")}"
REPO="$(dirname "$SCRIPT_DIR")"
status=0

for p in backend frontend deployment .cursor; do
  if [ -e "$ROOT/$p" ]; then
    echo "FAIL: banned legacy path present: $p" >&2
    status=1
  fi
done

for f in README.md CLAUDE.md; do
  if [ -f "$ROOT/$f" ] && grep -n -i -E 'Litestar|Chakra|Docker|fingerprint|Postgres' "$ROOT/$f" >&2; then
    echo "FAIL: banned legacy word in $f" >&2
    status=1
  fi
done

if git -C "$REPO" rev-parse -q --verify refs/tags/legacy-v1 >/dev/null; then
  echo "ok: tag legacy-v1 exists locally"
else
  echo "FAIL: tag legacy-v1 missing locally" >&2
  status=1
fi
if git -C "$REPO" ls-remote --exit-code --tags origin legacy-v1 >/dev/null 2>&1; then
  echo "ok: tag legacy-v1 exists on origin"
else
  echo "FAIL: tag legacy-v1 missing on origin" >&2
  status=1
fi

exit $status
