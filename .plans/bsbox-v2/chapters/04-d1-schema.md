---
name: "Chapter 4 — D1 schema"
overview: "Drizzle schema, migrations and a repository layer for series, sessions and session minutes, plus retention queries."
todos:
  - id: g1
    content: "Schema and migration"
    status: pending
  - id: g2
    content: "Repos test-first"
    status: pending
  - id: g3
    content: "Retention"
    status: pending
  - id: g4
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 4 — D1 schema

**Repo:** `bsbox` · **Branch:** `feat/v2-d1` · **Status:** planned
**Depends on:** [3](03-shared-domain.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

Durable registry and results storage exactly as in [architecture §6.1](../00-architecture.md), behind repositories so no route or DO touches SQL directly.

## Design decisions

- Drizzle schema `apps/worker/src/db/schema.ts` for `series`, `sessions`, `session_minutes`; generated SQL migration under `apps/worker/migrations/`.
- Repositories in `apps/worker/src/repos/`: `seriesRepo` (create, getByCode, getByExternalKey, update), `sessionsRepo` (upsertScheduled, finalize, listBySeries with cursor, getById), `minutesRepo` (insertMany, listBySession), `retentionRepo` (deleteExpired).
- Tests run against local D1 via `@cloudflare/vitest-pool-workers` with migrations applied.
- Timestamps are epoch seconds (UTC). No PII columns.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/worker/src/db/schema.ts`, `migrations/0001_init.sql` | worker | New |
| `apps/worker/src/repos/*.ts` (+ tests) | worker | New |
| `apps/worker/wrangler.jsonc` (D1 binding, local only) | worker | New |
| `apps/worker/vitest.config.ts` | worker | New |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | `seriesRepo.create` then `getByCode` returns the row; `getByExternalKey` returns the same series |
| **Happy** | `sessionsRepo.finalize` stores score/level and `minutesRepo.insertMany` rows; `listBySeries` returns newest first with a working cursor |
| **Negative** | Creating two series with the same `external_key` rejects with a typed `Conflict` error |
| **Negative** | `retentionRepo.deleteExpired(now)` deletes only rows past `expires_at` and cascades their sessions and minutes; a live series remains |

## Green

1. Schema and migration.
2. Repos test-first.
3. Retention.
4. `./ci.sh`.

## Refactor gate

`grep -rn "\.prepare(\|env.DB" apps/worker/src --include=*.ts | grep -v repos/ | grep -v test` prints nothing. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-d1
```

Commit message: `feat(worker): D1 schema, migrations and repositories`
