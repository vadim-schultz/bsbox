#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
VENV_DIR="${BACKEND_DIR}/.venv"

cd "${BACKEND_DIR}"

if [[ ! -d "${VENV_DIR}" ]]; then
  python3 -m venv "${VENV_DIR}"
fi
source "${VENV_DIR}/bin/activate"

pip install --quiet --upgrade pip >/dev/null
pip install --quiet -e . >/dev/null

alembic upgrade head

cd "${FRONTEND_DIR}"
npm install --silent
npm run build

cd "${ROOT_DIR}"

echo "[deploy] Build complete. Frontend assets available in frontend/dist"
