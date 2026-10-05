# Git model (plan suite loop)

Three branch roles:

| Role | Default name | Purpose |
| --- | --- | --- |
| **Release branch** | `main` | Plan docs must exist here. Final MR/PR **target** after the whole loop. |
| **Loop branch** | user / rollout / `feat/plans-<suite>` | One long-lived branch for **all** chapters in the suite. |
| **Chapter branch** | from chapter doc | Short-lived; one MR/PR **into the loop branch** per chapter. |

Do **not** open chapter MRs/PRs directly to the release branch. Do **not** merge chapters to `main` until the suite is complete.

## Loop bootstrap

Before the first chapter (chief verifies; first implementer creates if missing):

```bash
git checkout <release> && git pull
git checkout -b <loopBranch>    # skip if branch already exists locally
git push -u origin <loopBranch> # skip if origin/<loopBranch> already exists
```

If `origin/<loopBranch>` already exists, each chapter starts from an updated loop branch, not from `main`.

## Per chapter

```bash
git checkout <loopBranch> && git pull
git checkout -b <chapterBranch>
# … implement, local CI …
git push -u origin HEAD
# MR/PR target = <loopBranch>, not <release>
```

After MR/PR merge: delete the chapter branch; sync `<loopBranch>` locally. **Do not** merge to `<release>`.

### GitHub

```bash
gh pr create --base <loopBranch> --head <chapterBranch> --title "…" --body "…"
gh pr checks --watch
gh pr merge --merge --delete-branch
git checkout <loopBranch> && git pull
```

### GitLab

```bash
git push -u origin HEAD \
  -o merge_request.create \
  -o merge_request.target=<loopBranch> \
  -o merge_request.title="…"
```

Wait for pipeline green; merge MR into `<loopBranch>`; `git checkout <loopBranch> && git pull`.

## Release (after all chapters)

When every chapter row in the run ledger is merged into the loop branch and CI is green on `<loopBranch>`:

Open one MR/PR **`loopBranch` → `<release>`** with the combined suite. Wait for required remote CI; merge to `<release>`.

**GitHub:**

```bash
gh pr create --base <release> --head <loopBranch> --title "…" --body "…"
gh pr checks --watch
gh pr merge --merge
git checkout <release> && git pull
```

**GitLab:** MR from `<loopBranch>` to `<release>` (push options or UI); merge when pipeline passes.

Record the release MR/PR URL in the run ledger (see chief-of-staff skill).

Chief of staff orchestrates the release MR/PR; chapter-implementer does **not** open it.
