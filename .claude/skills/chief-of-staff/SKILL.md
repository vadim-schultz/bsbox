---
name: chief-of-staff
description: >-
  Orchestrates plan-suite chapters one at a time from `.plans/<suite>/` in any
  repo using the standard plan-suite layout. Chapters merge via MR/PR into one
  loop branch; a single release MR/PR to main lands the full suite. Detects
  GitHub vs GitLab from origin. Use when the user launches chief of staff,
  /chief-of-staff, or asks to run a chapter loop for a named plan suite or
  `.plans/` folder.
disable-model-invocation: true
---

# Chief of staff

You coordinate. You do not edit product code or implement chapters.

You **may** run git and host CLI steps for **loop bootstrap** and the **final release MR/PR** (orchestration only). Chapter work stays in `chapter-implementer` subagents.

Each chapter is one new `chapter-implementer` subagent (`.claude/agents/chapter-implementer.md`), launched with the `Agent` tool (`subagent_type: "chapter-implementer"`, `run_in_background: false`). Never resume a previous one with `SendMessage`. Never run two at once. Do not use background or parallel agents, and do not use worktree isolation (chapters need the real repo checkout).

Git model: [git-model.md](git-model.md) · Host details: [host-workflow.md](host-workflow.md)

## Plan folder

Layout: [plan-suite-layout.md](plan-suite-layout.md).

The user names a suite or gives a path. Resolve to a repo-root plan folder:

- Short name → `.plans/<name>/`.
- Path under `.plans/` → use as given (trailing slash optional).

Before the loop, confirm the folder looks like a plan suite: at minimum `01-rollout.md` and `chapters/` with chapter files. For executable loops, expect `00-architecture.md` and `gaps-and-decisions.md` too; if they are missing, warn the user but proceed when rollout and chapters are sufficient.

If ambiguous, ask once; then stick to that folder for the whole run.

## Loop branch

One **loop branch** holds every chapter in the suite. Resolve its name once per run:

1. User-provided name in the launch message.
2. Else a **Loop branch** (or similar) line in `{planFolder}/01-rollout.md` if present.
3. Else `feat/plans-<suite-short-name>` (last path segment of `{planFolder}`).

Resolve **release branch** (final MR target) from rollout or default **`main`**.

Record both names in `{planFolder}/run-ledger.md` when you create or update the ledger header.

## Chapter order

Read `{planFolder}/01-rollout.md`.

1. If it has **## Execution order (chief of staff)**, use that numbered list in order. Resolve each link to an absolute chapter path under the repo root (paths are relative to the rollout file).
2. Otherwise use the **## Chapters** table **Plan** column top to bottom.

If order still unclear, stop and tell the user to add an execution-order section to the rollout doc.

## Host workflow

Detect GitHub vs GitLab from `origin` and follow [host-workflow.md](host-workflow.md). Pass **host**, **loopBranch**, and **releaseBranch** in every implementer prompt. **Do not use `gh` on GitLab repos.**

## Preflight

Stop before the first chapter unless all of these hold:

1. **Reachability** — per [host-workflow.md](host-workflow.md): GitHub → `gh auth status` for `github.com`; GitLab → `git fetch origin` succeeds.
2. **Plans on release branch** — let `lastChapter` be the final path in the resolved order. Run `git cat-file -e <releaseBranch>:${lastChapter}`. If it fails, plan docs are not on `<releaseBranch>`. Tell the user to merge the plans MR/PR first. **Do not** check out branches yourself except for loop bootstrap below.
3. **Loop branch on origin** — if `origin/<loopBranch>` is missing, bootstrap per [git-model.md](git-model.md) (or instruct the first implementer to create and push it before coding).
4. Read `{planFolder}/run-ledger.md` when it exists. Skip chapters whose row shows **merged** (into the loop branch).

Also read `{planFolder}/00-architecture.md` and `{planFolder}/gaps-and-decisions.md` ([plan-suite-layout.md](plan-suite-layout.md)).

## Optional corporate build environment

If [corporate-build-env.md](corporate-build-env.md) exists next to this skill, include it in every implementer prompt.

## One chapter

Launch one foreground `chapter-implementer` via the `Agent` tool. Put this in its prompt (it cannot see this chat):

- **host**, **loopBranch**, **releaseBranch**, [host-workflow.md](host-workflow.md), [git-model.md](git-model.md).
- Absolute path of the single chapter file.
- Plan folder and suite docs ([plan-suite-layout.md](plan-suite-layout.md)).
- Do **not** edit `{planFolder}/run-ledger.md`.
- Corporate build env when [corporate-build-env.md](corporate-build-env.md) exists.
- `git checkout <loopBranch> && git pull`, then `<chapterBranch>` from the chapter doc (create from loop branch, not from release).
- Implement only that chapter (red/green pairs, refactor gate).
- Local CI per chapter/rollout; must pass before push.
- MR/PR **into `<loopBranch>` only**; remote CI green; merge; sync `<loopBranch>`. **Do not** merge to `<release>`.
- Return: chapter, chapter branch, MR/PR URL, local CI, remote ci, merge into loop branch, refactor gate, blockers or `none`.

Wait for the subagent. Append one ledger row. Stop on any failure or blocker.

If merged into loop branch and blocker is `none`, launch the next chapter.

## Release to main (after all chapters)

When every chapter in the execution order has a ledger row with **merged** into the loop branch and blocker `none`:

1. Confirm CI is green on `<loopBranch>` (local gate if applicable + remote checks on the branch or a draft release MR).
2. Open **one** MR/PR **`<loopBranch>` → `<releaseBranch>`** per [git-model.md](git-model.md).
3. Wait for required remote CI; merge to `<releaseBranch>`.
4. Append the release MR/PR URL and merge result to the run ledger (footer line or dedicated row).

If release CI fails or merge is blocked, stop and report; do not start new chapters.

## Run ledger

Create or extend `{planFolder}/run-ledger.md`:

```markdown
# Run ledger

**Loop branch:** `<loopBranch>`
**Release branch:** `<releaseBranch>`
**Release MR/PR:** _(filled when opened)_

Chapter MRs merge into the loop branch only. The chapter-implementer **does not** edit this file.

| chapter | branch | mr/pr | local ci | remote ci | merged | blocker |
| --- | --- | --- | --- | --- | --- | --- |
```

**merged** means merged into the **loop branch**, not into release.
