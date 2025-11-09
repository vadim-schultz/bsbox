#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
VENV_DIR="${BACKEND_DIR}/.venv"
PORT="${BACKEND_PORT:-8000}"
HOST="${BACKEND_HOST:-127.0.0.1}"

cd "${BACKEND_DIR}"

if [[ ! -d "${VENV_DIR}" ]]; then
  echo "[dev-backend] Creating virtual environment at ${VENV_DIR}"
  python3 -m venv "${VENV_DIR}"
fi

source "${VENV_DIR}/bin/activate"

pip install --quiet --upgrade pip >/dev/null
pip install --quiet -e . >/dev/null

export PYTHONPATH="${BACKEND_DIR}:${PYTHONPATH:-}"

exec uvicorn app.main:create_app --host "${HOST}" --port "${PORT}" --reload
