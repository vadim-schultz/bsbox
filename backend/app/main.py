from litestar import Litestar
from litestar.di import Provide

from .cache import redis_dependency
from .config.settings import Settings, get_settings
from .controllers.meeting_controller import MeetingController
from .database import session_dependency
from .services.meeting_service import provide_meeting_service
from .utils.lifespan import lifespan


def create_app(settings: Settings | None = None) -> Litestar:
    current_settings = settings or get_settings()

    return Litestar(
        route_handlers=[MeetingController],
        lifespan=[lifespan(current_settings)],
        dependencies={
            "settings": Provide(lambda: current_settings),
            "session": Provide(session_dependency),
            "redis": Provide(redis_dependency),
            "meeting_service": Provide(provide_meeting_service),
        },
    )

