ARG DOCKER_REGISTRY=docker.io
ARG NPM_REGISTRY=https://registry.npmjs.org/
ARG HTTP_PROXY=
ARG HTTPS_PROXY=
ARG NO_PROXY=

FROM ${DOCKER_REGISTRY}/node:20

# Re-declare ARGs after FROM (they don't persist across stages)
ARG NPM_REGISTRY
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

WORKDIR /app/frontend

# Set proxy environment variables (both uppercase and lowercase for compatibility)
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    http_proxy=${HTTP_PROXY} \
    https_proxy=${HTTPS_PROXY} \
    no_proxy=${NO_PROXY} \
    NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# Configure npm registry and scoped registries (overridable via ARG/ENV)
RUN npm config set registry "$NPM_CONFIG_REGISTRY" && \
    npm config set @rollup:registry "$NPM_CONFIG_REGISTRY" && \
    npm config set @esbuild:registry "$NPM_CONFIG_REGISTRY"

# Default: run Vite dev server with deterministic install
# We check for rollup native binaries both before AND after install to handle:
# 1. Platform mismatch from persisted volume (pre-check)
# 2. npm optional dependencies bug where wrong binaries are installed (post-check)
CMD ["sh", "-c", "set -e \
    && npm config set registry \"$NPM_CONFIG_REGISTRY\" \
    && npm config set @rollup:registry \"$NPM_CONFIG_REGISTRY\" \
    && npm config set @esbuild:registry \"$NPM_CONFIG_REGISTRY\" \
    && cd /app/frontend \
    && if [ -d node_modules/@rollup ] && [ ! -d node_modules/@rollup/rollup-linux-x64-gnu ]; then \
         echo 'Pre-install: Detected platform mismatch (wrong rollup binaries). Cleaning...'; \
         rm -rf node_modules/* node_modules/.[!.]* 2>/dev/null || true; \
       fi \
    && (npm ci --verbose || { echo 'npm ci failed, trying npm install'; rm -rf node_modules/* node_modules/.[!.]* 2>/dev/null || true; rm -f package-lock.json; npm install --verbose; }) \
    && if [ ! -d node_modules/@rollup/rollup-linux-x64-gnu ]; then \
         echo 'Post-install: Missing linux binaries (npm optional deps bug). Reinstalling...'; \
         rm -rf node_modules/* node_modules/.[!.]* 2>/dev/null || true; \
         rm -f package-lock.json; \
         npm install --verbose; \
       fi \
    && npm run dev -- --host 0.0.0.0 --port 5173"]
