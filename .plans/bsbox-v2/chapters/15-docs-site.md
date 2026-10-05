---
name: "Chapter 15 — Docs site"
overview: "Astro Starlight in English and German with user and admin guides, legal pages, runbook and scoring doc."
todos:
  - id: g1
    content: "Parity script test-first, then content"
    status: pending
  - id: g2
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 15 — Docs site

**Repo:** `bsbox` · **Branch:** `feat/v2-docs` · **Status:** planned
**Depends on:** [14](14-teams-app.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

Everything AppSource and customers need to read, in both languages ([architecture §12](../00-architecture.md)).

## Design decisions

- `apps/docs` Starlight with i18n (`/en`, `/de`); sidebar: Get started, Add BSBox to a meeting, Join a meeting, Understand your score, Admin install (M365 admin center, Teams custom app), Privacy, Terms, Support, Security.
- Legal pages are **drafts** for owner review ([M8](../manual-steps.md)): no PII, retention 30 days, EU jurisdiction, anonymous tokens, subprocessors (Cloudflare).
- `docs/operations/runbook.md` (deploy, rollback, secrets, domain) and `docs/scoring.md` (formula, thresholds, 1-minute buckets).
- A build-time check asserts every EN page has a DE counterpart and vice versa.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/docs/src/content/docs/{en,de}/**` | docs | New |
| `apps/docs/scripts/check-parity.ts` (+ test) | docs | New |
| `docs/operations/runbook.md`, `docs/scoring.md` | docs | New |
| `README.md` | root | Edit (developer section) |

## Manual configuration

M8 (legal text review) — drafts merge, final approval is owner-only — see [manual-steps.md](../manual-steps.md). The implementer stops and reports if a manual step blocks a check; it never performs one.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | `pnpm --filter docs build` produces `/en/` and `/de/` pages; the parity check passes |
| **Happy** | `docs/scoring.md` formula matches `packages/shared/src/scoring.ts` constants (test reads both) |
| **Negative** | Deleting one DE page makes the parity check fail |
| **Negative** | A docs link to a non-existent page fails the build's link check |

## Green

1. Parity script test-first, then content.
2. `./ci.sh`.

## Refactor gate

`grep -rln "TODO\|lorem" apps/docs docs` prints nothing. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-docs
```

Commit message: `docs: Starlight site (en, de), guides, legal drafts, runbook and scoring doc`
