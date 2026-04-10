from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import Gender, ApprovalStatus


class DateDisplay(BaseModel):
    ad: date | None = None
    bs: str | None = None


class PersonCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=255)
    middle_name: str | None = None
    last_name: str | None = None
    first_name_devanagari: str | None = None
    middle_name_devanagari: str | None = None
    last_name_devanagari: str | None = None
    dob: date | None = None
    dod: date | None = None
    place_of_birth: str | None = None
    current_address: str | None = None
    occupation: str | None = None
    gender: Gender
    is_alive: bool = True


class PersonUpdate(BaseModel):
    first_name: str | None = None
    middle_name: str | None = None
    last_name: str | None = None
    first_name_devanagari: str | None = None
    middle_name_devanagari: str | None = None
    last_name_devanagari: str | None = None
    dob: date | None = None
    dod: date | None = None
    place_of_birth: str | None = None
    current_address: str | None = None
    occupation: str | None = None
    gender: Gender | None = None
    is_alive: bool | None = None
    comment: str = Field(..., min_length=1, description="Mandatory comment for revision tracking")


class VisibilitySettings(BaseModel):
    dob: bool = True
    address: bool = True
    phone: bool = True
    email: bool = True


class PersonResponse(BaseModel):
    id: int
    generation: int
    first_name: str
    middle_name: str | None
    last_name: str | None
    first_name_devanagari: str | None
    middle_name_devanagari: str | None
    last_name_devanagari: str | None
    dob: DateDisplay | None
    dod: DateDisplay | None
    place_of_birth: str | None
    current_address: str | None
    occupation: str | None
    gender: Gender
    is_alive: bool
    photo_url: str | None
    status: ApprovalStatus
    visibility_settings: VisibilitySettings
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
