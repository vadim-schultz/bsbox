from pathlib import Path

from litestar import Litestar, get
from litestar.di import Provide
from litestar.static_files import create_static_files_router

from app.controllers import (
    MeetingsController,
    UsersController,
    VisitsController,
    CitiesController,
    MeetingRoomsController,
)
from app.controllers.realtime import meeting_stream
from app.dependencies import dependencies as app_dependencies
from app.db import provide_session
from app.logging_config import configure_logging
from app.migrations import run_migrations_on_startup


def setup_logging(app: object | None = None) -> None:
    """Litestar startup hook to configure application logging."""
    configure_logging()


def _static_routes():
    project_root = Path(__file__).resolve().parent.parent.parent
    dist_dir = project_root / "frontend" / "dist"
    if not dist_dir.exists():
        return []

    return [
        create_static_files_router(
            path="/assets",
            directories=[dist_dir / "assets"],
            name="static-assets",
            html_mode=False,
        ),
        # Note: Root static router is disabled in dev mode because it can
        # interfere with API routes when html_mode=True catches all paths.
        # For production, the frontend is served from a separate process.
    ]


def create_app() -> Litestar:
    return Litestar(
        route_handlers=[
            MeetingsController,
            UsersController,
            VisitsController,
            CitiesController,
            MeetingRoomsController,
            meeting_stream,
            *_static_routes(),
        ],
        dependencies={"session": Provide(provide_session), **app_dependencies},
        on_startup=[run_migrations_on_startup, setup_logging],
    )


app = create_app()

