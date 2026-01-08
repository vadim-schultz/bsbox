# Production Dockerfile for frontend
ARG DOCKER_REGISTRY=docker.io
ARG NPM_REGISTRY=https://registry.npmjs.org/

# Stage 1: Build the frontend
FROM ${DOCKER_REGISTRY}/node:20-slim AS build
ARG NPM_REGISTRY

# Install necessary packages for git
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN if [ -n "$NPM_REGISTRY" ]; then \
        npm config set registry "$NPM_REGISTRY"; \
    fi

# Copy frontend directory
COPY frontend /app/frontend

# Install dependencies and build package
WORKDIR /app/frontend
RUN npm install -g typescript vite && \
    npm install && \
    npm run build

# Stage 2: Serve with Nginx
FROM ${DOCKER_REGISTRY}/nginx:alpine

# Copy the build output to the Nginx HTML directory
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY deployment/docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
