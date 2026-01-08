#!/bin/bash

# bsbox Docker Production Start Script
# Starts the full stack in production mode.
# Usage: ./start-prod.sh
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
REQUIRED_PORTS=(80 8000)

# Function to check and free a port
free_port() {
    local port=$1
    local pid

    # Try to find process using the port (works on Linux)
    pid=$(lsof -t -i:"$port" 2>/dev/null || true)

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
    docker compose -f compose.yml down || true
}
trap cleanup EXIT

# Check if the required Docker Compose file exists
if [ ! -f "compose.yml" ]; then
    echo "Error: The required compose.yml file was not found."
    exit 1
fi

# Ensure ports are available before starting
ensure_ports_available

export DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
export NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmjs.org/}"
export PYPI_INDEX_URL="${PYPI_INDEX_URL:-https://pypi.org/simple}"

echo "Starting bsbox in production mode..."
echo ""
echo "Services:"
echo "  - Frontend (via Nginx): http://localhost:80"
echo "  - Backend API: http://localhost:8000"
echo "  - PostgreSQL: internal only"
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
echo "Press Ctrl+C to stop all services"
echo ""

# Launch Docker Compose with rebuild
docker compose -f compose.yml up --build
