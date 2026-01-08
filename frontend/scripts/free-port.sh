#!/usr/bin/env bash
set -eu  # avoid pipefail for shells that don't support it

PORT="${1:-}"
if [[ -z "$PORT" ]]; then
  echo "Usage: $0 <port>"
  exit 1
fi

freed=false

if command -v lsof >/dev/null 2>&1; then
  pid=$(lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "${pid:-}" ]]; then
    echo "Port $PORT is in use by PID $pid. Killing process..."
    kill -9 "$pid" 2>/dev/null || true
    freed=true
    sleep 1
  fi
elif command -v ss >/dev/null 2>&1; then
  pid=$(ss -ltnp 2>/dev/null | awk -v p=":$PORT" '$4 ~ p {print $6}' | cut -d, -f2 | head -n1)
  if [[ -n "${pid:-}" ]]; then
    echo "Port $PORT is in use by PID $pid. Killing process..."
    kill -9 "$pid" 2>/dev/null || true
    freed=true
    sleep 1
  fi
fi

# Fallback: aggressively free port if still taken (WSL/Linux only)
if command -v fuser >/dev/null 2>&1; then
  if fuser "$PORT"/tcp >/dev/null 2>&1; then
    echo "Port $PORT still in use; killing via fuser..."
    fuser -k "$PORT"/tcp >/dev/null 2>&1 || true
    freed=true
    sleep 1
  fi
fi

if [[ "$freed" == false ]]; then
  echo "Port $PORT is available."
fi
