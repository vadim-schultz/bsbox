#!/usr/bin/env bash
# Happy: the real config passes. Negative: dropping TOKEN_HMAC_KEY from an environment fails.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
node scripts/check-wrangler-config.mjs >/dev/null
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
node -e '
const fs = require("fs");
const t = fs.readFileSync("apps/worker/wrangler.jsonc", "utf8");
fs.writeFileSync(process.argv[1], t.replace("\"secrets\": { \"required\": [\"TOKEN_HMAC_KEY\"] },", ""));
' "$tmp"
if node scripts/check-wrangler-config.mjs "$tmp" 2>/dev/null; then
  echo "FAIL: config without TOKEN_HMAC_KEY was accepted" >&2
  exit 1
fi
echo "ok: check-wrangler-config"
