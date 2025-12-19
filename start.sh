#!/usr/bin/env bash

# Muda Meter Quick Start Script
# Builds the frontend, initializes the backend (DB included), and starts the server.
# Usage: ./start.sh
# Prereqs: bash, python3, npm, and access to the internet for dependency install.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Muda Meter..."
echo ""

if [[ ! -d "backend" || ! -d "frontend" ]]; then
  echo "❌ Error: run this script from the repository root (backend/ and frontend/ required)."
  exit 1
fi

# Select python executable
PY_BIN="${PYTHON:-python3}"
if ! command -v "$PY_BIN" >/dev/null 2>&1; then
  PY_BIN="python"
fi
if ! command -v "$PY_BIN" >/dev/null 2>&1; then
  echo "❌ python3 (or python) is required but was not found on PATH."
  exit 1
fi

VENV_PATH="backend/.venv"
if [[ ! -d "$VENV_PATH" ]]; then
  echo "📦 Creating backend virtual environment..."
  "$PY_BIN" -m venv "$VENV_PATH"
fi

echo "📦 Installing backend dependencies..."
source "$VENV_PATH/bin/activate"
pushd backend >/dev/null
pip install -e .
popd >/dev/null

echo "📦 Installing frontend dependencies..."
pushd frontend >/dev/null
if [[ ! -d "node_modules" ]]; then
  npm install
fi

echo "🔨 Building frontend..."
npm run build
popd >/dev/null

echo "🗄️  Applying database migrations..."
pushd backend >/dev/null
alembic upgrade head
popd >/dev/null

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"

echo ""
echo "✅ Setup complete!"
echo "Starting backend server..."
echo "  - Full Stack App: http://${HOST}:${PORT}"
echo "  - API Docs (if enabled): http://${HOST}:${PORT}/schema"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd backend
exec uvicorn app.main:app --host "$HOST" --port "$PORT" --reload

