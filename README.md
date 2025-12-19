# Muda Meter

Litestar backend with a React + TypeScript + Chakra UI v3 frontend.

## Layout

- `backend/` — Litestar API, tests, and helper scripts (see `backend/README.md`).
- `frontend/` — Vite React + TS app using Chakra UI v3 with feature-first folders.
  - `src/features/meeting/{containers,components,services,types,hooks}`
- `scripts/` — project-level helpers (e.g., `build_and_serve.py`).

## Quick start (backend only)

```bash
cd backend
python scripts/start_app.py
```

## Frontend dev

```bash
cd frontend
npm install
npm run dev  # Vite proxy handles API routing to backend on port 8000
```

## Build and serve everything

```bash
python scripts/build_and_serve.py
```

The script installs backend deps, runs tests, installs frontend deps, builds the Vite app, then serves the built assets from the backend at `/` while keeping API routes intact.
