FROM python:3.11-slim

# Use ARG variables to capture the user ID from the build command
ARG USER_ID=1000
ARG GROUP_ID=1000

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for development
# The UID and GID will be passed at build time from the host machine
RUN groupadd --gid $GROUP_ID devuser && \
    useradd --uid $USER_ID --gid $GROUP_ID --shell /bin/bash --create-home devuser

# Switch to the non-root user
USER devuser

WORKDIR /app

# Create venv for development
RUN python3 -m venv /app/venv

# Default command: run in dev with autoreload
CMD ["/bin/bash", "-c", ". /app/venv/bin/activate && pip install -e ./backend && cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/backend/app"]
