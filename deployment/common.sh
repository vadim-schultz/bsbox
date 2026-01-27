#!/bin/bash

# bsbox Deployment Common Functions
# Shared utilities for start-dev.sh and start-prod.sh
# Source this file: source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# Check Docker prerequisites before proceeding
check_docker_prerequisites() {
    echo "Checking Docker prerequisites..."

    # Check Docker
    if ! command -v docker >/dev/null 2>&1; then
        echo "Error: Docker is not installed"
        exit 1
    fi

    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        echo "Error: Docker daemon is not running"
        exit 1
    fi

    # Check Docker Compose
    if ! docker compose version >/dev/null 2>&1; then
        echo "Error: Docker Compose is not available"
        exit 1
    fi

    echo "Docker prerequisites OK"
    echo ""
}

# Function to check and free a port (works on systems with lsof OR ss)
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
# Usage: ensure_ports_available 5432 8000 5173
ensure_ports_available() {
    local ports=("$@")
    echo "Checking required ports..."
    for port in "${ports[@]}"; do
        free_port "$port"
    done
    echo "All ports are available."
    echo ""
}
