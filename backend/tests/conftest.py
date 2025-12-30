import sys
from pathlib import Path

import pytest
from litestar import Litestar
from litestar.di import Provide
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.controllers import MeetingsController, VisitsController  # noqa: E402
from app.dependencies import dependencies as app_dependencies  # noqa: E402
from app.migrations import run_migrations  # noqa: E402


@pytest.fixture()
def test_engine():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    run_migrations(engine)
    return engine


@pytest.fixture()
def session_factory(test_engine):
    return sessionmaker(bind=test_engine, autoflush=False, autocommit=False, future=True)


@pytest.fixture()
def provide_test_session(session_factory):
    def _provider():
        session = session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    return _provider


@pytest.fixture()
def app(provide_test_session) -> Litestar:
    return Litestar(
        route_handlers=[MeetingsController, VisitsController],
        dependencies={"session": Provide(provide_test_session), **app_dependencies},
    )
