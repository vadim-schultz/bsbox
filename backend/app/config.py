import os
from dataclasses import dataclass, field
from pathlib import Path


def _default_database_url() -> str:
    return os.environ.get("DATABASE_URL", f"sqlite:///{Path('bsbox.db').absolute()}")


@dataclass
class Settings:
    database_url: str = field(default_factory=_default_database_url)


settings = Settings()
