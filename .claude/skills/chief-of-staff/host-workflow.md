# Host workflow (GitHub vs GitLab)

Branch roles: [git-model.md](git-model.md) (`<release>`, `<loopBranch>`, `<chapterBranch>`).

Detect once per repo (chief of staff at preflight; implementer at start of git section):

```bash
git remote get-url origin
```

| Condition | Host | Merge requests |
| --- | --- | --- |
| URL contains `github.com` | **GitHub** | `gh` (PR create, checks, merge) |
| Anything else (corporate GitLab, etc.) | **GitLab** | `git push` + GitLab MR; **no `gh`** |

Default **release** branch is **`main`** unless the plan rollout or chapter doc names another target for the final merge.

## Preflight auth / reachability

**GitHub:** `gh auth status` must succeed for `github.com`. Push and pull use `git`; `gh` supplies credentials for GitHub HTTPS.

**GitLab:** `git fetch origin` must succeed. Do not run `gh`. `glab` is optional and may be unavailable — do not depend on it.

## Chapter MR/PR (implementer)

Follow [git-model.md](git-model.md). MR/PR **base/target** is always **`<loopBranch>`**, never `<release>`.

**GitHub** — after `git push -u origin HEAD` from `<chapterBranch>`:

```bash
gh pr create --base <loopBranch> --title "<subject>" --body "…"
gh pr checks --watch
gh pr merge --merge --delete-branch
git checkout <loopBranch> && git pull
```

**GitLab** — push options target `<loopBranch>` (see git-model).

Required checks: follow the chapter and rollout docs (workflow job names when present).

## Release MR/PR (chief of staff, end of loop)

**`<loopBranch>` → `<release>`** when all chapters are merged into the loop branch. See [git-model.md](git-model.md).

Use merge commits (`--merge` on GitHub) unless the repo’s plan docs say otherwise.

## Implementer return fields

- **MR/PR URL** (chapter MR into loop branch)
- **remote ci:** pass | fail | not verified
- **merge:** merged into loop branch | not merged
