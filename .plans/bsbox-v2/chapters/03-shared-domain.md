---
name: "Chapter 3 — Shared domain"
overview: "Zod schemas, WebSocket protocol types, scoring, slot/RRULE utilities, code generator and token HMAC in `packages/shared`."
todos:
  - id: g1
    content: "Write scoring tests, then `scoring.ts`"
    status: pending
  - id: g2
    content: "Protocol and DTO schemas with tests"
    status: pending
  - id: g3
    content: "Slots, code, token"
    status: pending
  - id: g4
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 3 — Shared domain

**Repo:** `bsbox` · **Branch:** `feat/v2-shared` · **Status:** planned
**Depends on:** [2](02-scaffold-ci.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

All pure domain logic lives in one dependency-light package used by the worker, web app and add-in ([D4](../gaps-and-decisions.md)). Scoring matches [architecture §3.1](../00-architecture.md) exactly.

## Design decisions

- `scoring.ts`: `minuteRatio`, `rawScore`, `boost`, `finalScore`, `level`. All inputs/outputs 0–1; constants `ALPHA=0.8`, `CAP=0.25`; level thresholds .60/.40/.20.
- `protocol.ts`: Zod schemas and inferred types for every client→server and server→client message in [architecture §7](../00-architecture.md); discriminated union on `type`.
- `dto.ts`: Zod schemas for series/session request and response bodies and the problem+json `code` enum.
- `slots.ts`: `minuteIndex(start, t)`, `occurrences(rrule, tz, from, to)` using the `rrule` library, `currentOrNext(series, now)`.
- `code.ts`: 10-char Crockford base32 generator (crypto-random) and validator. `token.ts`: `signToken`/`verifyToken` using Web Crypto HMAC-SHA256, format `base64url(pid.sessionId.exp).sig`.
- No Node-only APIs: the package must run in Workers and browsers.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `packages/shared/src/scoring.ts` (+ test) | shared | New |
| `packages/shared/src/protocol.ts`, `dto.ts` (+ tests) | shared | New |
| `packages/shared/src/slots.ts`, `code.ts`, `token.ts` (+ tests) | shared | New |
| `packages/shared/src/index.ts` | shared | Barrel |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | `finalScore(raw=.40, N=7)` equals `min(.40*(1+.8/log2(8)), .65, 1)`; `level` returns `healthy` at exactly .40 and `high` at exactly .60 |
| **Happy** | `rawScore` skips minutes with zero present and averages the rest; `occurrences` of `FREQ=WEEKLY;BYDAY=MO` in `Europe/Berlin` across a DST change keeps 10:00 local |
| **Happy** | `verifyToken(signToken(x))` round-trips; `generateCode()` is 10 chars from the Crockford alphabet |
| **Negative** | `finalScore` never exceeds 1 and never returns above `raw+0.25` (property test over raw ∈ [0,1], N ∈ [1,2000]) |
| **Negative** | A 0–100 value passed to `finalScore` throws a `RangeError` (the v1 bug cannot recur) |
| **Negative** | `verifyToken` rejects a tampered signature, an expired token and a token for another session; `protocol` rejects an unknown `type` and a vote status outside the enum |

## Green

1. Write scoring tests, then `scoring.ts`.
2. Protocol and DTO schemas with tests.
3. Slots, code, token.
4. `./ci.sh`.

## Refactor gate

`grep -rln "scoring" apps | grep -v import` shows no reimplementation of the formula outside `packages/shared`. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-shared
```

Commit message: `feat(shared): scoring, protocol, slots, code and token primitives`
