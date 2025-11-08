# Commit Guidelines

- Follow Conventional Commits: `<type>(optional scope): <description>`.
- Types: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`, `test`, `build`, `perf`.
- Use present tense, imperative voice, max ~72 chars subject line.
- Auto-generate commit body by summarizing staged changes (use `git status --short` and `git diff --cached`).
- Include references to issues/tickets in the footer when applicable.
- Run lint/type/test checks before committing; commits must be clean (no dirty worktree) unless documenting WIP with `chore: wip`.

