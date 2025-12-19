# Backend Guidelines

## Architecture
- Use Litestar with an application factory (`create_app`) in `backend/app/main.py`.
- Organize code into `controllers/`, `services/`, `repos/`, `schemas/`, and `utils/`.
- Controllers expose HTTP contracts only and delegate work to services. Services orchestrate business logic and depend on repositories for persistence.
- Define request and response contracts with Pydantic models under `backend/app/schemas`.
- Prefer async-first IO using `async def` throughout; avoid blocking calls.
- Target Python versions >=3.11 and <3.13 for compatibility with asyncpg and other dependencies.

## Data & Persistence
- Use SQLModel over SQLAlchemy Core for models and migrations.
- Default database is PostgreSQL; allow SQLite fallback for local Pi development.
- Encapsulate database interactions inside repository classes; do not access the ORM from controllers.
- Cache hotspot metrics or session data with Redis via dependency injection.
- Ensure every required dependency is declared in `backend/pyproject.toml`. Group dependencies logically (runtime/core vs optional extras such as docs, testing, linting) using Poetry dependency groups.

## Hotspot Integration
- Place Wi-Fi client discovery helpers in `backend/app/utils`.
- Wrap interactions with `iw`, `nmcli`, or `hostapd_cli` using async subprocess helpers.
- Implement meeting detection as a background task triggered from the Litestar lifespan handler; expose configuration through `Settings`.

## Testing & Quality
- Write pytest suites under `backend/tests`.
- Mock system utilities (e.g., subprocess calls) in unit tests.
- Ensure mypy passes with strict settings and ruff linting is clean before committing.
- Manage environments with Poetry: run `poetry install` (use `--with`/`--all-extras` as needed for docs/tests). Activate the environment using `poetry env activate` (or prefix commands with `poetry run`) since `poetry shell` is not available by default.
- After dependencies are installed, execute tox through Poetry (`poetry run tox …`) so tox environments can reuse the resolved packages.

