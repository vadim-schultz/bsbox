# Production Dockerfile for frontend
ARG DOCKER_REGISTRY=docker.io
ARG NPM_REGISTRY=https://registry.npmjs.org/
ARG HTTP_PROXY=
ARG HTTPS_PROXY=
ARG NO_PROXY=

# Stage 1: Build the frontend
FROM ${DOCKER_REGISTRY}/node:20-slim AS build
ARG NPM_REGISTRY
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

# Set proxy environment variables (both uppercase and lowercase for compatibility)
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    http_proxy=${HTTP_PROXY} \
    https_proxy=${HTTPS_PROXY} \
    no_proxy=${NO_PROXY}

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

# Set API base URL for production (nginx expects /api prefix)
ENV VITE_API_BASE=/api

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
