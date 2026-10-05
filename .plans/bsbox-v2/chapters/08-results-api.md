---
name: "Chapter 8 — Results API"
overview: "`GET /api/sessions` (history) and `GET /api/sessions/{id}` with the result once ended."
todos:
  - id: g1
    content: "Service test-first, then controller"
    status: pending
  - id: g2
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 8 — Results API

**Repo:** `bsbox` · **Branch:** `feat/v2-results-api` · **Status:** planned
**Depends on:** [7](07-session-lifecycle.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

Everyone can read history and results ([D3](../gaps-and-decisions.md)); results survive DO purge via D1.

## Design decisions

- `GET /api/sessions?series={code}&cursor=&limit=`: newest first, `limit` ≤ 50, opaque cursor.
- `GET /api/sessions/{id}`: `{id, series, state, start, end}`; when `ended`, adds `result` read from D1 (`session_minutes` as `minutes[]`).
- Cache headers: ended results `public, max-age=300`; others `no-store`.
- Unknown session `404 session_not_found`; expired (past retention) `410 session_expired`.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/worker/src/controllers/sessions.ts` (+ test) | controllers | New |
| `apps/worker/src/services/sessionsService.ts` (+ test) | services | New |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | After a finalized session, `GET /api/sessions/{id}` returns `result` with score, level, raw, peak, participationRate and `minutes[]`; history lists it first |
| **Happy** | A live session returns no `result` and `Cache-Control: no-store` |
| **Negative** | Unknown id returns 404 problem+json; a purged-by-retention id returns 410 |
| **Negative** | `limit=500` is rejected with 422; a tampered cursor returns 422 `invalid_cursor` |

## Green

1. Service test-first, then controller.
2. `./ci.sh`.

## Refactor gate

`grep -rn "result" apps/worker/src/controllers/sessions.ts` shows mapping only, no computation. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-results-api
```

Commit message: `feat(worker): session history and results endpoints`
