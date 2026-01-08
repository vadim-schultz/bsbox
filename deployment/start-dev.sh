#!/bin/bash

# bsbox Docker Development Start Script
# Starts the full stack in development mode with hot-reloading.
# Usage: ./start-dev.sh
#
# Environment variables (can also be set in deployment/.env):
#   NPM_REGISTRY - Custom npm registry URL for corporate networks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

cd "$SCRIPT_DIR/docker"

# Required ports for the services
REQUIRED_PORTS=(5432 8000 5173)

# Function to check and free a port
free_port() {
    local port=$1
    local pid

    # Try to find process using the port (Linux/WSL)
    if command -v lsof >/dev/null 2>&1; then
        pid=$(lsof -t -i:"$port" 2>/dev/null || true)
    elif command -v ss >/dev/null 2>&1; then
        pid=$(ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print $6}' | cut -d, -f2 | head -n1)
    else
        pid=""
    fi

    if [ -n "$pid" ]; then
        echo "Port $port is in use by PID $pid. Killing process..."
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi

    # Also check for Docker containers using the port
    local container
    container=$(docker ps --filter "publish=$port" --format "{{.Names}}" 2>/dev/null || true)
    if [ -n "$container" ]; then
        echo "Port $port is in use by container '$container'. Stopping container..."
        docker stop "$container" 2>/dev/null || true
        sleep 1
    fi
}

# Ensure required ports are available
ensure_ports_available() {
    echo "Checking required ports..."
    for port in "${REQUIRED_PORTS[@]}"; do
        free_port "$port"
    done
    echo "All ports are available."
    echo ""
}

# Cleanup function to stop the containers
cleanup() {
    echo ""
    echo "Cleaning up containers..."
    docker compose -f compose.dev.yml down || true
}
trap cleanup EXIT

# Check if the required Docker Compose file exists
if [ ! -f "compose.dev.yml" ]; then
    echo "Error: The required compose.dev.yml file was not found."
    exit 1
fi

# Ensure ports are available before starting
ensure_ports_available

# Get the current user's UID and GID for bind mount permissions
if command -v id >/dev/null 2>&1; then
    DEV_UID=$(id -u)
    DEV_GID=$(id -g)
else
    DEV_UID=${DEV_UID:-1000}
    DEV_GID=${DEV_GID:-1000}
fi

# Export the variables so they are available to Docker Compose
export DEV_UID
export DEV_GID
export DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
export NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmjs.org/}"
export PYPI_INDEX_URL="${PYPI_INDEX_URL:-https://pypi.org/simple}"

echo "Starting bsbox in development mode..."
echo ""
echo "Using Host UID: $DEV_UID"
echo "Using Host GID: $DEV_GID"
if [ "$DOCKER_REGISTRY" != "docker.io" ]; then
    echo "Using Docker Registry: $DOCKER_REGISTRY"
fi
if [ "$NPM_REGISTRY" != "https://registry.npmjs.org/" ]; then
    echo "Using NPM Registry: $NPM_REGISTRY"
fi
if [ "$PYPI_INDEX_URL" != "https://pypi.org/simple" ]; then
    echo "Using PyPI Index: $PYPI_INDEX_URL"
fi
echo ""
echo "Services:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend:  http://localhost:8000"
echo "  - PostgreSQL: localhost:5432"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Launch Docker Compose with rebuild
docker compose -f compose.dev.yml up --build
