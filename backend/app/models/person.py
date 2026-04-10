from datetime import date, datetime

from sqlalchemy import String, Integer, Boolean, Date, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import Gender, ApprovalStatus


class Person(Base):
    __tablename__ = "persons"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    generation: Mapped[int] = mapped_column(Integer, default=1)

    # Names - Roman (required)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Names - Devanagari (optional)
    first_name_devanagari: Mapped[str | None] = mapped_column(String(255), nullable=True)
    middle_name_devanagari: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_name_devanagari: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Dates - stored as AD, converted to BS at application layer
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    dod: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Details
    place_of_birth: Mapped[str | None] = mapped_column(String(500), nullable=True)
    current_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gender: Mapped[Gender] = mapped_column(Enum(Gender), nullable=False)
    is_alive: Mapped[bool] = mapped_column(Boolean, default=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Privacy - per-field visibility for non-admin users
    visibility_settings: Mapped[dict] = mapped_column(
        JSON, default=lambda: {"dob": True, "address": True, "phone": True, "email": True}
    )

    # Status & tracking
    status: Mapped[ApprovalStatus] = mapped_column(Enum(ApprovalStatus), default=ApprovalStatus.approved)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
