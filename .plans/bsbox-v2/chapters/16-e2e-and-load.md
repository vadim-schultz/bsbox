---
name: "Chapter 16 — E2E and load"
overview: "Playwright flows, WebSocket load test and automated accessibility checks."
todos:
  - id: g1
    content: "Test clock first"
    status: pending
  - id: g2
    content: "Playwright flows"
    status: pending
  - id: g3
    content: "axe suite"
    status: pending
  - id: g4
    content: "Load script and workflows"
    status: pending
  - id: g5
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 16 — E2E and load

**Repo:** `bsbox` · **Branch:** `feat/v2-e2e` · **Status:** planned
**Depends on:** [15](15-docs-site.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

Prove the whole stack works end to end and holds up at meeting scale (spike S5).

## Design decisions

- `e2e/` Playwright against `wrangler dev` + built SPA; flows: create series via API → two browser contexts join lobby → live vote moves chart for both → end shows the same score → reload shows result.
- A fake clock hook (`?now=` honoured only when `ENVIRONMENT=test`) lets tests compress a meeting.
- axe checks on lobby, live, result and both taskpanes in light, dark and high contrast, en and de.
- Load script (`e2e/load/ws-load.ts`): N simulated clients voting; asserts tick latency p95 and error rate thresholds locally; documents free-tier results (S5). Not part of `./ci.sh`; run via a separate manual-dispatch workflow.
- `ci.yml` gains an `e2e` job that runs Playwright on PRs.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `e2e/tests/*.spec.ts`, `playwright.config.ts` | e2e | New |
| `e2e/load/ws-load.ts` | e2e | New |
| `.github/workflows/ci.yml`, `.github/workflows/load.yml` | ci | Edit/New |
| `apps/worker/src/testClock.ts` | worker | New |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | Two participants vote and both charts reach the same engaged ratio; end screen shows identical score and level for both |
| **Happy** | axe reports zero violations on all screens in en and de, light and dark |
| **Negative** | With `ENVIRONMENT=production` the `?now=` override is ignored (test) |
| **Negative** | Load script exits non-zero when error rate exceeds the threshold (verified against a deliberately broken server) |

## Green

1. Test clock first.
2. Playwright flows.
3. axe suite.
4. Load script and workflows.
5. `./ci.sh`.

## Refactor gate

`grep -rn "now=" apps/worker/src` shows the override only inside `testClock.ts`. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-e2e
```

Commit message: `test: Playwright e2e, axe accessibility checks and WebSocket load script`
