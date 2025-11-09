from pathlib import Path

from litestar import Litestar
from litestar.di import Provide
from litestar.static_files import StaticFilesConfig

from .config.settings import Settings, get_settings
from .controllers.meeting_controller import MeetingController
from .database import session_dependency
from .services.meeting_service import provide_meeting_service
from .utils.lifespan import lifespan

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def create_app(settings: Settings | None = None) -> Litestar:
    current_settings = settings or get_settings()

    static_configs: list[StaticFilesConfig] = []
    if FRONTEND_DIST.exists():
        static_configs.append(
            StaticFilesConfig(
                path="/",
                directories=[FRONTEND_DIST],
                html_mode=True,
            )
        )

    return Litestar(
        route_handlers=[MeetingController],
        lifespan=[lifespan(current_settings)],
        dependencies={
            "settings": Provide(lambda: current_settings),
            "session": Provide(session_dependency),
            "meeting_service": Provide(provide_meeting_service),
        },
        static_files_config=static_configs or None,
    )

