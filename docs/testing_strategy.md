# Testing Strategy

This document describes the unified testing approach for the bsbox project. The plan spans the Litestar backend, the Preact/Vite frontend, end‑to‑end flows, deployment automation, and synthetic traffic generation. It assumes contributors work inside a Python virtual environment with the backend package installed in editable mode so tox can resolve dependencies.

## Guiding Principles
- Maintain the existing backend layering (controller → service → repository) and verify each seam independently and together.
- Keep the frontend organised into containers, presentational components, hooks, services, and shared types; tests should mirror that structure.
- Exercise the real build pipeline periodically: the backend must continue to serve the compiled frontend assets.
- Prefer fast, deterministic unit tests; add higher layers (integration, e2e, deployment smoke) to validate cross‑stack behaviour before shipping.

## Backend (Litestar)
- **Unit tests (pytest + pytest-asyncio)**  
  - Controllers: use `litestar.testing.TestClient` to confirm routing, dependency wiring, and response schemas.  
  - Services: mock repositories and assert business rules (`MeetingService.record_event`, `ingest_connection_snapshot`, history limits).  
  - Repositories: run against the in-memory SQLite fixtures to cover query logic, slot rounding, and aggregation calculations.  
  - Utilities: validate `HotspotMonitor` parsers and `lifespan` behaviour with async fixtures.
- **Integration tests**  
  - Spin up the full app with a transient SQLite database, ingest fixture events via the public API, and assert analytics output plus static file serving from `frontend/dist`.  
  - Cover alembic migrations (assert schema matches SQLModel metadata) and ensure new migrations run in CI.
- **Contract tests**  
  - Snapshot the Pydantic response models (`MeetingAnalyticsResponse`) to detect breaking schema changes consumed by the frontend.
- **Tooling**  
  - Stick with pytest, mypy, and Ruff; expand to `pytest-cov` for coverage, `pytest-recording` (if HTTPX calls need capture), and `vcrpy` for external integrations when introduced.

## Frontend (Preact + Vite)
- **Project structure alignment**  
  - `src/containers`: composition roots such as the dashboard page (`App` today).  
  - `src/components`: pure presentational pieces (toggles, analytics tables).  
  - `src/hooks`: data-fetching or stateful logic (`useAnalyticsPoller`, `useParticipantToggles`).  
  - `src/services`: API wrappers (`api.ts`) and gateway mocks.  
  - `src/types`: shared interfaces mirrored from backend schemas.
- **Unit tests (Vitest + @testing-library/preact)**  
  - Components: rendering, state transitions, prop contracts, accessibility.  
  - Hooks: exercise with `@testing-library/preact-hooks` and mock `fetch`.  
  - Services: stub `fetch`/`Chart.js` and assert request shapes plus error handling.
- **Integration tests**  
  - Render container + service combos with mocked backend responses; confirm data plumbs through to charts and tables.  
  - Add visual regression tests (optional) with Storybook/Chromatic once component library grows.
- **Static analysis**  
  - Enforce TypeScript strict mode, ESLint (Preact profile), and stylelint if CSS modules expand.

## End-to-End Flows
- Use Playwright to drive the compiled frontend served by Litestar (either via `uvicorn app.main:create_app` or Docker Compose).  
- Scenarios: visitor toggles, analytics refresh, history graph rendering, offline/error messaging, Pi deployment smoke (run against Raspberry Pi if available).  
- Run E2E suites on pull requests flagged as release candidates and nightly in CI. Keep runs hermetic by seeding the database and resetting between tests.

## Deployment & Operations Verification
- **Script validation**  
  - Wrap `scripts/dev_backend.sh`, `scripts/dev_frontend.sh`, `scripts/deploy_build.sh`, and `scripts/pi_deploy.sh` in tox environments that dry-run critical steps (with `set -x` and mocked commands where destructive).  
  - Check for required tools (`uvicorn`, `alembic`, `npm`) before execution; ensure scripts exit non-zero on failure.
- **Packaging**  
  - Use `python -m build` to confirm the backend wheel/sdist produces metadata referencing the Litestar entry point.  
  - Validate `npm run build` output and that `frontend/dist` contains hashed assets consumed by the backend static configuration.
- **Database & migrations**  
  - Run `alembic upgrade head` in CI using in-memory SQLite to ensure migrations stay in sync.  
  - Capture migration drift with `alembic check` or SQLModel metadata comparisons.

## Traffic Generation
- Reuse `backend/app/scripts/simulate_activity.py` as the canonical load tool.  
  - Provide CI targets for `event`, `burst`, and `snapshot` commands to hit staging environments.  
  - Allow parametrisation via environment variables (base URL, iteration counts) so the same tool seeds development, staging, and Pi deployments.  
  - For sustained smoke, run `burst` before E2E tests to populate analytics history.
- For hotspot emulation, keep `app.scripts.poller` available with sample JSON and integrate it into future hardware-in-the-loop tests.

## CI Orchestration & tox
- Create dedicated tox configs (`tox.backend.ini`, `tox.frontend.ini`, `tox.deploy.ini`) and aggregate them from the root `tox.ini`.  
  - Backend envs: lint (`ruff`), format, mypy, pytest (with coverage), integration (app + static dist).  
  - Frontend envs: `npm ci`, `npm run lint`, `npm run test -- --run --coverage`, `npm run build`.  
  - Deployment envs: shellcheck scripts (or `bash -n`), backend build + alembic smoke, Playwright smoke targeting production build.
- Document the workflow: `python -m venv backend/.venv && source backend/.venv/bin/activate && pip install -e backend` before invoking tox so Python dependencies resolve locally.
- Cache `node_modules` and `.venv` between runs in CI to keep tox envs fast.

## Reporting & Maintenance
- Track coverage per layer (backend unit/integration, frontend unit/e2e) and gate merges when coverage drops below team thresholds.  
- Integrate results with CI status checks and artefacts (coverage XML, Playwright HTML reports).  
- Review flaky tests monthly; quarantine failures and file issues.  
- Revisit this strategy quarterly to align with architectural changes (additional services, message queues, native mobile clients, etc.).


