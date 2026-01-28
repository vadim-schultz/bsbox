#!/bin/bash

# bsbox Docker Production Start Script
# Starts the full stack in production mode.
# Usage: ./start-prod.sh [-d|--detach]
#
# Options:
#   -d, --detach  Run containers in detached mode (background)
#
# Environment variables (can also be set in deployment/.env):
#   NPM_REGISTRY - Custom npm registry URL for corporate networks

set -euo pipefail

# Parse arguments
DETACH=false
if [[ "${1:-}" == "-d" || "${1:-}" == "--detach" ]]; then
    DETACH=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common functions
source "$SCRIPT_DIR/common.sh"

# Load .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

cd "$SCRIPT_DIR/docker"

# Verify Docker prerequisites
check_docker_prerequisites

# Required ports for the services (backend is internal only via nginx)
REQUIRED_PORTS=(80)

# Cleanup function to stop the containers (only for attached mode)
cleanup() {
    echo ""
    echo "Cleaning up containers..."
    docker compose -f compose.yml down || true
}
if [ "$DETACH" = false ]; then
    trap cleanup EXIT
fi

# Check if the required Docker Compose file exists
if [ ! -f "compose.yml" ]; then
    echo "Error: The required compose.yml file was not found."
    exit 1
fi

# Ensure ports are available before starting
ensure_ports_available "${REQUIRED_PORTS[@]}"

export DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
export NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmjs.org/}"
export PYPI_INDEX_URL="${PYPI_INDEX_URL:-https://pypi.org/simple}"
export HTTP_PROXY="${HTTP_PROXY:-}"
export HTTPS_PROXY="${HTTPS_PROXY:-}"
export NO_PROXY="${NO_PROXY:-}"

echo "Starting bsbox in production mode..."
echo ""
echo "Services:"
echo "  - Frontend (via Nginx): http://localhost:80"
echo "  - Backend API: internal (via Nginx proxy)"
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

# Launch Docker Compose with rebuild
if [ "$DETACH" = true ]; then
    echo "Starting in detached mode..."
    echo ""
    docker compose -f compose.yml up -d --build
    echo ""
    echo "Containers started in background."
    echo "To view logs: docker compose -f $SCRIPT_DIR/docker/compose.yml logs -f"
    echo "To stop:      docker compose -f $SCRIPT_DIR/docker/compose.yml down"
else
    echo "Press Ctrl+C to stop all services"
    echo ""
    docker compose -f compose.yml up --build
fi
