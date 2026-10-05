# Operations runbook

BSBox runs on Cloudflare: one Worker with Workers Static Assets (SPA and docs), D1 for aggregates and one Durable Object per live session. Owner-only setup steps are listed in `.plans/bsbox-v2/manual-steps.md` (M2 to M5).

## Deploy

1. Merge to `main`. The deploy workflow (`.github/workflows/deploy.yml`) deploys staging, applies D1 migrations and runs the e2e smoke test against staging.
2. Approve the promotion in GitHub. The workflow deploys production.
3. Manual deploy, if needed: `pnpm build`, then `wrangler d1 migrations apply DB --env <env>` and `wrangler deploy --env <env>` from `apps/worker`.
4. Verify `https://<domain>/api/health` returns 200.

## Rollback

1. List versions: `wrangler deployments list --env production`.
2. Roll back: `wrangler rollback --env production` (optionally with a version id).
3. D1 migrations are forward-only. Ship a corrective migration instead of reverting schema.
4. Verify `/api/health` and join a test session.

## Secrets

- `TOKEN_HMAC_KEY` signs participant tokens. Set per environment: `wrangler secret put TOKEN_HMAC_KEY --env <env>`. Rotating it invalidates live participant tokens; rotate between meetings.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are GitHub secrets used by the deploy workflow.
- Never commit secrets or print them in logs.

## Domain

The domain's DNS lives in Cloudflare and routes to the Worker through the custom domain route in `wrangler.jsonc`. The AppSource listing needs a stable URL, so do not change the domain after submission.

## Data retention

A daily cron deletes D1 rows older than 30 days. Durable Objects are purged 24 hours after finalize.
