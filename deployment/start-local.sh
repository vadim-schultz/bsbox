#!/bin/bash

# bsbox Local Quick Start Script
# Starts the backend API (8000) and frontend dev server (5173) together.
# Usage: ./start-local.sh [--no-install] [--no-migrate]
# Prereqs: bash, python3, npm, and access to the internet for dependency install.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

NO_INSTALL=false
NO_MIGRATE=false

usage() {
  echo "Usage: $0 [--no-install] [--no-migrate]"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --no-install) NO_INSTALL=true ;;
      --no-migrate) NO_MIGRATE=true ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
    shift
  done
}

ensure_prereqs() {
  if [[ ! -d "backend" || ! -d "frontend" ]]; then
    echo "Error: backend/ and frontend/ directories not found in project root."
    exit 1
  fi

  PY_BIN="${PYTHON:-python3}"
  if ! command -v "$PY_BIN" >/dev/null 2>&1; then
    PY_BIN="python"
  fi
  if ! command -v "$PY_BIN" >/dev/null 2>&1; then
    echo "python3 (or python) is required but was not found on PATH."
    exit 1
  fi
  PYTHON_BIN="$PY_BIN"

  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required but was not found on PATH."
    exit 1
  fi
}

ensure_venv() {
  VENV_PATH="backend/.venv"
  if [[ ! -d "$VENV_PATH" ]]; then
    echo "Creating backend virtual environment..."
    "$PYTHON_BIN" -m venv "$VENV_PATH"
  fi
}

activate_venv() {
  source "$VENV_PATH/bin/activate"
}

install_backend_deps() {
  if [[ "$NO_INSTALL" == true ]]; then
    echo "Skipping backend dependency install (--no-install)"
    return
  fi
  echo "Upgrading pip..."
  pip install --upgrade pip --quiet

  echo "Installing backend dependencies..."
  pushd backend >/dev/null
  pip install -e . --quiet
  popd >/dev/null
}

install_frontend_deps() {
  if [[ "$NO_INSTALL" == true ]]; then
    echo "Skipping frontend dependency install (--no-install)"
    return
  fi
  echo "Installing frontend dependencies..."
  pushd frontend >/dev/null
  if [[ ! -d "node_modules" ]] || [[ ! -f "node_modules/.bin/vite" ]]; then
    if ! npm install; then
      echo "   (npm install failed, cleaning node_modules and retrying...)"
      rm -rf node_modules package-lock.json
      npm install
    fi
  else
    echo "   (dependencies already installed)"
  fi
  popd >/dev/null
}

run_migrations() {
  if [[ "$NO_MIGRATE" == true ]]; then
    echo "Skipping migrations (--no-migrate)"
    return
  fi
  echo "Applying database migrations..."
  pushd backend >/dev/null
  alembic upgrade head
  popd >/dev/null
}

start_backend() {
  pushd backend >/dev/null
  "$PROJECT_ROOT/$VENV_PATH/bin/uvicorn" app.main:app --host "$HOST" --port "$PORT" --reload &
  PIDS+=("$!")
  popd >/dev/null
}

start_frontend() {
  pushd frontend >/dev/null
  npm run dev -- --port "$FRONTEND_PORT" --host "$FRONTEND_HOST" &
  PIDS+=("$!")
  popd >/dev/null
}

cleanup() {
  if [[ ${#PIDS[@]} -gt 0 ]]; then
    echo ""
    echo "Stopping services..."
    kill "${PIDS[@]}" 2>/dev/null || true
  fi
}

main() {
  echo "Starting bsbox..."
  echo ""

  parse_args "$@"
  ensure_prereqs
  ensure_venv
  activate_venv
  install_backend_deps
  install_frontend_deps
  run_migrations

  HOST="${HOST:-0.0.0.0}"
  PORT="${PORT:-8000}"
  FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
  FRONTEND_PORT="${FRONTEND_PORT:-5173}"

  echo ""
  echo "Setup complete!"
  echo "Starting services..."
  echo "  - Backend API:  http://${HOST}:${PORT}"
  echo "  - Frontend dev: http://${FRONTEND_HOST}:${FRONTEND_PORT}"
  echo ""
  echo "Press Ctrl+C to stop both frontend and backend"
  echo ""

  PIDS=()
  trap cleanup EXIT
  start_backend
  start_frontend

  for pid in "${PIDS[@]}"; do
    wait "$pid"
  done
}

main "$@"
