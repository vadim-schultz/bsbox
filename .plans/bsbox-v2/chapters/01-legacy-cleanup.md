---
name: "Chapter 1 — Legacy cleanup"
overview: "Tag the v1 code, delete the whole v1 architecture, and leave a repo that describes v2 only."
todos:
  - id: g1
    content: "Create and push the tag"
    status: pending
  - id: g2
    content: "Write `check-no-legacy.sh` (banned paths: `backend frontend deployment .cursor`;"
    status: pending
  - id: g3
    content: "Delete v1 files, rewrite docs, replace CI"
    status: pending
  - id: g4
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 1 — Legacy cleanup

**Repo:** `bsbox` · **Branch:** `feat/v2-legacy-cleanup` · **Status:** planned
**Depends on:** none (first chapter) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

v1 is completely superseded ([D12](../gaps-and-decisions.md)). After this chapter the repo contains no Litestar backend, no Chakra frontend, no Docker deployment, no v1 docs or rules; the `legacy-v1` tag preserves history.

## Design decisions

- Create annotated tag `legacy-v1` on the current `main` tip and push it **before** deleting anything. If the tag already exists, stop and report.
- Delete: `backend/`, `frontend/`, `deployment/`, `.cursor/`, stale `README.md`, old `.github/workflows/ci.yml`, `.dockerignore`, `.env*` examples, any v1-only root config (tox, alembic, pyproject).
- Keep: `.plans/`, `.git*`, `LICENSE` if present. Plan orchestration is user-level (`~/.cursor/skills/chief-of-staff/`, `~/.cursor/agents/chapter-implementer.md`).
- Write a minimal `README.md` (what BSBox v2 is, link to `.plans/bsbox-v2/`, note: "v1 is superseded; see tag `legacy-v1`") and a `CLAUDE.md` that describes **v2 only** (stack, commands `pnpm`/`./ci.sh`, layer rules from architecture §9, EN+DE rule). Nothing in `CLAUDE.md` may mention Litestar, Chakra, Docker, fingerprinting or Postgres.
- Add a root `ci.sh` that exits 0 after printing `no workspaces yet` (replaced in chapter 02) and a minimal `ci.yml` that runs it, so the gate stays green.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `legacy-v1` (git tag) | repo | New |
| `backend/`, `frontend/`, `deployment/`, `.cursor/` | v1 | Delete |
| `README.md`, `CLAUDE.md` | docs | Rewrite for v2 |
| `ci.sh`, `.github/workflows/ci.yml` | ci | Replace with minimal |
| `scripts/check-no-legacy.sh` | ci | New: fails if banned paths/words reappear |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | `check-no-legacy.sh` on the cleaned tree exits 0 and reports the tag exists locally and on origin |
| **Happy** | `./ci.sh` exits 0 |
| **Negative** | `check-no-legacy.sh` fails (exit 1) on a temp copy where `backend/` is recreated |
| **Negative** | `check-no-legacy.sh` fails on a temp copy where `CLAUDE.md` contains the word `Litestar` |

## Green

1. Create and push the tag.
2. Write `check-no-legacy.sh` (banned paths: `backend frontend deployment .cursor`; banned words in `README.md`/`CLAUDE.md`: `Litestar Chakra Docker fingerprint Postgres`).
3. Delete v1 files, rewrite docs, replace CI.
4. `./ci.sh`.

## Refactor gate

`git ls-files | grep -E '^(backend|frontend|deployment|\.cursor)/'` prints nothing. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-legacy-cleanup
```

Commit message: `chore!: remove v1 architecture (tagged legacy-v1)`
