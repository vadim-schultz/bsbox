---
name: "Chapter 5 — Series API"
overview: "Hono app with `/api/series` create (idempotent), get and patch, current-session resolution, edit token, rate limiting, problem+json errors."
todos:
  - id: g1
    content: "Service tests first, then controllers"
    status: pending
  - id: g2
    content: "Problem middleware and rate limit"
    status: pending
  - id: g3
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 5 — Series API

**Repo:** `bsbox` · **Branch:** `feat/v2-series-api` · **Status:** planned
**Depends on:** [4](04-d1-schema.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

The fixed API surface for series ([D11](../gaps-and-decisions.md), [architecture §7](../00-architecture.md)). Routes are not expected to change after this chapter.

## Design decisions

- Controllers expose HTTP only, delegate to `seriesService`; services depend on repos; Zod validates bodies and queries using `packages/shared` DTOs.
- `POST /api/series`: generates a code, hashes a random edit token (sha256), stores the series with `expires_at = last occurrence + 30 d` (or start + 30 d when no RRULE). `201 {code, joinUrl, editToken}`. Existing `externalKey` returns `200` with the series and **no** token.
- `GET /api/series/{code}`: returns the schedule and the current or next session via `currentOrNext`, creating the `sessions` row (`scheduled`) lazily; includes `serverTime`.
- `PATCH /api/series/{code}`: requires `X-Edit-Token`, constant-time compare against the hash.
- Rate limiting via the Workers Rate Limiting binding on `POST /api/series` (per IP). Errors are RFC 9457 problem+json with stable `code`s; no localized text server-side.
- `GET /api/health` returns `{status:'ok'}`.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/worker/src/app.ts` (`createApp`) | worker | New |
| `apps/worker/src/controllers/series.ts`, `health.ts` (+ tests) | controllers | New |
| `apps/worker/src/services/seriesService.ts`, `sessionResolver.ts` (+ tests) | services | New |
| `apps/worker/src/middleware/problem.ts`, `rateLimit.ts` | middleware | New |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | `POST /api/series` returns 201 with code, joinUrl and token; `GET /api/series/{code}` returns a `scheduled` session for a future start and `live` inside the window |
| **Happy** | Second `POST` with the same `externalKey` returns 200 with the same code and no `editToken` |
| **Negative** | `PATCH` without a token returns 401 `missing_edit_token`; with a wrong token 403 `invalid_edit_token` |
| **Negative** | Invalid body (duration 4 min, bad IANA tz, malformed RRULE) returns 422 problem+json with `code: validation_failed`; unknown code returns 404 `series_not_found`; the 11th create in a minute from one IP returns 429 |

## Green

1. Service tests first, then controllers.
2. Problem middleware and rate limit.
3. `./ci.sh`.

## Refactor gate

`grep -rn "env.DB\|repos/" apps/worker/src/controllers` prints nothing (controllers never touch data access). Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-series-api
```

Commit message: `feat(worker): series API with idempotent create and edit tokens`
