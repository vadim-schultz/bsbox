from __future__ import annotations

from sqlmodel import SQLModel


class BaseModel(SQLModel):
    """Base SQLModel to inherit common config."""

    class Config:
        arbitrary_types_allowed = True
        validate_assignment = True


__all__ = ["BaseModel", "SQLModel"]

