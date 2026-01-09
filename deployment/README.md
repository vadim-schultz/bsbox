# bsbox Deployment Scripts

This directory contains scripts for starting bsbox in different modes.

## Scripts

| Script          | Description                                |
| --------------- | ------------------------------------------ |
| `start-dev.sh`  | Docker development mode with hot-reloading |
| `start-prod.sh` | Docker production mode                     |

## Configuration

### Registry Configuration

All deployment scripts default to **public registries** for ease of use. To use corporate/internal registries, create `deployment/.env` from the template:

```bash
cp deployment/.env.example deployment/.env
# Edit .env to set corporate registry values
```

**Fallback behavior:**

- No `.env` file → Uses public registries (`docker.io`, `npmjs.org`, `pypi.org`)
- `.env` file with values → Uses corporate registries (e.g., `docker.rsint.net/docker.io/...`)

The `.env` file is gitignored and won't be committed.

### Environment Variables

| Variable          | Description                         | Default (public registry)     |
| ----------------- | ----------------------------------- | ----------------------------- |
| `DOCKER_REGISTRY` | Docker base image registry prefix   | `docker.io`                   |
| `NPM_REGISTRY`    | npm registry URL                    | `https://registry.npmjs.org/` |
| `PYPI_INDEX_URL`  | Python package index URL            | `https://pypi.org/simple`     |
| `DEV_UID`         | User ID for bind mount permissions  | Current user's UID            |
| `DEV_GID`         | Group ID for bind mount permissions | Current user's GID            |

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
