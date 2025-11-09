# /commit-message — Conventional Commit Workflow

Run this slash command as a checklist whenever you prepare a commit. It combines the
repository’s commit guidelines and the step-by-step workflow so every message stays
Conventional Commit–compliant and documents the verification you performed.

---

## 1. Refresh Local Context
1. `git status --short` – confirm staged vs unstaged files.
2. `git diff` – review unstaged changes; stage anything missing (`git add -p` helps).
3. `git diff --cached` – read the exact staged diff that will commit.
4. `git log --oneline --max-count=10` – note recent subjects and scopes.

## 2. Assemble the Conventional Commit Header
- Allowed types: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`, `test`, `build`, `perf`.
- Pick an optional scope reflecting the main area (`backend`, `frontend`, `tox`, `docs`, etc.). Combine if needed (`backend+frontend`).
- Keep the subject imperative, present tense, ≤ ~72 chars: `<type>(scope): <description>`.
- Example: `test(backend): expand meeting service coverage`.

## 3. Draft the Body (Optional but Encouraged)
- Summarize *what* changed and *why* in one or two lines.
- Mention follow-ups, risks, or notable side effects.
- Reference issues with `Refs:` / `Closes:` when applicable.
- If you touched dependency manifests (`backend/pyproject.toml`, `frontend/package.json`, etc.), regenerate and stage the matching lockfiles (`poetry lock`, `pnpm install --frozen-lockfile`).

## 4. Capture Testing & Verification
List every verification command executed, one per line, e.g.:
```
Test: tox -e ci
Test: ./dev_stack.sh (manual)
```

## 5. Final Checks
- Re-run `git diff --cached` to ensure the message mirrors the staged diff.
- Confirm no stray files remain (`git status` should be clean apart from staged changes).
- Run lint/type/test suites as needed so the commit lands green.
- When satisfied, run `git commit` and paste the prepared header, body, and test block.

Following `/commit` keeps history consistent, concise, and easy to audit.
