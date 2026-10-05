#!/usr/bin/env bash
# Starts a fresh local Worker for e2e: empty D1/DO state, test clock enabled. Local only.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE="$ROOT/.e2e-state"
PORT="${E2E_API_PORT:-8788}"
rm -rf "$STATE"
cd "$ROOT/apps/worker"
pnpm exec wrangler d1 migrations apply bsbox-local --local --persist-to "$STATE" >/dev/null
exec pnpm exec wrangler dev --port "$PORT" --persist-to "$STATE" \
  --var ENVIRONMENT:test --var TOKEN_HMAC_KEY:e2e-only-secret
