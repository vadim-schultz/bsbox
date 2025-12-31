"""Base classes and mixins for Pydantic schemas."""

from pydantic import field_validator


class NameValidatorMixin:
    """Mixin providing name field trimming and validation.

    Use with Pydantic models that have a 'name' field requiring
    whitespace trimming and non-empty validation.
    """

    @field_validator("name")
    @classmethod
    def _trim_and_validate(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("name cannot be empty")
        return cleaned

