#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
VENV_DIR="${BACKEND_DIR}/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"

cd "${BACKEND_DIR}"

if [[ ! -d "${VENV_DIR}" ]]; then
  echo "[deploy] Creating virtual environment via ${PYTHON_BIN}"
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi

source "${VENV_DIR}/bin/activate"

pip install --upgrade pip
pip install -e .

alembic upgrade head

echo "[deploy] Backend dependencies installed and database migrated"

cd "${FRONTEND_DIR}"
npm install --omit=dev
npm run build

echo "[deploy] Frontend assets built at frontend/dist"

echo "[deploy] To run the server:"
echo "  source ${VENV_DIR}/bin/activate && uvicorn app.main:create_app --host 0.0.0.0 --port 8000"
