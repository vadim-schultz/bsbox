#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
API_BASE_URL="${API_BASE_URL:-http://${BACKEND_HOST}:${BACKEND_PORT}/api}"

ensure_poetry() {
  if command -v poetry >/dev/null 2>&1; then
    return
  fi

  echo "[dev] Poetry not found, attempting installation via official installer..."
  if ! command -v curl >/dev/null 2>&1; then
    echo "Error: 'curl' is required to bootstrap Poetry automatically. Please install Poetry manually." >&2
    exit 1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: 'python3' is required to bootstrap Poetry. Please install Python 3.11/3.12 and rerun." >&2
    exit 1
  fi

  curl -sSL https://install.python-poetry.org | python3 - || {
    echo "Error: automatic Poetry installation failed. Install manually from https://python-poetry.org/docs/#installation." >&2
    exit 1
  }

  export PATH="$HOME/.local/bin:$PATH"
  if ! command -v poetry >/dev/null 2>&1; then
    echo "Error: Poetry still not detected in PATH after installation. Make sure \$HOME/.local/bin is on PATH." >&2
    exit 1
  fi
}

ensure_corepack() {
  if command -v corepack >/dev/null 2>&1; then
    return
  fi

  echo "[dev] Corepack not found, attempting to enable via Node.js..."
  if command -v node >/dev/null 2>&1; then
    if node --version >/dev/null 2>&1; then
      if command -v npm >/dev/null 2>&1; then
        npm install -g corepack >/dev/null 2>&1 || true
      fi
    fi
  fi

  if ! command -v corepack >/dev/null 2>&1; then
    echo "Error: corepack is required (comes with Node.js 16.10+). Install Node.js 20+ or add corepack to PATH manually." >&2
    exit 1
  fi
}

ensure_poetry
ensure_corepack

echo "[dev] Installing backend dependencies via Poetry..."
pushd "${BACKEND_DIR}" >/dev/null
poetry install --sync
popd >/dev/null

echo "[dev] Installing frontend dependencies via pnpm..."
corepack enable
pushd "${FRONTEND_DIR}" >/dev/null
pnpm install --frozen-lockfile
popd >/dev/null

cleanup() {
  echo
  echo "[dev] Shutting down dev stack..."
  [[ -n "${BACKEND_PID:-}" ]] && kill "${BACKEND_PID}" 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "${FRONTEND_PID}" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[dev] Starting backend on ${BACKEND_HOST}:${BACKEND_PORT}..."
pushd "${BACKEND_DIR}" >/dev/null
poetry run litestar --app app.main:create_app run --host "${BACKEND_HOST}" --port "${BACKEND_PORT}" &
BACKEND_PID=$!
popd >/dev/null

echo "[dev] Starting frontend on ${FRONTEND_HOST}:${FRONTEND_PORT} (VITE_API_BASE=${API_BASE_URL})..."
pushd "${FRONTEND_DIR}" >/dev/null
VITE_API_BASE="${API_BASE_URL}" pnpm dev --host "${FRONTEND_HOST}" --port "${FRONTEND_PORT}" &
FRONTEND_PID=$!
popd >/dev/null

echo "[dev] Dev stack is running."
echo "      Backend: http://${BACKEND_HOST}:${BACKEND_PORT}"
echo "      Frontend: http://${FRONTEND_HOST}:${FRONTEND_PORT}"
echo
echo "Press Ctrl+C to stop both services."

wait


