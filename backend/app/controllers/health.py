from litestar import get


@get("/health", sync_to_thread=False)
def health_check() -> dict:
    """Health check endpoint for container orchestration."""
    return {"status": "ok"}
