#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Deploying backend..."
cd "${PROJECT_ROOT}/backend"
poetry install --no-root
poetry run litestar --app app.main:create_app run --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Building frontend..."
cd "${PROJECT_ROOT}/frontend"
pnpm install
pnpm build
npm install -g serve >/dev/null 2>&1 || true
serve -s dist -l 3000 &
FRONTEND_PID=$!

trap "kill ${BACKEND_PID} ${FRONTEND_PID}" EXIT
wait

