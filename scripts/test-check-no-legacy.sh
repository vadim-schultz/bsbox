#!/usr/bin/env bash
# Tests for check-no-legacy.sh (happy + negative).
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(dirname "$SCRIPT_DIR")"
CHECK="$SCRIPT_DIR/check-no-legacy.sh"
fail=0
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

expect() { # name expected-exit actual-exit
  if [ "$2" != "$3" ]; then echo "FAIL: $1 (expected $2, got $3)"; fail=1; else echo "pass: $1"; fi
}

copy() { rm -rf "$tmp/c"; mkdir "$tmp/c"; cp "$REPO/README.md" "$REPO/CLAUDE.md" "$tmp/c/"; }

"$CHECK" >/dev/null 2>&1; expect "happy: cleaned tree passes" 0 $?

copy; mkdir "$tmp/c/backend"
"$CHECK" "$tmp/c" >/dev/null 2>&1; expect "negative: backend/ recreated fails" 1 $?

copy; echo "uses Litestar" >> "$tmp/c/CLAUDE.md"
"$CHECK" "$tmp/c" >/dev/null 2>&1; expect "negative: Litestar in CLAUDE.md fails" 1 $?

exit $fail
