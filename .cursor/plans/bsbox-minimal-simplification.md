# BSBox Minimal Simplification Plan

## 1. Inventory & Decommission Extras
- Map every major dependency and feature (Redis cache, SSE streams, telemetry, Ansible, pnpm/Corepack, Poetry, hot reload scripts).
- Delete or flag components not required for the core goal (meeting detection + basic analytics).

### Audit Findings (2025-11-09)
- **Backend tooling**: `pyproject.toml` + `poetry.lock` alongside `requirements.txt`; converge on a single `pyproject.toml` managed via `pip/uv`.
- **Redis cache**: `app/cache.py` and related calls in `MeetingService` require Redis; remove in favor of direct DB reads.
- **SSE endpoint**: `MeetingController.stream_analytics` exposes SSE; replace with periodic REST polling.
- **Dev orchestration**: `dev_stack.sh` mixes Poetry/pnpm; replace with focused backend/frontend scripts and a consolidated `scripts/run_dev.py` runner.
- **Frontend tooling**: pnpm (`pnpm-lock.yaml`, Corepack requirement) and Tailwind-heavy setup; plan migration to npm + lean Preact UI.
- **Deployment assets**: `deployment/ansible`, `deployment/scripts`, `deployment/systemd`, and `infrastructure/templates` add Ansible/systemd scaffolding; supersede with a Raspberry Pi deployment shell script plus README guide.
- **Hotspot polling**: `app/utils/hotspot_monitor.py` and `app/scripts/poller.py` assume Wi-Fi sniffing; reassess necessity once engagement flow is strictly frontend-driven.
- **Automation tooling**: `tox.ini` orchestrates multi-env checks; keep only if needed after downsizing.

## 2. Streamline Backend (Litestar + SQLite)
- Replace Poetry with a venv workflow driven by `pyproject.toml` + `pip` (no separate `requirements.txt`).
- Remove Redis usage and related caching logic; rely on direct database reads.
- Drop SSE endpoints in favor of simple JSON polling endpoints for current stats and history.
- Keep only essential services/models: meeting, participant, engagement events with SQLModel/SQLAlchemy (SQLite on disk).
- Serve compiled frontend assets from a `/static` directory using Litestar’s static files support.

## 3. Rebuild Frontend (Preact + Vite)
- Recreate frontend in `frontend/` using Preact + Vite with npm (no pnpm/Corepack).
- Implement minimal views: engagement toggle page + dashboard charts (e.g., Chart.js) backed by REST polling.
- Configure `npm run build` to emit assets consumed by the backend; provide a lightweight `npm run dev` for local development.

## 4. Simplify Development Workflow
- Replace `dev_stack.sh` with three shell scripts: `scripts/dev_backend.sh`, `scripts/dev_frontend.sh`, and `scripts/deploy_build.sh` (names TBD).
- Provide a required `scripts/run_dev.py` helper that launches the backend and proxies to Vite for integrated local development.

## 5. Minimal Meeting Detection Logic
- Maintain only the code needed to record participant toggles (speaking/relevance) and compute aggregate stats from persisted events.
- Model the captive portal flow: after capture, users interact via the frontend without background polling jobs.

## 6. Deployment & Ops
- Remove Ansible and related deployment assets; replace with a Raspberry Pi deployment shell script that installs dependencies, runs migrations, builds the frontend, and copies assets.
- Document manual deployment steps (including optional systemd/nginx guidance) in the README alongside the script usage.

## 7. Documentation & Cleanup
- Update README to describe the slim architecture and new setup steps.
- Prune residual configs (tox profiles no longer needed, telemetry integrations, unused env vars).
- Add a concise architecture summary showing Litestar serving the API and static frontend from one process.

### To-dos
- [ ] Catalogue current dependencies/features and mark items to remove
- [ ] Refactor backend to pip/venv + Litestar + SQLite, remove Redis/SSE
- [ ] Recreate minimal Preact/Vite frontend built with npm, served by backend
- [ ] Simplify development scripts/docs for local setup
- [ ] Retain and polish essential meeting detection logic and CLI tools
- [ ] Write minimal deployment steps and remove heavy automation
- [ ] Refresh README/architecture docs and delete unused configs
