# Operations runbook

BSBox runs on Cloudflare: one Worker with Workers Static Assets (SPA and docs), D1 for aggregates and one Durable Object per live session. Owner-only setup steps are listed in `.plans/bsbox-v2/manual-steps.md` (M2 to M5).

## Deploy

1. Merge to `main`. The deploy workflow (`.github/workflows/deploy.yml`) builds, applies D1 migrations, deploys staging and smoke-tests `https://$STAGING_HOST/api/health`. It never runs for pull requests or the loop branch, and it skips every job (without failing) while `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` is unset.
2. Approve the promotion in GitHub (the `production` environment needs required reviewers). The workflow deploys production and smoke-tests `$PRODUCTION_HOST`.
3. Manual deploy, if needed, from the repo root: `pnpm build`, `node scripts/stage-assets.mjs`, then in `apps/worker` run `wrangler d1 migrations apply DB --env <env> --remote` and `wrangler deploy --env <env>`.
4. Verify `https://<domain>/api/health` returns 200.
5. Dry run (part of `./ci.sh`, needs no credentials): `wrangler deploy --dry-run --env staging|production` in `apps/worker`.
6. Before the first real deploy replace the PLACEHOLDER values in `apps/worker/wrangler.jsonc` (`database_id`, route patterns) and set the GitHub variables `STAGING_HOST` and `PRODUCTION_HOST` (manual steps M2 to M5).

## Static assets and headers

The Worker is the only layer that serves the SPA and the docs. `wrangler.jsonc` sets `assets.run_worker_first: true`, so every request, including static pages, passes through the Worker, which forwards non-`/api` paths to the `ASSETS` binding (`not_found_handling: single-page-application`). The security-headers middleware (`apps/worker/src/middleware/securityHeaders.ts`) is therefore the single source of the CSP: `frame-ancestors` lists the Outlook and Teams origins on `/host/*` and is `'none'` everywhere else. There is deliberately no `_headers` file in `apps/web/public`; adding one would create a second, inconsistent policy. `scripts/stage-assets.mjs` merges `apps/docs/dist` and `apps/web/dist` into `apps/worker/.assets` before deploy.

## Observability

Workers Logs is enabled per environment. `apps/worker/src/observability.ts` is the only module allowed to call `console`; it emits one JSON line per event with `event`, `code` and `durationMs`, and redacts authorization, token and participant fields and token query values. Analytics Engine dataset `bsbox_events_<env>` (binding `EVENTS`) receives counters named `join`, `vote`, `finalize` and `error` (blob 2 is the error code).

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
