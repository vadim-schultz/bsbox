# Production Dockerfile for backend
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy backend directory
COPY backend /app/backend
# .git/ is required for version resolution if using setuptools-scm
COPY .git /app/.git

# Create venv and install package
RUN python3 -m venv /app/venv && \
    . /app/venv/bin/activate && \
    pip install --no-cache-dir /app/backend/

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy venv from builder
COPY --from=builder /app/venv /app/venv
COPY --from=builder /app/backend /app/backend

# Expose the port the app runs on
EXPOSE 8000

# Run migrations and start the app
ENTRYPOINT ["/bin/bash", "-c"]
CMD [". /app/venv/bin/activate && cd /app/backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
