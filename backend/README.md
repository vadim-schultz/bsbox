# Muda Meter Backend (Litestar)

Minimal Litestar API for meeting tracking with engagement buckets.

## Structure

- `app/` — Litestar app factory, wiring controllers and DB.
- `app/db.py` — SQLite engine and request-scoped session dependency.
- `app/models` — SQLAlchemy models (`Meeting`, `Participant`, `EngagementSample`).
- `app/schema` — Pydantic schemas including pagination (fixed 20/page).
- `app/repos` / `app/services` — CRUD plus meeting detection, anonymous user creation, engagement bucket updates.
- `app/controllers` — Meetings, Users, and Visit endpoints.
- `scripts/start_app.py` — create venv, install deps, run uvicorn with reload.
- `scripts/demo.py` — basic load script to simulate visits and engagement.
- `tests/` — model and endpoint coverage (pytest + Litestar TestClient).

## Running locally

```bash
cd backend
python scripts/start_app.py
```

The app applies Alembic migrations on startup to ensure the SQLite schema is current.

## Migrations

```bash
cd backend
# apply the latest migrations
alembic upgrade head
# create a new revision from models
alembic revision --autogenerate -m "describe change"
```

## Tests

```bash
cd backend
python -m pytest
```

## Code Quality & Tooling

We use `tox` to provide a single entry point for all quality checks.

### Install dev dependencies

```bash
cd backend
pip install -e ".[dev]"
```

### Run everything

```bash
tox
```

### Common checks

```bash
# Format check (no changes)
tox -e ruff-format

# Lint
tox -e ruff-lint

# Type check
tox -e mypy

# Security scan
tox -e bandit

# Tests (py312 by default)
tox -e py312
```

### Auto-fix formatting/imports

```bash
ruff format .
ruff check --fix .
```

### Coverage report (HTML)

```bash
tox -e py312 -- --cov-report=html
open htmlcov/index.html
```

## CI/CD

GitHub Actions runs the same tox environments:

- Matrix for quality: `ruff-format`, `ruff-lint`, `mypy`, `bandit`
- Matrix for tests: Python 3.11 and 3.12 (`py311`, `py312`)
- Coverage uploaded from Python 3.12 job (Codecov action)

## Pre-commit (optional but recommended)

Enable fast local checks:

```bash
cd backend
pip install pre-commit
pre-commit install
```

Hooks run ruff (format + lint), mypy (app/scripts), and basic hygiene hooks.

## Endpoints

- `GET /meetings` — paginated (20/page) history.
- `POST /meetings` — detect/create meeting; rounds visitor time to nearest hour, ends after 60 minutes.
- `GET /meetings/{id}` — meeting detail with participants and engagement samples.
- `POST /users/status` — speaking/engaged/disengaged; auto-creates anonymous participant (TTL 60 minutes) and records current-minute bucket.
- `POST /visit` — ensure meeting, create/reuse participant, return IDs and meeting window.
