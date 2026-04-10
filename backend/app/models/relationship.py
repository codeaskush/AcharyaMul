from datetime import datetime

from sqlalchemy import Integer, Enum, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import RelationshipType, MarriageStatus, ApprovalStatus


class Relationship(Base):
    __tablename__ = "relationships"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    person_a_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), nullable=False, index=True)
    person_b_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), nullable=False, index=True)
    type: Mapped[RelationshipType] = mapped_column(Enum(RelationshipType), nullable=False)
    marriage_status: Mapped[MarriageStatus | None] = mapped_column(Enum(MarriageStatus), nullable=True)
    child_birth_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[ApprovalStatus] = mapped_column(Enum(ApprovalStatus), default=ApprovalStatus.approved)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
