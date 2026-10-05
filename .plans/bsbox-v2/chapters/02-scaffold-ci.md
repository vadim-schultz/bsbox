---
name: "Chapter 2 — Scaffold and CI"
overview: "pnpm monorepo with TypeScript strict, ESLint, Prettier, Vitest, the real `ci.sh` and the GitHub workflow."
todos:
  - id: g1
    content: "Create workspaces and configs"
    status: pending
  - id: g2
    content: "Add the lint rule and prove it with the negative test (temp file, removed afterw"
    status: pending
  - id: g3
    content: "Write `ci.sh` and the workflow"
    status: pending
  - id: g4
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 2 — Scaffold and CI

**Repo:** `bsbox` · **Branch:** `feat/v2-scaffold` · **Status:** planned
**Depends on:** [1](01-legacy-cleanup.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

An empty but fully wired monorepo whose `./ci.sh` runs lint, format check, typecheck, tests and build across all workspaces ([D14](../gaps-and-decisions.md)).

## Design decisions

- Workspaces: `apps/worker`, `apps/web`, `apps/docs` (stub), `packages/shared`, `packages/addin` (stub), `e2e` (stub). Each has `package.json`, `tsconfig.json` extending `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`).
- Root scripts: `lint`, `format:check`, `typecheck`, `test` (`vitest --run`), `build`. `ci.sh` runs them in that order with `set -euo pipefail` and `pnpm install --frozen-lockfile`.
- Pin Node via `.nvmrc` (LTS) and `packageManager` in `package.json`.
- `.github/workflows/ci.yml` runs `./ci.sh` on every PR and on pushes to the loop branch and `main`.
- ESLint flat config with `import/no-restricted-paths` encoding the dependency direction from [architecture §5](../00-architecture.md): `packages/shared` imports no app; `apps/web` imports no `apps/worker`.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc` | root | New |
| `eslint.config.js`, `.prettierrc`, `vitest.workspace.ts` | root | New |
| `apps/*/package.json`, `packages/*/package.json` (+ one smoke test in `packages/shared`) | workspaces | New |
| `ci.sh`, `.github/workflows/ci.yml` | ci | Replace chapter-01 stub |

## Manual configuration

M1 (GitHub Actions enabled, `gh auth status`) — see [manual-steps.md](../manual-steps.md). The implementer stops and reports if a manual step blocks a check; it never performs one.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | `packages/shared` smoke test (`exports a version constant`) passes under `pnpm test` |
| **Happy** | `./ci.sh` exits 0 from a clean clone |
| **Negative** | A temp file in `packages/shared` importing from `apps/worker` makes `pnpm lint` fail |
| **Negative** | A type error in `apps/web` makes `pnpm typecheck` (and `./ci.sh`) fail |

## Green

1. Create workspaces and configs.
2. Add the lint rule and prove it with the negative test (temp file, removed afterwards).
3. Write `ci.sh` and the workflow.
4. `./ci.sh`.

## Refactor gate

`grep -rn "apps/worker" packages/shared` prints nothing. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-scaffold
```

Commit message: `build: scaffold pnpm monorepo, strict TypeScript, lint and CI gate`
