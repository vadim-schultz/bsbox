from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.db_utils import get_dialect


def _get_connect_args() -> dict:
    """Return dialect-specific connection arguments."""
    if get_dialect() == "sqlite":
        return {"check_same_thread": False, "timeout": 30}
    return {}


engine = create_engine(
    settings.database_url,
    echo=False,
    future=True,
    connect_args=_get_connect_args(),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def provide_session() -> Generator[Session, None, None]:
    """Litestar dependency to provide a SQLAlchemy session per request."""
    session: Session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
