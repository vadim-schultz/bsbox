# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BSBox is a real-time meeting engagement tracking application. Backend uses Litestar (Python), frontend uses React + TypeScript + Chakra UI v3. Communication happens via REST API and WebSocket for real-time updates.

## Commands

### Backend (from `backend/`)

```bash
# Start development server (auto-creates venv, installs deps)
python scripts/start_app.py

# Run all tests
pytest

# Run single test file
pytest tests/test_endpoints.py

# Run specific test
pytest tests/test_endpoints.py::test_create_meeting -v

# Lint & type checks (all at once)
tox

# Individual checks
tox -e ruff-format   # Format check
tox -e ruff-lint     # Linting
tox -e mypy          # Type checking

# Auto-fix formatting
ruff format .
ruff check --fix .

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"
```

### Frontend (from `frontend/`)

```bash
npm install
npm run dev      # Vite dev server on :5173, proxies API to backend :8000
npm run build    # Production build to dist/
npm run test     # Vitest
```

### Docker Development (from `deployment/`)

```bash
./start-dev.sh   # Frontend :5173, Backend :8000, PostgreSQL :5432
./start-prod.sh  # Production via nginx on :80
```

## Architecture

### Backend Structure

Controllers → Services → Repositories → Models

- **Controllers** (`app/controllers/`): HTTP route handlers, delegate to services
- **Services** (`app/services/`): Business logic orchestration
- **Repos** (`app/repos/`): Data access layer, all ORM operations
- **Models** (`app/models/`): SQLAlchemy ORM models
- **Schema** (`app/schema/`): Pydantic request/response contracts
- **WS** (`app/ws/`): WebSocket handlers for real-time engagement updates

### Frontend Structure

Feature-first organization under `src/features/meeting/`:

- **containers/**: Smart components (MeetingContainer, SelectionContainer)
- **components/**: Presentational components
- **services/**: API client (`client.ts`) and WebSocket (`meetingSocket.ts`)
- **hooks/**: Custom React hooks (useMeetingSocket, useSelectionFlow)
- **types/**: TypeScript definitions (domain, dto, ws message types)

### Real-time Communication

WebSocket at `/ws` handles:
- Client sends: `join` (with fingerprint), `status` (speaking/engaged/disengaged), `ping`
- Server sends: `joined`, `snapshot`, `delta`, `meeting_started`, `meeting_ended`, `meeting_summary`

Vite dev proxy routes `/ws`, `/meetings`, `/visit`, `/users`, `/cities`, `/meeting-rooms` to backend.

## Key Patterns

- **Async-first**: All backend IO uses `async def`
- **Device fingerprinting**: Clients identified by `@fingerprintjs/fingerprintjs`, no auth required
- **Engagement bucketing**: Status updates grouped into 15-minute slots
- **Anonymous volumes**: Docker dev uses anonymous volume for `node_modules` to avoid platform mismatch

## Backend Guidelines (from .cursor/rules)

- Use Litestar with application factory (`create_app`) in `app/main.py`
- Controllers expose HTTP contracts only, delegate to services
- Services orchestrate business logic, depend on repositories
- Encapsulate DB interactions in repository classes, never access ORM from controllers
- Target Python >=3.11, <3.13
- Ensure mypy passes with strict settings and ruff linting is clean

## Frontend Guidelines (from .cursor/rules)

- Containers fetch data via hooks and pass props downward
- Avoid direct fetch calls in components; route through services
- Provide accessibility attributes (aria labels) for controls
- Design for smartphone-first UX: vertical stacking, touch-friendly controls
- Co-locate unit tests beside components
