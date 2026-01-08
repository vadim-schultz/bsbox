# bsbox Deployment Scripts

This directory contains scripts for starting bsbox in different modes.

## Scripts

| Script           | Description                                |
| ---------------- | ------------------------------------------ |
| `start-local.sh` | Run locally without Docker (uses SQLite)   |
| `start-dev.sh`   | Docker development mode with hot-reloading |
| `start-prod.sh`  | Docker production mode                     |

## Configuration

### Proxy / Registry Configuration

All proxy/registry settings are controlled via `deployment/.env` (gitignored). A template is provided at `deployment/.env.example`. Copy it and adjust as needed:

```bash
cp deployment/.env.example deployment/.env
```

Defaults (uncommented) use public registries:

- Docker: `docker.io`
- NPM: `https://registry.npmjs.org/`
- PyPI: `https://pypi.org/simple`

### Corporate Network / Custom NPM Registry

If you're behind a corporate firewall and need to use a custom npm registry, create a `.env` file in this directory:

```bash
# deployment/.env
NPM_REGISTRY=https://your-corporate-registry.example.com/npm/
```

The `.env` file is gitignored and won't be committed.

### Environment Variables

| Variable          | Description                         | Default                   |
| ----------------- | ----------------------------------- | ------------------------- |
| `NPM_REGISTRY`    | Custom npm registry URL             | (public npmjs.org)        |
| `DOCKER_REGISTRY` | Docker base image registry          | `docker.io`               |
| `PYPI_INDEX_URL`  | Python package index URL            | `https://pypi.org/simple` |
| `DEV_UID`         | User ID for bind mount permissions  | Current user's UID        |
| `DEV_GID`         | Group ID for bind mount permissions | Current user's GID        |

## Docker Development Mode

```bash
./start-dev.sh
```

Services:

- Frontend (Vite dev server): http://localhost:5173
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

Features:

- Hot-reloading for both frontend and backend
- Source code is bind-mounted from host
- PostgreSQL database with persistent volume

## Docker Production Mode

```bash
./start-prod.sh
```

Services:

- Frontend (via Nginx): http://localhost:80
- Backend API: http://localhost:8000
- PostgreSQL: internal only

Features:

- Optimized production builds
- Nginx serves static frontend with API reverse proxy
- PostgreSQL database with persistent volume

## Local Development (No Docker)

```bash
./start-local.sh
```

Requirements:

- Python 3.11+
- Node.js 18+
- npm

Features:

- Uses SQLite database (bsbox.db)
- Runs directly on host machine
- Suitable for quick development without Docker

Environment:

- `VITE_BACKEND_URL` defaults to `http://localhost:8000` (overridable) so the shared `vite.config.ts` also works for Docker modes where the default remains `http://backend:8000`.
- Ports 8000 (backend) and 5173 (frontend) are checked and freed automatically before startup.
