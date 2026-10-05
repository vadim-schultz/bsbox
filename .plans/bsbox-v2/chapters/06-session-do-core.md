---
name: "Chapter 6 — Session DO core"
overview: "SessionRoom Durable Object with SQLite, hello/vote/ping handling, presence and hibernation."
todos:
  - id: g1
    content: "Store and handlers test-first with a fake clock"
    status: pending
  - id: g2
    content: "DO shell wiring and controller"
    status: pending
  - id: g3
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 6 — Session DO core

**Repo:** `bsbox` · **Branch:** `feat/v2-do-core` · **Status:** planned
**Depends on:** [5](05-series-api.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

One DO per session owns participants and votes ([D5](../gaps-and-decisions.md)). Connections use the WebSocket Hibernation API.

## Design decisions

- `GET /api/sessions/{id}/ws` validates the id and forwards the upgrade to `SESSION_ROOM.idFromName(id)` in the `eu` jurisdiction.
- DO SQLite schema as in [architecture §6.2](../00-architecture.md), created in the constructor with `blockConcurrencyWhile`.
- `hello{token?}`: valid token reuses the participant; otherwise a new participant and signed token are issued; replies `welcome`. Bad token yields `error{bad_token}` and closes with 4401.
- `vote{status}`: allowed only when the session is `live`; upserts `votes` for the current minute index (last tap wins) and updates `last_status`/`voted`.
- `ping` updates `last_seen_at`; presence = open socket or `last_seen_at` within 60 s.
- Message handling lives in small handler functions (one per message type) outside the DO class so each is unit-testable.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/worker/src/do/SessionRoom.ts` (class shell) | do | New |
| `apps/worker/src/do/handlers/{hello,vote,ping}.ts` (+ tests) | do | New |
| `apps/worker/src/do/store.ts` (SQL for participants/votes) | do | New |
| `apps/worker/src/controllers/sessionSocket.ts` | controllers | New |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | Two clients `hello` and receive `welcome` with distinct participant ids; a `vote engaged` during a live session is stored for the current minute |
| **Happy** | Reconnecting with the issued token returns the same participant id |
| **Negative** | `vote` before start or after end returns `error{not_live}` and stores nothing |
| **Negative** | Tampered or expired token yields `error{bad_token}`; a malformed JSON frame yields `error{bad_message}` and does not close the socket |

## Green

1. Store and handlers test-first with a fake clock.
2. DO shell wiring and controller.
3. `./ci.sh`.

## Refactor gate

`wc -l apps/worker/src/do/SessionRoom.ts` ≤ 100 and it contains no SQL strings. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-do-core
```

Commit message: `feat(worker): session Durable Object with join, vote and presence`
