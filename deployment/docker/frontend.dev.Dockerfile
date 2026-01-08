ARG DOCKER_REGISTRY=docker.io
ARG NPM_REGISTRY=https://registry.npmjs.org/

FROM ${DOCKER_REGISTRY}/node:20

WORKDIR /app/frontend

ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# Install system deps (include lsof/ss/fuser for port freeing)
RUN apt-get update && apt-get install -y git lsof iproute2 psmisc && apt-get clean

# Configure npm registry and scoped registries (overridable via ARG/ENV)
RUN npm config set registry "$NPM_CONFIG_REGISTRY" && \
    npm config set @rollup:registry "$NPM_CONFIG_REGISTRY" && \
    npm config set @esbuild:registry "$NPM_CONFIG_REGISTRY"

# Default: run Vite dev server with deterministic install
CMD ["sh", "-c", "set -e \
    && npm config set registry \"$NPM_CONFIG_REGISTRY\" \
    && npm config set @rollup:registry \"$NPM_CONFIG_REGISTRY\" \
    && npm config set @esbuild:registry \"$NPM_CONFIG_REGISTRY\" \
    && cd /app/frontend \
    && (npm ci --verbose || { echo 'npm ci failed; cleaning node_modules and retrying npm install'; rm -rf node_modules package-lock.json; npm install --verbose; }) \
    && npm run dev -- --host 0.0.0.0 --port 5173"]
