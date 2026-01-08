FROM node:20-slim

WORKDIR /app/frontend

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# NPM registry configuration (optional, for corporate networks)
ARG NPM_REGISTRY=""
RUN if [ -n "$NPM_REGISTRY" ]; then \
        npm config set registry "$NPM_REGISTRY"; \
    fi

# Global tools (Vite, TS)
RUN npm install -g typescript vite

# Default: run Vite dev server
CMD ["sh", "-c", "npm install && npm run dev -- --host 0.0.0.0 --port 5173"]
