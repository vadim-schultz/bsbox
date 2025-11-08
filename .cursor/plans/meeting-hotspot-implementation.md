# Meeting Hotspot Implementation Plan

## Scope
- Finalize backend persistence, analytics, and hotspot ingestion pipelines.
- Enhance frontend for smartphone-first experience with realtime data visualization.
- Harden deployment workflows (lockfiles, systemd units, monitoring).
- Establish comprehensive backend/frontend testing and CI coverage with all tox environments passing.

## Steps

1. Backend Persistence & Analytics
   - Model entities with SQLModel (`Meeting`, `Participant`, `ConnectionEvent`, `EngagementEvent`) and manage migrations.
   - Configure async engine/session factory, dependency wiring, and background meeting lifecycle logic.
   - Implement repositories for meeting detection, analytics aggregation, and historical metrics.
   - Extend services for engagement toggles, Redis caching, and SSE-friendly payloads.

2. Hotspot Polling Integration
   - Build polling utilities using `hostapd_cli` with `iw` fallback, including retry/backoff and logging.
   - Schedule polling via lifespan background task or standalone poller script; persist snapshots into the data layer.
   - Map clients (MAC/IP/signal) to participants, apply meeting start/end heuristics, and update cached analytics.
   - Provide external script and optional systemd unit for off-app polling.

3. Frontend Enhancements (Smartphone-first)
   - Connect React Query hooks to REST + SSE endpoints for current and historical analytics.
   - Design mobile-optimized layout with Mantine + Tailwind, touch-friendly toggles, and responsive charts (Chart.js).
   - Display participant controls, realtime metrics, and history timeline tuned for small screens.

4. Deployment & Operations
   - Generate `poetry.lock` and `pnpm-lock.yaml`; document lock handling.
   - Expand Ansible roles (backend/frontend) with environment templates, migrations, and systemd units (backend, frontend, poller).
  - Ship hotspot provisioning templates, monitoring helpers, and HTTPS guidance.

5. Testing & Quality Strategy
   - Backend: unit/integration tests (pytest + pytest-asyncio), contract validation, repository analytics checks.
   - Frontend: component/hook tests (Vitest + Testing Library), Chart rendering checks, accessibility hints; optional Playwright flows.
   - Hotspot utilities: fixture-based parsing tests and meeting-threshold scenarios.
   - CI: GitHub Actions executes all tox environments (`lint`, `type`, `test`, `format`, `build`, frontend tasks, security); success criterion is green tox suite.

## Acceptance Criteria
- All tox environments succeed locally and in CI, covering linting, type checks, tests, formatting, builds, and security scans for backend and frontend.
- Smartphone-first frontend delivers realtime analytics and toggle interactions against live backend.
- Backend persists meeting data, emits accurate analytics, and tolerates hotspot polling variances.
- Deployment assets (lockfiles, Ansible roles, systemd units) enable Raspberry Pi rollout with monitoring guidance.

## Status
- Backend/Frontend scaffolding, analytics services, and deployment assets are in place and exercised by expanded unit tests (meeting persistence, React hooks, Chart components).
- Hotspot polling utilities implemented with fallback logic; additional tests now cover polling loop behavior.
- README now documents tooling prerequisites, dev stack usage, and operations guidance (background poller vs. standalone script).
- Outstanding work: refresh `poetry.lock` and run `poetry run tox -e ci` once connectivity is available to demonstrate end-to-end automation.
