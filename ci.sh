#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
scripts/test-check-no-legacy.sh
scripts/check-no-legacy.sh
scripts/test-check-wrangler-config.sh
node scripts/check-wrangler-config.mjs
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
node scripts/stage-assets.mjs
(cd apps/worker && pnpm exec wrangler deploy --dry-run --env staging --outdir .wrangler/dry-staging)
(cd apps/worker && pnpm exec wrangler deploy --dry-run --env production --outdir .wrangler/dry-production)
