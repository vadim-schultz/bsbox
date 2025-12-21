from pydantic import BaseModel, ConfigDict, Field, field_validator


class MeetingRoomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    city_id: str


class MeetingRoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    city_id: str

    @field_validator("name")
    @classmethod
    def _trim_and_validate(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("name cannot be empty")
        return cleaned
