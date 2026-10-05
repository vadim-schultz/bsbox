---
name: "Chapter 18 — Deploy and release"
overview: "wrangler environments, deploy workflow, custom domain, observability and rollback."
todos:
  - id: g1
    content: "Config test first, then wrangler config"
    status: pending
  - id: g2
    content: "Observability helper"
    status: pending
  - id: g3
    content: "Workflow and runbook"
    status: pending
  - id: g4
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 18 — Deploy and release

**Repo:** `bsbox` · **Branch:** `feat/v2-deploy` · **Status:** planned
**Depends on:** [17](17-appsource-compliance.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

Staging and production on Cloudflare deployed by CI; the suite ends with a verified release.

## Design decisions

- `wrangler.jsonc` with `staging` and `production` environments: D1 database ids, DO class migration, `TOKEN_HMAC_KEY` secret binding, rate-limit binding, cron, static assets from `apps/web/dist` and `apps/docs/dist`, custom domain route.
- `.github/workflows/deploy.yml`: on `main` merge deploy staging, run D1 migrations then e2e smoke against staging, then promote to production on manual approval; `wrangler rollback` documented in the runbook.
- Observability: Workers Logs enabled, structured JSON logs without PII, Analytics Engine datapoints for joins, votes, finalizations, error codes. No third-party SDK.
- Deploy dry run (`wrangler deploy --dry-run`) is part of `./ci.sh`; real deploy needs M2–M5.
- Update `docs/operations/runbook.md` with the verified commands.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/worker/wrangler.jsonc` | worker | Edit |
| .github/workflows/deploy.yml | ci | New |
| `apps/worker/src/observability.ts` (+ test) | worker | New |
| `docs/operations/runbook.md` | docs | Edit |

## Manual configuration

M2, M3, M4, M5 required for a real deploy; M11 final manual end-to-end check — see [manual-steps.md](../manual-steps.md). The implementer stops and reports if a manual step blocks a check; it never performs one.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | `wrangler deploy --dry-run --env staging` and `--env production` succeed in `./ci.sh` |
| **Happy** | Observability helper emits a structured log with code and duration and never includes a token or participant id |
| **Negative** | Dry run fails when a required binding (`TOKEN_HMAC_KEY`) is missing from an environment (checked by a config test) |
| **Negative** | Logging a request containing an `Authorization` or token query value redacts it |

## Green

1. Config test first, then wrangler config.
2. Observability helper.
3. Workflow and runbook.
4. `./ci.sh`.

## Refactor gate

`grep -rn "console.log" apps/worker/src | grep -v observability` prints nothing. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-deploy
```

Commit message: `feat(deploy): staging and production environments, deploy workflow and observability`
