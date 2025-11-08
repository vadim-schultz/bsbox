# Testing & Dev Automation Plan

## Summary
- Unify backend/frontend workflows under `tox`
- Raise unit test coverage targets and documentation
- Provide a local dev script that starts the full stack with sane defaults

## Implementation Steps
- `backend-tests`: Inventory current pytest coverage, add fixtures/mocks for `meeting_service`, `meeting_repo`, and controller routes, and configure `pytest-cov` thresholds in `backend/tests`.
- `backend-tox`: Ensure `backend/pyproject.toml` declares all dev deps, adjust `tox.ini` backend envs to install the package via Poetry, and add commands to fail when coverage thresholds drop.
- `frontend-tests`: Enhance Vitest + Testing Library setup (`frontend/vitest.config.ts`, `frontend/src/components/__tests__`) to cover remaining components/hooks and enforce coverage reporting/thresholds.
- `frontend-tox`: Refactor `tox.ini` Node envs to share install steps, add lint, typecheck, format, unit, and coverage jobs, and ensure cross-platform pnpm usage.
- `tox-orchestration`: Update repo-level `env_list`/`gh-actions` blocks so backend/frontend pipelines run in the right order and can be invoked via grouped envs (e.g. `py311-all`, `node20-all`, `ci` meta env).
- `dev-script`: Create `scripts/dev_stack.sh` (or similar) to bootstrap Poetry shell, install deps, run backend via `uvicorn` and frontend via `pnpm dev` with log output and cleanup, then document usage in `README.md`.
- `verification`: Document and execute `tox` smoke runs (`tox -e py311-test,node20-test`) and the new dev script in README, capturing any manual setup (corepack enable, env vars).

## Status
- ✅ `backend-tests`, `frontend-tests`: Expanded pytest/Vitest suites with coverage thresholds.
- ✅ `frontend-tox`, `tox-orchestration`, `dev-script`: Tox matrix updated; root `dev_stack.sh` documented.
- ⚠️ `backend-tox` tooling installed but `poetry run tox -e ci` still pending until `poetry lock` can be regenerated (current workflow blocked by network/lock mismatch).
- 🔄 `verification`: instructions added; once lock refresh succeeds, rerun full tox matrix to close out the plan.

