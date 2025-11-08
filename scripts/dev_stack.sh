#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
API_BASE_URL="${API_BASE_URL:-http://${BACKEND_HOST}:${BACKEND_PORT}/api}"

ensure_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found in PATH" >&2
    exit 1
  fi
}

ensure_command poetry
ensure_command corepack

cd "${PROJECT_ROOT}"

echo "[dev] Installing backend dependencies via Poetry..."
poetry install --sync

echo "[dev] Installing frontend dependencies via pnpm..."
pushd "${PROJECT_ROOT}/frontend" >/dev/null
corepack enable
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
poetry run litestar --app app.main:create_app run --host "${BACKEND_HOST}" --port "${BACKEND_PORT}" &
BACKEND_PID=$!

echo "[dev] Starting frontend on ${FRONTEND_HOST}:${FRONTEND_PORT} (VITE_API_BASE=${API_BASE_URL})..."
pushd "${PROJECT_ROOT}/frontend" >/dev/null
VITE_API_BASE="${API_BASE_URL}" pnpm dev --host "${FRONTEND_HOST}" --port "${FRONTEND_PORT}" &
FRONTEND_PID=$!
popd >/dev/null

echo "[dev] Dev stack is running."
echo "      Backend: http://${BACKEND_HOST}:${BACKEND_PORT}"
echo "      Frontend: http://${FRONTEND_HOST}:${FRONTEND_PORT}"
echo
echo "Press Ctrl+C to stop both services."

wait


