---
name: BSBox v2 — Rollout
overview: "Eighteen linear chapters: remove v1, scaffold, shared domain, D1, API, Durable Object, web app, Outlook and Teams add-ins, docs, e2e, AppSource compliance, deploy."
isProject: false
---

**Architecture:** [00-architecture.md](00-architecture.md) · **Decisions:** [gaps-and-decisions.md](gaps-and-decisions.md) · **Manual steps:** [manual-steps.md](manual-steps.md) · **Chapters:** [chapters/](chapters/) · **Ledger:** [run-ledger.md](run-ledger.md)

Chief-of-staff runs chapters via [`.claude/skills/chief-of-staff/SKILL.md`](../../.claude/skills/chief-of-staff/SKILL.md) (plan folder `.plans/bsbox-v2`).

**Loop branch:** `feat/plans-bsbox-v2`

**Status:** planned

## Git invariants

| Rule | Value |
|---|---|
| Release branch | `main` |
| Loop branch | `feat/plans-bsbox-v2` |
| Plans land first | via `docs/plans-bsbox-v2` into `main` (preflight needs the last chapter file on `main`) |
| Start of every chapter | `git checkout feat/plans-bsbox-v2 && git pull`, then `git checkout -b <chapter branch>` |
| End of every chapter | PR into the loop branch, CI green, merge with `--delete-branch` |
| End of suite | One PR `feat/plans-bsbox-v2` → `main`, CI green, merge with `--merge` |

## Product invariants

1. `tdd-workflow` skill (user-level): red, green, refactor; files ≤ ~100 LOC, methods ≤ ~5 LOC, ≤ 1 nesting level.
2. Every chapter is independently shippable with a green `./ci.sh`.
3. Every chapter has a **Happy** and a **Negative** red test.
4. Scoring is computed only in `packages/shared/src/scoring.ts` (D4).
5. All user-facing copy is in `strings.en.ts` and `strings.de.ts` only; no other languages; the key-parity test must pass (D10).
6. Fluent UI v9 only; frontend follows the feature architecture in [00-architecture.md](00-architecture.md) §9.
7. No PII is stored or logged (D2). No fingerprinting.
8. API routes are exactly those in [00-architecture.md](00-architecture.md) §7 (D11).
9. Manual owner steps are never performed by the loop; a chapter that needs one stops and reports it ([manual-steps.md](manual-steps.md)).

## Dependency graph

```mermaid
flowchart LR
  c01[01 legacy-cleanup] --> c02[02 scaffold-ci] --> c03[03 shared-domain] --> c04[04 d1-schema] --> c05[05 series-api]
  c05 --> c06[06 session-do-core] --> c07[07 session-lifecycle] --> c08[08 results-api] --> c09[09 web-foundation]
  c09 --> c10[10 web-join-lobby] --> c11[11 web-live] --> c12[12 web-results] --> c13[13 outlook-addin]
  c13 --> c14[14 teams-app] --> c15[15 docs-site] --> c16[16 e2e-and-load] --> c17[17 appsource-compliance] --> c18[18 deploy-release]
```

Order is linear on purpose, even where chapters are technically independent.

## Chapters

| # | Chapter | Gate | Plan | Status |
|---|---|---|---|---|
| 01 | Legacy cleanup | `./ci.sh` (minimal) | [01-legacy-cleanup](chapters/01-legacy-cleanup.md) | planned |
| 02 | Scaffold and CI | `./ci.sh` | [02-scaffold-ci](chapters/02-scaffold-ci.md) | planned |
| 03 | Shared domain | `./ci.sh` | [03-shared-domain](chapters/03-shared-domain.md) | planned |
| 04 | D1 schema | `./ci.sh` | [04-d1-schema](chapters/04-d1-schema.md) | planned |
| 05 | Series API | `./ci.sh` | [05-series-api](chapters/05-series-api.md) | planned |
| 06 | Session DO core | `./ci.sh` | [06-session-do-core](chapters/06-session-do-core.md) | planned |
| 07 | Session lifecycle | `./ci.sh` | [07-session-lifecycle](chapters/07-session-lifecycle.md) | planned |
| 08 | Results API | `./ci.sh` | [08-results-api](chapters/08-results-api.md) | planned |
| 09 | Web foundation | `./ci.sh` | [09-web-foundation](chapters/09-web-foundation.md) | planned |
| 10 | Web join and lobby | `./ci.sh` | [10-web-join-lobby](chapters/10-web-join-lobby.md) | planned |
| 11 | Web live | `./ci.sh` | [11-web-live](chapters/11-web-live.md) | planned |
| 12 | Web results | `./ci.sh` | [12-web-results](chapters/12-web-results.md) | planned |
| 13 | Outlook add-in | `./ci.sh` | [13-outlook-addin](chapters/13-outlook-addin.md) | planned |
| 14 | Teams app | `./ci.sh` | [14-teams-app](chapters/14-teams-app.md) | planned |
| 15 | Docs site | `./ci.sh` | [15-docs-site](chapters/15-docs-site.md) | planned |
| 16 | E2E and load | `./ci.sh` + e2e job | [16-e2e-and-load](chapters/16-e2e-and-load.md) | planned |
| 17 | AppSource compliance | `./ci.sh` | [17-appsource-compliance](chapters/17-appsource-compliance.md) | planned |
| 18 | Deploy and release | `./ci.sh` + deploy dry run | [18-deploy-release](chapters/18-deploy-release.md) | planned |

## Per-chapter gate

```bash
./ci.sh
```

## Execution order (chief of staff)

1. [chapters/01-legacy-cleanup.md](chapters/01-legacy-cleanup.md)
2. [chapters/02-scaffold-ci.md](chapters/02-scaffold-ci.md)
3. [chapters/03-shared-domain.md](chapters/03-shared-domain.md)
4. [chapters/04-d1-schema.md](chapters/04-d1-schema.md)
5. [chapters/05-series-api.md](chapters/05-series-api.md)
6. [chapters/06-session-do-core.md](chapters/06-session-do-core.md)
7. [chapters/07-session-lifecycle.md](chapters/07-session-lifecycle.md)
8. [chapters/08-results-api.md](chapters/08-results-api.md)
9. [chapters/09-web-foundation.md](chapters/09-web-foundation.md)
10. [chapters/10-web-join-lobby.md](chapters/10-web-join-lobby.md)
11. [chapters/11-web-live.md](chapters/11-web-live.md)
12. [chapters/12-web-results.md](chapters/12-web-results.md)
13. [chapters/13-outlook-addin.md](chapters/13-outlook-addin.md)
14. [chapters/14-teams-app.md](chapters/14-teams-app.md)
15. [chapters/15-docs-site.md](chapters/15-docs-site.md)
16. [chapters/16-e2e-and-load.md](chapters/16-e2e-and-load.md)
17. [chapters/17-appsource-compliance.md](chapters/17-appsource-compliance.md)
18. [chapters/18-deploy-release.md](chapters/18-deploy-release.md)
