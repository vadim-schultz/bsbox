import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Configure application logging.

    Should be called after any third-party logging setup (e.g., Alembic)
    to ensure app loggers are properly configured.
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    # Configure the app logger hierarchy
    app_logger = logging.getLogger("app")
    app_logger.setLevel(log_level)

    # Only add handler if not already present
    if not app_logger.handlers:
        handler = logging.StreamHandler(sys.stderr)
        handler.setLevel(log_level)
        formatter = logging.Formatter(
            "%(levelname)-5.5s [%(name)s] %(message)s"
        )
        handler.setFormatter(formatter)
        app_logger.addHandler(handler)

    # Prevent propagation to root (which is WARN) if we have our own handler
    app_logger.propagate = False

