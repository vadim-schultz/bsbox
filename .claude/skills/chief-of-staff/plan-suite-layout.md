# Plan suite layout (`.plans/<suite>/`)

One folder per body of work. Conventions match the repo’s `.plans/README.md` when present.

## Suite-level files

| Path | Role |
| --- | --- |
| `00-architecture.md` | Stack, scope, structure, invariants the chapters must respect |
| `01-rollout.md` | Chapter list, dependency graph, git/CI invariants, **execution order** for chief of staff |
| `gaps-and-decisions.md` | Settled decisions and deferred items — do not re-litigate during implementation |
| `run-ledger.md` | Merge ledger (chapters → loop branch; release MR/PR to main) |
| `chapters/` | One executable markdown plan per chapter |

`run-ledger.md` may be absent until the first chapter merges; architecture, rollout, gaps, and `chapters/` are expected for executable suites.

## Chapter files

Each file under `chapters/` is a self-contained slice (often `NN-<slug>.md`). YAML frontmatter typically includes `name`, `overview`, optional `todos`, and `isProject`. Chapters link tests, refactor gate, branch name, and commits.

`chapters/README.md` is optional index copy.

## What chief of staff reads

| When | Files |
| --- | --- |
| Preflight + invariants | `01-rollout.md`, `00-architecture.md`, `gaps-and-decisions.md`, `run-ledger.md` (if exists) |
| Per chapter | One `chapters/*.md` path from rollout execution order |
| Order source | `01-rollout.md` → **Execution order (chief of staff)**, else **Chapters** table |

Orchestration lives in repo `.claude/skills/chief-of-staff/` (see [git-model.md](git-model.md)) and `.claude/agents/chapter-implementer.md` — not under `.plans/<suite>/`.
