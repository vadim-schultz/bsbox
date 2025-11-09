from pathlib import Path

from typing import Any, cast

from litestar import Litestar
from litestar.di import Provide
from litestar.static_files import create_static_files_router
from litestar.types import LifespanHook

from .config.settings import Settings, get_settings
from .controllers.meeting_controller import MeetingController
from .database import session_dependency
from .services.meeting_service import provide_meeting_service
from .utils.lifespan import lifespan

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def create_app(settings: Settings | None = None) -> Litestar:
    current_settings = settings or get_settings()

    route_handlers: list[Any] = [MeetingController]
    if FRONTEND_DIST.exists():
        route_handlers.append(
            create_static_files_router(
                path="/",
                directories=[FRONTEND_DIST],
                html_mode=True,
            )
        )

    lifespan_handler: LifespanHook = lifespan(current_settings)

    return Litestar(
        route_handlers=route_handlers,
        lifespan=[cast(Any, lifespan_handler)],
        dependencies={
            "settings": Provide(lambda: current_settings, sync_to_thread=False),
            "session": Provide(session_dependency, sync_to_thread=False),
            "meeting_service": Provide(provide_meeting_service, sync_to_thread=False),
        },
    )
