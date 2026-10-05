---
name: "Chapter 7 — Session lifecycle"
overview: "Alarms for phases, coalesced ticks, finalize into D1 with an embedded `ended` result, purge, and the daily retention cron."
todos:
  - id: g1
    content: "Pure computation in `finalize.ts` first, then alarm scheduling, then cron"
    status: pending
  - id: g2
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 7 — Session lifecycle

**Repo:** `bsbox` · **Branch:** `feat/v2-do-lifecycle` · **Status:** planned
**Depends on:** [6](06-session-do-core.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

A session moves `scheduled → live → ended` on its own and its result is computed once by `packages/shared` scoring ([D4](../gaps-and-decisions.md), [D9](../gaps-and-decisions.md)).

## Design decisions

- Single alarm re-armed to the next of: start, next tick (≤ 5 s while live and dirty), end, purge (end + 24 h).
- `phase{state,at}` broadcast at start and end. `tick` is sent only when a vote or presence change happened since the last tick.
- At end: build per-minute `{present, engaged}` from DO state, call `rawScore`/`finalScore`/`level`, compute peak concurrency and participation rate, write `sessions` + `session_minutes` to D1 in one batch, broadcast `ended{result}` atomically, close sockets 1000.
- Finalize is idempotent (a second alarm or a restart must not double-write). Late joiners after end receive `phase ended` plus `ended{result}` immediately.
- Cron Trigger (daily) calls `retentionRepo.deleteExpired`.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/worker/src/do/alarm.ts`, `ticks.ts`, `finalize.ts` (+ tests) | do | New |
| `apps/worker/src/do/SessionRoom.ts` | do | Edit |
| `apps/worker/src/cron.ts`, `wrangler.jsonc` (cron) | worker | New |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | With a fake clock: start alarm broadcasts `phase live`; votes cause one coalesced `tick`; end alarm writes D1 rows and broadcasts `ended` whose score equals `finalScore` of the recorded minutes |
| **Happy** | A client joining after the end gets `ended{result}` with the same numbers |
| **Negative** | Running finalize twice leaves exactly one set of `session_minutes` rows and the same score |
| **Negative** | A session with zero participants finalizes with `score 0, level low, peak 0` without division by zero; no tick is sent when nothing changed |

## Green

1. Pure computation in `finalize.ts` first, then alarm scheduling, then cron.
2. `./ci.sh`.

## Refactor gate

`grep -rn "Math.log2\|0\.8" apps/worker/src` prints nothing (scoring constants only in `packages/shared`). Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-do-lifecycle
```

Commit message: `feat(worker): session alarms, ticks, finalize and retention cron`
