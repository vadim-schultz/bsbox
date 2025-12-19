# 2025-11-09 — BSBox Slim Stack Execution Log

## Completed Steps
- Removed Redis and SSE dependencies from the backend (`app/services/meeting_service.py`, `app/utils/lifespan.py`, `app/controllers/meeting_controller.py`, `app/scripts/poller.py`), replacing caching with direct database reads and standard JSON polling endpoints.
- Replaced Poetry/pnpm workflow with a pip/venv based `backend/pyproject.toml`; deleted `poetry.lock` and `requirements.txt`, verified `pip install -e .` and `pytest` succeed inside `.venv`.
- Updated SQLModel models and repositories to use timezone-aware timestamps; synchronized test suite to match (`tests/test_meeting_service.py`, `tests/test_meeting_repo.py`).
- Implemented minimal npm-driven Preact + Vite frontend (new `src/App.tsx`, `src/api.ts`, `src/types.ts`, `src/styles.css`), removed Tailwind/pnpm artifacts, and ensured `npm install` + `npm run build` output to `frontend/dist`.
- Configured Litestar to serve built frontend assets via `StaticFilesConfig` when `frontend/dist` exists.
- Added helper scripts (`scripts/dev_backend.sh`, `scripts/dev_frontend.sh`, `scripts/deploy_build.sh`, `scripts/pi_deploy.sh`, `scripts/run_dev.py`) and documented their usage.
- Enhanced hotspot tooling: `app/scripts/poller.py` now accepts JSON samples, and `backend/samples/sample_clients.json` provides ready-made fixtures.
- Refreshed the README to describe the slim architecture, npm workflow, new scripts, and Raspberry Pi deployment process; cleaned up legacy Ansible/Corepack references.
- Simplified `tox.ini` to run backend checks and an npm build.
- Verified backend tests (`pytest`) and frontend build (`npm run build`) after changes.
- Added `.github/workflows/ci.yml` to run backend tests and the frontend npm build on push/PR.

## Pending / Next Actions
- Optional: run an end-to-end smoke test with `python scripts/run_dev.py` on a developer machine to confirm both servers start cleanly with the new tooling.
