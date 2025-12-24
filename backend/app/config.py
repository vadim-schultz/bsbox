from dataclasses import dataclass
from pathlib import Path


@dataclass
class Settings:
    database_url: str = f"sqlite:///{Path('muda.db').absolute()}"


settings = Settings()
