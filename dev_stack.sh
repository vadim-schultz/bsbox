#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
API_BASE_URL="${API_BASE_URL:-http://${BACKEND_HOST}:${BACKEND_PORT}}"
PS_BIN="$(command -v ps)"

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
poetry install --no-root
popd >/dev/null

export PYTHONPATH="${BACKEND_DIR}:${PYTHONPATH:-}"

install_frontend_dependencies() {
  corepack enable
  pushd "${FRONTEND_DIR}" >/dev/null

  if [[ -z "${DEV_REFRESH_FRONTEND:-}" && -d node_modules/.pnpm ]]; then
    echo "[dev] Frontend dependencies already installed; skipping pnpm install (set DEV_REFRESH_FRONTEND=1 to force)."
    popd >/dev/null
    return
  fi

  echo "[dev] Installing frontend dependencies via pnpm..."
  local pnpm_args=(install --frozen-lockfile)
  if [[ -n "${DEV_PNPM_FORCE:-}" ]]; then
    pnpm_args+=(--force)
  fi

  if ! pnpm "${pnpm_args[@]}"; then
    echo "Error: pnpm install failed. Try setting DEV_PNPM_FORCE=1 or DEV_REFRESH_FRONTEND=1 and rerun." >&2
    popd >/dev/null
    exit 1
  fi

  popd >/dev/null
}

install_frontend_dependencies

capture_pgid() {
  local pid="$1"
  local var_name="$2"

  if [[ -z "${pid:-}" || -z "${PS_BIN:-}" ]]; then
    return
  fi

  local pgid
  pgid="$("${PS_BIN}" -o pgid= -p "${pid}" 2>/dev/null | tr -d ' ' || true)"
  if [[ -n "${pgid}" ]]; then
    printf -v "${var_name}" "%s" "${pgid}"
  fi
}

terminate_process_group() {
  local pid="$1"
  local pgid="$2"

  if [[ -n "${pgid:-}" ]]; then
    kill -"${pgid}" 2>/dev/null || true
  elif [[ -n "${pid:-}" ]]; then
    kill "${pid}" 2>/dev/null || true
  fi
}

wait_on_pid() {
  local pid="$1"
  if [[ -n "${pid:-}" ]]; then
    wait "${pid}" 2>/dev/null || true
  fi
}

cleanup() {
  echo
  echo "[dev] Shutting down dev stack..."
  terminate_process_group "${BACKEND_PID:-}" "${BACKEND_PGID:-}"
  terminate_process_group "${FRONTEND_PID:-}" "${FRONTEND_PGID:-}"
  wait_on_pid "${BACKEND_PID:-}"
  wait_on_pid "${FRONTEND_PID:-}"
}
trap cleanup EXIT INT TERM

echo "[dev] Starting backend on ${BACKEND_HOST}:${BACKEND_PORT}..."
pushd "${BACKEND_DIR}" >/dev/null
poetry run litestar --app app.main:create_app run --host "${BACKEND_HOST}" --port "${BACKEND_PORT}" &
BACKEND_PID=$!
capture_pgid "${BACKEND_PID}" BACKEND_PGID
popd >/dev/null

echo "[dev] Starting frontend on ${FRONTEND_HOST}:${FRONTEND_PORT} (VITE_API_BASE=${API_BASE_URL})..."
pushd "${FRONTEND_DIR}" >/dev/null
VITE_API_BASE="${API_BASE_URL}" pnpm dev --host "${FRONTEND_HOST}" --port "${FRONTEND_PORT}" &
FRONTEND_PID=$!
capture_pgid "${FRONTEND_PID}" FRONTEND_PGID
popd >/dev/null

echo "[dev] Dev stack is running."
echo "      Backend: http://${BACKEND_HOST}:${BACKEND_PORT}"
echo "      Frontend: http://${FRONTEND_HOST}:${FRONTEND_PORT}"
echo
echo "Press Ctrl+C to stop both services."

wait


