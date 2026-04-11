from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import RelationshipType, MarriageStatus, ApprovalStatus


class RelationshipCreate(BaseModel):
    person_a_id: int
    person_b_id: int
    type: RelationshipType
    marriage_status: MarriageStatus | None = None
    child_birth_order: int | None = None
    marriage_id: int | None = None  # For parent_child: which marriage this child belongs to


class RelationshipUpdate(BaseModel):
    marriage_status: MarriageStatus | None = None
    child_birth_order: int | None = None
    comment: str = Field(..., min_length=1)


class RelationshipResponse(BaseModel):
    id: int
    person_a_id: int
    person_b_id: int
    type: str
    marriage_status: str | None
    child_birth_order: int | None
    marriage_id: int | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
