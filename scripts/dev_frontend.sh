#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
PORT="${FRONTEND_PORT:-5173}"
HOST="${FRONTEND_HOST:-127.0.0.1}"

cd "${FRONTEND_DIR}"

if [[ ! -d node_modules ]]; then
  echo "[dev-frontend] Installing npm dependencies"
  npm install
fi

exec npm run dev -- --host "${HOST}" --port "${PORT}"
