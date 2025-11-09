from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel import SQLModel

from .config import Settings

_engine_factory: dict[str, AsyncEngine] = {}
_session_factory: dict[str, async_sessionmaker[AsyncSession]] = {}


def get_engine(settings: Settings) -> AsyncEngine:
    if settings.database_url not in _engine_factory:
        _engine_factory[settings.database_url] = create_async_engine(
            settings.database_url,
            echo=settings.environment == "development",
        )
    return _engine_factory[settings.database_url]


def get_session_factory(settings: Settings) -> async_sessionmaker[AsyncSession]:
    if settings.database_url not in _session_factory:
        engine = get_engine(settings)
        _session_factory[settings.database_url] = async_sessionmaker(
            bind=engine,
            expire_on_commit=False,
        )
    return _session_factory[settings.database_url]


async def init_models(settings: Settings) -> None:
    engine = get_engine(settings)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def session_dependency(settings: Settings) -> AsyncIterator[AsyncSession]:
    factory = get_session_factory(settings)
    async with factory() as session:
        yield session
