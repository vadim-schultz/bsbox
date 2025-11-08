from __future__ import annotations

from collections.abc import AsyncIterator

from redis.asyncio import Redis

from .config import Settings

_redis_cache: dict[str, Redis] = {}


async def get_redis(settings: Settings) -> Redis:
    if settings.redis_url not in _redis_cache:
        _redis_cache[settings.redis_url] = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
        )
    return _redis_cache[settings.redis_url]


async def redis_dependency(settings: Settings) -> AsyncIterator[Redis]:
    redis = await get_redis(settings)
    try:
        yield redis
    finally:
        # keep connection open for reuse
        pass

